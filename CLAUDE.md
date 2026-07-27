# CLAUDE.md — ProtectHealth 2.0

Context for Claude Code sessions working in this repo.

## What this is

Full rebuild of protecthealth.com for ProtectHealth (Las Vegas insurance brokerage — Robert Morgen, Brian Douglas, Brenda Morgen, Jason Vasquez). Static Astro site, GitHub → Cloudflare Pages (Netlify legacy supported). Lead capture: GoHighLevel via serverless function at `/api/lead` — Cloudflare version in `functions/api/*.js` (Pages Functions, env via context.env), Netlify mirror in `netlify/functions/*.mjs`. Keep BOTH in sync when editing. Lead magnet delivery at `/api/lead-magnet` (Resend; env RESEND_API_KEY, RESEND_FROM) — upserts contact + tags by campaign + note with form answers + opportunity in the "ProtectHealth New Lead/Client" pipeline (location nF7RwerbB5hn27XaM9D2). Requires `GHL_API_TOKEN` env var in Netlify (Private Integration token, contacts.write + opportunities.write). Booking runs on a CUSTOM calendar at `/talk-to-a-broker`, not the GHL iframe — `/api/slots` (GET, proxies GHL free-slots, needs `calendars.readonly`) feeds it and `/api/book` (POST, needs `calendars/events.write`) upserts the contact + writes the real appointment on calendar naoB13PMLUxH7fAcVXg0 + note + opportunity. Every form thank-you state links to `/talk-to-a-broker?skip=qualify#book` (skips the four qualifying questions because /api/lead already captured them). The GHL booking iframe is GONE site-wide — do not reintroduce it, the calendar allows 100 appointments per slot so the iframe can double-book brokers. The site operationalizes two confirmed marketing campaigns:

1. **ICHRA campaign** ("Strategy Over Product") — Realtors, 1099s, self-employed → `/self-employed`
2. **Paychex campaign** ("More Than Your Group Plan") — business owners with employees → `/employers`

Campaign briefs and launch kits live in the claude.ai project "Strategy Over Product — ICHRA & 1099 Campaign" under `Protect Health 2.0/`.

## GHL custom fields (Website Intake)

Every form answer is written to a purpose-built contact field, not just the note. The `CF` map + `intakeFields()` helper is duplicated byte-identically in `functions/api/{lead,book,lead-magnet}.js` and their `netlify/functions/*.mjs` mirrors — when you change one, change all six. Ids are hardcoded rather than looked up by key, because `/contacts/upsert` resolves ids directly and a key lookup would cost a round trip on every submission.

| Form key(s) | GHL field | Id |
|---|---|---|
| `role` / `profile` / `interest` | Website Intake: Which Best Describes You | `KFgNfn7tOxlTCmvjvTNj` |
| `structure` | Website Intake: Business Structure | `hN30YvoSCFjYZyl2WYzc` |
| `coverage` | Website Intake: Current Coverage | `j39bQETsnhN3IHgHl6eA` |
| `priority` | Website Intake: What Matters Most | `XAWgGwWLHnw4qQLUNAVv` |
| `notes` | Website Intake: Notes From Lead | `p9xHNA0ev7CyVgwriRXU` |
| `timezone` | Website Intake: Visitor Timezone | `2zyAtyCO5Xd1QKfRLCVI` |
| `industry` | Website Intake: Industry | `wDaeieEvNZtIDU419r2T` |
| `employees` | Website Intake: Employee Count | `lecOVPOTtfw5PLObZjYQ` |
| `friction` | Website Intake: Biggest Friction | `5P4t9QZM7l2nVSf2N1m6` |
| `payroll` | Website Intake: Payroll Provider | `ioUxcZEZUtWdOrNcGN7z` |
| form id | Website Intake: Source Form | `2u611YcsKF5hCczUvpMw` |
| `page` | Website Intake: Landing Page | `gz9zZmpnqjpJYm6ig9nU` |
| booked slot | Website Intake: Appointment Time | `TkMZgKyFxOvXOpJZ0Jji` |
| `magnet` | Website Intake: Lead Magnet | `ES17xjYL7S5hOepLnXGj` |

Three rules that are easy to break:

- **The role question has three spellings.** `/self-employed` sends `profile`, `/free-quote` and `/contact-us` send `interest`, `/talk-to-a-broker` sends `role`. All three land in one column via `ROLE_KEYS`. A new form must reuse one of those keys or add itself to that array.
- **Never send an empty value.** `intakeFields()` drops blanks, because `/contacts/upsert` merges what it receives. A lead who fills the long ICHRA form and later books through the short path keeps every answer the long form captured; sending `''` would erase them.
- **`GHL_API_TOKEN` needs `locations/customFields.readonly`** if you ever resolve fields by key at runtime. The current id-based approach does not, so `contacts.write` still covers it.

Requires `locations/customFields.write` only for creating new fields (done via MCP at build time, not at runtime).

## Booking flow (`/talk-to-a-broker`)

Every "Talk To A Broker" CTA site-wide points here. Four qualifying questions (from the ICHRA launch kit — friction is intentional) → custom slot picker on live GHL availability → contact details → confirmed. `src/components/BrokerBooking.astro` holds the whole state machine; its styles are `is:global` namespaced under `.bb` because day cards and time pills are built at runtime, so Astro's scoped attributes would never land on them.

- Slots are fetched and displayed in the VISITOR's timezone (`Intl` detected, server-validated), not Las Vegas time. The chip states which zone is being shown. `/api/book` records both.
- `/api/book` sets `endTime` explicitly to start + 20 min, matching the calendar's 20-minute meeting duration. Kept explicit so appointment length never silently depends on someone editing a calendar setting.
- `/api/book` re-checks free-slots before writing and 409s on a collision, bouncing the visitor back to a refreshed calendar. Max bookings per slot is 1, so GHL would also reject a true double-book; the re-check closes the race between rendering the picker and submitting it.
- Confirmations/reminders/pipeline automation hang off the GHL native "Appointment Booked" trigger, NOT an inbound webhook — the appointment is real calendar state.
- `/contact-us` stays live (indexed Webflow URL) as general contact. It is no longer the booking destination.

### Calendar naoB13PMLUxH7fAcVXg0 — verified config (July 27, 2026)
Checked against the live GHL booking-rules screen: meeting interval 30 min, meeting duration 20 min, minimum scheduling notice 1 day, date range 21 days (matches what the page requests), max bookings per slot 1, look busy OFF, no pre/post buffer, no daily cap.

An earlier revision of this file listed six config problems on this calendar as "owner decision pending." **All six were either already fixed or were misreadings of the API field names. That section was wrong and has been deleted.** Do not resurrect those claims from older docs or from the claude.ai project notes, both of which still carry the stale version. Read the live calendar before asserting anything about its settings.

Still unverified: round robin membership (Staff & location tab). The staff roster notes describe this calendar as having 4 members, which is why `ph-sync-staff` deliberately skips linking it as a personal calendar.

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

**Blog: 22 posts. Q&A: 88 pages (exactly 4 children per post). 147 pages built.** Verified against `src/content/` on July 27, 2026 — an earlier revision of this file said 10 and 6, which was three build waves out of date.

Clusters: ICHRA (what-is-an-ichra, realtor-health-insurance-guide, health-insurance-options-self-employed-nevada, health-insurance-for-freelancers-and-gig-workers [TOFU]; ichra-vs-marketplace-health-insurance, tax-advantaged-health-benefits-self-employed [MOFU]) → BOFU `/self-employed`. Employers (small-business-health-insurance, signs-your-business-needs-hr-support, tipped-payroll-mistakes-las-vegas [TOFU]; employee-benefits-guide-small-business, peo-vs-payroll-service-vs-diy [MOFU]) → BOFU `/employers`. Product clusters: life, dental-vision, medicare, nevada-core.

Campaign creative: `/campaign-gallery` (noindex, no auth) indexes 100 hotlinked ad images + 12 videos from `src/lib/campaign-gallery.json`, plus 15 vertical video scripts and 17 local post cards from `src/lib/campaign-scripts.ts`. That scripts file is client-safe on purpose — Fred, targeting and paid-spend notes are excluded and must stay excluded.

## Content roadmap (build next, in order)

Items 2, 3 and 4 of the previous list are DONE (tipped-payroll post + child Q&As, PEO vs payroll MOFU, ICHRA 3rd QA wave). Remaining, reordered by what costs money if skipped:

1. **UTM capture.** No handler reads UTM params. `/api/lead` records only `source` form + landing `page`, so 100 ad creatives and 15 scripts are about to run with no way to attribute a lead to one. Needs a 15th custom field and a change to all six handler files. Cheap now, expensive to retrofit.
2. **Nurture sequences.** A magnet download gets its PDF and nothing else; a booking gets confirmation + 24h + 1h reminders. There is no drip for the lead who downloads and goes quiet, which is most of them. Both campaigns need one. Email infrastructure already exists (`ph_email_templates`, `ph-booking-emails`).
3. **Localize hotlinked images (HIGH PRIORITY before Webflow decommission).** Webflow CDN photo suite + 111 Higgsfield art pieces + 100 campaign ad creatives + intro video + Google reviewer avatars. URLs centralized in `src/lib/site.ts` (ASSETS, TEAM, BLOG_ART, QA_ART, HF_ASSETS), `src/lib/services.ts`, `src/lib/reviews.ts`, `src/lib/campaign-gallery.json`. Both campaign landing-page heroes depend on CloudFront URLs nobody here owns.
4. **Four lead-capture defects.** Paychex answers dropped from the Supabase mirror (needs a `ph_leads` migration + `ph-booking-emails` v7 + 4 handler files, ship together or nothing shows); `book.js` `INTAKE_FIELDS` note labels are ICHRA-only; `BrokerBooking.astro` asks employer leads ICHRA-shaped questions; `business` has no custom field (native `companyName` only — decide and document).
5. **Team member bios + photos** — 2 of 6 TEAM entries have no bio at all. Real bios/credentials from Rob (E-E-A-T), plus team approval of the AI-re-rendered headshots before cutover.
6. Real og-default.webp. Campaign OG images are done (`og-self-employed.webp`, `og-employers.webp`); the site-wide default is still a generated placeholder.
7. `llms-full.txt` generation script. The >25-page trigger fired long ago; content is at 147 pages.
8. DNS cutover from Webflow, then wire Google Search Console + submit sitemap.
9. Optional: monthly Apify review re-pull as a scheduled task.

Blocked on Rob, not buildable: whether the Paychex arrangement limits CTA/ad-copy language and whether creative needs carrier compliance review (together these gate all paid spend), which platforms launch first, and the Fred handoff mechanics.

## Conventions

- Content: `src/content/blog/*.md`, `src/content/qa/*.md` (frontmatter schemas in `src/content.config.ts` — zod-enforced).
- Brand/org data: `src/lib/site.ts`. Services data: `src/lib/services.ts`.
- URL patterns preserved from Webflow: `/blog-post/[slug]`, `/about-us`, `/our-team`, `/contact-us`, `/free-quote`, `/team-members/[slug]`. Old `/projects/*` URLs 301 via `public/_redirects`.
- Verify after build: `grep -c 'application/ld+json' dist/blog-post/what-is-an-ichra.html` (expect 5: Org + BlogPosting + Speakable + Breadcrumb + FAQPage).
