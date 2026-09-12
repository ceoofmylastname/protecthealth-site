// Fetch the Sep 12 2026 employer-tax cluster art and install it into public/assets.
//
// Same pattern, and the same reason, as scripts/fetch-new-art.mjs: the Higgsfield
// CDN returns 403 to the build sandbox and to the Cowork workspace VM, so the
// download has to happen from a machine with normal egress. Run it once on the
// Mac, eyeball the images, commit the result, then this file can be deleted.
//
// Covers the 15 pages added Sep 12 2026: 3 blog posts and 12 Q&A children.
// Seedream 5.0 Pro, 2K source, 16:9, brand palette locked, no text in frame.
//
// For each slug it writes, matching the existing library exactly:
//   <slug>.png    1200px wide, feeds og:image + JSON-LD image
//   <slug>.webp   1200px wide, the on-page hero and card thumbnail
// The 400/800 phone variants are generated at build time by responsive-art.mjs
// and are gitignored, so they are not written here.
//
// Usage from the repo root:
//   npm i                                   (sharp is already a devDependency)
//   node scripts/fetch-employer-tax-art.mjs
//   npm run build
//   git add -A && git commit -m "Editorial art for the employer-tax cluster"
import { existsSync, statSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

let sharp;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.error('Needs sharp. Run `npm i` first (it is already a devDependency).');
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CDN = 'https://d8j0ntlcm91z4.cloudfront.net/user_3GY61bj0wPgc3RYJDtgyJ6LmhTH/';

// [ slug, cdn filename, 'blog' | 'qa' ]
const BATCH = [
  ['nevada-retirement-plan-mandate',                         'hf_20260912_220510_38a09b71-ad20-45d0-82ab-0bf7c5309d2b.png', 'blog'],
  ['small-business-retirement-plan-tax-credits',             'hf_20260912_220510_6ca4d63d-f623-46b4-8bad-225482e8ec25.png', 'blog'],
  ['section-125-plan-employer-payroll-tax-savings',          'hf_20260912_220510_fd078ea9-d76b-48e6-b590-9c20a0c36efa.png', 'blog'],
  ['does-my-nevada-business-have-to-offer-a-retirement-plan','hf_20260912_220510_b8a9971f-4015-4ff7-b266-6ce73251fdb6.png', 'qa'],
  ['what-is-the-nevada-employee-savings-trust',              'hf_20260912_220510_ee185ddc-82b8-4cb2-bca4-fd7832f0acda.png', 'qa'],
  ['is-there-a-penalty-for-not-registering-for-nevada-nest', 'hf_20260912_220510_de598f63-f7ad-439a-9a50-29361ae8404f.png', 'qa'],
  ['how-much-can-employees-save-in-nevada-nest',             'hf_20260912_220510_cc4236fe-6091-4bc9-bb41-d72d11f5e6d2.png', 'qa'],
  ['how-much-is-the-small-business-401k-startup-tax-credit', 'hf_20260912_220510_58aeec09-dee7-406a-ba82-67209d6d48a2.png', 'qa'],
  ['can-a-small-employer-get-a-credit-for-401k-matching',    'hf_20260912_220510_bc11feea-a2ab-4771-b389-95394027f6e3.png', 'qa'],
  ['is-the-work-opportunity-tax-credit-still-available',     'hf_20260912_220510_954072da-ac89-453b-b3bd-933d5cf176fe.png', 'qa'],
  ['what-is-a-safe-harbor-401k',                             'hf_20260912_220510_5bd465fd-b853-4c1d-a308-8172aa8dfa1d.png', 'qa'],
  ['what-is-a-section-125-premium-only-plan',                'hf_20260912_220510_20f29504-450b-4f83-a076-b3fc694b9258.png', 'qa'],
  ['do-pre-tax-premiums-lower-employer-payroll-taxes',       'hf_20260912_220622_8a4efb2e-e13b-490f-b9e2-199ed7999059.png', 'qa'],
  ['can-an-s-corp-owner-participate-in-a-section-125-plan',  'hf_20260912_220622_3bbf21c8-2b6a-48b9-bada-da252dc4c817.png', 'qa'],
  ['does-a-section-125-plan-need-a-written-document',        'hf_20260912_220623_5b0fd269-56ff-4617-95ad-036c26e353d1.png', 'qa'],
];

const DIRS = {
  blog: join(root, 'public', 'assets', 'blog-art'),
  qa: join(root, 'public', 'assets', 'qa-art'),
};
for (const d of Object.values(DIRS)) mkdirSync(d, { recursive: true });

const ok = [];
const failed = [];
const suspicious = [];

for (const [slug, file, kind] of BATCH) {
  const out = DIRS[kind];
  try {
    const res = await fetch(CDN + file);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());

    // 1200px wide matches the library. The 2K original is past what an
    // og:image or a 16:9 hero needs, and social scrapers reject oversized cards.
    const png = join(out, `${slug}.png`);
    const webp = join(out, `${slug}.webp`);
    await sharp(buf).resize({ width: 1200, withoutEnlargement: true }).png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(png);
    await sharp(buf).resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 82 }).toFile(webp);

    const kb = Math.round(statSync(png).size / 1024);
    // A real render lands well north of 300KB at this width. Anything smaller
    // usually means the source came back as a flat gradient, worth flagging
    // rather than shipping.
    if (kb < 300) suspicious.push(`${slug} (${kb}KB)`);
    ok.push(slug);
    console.log(`  ok   ${kind.padEnd(4)} ${slug}  ${kb}KB${kb < 300 ? '   <-- CHECK: suspiciously small' : ''}`);
  } catch (err) {
    failed.push(`${slug}: ${err.message}`);
    console.log(`  FAIL ${kind.padEnd(4)} ${slug}: ${err.message}`);
  }
}

console.log('\n===== fetch-employer-tax-art summary =====');
console.log(`installed: ${ok.length}   failed: ${failed.length}`);
if (suspicious.length) console.log('flagged as suspiciously small:\n  ' + suspicious.join('\n  '));
if (failed.length) {
  console.log('failed:\n  ' + failed.join('\n  '));
  console.log('\nA CDN link can expire. Re-generate that slug and update its filename above.');
}
const missing = BATCH.filter(([s, , k]) => !existsSync(join(DIRS[k], `${s}.webp`))).map(([s]) => s);
if (missing.length) {
  console.log('MISSING after run: ' + missing.join(', '));
  process.exit(1);
}
console.log('All 15 installed. Next: npm run build, eyeball a few pages, then commit public/assets.');
