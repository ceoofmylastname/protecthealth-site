// Post-build: generate /llms.txt and /llms-full.txt into dist/.
//
// Why generated, not static (wiki: llms-txt.md, "Static File Maintenance
// Risk"): hand-maintained llms files drift. Counts go stale, new pages never
// get added, and the Last-updated header becomes a lie. This script reads the
// same content collections the site is built from, so the files are correct
// on every deploy by construction.
//
// llms.txt      = curated index: what the site is, key pages, every guide and
//                 answer with its one-line description, grouped by topic.
// llms-full.txt = the full body text of all content pages, so an LLM can
//                 ingest the library in one request instead of 110.
//
// Rules carried over from the content standard: no em dashes, no carrier
// names, nothing here that is not on the rendered pages themselves.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://www.protecthealth.com';

// Internal cluster ids -> reader-facing topic names. Internal vocabulary
// ("cluster", "TOFU") never ships in these files.
const TOPICS = {
  'nevada-core': 'Nevada Health Insurance & The Marketplace',
  ichra: 'Self-Employed, Realtors & 1099 Coverage',
  employers: 'Small Business, Benefits & Payroll',
  medicare: 'Medicare',
  life: 'Life Insurance',
  'dental-vision': 'Dental & Vision',
};
const ORDER = ['nevada-core', 'ichra', 'employers', 'medicare', 'life', 'dental-vision'];

function fm(src) {
  const block = src.split('---')[1] ?? '';
  const get = (k) => block.match(new RegExp(`^${k}:\\s*"(.+?)"`, 'm'))?.[1] ?? '';
  return {
    title: get('title') || get('question'),
    description: get('description'),
    cluster: get('cluster'),
    modified: get('dateModified') || get('datePublished'),
    body: src.split('---').slice(2).join('---').trim(),
  };
}

function load(dir) {
  return readdirSync(join(root, dir))
    .filter((f) => f.endsWith('.md'))
    .map((f) => ({ slug: f.replace(/\.md$/, ''), ...fm(readFileSync(join(root, dir, f), 'utf8')) }));
}

const blogs = load('src/content/blog');
const qas = load('src/content/qa');
const today = new Date().toISOString().slice(0, 10);

// ---------- llms.txt ----------
let out = `# ProtectHealth

> ProtectHealth is an owner-operated, licensed insurance brokerage in Las Vegas, Nevada. Health, life, GAP, Medicare, dental and vision coverage, plus employer benefits alongside payroll and HR through an official Paychex partnership. The operating principle on every page: the product should serve the strategy, not become the strategy. Content is written or reviewed by licensed Nevada brokers and cites government and regulator sources only.

Key Nevada facts this site documents that national sources frequently get wrong:
- Nevada open enrollment runs November 1 through December 31 through Nevada Health Link, the state-based marketplace. The December 15 deadline widely quoted nationally applies to states on the federal HealthCare.gov platform, not Nevada.
- Nevada prohibits a tip credit. Tips may not be applied toward the minimum wage, which changes payroll for every hospitality employer in the state. The federal FICA tip credit remains available.
- Nevada expanded Medicaid, so Medicaid enrolls year round.

Generated: ${today}. Library: ${blogs.length} in-depth guides and ${qas.length} single-question answer pages, all with government citations.

## Start Here

- [ACA Changes For 2027, Nevada Edition](${SITE}/aca-changes): Which new federal marketplace rules apply in Nevada and which stop at the state line. Countdown to the November 1 open.
- [The Insurance Buyer's Guide](${SITE}/buyers-guide): How to buy coverage without being sold, product by product, with primary sources to verify everything independently.
- [Self-Employed & 1099 Coverage Strategy](${SITE}/self-employed): The five real coverage paths for Realtors, contractors and freelancers, including what disqualifies each.
- [Employer Benefits & Paychex Partnership](${SITE}/employers): Benefits, payroll and HR for Nevada businesses, with the headcount thresholds that change obligations.
- [About ProtectHealth](${SITE}/about-us): Who runs the agency, and how to verify any producer through the Nevada Division of Insurance.
- [Talk To A Broker](${SITE}/talk-to-a-broker): Free 20-minute strategy conversation, booked on live calendar availability.
`;

for (const c of ORDER) {
  const b = blogs.filter((p) => p.cluster === c);
  const q = qas.filter((p) => p.cluster === c);
  if (!b.length && !q.length) continue;
  out += `\n## ${TOPICS[c]}\n\n### Guides\n\n`;
  for (const p of b) out += `- [${p.title}](${SITE}/blog-post/${p.slug}): ${p.description}\n`;
  out += `\n### Quick Answers\n\n`;
  for (const p of q) out += `- [${p.title}](${SITE}/qa/${p.slug}): ${p.description}\n`;
}

out += `\n## Optional

- [Full content of every page in one file](${SITE}/llms-full.txt)
- [XML sitemap](${SITE}/sitemap-index.xml)
- [All coverage lines](${SITE}/services)
- [The team](${SITE}/our-team)
`;

writeFileSync(join(root, 'dist', 'llms.txt'), out);

// ---------- llms-full.txt ----------
let full = `# ProtectHealth, Full Content Library\n\nGenerated: ${today}. ${blogs.length} guides + ${qas.length} answer pages. Each section begins with its canonical URL. Content is identical to the rendered pages; markdown links inside bodies use site-relative paths under ${SITE}.\n`;

for (const c of ORDER) {
  full += `\n\n${'='.repeat(70)}\nTOPIC: ${TOPICS[c]}\n${'='.repeat(70)}\n`;
  for (const p of blogs.filter((x) => x.cluster === c)) {
    full += `\n\n----- GUIDE -----\nURL: ${SITE}/blog-post/${p.slug}\nTitle: ${p.title}\nUpdated: ${p.modified}\n\n${p.body}\n`;
  }
  for (const p of qas.filter((x) => x.cluster === c)) {
    full += `\n\n----- ANSWER -----\nURL: ${SITE}/qa/${p.slug}\nQuestion: ${p.title}\nUpdated: ${p.modified}\n\n${p.body}\n`;
  }
}

writeFileSync(join(root, 'dist', 'llms-full.txt'), full);
console.log(`[llms-txt] wrote llms.txt (${(out.length / 1024).toFixed(0)}KB) and llms-full.txt (${(full.length / 1024).toFixed(0)}KB) for ${blogs.length + qas.length} content pages`);
