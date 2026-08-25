// Exercises the import engine against a fake PostgREST client. No network.
// Run: node scripts/test-csv-import.mjs   (after: npx esbuild ... see below)
import {
  readCsv, autoMap, fieldsFor, scanValues, runImport, mapKey, CREATE_VALUE,
  splitList, parseMoney, templateCsv, resolveValue,
} from '../dist-test/csv-import.js';

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? '\n       ' + JSON.stringify(extra) : '')); }
};

const CATALOGUE = {
  customFields: [{ key: 'referral_source', label: 'Referral source' }],
  carriers: [
    { id: 'c-aetna', name: 'Aetna' },
    { id: 'c-delta', name: 'Delta Dental' },
    { id: 'c-hs', name: 'HealthSpring (Cigna)' },
    { id: 'c-uhc', name: 'United Healthcare' },
  ],
  tags: ['client', 'referral', 'hot lead'],
};

// A file with everything wrong that a real export gets wrong.
const CSV = [
  'First,Last,Email,Mobile,Disposition,Lines of insurance,Carriers,Tags,Notes,Policy line,Policy carrier,Policy number,Policy status,Policy premium,Policy frequency,Policy effective date,Policy 2 line,Policy 2 carrier,Policy 2 number,Policy 2 status,Policy 2 premium',
  'Dana,Whitfield,DANA@example.com,(702) 555-0134,active client,Health; Dental,"Aetna; Delta Dental",referral;vip,"Wants a PPO, in network",Health,Aetna,AET-1,in force,"$412.50",monthly,2026-01-01,Dental,Delta Dental,DD-9,active,29',
  'Marcus,Reed,marcus@example.com,+1 702 555 0199,Follow Up,med supp,Cigna,hot lead,,Medicare,Cigna,MED-7,quoted,180,mo,3/1/2026,,,,,',
  'Nia,Okafor,nia@example.com,7025550175,closed lost,life,"Aetna, Inc.",,Left a voicemail,Life,,LIF-2,applied,55,annually,,,,,,',
].join('\n');

// ---- parsing + mapping -----------------------------------------------------
const r = readCsv(CSV);
ok('parses 3 data rows', r.rows.length === 3, r.error);
ok('keeps a quoted comma inside a note', r.rows[0][8] === 'Wants a PPO, in network', r.rows[0][8]);

const fields = fieldsFor('contacts', CATALOGUE.customFields);
const mapping = autoMap(r.header, fields);
const at = (name) => mapping[r.header.indexOf(name)];
ok('maps Mobile -> phone', at('Mobile') === 'phone', at('Mobile'));
ok('maps Carriers -> __carriers', at('Carriers') === '__carriers', at('Carriers'));
ok('maps Notes -> __note', at('Notes') === '__note', at('Notes'));
ok('maps Policy number -> pol1:policy_number', at('Policy number') === 'pol1:policy_number', at('Policy number'));
ok('maps Policy 2 premium -> pol2:premium', at('Policy 2 premium') === 'pol2:premium', at('Policy 2 premium'));
ok('policy set 2 does not steal set 1', at('Policy line') === 'pol1:line', at('Policy line'));

const cfg = {
  target: 'contacts', header: r.header, rows: r.rows, lines: r.lines, mapping,
  mode: 'create_update', matchField: 'email', skipBlanks: true,
  ownerId: 'agent-1', policyAgentId: 'agent-1', valueMap: {}, catalogue: CATALOGUE,
};

// ---- splitting rules -------------------------------------------------------
ok('semicolon wins over comma', JSON.stringify(splitList('Aetna, Inc.; Delta Dental')) === '["Aetna, Inc.","Delta Dental"]', splitList('Aetna, Inc.; Delta Dental'));
ok('comma splits when there is no semicolon', splitList('Health, Dental').length === 2);
ok('money strips the dollar sign', parseMoney('$412.50') === 412.5, parseMoney('$412.50'));
ok('money on a blank is null not zero', parseMoney('') === null);

// ---- synonym folding -------------------------------------------------------
ok('"active client" folds to Active Client', resolveValue('disposition', 'active client', cfg) === 'Active Client');
ok('"Follow Up" folds to Follow-Up', resolveValue('disposition', 'Follow Up', cfg) === 'Follow-Up');
ok('"closed lost" folds to Not Interested', resolveValue('disposition', 'closed lost', cfg) === 'Not Interested');
ok('"med supp" folds to Medicare', resolveValue('line', 'med supp', cfg) === 'Medicare');
ok('"in force" folds to policy status Active', resolveValue('policy_status', 'in force', cfg) === 'Active');
ok('"mo" folds to Monthly', resolveValue('premium_freq', 'mo', cfg) === 'Monthly');
ok('"annually" folds to Annual', resolveValue('premium_freq', 'annually', cfg) === 'Annual');

// ---- the review step -------------------------------------------------------
const issues = scanValues(cfg);
const kinds = issues.map((i) => i.kind + ':' + i.raw);
ok('flags the unknown carrier Cigna', kinds.includes('carrier:Cigna'), kinds);
ok('suggests HealthSpring (Cigna) for Cigna',
  (issues.find((i) => i.raw === 'Cigna') || {}).suggestions?.includes('HealthSpring (Cigna)'),
  (issues.find((i) => i.raw === 'Cigna') || {}).suggestions);
ok('flags the unlisted tag vip', kinds.includes('tag:vip'), kinds);
ok('does NOT flag a disposition it can fold', !kinds.some((k) => k.startsWith('disposition:')), kinds);
ok('does NOT flag a carrier it matched exactly', !kinds.includes('carrier:Aetna'), kinds);
ok('flags "Aetna, Inc." as its own carrier', kinds.includes('carrier:Aetna, Inc.'), kinds);

// The human decides: Cigna means HealthSpring, "Aetna, Inc." means Aetna,
// vip gets added to the office list.
cfg.valueMap[mapKey('carrier', 'Cigna')] = 'HealthSpring (Cigna)';
cfg.valueMap[mapKey('carrier', 'Aetna, Inc.')] = 'Aetna';
cfg.valueMap[mapKey('tag', 'vip')] = CREATE_VALUE;

// ---- the run, against a fake PostgREST ------------------------------------
function fakeClient(existing = []) {
  const db = { ph_contacts: existing.slice(), ph_notes: [], ph_contact_carriers: [], ph_policies: [] };
  const wrap = (table) => {
    const q = {
      _rows: db[table], _filters: [], _table: table,
      select() { return q; },
      is() { return q; },
      or() { return Promise.resolve({ data: [], error: null }); },
      eq(col, v) { q._filters.push([col, v]); return q; },
      in(col, vals) {
        const set = new Set(vals);
        return Promise.resolve({ data: db[table].filter((r) => set.has(r[col])), error: null });
      },
      insert(rows) {
        const arr = Array.isArray(rows) ? rows : [rows];
        arr.forEach((x) => db[table].push({ ...x }));
        const out = { data: arr, error: null, select: () => Promise.resolve({ data: arr, error: null }) };
        return Object.assign(Promise.resolve(out), out);
      },
      upsert(rows) {
        rows.forEach((x) => {
          const dupe = db[table].some((y) => y.contact_id === x.contact_id && y.carrier_id === x.carrier_id);
          if (!dupe) db[table].push({ ...x });
        });
        return Promise.resolve({ data: rows, error: null });
      },
      update(patch) {
        return {
          eq(col, v) {
            db[table].filter((row) => row[col] === v).forEach((row) => Object.assign(row, patch));
            return Promise.resolve({ data: null, error: null });
          },
        };
      },
    };
    return q;
  };
  return { db, from: wrap };
}

const sb = fakeClient();
const res = await runImport(sb, cfg);

ok('created 3 contacts', res.created === 3, res);
ok('nothing failed', res.failed === 0, res.errors);
ok('every contact row carries imported_at', sb.db.ph_contacts.every((c) => !!c.imported_at));
ok('every contact row got a local: id', sb.db.ph_contacts.every((c) => String(c.ghl_contact_id).startsWith('local:')));

const dana = sb.db.ph_contacts.find((c) => c.email === 'DANA@example.com');
ok('disposition normalised to Active Client', dana.disposition === 'Active Client', dana.disposition);
ok('lines kept both mapped lines', dana.coverage_types.includes('Health') && dana.coverage_types.includes('Dental'), dana.coverage_types);
ok('tags kept referral and vip', dana.tags.includes('referral') && dana.tags.includes('vip'), dana.tags);

const marcus = sb.db.ph_contacts.find((c) => c.email === 'marcus@example.com');
ok('"med supp" landed as Medicare', marcus.coverage_types.includes('Medicare'), marcus.coverage_types);

const nia = sb.db.ph_contacts.find((c) => c.email === 'nia@example.com');
ok('"closed lost" landed as Not Interested', nia.disposition === 'Not Interested', nia.disposition);

ok('carrier links written', sb.db.ph_contact_carriers.length === 4, sb.db.ph_contact_carriers);
ok('Cigna resolved onto the HealthSpring row',
  sb.db.ph_policies.some((p) => p.carrier_id === 'c-hs' && p.policy_number === 'MED-7'),
  sb.db.ph_policies.map((p) => [p.policy_number, p.carrier_id]));
ok('"Aetna, Inc." resolved onto Aetna',
  sb.db.ph_contact_carriers.some((l) => l.contact_id === nia.ghl_contact_id && l.carrier_id === 'c-aetna'),
  sb.db.ph_contact_carriers);

ok('4 policies created', res.policiesCreated === 4, { created: res.policiesCreated, rows: sb.db.ph_policies.length });
const aet = sb.db.ph_policies.find((p) => p.policy_number === 'AET-1');
ok('policy premium parsed from "$412.50"', aet.premium === 412.5, aet.premium);
ok('policy status "in force" -> Active', aet.status === 'Active', aet.status);
ok('policy frequency "monthly" -> Monthly', aet.premium_freq === 'Monthly', aet.premium_freq);
ok('policy effective date parsed', aet.effective_date === '2026-01-01', aet.effective_date);
ok('policy agent_id set for RLS', sb.db.ph_policies.every((p) => p.agent_id === 'agent-1'));
const lif = sb.db.ph_policies.find((p) => p.policy_number === 'LIF-2');
ok('policy with no carrier still writes', !!lif && lif.carrier_id === null, lif);
ok('M/D/YYYY date parsed', sb.db.ph_policies.find((p) => p.policy_number === 'MED-7').effective_date === '2026-03-01');
ok('a policy implies its line on the contact', nia.coverage_types.includes('Life'), nia.coverage_types);
ok('3 notes written', res.notesCreated === 2, { notes: sb.db.ph_notes.length, counted: res.notesCreated });

// ---- re-running the same file must not duplicate anything -----------------
const cfg2 = { ...cfg };
const res2 = await runImport(sb, cfg2);
ok('second run creates no contacts', res2.created === 0, res2);
ok('second run updates the 3 it found', res2.updated === 3, res2);
ok('second run creates no policies', res2.policiesCreated === 0, res2);
ok('second run reports 4 policies already on file', res2.policiesSkipped === 4, res2);
ok('carrier links did not double', sb.db.ph_contact_carriers.length === 4, sb.db.ph_contact_carriers.length);
ok('update run bumps imported_at too', sb.db.ph_contacts.every((c) => !!c.imported_at));

// ---- merge, never replace -------------------------------------------------
const sb3 = fakeClient([{
  ghl_contact_id: 'local:existing', email: 'dana@example.com', phone: '7025550134',
  tags: ['in-force', 'Support: Claims'], coverage_types: ['Medicare'], custom: { foo: 'bar' },
  deleted_at: null,
}]);
const cfg3 = { ...cfg, valueMap: { ...cfg.valueMap }, rows: [r.rows[0]], lines: [r.lines[0]] };
await runImport(sb3, cfg3);
const merged = sb3.db.ph_contacts[0];
ok('email matched case-insensitively', sb3.db.ph_contacts.length === 1, sb3.db.ph_contacts.length);
ok('in-force tag survived the import', merged.tags.includes('in-force'), merged.tags);
ok('support tag survived the import', merged.tags.includes('Support: Claims'), merged.tags);
ok('csv tags were added on top', merged.tags.includes('referral') && merged.tags.includes('vip'), merged.tags);
ok('existing Medicare line survived', merged.coverage_types.includes('Medicare'), merged.coverage_types);
ok('csv lines were added on top', merged.coverage_types.includes('Health'), merged.coverage_types);

// ---- a policy with no recognisable line is reported, not guessed ----------
const badLine = readCsv('Email,Lines of insurance,Policy line,Policy number\nx@y.com,Health;Life,Widgets,W-1');
const badCfg = {
  ...cfg, header: badLine.header, rows: badLine.rows, lines: badLine.lines,
  mapping: autoMap(badLine.header, fields), valueMap: {},
};
const sb4 = fakeClient();
const res4 = await runImport(sb4, badCfg);
ok('unmappable policy line does not write a policy', sb4.db.ph_policies.length === 0, sb4.db.ph_policies);
ok('unmappable policy line is reported on the row', res4.errors.some((e) => /no line of insurance/.test(e.message)), res4.errors);
ok('the contact itself still imported', res4.created === 1, res4);

// ---- the template ---------------------------------------------------------
const tpl = readCsv(templateCsv(CATALOGUE));
ok('template maps onto itself with no gaps',
  autoMap(tpl.header, fields).filter(Boolean).length === tpl.header.length,
  tpl.header.filter((h, i) => !autoMap(tpl.header, fields)[i]));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
