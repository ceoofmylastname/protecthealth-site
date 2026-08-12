// One-time (safely re-runnable) migration: localize every hotlinked image.
//
// Why (wiki: frontend-asset-optimization, edge-image-optimization; CLAUDE.md
// roadmap item 3): ~110 editorial art pairs plus the landing-page heroes,
// service icons, and team headshots are hotlinked from the Higgsfield
// CloudFront bucket, 10 brand/service images from the old Webflow CDN, and
// the reviewer avatars from Google's lh3 CDN. Third-party CDNs are a single
// point of failure — the day the Webflow account is decommissioned or the
// Higgsfield bucket is cleaned up, every article hero, og:image, JSON-LD
// ImageObject, landing-page hero, and team photo on this site 404s. They are
// also outside our cache-control and un-optimizable.
//
// What this script does:
//   1. BLOG_ART/QA_ART art() entries → downloads both files, recompresses
//      the full-res PNG to max-width 1200 (og:image render size — the 2K
//      originals are 5–10MB, far past scraper limits and pointless at og
//      resolution), saves the already-optimized _min.webp as-is. Output
//      follows the wave-1 convention (public/assets/blog-art/<slug>.png/.webp,
//      qa-art likewise) and entries are rewritten to localBlogArt()/localQaArt().
//   2. ASSETS Webflow images → hero + contact portrait saved as-is (already
//      WebP), the four review avatars converted JPG → 92px WebP (rendered at
//      46px, 2x for retina).
//   3. Every remaining CloudFront URL in site.ts (HF_ASSETS, TEAM photos) and
//      Webflow URL in services.ts → downloaded to public/assets/ext/<filename>
//      (PNGs recompressed to max-width 1600), URL string swapped in place.
//   4. Google reviewer avatars in reviews.ts → 96px JPEGs at
//      public/assets/reviewers/<name-slug>.jpg, URL swapped in place.
//   5. Rewrites happen ONLY for files that actually landed on disk — a failed
//      download leaves that entry pointing at the CDN. Originals are backed
//      up as <file>.bak. A final verify step checks every swapped path exists
//      and prints how many remote URLs remain per file.
//
// Out of scope, deliberately: src/lib/campaign-gallery.json (100 ad creatives
// + 12 videos on a noindex page — localize when the campaign ships) and the
// intro video.
//
// Run it from the repo root on a machine with normal network access:
//   npm i          (sharp is a devDependency)
//   node scripts/localize-images.mjs
// Then: git diff, npm run build, spot-check pages, delete the .bak files,
// commit public/assets + the three lib files. When the summary reports zero
// remote URLs left, the HF2/HF/CDN consts and art() helper are dead code.
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

let sharp;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.error('This script needs sharp. Install with:  npm i  (it is a devDependency)');
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE_TS = join(root, 'src', 'lib', 'site.ts');
const SERVICES_TS = join(root, 'src', 'lib', 'services.ts');
const REVIEWS_TS = join(root, 'src', 'lib', 'reviews.ts');
const HF2 = 'https://d8j0ntlcm91z4.cloudfront.net/user_3GY61bj0wPgc3RYJDtgyJ6LmhTH';
const CDN = 'https://cdn.prod.website-files.com';

const ok = [];
const failed = [];

async function fetchBuf(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

const sanitize = (name) => decodeURIComponent(name).replace(/[^A-Za-z0-9._-]+/g, '-');
const slugify = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ============================================================
// 1. Editorial art (BLOG_ART / QA_ART in site.ts)
// ============================================================
let siteSrc = readFileSync(SITE_TS, 'utf8');
const lines = siteSrc.split('\n');
let block = null;
const entryRe = /^(\s*)'([^']+)':\s*art\('([^']+)',\s*'([^']+)',\s*('.*')\),\s*$/;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('export const BLOG_ART')) block = 'blog';
  else if (line.includes('export const QA_ART')) block = 'qa';
  else if (block && line.trim() === '};') block = null;
  if (!block) continue;

  const m = line.match(entryRe);
  if (!m) continue;
  const [, indent, slug, ts, id, alt] = m;
  const dir = join(root, 'public', 'assets', block === 'blog' ? 'blog-art' : 'qa-art');
  mkdirSync(dir, { recursive: true });
  const pngOut = join(dir, `${slug}.png`);
  const webpOut = join(dir, `${slug}.webp`);
  try {
    if (!existsSync(pngOut)) {
      const buf = await fetchBuf(`${HF2}/hf_20260722_${ts}_${id}.png`);
      await sharp(buf).resize({ width: 1200, withoutEnlargement: true }).png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(pngOut);
    }
    if (!existsSync(webpOut)) writeFileSync(webpOut, await fetchBuf(`${HF2}/hf_20260722_${ts}_${id}_min.webp`));
    const helper = block === 'blog' ? 'localBlogArt' : 'localQaArt';
    lines[i] = `${indent}'${slug}': ${helper}('${slug}', ${alt}),`;
    ok.push(`${block}-art/${slug}`);
    console.log(`  ✓ ${block}-art/${slug}`);
  } catch (err) {
    failed.push(`${block}-art/${slug} (${err.message})`);
    console.log(`  ✗ ${block}-art/${slug}: ${err.message}`);
  }
}
siteSrc = lines.join('\n');

// ============================================================
// 2. ASSETS Webflow images (site.ts)
// ============================================================
const brand = [
  { url: `${CDN}/66c61e488a0b1c025cc02cdc/66c61e498a0b1c025cc02e24_About%20Us-Home%20(1).webp`, out: 'assets/hero-family.webp', transform: null },
  { url: `${CDN}/66c61e488a0b1c025cc02cdc/66c61e498a0b1c025cc02dbc_contact%20us%20img%20(1).webp`, out: 'assets/contact-portrait.webp', transform: null },
  ...['66c61e498a0b1c025cc02e23_Avatar.jpg', '66c61e498a0b1c025cc02e25_Avatar%202.jpg', '66c61e498a0b1c025cc02e27_Avatar%203.jpg', '66c61e498a0b1c025cc02e26_Avatar%204.jpg'].map((f, i) => ({
    url: `${CDN}/66c61e488a0b1c025cc02cdc/${f}`,
    out: `assets/avatar-${i + 1}.webp`,
    transform: (buf) => sharp(buf).resize(92, 92, { fit: 'cover' }).webp({ quality: 82 }).toBuffer(),
  })),
];
for (const b of brand) {
  const outPath = join(root, 'public', b.out);
  try {
    if (!existsSync(outPath)) {
      const buf = await fetchBuf(b.url);
      writeFileSync(outPath, b.transform ? await b.transform(buf) : buf);
    }
    siteSrc = siteSrc.replaceAll('`${CDN}/' + b.url.slice(CDN.length + 1) + '`', `'/${b.out}'`).replaceAll(`'${b.url}'`, `'/${b.out}'`);
    ok.push(b.out);
    console.log(`  ✓ ${b.out}`);
  } catch (err) {
    failed.push(`${b.out} (${err.message})`);
    console.log(`  ✗ ${b.out}: ${err.message}`);
  }
}

// ============================================================
// 3. Remaining CloudFront (site.ts: HF_ASSETS, TEAM) and
//    Webflow (services.ts) URLs → public/assets/ext/
// ============================================================
mkdirSync(join(root, 'public', 'assets', 'ext'), { recursive: true });

async function localizeExt(url) {
  const filename = sanitize(url.split('/').pop());
  const outRel = `assets/ext/${filename}`;
  const outPath = join(root, 'public', outRel);
  if (!existsSync(outPath)) {
    const buf = await fetchBuf(url);
    if (/\.png$/i.test(filename)) {
      await sharp(buf).resize({ width: 1600, withoutEnlargement: true }).png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(outPath);
    } else {
      writeFileSync(outPath, buf);
    }
  }
  return `/${outRel}`;
}

async function sweepCloudfrontAndWebflow(source, label) {
  // Template-literal form `${HF}/<file>` and absolute quoted forms.
  const targets = new Map(); // matched source string -> full URL
  for (const m of source.matchAll(/`\$\{HF2?\}\/([^`]+)`/g)) targets.set(m[0], `${HF2}/${m[1]}`);
  for (const m of source.matchAll(/'(https:\/\/d8j0ntlcm91z4\.cloudfront\.net\/[^']+)'/g)) targets.set(m[0], m[1]);
  for (const m of source.matchAll(/'(https:\/\/cdn\.prod\.website-files\.com\/[^']+)'/g)) targets.set(m[0], m[1]);
  for (const [needle, url] of targets) {
    try {
      const local = await localizeExt(url);
      source = source.replaceAll(needle, `'${local}'`);
      ok.push(`${label}:${local.split('/').pop()}`);
      console.log(`  ✓ ext ${local.split('/').pop()}`);
    } catch (err) {
      failed.push(`${label}:${url.split('/').pop()} (${err.message})`);
      console.log(`  ✗ ext ${url.split('/').pop()}: ${err.message}`);
    }
  }
  return source;
}

// Order matters: sections 1–2 already consumed the art()/ASSETS URLs, so what
// is left in siteSrc is exactly HF_ASSETS + TEAM (+ anything added later).
siteSrc = await sweepCloudfrontAndWebflow(siteSrc, 'site.ts');

let servicesSrc = readFileSync(SERVICES_TS, 'utf8');
const servicesOrig = servicesSrc;
servicesSrc = await sweepCloudfrontAndWebflow(servicesSrc, 'services.ts');

// ============================================================
// 4. Google reviewer avatars (reviews.ts)
// ============================================================
let reviewsSrc = readFileSync(REVIEWS_TS, 'utf8');
const reviewsOrig = reviewsSrc;
mkdirSync(join(root, 'public', 'assets', 'reviewers'), { recursive: true });
for (const m of [...reviewsSrc.matchAll(/name: '((?:[^'\\]|\\.)+)', photo: '(https:\/\/lh3\.googleusercontent\.com\/[^']+)'/g)]) {
  const [, rawName, url] = m;
  const slug = slugify(rawName.replaceAll("\\'", "'"));
  const outRel = `assets/reviewers/${slug}.jpg`;
  const outPath = join(root, 'public', outRel);
  try {
    if (!existsSync(outPath)) {
      const buf = await fetchBuf(url);
      writeFileSync(outPath, await sharp(buf).resize(96, 96, { fit: 'cover' }).jpeg({ quality: 85 }).toBuffer());
    }
    reviewsSrc = reviewsSrc.replaceAll(`'${url}'`, `'/${outRel}'`);
    ok.push(`reviewers/${slug}`);
    console.log(`  ✓ reviewers/${slug}`);
  } catch (err) {
    failed.push(`reviewers/${slug} (${err.message})`);
    console.log(`  ✗ reviewers/${slug}: ${err.message}`);
  }
}

// ============================================================
// 5. Write files (backups first) + verify
// ============================================================
const origSite = readFileSync(SITE_TS, 'utf8');
if (siteSrc !== origSite) {
  writeFileSync(SITE_TS + '.bak', origSite);
  writeFileSync(SITE_TS, siteSrc);
}
if (servicesSrc !== servicesOrig) {
  writeFileSync(SERVICES_TS + '.bak', servicesOrig);
  writeFileSync(SERVICES_TS, servicesSrc);
}
if (reviewsSrc !== reviewsOrig) {
  writeFileSync(REVIEWS_TS + '.bak', reviewsOrig);
  writeFileSync(REVIEWS_TS, reviewsSrc);
}

const missing = [];
for (const m of siteSrc.matchAll(/local(?:Blog|Qa)Art\('([^']+)'/g)) {
  const kind = m[0].includes('Blog') ? 'blog-art' : 'qa-art';
  for (const ext of ['png', 'webp']) {
    const p = join(root, 'public', 'assets', kind, `${m[1]}.${ext}`);
    if (!existsSync(p) || statSync(p).size === 0) missing.push(`${kind}/${m[1]}.${ext}`);
  }
}
for (const src of [siteSrc, servicesSrc, reviewsSrc]) {
  for (const m of src.matchAll(/'(\/assets\/(?:ext|reviewers)\/[^']+)'/g)) {
    const p = join(root, 'public', m[1]);
    if (!existsSync(p) || statSync(p).size === 0) missing.push(m[1]);
  }
}
// Count only actual image references (quoted URLs / template interpolations),
// not const definitions or comments. Definition lines and comments become
// dead text once nothing interpolates them.
const countRemote = (s) =>
  ((s.match(/['`]https:\/\/(?:[^'`]*(?:cloudfront\.net|website-files\.com|lh3\.googleusercontent\.com))[^'`]*['`]/g) ?? []).filter((x) => !/^.const /.test(x)).length -
    (s.match(/^const (?:HF2?|CDN) = ['`]https:\/\//gm) ?? []).length) +
  (s.match(/\$\{(?:HF2?|CDN)\}\//g) ?? []).length;

console.log('\n===== localize-images summary =====');
console.log(`localized: ${ok.length}   failed: ${failed.length}`);
console.log(`remote image references left — site.ts: ${countRemote(siteSrc)}, services.ts: ${countRemote(servicesSrc)}, reviews.ts: ${countRemote(reviewsSrc)}`);
if (failed.length) console.log('failed:\n  ' + failed.join('\n  '));
if (missing.length) {
  console.log('MISSING FILES referenced by swapped code (should never happen):\n  ' + missing.join('\n  '));
  process.exit(1);
}
console.log('Out of scope (still remote, by design): campaign-gallery.json creatives, intro video.');
console.log('Next: git diff, npm run build, spot-check pages at 360px + desktop, delete *.bak, commit public/assets + src/lib changes.');
