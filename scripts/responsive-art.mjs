// Pre-build: generate width variants of the editorial art so phones stop
// downloading desktop-sized images.
//
// Why (CLAUDE.md "Not yet done: responsive images", now unblocked): 90% of
// this site's traffic is mobile, and every article hero and card was serving
// the same 1200px WebP to a 360px phone as to a desktop. The article column
// is 780px at its widest and the card grid tracks are 240-330px, so a phone
// was pulling roughly 4x the pixels it could use, on the LCP element.
//
// Approach: variants are GENERATED AT BUILD TIME, not committed. The repo
// already carries ~160 art pairs; committing two more variants each would
// triple that for files that are pure derivatives. This script runs before
// `astro build`, writes into public/assets/, and Astro copies the result to
// dist like any other static asset. The variants are gitignored.
//
// Idempotent: an existing variant is left alone, so local rebuilds are
// instant and only a fresh clone (Cloudflare) pays the full cost.
//
// Widths chosen from real rendered sizes, not round numbers:
//   400w  covers card grids on mobile and small cards at 2x
//   800w  covers the article hero on a phone at 2x, and desktop cards
//   1200w the existing file, covers the 780px article column at ~1.5x
// Nothing upscales: 1200px is the widest source on disk, so that is the cap.
import { readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

let sharp;
try {
  sharp = (await import('sharp')).default;
} catch {
  // A missing sharp must not break the site build. Without variants the
  // srcset simply falls back to the 1200px original, which is exactly the
  // behaviour before this script existed.
  console.log('responsive-art: sharp unavailable, skipping variants (pages will serve the 1200px original)');
  process.exit(0);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIRS = ['public/assets/blog-art', 'public/assets/qa-art'];
export const WIDTHS = [400, 800];

let made = 0;
let skipped = 0;
let failed = 0;

for (const rel of DIRS) {
  const dir = join(root, rel);
  if (!existsSync(dir)) continue;
  // Only the base .webp files. A variant is itself a .webp, so filter the
  // -400/-800 suffixes out or the script would recurse over its own output.
  const bases = readdirSync(dir).filter((f) => f.endsWith('.webp') && !/-\d+\.webp$/.test(f));
  for (const file of bases) {
    const src = join(dir, file);
    for (const w of WIDTHS) {
      const out = join(dir, file.replace(/\.webp$/, `-${w}.webp`));
      if (existsSync(out) && statSync(out).size > 0) {
        skipped++;
        continue;
      }
      try {
        await sharp(src).resize({ width: w, withoutEnlargement: true }).webp({ quality: 80 }).toFile(out);
        made++;
      } catch (err) {
        failed++;
        console.log(`responsive-art: FAILED ${file} @${w}w — ${err.message}`);
      }
    }
  }
}

console.log(`responsive-art: generated ${made}, already present ${skipped}${failed ? `, failed ${failed}` : ''}`);
