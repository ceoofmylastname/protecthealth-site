# CLAUDE.md — ProtectHealth 2.0

Context for Claude Code sessions working in this repo.

## What this is

Full rebuild of protecthealth.com for ProtectHealth (Las Vegas insurance brokerage — Robert Morgen, Brian Douglas, Brenda Morgen, Jason Vasquez). Static Astro site, GitHub → Cloudflare Pages. Lead capture: GoHighLevel via serverless function at `/api/lead` — `functions/api/*.js` (Pages Functions, env via context.env). Netlify was the original deploy target and is GONE as of Aug 7 2026; `netlify.toml` and `netlify/functions/*.mjs` were deleted. There is exactly one copy of each handler now. Do not recreate a mirror. Lead magnet delivery at `/api/lead-magnet` (Resend; env RESEND_API_KEY, RESEND_FROM) — upserts contact + tags by campaign + note with form answers + opportunity in the "ProtectHealth New Lead/Client" pipeline (location nF7RwerbB5hn27XaM9D2). Requires `GHL_API_TOKEN` (Private Integration token, contacts.write + opportunities.write) — set in Cloudflare Pages on BOTH Production and Preview as of Jul 27 2026, alongside `PH_HOOK_SECRET` and `RESEND_API_KEY`. Cloudflare only injects env vars into NEW deployments, so adding a variable without redeploying leaves every handler 500ing. Booking runs on a CUSTOM calendar at `/talk-to-a-broker`, not the GHL iframe — `/api/slots` (GET, proxies GHL free-slots, needs `calendars.readonly`) feeds it and `/api/book` (POST, needs `calendars/events.write`) upserts the contact + writes the real appointment on calendar naoB13PMLUxH7fAcVXg0 + note + opportunity. Every form thank-you state links to `/talk-to-a-broker?skip=qualify#book` (skips the four qualifying questions because /api/lead already captured them). The GHL booking iframe is GONE site-wide — do not reintroduce it; the custom picker exists so slot availability, timezone display and the collision re-check stay under our control. The site operationalizes two confirmed marketing campaigns:

1. **ICHRA campaign** ("Strategy Over Product") — Realtors, 1099s, self-employed → `/self-employed`
2. **Paychex campaign** ("More Than Your Group Plan") — business owners with employees → `/employers`

Campaign briefs and launch kits live in the claude.ai project "Strategy Over Product — ICHRA & 1099 Campaign" under `Protect Health 2.0/`.

## GHL custom fields (Website Intake)

Every form answer is written to a purpose-built contact field, not just the note. The `CF` map + `intakeFields()` helper is duplicated byte-identically across `functions/api/{lead,book,lead-magnet}.js` — when you change one, change all three. (This used to say six, counting Netlify mirrors that no longer exist.) Ids are hardcoded rather than looked up by key, because `/contacts/upsert` resolves ids directly and a key lookup would cost a round trip on every submission.

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

## Mobile (90% of traffic) — stage 1 landed Jul 27 2026

**The CSS is still desktop-first: 35 `max-width` queries against 2 `min-width`.** Base styles are desktop and get collapsed downward, and the touch tier is a hand-maintained list of selectors under `@media (pointer: coarse), (max-width: 1023px)` in `global.css`. That is why `.lp-photo`, `.lp-aurora`, `.lp-grad`, the marquees and the spotlight were all animating on phones until Jul 27 — each one has to be added by hand. **Adding any new animation means adding it to that block too.** A full mobile-first inversion is planned but NOT done.

Rules that came out of the stage-1 audit and must hold going forward:

- **Every `auto-fit`/`auto-fill` grid uses `minmax(min(Npx, 100%), 1fr)`.** A bare `minmax(330px, 1fr)` track cannot shrink below its floor, so it punches out of a 360px container and scrolls the whole document sideways. `.grid.cols-2` did this on four pages.
- **`overflow: clip` requires Safari 16+ and is silently dropped on older iOS.** Never let containment depend on it alone. `.stackzone` did, and its 50vw glow at `right: -14vw` escaped, widened the document, and made Safari zoom the page out — the "site gets thinner as you scroll" bug. Fix pattern: put decorative layers in their own `overflow: hidden` wrapper (`.sz-decor`) so the sticky ancestor never needs any overflow at all. There is also an `@supports not (overflow: clip)` fallback in `global.css` putting `overflow-x: hidden` on `html`, not `body`, so sticky survives.
- `body { overflow-x: clip }` is the safety net, deliberately `clip` and not `hidden` — `hidden` on body creates a scroll container and silently kills every `position: sticky` on the page. It is a net, not a licence to ship overflowing layout.
- **Never put `overflow: hidden` on an ancestor of a `position: sticky` element.** `.bb` did, which made the booking Continue dock inert for months. Clip decorative pseudo-elements by drawing them inside the box instead.
- Markdown tables are `display: block; overflow-x: auto` below 700px and real tables above it. 37 content files contain tables.
- `.article .hero-img` carries `aspect-ratio: 16/9`. Without it 118 pages shift their whole body on image load.
- Tap targets: 44px floor, enforced for text links under `@media (pointer: coarse)` at the bottom of `global.css`. `min-height` does nothing on an inline element — use `inline-flex`.
- `viewport-fit=cover` is in the viewport meta. Without it every `env(safe-area-inset-*)` in the codebase resolves to 0px on iOS.
- `LeadForm` focuses inputs **synchronously**. iOS only raises the keyboard for a `focus()` inside the user-gesture window; a `setTimeout` version silently never opened it.
- `FloatingMagnet` yields via IntersectionObserver when `.lead-form`, `.lp-formwrap`, `.bb` or the footer is in view. It used to sit over the bottom ~81px of the viewport during the entire form interaction and steal submit taps.
- **Disabling an animation that reveals an element must restore `opacity` and `transform` in the same rule.** `.hw` on the homepage h1 starts at `opacity: 0` and `wordUp` is what reveals it; the mobile tier killed the animation without restoring opacity, so "Insurance second." — half the homepage headline — was invisible on every phone and tablet until Jul 27. The `prefers-reduced-motion` block had it right and the mobile tier did not. Check both blocks whenever you touch a reveal animation.

**Not yet done:** responsive images. Zero `srcset`, `sizes`, `image-set()` or `astro:assets` anywhere — a 360px phone downloads the same 2K asset a desktop does, and six landing-page heroes are CSS `background-image` so they cannot be responsive without media queries. Blocked on localizing the hotlinked art first (roadmap item 3).

## Search Console / indexing (state as of Jul 27 2026)

Domain property `protecthealth.com` is verified. `sitemap-index.xml` submitted and reading Success. `robots.txt` allows Google plus GPTBot, ClaudeBot, PerplexityBot, CCBot and Google-Extended, and points at the sitemap. Sitemap URLs are extensionless and match canonicals exactly; `/admin` and `/campaign-gallery` are filtered out.

The Jul 27 coverage export showed **zero 404s and zero 403s** after the migration. Everything flagged was either expected (redirects, proper canonicals) or stale Webflow-era URLs. Two things worth carrying forward:

- **`news.protecthealth.com` is a dormant beehiiv newsletter** with one post from Oct 2024. A Domain property pulls it into coverage reports alongside the real site, so some flagged URLs are not this repo at all.
- **"Crawled - currently not indexed" diagnoses internal linking, not content quality.** All 12 flagged pages belonged to product clusters, none to ichra or employers — because the campaign landing pages carry cluster reading libraries and the product clusters did not. Fixed by giving service pages the same treatment (see below). If pages go un-indexed again, check inbound internal links before rewriting anything.

## Service pages hub their cluster

`services/[slug].astro` carries a `SERVICE_CLUSTER` map and renders every post in its cluster as a card plus every cluster Q&A as a pill, below the CTA band. health-insurance and gap-health-insurance hub `nevada-core`; life-insurance hubs `life`; medicare hubs `medicare`; dental-insurance and vision-insurance share `dental-vision`. It de-duplicates against the hand-curated `rich.reading` list. Same conversion-first-education-after rule as the BOFU pages: never above the CTA.

## E-E-A-T bylines (added Jul 27 2026)

Three licensed brokers carry the content. `AUTHORS` + `CLUSTER_AUTHOR` + `personSchema()` live in `src/lib/site.ts`; the visible half is `src/components/AuthorByline.astro`.

**Author on the blog pillars, reviewer on the Q&A and FAQ layer.** That split is a truthfulness decision, not a design one. A named broker as `author` is publicly standing behind the words; on agency-written Q&A the accurate claim is that a licensed broker checked the answer, so those pages use `reviewedBy` with the answer still attributed to the Organization.

Assignment is by **subject expertise**, never round-robin — a broker credited outside their stated specialty is a weaker signal than no byline. Robert Morgen: ichra + employers. Brian Douglas: nevada-core + medicare + the site-wide FAQ. Brenda Morgen: life + dental-vision.

One `Person` node per page, emitted standalone and referenced by `@id` (`{domain}/team-members/{slug}#person`) from `BlogPosting.author` or `QAPage.reviewedBy`. Never inline a second Person.

**Two things are deliberately incomplete and must not be faked:**

- `licenseNumber` and `sameAs` are empty strings/arrays on all three. Nevada producer license number + LinkedIn URL are the strongest author-authority signals in a licensed industry and they are the two we do not have. `personSchema()` omits empty values so nothing false reaches the JSON-LD. Fill them when Rob supplies them; never invent them.
- **Brenda Morgen's bio is a DRAFT pending her approval.** She had no bio at all before Jul 27. What is there now asserts only her role, agency and city — no years of experience, no license number, no carrier appointments. She carries the byline on 4 posts and their Q&A children, so she must read and correct it. Her wording wins.

**RESOLVED (owner confirmation, Jul 28 2026): the family name is Morgen.** The site already spells it Morgen everywhere, so nothing needed changing in the repo. If "Morgan" appears in any external profile the brokers control (Google Business, LinkedIn, state licensing records, directory listings), it should be corrected to Morgen there, because inconsistent spelling across the web weakens the entity match between the bylines and the people.

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

## Content depth standard (owner decision, Jul 27 2026)

Full spec: `content-depth-and-linking-standard.md` in the AI Website Authority wiki. Seven requirements, all mandatory, on blog posts, Q&A pages and the buyer's guide. **The entire existing library is currently below this floor** — 22 blogs at 330–600 words, 88 Q&A at ~283 median, and zero external links anywhere on the site. Treat every page as pending rewrite, not as compliant.

| # | Requirement | Blog | Q&A |
|---|---|---|---|
| 1 | Body word count | 2,000+ | 900–1,200 |
| 2 | One H1, question-form H2s, H3 subsections | ✓ | ✓ |
| 3 | Inline internal links inside body prose | 6–10 | 4–6 |
| 4 | External citations to gov/nonprofit authorities | 3–5 | 2–3 |
| 5 | Human-sounding copy | ✓ | ✓ |
| 6 | Nevada / Clark County specificity | ✓ | ✓ |
| 7 | Related Reading block, image cards, below the CTA | ✓ | ✓ |

Rules that are easy to get wrong:

- **Never link a company that sells insurance.** External links go to `.gov`, state regulators, official statistics bodies, or non-commercial associations and research nonprofits only. No aggregators, no comparison sites, no lead vendors. This is the one outbound mistake that actively transfers authority to a competitor.
- **Word count is body copy only.** Frontmatter, Quick Answer bullets, speakable text, the FAQ block and the Related Reading block do not count.
- **Q&A sits at 900–1,200 deliberately, not 2,000.** Padding a single-question page buries the extractable answer, which is the entire reason the page type exists.
- **Localization means Nevada, not translation.** Nevada Health Link, the Silver State Health Insurance Exchange, the Nevada Division of Insurance, Clark County networks, Las Vegas hospitality and tipped-wage examples. Never invent a local fact — a wrong deadline is worse than a generic sentence.
- **No inline link inside the first 160 characters under an H2.** That passage is the extractable answer and must stay clean.
- **Depth work is a content change, never a slug change**, and `dateModified` is set per page as it is genuinely rewritten, never bulk-stamped across a batch.

`src/components/RelatedContent.astro` owns requirement 7 on both `blog-post/[slug].astro` and `qa/[slug].astro`. It auto-populates from cluster + funnel stage, renders Q&A and guides as image cards off `QA_ART` / `BLOG_ART`, de-duplicates, and is placed BELOW `.cta-band`. Do not move it above the CTA and do not hand-curate its lists.

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
6. ~~Real og-default.webp~~ **DONE.** Share cards and icons are complete as of Jul 27: real `og-default.webp` built off the actual logo, campaign cards (`og-self-employed.webp`, `og-employers.webp`), and favicon.png / favicon-48.png / apple-touch-icon.png / icon-512.png generated from `public/assets/icon-source.png` via `scripts/make-icons.py`. All 110 blog and Q&A pages now emit their OWN `og:image` from `BLOG_ART` / `QA_ART` rather than the site default — **use the `.png`, not the `.webp`**, because several social scrapers will not render a WebP share card.
7. `llms-full.txt` generation script. The >25-page trigger fired long ago; content is at 147 pages.
8. **Mobile-first inversion (stage 2).** Stage 1 shipped Jul 27 — see the Mobile section. The inversion itself, flipping 35 `max-width` queries so base styles are mobile, is not started. Do it in reviewable chunks: a green build proves nothing about whether it still looks right, so each section needs eyeballing at 360px on a real phone.
9. Optional: monthly Apify review re-pull as a scheduled task.

**DONE, do not re-plan:** DNS cutover (the domain has served the Cloudflare build since before Jul 27 — `robots.txt` on the live domain is this repo's file), Search Console wired and sitemap submitted, campaign OG images, `/campaign-gallery` script + post-card tabs, service-page cluster hubs, mobile stage 1.

Blocked on Rob, not buildable: whether the Paychex arrangement limits CTA/ad-copy language and whether creative needs carrier compliance review (together these gate all paid spend), which platforms launch first, and the Fred handoff mechanics.

## Conventions

- Content: `src/content/blog/*.md`, `src/content/qa/*.md` (frontmatter schemas in `src/content.config.ts` — zod-enforced).
- Brand/org data: `src/lib/site.ts`. Services data: `src/lib/services.ts`.
- URL patterns preserved from Webflow: `/blog-post/[slug]`, `/about-us`, `/our-team`, `/contact-us`, `/free-quote`, `/team-members/[slug]`. Old `/projects/*` URLs 301 via `public/_redirects`.
- Verify after build — use `-o | wc -l`, NOT `-c`. `grep -c` counts matching lines and Astro minifies five of the six blocks onto one line, so `-c` returns 2 and looks broken. The correct command:

  ```
  grep -o 'application/ld+json' dist/blog-post/what-is-an-ichra.html | wc -l     # expect 6
  grep -o '"@type":"[A-Za-z]*"' dist/blog-post/what-is-an-ichra.html | sort -u
  ```

  Expect 6 blocks on a blog post: InsuranceAgency (global org) + BlogPosting + **Person** + WebPage (speakable) + BreadcrumbList + FAQPage. Q&A pages carry QAPage + Person + WebPage + BreadcrumbList, with FAQPage nested inside QAPage via `hasPart` rather than as its own block.
