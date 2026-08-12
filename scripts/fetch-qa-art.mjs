// Fetch the Aug 12 2026 Q&A art batch and install it into public/assets/qa-art.
//
// Why a script instead of files in a commit: the Higgsfield CDN refuses
// requests from the build sandbox (connection reset), so the download has to
// happen from a machine with normal egress. Run it once on the Mac, review the
// images, commit, then this file can be deleted.
//
// What it replaces: 40 of the 128 Q&A pages shipped with flat gradient
// placeholders instead of real editorial art. Two independent checks agree on
// exactly the same 40 slugs: their Laplacian variance is 15-37 against a
// library median of 233, and their alt text is the boilerplate string
// "Abstract gradient light art in ProtectHealth blues, <question>". The
// matching alt-text fix ships in src/lib/site.ts alongside this.
//
// For each slug it writes, matching the existing Q&A library exactly:
//   public/assets/qa-art/<slug>.webp  full-res 16:9, the on-page hero
//   public/assets/qa-art/<slug>.png   1200px wide, feeds og:image + JSON-LD
//
// Usage from the repo root:
//   npm i          (sharp is already a devDependency)
//   node scripts/fetch-qa-art.mjs
//   npm run build && git add -A && git commit -m "Real Q&A art for 40 pages" && git push
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
const OUT = join(root, 'public', 'assets', 'qa-art');
const BASE = 'https://d8j0ntlcm91z4.cloudfront.net/user_3HO1vPQtOhOaysTUBeL4ts348h5/hf_20260812_';

// slug -> generation path. Nano Banana 2, 2K, 16:9, house palette locked.
// Nano Banana was chosen because it returns 2752x1536, the exact dimensions of
// the 88 Q&A images already in this directory, so the new 40 join the same set
// rather than starting a second render lineage.
const BATCH = [
  ['why-did-my-group-health-renewal-go-up', '180157_a26fdb54-87c9-4a7f-b5d4-f93f5a4482e1'],
  ['how-do-rideshare-drivers-estimate-income-for-subsidies', '180157_6a0fa434-c474-40c6-95b9-96f4875b8609'],
  ['can-you-keep-the-same-health-plan-next-year', '180157_12c68109-fd91-4257-a8cc-5d2b6793f51e'],
  ['how-long-do-you-have-after-a-qualifying-life-event', '180157_b0288ef0-a848-4436-9750-7c901c23df36'],
  ['when-should-parents-buy-life-insurance', '180157_782d3819-ed67-4c34-a1db-25b049b80cdf'],
  ['can-you-change-part-d-plans-every-year', '180157_84dfd1e8-88a7-4e8b-b8d6-fd6e57bcfa62'],
  ['do-uber-and-doordash-drivers-get-health-insurance', '180157_b156b6b2-c16f-4b2e-91f4-6c88ad01d8bf'],
  ['is-union-health-coverage-better-than-marketplace-coverage', '180157_85ae8f1f-ce07-4c1f-b1c0-c5bd5c3961da'],
  ['is-employer-life-insurance-enough-for-a-family', '180157_3d62f1d5-9775-4cdd-a81b-51d2f2ec3a6f'],
  ['does-getting-married-change-health-insurance-options', '180406_11386b0e-8548-4fd5-90af-ad02fe921a32'],
  ['does-moving-to-nevada-trigger-a-special-enrollment-period', '180220_c0953850-6f50-4c0c-b9cc-c6d91fa50374'],
  ['what-happens-if-a-driver-underestimates-income-for-subsidies', '180406_cbf1360f-e906-4c54-80a8-7f54dd957af9'],
  ['can-gig-workers-deduct-health-insurance-premiums', '180220_893c77c9-a949-47e6-a9d0-dbaf5a6b6a89'],
  ['what-is-a-composite-rate-vs-age-banded-rate', '180220_c5436a12-6eb7-4a07-8cfc-913c9c1fb17f'],
  ['when-should-a-small-business-start-shopping-its-renewal', '180220_86e98dae-6015-414c-b177-5f7f2570a41b'],
  ['is-cobra-considered-creditable-coverage-for-medicare', '180220_03bdb98b-04c1-458e-85a9-0f30f60a660a'],
  ['what-coverage-do-seasonal-construction-workers-need', '180220_66f81fc8-ecf1-44de-b3b5-0bd868614d1b'],
  ['does-tip-income-count-toward-health-insurance-subsidies', '180220_20322c95-641f-4c3c-8228-e165a71e269c'],
  ['should-you-name-a-child-as-life-insurance-beneficiary', '180220_927837d3-8046-4562-930d-98912c0ab503'],
  ['what-is-the-qmb-program-in-nevada', '180220_2f340e9e-4c7d-460e-b65a-6700ba9c6ea3'],
  ['what-is-the-medicare-part-d-late-enrollment-penalty', '180243_48a21276-8468-4e22-a6d1-56e6b6eb23aa'],
  ['what-does-medicare-part-d-cost-in-nevada', '180243_7a40a2c1-e123-4c98-814a-57649995edb8'],
  ['how-much-life-insurance-does-a-stay-at-home-parent-need', '180243_3457659a-4f24-4b81-9eb5-74bd698c7eaa'],
  ['can-you-contribute-to-an-hsa-after-enrolling-in-medicare', '180243_ee3158b6-44d3-409f-9815-d626f3103c95'],
  ['can-independent-contractors-get-group-health-rates', '180243_549dda90-40b2-43d9-8883-3a130b34ae10'],
  ['when-can-you-preview-nevada-health-plans-for-next-year', '180243_e69773dd-66a6-4257-9a70-4db9fb534b84'],
  ['what-are-the-income-limits-for-medicare-savings-programs-in-nevada', '180243_afeaa25c-8f86-4313-bb26-12211f743034'],
  ['is-workers-comp-the-same-as-health-insurance', '180243_fee5b03e-6716-4b6d-b7b9-f83d46edb903'],
  ['can-a-business-change-group-plans-mid-year', '180243_57e18889-8a22-4ac8-b725-8ea8f39403db'],
  ['does-medicare-cover-prescriptions-without-part-d', '180243_78b42bd0-911f-4fb9-bc1e-4f8233a2e4b0'],
  ['what-should-you-compare-when-window-shopping-health-plans', '180308_9bd06946-6c78-4dcb-9f38-cc713fea3425'],
  ['does-extra-help-cover-part-d-costs', '180308_bdfca18f-2feb-4098-b64f-80d53bc67510'],
  ['does-losing-a-job-qualify-for-special-enrollment', '180307_a74d24ee-3f2b-48a5-be14-b353a5dd7ada'],
  ['are-health-premiums-deductible-for-1099-contractors', '180308_ef3cdfd7-2c62-4282-8b19-d15dd3b4000f'],
  ['can-part-time-hospitality-workers-get-marketplace-coverage', '180307_4648aa34-a26d-44f0-98dd-3bfa14825d6e'],
  ['do-you-need-medicare-if-you-have-employer-insurance-at-65', '180308_8eee7d19-bdb2-45c4-9a50-d7b216b374f5'],
  ['what-happens-to-medicare-when-you-retire-after-65', '180308_096b69af-922a-4e77-a3bc-84358fecb4de'],
  ['what-documents-do-you-need-for-open-enrollment', '180308_69e8d5a4-b537-453f-9d9b-d87d0e76b0d1'],
  ['how-do-you-apply-for-medicare-savings-programs-in-nevada', '180308_fd5c7070-9a3d-4ce6-8b92-2ccd8e5894b2'],
  ['what-happens-to-health-insurance-during-a-casino-layoff', '180308_2a502c6e-721a-41c3-b631-007e0aa5794e'],
];

mkdirSync(OUT, { recursive: true });
const ok = [];
const small = [];
const failed = [];

for (const [slug, path] of BATCH) {
  try {
    const res = await fetch(`${BASE}${path}.png`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());

    // .webp keeps the full render width, matching the 88 files already here.
    // .png goes to 1200 wide: og:image only, and social scrapers reject
    // oversized cards.
    const webp = join(OUT, `${slug}.webp`);
    const png = join(OUT, `${slug}.png`);
    await sharp(buf).webp({ quality: 82 }).toFile(webp);
    await sharp(buf).resize({ width: 1200, withoutEnlargement: true }).png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(png);

    const kb = Math.round(statSync(png).size / 1024);
    // A real render lands well north of 300KB as a 1200px PNG. The placeholders
    // being replaced here were 103-110KB. Anything under 300 means the source
    // came back flat again, which is the exact failure being fixed, so flag it
    // rather than shipping it.
    if (kb < 300) small.push(`${slug} (${kb}KB)`);
    ok.push(slug);
    console.log(`  ok ${slug}  ${kb}KB${kb < 300 ? '   <-- CHECK: suspiciously small' : ''}`);
  } catch (err) {
    failed.push(`${slug}: ${err.message}`);
    console.log(`  FAIL ${slug}: ${err.message}`);
  }
}

console.log('\n===== fetch-qa-art summary =====');
console.log(`installed: ${ok.length} of ${BATCH.length}   failed: ${failed.length}`);
if (small.length) {
  console.log(`\nStill look like placeholders (${small.length}), regenerate these:\n  ` + small.join('\n  '));
}
if (failed.length) {
  console.log('\nfailed:\n  ' + failed.join('\n  '));
  console.log('\nA CDN link for a failed slug may have expired. Re-generate that one and update its id above.');
}
const missing = BATCH.filter(([s]) => !existsSync(join(OUT, `${s}.webp`))).map(([s]) => s);
if (missing.length) {
  console.log('MISSING after run: ' + missing.join(', '));
  process.exit(1);
}
console.log('\nAll 40 installed. Next: npm run build, eyeball /qa, then commit public/assets/qa-art and src/lib/site.ts.');
