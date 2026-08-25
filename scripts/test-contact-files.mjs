// Documents panel on a contact record — the decisions that are not DOM.
// No network, no browser.
//
// Run: npx esbuild src/lib/contact-files.ts --bundle --format=esm --outfile=dist-test/contact-files.js
//      node scripts/test-contact-files.mjs
import {
  DOC_FOLDERS, DOC_MAX_BYTES, DOC_BLOCKED,
  docIcon, fmtBytes, docSlug, docPath, splitQueue, groupFolders,
} from '../dist-test/contact-files.js';

let pass = 0, fail = 0;
const ok = (name, cond, extra) => {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra !== undefined ? '\n       ' + JSON.stringify(extra) : '')); }
};

// ---- storage keys ---------------------------------------------------------
// The whole point of the slug: Supabase does not url-decode object keys on the
// way back out, so a key that needs encoding is a file nobody can ever open.
const NASTY = 'Ana María — ACA application (2026) #3 [signed].pdf';
ok('slug drops characters that need url-encoding', /^[\w.\-]+$/.test(docSlug(NASTY)), docSlug(NASTY));
ok('slug keeps the extension', docSlug(NASTY).endsWith('.pdf'), docSlug(NASTY));
ok('slug collapses runs of whitespace', docSlug('a   b.csv') === 'a_b.csv', docSlug('a   b.csv'));
ok('slug never returns empty', docSlug('中文.pdf').length > 0 && docSlug('') === 'file',
  [docSlug('中文.pdf'), docSlug('')]);
ok('slug is length-capped', docSlug('x'.repeat(400) + '.pdf').length <= 80, docSlug('x'.repeat(400) + '.pdf').length);

// The first path segment is what the storage RLS policy checks ownership
// against. If this ever stops being the bare contact id, every upload 403s.
const p = docPath('cJ8xK2', 'f1e2d3c4', NASTY);
ok('path starts with the contact id and nothing else', p.split('/')[0] === 'cJ8xK2', p);
ok('path has exactly one slash', p.split('/').length === 2, p);
ok('path carries the uuid so same-name uploads never collide',
  docPath('c1', 'u1', 'scan.pdf') !== docPath('c1', 'u2', 'scan.pdf'));
ok('a contact id is not smuggled out of its own folder by the filename',
  docPath('c1', 'u1', '../../other/evil.pdf').split('/').length === 2,
  docPath('c1', 'u1', '../../other/evil.pdf'));

// ---- what is refused before the network -----------------------------------
const batch = [
  { name: 'application.pdf', size: 2 * 1024 * 1024 },
  { name: 'book-of-business.csv', size: 900 },
  { name: 'huge-scan.pdf', size: DOC_MAX_BYTES + 1 },
  { name: 'exactly-fifty.pdf', size: DOC_MAX_BYTES },
  { name: 'installer.EXE', size: 10 },
  { name: 'notes.pdf.exe', size: 10 },
];
const split = splitQueue(batch);
ok('oversize file is held back', split.tooBig.map((f) => f.name).join() === 'huge-scan.pdf', split.tooBig);
ok('a file exactly at the cap is allowed', split.queue.some((f) => f.name === 'exactly-fifty.pdf'));
ok('executables are held back, case-insensitively',
  split.blocked.map((f) => f.name).sort().join() === 'installer.EXE,notes.pdf.exe', split.blocked);
ok('double extension does not sneak past', DOC_BLOCKED.test('notes.pdf.exe'));
ok('a pdf named like an exe is fine', !DOC_BLOCKED.test('exe-guide.pdf'));
ok('the good files queue', split.queue.map((f) => f.name).sort().join() === 'application.pdf,book-of-business.csv,exactly-fifty.pdf',
  split.queue);
ok('both refusals are reported to the broker', split.notes.length === 2, split.notes);
ok('an all-good batch reports nothing', splitQueue([{ name: 'a.pdf', size: 1 }]).notes.length === 0);
ok('an empty batch is not an error', splitQueue([]).queue.length === 0);

// ---- folder ordering ------------------------------------------------------
const files = [
  { id: 1, folder: 'Other' },
  { id: 2, folder: 'Zebra stuff' },
  { id: 3, folder: 'Application' },
  { id: 4, folder: 'Application' },
  { id: 5, folder: 'Alpha stuff' },
  { id: 6, folder: null },
  { id: 7, folder: 'Policy' },
];
const grouped = groupFolders(files);
ok('starter folders come first, in their fixed order',
  grouped.slice(0, 3).map(([k]) => k).join() === 'Application,Policy,Other',
  grouped.map(([k]) => k));
ok('office-invented folders sort A–Z after the starters',
  grouped.slice(3).map(([k]) => k).join() === 'Alpha stuff,Zebra stuff',
  grouped.map(([k]) => k));
ok('a null folder falls into Other',
  grouped.find(([k]) => k === 'Other')[1].map((f) => f.id).sort().join() === '1,6');
ok('no empty folder is produced', grouped.every(([, v]) => v.length > 0));
ok('every file lands in exactly one folder',
  grouped.reduce((n, [, v]) => n + v.length, 0) === files.length);
ok('nothing renders for an empty book', groupFolders([]).length === 0);
ok('the starter set is what the picker offers', DOC_FOLDERS.length === 7 && DOC_FOLDERS[0] === 'Application');

// ---- display --------------------------------------------------------------
ok('pdf icon by mime', docIcon('application/pdf', 'x.bin') === '📕');
ok('spreadsheet icon by name when mime is generic',
  docIcon('application/octet-stream', 'book.csv') === '📊');
ok('image icon', docIcon('image/heic', 'card.heic') === '🖼️');
ok('unknown type still gets an icon', docIcon(null, 'thing.qqq') === '📎');
ok('bytes under 1 KB', fmtBytes(900) === '900 B', fmtBytes(900));
ok('kilobytes', fmtBytes(2048) === '2 KB', fmtBytes(2048));
ok('megabytes keep one decimal while small', fmtBytes(2.5 * 1024 * 1024) === '2.5 MB', fmtBytes(2.5 * 1024 * 1024));
ok('big megabytes drop the decimal', fmtBytes(42 * 1024 * 1024) === '42 MB', fmtBytes(42 * 1024 * 1024));
ok('a null size does not render NaN', fmtBytes(null) === '0 B', fmtBytes(null));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
