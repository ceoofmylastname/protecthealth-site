// Post-build: submit the sitemap's URLs to IndexNow.
//
// Why (wiki: crawler-infrastructure, ssr-edge-function-architecture): Bing's
// index feeds ChatGPT and Copilot retrieval. IndexNow is the push channel
// that tells Bing (and every other IndexNow engine — Seznam, Naver, Yandex)
// that URLs changed, instead of waiting for a crawl. The key file lives at
// /ed35d12ff7d3df2aef172ca0f94539b6.txt (public/), which is how the
// endpoint verifies we own the host.
//
// Rules this script follows:
//   - Production only. Cloudflare Pages sets CF_PAGES_BRANCH; anything other
//     than `main` (previews, local builds) skips the ping entirely.
//   - Fail-soft. A ping is a courtesy signal, never worth a failed deploy.
//     Every error path logs and exits 0.
//   - One batch POST (the API accepts up to 10,000 URLs per call), sourced
//     from dist/sitemap-0.xml AFTER sitemap-lastmod.mjs has run, so the list
//     is exactly what we publish to Google.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const KEY = 'ed35d12ff7d3df2aef172ca0f94539b6';
const HOST = 'www.protecthealth.com';

const branch = process.env.CF_PAGES_BRANCH;
if (branch !== 'main') {
  console.log(`indexnow: skipped (branch=${branch ?? 'local build'}, pings only run on main)`);
  process.exit(0);
}

try {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const xml = readFileSync(join(root, 'dist', 'sitemap-0.xml'), 'utf8');
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (urls.length === 0) {
    console.log('indexnow: sitemap-0.xml contained no URLs, nothing to submit');
    process.exit(0);
  }

  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: HOST,
      key: KEY,
      keyLocation: `https://${HOST}/${KEY}.txt`,
      urlList: urls,
    }),
  });
  // 200 = accepted, 202 = accepted (key validation pending). Anything else
  // is logged for the build output but never fails the deploy.
  console.log(`indexnow: submitted ${urls.length} URLs, status ${res.status}${res.status === 200 || res.status === 202 ? '' : ' (unexpected — check key file is deployed)'}`);
} catch (err) {
  console.log(`indexnow: ping failed softly (${err?.message ?? err})`);
}
process.exit(0);
