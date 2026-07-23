# CLAUDE.md — ProtectHealth 2.0

Context for Claude Code sessions working in this repo.

## What this is

Full rebuild of protecthealth.com for ProtectHealth (Las Vegas insurance brokerage — Robert Morgen, Brian Douglas, Brenda Morgen, Jason Vasquez). Static Astro site, GitHub → Cloudflare Pages (Netlify legacy supported). Lead capture: GoHighLevel via serverless function at `/api/lead` — Cloudflare version in `functions/api/*.js` (Pages Functions, env via context.env), Netlify mirror in `netlify/functions/*.mjs`. Keep BOTH in sync when editing. Lead magnet delivery at `/api/lead-magnet` (Resend; env RESEND_API_KEY, RESEND_FROM) — upserts contact + tags by campaign + note with form answers + opportunity in the "ProtectHealth New Lead/Client" pipeline (location nF7RwerbB5hn27XaM9D2). Requires `GHL_API_TOKEN` env var in Netlify (Private Integration token, contacts.write + opportunities.write). Thank-you state embeds the GHL "ProtectHealth Consultation" booking calendar (naoB13PMLUxH7fAcVXg0). The site operationalizes two confirmed marketing campaigns:

1. **ICHRA campaign** ("Strategy Over Product") — Realtors, 1099s, self-employed → `/self-employed`
2. **Paychex campaign** ("More Than Your Group Plan") — business owners with employees → `/employers`

Campaign briefs and launch kits live in the claude.ai project "Strategy Over Product — ICHRA & 1099 Campaign" under `Protect Health 2.0/`.

## Non-negotiable content rules

- Anchor line: "The product should serve the strategy — not become the strategy."
- NEVER name OneHealth or any carrier in customer-facing copy.
- NEVER state or imply universal eligibility for ICHRA/Section 105/QSEHRA.
- "We're insurance nerds, not tax professionals" + recommend a tax professional whenever tax or business structure appears.
- Campaign CTAs = book a conversation. Never "get a quote" on `/self-employed` or `/employers` (main-site quote page is fine for general lines).
- The two campaigns stay separate. Never blend ICHRA messaging into `/employers` content or vice versa.
- Fred is the Paychex handoff contact (referenced in internal scripts, not on the site).

## AEO/GEO spec (from the AI Website Authority wiki)

- Every blog post: BlogPosting + FAQPage + Speakable(WebPage) + BreadcrumbList JSON-LD. Organization schema is global (`Base.astro`, `@id: .../#organization`).
- BreadcrumbList: `item` required on ALL positions including the current page.
- FAQ single source: `faq` frontmatter (exactly 5 pairs on blog posts) renders both JSON-LD and accordion via `FAQSection.astro`. Never create a second FAQ system.
- Q&A pages: ONE top-level QAPage schema; FAQPage nested via `hasPart` (avoids duplicate root `mainEntity`). `quickAnswer` (acceptedAnswer) and `speakableText` (#ai-summary) MUST be different content.
- Formatting: answer in first 160 chars under every H2; H2s are real questions; no pronouns in FAQ/speakable/quick-answer text; tables and lists over dense prose.
- `dateModified` only when content genuinely changes. Never bulk-set it.
- Internal linking: TOFU → 1-2 MOFU + 1 sibling TOFU; MOFU → 1 TOFU + BOFU (landing page) + sibling MOFU. Q&A: siblings + parent post.
- BOFU landing pages carry a "reading library" BELOW the conversation form (owner decision, July 2026): dynamic cluster blog cards (TOFU-first) + all cluster QA pills, auto-populated via getCollection filters. Never place cluster links ABOVE the form — conversion first, education after.
- All internal links are plain `<a href>` in static HTML. Slugs are LOCKED once indexed — never rename a published slug.
- New images: WebP, descriptive noun-specific alt text.

## Current content inventory

Blog (10): 3 rewritten legacy posts (nevada-open-enrollment…, silver-state…, small-business-health-insurance) + ICHRA cluster (what-is-an-ichra, realtor-health-insurance-guide, health-insurance-options-self-employed-nevada [TOFU]; ichra-vs-marketplace…, tax-advantaged-health-benefits… [MOFU]) + employers cluster (signs-your-business-needs-hr-support [TOFU]; employee-benefits-guide-small-business [MOFU]).
Q&A (6): 3 per campaign, parents = what-is-an-ichra and signs-your-business-needs-hr-support.

## Content roadmap (build next, in order)

1. **Team member bios + photos** — `src/lib/site.ts` TEAM array + `/team-members/[slug].astro` placeholders. Get real bios/credentials from Rob (E-E-A-T).
2. Employers cluster 3rd TOFU: "Tipped Payroll: What Vegas Restaurants, Bars & Salons Get Wrong" + 3 child Q&As (tipped tax credits, tip credit vs minimum wage, FICA tip credit).
3. Employers 2nd MOFU: "PEO vs. Payroll Service vs. DIY: Total Cost Comparison".
4. ICHRA 3rd QA wave: "how much does health insurance cost for realtors in nevada", "can an s-corp owner use an ichra", "what happens to my ichra if I leave my job".
5. **Localize hotlinked images (HIGH PRIORITY before launch).** All photos (logo, hero, team, services, blog, avatars) currently hotlink to the live Webflow CDN — URLs centralized in `src/lib/site.ts` (ASSETS, TEAM) and `src/lib/services.ts` (image). Download each, convert to WebP, place in `public/assets/`, swap the constants. Do this before the Webflow site is decommissioned or the images 404.
6. Real og-default.webp (current file is a generated placeholder).
7. `llms-full.txt` generation script once content >25 pages.
8. Wire Google Search Console + submit sitemap after DNS cutover.

## Conventions

- Content: `src/content/blog/*.md`, `src/content/qa/*.md` (frontmatter schemas in `src/content.config.ts` — zod-enforced).
- Brand/org data: `src/lib/site.ts`. Services data: `src/lib/services.ts`.
- URL patterns preserved from Webflow: `/blog-post/[slug]`, `/about-us`, `/our-team`, `/contact-us`, `/free-quote`, `/team-members/[slug]`. Old `/projects/*` URLs 301 via `public/_redirects`.
- Verify after build: `grep -c 'application/ld+json' dist/blog-post/what-is-an-ichra.html` (expect 5: Org + BlogPosting + Speakable + Breadcrumb + FAQPage).
