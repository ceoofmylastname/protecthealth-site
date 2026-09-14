# Partner Review Page — Setup

**Route:** `/partners/review`
**Built:** September 13, 2026
**Stack:** static Astro shell on Cloudflare Pages, content served by a Supabase edge function after a server-side code check.

## Why it is built this way

A static site has no server to check a code against. Any check done in page JavaScript is visible in the browser console and the content behind it is in view-source. So the page is a shell: the gate and a renderer. The strategy content, the creative, and the signed asset URLs only leave the `ph-review-gate` function after a valid six-digit code, and the resulting session token is checked on every load. Nothing sensitive is in the HTML.

Supabase edge functions are already the pattern for everything server-side on this site (`ph-booking-emails`, `ph-asset-ingest`, the campaign sender), so this adds no new infrastructure.

## Files

| Path | What it is |
|---|---|
| `src/pages/partners/review.astro` | The page. Self-contained, no layout or component imports, scoped styles. |
| `supabase/functions/ph-review-gate/index.ts` | Verifies codes, issues tokens, serves content and signed URLs. |
| `supabase/functions/ph-review-gate/content.json` | All the review content. Edit this to update the page. Redeploy the function. |
| `supabase/migrations/20260913_review_gate.sql` | Tables, bucket, and the code-insert helper. |

## Deploy, in order

**1. Migration.** Apply `20260913_review_gate.sql` to `hrzonmnswzwridwqbspb`. Creates `ph_review_codes`, `ph_review_attempts`, the private `review-assets` bucket, and `ph_review_code_add()`.

**2. Secrets.** Two random strings, 32+ characters each.

```
supabase secrets set REVIEW_PEPPER='...' REVIEW_TOKEN_SECRET='...'
```

**3. Codes.** One per person. Codes are hashed with the pepper; the table never holds a plain code. Run in the SQL editor with the same pepper value you set above:

```sql
select public.ph_review_code_add('483920', 'Sean', 'PEPPER_VALUE', null);
select public.ph_review_code_add('715304', 'Rob',  'PEPPER_VALUE', null);
select public.ph_review_code_add('260981', 'Fred', 'PEPPER_VALUE', null);
```

Per-person codes mean `last_used_at` tells you who has opened it and when. To revoke one person, set `active = false` on their row.

**4. Function.** `supabase functions deploy ph-review-gate`. It imports `content.json` at build time, so every content edit is a redeploy.

**5. Assets.** Upload to `review-assets` using the filenames in `content.json`'s `gallery` array: `s1.jpg` through `s9.jpg`, `v1.mp4` through `v3.mp4`, `lp.jpg`, `em.jpg`, `winning-team.pdf`. Plus `logos/paychex-900x246.png` and `logos/protecthealth.png`. Missing files render as "Asset not uploaded yet" rather than breaking the page.

**6. Page env.** The page reads `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY`. Both are already set for the site.

**7. Build and verify.** After deploy, confirm: the code entry works, a wrong code is rejected, six wrong codes in a row return the rate-limit message, `view-source:` on the page contains no strategy text, and the page carries `X-Robots-Tag` and `<meta name="robots" content="noindex">`.

## Keep it out of the index

This site was built to be maximally readable by AI systems. That is the exact property this page must not have. Check every one of these, because the site's own automation will try to pull the route in.

| Where | What to do |
|---|---|
| `<meta name="robots">` | Already in the page: `noindex, nofollow, noarchive, nosnippet`. |
| `X-Robots-Tag` header | Add to `public/_headers` for `/partners/review`: `X-Robots-Tag: noindex, nofollow, noarchive`. The function already sets it on its own responses. |
| Sitemap | Exclude `/partners/review` from the sitemap generator. If the generator walks `src/pages`, add the route to its exclusion list. |
| `llms.txt` | Do not list the route. Check the generator does not enumerate pages automatically. |
| `CLUSTER_ORDER` and the blog topic browser | Not a content-collection page, so it will not appear, but confirm the browser does not crawl `src/pages`. |
| Navigation and footer | Never linked. The URL is shared directly with code holders only. |
| `robots.txt` | Optional: `Disallow: /partners/review`. Note this advertises the path exists. The meta tag and header are the real controls; leave robots.txt alone unless you want belt and suspenders. |
| Cloudflare cache | `Cache-Control: no-store` is set on function responses. The static shell can be cached; it contains nothing. |

## Updating content

Edit `content.json` and redeploy the function. The renderer supports these block types: `p`, `h3`, `table`, `callout` (kinds `warn` and `note`), `quote`, `script`, `timeline`, `decisions`, `gallery`, `diagram`. Status chips on timeline and gallery items are free text and get a class from the lowercased, hyphenated value, so `Needs review` becomes `chip-st-needs-review`. Add a CSS rule for any new status.

## Rate limiting

Five attempts per IP per fifteen minutes. A six-digit space is one million codes; at five per fifteen minutes that is roughly 570 years to exhaust. Sufficient for a review page shared with three people.

## What this page is not

It is not a CMS and it is not meant to outlive the review. When the campaign is approved, the useful parts of `content.json` move to their real homes: the timeline into the project plan, the creative into the asset library, the scripts into the campaign brief. Then deactivate the codes.
