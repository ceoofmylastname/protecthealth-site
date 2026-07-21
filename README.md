# ProtectHealth 2.0

AEO/GEO-optimized rebuild of protecthealth.com. Astro static site → GitHub → Cloudflare Pages, with Supabase for lead capture. Built to the AI Website Authority wiki spec.

## Stack

- **Astro 5** — static HTML output (AI crawlers read raw HTML; no JS required to render content)
- **Cloudflare Pages** — hosting + `_redirects` for legacy Webflow URLs
- **Supabase** — `leads` table receives all form submissions (see `supabase/schema.sql`)
- **Claude Code** — dev environment; see `CLAUDE.md` for project conventions and the content roadmap

## Quick start

```bash
npm install
cp .env.example .env   # add Supabase keys
npm run dev            # http://localhost:4321
npm run build          # outputs to dist/
```

## Deploy (Cloudflare Pages)

1. Push this repo to GitHub.
2. Cloudflare Pages → Create project → connect the repo.
3. Build command: `npm run build` · Output directory: `dist`
4. Environment variables: `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`
5. Add the custom domain `www.protecthealth.com` when ready to cut over.

## Supabase setup

1. Create a project (or use existing).
2. Run `supabase/schema.sql` in the SQL editor — creates `leads` with RLS (anon INSERT only).
3. Copy the project URL and anon key into `.env` / Cloudflare env vars.

## Architecture (the short version)

- **Two campaign funnels.** `/self-employed` (ICHRA campaign) and `/employers` (Paychex campaign) are the BOFU conversion termini. Blog clusters converge on them: TOFU → MOFU → landing page.
- **Q&A pages** (`/qa/*`) cluster 3 per parent post, cross-linked as siblings, QAPage schema with FAQPage nested via `hasPart`.
- **Every article** carries four JSON-LD schemas (Article/QAPage, FAQPage, Speakable, BreadcrumbList) plus the global Organization schema.
- **FAQ single source of truth:** the `faq` frontmatter array renders both the JSON-LD and the visible accordion — always identical.
- **Discovery:** footer → `/sitemap` hub → `/sitemap/blog` + `/sitemap/qa` (all static `<a href>`), plus XML sitemap and `public/llms.txt`.

## Brand guardrails (do not violate in any content)

1. Strategy over product. No carrier or product names lead any copy. OneHealth is never mentioned in customer-facing content.
2. Never imply everyone qualifies for ICHRA/Section 105/QSEHRA.
3. "Insurance nerds, not tax professionals" + tax-pro referral whenever tax/business structure appears.
4. CTAs invite conversations, never quotes (campaign pages). The win is an advisor conversation, not a price shopper.
5. Anchor line: "The product should serve the strategy — not become the strategy."
