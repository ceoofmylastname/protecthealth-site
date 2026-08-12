// Fetch the Aug 12 2026 editorial art batch and install it into public/assets.
//
// Why this is a script you run rather than files in a commit: the Higgsfield
// CDN refuses requests from the build sandbox (403), so the download has to
// happen from a machine with normal egress. Run it once on the Mac, review
// the images, commit the results, then this file can be deleted.
//
// What it replaces: ten wave-2 posts shipped with flat gradient placeholders
// instead of real editorial art (they are the only files in blog-art under
// ~200KB, versus 700KB+ for every real piece). ichra-nevada shipped with no
// art at all. This installs all eleven.
//
// For each slug it writes, matching the existing library exactly:
//   public/assets/blog-art/<slug>.png   1200px wide, feeds og:image + JSON-LD
//   public/assets/blog-art/<slug>.webp  1200px wide, the on-page hero
//
// Usage from the repo root:
//   npm i          (sharp is already a devDependency)
//   node scripts/fetch-new-art.mjs
//   npm run build && git add -A && git commit -m "Real editorial art for 11 posts" && git push
import { writeFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
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
const OUT = join(root, 'public', 'assets', 'blog-art');
const BASE = 'https://d8j0ntlcm91z4.cloudfront.net/user_3HO1vPQtOhOaysTUBeL4ts348h5/hf_20260812_144139_';

// slug -> generation job id. Seedream 5 Pro, 2K, 16:9, brand palette locked.
const BATCH = [
  ['small-business-health-insurance-renewals', '4552e9cf-07ad-4088-ba96-dd9e03e444e3'],
  ['life-insurance-for-new-parents-nevada', '92f36e5c-77c2-4ec3-93bb-a8bbf2523f22'],
  ['health-insurance-for-construction-contractors-nevada', 'e46534e5-ccac-4829-97af-4bf107b87828'],
  ['health-insurance-for-rideshare-delivery-drivers-nevada', '1d21a943-973f-4f76-9029-568d2caf5f52'],
  ['working-past-65-medicare-nevada', '2617572d-5128-44a3-9137-313a5009f098'],
  ['health-insurance-for-casino-hospitality-workers-las-vegas', 'e32d5d0b-fb43-4241-bd98-9b7f3aceb1fe'],
  ['medicare-savings-programs-nevada', '9cbb9598-bc86-4829-b755-d624a88f6053'],
  ['health-insurance-window-shopping-nevada', 'af5f8fb0-9999-44f4-b549-6f06602a509b'],
  ['nevada-special-enrollment-periods-explained', 'e021ae92-9f77-4a1f-9f30-4f37bf500458'],
  ['medicare-part-d-prescription-drug-coverage-nevada', '727b1c34-1eaf-4684-967f-30b2d9077bdc'],
  ['ichra-nevada', '57e00e04-54e9-4337-a75a-5540acdd1fc9'],
];

mkdirSync(OUT, { recursive: true });
const ok = [];
const failed = [];

for (const [slug, id] of BATCH) {
  try {
    const res = await fetch(`${BASE}${id}.png`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());

    // 1200px wide matches every other file in this directory. The 2K original
    // is far past what an og:image or a 16:9 hero needs, and social scrapers
    // reject oversized cards.
    const png = join(OUT, `${slug}.png`);
    const webp = join(OUT, `${slug}.webp`);
    await sharp(buf).resize({ width: 1200, withoutEnlargement: true }).png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(png);
    await sharp(buf).resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 82 }).toFile(webp);

    const kb = Math.round(statSync(png).size / 1024);
    // A real render lands well north of 300KB at this width. Anything smaller
    // means the source came back as a flat gradient again, which is the exact
    // failure being fixed here, so it is worth flagging rather than shipping.
    ok.push(`${slug} (${kb}KB${kb < 300 ? '  <-- CHECK: suspiciously small' : ''})`);
    console.log(`  ok ${slug}  ${kb}KB`);
  } catch (err) {
    failed.push(`${slug}: ${err.message}`);
    console.log(`  FAIL ${slug}: ${err.message}`);
  }
}

console.log('\n===== fetch-new-art summary =====');
console.log(`installed: ${ok.length}   failed: ${failed.length}`);
if (failed.length) {
  console.log('failed:\n  ' + failed.join('\n  '));
  console.log('\nThe CDN link for a failed slug may have expired. Re-generate that one and update its id above.');
}
const missing = BATCH.filter(([s]) => !existsSync(join(OUT, `${s}.webp`))).map(([s]) => s);
if (missing.length) {
  console.log('MISSING after run: ' + missing.join(', '));
  process.exit(1);
}
console.log('All eleven installed. Next: npm run build, eyeball a few pages, then commit public/assets/blog-art.');
