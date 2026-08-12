// Single source of truth for brand + org data.
export const SITE = {
  name: 'ProtectHealth',
  domain: 'https://www.protecthealth.com',
  tagline: 'The product should serve the strategy, not become the strategy.',
  phone: '800-240-8185',
  phoneHref: 'tel:+18002408185',
  description:
    'ProtectHealth is a Las Vegas, Nevada insurance brokerage helping individuals, self-employed professionals, and small businesses build coverage strategies across health, life, dental, vision, Medicare, and employer benefits.',
  email: '',
  address: {
    // Single source of truth for NAP. The footer in Base.astro renders this
    // same string, so the visible address and the JSON-LD cannot drift.
    // NOTE: the Yelp listing carries a different street number than this one.
    // Whichever is wrong should be corrected at the source, because an
    // address mismatch across listings weakens the entity match that puts
    // this business into local "best broker" results.
    street: '2915 W Charleston Blvd Ste 170',
    locality: 'Las Vegas',
    region: 'NV',
    country: 'US',
  },
  logo: '/assets/logo.webp',
  reviews: {
    rating: '4.9',
    count: 703,
    // Real Google Maps listing (CID 11534166079504797199, 2915 W Charleston Blvd Ste 170)
    url: 'https://www.google.com/maps/place/ProtectHealth+Insurance+Agency/@36.1582831,-115.1808756,17z/data=!4m6!3m5!1s0x80c8c3a1ee8daa15:0xa01196f04d3e4e0f!8m2!3d36.1582831!4d-115.1808756!16s%2Fg%2F11hdjdfltp',
  },
  social: {
    facebook: 'https://www.facebook.com/protecthealthnv',
    linkedin: 'https://www.linkedin.com/company/protecthealth',
  },
};

export const ORG_ID = `${SITE.domain}/#organization`;

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'InsuranceAgency',
    '@id': ORG_ID,
    name: SITE.name,
    url: SITE.domain,
    description: SITE.description,
    logo: {
      '@type': 'ImageObject',
      url: `${SITE.domain}${SITE.logo}`,
    },
    // Full street address + phone in the schema, not just the footer. For a
    // Nevada-local brokerage this is the data engines use to reconcile this
    // entity against the Google Business Profile, Yelp, and directory
    // listings that actually surface us on "broker near me" style queries
    // (wiki: off-site-citation-playbook, entity consistency). The footer has
    // shown the street address for a while; the machine-readable copy did not.
    // postalCode is deliberately absent: it is not published anywhere on the
    // site, and a guessed ZIP is worse than an omitted one. Add it here and
    // to the footer together once confirmed.
    address: {
      '@type': 'PostalAddress',
      streetAddress: SITE.address.street,
      addressLocality: SITE.address.locality,
      addressRegion: SITE.address.region,
      addressCountry: SITE.address.country,
    },
    telephone: SITE.phone,
    areaServed: { '@type': 'State', name: 'Nevada' },
    sameAs: [SITE.social.facebook, SITE.social.linkedin].filter(Boolean),
  };
}

// Images currently hotlinked from the live Webflow CDN.
// TODO (Claude Code): download to /public/assets as WebP and swap paths (see CLAUDE.md roadmap).
const CDN = 'https://cdn.prod.website-files.com';
export const ASSETS = {
  // LOCALISED Jul 27 2026. Generated from the official transparent lockup
  // (public/assets/og-logo-source.png) at 3x the 44px render height so it stays
  // crisp on retina. This was the single most important hotlink on the site:
  // every page header and footer rendered it, and it would have 404'd the day
  // the Webflow account is decommissioned.
  logo: '/assets/logo.webp',
  heroFamily: '/assets/hero-family.webp',
  contactPortrait: '/assets/contact-portrait.webp',
  avatars: [
    '/assets/avatar-1.webp',
    '/assets/avatar-2.webp',
    '/assets/avatar-3.webp',
    '/assets/avatar-4.webp',
  ],
};

// ===== Editorial artwork (Higgsfield Nano Banana 2, 2K) =====
// Each entry: full-res PNG (article hero + JSON-LD image), WebP (cards), alt description.
const HF2 = 'https://d8j0ntlcm91z4.cloudfront.net/user_3GY61bj0wPgc3RYJDtgyJ6LmhTH';
const art = (ts: string, id: string, alt: string) => ({
  png: `${HF2}/hf_20260722_${ts}_${id}.png`,
  webp: `${HF2}/hf_20260722_${ts}_${id}_min.webp`,
  alt,
});

// Wave-1+ art is generated in-repo and self-hosted (no third-party CDN).
// png is absolute because it feeds og:image and JSON-LD ImageObject directly.
// `alt` is the accessibility/extraction description and always exists.
// `caption` is optional and does two jobs when present: it renders as a
// visible <figcaption> under the hero image, and it becomes the ImageObject
// caption in JSON-LD. Where no caption is authored, the schema falls back to
// `alt`, so every article still carries a described image for machines even
// if nothing is printed for readers (wiki: json-ld-schemas, edge-image-optimization).
type Art = { png: string; webp: string; alt: string; caption?: string };
const localBlogArt = (slug: string, alt: string, caption?: string): Art => ({ png: 'https://www.protecthealth.com/assets/blog-art/' + slug + '.png', webp: '/assets/blog-art/' + slug + '.webp', alt, caption });
const localQaArt = (slug: string, alt: string, caption?: string): Art => ({ png: 'https://www.protecthealth.com/assets/qa-art/' + slug + '.png', webp: '/assets/qa-art/' + slug + '.webp', alt, caption });

// Responsive image plumbing. scripts/responsive-art.mjs writes -400 and -800
// variants next to every editorial .webp at build time; these two helpers emit
// the markup that lets a browser pick one. If a variant is somehow missing the
// browser falls back to the 1200px original, so this degrades safely.
const ART_WIDTHS = [400, 800];

export function srcsetFor(webpPath: string) {
  const stem = webpPath.replace(/\.webp$/, '');
  return [...ART_WIDTHS.map((w) => `${stem}-${w}.webp ${w}w`), `${webpPath} 1200w`].join(', ');
}

// `sizes` tells the browser how wide the image will RENDER, which is what it
// uses to pick from srcset. These come from the real CSS, not round numbers:
//   hero  the .article column is max-width 780px; below that it is full-bleed
//         inside an 18px-padded container
//   card  auto-fit grid tracks run 240-330px on desktop and go full width once
//         the track floor is hit on a phone
export const SIZES_HERO = '(min-width: 816px) 780px, 100vw';
export const SIZES_CARD = '(min-width: 700px) 360px, 100vw';

// Guarded variant for shared components that receive an arbitrary image path.
// Only the editorial art directories have generated variants, so anything
// else returns undefined and the component omits srcset entirely rather than
// pointing a browser at URLs that do not exist.
export function srcsetIfArt(path: string | undefined) {
  if (!path) return undefined;
  return /^\/assets\/(blog-art|qa-art)\/[^/]+\.webp$/.test(path) ? srcsetFor(path) : undefined;
}

// Build an ImageObject with a real description rather than a bare url.
export function imageObject(art: Art | undefined, fallbackUrl?: string) {
  if (!art) return fallbackUrl ? { '@type': 'ImageObject', url: fallbackUrl } : undefined;
  return {
    '@type': 'ImageObject',
    url: art.png,
    caption: art.caption ?? art.alt,
    description: art.alt,
  };
}

export const BLOG_ART: Record<string, Art> = {
  'nevada-open-enrollment-health-insurance': localBlogArt('nevada-open-enrollment-health-insurance', 'Glass hourglass pouring golden light that wraps a protected Las Vegas home, the Nevada open enrollment window closing'),
  'silver-state-health-insurance-exchange': localBlogArt('silver-state-health-insurance-exchange', 'Nevada sculpted in gradient glass with streams of light flowing to a glowing marketplace pavilion, the Silver State Health Insurance Exchange'),
  'small-business-health-insurance': localBlogArt('small-business-health-insurance', 'A blooming canopy of gradient light sheltering a small glowing storefront and its team, small business health insurance'),
  'what-is-an-ichra': localBlogArt('what-is-an-ichra', 'A glass hand holding a glowing benefit orb that splits into three streams toward floating plan cards, how an ICHRA turns one budget into personal choice'),
  'realtor-health-insurance-guide': localBlogArt('realtor-health-insurance-guide', 'A luminous gradient key and protective aurora arcing over a modern home, health insurance strategy for Realtors'),
  'health-insurance-options-self-employed-nevada': localBlogArt('health-insurance-options-self-employed-nevada', 'Four rivers of gradient light diverging toward four glowing coverage monuments, the self-employed health insurance options map'),
  'ichra-vs-marketplace-health-insurance': localBlogArt('ichra-vs-marketplace-health-insurance', 'Two crystalline structures, a marketplace archway and an employer tower, bridged by violet light, ICHRA versus marketplace coverage'),
  'tax-advantaged-health-benefits-self-employed': localBlogArt('tax-advantaged-health-benefits-self-employed', 'A gradient glass vault releasing a protected spiral of glowing coins beneath a floating shield, tax-advantaged health benefit structures'),
  'signs-your-business-needs-hr-support': localBlogArt('signs-your-business-needs-hr-support', 'A storm of spiraling paperwork calmed by a wide river of cyan light, the warning signs a small business needs HR support'),
  'employee-benefits-guide-small-business': localBlogArt('employee-benefits-guide-small-business', 'Crystalline orbs of benefits, heart, umbrella, nest egg, clock, orbiting two colleagues, employee benefits that keep good people'),
  'how-much-life-insurance-do-i-need': localBlogArt('how-much-life-insurance-do-i-need', 'A family of light beside a rising column of stacked gradient glass blocks with a beam marking the right height, measuring how much life insurance a family needs'),
  'term-vs-whole-life-insurance': localBlogArt('term-vs-whole-life-insurance', 'A cyan hourglass with fixed sand facing an infinite golden ring of light on a reflective plane, term life insurance versus whole life'),
  'is-dental-insurance-worth-it': localBlogArt('is-dental-insurance-worth-it', 'A flawless glass tooth displayed like a museum jewel beside a balance scale weighing a coin against a sparkle, whether dental insurance is worth the price'),
  'dental-insurance-vs-discount-plans': localBlogArt('dental-insurance-vs-discount-plans', 'Two doorways of light, a full ornate archway and a simpler half-open door, with a figure deciding between them, dental insurance versus discount plans'),
  'turning-65-in-nevada-medicare-checklist': localBlogArt('turning-65-in-nevada-medicare-checklist', 'A gradient glass birthday cake with one radiant candle unfolding a stepping-stone path toward a glowing shield gateway, the Medicare road that begins at 65'),
  'medicare-advantage-vs-medigap-nevada': localBlogArt('medicare-advantage-vs-medigap-nevada', 'A river of light forking between a bundled dome city and an open plain of glowing waypoints, a figure at the fork, Medicare Advantage versus Medigap'),
  'aca-premium-tax-credits-explained': localBlogArt('aca-premium-tax-credits-explained', 'A glowing coin descending into the hands of a family of light, trailing a ribbon back to a radiant archway, an ACA premium tax credit arriving'),
  'how-to-choose-a-health-insurance-plan-nevada': localBlogArt('how-to-choose-a-health-insurance-plan-nevada', 'A figure of light examining five crystalline plan tablets through a gradient lens that reveals networks and costs inside, choosing a health plan by what is truly inside'),
  'what-is-gap-health-insurance': localBlogArt('what-is-gap-health-insurance', 'A glowing glass bridge spanning the chasm between two crystalline platforms, filling the space with light, GAP insurance covering the deductible gap'),
  'health-insurance-for-freelancers-and-gig-workers': localBlogArt('health-insurance-for-freelancers-and-gig-workers', 'A constellation of independent glowing orbs connected by threads of light to one radiant shield nucleus, freelancers and gig workers finding coverage structure'),
  'tipped-payroll-mistakes-las-vegas': localBlogArt('tipped-payroll-mistakes-las-vegas', 'Golden coins cascading toward a glass ledger tray with one coin veering off in amber light against a neon Las Vegas skyline, tipped payroll gone wrong'),
  'peo-vs-payroll-service-vs-diy': localBlogArt('peo-vs-payroll-service-vs-diy', 'Three glass pedestals of ascending sophistication, a lone cube, interlocking gears, and a luminous orbiting machine, PEO versus payroll service versus DIY'),
  'life-insurance-for-new-parents-nevada': localBlogArt('life-insurance-for-new-parents-nevada', 'A large translucent glass shield curving over two small glowing figures and a crib-like glass form, warm light pooling beneath, life insurance protection for new Nevada parents', 'The policy is not the point. What it holds up underneath is.'),
  'health-insurance-for-casino-hospitality-workers-las-vegas': localBlogArt('health-insurance-for-casino-hospitality-workers-las-vegas', 'A translucent glass card fan and glass coupe on a dark reflective surface beneath a protective dome of cyan light, a distant neon skyline glow behind, health coverage for Las Vegas casino and hospitality workers', 'Hours banks, seasonal layoffs, and tipped income all move. Coverage has to survive the movement.'),
  'small-business-health-insurance-renewals': localBlogArt('small-business-health-insurance-renewals', 'A translucent glass calendar page peeling back to reveal a second lit page beneath it, a column of gradient light passing through both, a small business group health renewal coming due', 'A renewal is a decision point, not a formality. The second page is the one worth reading.'),
  'medicare-part-d-prescription-drug-coverage-nevada': localBlogArt('medicare-part-d-prescription-drug-coverage-nevada', 'Concentric rings of teal and blue light radiating from a translucent glass capsule standing on a glass plinth, each ring a tier, Medicare Part D prescription drug coverage in Nevada', 'Part D is priced by tier and pharmacy, not by plan name. The rings are where the cost actually lives.'),
  'health-insurance-window-shopping-nevada': localBlogArt('health-insurance-window-shopping-nevada', 'A bright ring of cyan light forming a window frame in the dark with translucent glass plan cards floating just beyond it, window shopping Nevada health plans before open enrollment', 'You can see next year\'s plans before you can buy them. That preview window is the advantage.'),
  'nevada-special-enrollment-periods-explained': localBlogArt('nevada-special-enrollment-periods-explained', 'A circular aperture of cyan light opening in a dark glass wall with a glowing key hovering at its center and a countdown arc tracing the rim, a special enrollment period opening in Nevada', 'A qualifying life event opens the door. The 60-day clock starts closing it immediately.'),
  'medicare-savings-programs-nevada': localBlogArt('medicare-savings-programs-nevada', 'A translucent glass hand cupped beneath a stream of glowing coins that soften as they fall onto a glass pedestal, Medicare Savings Programs easing Part B costs in Nevada', 'Four programs, one application. Most people who qualify never apply.'),
  'health-insurance-for-construction-contractors-nevada': localBlogArt('health-insurance-for-construction-contractors-nevada', 'A translucent glass hard hat resting on a glass beam under an arc of gradient light, with glowing tool silhouettes suspended nearby, health coverage for Nevada construction contractors', 'Job-site protection is required by law. Health coverage is the part left to the contractor.'),
  'health-insurance-for-rideshare-delivery-drivers-nevada': localBlogArt('health-insurance-for-rideshare-delivery-drivers-nevada', 'Two diverging ribbons of gradient light streaming from a single glowing glass key fob toward separate floating waypoint markers above a dark city grid, coverage routes for Nevada rideshare and delivery drivers', 'Two drivers, same app, different coverage routes. Income estimate is what splits them.'),
  'working-past-65-medicare-nevada': localBlogArt('working-past-65-medicare-nevada', 'Two streams of gradient light converging on a horizon where a translucent glass briefcase and a glowing glass medical cross meet and merge into one beam, coordinating Medicare with a job after 65', 'Working past 65 means two systems running at once. They have to be coordinated, not chosen between.'),
  'ichra-nevada': localBlogArt('ichra-nevada', 'A translucent glass hand holding a glowing orb that splits into several streams, each flowing to its own floating glass plan card, how an ICHRA turns one employer budget into individual choice', 'One employer budget, many individual choices. That inversion is the whole idea of an ICHRA.'),
};

export const QA_ART: Record<string, Art> = {
  'is-an-ichra-legit': localQaArt('is-an-ichra-legit', 'A layered gradient glass shield on a marble plinth under a museum spotlight with a ring of verification light, ICHRA legitimacy proven'),
  'what-is-a-section-105-plan': localQaArt('what-is-a-section-105-plan', 'A glowing glass scroll casting a bridge of light and coins to a family at their home, a Section 105 plan at work'),
  'can-realtors-get-group-health-insurance': localQaArt('can-realtors-get-group-health-insurance', 'A lone professional raising a personal aurora of light beside a sheltered group dome, Realtors and group health insurance'),
  'does-a-small-business-need-an-hr-department': localQaArt('does-a-small-business-need-an-hr-department', 'A calm hand of gradient light sliding beneath a juggled arc of business tasks, HR support arriving for a small business owner'),
  'what-does-a-peo-do': localQaArt('what-does-a-peo-do', 'Two glass towers joined by a double helix of gradient light with figures traveling between them, how a PEO partnership carries the weight'),
  'when-should-a-business-outsource-payroll': localQaArt('when-should-a-business-outsource-payroll', 'A river of glowing pay envelopes flowing from a cluttered shoreline through a crystalline archway into perfect order, payroll outsourced'),
  'can-an-s-corp-owner-use-an-ichra': localQaArt('can-an-s-corp-owner-use-an-ichra', 'Glass turnstile gate passing golden keys while one large emerald key is redirected to a separate glowing path, S-corp owner eligibility for an ICHRA'),
  'what-happens-to-my-ichra-if-i-leave-my-job': localQaArt('what-happens-to-my-ichra-if-i-leave-my-job', 'Glowing glass lantern detaching from a golden pedestal and shining on its own, what happens to an ICHRA after leaving a job'),
  'how-does-ichra-reimbursement-work': localQaArt('how-does-ichra-reimbursement-work', 'Circular glass and brass machine cycling glowing coins through a crystal checkpoint, how ICHRA reimbursement works'),
  'how-much-does-health-insurance-cost-for-realtors-in-nevada': localQaArt('how-much-does-health-insurance-cost-for-realtors-in-nevada', 'White light split by a crystal prism into five ribbons of varying width controlled by glass dials, health insurance cost drivers for Nevada Realtors'),
  'do-real-estate-brokerages-offer-health-insurance': localQaArt('do-real-estate-brokerages-offer-health-insurance', 'Glass pavilion covering only a few pedestals while glowing obelisks outside carry their own light umbrellas, brokerage health insurance and 1099 agents'),
  'can-commission-income-qualify-for-health-insurance-subsidies': localQaArt('can-commission-income-qualify-for-health-insurance-subsidies', 'Molten gold refined through a crystal funnel into a thin stream that opens a glowing aperture, commission income qualifying for health insurance subsidies'),
  'can-self-employed-nevadans-deduct-health-insurance-premiums': localQaArt('can-self-employed-nevadans-deduct-health-insurance-premiums', 'Glass balance scale with a slab shedding luminous layers that float away, deducting health insurance premiums for self-employed Nevadans'),
  'how-do-llc-owners-get-health-insurance-in-nevada': localQaArt('how-do-llc-owners-get-health-insurance-in-nevada', 'One glass archway branching into three glowing paths toward different crystal structures, how LLC owners get health insurance in Nevada'),
  'can-a-sole-proprietor-get-group-health-insurance': localQaArt('can-a-sole-proprietor-get-group-health-insurance', 'Two-keyhole golden vault door facing a single hovering key beside an open side passage, sole proprietors and group health insurance'),
  'can-a-spouse-join-a-self-employed-health-plan': localQaArt('can-a-spouse-join-a-self-employed-health-plan', 'Interlinked crystal and rose-gold rings glowing under a shared glass dome, adding a spouse to a self-employed health plan'),
  'do-gig-workers-get-health-insurance-from-uber-or-doordash': localQaArt('do-gig-workers-get-health-insurance-from-uber-or-doordash', 'Scattered glass stars linking themselves by light threads to one independent beacon, gig worker health insurance beyond the platforms'),
  'is-short-term-health-insurance-good-for-freelancers': localQaArt('is-short-term-health-insurance-good-for-freelancers', 'Fragile translucent glass footbridge with fading gaps beside a solid golden bridge, short-term health insurance as a freelancer bridge product'),
  'how-do-freelancers-estimate-income-for-health-subsidies': localQaArt('how-do-freelancers-estimate-income-for-health-subsidies', 'Crystal gauge of wave-like liquid gold with an adjustable brass marker on its scale, estimating freelance income for health subsidies'),
  'can-freelancers-write-off-health-insurance-premiums': localQaArt('can-freelancers-write-off-health-insurance-premiums', 'Crystal stamp lifting a glowing layer from a stack of glass ledger plates, freelancers writing off health insurance premiums'),
  'can-an-employee-decline-an-ichra': localQaArt('can-an-employee-decline-an-ichra', 'Key of light hovering between an open gold door and an open sapphire door, an employee\'s choice to decline an ICHRA'),
  'does-an-ichra-affect-premium-tax-credits': localQaArt('does-an-ichra-affect-premium-tax-credits', 'Golden glass orb eclipsing a silver orb so a single beam reaches the pedestal, how an ICHRA affects premium tax credits'),
  'is-an-ichra-cheaper-than-group-health-insurance': localQaArt('is-an-ichra-cheaper-than-group-health-insurance', 'Scales balancing a fixed glass cube against a fluctuating column of flame, ICHRA cost versus group health insurance'),
  'can-an-ichra-reimburse-medicare-premiums': localQaArt('can-an-ichra-reimburse-medicare-premiums', 'Golden stream passing an engraved crystal valve into a classical silver fountain, ICHRA reimbursement of Medicare premiums'),
  'what-is-a-qsehra': localQaArt('what-is-a-qsehra', 'Capped crystal decanter with an etched fill line beside a larger open vessel of light, QSEHRA contribution caps compared with ICHRA'),
  'can-hiring-a-spouse-unlock-health-benefits': localQaArt('can-hiring-a-spouse-unlock-health-benefits', 'Gold and silver light ribbons braided into one key unlocking a glowing glass conservatory, hiring a spouse to unlock health benefits'),
  'is-self-employed-health-insurance-tax-deductible': localQaArt('is-self-employed-health-insurance-tax-deductible', 'Glass block lifting free from a descending staircase and rising toward a skylight, the self-employed health insurance tax deduction'),
  'how-many-employees-are-needed-for-group-health-insurance': localQaArt('how-many-employees-are-needed-for-group-health-insurance', 'A glowing glass key opening a translucent doorway to a lit corridor, the one-employee threshold for group health insurance eligibility'),
  'what-does-group-health-insurance-cost-per-employee': localQaArt('what-does-group-health-insurance-cost-per-employee', 'Glass ledger slabs with light columns of varying heights beneath a floating slider, the drivers behind group health insurance cost per employee'),
  'are-small-businesses-required-to-offer-health-insurance': localQaArt('are-small-businesses-required-to-offer-health-insurance', 'A glass scale weighing a feather of light against a heavy orb at a glowing boundary line, the 50-employee line for the health insurance mandate'),
  'what-is-a-level-funded-health-plan': localQaArt('what-is-a-level-funded-health-plan', 'A domed glass reservoir with a level plane of light and a surplus stream returning from its base, how a level-funded health plan works'),
  'what-hr-tasks-can-be-outsourced': localQaArt('what-hr-tasks-can-be-outsourced', 'Outer glass gears rising on light threads toward a distant hub while a core cluster keeps turning, which HR tasks can be outsourced'),
  'how-much-does-an-hr-mistake-cost-a-small-business': localQaArt('how-much-does-an-hr-mistake-cost-a-small-business', 'One toppled glass domino triggering a multiplying mirrored cascade of glowing tiles, how a single HR mistake compounds in cost'),
  'what-is-the-fica-tip-credit': localQaArt('what-is-the-fica-tip-credit', 'A river of light bending back to return gold droplets into a glass vault, the FICA tip credit refunding employer payroll taxes on tips'),
  'does-nevada-allow-a-tip-credit': localQaArt('does-nevada-allow-a-tip-credit', 'A glass dam holding light at the full-wage line while a golden stream flows freely over the top, Nevada\'s ban on the tip credit'),
  'are-service-charges-taxed-like-tips': localQaArt('are-service-charges-taxed-like-tips', 'A light stream forking into free golden mist and rigid glass bars, why service charges are wages while tips remain tips'),
  'who-can-legally-share-a-tip-pool': localQaArt('who-can-legally-share-a-tip-pool', 'A ring of glass chalices sharing golden light with one tall dark vessel excluded outside the circle, who can legally share a tip pool'),
  'what-benefits-do-small-business-employees-want-most': localQaArt('what-benefits-do-small-business-employees-want-most', 'A five-tier glass tower of glowing objects crowned by a radiant orb, the benefits small business employees rank highest'),
  'how-much-should-a-small-business-budget-for-benefits': localQaArt('how-much-should-a-small-business-budget-for-benefits', 'A calibrated glass pitcher pouring equal measures of light into a row of cups, setting a fixed per-employee benefits budget'),
  'do-employee-benefits-reduce-turnover': localQaArt('do-employee-benefits-reduce-turnover', 'A glass anchor tethering glowing orbs against a strong current, how employee benefits hold teams and reduce turnover'),
  'what-does-a-benefits-broker-do': localQaArt('what-does-a-benefits-broker-do', 'A glass compass beaming a clear path through a prism labyrinth, the guidance a benefits broker provides at no added plan cost'),
  'how-much-does-a-peo-cost': localQaArt('how-much-does-a-peo-cost', 'A glass engine turning one fuel stream of light into many synchronized working parts, what a PEO\'s bundled fee actually buys'),
  'what-is-co-employment': localQaArt('what-is-co-employment', 'Two glass lattices interweaving into one load-bearing arch, the shared employer roles of co-employment'),
  'can-a-business-leave-a-peo': localQaArt('can-a-business-leave-a-peo', 'An open glass gate at a glowing year-line with a lit vessel sailing through as cargo transfers behind, leaving a PEO with a planned transition'),
  'when-is-open-enrollment-in-nevada': localQaArt('when-is-open-enrollment-in-nevada', 'Glass calendar with a single glowing golden window of dates amid dark frozen panes, Nevada open enrollment dates'),
  'what-is-a-qualifying-life-event': localQaArt('what-is-a-qualifying-life-event', 'Key of light opening one door in a ring of locked crystal doors, qualifying life events for special enrollment'),
  'can-you-buy-health-insurance-outside-open-enrollment': localQaArt('can-you-buy-health-insurance-outside-open-enrollment', 'Closed glass gate with one narrow lit side passage and a dissolving rope bridge below, buying health insurance outside open enrollment'),
  'what-happens-if-you-miss-open-enrollment-in-nevada': localQaArt('what-happens-if-you-miss-open-enrollment-in-nevada', 'Spent hourglass before a long corridor leading to a distant lit doorway, consequences of missing Nevada open enrollment'),
  'what-is-nevada-health-link': localQaArt('what-is-nevada-health-link', 'Glowing glass pavilion with orbiting luminous plan cards around a silver column, Nevada Health Link state marketplace'),
  'is-nevada-health-link-the-same-as-healthcare-gov': localQaArt('is-nevada-health-link-the-same-as-healthcare-gov', 'Two crystal bridges over one river with light redirecting toward the nearer silver bridge, Nevada Health Link versus healthcare.gov'),
  'who-qualifies-for-health-insurance-subsidies-in-nevada': localQaArt('who-qualifies-for-health-insurance-subsidies-in-nevada', 'Glass balance scale weighing luminous coins against a prism ladder of thresholds, who qualifies for Nevada health insurance subsidies'),
  'does-nevada-have-expanded-medicaid': localQaArt('does-nevada-have-expanded-medicaid', 'Glowing emerald safety net extended beyond old brass boundary markers, Nevada\'s expanded Medicaid'),
  'what-income-counts-for-aca-subsidies': localQaArt('what-income-counts-for-aca-subsidies', 'Glass funnel sorting glowing income streams into one measured beaker while excluded tokens deflect away, what income counts toward MAGI for ACA subsidies'),
  'do-aca-subsidies-have-to-be-paid-back': localQaArt('do-aca-subsidies-have-to-be-paid-back', 'Glass siphon drawing a stream of golden coins from one stack back to a crystal ledger, paying back advance ACA subsidies at reconciliation'),
  'what-is-the-aca-subsidy-cliff': localQaArt('what-is-the-aca-subsidy-cliff', 'Amber glass staircase ending abruptly at a sheer dark cliff with a coin on the edge, the ACA subsidy cliff concept'),
  'can-you-get-aca-subsidies-if-an-employer-offers-insurance': localQaArt('can-you-get-aca-subsidies-if-an-employer-offers-insurance', 'Blue glass employer platform blocking a golden marketplace doorway while family orbs slip around it, employer offers blocking ACA subsidies'),
  'does-gap-insurance-cover-the-deductible': localQaArt('does-gap-insurance-cover-the-deductible', 'Golden pulse crossing a glass canyon only when a flare bursts overhead, GAP insurance paying toward the deductible on triggered events'),
  'is-hospital-indemnity-the-same-as-gap-insurance': localQaArt('is-hospital-indemnity-the-same-as-gap-insurance', 'Small sapphire orb nested inside a broader aqua glass bowl with overlapping halos, hospital indemnity as one design within GAP insurance'),
  'can-gap-insurance-pair-with-any-health-plan': localQaArt('can-gap-insurance-pair-with-any-health-plan', 'Rose-gold lens docking onto varied crystal plan monoliths with one caution-ringed exception, pairing GAP insurance with different health plans'),
  'is-gap-health-insurance-worth-it': localQaArt('is-gap-health-insurance-worth-it', 'Smoky quartz scale weighing a jagged red deductible shard against a small glowing premium sphere, whether GAP health insurance is worth it'),
  'what-is-the-difference-between-hmo-and-ppo': localQaArt('what-is-the-difference-between-hmo-and-ppo', 'Closed emerald maze with a gatekeeper arch beside an open sapphire lattice with many exits, HMO versus PPO network design'),
  'what-is-an-out-of-pocket-maximum': localQaArt('what-is-an-out-of-pocket-maximum', 'Coin column stopped by a glowing ceiling plate inside a crystal cylinder, the out-of-pocket maximum spending cap'),
  'how-do-you-check-if-a-doctor-is-in-network': localQaArt('how-do-you-check-if-a-doctor-is-in-network', 'Golden lens verifying stars on a shifting constellation map with green confirmation rings, checking whether a doctor is in network'),
  'which-metal-tier-is-best-for-families': localQaArt('which-metal-tier-is-best-for-families', 'Bronze to platinum glass terraces with family light-orbs resting on a glowing silver step, choosing the best metal tier for families'),
  'does-a-stay-at-home-parent-need-life-insurance': localQaArt('does-a-stay-at-home-parent-need-life-insurance', 'Glowing golden orbs orbiting an empty crystal chair inside a glass house, outweighing a coin on a balance scale, the unpaid economic value a stay-at-home parent\'s life insurance must replace'),
  'is-employer-life-insurance-enough': localQaArt('is-employer-life-insurance-enough', 'A tiny tethered umbrella of light dissolving beside a large freestanding amber glass dome sheltering a house, employer life insurance versus personally owned coverage'),
  'what-is-the-dime-method-for-life-insurance': localQaArt('what-is-the-dime-method-for-life-insurance', 'Four colored glass pillars channeling light into one floating prism above a reflective pool, the DIME method summing Debt, Income, Mortgage, and Education into a single coverage number'),
  'does-life-insurance-pay-off-a-mortgage': localQaArt('does-life-insurance-pay-off-a-mortgage', 'A radiant golden key of light shattering dark glass chains wrapped around a crystal house, a life insurance death benefit paying off the mortgage'),
  'can-term-life-be-converted-to-whole-life': localQaArt('can-term-life-be-converted-to-whole-life', 'A crystal bridge crossing through an open hourglass doorway toward a golden vault before the sands run out, converting term life to whole life within the conversion window'),
  'what-happens-when-a-term-life-policy-expires': localQaArt('what-happens-when-a-term-life-policy-expires', 'An hourglass dropping its last glowing grain as the canopy of light over a glass village fades away, coverage ending when a term life policy expires'),
  'is-whole-life-insurance-a-good-investment': localQaArt('is-whole-life-insurance-a-good-investment', 'An emerald glass tree bearing small glowing fruit inside a golden vault while fast silver ribbons of light stream past outside, whole life insurance as steady protection rather than a market-beating investment'),
  'what-is-laddering-life-insurance': localQaArt('what-is-laddering-life-insurance', 'Three glowing glass ladders of staggered heights dissolving one by one against a shrinking crystal hill, laddering term life policies so coverage steps down as obligations disappear'),
  'what-does-dental-insurance-actually-cover': localQaArt('what-does-dental-insurance-actually-cover', 'Three rows of crystal teeth on a glass staircase, each row lit to a different level of golden light under a prismatic dome, the 100-80-50 structure of what dental insurance covers'),
  'do-dental-plans-have-waiting-periods': localQaArt('do-dental-plans-have-waiting-periods', 'Glass hourglass of golden light in front of crystal doors, one open and the rest sealed, the waiting periods built into dental insurance plans'),
  'is-vision-insurance-worth-it': localQaArt('is-vision-insurance-worth-it', 'Giant glass lenses above a scale of light where refracted beams outweigh a small stack of coins, the break-even math of vision insurance for lens wearers'),
  'what-is-a-dental-annual-maximum': localQaArt('what-is-a-dental-annual-maximum', 'Crystal treasure chest filling with golden light that stops at an etched limit line while the overflow drains into shadow, the annual maximum cap on dental insurance'),
  'how-do-dental-discount-plans-work': localQaArt('how-do-dental-discount-plans-work', 'Glass membership key opening a prism gate onto a corridor of shrinking light-tags, how dental discount plans unlock reduced member pricing'),
  'can-you-have-dental-insurance-and-a-discount-plan': localQaArt('can-you-have-dental-insurance-and-a-discount-plan', 'Gold and teal rivers of light running parallel through glass arches and joining only at a distant delta, pairing dental insurance with a discount plan across a year'),
  'are-dental-discount-plans-legit': localQaArt('are-dental-discount-plans-legit', 'Crystal loupe examining a glowing glass ledger of fees that projects an emerald seal of verification, vetting whether dental discount plans are legitimate'),
  'does-dental-insurance-cover-implants': localQaArt('does-dental-insurance-cover-implants', 'Monumental crystal tooth only partially wrapped in a fraying ribbon of golden light, the limited and often excluded coverage dental insurance gives implants'),
  'do-you-have-to-sign-up-for-medicare-at-65': localQaArt('do-you-have-to-sign-up-for-medicare-at-65', 'Glowing glass gateway with seven amber panels leading toward a luminous clock face, whether Medicare enrollment at 65 is required'),
  'what-is-the-medicare-part-b-penalty': localQaArt('what-is-the-medicare-part-b-penalty', 'Smoked-glass hourglass spilling golden sand that hardens into a permanent stack of luminous coins, the lifetime Medicare Part B late enrollment penalty'),
  'is-medicare-free-at-65': localQaArt('is-medicare-free-at-65', 'One free-floating crystal orb beside a twin orb enclosed in a tiered golden glass meter, which parts of Medicare are free at 65'),
  'can-you-delay-medicare-if-still-working': localQaArt('can-you-delay-medicare-if-still-working', 'Glass drawbridge paused above a river of light, supported by twenty glowing sapphire pillars, delaying Medicare while still working with qualifying employer coverage'),
  'why-are-medicare-advantage-premiums-zero-dollars': localQaArt('why-are-medicare-advantage-premiums-zero-dollars', 'Crystal zero glowing above a hidden cascade of gold flowing through translucent toll gates, why Medicare Advantage premiums can be zero dollars'),
  'can-you-switch-from-medicare-advantage-to-medigap': localQaArt('can-you-switch-from-medicare-advantage-to-medigap', 'Open door of light beside a sealed frosted-glass door with a prism lock, switching from Medicare Advantage to Medigap and the underwriting barrier'),
  'does-medigap-work-in-other-states': localQaArt('does-medigap-work-in-other-states', 'Luminous glass passport casting beams across a golden crystalline map of the United States, Medigap coverage traveling to every state'),
  'what-is-medigap-open-enrollment': localQaArt('what-is-medigap-open-enrollment', 'Amber stained-glass window with six candles of light slowly frosting over, the one-time six-month Medigap open enrollment window'),
  'why-did-my-group-health-renewal-go-up': localQaArt('why-did-my-group-health-renewal-go-up', "Abstract gradient light art in ProtectHealth blues, why did my group health renewal go up"),
  'how-do-you-apply-for-medicare-savings-programs-in-nevada': localQaArt('how-do-you-apply-for-medicare-savings-programs-in-nevada', "Abstract gradient light art in ProtectHealth blues, how do you apply for medicare savings programs in nevada"),
  'what-happens-to-health-insurance-during-a-casino-layoff': localQaArt('what-happens-to-health-insurance-during-a-casino-layoff', "Abstract gradient light art in ProtectHealth blues, what happens to health insurance during a casino layoff"),
  'does-extra-help-cover-part-d-costs': localQaArt('does-extra-help-cover-part-d-costs', "Abstract gradient light art in ProtectHealth blues, does extra help cover part d costs"),
  'how-long-do-you-have-after-a-qualifying-life-event': localQaArt('how-long-do-you-have-after-a-qualifying-life-event', "Abstract gradient light art in ProtectHealth blues, how long do you have after a qualifying life event"),
  'what-is-the-qmb-program-in-nevada': localQaArt('what-is-the-qmb-program-in-nevada', "Abstract gradient light art in ProtectHealth blues, what is the qmb program in nevada"),
  'can-you-contribute-to-an-hsa-after-enrolling-in-medicare': localQaArt('can-you-contribute-to-an-hsa-after-enrolling-in-medicare', "Abstract gradient light art in ProtectHealth blues, can you contribute to an hsa after enrolling in medicare"),
  'can-gig-workers-deduct-health-insurance-premiums': localQaArt('can-gig-workers-deduct-health-insurance-premiums', "Abstract gradient light art in ProtectHealth blues, can gig workers deduct health insurance premiums"),
  'is-employer-life-insurance-enough-for-a-family': localQaArt('is-employer-life-insurance-enough-for-a-family', "Abstract gradient light art in ProtectHealth blues, is employer life insurance enough for a family"),
  'can-independent-contractors-get-group-health-rates': localQaArt('can-independent-contractors-get-group-health-rates', "Abstract gradient light art in ProtectHealth blues, can independent contractors get group health rates"),
  'what-coverage-do-seasonal-construction-workers-need': localQaArt('what-coverage-do-seasonal-construction-workers-need', "Abstract gradient light art in ProtectHealth blues, what coverage do seasonal construction workers need"),
  'are-health-premiums-deductible-for-1099-contractors': localQaArt('are-health-premiums-deductible-for-1099-contractors', "Abstract gradient light art in ProtectHealth blues, are health premiums deductible for 1099 contractors"),
  'what-does-medicare-part-d-cost-in-nevada': localQaArt('what-does-medicare-part-d-cost-in-nevada', "Abstract gradient light art in ProtectHealth blues, what does medicare part d cost in nevada"),
  'does-losing-a-job-qualify-for-special-enrollment': localQaArt('does-losing-a-job-qualify-for-special-enrollment', "Abstract gradient light art in ProtectHealth blues, does losing a job qualify for special enrollment"),
  'can-you-keep-the-same-health-plan-next-year': localQaArt('can-you-keep-the-same-health-plan-next-year', "Abstract gradient light art in ProtectHealth blues, can you keep the same health plan next year"),
  'when-should-a-small-business-start-shopping-its-renewal': localQaArt('when-should-a-small-business-start-shopping-its-renewal', "Abstract gradient light art in ProtectHealth blues, when should a small business start shopping its renewal"),
  'is-workers-comp-the-same-as-health-insurance': localQaArt('is-workers-comp-the-same-as-health-insurance', "Abstract gradient light art in ProtectHealth blues, is workers comp the same as health insurance"),
  'do-uber-and-doordash-drivers-get-health-insurance': localQaArt('do-uber-and-doordash-drivers-get-health-insurance', "Abstract gradient light art in ProtectHealth blues, do uber and doordash drivers get health insurance"),
  'what-is-the-medicare-part-d-late-enrollment-penalty': localQaArt('what-is-the-medicare-part-d-late-enrollment-penalty', "Abstract gradient light art in ProtectHealth blues, what is the medicare part d late enrollment penalty"),
  'does-medicare-cover-prescriptions-without-part-d': localQaArt('does-medicare-cover-prescriptions-without-part-d', "Abstract gradient light art in ProtectHealth blues, does medicare cover prescriptions without part d"),
  'when-can-you-preview-nevada-health-plans-for-next-year': localQaArt('when-can-you-preview-nevada-health-plans-for-next-year', "Abstract gradient light art in ProtectHealth blues, when can you preview nevada health plans for next year"),
  'should-you-name-a-child-as-life-insurance-beneficiary': localQaArt('should-you-name-a-child-as-life-insurance-beneficiary', "Abstract gradient light art in ProtectHealth blues, should you name a child as life insurance beneficiary"),
  'does-moving-to-nevada-trigger-a-special-enrollment-period': localQaArt('does-moving-to-nevada-trigger-a-special-enrollment-period', "Abstract gradient light art in ProtectHealth blues, does moving to nevada trigger a special enrollment period"),
  'do-you-need-medicare-if-you-have-employer-insurance-at-65': localQaArt('do-you-need-medicare-if-you-have-employer-insurance-at-65', "Abstract gradient light art in ProtectHealth blues, do you need medicare if you have employer insurance at 65"),
  'can-part-time-hospitality-workers-get-marketplace-coverage': localQaArt('can-part-time-hospitality-workers-get-marketplace-coverage', "Abstract gradient light art in ProtectHealth blues, can part time hospitality workers get marketplace coverage"),
  'how-do-rideshare-drivers-estimate-income-for-subsidies': localQaArt('how-do-rideshare-drivers-estimate-income-for-subsidies', "Abstract gradient light art in ProtectHealth blues, how do rideshare drivers estimate income for subsidies"),
  'what-happens-if-a-driver-underestimates-income-for-subsidies': localQaArt('what-happens-if-a-driver-underestimates-income-for-subsidies', "Abstract gradient light art in ProtectHealth blues, what happens if a driver underestimates income for subsidies"),
  'is-union-health-coverage-better-than-marketplace-coverage': localQaArt('is-union-health-coverage-better-than-marketplace-coverage', "Abstract gradient light art in ProtectHealth blues, is union health coverage better than marketplace coverage"),
  'what-should-you-compare-when-window-shopping-health-plans': localQaArt('what-should-you-compare-when-window-shopping-health-plans', "Abstract gradient light art in ProtectHealth blues, what should you compare when window shopping health plans"),
  'what-happens-to-medicare-when-you-retire-after-65': localQaArt('what-happens-to-medicare-when-you-retire-after-65', "Abstract gradient light art in ProtectHealth blues, what happens to medicare when you retire after 65"),
  'can-you-change-part-d-plans-every-year': localQaArt('can-you-change-part-d-plans-every-year', "Abstract gradient light art in ProtectHealth blues, can you change part d plans every year"),
  'what-is-a-composite-rate-vs-age-banded-rate': localQaArt('what-is-a-composite-rate-vs-age-banded-rate', "Abstract gradient light art in ProtectHealth blues, what is a composite rate vs age banded rate"),
  'is-cobra-considered-creditable-coverage-for-medicare': localQaArt('is-cobra-considered-creditable-coverage-for-medicare', "Abstract gradient light art in ProtectHealth blues, is cobra considered creditable coverage for medicare"),
  'how-much-life-insurance-does-a-stay-at-home-parent-need': localQaArt('how-much-life-insurance-does-a-stay-at-home-parent-need', "Abstract gradient light art in ProtectHealth blues, how much life insurance does a stay at home parent need"),
  'does-getting-married-change-health-insurance-options': localQaArt('does-getting-married-change-health-insurance-options', "Abstract gradient light art in ProtectHealth blues, does getting married change health insurance options"),
  'can-a-business-change-group-plans-mid-year': localQaArt('can-a-business-change-group-plans-mid-year', "Abstract gradient light art in ProtectHealth blues, can a business change group plans mid year"),
  'what-documents-do-you-need-for-open-enrollment': localQaArt('what-documents-do-you-need-for-open-enrollment', "Abstract gradient light art in ProtectHealth blues, what documents do you need for open enrollment"),
  'does-tip-income-count-toward-health-insurance-subsidies': localQaArt('does-tip-income-count-toward-health-insurance-subsidies', "Abstract gradient light art in ProtectHealth blues, does tip income count toward health insurance subsidies"),
  'when-should-parents-buy-life-insurance': localQaArt('when-should-parents-buy-life-insurance', "Abstract gradient light art in ProtectHealth blues, when should parents buy life insurance"),
  'what-are-the-income-limits-for-medicare-savings-programs-in-nevada': localQaArt('what-are-the-income-limits-for-medicare-savings-programs-in-nevada', "Abstract gradient light art in ProtectHealth blues, what are the income limits for medicare savings programs in nevada"),
};

export const FAQ_ART = art('034236', 'ef11febc-6b23-4a46-b916-8d7739c65543', 'A spiral galaxy of glowing question orbs orbiting a radiant gradient beacon, every ProtectHealth question finding a clear answer');

// Higgsfield-generated brand imagery (hotlinked; localize with the Webflow set, see CLAUDE.md).
const HF = 'https://d8j0ntlcm91z4.cloudfront.net/user_3GY61bj0wPgc3RYJDtgyJ6LmhTH';
export const HF_ASSETS = {
  hero: '/assets/ext/hf_20260722_013708_a84d4826-1079-4760-9abb-41f524438e7d_min.webp',
  advisor: '/assets/ext/hf_20260722_013710_d47f6de9-17a4-470b-a6f0-9f0c5853ea68_min.webp',
  realtor: '/assets/ext/hf_20260722_013712_31f9529e-81b6-4bdd-9fe9-ac965a5246da_min.webp',
  employers: '/assets/ext/hf_20260722_013714_46d2a51a-942a-4ecc-aee3-a320f2aaca8c_min.webp',
  icons: {
    'health-insurance': '/assets/ext/hf_20260722_013725_2285183b-231e-4eae-9734-beb0340564fb_min.webp',
    'life-insurance': '/assets/ext/hf_20260722_013727_524ccf50-5b61-4320-b4d6-1b309fa33f23_min.webp',
    'gap-health-insurance': '/assets/ext/hf_20260722_013728_0cd1aa94-5acb-416b-b880-feef2b301dda_min.webp',
    'medicare': '/assets/ext/hf_20260722_013730_b4e06409-9e04-4111-9ee3-da84b8e14570_min.webp',
    'dental-insurance': '/assets/ext/hf_20260722_014206_f59ef6cb-24da-4761-9832-40407cda5f79_min.webp',
    'vision-insurance': '/assets/ext/hf_20260722_013733_dc867883-ef0f-4d28-8f20-f8c9ec35a715_min.webp',
  } as Record<string, string>,
};

// Team headshots: Nano Banana 2 re-renders on a unified studio gradient (identity-preserved from originals).
export const TEAM = [
  {
    slug: 'brian-douglas',
    name: 'Brian Douglas',
    role: 'Owner / CEO',
    photo: '/assets/ext/hf_20260722_022205_acf0f6da-8988-4535-aa08-e853b51069f6_min.webp',
    bio: [
      `Brian D. Douglas is the Owner and Chief Executive Officer of ProtectHealth, one of Nevada's largest and most respected individual health insurance agencies. A licensed insurance broker and benefits advisor, Brian has spent years helping individuals, families, and small businesses navigate the often-confusing world of health insurance with clarity, transparency, and confidence.`,
      `Based in Las Vegas, Brian leads a statewide network of more than 40 licensed brokers and oversees a significant share of Nevada's individual health insurance market. His agency works extensively with Nevada Health Link and major carriers, giving clients access to comprehensive coverage options while ensuring compliance, accuracy, and long-term value.`,
      `Known for his straightforward approach and deep industry knowledge, Brian is passionate about simplifying complex insurance decisions and advocating for consumers in a constantly changing regulatory landscape. He believes that insurance should empower people, not overwhelm them, and has built ProtectHealth around education, integrity, and service-first principles.`,
      `When he's not leading ProtectHealth, Brian is actively involved in mentoring brokers, improving industry standards, and contributing to discussions that shape the future of healthcare access in Nevada.`,
    ],
  },
  {
    slug: 'robert-morgen',
    name: 'Robert Morgen',
    role: 'Owner / COO & Group Services Director',
    photo: '/assets/ext/hf_20260722_022202_48d493a6-11bc-4126-8fb6-1e488b4d7c00_min.webp',
    // Bio supplied by Robert himself, Aug 12 2026, verbatim. This is the
    // version he uses professionally, including for a NABIP presentation.
    // His wording wins: do not rewrite it, expand it, or split it for
    // rhythm without asking him first.
    bio: [
      `Robert Morgen is a Las Vegas-based Life & Health insurance broker and the COO of ProtectHealth. With more than a decade of experience in Nevada's health insurance market, Robert works with families, small employers, and agents to make complex coverage decisions clear, practical, and sustainable. He also serves as ProtectHealth's Director of Employer Group Services and leads agent training and development.`,
    ],
  },
  {
    slug: 'brenda-morgen',
    name: 'Brenda Morgen',
    role: 'Broker',
    // Replaced Aug 10 2026. Nano Banana 2 re-render built from a photo Brenda
    // supplied herself, with Brian's headshot passed as the background reference
    // so the studio gradient matches the other five exactly. Absolute URL rather
    // than `${HF}` because this render landed under a different Higgsfield
    // account path — it is NOT a typo, and prefixing it with HF will 404.
    // Still hotlinked, same as the rest of TEAM; see roadmap item 3.
    photo: '/assets/ext/hf_20260810_173658_0b376f56-55d1-4907-b5d7-76f7ac0967ae_min.webp',
    // ⚠️ DRAFT, PENDING BRENDA'S APPROVAL (written Jul 27 2026).
    // Deliberately asserts nothing that is not already true on the record: her
    // role, her agency, her city, and ProtectHealth's stated approach. It claims
    // NO years of experience, NO license number, NO carrier appointments and no
    // specialism she has not confirmed. She carries the byline on the life and
    // dental-vision content, so she needs to read and correct this before it
    // ships. If she wants it shorter or different, hers wins.
    bio: [
      `Brenda Morgen is a licensed insurance broker with ProtectHealth in Las Vegas, working with Nevada individuals and families on the coverage decisions that tend to get made last and matter more than people expect.`,
      `Her focus is the coverage that sits alongside a health plan rather than inside it: dental, vision, and life insurance. These are the lines where the math is genuinely personal. Whether a dental plan pays for itself depends on what the next two years actually look like, and how much life insurance is enough depends on who is counting on the income. Brenda's approach is to run those numbers with a client rather than at them.`,
      `That fits how ProtectHealth works generally. The product should serve the strategy, not become the strategy, and if what someone already has is right for them, the honest answer is to say so.`,
    ],
  },
  {
    slug: 'jason-vasquez',
    name: 'Jason Vasquez',
    role: 'Licensed Broker & Benefits Advisor',
    photo: '/assets/ext/hf_20260722_022210_91cf9399-8eb2-4ff4-be17-d3fe8f072dd9_min.webp',
    bio: [
      `Jason Vasquez is a licensed Line of Authority Broker with over 16 years of experience in the financial industry, helping individuals and families make informed decisions around protecting their financial future. His approach centers on the belief that insurance is not a standalone product, but a foundational component of a well-designed financial strategy, one that helps protect income, assets, and long-term goals when life takes an unexpected turn.`,
      `Born in the San Francisco Bay Area and raised in Las Vegas from a young age, Jason brings a grounded, real-world perspective to financial protection. His career has spanned multiple areas of finance, giving him a deep understanding of how risk management, cash flow, and long-term planning work together. This background allows him to educate clients in clear, relatable terms, without jargon or pressure, so they can make confident decisions for themselves and their families.`,
      `As a family man, Jason understands firsthand the responsibility that comes with providing security and stability for loved ones. That perspective shapes how he serves clients: with empathy, transparency, and a focus on solutions that align with each family's unique situation and goals.`,
      `Jason is passionate about helping people see insurance not as an expense, but as a strategic tool, one that supports financial resilience, preserves options, and creates peace of mind as part of an overall financial plan.`,
    ],
  },
  {
    slug: 'janet-nevarez',
    name: 'Janet Nevarez',
    role: 'Director of Administration & Operations',
    photo: '/assets/ext/hf_20260722_060923_afb0c89b-093a-4319-aa7e-95278d852b08_min.webp',
    bio: [
      `As ProtectHealth's Director of Administration & Operations, Janet Nevarez plays a central role in shaping the agency's operational excellence and client-focused service model. With ProtectHealth recognized as one of Nevada's largest and most respected individual health insurance agencies, Janet ensures that the organization's internal systems, administrative processes, and compliance standards consistently meet the highest level of quality.`,
      `Janet oversees the day-to-day operations that keep the agency running smoothly, from licensing and appointments to workflow optimization and cross-department coordination. Her strategic approach strengthens efficiency, enhances accuracy, and supports the seamless experience ProtectHealth is known for.`,
      `A collaborative and solutions-driven leader, Janet is committed to empowering brokers with the structure, clarity, and support they need to perform at their best. Her dedication to operational integrity and continuous improvement directly contributes to ProtectHealth's long-standing reputation for reliability, responsiveness, and trusted guidance in the health insurance marketplace.`,
    ],
  },
  { slug: 'chris-bridgeforth', name: 'Chris Bridgeforth', role: 'Broker', photo: '/assets/ext/hf_20260722_060925_8d3e3ee0-ceaa-4bba-8c6b-93d9257a7032_min.webp' },
];

// ============ E-E-A-T: bylines and expert review ============
//
// Three licensed brokers carry the content: author on the blog pillars they own,
// named reviewer on the Q&A and FAQ layer. Assignment is by SUBJECT EXPERTISE,
// not round-robin, a broker credited on a topic outside their stated specialty
// is a weaker signal than no byline at all.
//
// TRUTHFULNESS RULES, do not break these:
//   - Nothing here may claim a credential the person does not hold. Every line
//     below traces to their own bio in TEAM or to their job title.
//   - `licenseNumber` and `sameAs` are intentionally empty. They are the two
//     strongest author-authority signals in a licensed industry and they are
//     the two we do not have yet. Fill them, never invent them. The schema
//     helper omits empty values so a blank stays out of the JSON-LD entirely.
//   - Blog frontmatter still carries `author` (the Organization). The Person
//     byline is additive: the org publishes, the broker authors or reviews.

export type Author = {
  slug: string;          // resolves to /team-members/{slug}
  name: string;
  role: string;          // jobTitle
  credential: string;    // one line under the name, must be verifiable
  specialties: string[]; // knowsAbout
  short: string;         // byline bio, 1-2 sentences
  licenseNumber?: string;
  sameAs?: string[];
};

const teamPhoto = (slug: string) => TEAM.find((t) => t.slug === slug)?.photo ?? '';

export const AUTHORS: Record<string, Author> = {
  'robert-morgen': {
    slug: 'robert-morgen',
    name: 'Robert Morgen',
    role: 'Owner / COO & Group Services Director',
    credential: 'Licensed Life & Health insurance broker · Las Vegas',
    specialties: [
      'ICHRA', 'Section 105 arrangements', 'QSEHRA', 'small group health insurance',
      'employer benefits strategy', 'self-employed coverage', 'Nevada Health Link',
    ],
    // `short` is the schema description. Rewritten Aug 12 2026 to match the
    // bio Robert supplied himself, so the Person description and the visible
    // profile make the same claim. Note he describes himself as COO rather
    // than as an owner; his wording governs.
    short: 'Robert Morgen is a Las Vegas-based Life & Health insurance broker and the COO of ProtectHealth. With more than a decade of experience in Nevada\'s health insurance market, he works with families, small employers, and agents, serves as Director of Employer Group Services, and leads agent training and development.',
    licenseNumber: '',
    // Supplied by Robert, Aug 12 2026. sameAs is what lets engines connect
    // this byline to a real, verifiable professional.
    sameAs: ['https://www.linkedin.com/in/robertmorgen/'],
  },
  'brian-douglas': {
    slug: 'brian-douglas',
    name: 'Brian Douglas',
    role: 'Owner / CEO',
    credential: 'Licensed insurance broker & benefits advisor · Las Vegas',
    specialties: [
      'individual health insurance', 'ACA marketplace coverage', 'premium tax credits',
      'Nevada Health Link', 'Medicare', 'open enrollment', 'gap health insurance',
    ],
    short: 'Brian is the Owner and CEO of ProtectHealth, one of Nevada’s largest individual health insurance agencies, and a licensed broker and benefits advisor. He leads a statewide network of more than 40 licensed brokers and works extensively with Nevada Health Link.',
    licenseNumber: '',
    sameAs: [],
  },
  'brenda-morgen': {
    slug: 'brenda-morgen',
    name: 'Brenda Morgen',
    role: 'Broker',
    credential: 'Licensed insurance broker · Las Vegas',
    specialties: [
      'dental insurance', 'vision insurance', 'life insurance',
      'term life', 'whole life', 'ancillary coverage',
    ],
    // PENDING BRENDA'S APPROVAL, drafted Jul 27 2026 from her role and the
    // agency context only. It asserts no years of experience, no license number
    // and no specialisms she has not confirmed. She must sign off before this
    // is treated as final.
    short: 'Brenda is a licensed broker at ProtectHealth in Las Vegas, working with Nevada individuals and families on the coverage that sits alongside a health plan, dental, vision and life.',
    licenseNumber: '',
    sameAs: [],
  },
};

// Cluster → byline. Robert owns the employer and self-employed strategy content
// because he runs Employer Group Services and drove the ICHRA campaign. Brian
// owns individual health, the Nevada marketplace and Medicare as the agency
// lead. Brenda owns the ancillary lines.
export const CLUSTER_AUTHOR: Record<string, string> = {
  ichra: 'robert-morgen',
  employers: 'robert-morgen',
  'nevada-core': 'brian-douglas',
  medicare: 'brian-douglas',
  life: 'brenda-morgen',
  'dental-vision': 'brenda-morgen',
};

export const authorFor = (cluster: string): Author =>
  AUTHORS[CLUSTER_AUTHOR[cluster] ?? 'brian-douglas'];

export const authorPhoto = (a: Author) => teamPhoto(a.slug);

export const personId = (slug: string) => `${SITE.domain}/team-members/${slug}#person`;

// Person node for JSON-LD. Empty licenseNumber / sameAs are dropped rather than
// emitted blank, so the schema never asserts a credential we cannot back up.
export function personSchema(a: Author) {
  const node: Record<string, unknown> = {
    '@type': 'Person',
    '@id': personId(a.slug),
    name: a.name,
    jobTitle: a.role,
    description: a.short,
    url: `${SITE.domain}/team-members/${a.slug}`,
    image: teamPhoto(a.slug),
    worksFor: { '@id': ORG_ID },
    knowsAbout: a.specialties,
  };
  if (a.licenseNumber) {
    node.hasCredential = {
      '@type': 'EducationalOccupationalCredential',
      credentialCategory: 'Nevada insurance producer license',
      identifier: a.licenseNumber,
    };
  }
  if (a.sameAs && a.sameAs.length) node.sameAs = a.sameAs;
  return node;
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url, // required on ALL positions incl. current page (wiki: json-ld-schemas)
    })),
  };
}

export function speakableSchema(url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    url,
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['#ai-summary'],
    },
  };
}

// Direct link people are sent to when they choose 4-5 stars on the review page.
// Swap this for a cleaner "write a review" deep link anytime; it is the only
// place the destination is defined (used by /review and the review-request email).
export const GOOGLE_REVIEW_URL = 'https://www.google.com/search?q=protecthealth+google+review&sca_esv=b21e0fc4ad4b3263#lrd=0x80c8c3a1ee8daa15:0xa01196f04d3e4e0f,3,,,,';

// Machine-readable mirror of the visible Sources section (scripts/
// rehype-sources.mjs). Pulls the external links out of a raw markdown body
// so BlogPosting/QAPage JSON-LD can carry a `citation` array pointing at the
// same authorities the prose cites. Both surfaces derive from the same body
// links, so they cannot drift. Returns undefined when a body cites nothing,
// so the field is omitted rather than emitted empty.
export function citationsFrom(body: string | undefined) {
  if (!body) return undefined;
  const seen = new Set<string>();
  const out: { '@type': 'WebPage'; url: string }[] = [];
  for (const m of body.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)) {
    const url = m[1];
    try {
      const host = new URL(url).hostname.replace(/^www\./, '');
      if (host === 'protecthealth.com' || seen.has(url)) continue;
    } catch {
      continue;
    }
    seen.add(url);
    out.push({ '@type': 'WebPage', url });
  }
  return out.length ? out : undefined;
}
