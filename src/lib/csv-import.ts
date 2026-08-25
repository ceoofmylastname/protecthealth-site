// CSV import engine, shared by the broker CRM (/app, Contacts view) and the
// house-wide admin book (/admin/contacts).
//
// Everything here is pure logic plus PostgREST calls — no DOM, no styling. Each
// page builds its own wizard chrome in its own class vocabulary (the drawer in
// /app, a modal on /admin) and drives this module. Keeping the parser, the
// alias table, the matching rules and the batch runner in one place is the only
// way the two importers cannot drift apart.
//
// Rules the rest of the app depends on, and which this file must not break:
//   * ph_contacts' primary key is `ghl_contact_id` (text), not a uuid `id`.
//     ph_notes.contact_id, ph_policies.contact_id and
//     ph_contact_carriers.contact_id are all text and reference it.
//   * A row created here gets `ghl_contact_id = 'local:<uuid>'` and
//     `origin = 'crm'`. That prefix is the ONLY thing keeping the GoHighLevel
//     sync from treating the row as a stale mirror and overwriting it.
//   * RLS decides what may be written (`ph_is_admin() OR agent_id =
//     ph_agent_id()`), so `agent_id` is set honestly and never worked around.
//     A BEFORE UPDATE trigger claims the fields an update touches so the sync
//     leaves them alone afterwards; that is exactly what we want.
//   * Every contact row this file writes carries a fresh `imported_at`. The
//     Active Client email triggers are gated on it, so importing a book of
//     existing clients never mails anybody. Remove the stamp and the next
//     3,000-row import sends 3,000 welcome emails. See migration
//     20260825_import_related_records.sql.
//
// Beyond the plain columns this also lands the four related-record areas of a
// contact card: lines of insurance, carriers, tags, notes, disposition and
// policies. Carriers are a join table, policies are their own table, notes are
// their own table; the rest are columns on ph_contacts.

export interface CsvField {
  value: string;      // a column, `custom:<key>`, or one of the pseudo-fields
  label: string;
  group?: string;     // section heading in the mapper's dropdown
  custom?: boolean;
  note?: boolean;
}

export interface Catalogue {
  customFields?: { key: string; label: string }[];
  carriers?: { id: string; name: string }[];
  tags?: string[];
}

export interface ImportConfig {
  target: 'contacts' | 'companies';
  header: string[];
  rows: string[][];
  lines: number[];            // file line number per row, for error reporting
  mapping: string[];          // one entry per CSV column: a field value or ''
  mode: 'create' | 'create_update' | 'update';
  matchField: string;
  skipBlanks: boolean;        // "don't overwrite existing values with blanks"
  ownerId: string | null;     // null = unassigned / house
  // Who owns the policies this run writes. RLS on ph_policies is
  // `ph_is_admin() OR agent_id = ph_agent_id()`, so a broker importing into
  // their own book MUST put their own id here or every policy insert is
  // refused. Admin may leave it null or use the run's owner.
  policyAgentId?: string | null;
  // Decisions made in the review step, keyed `${kind}::${normValue(raw)}`.
  // A canonical string maps the value; '' drops it; CREATE_VALUE makes it.
  valueMap?: Record<string, string>;
  catalogue?: Catalogue;
}

export interface ImportFailure { line: number; message: string; cells: string[] }

export interface ImportResult {
  total: number;
  created: number;
  updated: number;
  skippedDuplicate: number;
  skippedNotFound: number;
  failed: number;
  carriersLinked: number;
  policiesCreated: number;
  policiesSkipped: number;   // already on the record — a re-import is not a duplicate
  notesCreated: number;
  errors: ImportFailure[];
  noteErrors: string[];
  relatedErrors: string[];   // carriers / policies problems that are not row failures
}

export const NOTE_FIELD = '__note';
export const CARRIER_FIELD = '__carriers';
export const CREATE_VALUE = '\u0000create';
export const POLICY_SETS = 3;
export const BATCH_SIZE = 200;
const LOOKUP_CHUNK = 150;   // values per .in(...) — never one query per row

// ---------------------------------------------------------------------------
// RFC 4180 parser
// ---------------------------------------------------------------------------
// Hand-rolled on purpose: no dependency may be added to this project, and the
// half-correct `split(',')` version is exactly how an import silently mangles
// every address with a comma in it. Handles quoted fields, embedded commas,
// embedded newlines inside quotes, doubled quotes as the escape, CRLF and LF
// line endings, lone CR, and a leading UTF-8 BOM.
export function parseCsv(text: string): string[][] {
  let s = String(text ?? '');
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1);   // BOM

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const n = s.length;

  const endField = () => { row.push(field); field = ''; };
  const endRow = () => { endField(); rows.push(row); row = []; };

  while (i < n) {
    const ch = s[i];

    if (inQuotes) {
      if (ch === '"') {
        // A doubled quote inside a quoted field is a literal quote; a single
        // one closes the field.
        if (s[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i += 1; continue;
      }
      // Newlines here are DATA, not row breaks.
      field += ch; i += 1; continue;
    }

    if (ch === '"') { inQuotes = true; i += 1; continue; }
    if (ch === ',') { endField(); i += 1; continue; }
    if (ch === '\r') { endRow(); i += s[i + 1] === '\n' ? 2 : 1; continue; }
    if (ch === '\n') { endRow(); i += 1; continue; }
    field += ch; i += 1;
  }

  // A file ending in a newline leaves nothing pending; anything else is a final
  // record that never got its terminator (including an unterminated quote).
  if (field !== '' || row.length) endRow();
  return rows;
}

export interface ReadResult {
  error?: string;
  header?: string[];
  rows?: string[][];
  lines?: number[];
}

// Parse + the sanity checks the wizard bails on: no data rows, duplicate header
// names. Rows are padded/truncated to the header width so every downstream
// index is safe.
export function readCsv(text: string): ReadResult {
  const all = parseCsv(text);
  const blank = (r: string[]) => !r.some((c) => String(c ?? '').trim() !== '');

  let h = 0;
  while (h < all.length && blank(all[h])) h += 1;
  if (h >= all.length) return { error: 'That file is empty — there is no header row in it.' };

  const header = all[h].map((c) => String(c ?? '').trim());

  const seen = new Set<string>();
  for (const name of header) {
    const k = name.toLowerCase();
    if (!k) continue;
    if (seen.has(k)) {
      return { error: `Two columns in that file are both named "${name}". Rename one of them and try again.` };
    }
    seen.add(k);
  }

  const rows: string[][] = [];
  const lines: number[] = [];
  for (let i = h + 1; i < all.length; i++) {
    if (blank(all[i])) continue;
    rows.push(header.map((_, j) => String(all[i][j] ?? '')));
    lines.push(i + 1);
  }
  if (!rows.length) return { error: 'That file has a header row but no data rows under it.' };

  return { header, rows, lines };
}

// Quote only what has to be quoted, CRLF terminated — the shape Excel and
// Sheets both read back without a fight.
export function toCsv(rows: (string | number | null | undefined)[][]): string {
  const cell = (v: string | number | null | undefined) => {
    const s = String(v ?? '');
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return rows.map((r) => r.map(cell).join(',')).join('\r\n');
}

export function failedRowsCsv(header: string[], failures: ImportFailure[]): string {
  return toCsv([header.concat('_error')].concat(failures.map((f) => f.cells.concat(f.message))));
}

// A blank file with every column this importer understands, so somebody
// building a file for the first time is not guessing at header names.
export function templateCsv(cat: Catalogue = {}): string {
  const head = [
    'First name', 'Last name', 'Email', 'Phone', 'Date of birth',
    'Company', 'Role / title', 'Street address', 'City', 'State', 'ZIP',
    'Source', 'Disposition', 'Lines of insurance', 'Carriers', 'Tags', 'Note',
  ];
  for (let i = 1; i <= POLICY_SETS; i++) {
    const p = i === 1 ? 'Policy' : `Policy ${i}`;
    head.push(`${p} line`, `${p} carrier`, `${p} number`, `${p} status`,
      `${p} premium`, `${p} frequency`, `${p} effective date`, `${p} renewal date`);
  }
  (cat.customFields || []).forEach((f) => head.push(f.label));
  const sample = [
    'Dana', 'Whitfield', 'dana@example.com', '(702) 555-0134', '1979-04-02',
    'Whitfield Realty', 'Broker', '6745 Sea Swallow St', 'North Las Vegas', 'NV', '89084',
    'Referral', 'Active Client', 'Health; Dental', 'Aetna; Delta Dental', 'referral; hot lead',
    'Wants a PPO with her cardiologist in network.',
    'Health', 'Aetna', 'AET-88213', 'Active', '412.50', 'Monthly', '2026-01-01', '2027-01-01',
  ];
  while (sample.length < head.length) sample.push('');
  return toCsv([head, sample]);
}

// ---------------------------------------------------------------------------
// Canonical value lists
// ---------------------------------------------------------------------------
// These have to match the database exactly. `ph_contacts_disposition_ck` is a
// CHECK constraint, so a file that says "active client" in lower case fails the
// whole batch insert unless it is folded here first. Lines of insurance are not
// constrained, but `ph_cov_to_line()` only recognises these labels — a line it
// cannot map opens no deal, which is the silent version of the same bug.
export const DISPOSITIONS = [
  'Lead', 'Active Client', 'Follow-Up', 'Not Interested', 'No Answer', 'Wrong Number', 'Do Not Call',
];
export const COVERAGE_TYPES = [
  'Health', 'Medicare', 'Dental', 'Vision', 'Life', 'Annuities', 'Group Benefits', 'Supplements', 'Accident / Gap',
];
export const POLICY_STATUSES = [
  'Quoted', 'Applied', 'Pending', 'Issued', 'Active', 'Lapsed', 'Cancelled', 'Declined',
];
export const PREMIUM_FREQS = ['Monthly', 'Quarterly', 'Semi-Annual', 'Annual', 'Single'];

// What other systems call the same thing. Normalised keys (see normValue).
const VALUE_SYNONYMS: Record<string, Record<string, string>> = {
  disposition: {
    client: 'Active Client', activeclient: 'Active Client', customer: 'Active Client',
    inforce: 'Active Client', active: 'Active Client', won: 'Active Client', closed: 'Active Client',
    closedwon: 'Active Client', sold: 'Active Client', enrolled: 'Active Client',
    lead: 'Lead', new: 'Lead', newlead: 'Lead', prospect: 'Lead', open: 'Lead',
    followup: 'Follow-Up', nurture: 'Follow-Up', callback: 'Follow-Up', warm: 'Follow-Up',
    notinterested: 'Not Interested', declined: 'Not Interested', lost: 'Not Interested',
    closedlost: 'Not Interested', dead: 'Not Interested', unqualified: 'Not Interested',
    noanswer: 'No Answer', nocontact: 'No Answer', novoicemail: 'No Answer', vm: 'No Answer',
    wrongnumber: 'Wrong Number', badnumber: 'Wrong Number', invalidnumber: 'Wrong Number',
    donotcall: 'Do Not Call', dnc: 'Do Not Call', optout: 'Do Not Call', unsubscribed: 'Do Not Call',
  },
  line: {
    medical: 'Health', majormedical: 'Health', aca: 'Health', individualhealth: 'Health',
    healthinsurance: 'Health', ichra: 'Health', privatehealth: 'Health',
    med: 'Medicare', medsupp: 'Medicare', medigap: 'Medicare', medicareadvantage: 'Medicare',
    medadv: 'Medicare', ma: 'Medicare', mapd: 'Medicare', pdp: 'Medicare', partd: 'Medicare',
    dentalinsurance: 'Dental', visioninsurance: 'Vision',
    lifeinsurance: 'Life', termlife: 'Life', wholelife: 'Life', iul: 'Life', finalexpense: 'Life',
    annuity: 'Annuities', fia: 'Annuities', definedbenefit: 'Annuities', retirement: 'Annuities',
    group: 'Group Benefits', groupbenefits: 'Group Benefits', grouphealth: 'Group Benefits',
    groupdental: 'Group Benefits', groupvision: 'Group Benefits', employerbenefits: 'Group Benefits',
    employee: 'Group Benefits', smallgroup: 'Group Benefits',
    supplement: 'Supplements', supplemental: 'Supplements', ancillary: 'Supplements',
    criticalillness: 'Supplements', hospitalindemnity: 'Supplements', cancer: 'Supplements',
    accident: 'Accident / Gap', gap: 'Accident / Gap', accidentgap: 'Accident / Gap',
  },
  policy_status: {
    inforce: 'Active', active: 'Active', effective: 'Active', issued: 'Issued', approved: 'Issued',
    quote: 'Quoted', quoted: 'Quoted', proposal: 'Quoted',
    applied: 'Applied', submitted: 'Applied', application: 'Applied',
    pending: 'Pending', underwriting: 'Pending', inprogress: 'Pending',
    lapsed: 'Lapsed', terminated: 'Lapsed', expired: 'Lapsed',
    cancelled: 'Cancelled', canceled: 'Cancelled', withdrawn: 'Cancelled',
    declined: 'Declined', denied: 'Declined', rejected: 'Declined',
  },
  premium_freq: {
    monthly: 'Monthly', month: 'Monthly', mo: 'Monthly', permonth: 'Monthly', m: 'Monthly',
    quarterly: 'Quarterly', quarter: 'Quarterly', q: 'Quarterly',
    semiannual: 'Semi-Annual', semiannually: 'Semi-Annual', biannual: 'Semi-Annual',
    twiceayear: 'Semi-Annual', halfyearly: 'Semi-Annual',
    annual: 'Annual', annually: 'Annual', yearly: 'Annual', year: 'Annual', peryear: 'Annual',
    y: 'Annual', a: 'Annual',
    single: 'Single', onetime: 'Single', lumpsum: 'Single', paidup: 'Single',
  },
};

export function normValue(s: string): string {
  return String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// ---------------------------------------------------------------------------
// Field catalogue
// ---------------------------------------------------------------------------
const CONTACT_FIELDS: CsvField[] = [
  { value: 'ghl_contact_id', label: 'Contact ID', group: 'Contact' },
  { value: 'first_name', label: 'First name', group: 'Contact' },
  { value: 'last_name', label: 'Last name', group: 'Contact' },
  { value: 'email', label: 'Email', group: 'Contact' },
  { value: 'phone', label: 'Phone', group: 'Contact' },
  { value: 'date_of_birth', label: 'Date of birth', group: 'Contact' },
  { value: 'company', label: 'Company', group: 'Contact' },
  { value: 'job_title', label: 'Role / title', group: 'Contact' },
  { value: 'street_address', label: 'Street address', group: 'Contact' },
  { value: 'city', label: 'City', group: 'Contact' },
  { value: 'state', label: 'State', group: 'Contact' },
  { value: 'postal_code', label: 'ZIP / postal code', group: 'Contact' },
  { value: 'source', label: 'Source', group: 'Contact' },
  { value: 'disposition', label: 'Disposition', group: 'Client record' },
  { value: 'coverage_types', label: 'Lines of insurance', group: 'Client record' },
  { value: CARRIER_FIELD, label: 'Carriers', group: 'Client record' },
  { value: 'tags', label: 'Tags', group: 'Client record' },
];

const BUSINESS_FIELDS: CsvField[] = [
  { value: 'name', label: 'Company name' },
  { value: 'industry', label: 'Industry' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'street_address', label: 'Street address' },
  { value: 'city', label: 'City' },
  { value: 'state', label: 'State' },
  { value: 'postal_code', label: 'ZIP / postal code' },
  { value: 'employee_count', label: 'Employees' },
  { value: 'notes', label: 'Notes' },
];

// One policy per numbered set, so a contact with a health plan and a dental
// plan comes in on ONE row rather than two rows the matcher has to reconcile.
export const POLICY_PARTS: { key: string; label: string }[] = [
  { key: 'line', label: 'line' },
  { key: 'carrier', label: 'carrier' },
  { key: 'policy_number', label: 'number' },
  { key: 'status', label: 'status' },
  { key: 'premium', label: 'premium' },
  { key: 'premium_freq', label: 'frequency' },
  { key: 'effective_date', label: 'effective date' },
  { key: 'renewal_date', label: 'renewal date' },
  { key: 'notes', label: 'notes' },
];

export function policyField(set: number, part: string): string {
  return `pol${set}:${part}`;
}
function parsePolicyField(v: string): { set: number; part: string } | null {
  const m = /^pol(\d+):(.+)$/.exec(v || '');
  return m ? { set: Number(m[1]), part: m[2] } : null;
}

function policyFields(): CsvField[] {
  const out: CsvField[] = [];
  for (let s = 1; s <= POLICY_SETS; s++) {
    const name = s === 1 ? 'Policy' : `Policy ${s}`;
    POLICY_PARTS.forEach((p) => {
      out.push({ value: policyField(s, p.key), label: `${name} ${p.label}`, group: name });
    });
  }
  return out;
}

// Every header a note column arrives under. GoHighLevel exports "Last Note",
// Radius Bob exports "Last Activity Note", other tools say "Comments" — all of
// them are one thing to us: a row in ph_notes, which is what the record's
// Notes & appointments panel reads.
const NOTE_ALIASES = [
  'note', 'notes', 'comment', 'comments', 'remarks',
  'lastnote', 'lastnotes', 'latestnote', 'recentnote', 'mostrecentnote',
  'lastactivitynote', 'activitynote', 'contactnote', 'contactnotes',
  'notebody', 'notetext', 'lastcomment', 'internalnotes', 'agentnotes',
];

// Header names people actually export, normalised (lowercase, alphanumerics
// only). The field's own name and its label are always matched first, so this
// list only carries the synonyms.
export const ALIASES: Record<string, string[]> = {
  ghl_contact_id: ['contactid', 'id', 'ghlcontactid', 'crmid', 'recordid', 'externalid'],
  first_name: ['first', 'firstname', 'fname', 'givenname'],
  last_name: ['last', 'lastname', 'lname', 'surname', 'familyname'],
  email: ['email', 'emailaddress', 'emailaddress1', 'primaryemail', 'workemail', 'e-mail'],
  phone: ['phone', 'mobile', 'cell', 'cellphone', 'phonenumber', 'mobilephone', 'telephone', 'tel', 'homephone', 'phone1'],
  date_of_birth: ['dob', 'dateofbirth', 'birthdate', 'birthday', 'bday'],
  company: ['company', 'business', 'organization', 'organisation', 'companyname', 'businessname', 'employer', 'account', 'accountname'],
  job_title: ['title', 'jobtitle', 'role', 'position', 'occupation'],
  street_address: ['address', 'address1', 'streetaddress', 'street', 'addressline1', 'mailingaddress'],
  city: ['city', 'town', 'locality'],
  state: ['state', 'province', 'region', 'st'],
  postal_code: ['zip', 'zipcode', 'postal', 'postalcode', 'postcode'],
  source: ['source', 'leadsource', 'howwemet', 'referredby', 'campaign'],
  disposition: ['disposition', 'status', 'contactstatus', 'stage', 'pipelinestage', 'contacttype'],
  tags: ['tags', 'tag', 'labels'],
  coverage_types: ['coveragetypes', 'coverage', 'lines', 'lineofinsurance', 'linesofinsurance', 'producttype', 'productlines', 'linesofbusiness', 'lob'],
  [CARRIER_FIELD]: ['carrier', 'carriers', 'carriername', 'insurancecarrier', 'company1', 'insurer', 'writingcarrier'],
  [NOTE_FIELD]: NOTE_ALIASES,
  // ph_companies
  name: ['name', 'company', 'companyname', 'business', 'businessname', 'organization', 'organisation', 'account', 'accountname'],
  industry: ['industry', 'sector', 'vertical'],
  employee_count: ['employees', 'employeecount', 'numberofemployees', 'headcount', 'staff', 'size'],
  notes: ['notes', 'note', 'comments', 'description', 'remarks'],
};

// Note slots 2 and 3 take the numbered spellings first, then the same generic
// list as slot 1. autoMap consumes a field once, so a file carrying both
// "Notes" and "Last Note" fills slot 1 and slot 2 in header order rather than
// leaving the second column unmapped and silently dropping what it says.
(function seedNoteAliases() {
  for (let i = 2; i <= 3; i++) {
    const numbered = NOTE_ALIASES.map((a) => a + i).concat(NOTE_ALIASES.map((a) => a + '' + i));
    ALIASES[`${NOTE_FIELD}:${i}`] = Array.from(new Set(numbered.concat(NOTE_ALIASES)));
  }
})();

// Policy set aliases are generated rather than typed out: "Policy 2 Premium",
// "policy2premium" and "premium2" all have to reach pol2:premium.
(function seedPolicyAliases() {
  const partAliases: Record<string, string[]> = {
    line: ['line', 'policyline', 'lineofinsurance', 'product', 'plantype', 'coverage'],
    carrier: ['carrier', 'policycarrier', 'insurer', 'company', 'carriername'],
    policy_number: ['policynumber', 'policyno', 'policyid', 'policy', 'membernumber', 'memberid', 'contractnumber'],
    status: ['policystatus', 'status', 'policystate'],
    premium: ['premium', 'policypremium', 'monthlypremium', 'amount', 'rate'],
    premium_freq: ['premiumfrequency', 'frequency', 'freq', 'mode', 'paymode', 'billingfrequency', 'premiummode'],
    effective_date: ['effectivedate', 'effective', 'startdate', 'issuedate', 'coveragestart'],
    renewal_date: ['renewaldate', 'renewal', 'enddate', 'expirationdate', 'termdate'],
    notes: ['policynotes', 'policynote', 'policycomment'],
  };
  for (let s = 1; s <= POLICY_SETS; s++) {
    POLICY_PARTS.forEach((p) => {
      const base = partAliases[p.key] || [p.key];
      const out: string[] = [];
      base.forEach((b) => {
        out.push('policy' + s + b, b + s, 'policy' + s + '' + b);
        if (s === 1) out.push(b, 'policy' + b);
      });
      ALIASES[policyField(s, p.key)] = Array.from(new Set(out));
    });
  }
})();

export function normName(s: string): string {
  return String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function objectLabel(target: string): string {
  return target === 'companies' ? 'Business' : 'Contact';
}

// Contact fields include every admin-defined custom field (written into the
// `custom` jsonb under its key), the Note targets, the carrier join and the
// three policy sets.
export function fieldsFor(target: string, customFields: { key: string; label: string }[] = []): CsvField[] {
  if (target === 'companies') return BUSINESS_FIELDS.slice();
  const notes: CsvField[] = [{ value: NOTE_FIELD, label: 'Note', group: 'Notes', note: true }];
  for (let i = 2; i <= 3; i++) notes.push({ value: `${NOTE_FIELD}:${i}`, label: `Note ${i}`, group: 'Notes', note: true });
  return CONTACT_FIELDS
    .concat((customFields || []).map((f) => ({ value: 'custom:' + f.key, label: f.label, group: 'Custom fields', custom: true })))
    .concat(notes)
    .concat(policyFields());
}

export function matchOptions(target: string): CsvField[] {
  if (target === 'companies') {
    return [
      { value: 'name', label: 'Name' },
      { value: 'email', label: 'Email' },
      { value: 'phone', label: 'Phone' },
    ];
  }
  return [
    { value: 'ghl_contact_id', label: 'Contact ID' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
  ];
}

// One guess per CSV column. A field is claimed by the first column that wants
// it, so a file with both "Phone" and "Mobile" maps phone once and leaves the
// second column unmapped rather than silently fighting over the column.
export function autoMap(header: string[], fields: CsvField[]): string[] {
  const used = new Set<string>();
  return header.map((h) => {
    const n = normName(h);
    if (!n) return '';
    const free = (f: CsvField) => !used.has(f.value);
    const bare = (f: CsvField) => f.value.replace(/^custom:/, '');
    let hit = fields.find((f) => free(f) && (normName(bare(f)) === n || normName(f.label) === n));
    if (!hit) hit = fields.find((f) => free(f) && (ALIASES[f.value] || []).indexOf(n) >= 0);
    if (!hit) return '';
    used.add(hit.value);
    return hit.value;
  });
}

export function sampleValues(rows: string[][], col: number, take = 3): string[] {
  const out: string[] = [];
  for (let i = 0; i < rows.length && out.length < take; i++) {
    const v = String(rows[i][col] ?? '').trim();
    if (!v) continue;
    out.push(v.length > 28 ? v.slice(0, 27) + '…' : v);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Value coercion
// ---------------------------------------------------------------------------
// Multi-value cells: a semicolon wins if there is one, because "Aetna, Inc."
// and "Smith, John" are single values that happen to contain a comma. Only a
// cell with no semicolon at all falls back to splitting on commas.
export function splitList(v: string): string[] {
  const s = String(v ?? '');
  const sep = s.indexOf(';') >= 0 ? /;/ : /,/;
  return s.split(sep).map((x) => x.trim()).filter(Boolean);
}

// YYYY-MM-DD or M/D/YYYY. Anything else writes null rather than letting
// Postgres guess — a wrong birthday is worse than a missing one.
export function parseDate(v: string): string | null {
  const s = String(v ?? '').trim();
  if (!s) return null;
  let y: number, m: number, d: number;
  let mt = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (mt) { y = +mt[1]; m = +mt[2]; d = +mt[3]; }
  else {
    mt = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
    if (!mt) return null;
    m = +mt[1]; d = +mt[2]; y = +mt[3];
  }
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2200) return null;
  const pad = (x: number) => String(x).padStart(2, '0');
  return `${y}-${pad(m)}-${pad(d)}`;
}

// "$412.50", "412.50/mo", "1,240" all mean the same number. Anything with no
// digits in it writes null rather than 0 — a premium of zero is a claim.
export function parseMoney(v: string): number | null {
  const s = String(v ?? '').replace(/[^0-9.\-]/g, '');
  if (!s || !/\d/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// The app's own contact form caps State at two characters, so that is the house
// format. An export that spells the state out gets folded to it rather than
// writing something the rest of the CRM will not recognise.
const STATE_NAMES: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', 'district of columbia': 'DC',
  florida: 'FL', georgia: 'GA', hawaii: 'HI', idaho: 'ID', illinois: 'IL',
  indiana: 'IN', iowa: 'IA', kansas: 'KS', kentucky: 'KY', louisiana: 'LA',
  maine: 'ME', maryland: 'MD', massachusetts: 'MA', michigan: 'MI', minnesota: 'MN',
  mississippi: 'MS', missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK',
  oregon: 'OR', pennsylvania: 'PA', 'puerto rico': 'PR', 'rhode island': 'RI',
  'south carolina': 'SC', 'south dakota': 'SD', tennessee: 'TN', texas: 'TX',
  utah: 'UT', vermont: 'VT', virginia: 'VA', washington: 'WA',
  'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY',
};
export function normState(v: string): string | null {
  const s = String(v ?? '').trim();
  if (!s) return null;
  return STATE_NAMES[s.toLowerCase().replace(/\s+/g, ' ')] || s.toUpperCase();
}

// Both sides of every comparison go through this. Email is lowercase-trimmed,
// phone is digits-only with a leading country 1 stripped, so
// "(702) 555-0134" and "+1 702 555 0134" are the same person.
export function normKey(field: string, raw: unknown): string {
  const v = String(raw ?? '').trim();
  if (!v) return '';
  if (field === 'email') return v.toLowerCase();
  if (field === 'phone') {
    const d = v.replace(/\D/g, '');
    return d.length === 11 && d.charAt(0) === '1' ? d.slice(1) : d;
  }
  if (field === 'name') return v.toLowerCase().replace(/\s+/g, ' ');
  return v;
}

// ---------------------------------------------------------------------------
// The value review step
// ---------------------------------------------------------------------------
// Six kinds of value in a CSV have to land on something the CRM already knows
// about. Anything that does not is shown to the human BEFORE a single row is
// written, with the closest catalogue entries offered. Auto-creating on the fly
// was the alternative and it is how one typo becomes a carrier every broker in
// the company sees forever.
export type ValueKind = 'disposition' | 'line' | 'carrier' | 'tag' | 'policy_status' | 'premium_freq';

export interface ValueIssue {
  kind: ValueKind;
  raw: string;
  count: number;
  suggestions: string[];
  canCreate: boolean;
}

export const KIND_LABEL: Record<ValueKind, string> = {
  disposition: 'Disposition',
  line: 'Line of insurance',
  carrier: 'Carrier',
  tag: 'Tag',
  policy_status: 'Policy status',
  premium_freq: 'Premium frequency',
};

function catalogueFor(kind: ValueKind, cat: Catalogue): string[] {
  if (kind === 'disposition') return DISPOSITIONS;
  if (kind === 'line') return COVERAGE_TYPES;
  if (kind === 'policy_status') return POLICY_STATUSES;
  if (kind === 'premium_freq') return PREMIUM_FREQS;
  if (kind === 'carrier') return (cat.carriers || []).map((c) => c.name);
  return (cat.tags || []).slice();
}

export function mapKey(kind: ValueKind, raw: string): string {
  return kind + '::' + normValue(raw);
}

// Splitting a multi-value cell is genuinely ambiguous when the separator is a
// comma: "Health, Dental" is two lines but "Aetna, Inc." is one carrier. For
// the two kinds backed by a fixed catalogue we can settle it by asking — if the
// WHOLE cell is something the CRM already knows, it is one value; only a cell
// that means nothing as a whole gets split. A semicolon is never ambiguous, so
// a cell containing one always splits (see splitList).
function splitCatalogued(kind: ValueKind, cell: string, cfg: ImportConfig): string[] {
  const v = String(cell ?? '').trim();
  if (!v) return [];
  if (v.indexOf(';') >= 0 || v.indexOf(',') < 0) return splitList(v);
  // A decision already made about the whole cell settles it.
  if ((cfg.valueMap || {})[mapKey(kind, v)] !== undefined) return [v];
  if (catalogueHit(kind, v, cfg)) return [v];
  // Split only if EVERY piece is something the CRM knows. "Health, Dental"
  // passes; "Aetna, Inc." does not, because "Inc." is nobody's carrier — so it
  // stays whole and goes to the review step, where a human maps it onto Aetna
  // instead of the importer quietly inventing a carrier called "Inc.".
  const parts = splitList(v);
  return parts.length > 1 && parts.every((p) => catalogueHit(kind, p, cfg)) ? parts : [v];
}

// Deliberately ignores the "tags resolve to themselves" fallback in
// resolveValue — that would make every comma-bearing tag cell a single tag.
function catalogueHit(kind: ValueKind, v: string, cfg: ImportConfig): boolean {
  const over = (cfg.valueMap || {})[mapKey(kind, v)];
  if (over !== undefined) return over !== '';
  const cat = cfg.catalogue || {};
  const n = normValue(v);
  if (catalogueFor(kind, cat).some((c) => normValue(c) === n)) return true;
  return !!(VALUE_SYNONYMS[kind] || {})[n];
}

// Exact-normalised, then the synonym table, then the caller's overrides. Null
// means "nothing in the CRM answers to this".
export function resolveValue(kind: ValueKind, raw: string, cfg: ImportConfig): string | null {
  const v = String(raw ?? '').trim();
  if (!v) return null;
  const over = (cfg.valueMap || {})[mapKey(kind, v)];
  if (over !== undefined) {
    if (over === '') return null;                 // deliberately ignored
    if (over === CREATE_VALUE) return v;          // created before the run
    return over;
  }
  const cat = cfg.catalogue || {};
  const n = normValue(v);
  const hit = catalogueFor(kind, cat).find((c) => normValue(c) === n);
  if (hit) return hit;
  const syn = (VALUE_SYNONYMS[kind] || {})[n];
  if (syn && catalogueFor(kind, cat).indexOf(syn) >= 0) return syn;
  // Tags are free text by design — the office list in ph_tags is a convenience,
  // not a constraint — so an unlisted tag still resolves to itself. It is still
  // reported as an issue so the human can fold "VIP " into "vip".
  if (kind === 'tag') return v;
  return null;
}

function scored(kind: ValueKind, raw: string, cat: Catalogue): string[] {
  const n = normValue(raw);
  const list = catalogueFor(kind, cat);
  const rank = (c: string) => {
    const cn = normValue(c);
    if (cn === n) return 0;
    if (cn.indexOf(n) === 0 || n.indexOf(cn) === 0) return 1;
    if (cn.indexOf(n) >= 0 || n.indexOf(cn) >= 0) return 2;
    // shared leading characters, cheap and good enough for carrier names
    let i = 0;
    while (i < cn.length && i < n.length && cn[i] === n[i]) i++;
    return i >= 3 ? 3 : 9;
  };
  return list.map((c) => ({ c, r: rank(c) })).filter((x) => x.r < 9)
    .sort((a, b) => a.r - b.r).slice(0, 4).map((x) => x.c);
}

// Every distinct value in the file that does not resolve, with how many rows
// carry it. Ordered kind-by-kind, commonest first, so the review step reads as
// a worklist rather than a wall.
export function scanValues(cfg: ImportConfig): ValueIssue[] {
  if (cfg.target !== 'contacts') return [];
  const cat = cfg.catalogue || {};
  const seen = new Map<string, ValueIssue>();
  const bump = (kind: ValueKind, raw: string) => {
    const v = String(raw ?? '').trim();
    if (!v) return;
    const k = mapKey(kind, v);
    const at = seen.get(k);
    if (at) { at.count += 1; return; }
    // Resolve WITHOUT the override map so a value the human already decided on
    // still shows, with their decision preselected.
    const bare: ImportConfig = { ...cfg, valueMap: {} };
    if (kind !== 'tag' && resolveValue(kind, v, bare) !== null) return;
    if (kind === 'tag' && (cat.tags || []).some((t) => normValue(t) === normValue(v))) return;
    seen.set(k, {
      kind, raw: v, count: 1,
      suggestions: scored(kind, v, cat),
      canCreate: kind === 'carrier' || kind === 'tag',
    });
  };

  cfg.mapping.forEach((field, col) => {
    if (!field) return;
    const pol = parsePolicyField(field);
    let kind: ValueKind | null = null;
    let multi = false;
    if (field === 'disposition') kind = 'disposition';
    else if (field === 'coverage_types') { kind = 'line'; multi = true; }
    else if (field === CARRIER_FIELD) { kind = 'carrier'; multi = true; }
    else if (field === 'tags') { kind = 'tag'; multi = true; }
    else if (pol && pol.part === 'line') kind = 'line';
    else if (pol && pol.part === 'carrier') kind = 'carrier';
    else if (pol && pol.part === 'status') kind = 'policy_status';
    else if (pol && pol.part === 'premium_freq') kind = 'premium_freq';
    if (!kind) return;
    cfg.rows.forEach((r) => {
      const cell = String(r[col] ?? '');
      if (!multi) { bump(kind as ValueKind, cell); return; }
      const parts = (kind === 'carrier' || kind === 'line')
        ? splitCatalogued(kind as ValueKind, cell, cfg)
        : splitList(cell);
      parts.forEach((v) => bump(kind as ValueKind, v));
    });
  });

  const order: ValueKind[] = ['disposition', 'line', 'carrier', 'policy_status', 'premium_freq', 'tag'];
  return Array.from(seen.values()).sort((a, b) =>
    (order.indexOf(a.kind) - order.indexOf(b.kind)) || (b.count - a.count) || a.raw.localeCompare(b.raw));
}

// PostgREST's .in(...) is exact equality and cannot normalise server-side, so
// the lookup asks for the formats the value is plausibly stored in and the
// final comparison still happens on normKey() on both sides. This keeps the
// lookup to a handful of chunked queries instead of one per row.
function variantsFor(field: string, raw: string): string[] {
  const v = String(raw ?? '').trim();
  if (!v) return [];
  const out = [v];
  if (field === 'email' || field === 'name') {
    out.push(v.toLowerCase());
  } else if (field === 'phone') {
    const d = normKey('phone', v);
    if (d) {
      out.push(d);
      if (d.length === 10) {
        const a = d.slice(0, 3), b = d.slice(3, 6), c = d.slice(6);
        out.push('1' + d, '+1' + d, `(${a}) ${b}-${c}`, `${a}-${b}-${c}`, `${a}.${b}.${c}`, `+1 (${a}) ${b}-${c}`, `${a} ${b} ${c}`);
      }
    }
  }
  return Array.from(new Set(out));
}

// `.in(...)` is exact, and Postgres text comparison is case sensitive, so an
// email stored as "Ann@X.com" would never match a file that says "ann@x.com".
// A second, chunked `or=(...ilike...)` sweep folds the case for the two text
// keys where that matters. An ILIKE pattern with no % is equality, but % and _
// in the value ARE wildcards, so they get escaped — over-matching here would
// patch the wrong person's record.
const OR_CHUNK = 50;
// Anything with a comma, quote, backslash, bracket or newline is left to the
// exact pass rather than risking a malformed PostgREST filter.
const OR_SAFE = /^[^,()"\\\r\n]+$/;
export function likeEscape(v: string): string {
  return String(v).replace(/([\\%_])/g, '\\$1');
}
export function pgQuote(v: string): string {
  return '"' + String(v).replace(/(["\\])/g, '\\$1') + '"';
}

function newLocalId(): string {
  const uuid = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : Date.now() + '-' + Math.random().toString(16).slice(2);
  return 'local:' + uuid;
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------
interface PlannedPolicy {
  line: string;
  carrier_name: string | null;
  carrier_id: string | null;
  policy_number: string | null;
  status: string;
  premium: number | null;
  premium_freq: string;
  effective_date: string | null;
  renewal_date: string | null;
  notes: string | null;
}

interface RowPlan {
  index: number;
  line: number;
  cells: string[];
  patch: Record<string, unknown>;
  custom: Record<string, unknown> | null;
  notes: string[];
  carrierIds: string[];
  policies: PlannedPolicy[];
  key: string;
}

interface RowExtras {
  notes: string[];
  carrierIds: string[];
  policies: PlannedPolicy[];
  warnings: string[];
}

// Turn one CSV row into the column patch, the custom-jsonb patch and every
// related record it implies. `forCreate` ignores the skip-blanks setting (there
// is nothing to overwrite) and always emits the same key set, because PostgREST
// rejects a bulk insert whose objects do not all carry identical keys.
function planRow(
  cfg: ImportConfig,
  row: string[],
  forCreate: boolean,
): { patch: Record<string, unknown>; custom: Record<string, unknown> | null; extras: RowExtras } {
  const patch: Record<string, unknown> = {};
  let custom: Record<string, unknown> | null = null;
  const extras: RowExtras = { notes: [], carrierIds: [], policies: [], warnings: [] };
  const carrierByName = new Map<string, string>();
  ((cfg.catalogue || {}).carriers || []).forEach((c) => carrierByName.set(normValue(c.name), c.id));
  const pols = new Map<number, Record<string, string>>();

  cfg.mapping.forEach((field, i) => {
    if (!field) return;
    const raw = String(row[i] ?? '');
    const val = raw.trim();

    if (field === NOTE_FIELD || field.indexOf(NOTE_FIELD + ':') === 0) {
      if (val) extras.notes.push(val);
      return;
    }

    if (field === CARRIER_FIELD) {
      splitCatalogued('carrier', val, cfg).forEach((name) => {
        const resolved = resolveValue('carrier', name, cfg);
        if (!resolved) return;
        const id = carrierByName.get(normValue(resolved));
        if (id) extras.carrierIds.push(id);
      });
      return;
    }

    const pol = parsePolicyField(field);
    if (pol) {
      if (!val) return;
      const bag = pols.get(pol.set) || {};
      bag[pol.part] = val;
      pols.set(pol.set, bag);
      return;
    }

    if (field.indexOf('custom:') === 0) {
      const key = field.slice(7);
      if (!val && cfg.skipBlanks && !forCreate) return;
      custom = custom || {};
      custom[key] = val || null;
      return;
    }

    // On create, ghl_contact_id is ours to mint — a CSV cannot claim one.
    if (field === 'ghl_contact_id' && forCreate) return;

    if (!val && cfg.skipBlanks && !forCreate) return;

    if (field === 'tags') {
      patch.tags = splitList(val).map((t) => resolveValue('tag', t, cfg)).filter(Boolean);
      return;
    }
    if (field === 'coverage_types') {
      const lines = splitCatalogued('line', val, cfg)
        .map((t) => resolveValue('line', t, cfg)).filter(Boolean) as string[];
      patch.coverage_types = Array.from(new Set(lines));
      return;
    }
    if (field === 'disposition') {
      // A value the CHECK constraint would refuse writes null instead of
      // failing the row — the rest of the record is still worth having, and
      // the review step already gave the human a chance to map it.
      patch.disposition = val ? resolveValue('disposition', val, cfg) : null;
      return;
    }
    if (field === 'date_of_birth') { patch[field] = parseDate(val); return; }
    if (field === 'employee_count') {
      const n = parseInt(val.replace(/[^0-9]/g, ''), 10);
      patch[field] = Number.isFinite(n) ? n : null;
      return;
    }
    if (field === 'state') { patch[field] = normState(val); return; }
    patch[field] = val || null;
  });

  // ---- assemble the policy sets ----
  const mappedLines = Array.isArray(patch.coverage_types) ? (patch.coverage_types as string[]) : [];
  Array.from(pols.keys()).sort((a, b) => a - b).forEach((set) => {
    const bag = pols.get(set) as Record<string, string>;
    const has = Object.keys(bag).some((k) => String(bag[k] || '').trim() !== '');
    if (!has) return;

    let line = bag.line ? resolveValue('line', bag.line, cfg) : null;
    // A policy with a carrier and a number but no line is still a real policy.
    // If the row names exactly one line of insurance, that is the line; if it
    // names several there is no honest guess, so say so rather than pick one.
    if (!line) {
      if (mappedLines.length === 1) line = mappedLines[0];
      else {
        extras.warnings.push(
          `Policy ${set} has no line of insurance we recognise${bag.line ? ` ("${bag.line}")` : ''}, so it was not created.`);
        return;
      }
    }

    const carrierName = bag.carrier ? resolveValue('carrier', bag.carrier, cfg) : null;
    const carrierId = carrierName ? (carrierByName.get(normValue(carrierName)) || null) : null;
    if (bag.carrier && !carrierId) {
      // carrier_name is a plain text column next to carrier_id precisely so a
      // carrier the office does not stock is still recorded rather than lost.
      extras.warnings.push(`Policy ${set} carrier "${bag.carrier}" is not in the carrier list — kept as text only.`);
    }

    extras.policies.push({
      line,
      carrier_name: carrierName || (bag.carrier ? bag.carrier.trim() : null),
      carrier_id: carrierId,
      policy_number: bag.policy_number ? bag.policy_number.trim() : null,
      status: (bag.status ? resolveValue('policy_status', bag.status, cfg) : null) || 'Quoted',
      premium: bag.premium ? parseMoney(bag.premium) : null,
      premium_freq: (bag.premium_freq ? resolveValue('premium_freq', bag.premium_freq, cfg) : null) || 'Monthly',
      effective_date: bag.effective_date ? parseDate(bag.effective_date) : null,
      renewal_date: bag.renewal_date ? parseDate(bag.renewal_date) : null,
      notes: bag.notes ? bag.notes.trim() : null,
    });

    // A policy implies its line. ph_policy_sync_coverage does this server-side
    // on insert too, but doing it here means the contact row is right the first
    // time and the opportunity trigger fires once instead of twice.
    if (mappedLines.indexOf(line) < 0) mappedLines.push(line);
  });
  if (mappedLines.length && Array.isArray(patch.coverage_types)) patch.coverage_types = mappedLines;

  extras.carrierIds = Array.from(new Set(extras.carrierIds));
  return { patch, custom, extras };
}

// Merge, never replace. The CSV adds to what is on the record; it does not get
// to remove. `in-force` (written by ph_contact_intake) and the `Support: …`
// tags (written by the ticketing system) will never appear in an export, so a
// replacing import would silently strip them off every contact it touched.
function mergeList(existing: unknown, incoming: unknown): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (v: unknown) => {
    const s = String(v ?? '').trim();
    if (!s) return;
    const k = s.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k); out.push(s);
  };
  (Array.isArray(existing) ? existing : []).forEach(add);
  (Array.isArray(incoming) ? incoming : []).forEach(add);
  return out;
}

async function pool<T>(items: T[], size: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const workers = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      await fn(items[i]);
    }
  });
  await Promise.all(workers);
}

// Carriers and tags the human ticked "create" for in the review step. Done once
// up front, before any row is written, so every row in the run sees them. Both
// tables are admin-write under RLS; a broker who picks Create gets a clear
// message instead of a wall of refused inserts.
export async function createReviewedValues(
  sb: any,
  cfg: ImportConfig,
): Promise<{ catalogue: Catalogue; errors: string[] }> {
  const cat: Catalogue = {
    customFields: (cfg.catalogue || {}).customFields || [],
    carriers: ((cfg.catalogue || {}).carriers || []).slice(),
    tags: ((cfg.catalogue || {}).tags || []).slice(),
  };
  const errors: string[] = [];
  const map = cfg.valueMap || {};

  const wanted = (kind: ValueKind) => scanValues(cfg)
    .filter((iss) => iss.kind === kind && map[mapKey(kind, iss.raw)] === CREATE_VALUE)
    .map((iss) => iss.raw);

  const newCarriers = wanted('carrier');
  if (newCarriers.length) {
    const { data, error } = await sb.from('ph_carriers')
      .insert(newCarriers.map((name) => ({ name, is_active: true }))).select('id, name');
    if (error) errors.push(`Could not add ${newCarriers.length} new carrier(s): ${error.message}. Only an admin can add carriers.`);
    else (data || []).forEach((c: any) => cat.carriers!.push({ id: c.id, name: c.name }));
  }

  const newTags = wanted('tag');
  if (newTags.length) {
    const { error } = await sb.from('ph_tags')
      .insert(newTags.map((name, i) => ({ name, position: 100 + i, is_active: true })));
    // A tag that fails to register in the office list is cosmetic — the tag
    // still lands on the contact, it just will not appear as a tick box.
    if (error) errors.push(`New tags were added to the contacts but not to the office tag list: ${error.message}`);
    else newTags.forEach((t) => cat.tags!.push(t));
  }

  return { catalogue: cat, errors };
}

export async function runImport(
  sb: any,
  cfgIn: ImportConfig,
  onProgress?: (done: number, total: number) => void,
): Promise<ImportResult> {
  const cfg = cfgIn;
  const isContacts = cfg.target === 'contacts';
  const table = isContacts ? 'ph_contacts' : 'ph_companies';
  const pk = isContacts ? 'ghl_contact_id' : 'id';
  const lookupCols = isContacts
    ? 'ghl_contact_id, email, phone, custom, tags, coverage_types'
    : 'id, name, email, phone';
  const matchCol = cfg.mapping.indexOf(cfg.matchField);

  const res: ImportResult = {
    total: cfg.rows.length, created: 0, updated: 0,
    skippedDuplicate: 0, skippedNotFound: 0, failed: 0,
    carriersLinked: 0, policiesCreated: 0, policiesSkipped: 0, notesCreated: 0,
    errors: [], noteErrors: [], relatedErrors: [],
  };

  // Fields written on create, fixed for the whole run so every payload in a
  // bulk insert has the same shape. The pseudo-fields never become columns.
  const mappedFields = Array.from(new Set(cfg.mapping.filter(Boolean)))
    .filter((f) => f.indexOf(NOTE_FIELD) !== 0 && f !== CARRIER_FIELD && !parsePolicyField(f));
  const hasCustom = Array.from(new Set(cfg.mapping.filter(Boolean))).some((f) => f.indexOf('custom:') === 0);
  const writesPolicies = cfg.mapping.some((f) => !!parsePolicyField(f));

  let done = 0;
  const tick = () => { if (onProgress) onProgress(done, res.total); };
  tick();

  for (let start = 0; start < cfg.rows.length; start += BATCH_SIZE) {
    const slice = cfg.rows.slice(start, start + BATCH_SIZE);
    const plans: RowPlan[] = slice.map((cells, i) => {
      const p = planRow(cfg, cells, false);
      p.extras.warnings.forEach((w) => {
        res.errors.push({ line: cfg.lines[start + i], message: w, cells });
      });
      return {
        index: start + i,
        line: cfg.lines[start + i],
        cells,
        patch: p.patch, custom: p.custom,
        notes: p.extras.notes, carrierIds: p.extras.carrierIds, policies: p.extras.policies,
        key: matchCol >= 0 ? normKey(cfg.matchField, cells[matchCol]) : '',
      };
    });

    // ---- one chunked lookup for the whole batch ----
    const byKey = new Map<string, any>();
    const values: string[] = [];
    plans.forEach((p) => {
      if (matchCol < 0) return;
      variantsFor(cfg.matchField, String(p.cells[matchCol] ?? '')).forEach((v) => values.push(v));
    });
    const uniqueValues = Array.from(new Set(values));

    const absorb = (data: any[]) => (data || []).forEach((r: any) => {
      const k = normKey(cfg.matchField, r[cfg.matchField]);
      if (k && !byKey.has(k)) byKey.set(k, r);
    });

    // A deleted contact must not match. Otherwise "update existing" would write
    // into a tombstone nobody can see, and "skip duplicates" would skip someone
    // the broker deliberately removed and is now re-importing.
    const live = (q: any) => (isContacts ? q.is('deleted_at', null) : q);

    let lookupError: string | null = null;
    for (let i = 0; i < uniqueValues.length && !lookupError; i += LOOKUP_CHUNK) {
      const { data, error } = await live(sb.from(table)
        .select(lookupCols))
        .in(cfg.matchField, uniqueValues.slice(i, i + LOOKUP_CHUNK));
      if (error) { lookupError = error.message || 'lookup failed'; break; }
      absorb(data);
    }

    // Case-folding sweep, for the rows the exact pass did not find. Strictly
    // additive: if PostgREST refuses the filter we keep what pass one found
    // rather than failing rows that are probably fine.
    if (!lookupError && (cfg.matchField === 'email' || cfg.matchField === 'name')) {
      const seen = new Set<string>();
      const missing: string[] = [];
      plans.forEach((p) => {
        if (!p.key || byKey.has(p.key) || seen.has(p.key)) return;
        const raw = String(p.cells[matchCol] ?? '').trim();
        if (!raw || !OR_SAFE.test(raw)) return;
        seen.add(p.key);
        missing.push(raw);
      });
      for (let i = 0; i < missing.length; i += OR_CHUNK) {
        const filter = missing.slice(i, i + OR_CHUNK)
          .map((v) => `${cfg.matchField}.ilike.${pgQuote(likeEscape(v))}`)
          .join(',');
        const { data, error } = await live(sb.from(table).select(lookupCols)).or(filter);
        if (error) break;
        absorb(data);
      }
    }

    // A failed lookup fails this batch's rows and nothing else — a bad chunk
    // must never abort an import that is 4,000 rows in.
    if (lookupError) {
      plans.forEach((p) => {
        res.failed += 1;
        res.errors.push({ line: p.line, message: 'Could not check for existing records: ' + lookupError, cells: p.cells });
      });
      done += plans.length; tick();
      continue;
    }

    // ---- decide what happens to each row ----
    const toCreate: RowPlan[] = [];
    const toUpdate: { plan: RowPlan; existing: any }[] = [];
    plans.forEach((p) => {
      const match = p.key ? byKey.get(p.key) : null;
      if (match) {
        if (cfg.mode === 'create') { res.skippedDuplicate += 1; done += 1; return; }
        toUpdate.push({ plan: p, existing: match });
        return;
      }
      if (cfg.mode === 'update') { res.skippedNotFound += 1; done += 1; return; }
      toCreate.push(p);
    });
    tick();

    // Related records are collected per batch and written once at the end of it.
    const notes: { contact_id: string; body: string }[] = [];
    const carrierLinks: { contact_id: string; carrier_id: string }[] = [];
    const policyRows: { contact_id: string; pol: PlannedPolicy }[] = [];
    const collectRelated = (p: RowPlan, id: string) => {
      if (!isContacts || !id) return;
      p.notes.forEach((body) => notes.push({ contact_id: id, body }));
      p.carrierIds.forEach((carrier_id) => carrierLinks.push({ contact_id: id, carrier_id }));
      p.policies.forEach((pol) => policyRows.push({ contact_id: id, pol }));
    };

    // ---- creates: one insert for the batch ----
    if (toCreate.length) {
      const stamp = new Date().toISOString();
      const payloads = toCreate.map((p) => {
        const built = planRow(cfg, p.cells, true);
        const payload: Record<string, unknown> = {};
        mappedFields.forEach((f) => {
          if (f.indexOf('custom:') === 0) return;
          if (f === 'ghl_contact_id') return;
          payload[f] = built.patch[f] ?? (f === 'tags' || f === 'coverage_types' ? [] : null);
        });
        // A policy set can imply a line even when no lines column was mapped.
        if (isContacts && built.extras.policies.length) {
          const implied = Array.from(new Set(built.extras.policies.map((x) => x.line)));
          payload.coverage_types = mergeList(payload.coverage_types, implied);
        }
        if (hasCustom) payload.custom = built.custom || {};
        payload.agent_id = cfg.ownerId || null;
        if (isContacts) {
          // The local: prefix is load-bearing — see the header of this file.
          payload.ghl_contact_id = newLocalId();
          payload.origin = 'crm';
          payload.dnd = false;
          payload.ghl_date_added = stamp;
          // Load-bearing too: this is what stops the Active Client trigger
          // mailing every client in the file.
          payload.imported_at = stamp;
        }
        return payload;
      });

      const { data, error } = await sb.from(table).insert(payloads).select(pk);
      if (error) {
        // A 400 from PostgREST costs this batch's inserts, not the import.
        toCreate.forEach((p) => {
          res.failed += 1;
          res.errors.push({ line: p.line, message: error.message || 'Insert refused', cells: p.cells });
        });
      } else {
        res.created += toCreate.length;
        toCreate.forEach((p, i) => {
          const id = isContacts ? String(payloads[i].ghl_contact_id) : String((data || [])[i]?.[pk] ?? '');
          // A second CSV row carrying the same key now matches the row we just
          // made, instead of creating a twin.
          if (p.key) byKey.set(p.key, { ...payloads[i], [pk]: id });
          collectRelated(p, id);
        });
      }
      done += toCreate.length; tick();
    }

    // ---- updates: PostgREST cannot patch many rows with different values in
    // one call, so these go one at a time through a small pool. The match
    // lookup above is what the "never one query per row" rule is about.
    if (toUpdate.length) {
      await pool(toUpdate, 5, async ({ plan, existing }) => {
        const patch: Record<string, unknown> = { ...plan.patch };
        delete patch[pk];
        if (plan.custom) {
          // Writing `custom` replaces the whole jsonb, so merge onto what is
          // already there rather than wiping every other custom field.
          patch.custom = { ...(existing.custom || {}), ...plan.custom };
        }
        if (isContacts) {
          if (patch.tags !== undefined) patch.tags = mergeList(existing.tags, patch.tags);
          const impliedLines = plan.policies.map((x) => x.line);
          if (patch.coverage_types !== undefined || impliedLines.length) {
            patch.coverage_types = mergeList(
              existing.coverage_types,
              mergeList(patch.coverage_types, impliedLines));
          }
        }
        const id = existing[pk];
        collectRelated(plan, String(id || ''));
        if (!Object.keys(patch).length) { res.updated += 1; done += 1; tick(); return; }
        // Bumping the stamp is what tells the Active Client UPDATE trigger that
        // this disposition change came from a file, not from a broker.
        if (isContacts) patch.imported_at = new Date().toISOString();
        const { error } = await sb.from(table).update(patch).eq(pk, id);
        if (error) {
          res.failed += 1;
          res.errors.push({ line: plan.line, message: error.message || 'Update refused', cells: plan.cells });
        } else {
          res.updated += 1;
        }
        done += 1; tick();
      });
    }

    // ---- notes land in the notes tab, not in a column ----
    if (notes.length) {
      const { error } = await sb.from('ph_notes').insert(notes);
      if (error) res.noteErrors.push(error.message || 'Notes could not be saved');
      else res.notesCreated += notes.length;
    }

    // ---- carriers are a join table: (contact_id, carrier_id) is the key, so a
    // re-import of the same file adds nothing and refuses nothing ----
    if (carrierLinks.length) {
      const seen = new Set<string>();
      const uniq = carrierLinks.filter((l) => {
        const k = l.contact_id + '|' + l.carrier_id;
        if (seen.has(k)) return false;
        seen.add(k); return true;
      });
      const { error } = await sb.from('ph_contact_carriers')
        .upsert(uniq, { onConflict: 'contact_id,carrier_id', ignoreDuplicates: true });
      if (error) res.relatedErrors.push('Carriers could not be linked: ' + (error.message || 'refused'));
      else res.carriersLinked += uniq.length;
    }

    // ---- policies have no natural key in the table, so the importer supplies
    // one: contact + line + policy number. Running the same file twice adds no
    // second copy of a policy, which is the whole reason this is not a plain
    // insert ----
    if (policyRows.length) {
      const ids = Array.from(new Set(policyRows.map((p) => p.contact_id)));
      const have = new Set<string>();
      for (let i = 0; i < ids.length; i += LOOKUP_CHUNK) {
        const { data, error } = await sb.from('ph_policies')
          .select('contact_id, line, policy_number').in('contact_id', ids.slice(i, i + LOOKUP_CHUNK));
        if (error) { res.relatedErrors.push('Could not check existing policies: ' + error.message); break; }
        (data || []).forEach((p: any) =>
          have.add(`${p.contact_id}|${normValue(p.line)}|${normValue(p.policy_number || '')}`));
      }
      const fresh: any[] = [];
      policyRows.forEach(({ contact_id, pol }) => {
        const k = `${contact_id}|${normValue(pol.line)}|${normValue(pol.policy_number || '')}`;
        if (have.has(k)) { res.policiesSkipped += 1; return; }
        have.add(k);
        fresh.push({
          contact_id,
          agent_id: cfg.policyAgentId ?? cfg.ownerId ?? null,
          line: pol.line,
          carrier_id: pol.carrier_id,
          carrier_name: pol.carrier_name,
          policy_number: pol.policy_number,
          status: pol.status,
          premium: pol.premium,
          premium_freq: pol.premium_freq,
          effective_date: pol.effective_date,
          renewal_date: pol.renewal_date,
          notes: pol.notes,
        });
      });
      if (fresh.length) {
        const { error } = await sb.from('ph_policies').insert(fresh);
        if (error) {
          res.relatedErrors.push(
            'Policies could not be saved: ' + (error.message || 'refused') +
            '. ph_policies is owner-scoped — an import run as a broker has to assign the policies to that broker.');
        } else {
          res.policiesCreated += fresh.length;
        }
      }
    }
    if (writesPolicies && !isContacts) {
      res.relatedErrors.push('Policy columns only apply to a contacts import; they were ignored.');
    }

    tick();
  }

  done = res.total; tick();
  return res;
}
