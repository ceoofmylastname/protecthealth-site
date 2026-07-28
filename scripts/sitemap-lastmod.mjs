// Post-build: inject REAL per-URL <lastmod> into the sitemap.
//
// Why this exists (wiki: sitemap-lastmod-authenticity, indexation-recovery-
// playbook): the sitemap shipped with no <lastmod> at all, and a sitemap that
// carries no freshness signal gives Google nothing to re-evaluate a page
// against. That is the wiki's #1 named cause of "Crawled - currently not
// indexed" backlogs. The July 2026 coverage export showed exactly that: 20
// URLs crawled on 7/25, before the content depth rewrite landed, and never
// re-evaluated.
//
// The rule that matters more than the mechanism: lastmod must be TRUE.
// Dates come only from content frontmatter (dateModified, else datePublished)
// and from an explicit hand-maintained map for pages whose rewrite dates are
// known facts. Any URL we cannot honestly date gets NO lastmod, because one
// fabricated date poisons trust in all of them (Google has said it ignores
// lastmod site-wide when it catches lying). NEVER bulk-stamp today's date
// across the file.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://www.protecthealth.com';

const dates = new Map();

// Content collections: real editorial dates from frontmatter.
for (const [dir, urlPrefix] of [
  ['src/content/blog', '/blog-post/'],
  ['src/content/qa', '/qa/'],
]) {
  for (const f of readdirSync(join(root, dir))) {
    if (!f.endsWith('.md')) continue;
    const fm = readFileSync(join(root, dir, f), 'utf8').split('---')[1] ?? '';
    const mod = fm.match(/^dateModified:\s*"([0-9-]+)"/m)?.[1];
    const pub = fm.match(/^datePublished:\s*"([0-9-]+)"/m)?.[1];
    const d = mod ?? pub;
    if (d) dates.set(SITE + urlPrefix + f.replace(/\.md$/, ''), d);
  }
}

// Pages with genuinely known change dates. Each entry documents WHY the date
// is true. Update the date only when the page content genuinely changes.
const PAGE_DATES = {
  '/aca-changes': '2026-07-27',      // page created
  '/self-employed': '2026-07-28',    // depth rewrite: matrix, stats removed
  '/employers': '2026-07-28',        // depth rewrite: matrix, stats removed
  '/buyers-guide': '2026-07-28',     // verification/sources section added
  '/about-us': '2026-07-28',         // verification section, citations added
};
for (const [path, d] of Object.entries(PAGE_DATES)) dates.set(SITE + path, d);

const smPath = join(root, 'dist', 'sitemap-0.xml');
let xml = readFileSync(smPath, 'utf8');
let stamped = 0;

xml = xml.replace(/<url><loc>([^<]+)<\/loc><\/url>/g, (whole, loc) => {
  const d = dates.get(loc);
  if (!d) return whole; // no honest date, no lastmod
  stamped++;
  return `<url><loc>${loc}</loc><lastmod>${d}</lastmod></url>`;
});

writeFileSync(smPath, xml);
console.log(`[sitemap-lastmod] stamped ${stamped} URLs with real dates, left ${(xml.match(/<url>/g) ?? []).length - stamped} without lastmod`);
