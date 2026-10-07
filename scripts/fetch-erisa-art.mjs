// Fetch the Oct 7 2026 ERISA landing page art and install it into public/assets/erisa.
//
// Same reason as fetch-new-art.mjs: the Higgsfield CDN 403s both the Cowork
// cloud sandbox and the desktop VM, so the download runs on the Mac itself.
//
//   node scripts/fetch-erisa-art.mjs
//
// Writes, per piece:
//   public/assets/erisa/<name>.webp        1600px wide, hero/section art
//   public/assets/erisa/<name>-800.webp    phone variant for srcset
//   public/assets/erisa/<name>.png         1200px, feeds JSON-LD ImageObject
// Plus the social card:
//   public/assets/og-erisa.webp            1200x630 cover crop
//   public/assets/guides/cover-erisa.webp  760x984 guide cover (3:4)
//
// Nano Banana Pro, 2K, 16:9. Brand palette locked (navy / cyan / gold glass).
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
const OUT = join(root, 'public', 'assets', 'erisa');
const BASE = 'https://d8j0ntlcm91z4.cloudfront.net/user_3GY61bj0wPgc3RYJDtgyJ6LmhTH/hf_20261007_1615';

// Guide cover: separate CDN stamp, portrait 3:4, lands in /assets/guides.
const COVER = 'https://d8j0ntlcm91z4.cloudfront.net/user_3GY61bj0wPgc3RYJDtgyJ6LmhTH/hf_20261007_162931_266c0d6f-1289-4956-b3b6-0d21f11156e6.png';

const BATCH = [
  ['hero', '00_23653a6b-cdeb-4ab9-a075-da71efbd30fb'],
  ['mechanism', '00_052bcff8-5e0c-4e0e-a791-28fa618320e9'],
  ['fit', '00_799567cf-5c4f-4ae3-b08c-e1023c92daeb'],
  ['states', '00_209bb70f-24ae-450b-a6e7-aa9cd6aeaaaf'],
  ['shield', '01_0cc0c0c6-f2ff-4c7e-9048-67347f81eb57'],
];

mkdirSync(OUT, { recursive: true });
const failed = [];

for (const [name, id] of BATCH) {
  try {
    const res = await fetch(`${BASE}${id}.png`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await sharp(buf).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82 }).toFile(join(OUT, `${name}.webp`));
    await sharp(buf).resize({ width: 800, withoutEnlargement: true }).webp({ quality: 80 }).toFile(join(OUT, `${name}-800.webp`));
    await sharp(buf).resize({ width: 1200, withoutEnlargement: true }).png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(join(OUT, `${name}.png`));
    if (name === 'shield') {
      await sharp(buf).resize(1200, 630, { fit: 'cover', position: 'centre' }).webp({ quality: 82 }).toFile(join(root, 'public', 'assets', 'og-erisa.webp'));
    }
    const kb = Math.round(statSync(join(OUT, `${name}.webp`)).size / 1024);
    console.log(`  ok ${name}  ${kb}KB`);
  } catch (err) {
    failed.push(`${name}: ${err.message}`);
    console.log(`  FAIL ${name}: ${err.message}`);
  }
}

try {
  const res = await fetch(COVER);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await sharp(buf).resize(760, 984, { fit: 'cover', position: 'centre' }).webp({ quality: 82 }).toFile(join(root, 'public', 'assets', 'guides', 'cover-erisa.webp'));
  console.log('  ok cover-erisa');
} catch (err) {
  failed.push(`cover: ${err.message}`);
  console.log(`  FAIL cover: ${err.message}`);
}

const missing = BATCH.filter(([n]) => !existsSync(join(OUT, `${n}.webp`))).map(([n]) => n);
if (failed.length || missing.length) {
  console.log('failed: ' + failed.join(' | '));
  console.log('missing: ' + missing.join(', '));
  process.exit(1);
}
console.log('All five installed plus og-erisa.webp. Next: npm run build, then commit public/assets/erisa and og-erisa.webp.');
