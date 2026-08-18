// CSV import engine, shared by the broker CRM (/app, Contacts view) and the
// house-wide admin book (/admin/contacts).
//
// Everything here is pure logic plus PostgREST calls — no DOM, no styling. Each
// page builds its own wizard chrome in its own class vocabulary (the drawer in
// /app, a modal on /admin) and drives this module. Keeping the parser, the
// alias table, the matching rules and the batch runner in one place is the only
// way the two importers cannot drift apart.
//
// Three rules the rest of the app depends on, and which this file must not
// break:
//   * ph_contacts' primary key is `ghl_contact_id` (text), not a uuid `id`.
//     ph_notes.contact_id is text and references it.
//   * A row created here gets `ghl_contact_id = 'local:<uuid>'` and
//     `origin = 'crm'`. That prefix is the ONLY thing keeping the GoHighLevel
//     sync from treating the row as a stale mirror and overwriting it.
//   * RLS decides what may be written (`ph_is_admin() OR agent_id =
//     ph_agent_id()`), so `agent_id` is set honestly and never worked around.
//     A BEFORE UPDATE trigger claims the fields an update touches so the sync
//     leaves them alone afterwards; that is exactly what we want.

export interface CsvField {
  value: string;      // the column we write, `custom:<key>`, or NOTE_FIELD
  label: string;
  custom?: boolean;
  note?: boolean;
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
}

export interface ImportFailure { line: number; message: string; cells: string[] }

export interface ImportResult {
  total: number;
  created: number;
  updated: number;
  skippedDuplicate: number;
  skippedNotFound: number;
  failed: number;
  errors: ImportFailure[];
  noteErrors: string[];
}

export const NOTE_FIELD = '__note';
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

// ---------------------------------------------------------------------------
// Field catalogue
// ---------------------------------------------------------------------------
const CONTACT_FIELDS: CsvField[] = [
  { value: 'ghl_contact_id', label: 'Contact ID' },
  { value: 'first_name', label: 'First name' },
  { value: 'last_name', label: 'Last name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'date_of_birth', label: 'Date of birth' },
  { value: 'company', label: 'Company' },
  { value: 'job_title', label: 'Role / title' },
  { value: 'street_address', label: 'Street address' },
  { value: 'city', label: 'City' },
  { value: 'state', label: 'State' },
  { value: 'postal_code', label: 'ZIP / postal code' },
  { value: 'source', label: 'Source' },
  { value: 'disposition', label: 'Disposition' },
  { value: 'tags', label: 'Tags' },
  { value: 'coverage_types', label: 'Lines of insurance' },
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
  disposition: ['disposition', 'status', 'contactstatus', 'stage'],
  tags: ['tags', 'tag', 'labels'],
  coverage_types: ['coveragetypes', 'coverage', 'lines', 'lineofinsurance', 'linesofinsurance', 'producttype'],
  [NOTE_FIELD]: ['note', 'notes', 'comment', 'comments', 'remarks'],
  // ph_companies
  name: ['name', 'company', 'companyname', 'business', 'businessname', 'organization', 'organisation', 'account', 'accountname'],
  industry: ['industry', 'sector', 'vertical'],
  employee_count: ['employees', 'employeecount', 'numberofemployees', 'headcount', 'staff', 'size'],
  notes: ['notes', 'note', 'comments', 'description', 'remarks'],
};

export function normName(s: string): string {
  return String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function objectLabel(target: string): string {
  return target === 'companies' ? 'Business' : 'Contact';
}

// Contact fields include every admin-defined custom field (written into the
// `custom` jsonb under its key) plus the Note target, which lands a row in
// ph_notes instead of writing a column.
export function fieldsFor(target: string, customFields: { key: string; label: string }[] = []): CsvField[] {
  if (target === 'companies') return BUSINESS_FIELDS.slice();
  return CONTACT_FIELDS
    .concat((customFields || []).map((f) => ({ value: 'custom:' + f.key, label: f.label, custom: true })))
    .concat([{ value: NOTE_FIELD, label: 'Note', note: true }]);
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
// tags and coverage_types are text[]: a cell splits on ; or , with the empties
// dropped, so "Health; Dental," is two lines, not three.
export function splitList(v: string): string[] {
  return String(v ?? '').split(/[;,]/).map((s) => s.trim()).filter(Boolean);
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
interface RowPlan {
  index: number;
  line: number;
  cells: string[];
  patch: Record<string, unknown>;
  custom: Record<string, unknown> | null;
  note: string | null;
  key: string;
}

// Turn one CSV row into the column patch, the custom-jsonb patch and the note
// body. `forCreate` ignores the skip-blanks setting (there is nothing to
// overwrite) and always emits the same key set, because PostgREST rejects a
// bulk insert whose objects do not all carry identical keys.
function planRow(cfg: ImportConfig, row: string[], forCreate: boolean): { patch: Record<string, unknown>; custom: Record<string, unknown> | null; note: string | null } {
  const patch: Record<string, unknown> = {};
  let custom: Record<string, unknown> | null = null;
  let note: string | null = null;

  cfg.mapping.forEach((field, i) => {
    if (!field) return;
    const raw = String(row[i] ?? '');
    const val = raw.trim();

    if (field === NOTE_FIELD) { if (val) note = raw.trim(); return; }

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

    if (field === 'tags' || field === 'coverage_types') { patch[field] = splitList(val); return; }
    if (field === 'date_of_birth') { patch[field] = parseDate(val); return; }
    if (field === 'employee_count') {
      const n = parseInt(val.replace(/[^0-9]/g, ''), 10);
      patch[field] = Number.isFinite(n) ? n : null;
      return;
    }
    if (field === 'state') { patch[field] = normState(val); return; }
    patch[field] = val || null;
  });

  return { patch, custom, note };
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

export async function runImport(
  sb: any,
  cfg: ImportConfig,
  onProgress?: (done: number, total: number) => void,
): Promise<ImportResult> {
  const isContacts = cfg.target === 'contacts';
  const table = isContacts ? 'ph_contacts' : 'ph_companies';
  const pk = isContacts ? 'ghl_contact_id' : 'id';
  const lookupCols = isContacts ? 'ghl_contact_id, email, phone, custom' : 'id, name, email, phone';
  const matchCol = cfg.mapping.indexOf(cfg.matchField);

  const res: ImportResult = {
    total: cfg.rows.length, created: 0, updated: 0,
    skippedDuplicate: 0, skippedNotFound: 0, failed: 0, errors: [], noteErrors: [],
  };

  // Fields written on create, fixed for the whole run so every payload in a
  // bulk insert has the same shape.
  const mappedFields = Array.from(new Set(cfg.mapping.filter(Boolean)));
  const hasCustom = mappedFields.some((f) => f.indexOf('custom:') === 0);

  let done = 0;
  const tick = () => { if (onProgress) onProgress(done, res.total); };
  tick();

  for (let start = 0; start < cfg.rows.length; start += BATCH_SIZE) {
    const slice = cfg.rows.slice(start, start + BATCH_SIZE);
    const plans: RowPlan[] = slice.map((cells, i) => {
      const p = planRow(cfg, cells, false);
      return {
        index: start + i,
        line: cfg.lines[start + i],
        cells,
        patch: p.patch, custom: p.custom, note: p.note,
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

    let lookupError: string | null = null;
    for (let i = 0; i < uniqueValues.length && !lookupError; i += LOOKUP_CHUNK) {
      const { data, error } = await sb.from(table)
        .select(lookupCols)
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
        const { data, error } = await sb.from(table).select(lookupCols).or(filter);
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

    // ---- creates: one insert for the batch ----
    const notes: { contact_id: string; body: string }[] = [];
    if (toCreate.length) {
      const stamp = new Date().toISOString();
      const payloads = toCreate.map((p) => {
        const built = planRow(cfg, p.cells, true);
        const payload: Record<string, unknown> = {};
        mappedFields.forEach((f) => {
          if (f === NOTE_FIELD || f.indexOf('custom:') === 0) return;
          if (f === 'ghl_contact_id') return;
          payload[f] = built.patch[f] ?? (f === 'tags' || f === 'coverage_types' ? [] : null);
        });
        if (hasCustom) payload.custom = built.custom || {};
        payload.agent_id = cfg.ownerId || null;
        if (isContacts) {
          // The local: prefix is load-bearing — see the header of this file.
          payload.ghl_contact_id = newLocalId();
          payload.origin = 'crm';
          payload.dnd = false;
          payload.ghl_date_added = stamp;
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
          if (isContacts && p.note && id) notes.push({ contact_id: id, body: p.note });
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
        const id = existing[pk];
        if (isContacts && plan.note && id) notes.push({ contact_id: String(id), body: plan.note });
        if (!Object.keys(patch).length) { res.updated += 1; done += 1; tick(); return; }
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
    }

    tick();
  }

  done = res.total; tick();
  return res;
}
