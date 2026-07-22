// Single source of truth for brand + org data.
export const SITE = {
  name: 'ProtectHealth',
  domain: 'https://www.protecthealth.com',
  tagline: 'The product should serve the strategy — not become the strategy.',
  phone: '800-240-8185',
  phoneHref: 'tel:+18002408185',
  description:
    'ProtectHealth is a Las Vegas, Nevada insurance brokerage helping individuals, self-employed professionals, and small businesses build coverage strategies across health, life, dental, vision, Medicare, and employer benefits.',
  email: '',
  address: {
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
    address: {
      '@type': 'PostalAddress',
      addressLocality: SITE.address.locality,
      addressRegion: SITE.address.region,
      addressCountry: SITE.address.country,
    },
    areaServed: { '@type': 'State', name: 'Nevada' },
    sameAs: [SITE.social.facebook, SITE.social.linkedin].filter(Boolean),
  };
}

// Images currently hotlinked from the live Webflow CDN.
// TODO (Claude Code): download to /public/assets as WebP and swap paths (see CLAUDE.md roadmap).
const CDN = 'https://cdn.prod.website-files.com';
export const ASSETS = {
  logo: `${CDN}/66c61e488a0b1c025cc02cdc/66c9286791d542e6438faae0_New%20LO.webp`,
  heroFamily: `${CDN}/66c61e488a0b1c025cc02cdc/66c61e498a0b1c025cc02e24_About%20Us-Home%20(1).webp`,
  contactPortrait: `${CDN}/66c61e488a0b1c025cc02cdc/66c61e498a0b1c025cc02dbc_contact%20us%20img%20(1).webp`,
  avatars: [
    `${CDN}/66c61e488a0b1c025cc02cdc/66c61e498a0b1c025cc02e23_Avatar.jpg`,
    `${CDN}/66c61e488a0b1c025cc02cdc/66c61e498a0b1c025cc02e25_Avatar%202.jpg`,
    `${CDN}/66c61e488a0b1c025cc02cdc/66c61e498a0b1c025cc02e27_Avatar%203.jpg`,
    `${CDN}/66c61e488a0b1c025cc02cdc/66c61e498a0b1c025cc02e26_Avatar%204.jpg`,
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

export const BLOG_ART: Record<string, { png: string; webp: string; alt: string }> = {
  'nevada-open-enrollment-health-insurance': art('033952', 'cd74f42f-d6bf-4fe1-a816-81368c3d0cd2', 'Glass hourglass pouring golden light that wraps a protected Las Vegas home — the Nevada open enrollment window closing'),
  'silver-state-health-insurance-exchange': art('033955', '7c9f8b5b-fd5a-4b0f-a59b-417f00dc9838', 'Nevada sculpted in gradient glass with streams of light flowing to a glowing marketplace pavilion — the Silver State Health Insurance Exchange'),
  'small-business-health-insurance': art('033959', '98fe38d2-fb78-458a-8602-4b88a07a492d', 'A blooming canopy of gradient light sheltering a small glowing storefront and its team — small business health insurance'),
  'what-is-an-ichra': art('034002', '536c8944-9674-4af0-a983-0b03c54ae485', 'A glass hand holding a glowing benefit orb that splits into three streams toward floating plan cards — how an ICHRA turns one budget into personal choice'),
  'realtor-health-insurance-guide': art('034006', '1b6cd524-04d5-45d0-aaae-a65fefa141c7', 'A luminous gradient key and protective aurora arcing over a modern home — health insurance strategy for Realtors'),
  'health-insurance-options-self-employed-nevada': art('034009', '7ab2936d-667d-4379-91b2-d4818d7ec38a', 'Four rivers of gradient light diverging toward four glowing coverage monuments — the self-employed health insurance options map'),
  'ichra-vs-marketplace-health-insurance': art('034018', '3f6b72ec-cc6c-42e5-9c42-95eff90573dc', 'Two crystalline structures — a marketplace archway and an employer tower — bridged by violet light — ICHRA versus marketplace coverage'),
  'tax-advantaged-health-benefits-self-employed': art('034021', '218a08a9-fb50-4538-a63c-120d20bcda5d', 'A gradient glass vault releasing a protected spiral of glowing coins beneath a floating shield — tax-advantaged health benefit structures'),
  'signs-your-business-needs-hr-support': art('034025', '35150595-2c5e-4e34-a7ba-d22758697ca8', 'A storm of spiraling paperwork calmed by a wide river of cyan light — the warning signs a small business needs HR support'),
  'employee-benefits-guide-small-business': art('034043', '59f6db8e-0f95-4eac-adc4-55eccbc4a2d5', 'Crystalline orbs of benefits — heart, umbrella, nest egg, clock — orbiting two colleagues — employee benefits that keep good people'),
  'how-much-life-insurance-do-i-need': art('035653', 'ead92e76-1838-46ef-8c69-9229fc6fe7b4', 'A family of light beside a rising column of stacked gradient glass blocks with a beam marking the right height — measuring how much life insurance a family needs'),
  'term-vs-whole-life-insurance': art('035656', '7e17e75f-49fc-4685-9c48-2367a16f6982', 'A cyan hourglass with fixed sand facing an infinite golden ring of light on a reflective plane — term life insurance versus whole life'),
  'is-dental-insurance-worth-it': art('035659', '6a0ffe79-1e62-4408-ad6a-07028d57076d', 'A flawless glass tooth displayed like a museum jewel beside a balance scale weighing a coin against a sparkle — whether dental insurance is worth the price'),
  'dental-insurance-vs-discount-plans': art('035702', '5740bc5e-8c19-4417-893e-42c745a4b19c', 'Two doorways of light — a full ornate archway and a simpler half-open door — with a figure deciding between them — dental insurance versus discount plans'),
  'turning-65-in-nevada-medicare-checklist': art('035712', '47fd0701-cf1f-487e-9f81-811589c3c64d', 'A gradient glass birthday cake with one radiant candle unfolding a stepping-stone path toward a glowing shield gateway — the Medicare road that begins at 65'),
  'medicare-advantage-vs-medigap-nevada': art('035715', 'c1db030d-0858-4ca1-b16d-af51fc374c12', 'A river of light forking between a bundled dome city and an open plain of glowing waypoints, a figure at the fork — Medicare Advantage versus Medigap'),
  'aca-premium-tax-credits-explained': art('035718', '355eafc0-35bc-46e6-87ca-afd8b4fdab17', 'A glowing coin descending into the hands of a family of light, trailing a ribbon back to a radiant archway — an ACA premium tax credit arriving'),
  'how-to-choose-a-health-insurance-plan-nevada': art('035722', '49735f50-b1b7-4f10-9e74-b78385ebe8c0', 'A figure of light examining five crystalline plan tablets through a gradient lens that reveals networks and costs inside — choosing a health plan by what is truly inside'),
  'what-is-gap-health-insurance': art('040038', 'dac99271-9991-43d0-bdd7-3905910e8eda', 'A glowing glass bridge spanning the chasm between two crystalline platforms, filling the space with light — GAP insurance covering the deductible gap'),
  'health-insurance-for-freelancers-and-gig-workers': art('040042', 'ffa1feb4-a8f4-44cd-b1f7-3086d908d241', 'A constellation of independent glowing orbs connected by threads of light to one radiant shield nucleus — freelancers and gig workers finding coverage structure'),
  'tipped-payroll-mistakes-las-vegas': art('040045', 'a04c83b7-3143-4f85-85bb-e52c9b73a3b3', 'Golden coins cascading toward a glass ledger tray with one coin veering off in amber light against a neon Las Vegas skyline — tipped payroll gone wrong'),
  'peo-vs-payroll-service-vs-diy': art('040049', 'c32b6d2c-f3b9-45a2-9ce7-f5ff4a4c8eec', 'Three glass pedestals of ascending sophistication — a lone cube, interlocking gears, and a luminous orbiting machine — PEO versus payroll service versus DIY'),
};

export const QA_ART: Record<string, { png: string; webp: string; alt: string }> = {
  'is-an-ichra-legit': art('034032', 'ba573c77-0dbb-40ca-a544-1764a609e7f1', 'A layered gradient glass shield on a marble plinth under a museum spotlight with a ring of verification light — ICHRA legitimacy proven'),
  'what-is-a-section-105-plan': art('034050', '109f0b9f-aac0-40e0-809b-b11bcfb8a611', 'A glowing glass scroll casting a bridge of light and coins to a family at their home — a Section 105 plan at work'),
  'can-realtors-get-group-health-insurance': art('034050', '6adc4e85-a034-47c1-975e-3120b0151982', 'A lone professional raising a personal aurora of light beside a sheltered group dome — Realtors and group health insurance'),
  'does-a-small-business-need-an-hr-department': art('034053', '15df0996-5693-4f60-b3a1-ccd8745b7de8', 'A calm hand of gradient light sliding beneath a juggled arc of business tasks — HR support arriving for a small business owner'),
  'what-does-a-peo-do': art('034057', '7826276a-ee9a-464f-9bf4-7975ea5ad04c', 'Two glass towers joined by a double helix of gradient light with figures traveling between them — how a PEO partnership carries the weight'),
  'when-should-a-business-outsource-payroll': art('034100', '99f5294a-8e72-43f8-b100-1b3f1907c69c', 'A river of glowing pay envelopes flowing from a cluttered shoreline through a crystalline archway into perfect order — payroll outsourced'),
  'can-an-s-corp-owner-use-an-ichra': art('043340', 'd40623c6-c248-4c66-b232-96337b6d2c40', 'Glass turnstile gate passing golden keys while one large emerald key is redirected to a separate glowing path — S-corp owner eligibility for an ICHRA'),
  'what-happens-to-my-ichra-if-i-leave-my-job': art('043342', '9d4877aa-b25a-4bcb-ab85-53aae2072f9d', 'Glowing glass lantern detaching from a golden pedestal and shining on its own — what happens to an ICHRA after leaving a job'),
  'how-does-ichra-reimbursement-work': art('043344', 'a01c9242-9627-46da-8a7c-c09b9940b938', 'Circular glass and brass machine cycling glowing coins through a crystal checkpoint — how ICHRA reimbursement works'),
  'how-much-does-health-insurance-cost-for-realtors-in-nevada': art('043347', '083daf63-ffe0-48a0-ba64-9ea12ddac990', 'White light split by a crystal prism into five ribbons of varying width controlled by glass dials — health insurance cost drivers for Nevada Realtors'),
  'do-real-estate-brokerages-offer-health-insurance': art('043349', '961103df-de5c-447f-b008-cb03cd58299b', 'Glass pavilion covering only a few pedestals while glowing obelisks outside carry their own light umbrellas — brokerage health insurance and 1099 agents'),
  'can-commission-income-qualify-for-health-insurance-subsidies': art('043351', '490c20d0-bdc9-423c-bd9e-671e739bc547', 'Molten gold refined through a crystal funnel into a thin stream that opens a glowing aperture — commission income qualifying for health insurance subsidies'),
  'can-self-employed-nevadans-deduct-health-insurance-premiums': art('043353', 'dbbe4b2b-ae2c-42d0-a4a4-c005941325e0', 'Glass balance scale with a slab shedding luminous layers that float away — deducting health insurance premiums for self-employed Nevadans'),
  'how-do-llc-owners-get-health-insurance-in-nevada': art('043355', '64a914d0-308a-44b8-b6d4-add22e468e42', 'One glass archway branching into three glowing paths toward different crystal structures — how LLC owners get health insurance in Nevada'),
  'can-a-sole-proprietor-get-group-health-insurance': art('043410', '0767dcb5-c8ec-44bf-a46e-095409834d25', 'Two-keyhole golden vault door facing a single hovering key beside an open side passage — sole proprietors and group health insurance'),
  'can-a-spouse-join-a-self-employed-health-plan': art('043412', 'fb17abda-12f0-4084-95b1-5ae3c1693945', 'Interlinked crystal and rose-gold rings glowing under a shared glass dome — adding a spouse to a self-employed health plan'),
  'do-gig-workers-get-health-insurance-from-uber-or-doordash': art('043414', '09d31b3d-7c53-4e9b-87b0-0c4fb68f2f6b', 'Scattered glass stars linking themselves by light threads to one independent beacon — gig worker health insurance beyond the platforms'),
  'is-short-term-health-insurance-good-for-freelancers': art('043417', '04fb3dde-bf44-454c-8ede-18ad187eb99d', 'Fragile translucent glass footbridge with fading gaps beside a solid golden bridge — short-term health insurance as a freelancer bridge product'),
  'how-do-freelancers-estimate-income-for-health-subsidies': art('043418', '2695e845-ebb1-4a13-afcc-27dc7b75916f', 'Crystal gauge of wave-like liquid gold with an adjustable brass marker on its scale — estimating freelance income for health subsidies'),
  'can-freelancers-write-off-health-insurance-premiums': art('043421', 'bf72667a-a894-4616-b47a-782ea98d9853', 'Crystal stamp lifting a glowing layer from a stack of glass ledger plates — freelancers writing off health insurance premiums'),
  'can-an-employee-decline-an-ichra': art('043423', '1ea39cbd-8a24-495b-b571-b0b78de1c2a9', 'Key of light hovering between an open gold door and an open sapphire door — an employee\'s choice to decline an ICHRA'),
  'does-an-ichra-affect-premium-tax-credits': art('043425', '4c9ed1ee-af5a-4f8f-98e2-b0d96a21f532', 'Golden glass orb eclipsing a silver orb so a single beam reaches the pedestal — how an ICHRA affects premium tax credits'),
  'is-an-ichra-cheaper-than-group-health-insurance': art('043440', '4bac3b90-2ac3-42f2-bb64-80071e9b0082', 'Scales balancing a fixed glass cube against a fluctuating column of flame — ICHRA cost versus group health insurance'),
  'can-an-ichra-reimburse-medicare-premiums': art('043443', '004aea34-6b72-43ae-9454-741447d159b5', 'Golden stream passing an engraved crystal valve into a classical silver fountain — ICHRA reimbursement of Medicare premiums'),
  'what-is-a-qsehra': art('043445', '2a36185f-2c1e-4f64-82fb-16ba6ed650f1', 'Capped crystal decanter with an etched fill line beside a larger open vessel of light — QSEHRA contribution caps compared with ICHRA'),
  'can-hiring-a-spouse-unlock-health-benefits': art('043447', '17773538-2dfe-43ef-a796-c3e0c412b0f3', 'Gold and silver light ribbons braided into one key unlocking a glowing glass conservatory — hiring a spouse to unlock health benefits'),
  'is-self-employed-health-insurance-tax-deductible': art('043449', 'ae81b69b-8bf9-409c-ac89-a98c83286b58', 'Glass block lifting free from a descending staircase and rising toward a skylight — the self-employed health insurance tax deduction'),
  'how-many-employees-are-needed-for-group-health-insurance': art('043452', '9526fd7b-8e28-4ece-b0cf-a98e3603d4e3', 'A glowing glass key opening a translucent doorway to a lit corridor — the one-employee threshold for group health insurance eligibility'),
  'what-does-group-health-insurance-cost-per-employee': art('043454', '7d4fb6e9-1f4e-4436-b243-37f0985d8cd5', 'Glass ledger slabs with light columns of varying heights beneath a floating slider — the drivers behind group health insurance cost per employee'),
  'are-small-businesses-required-to-offer-health-insurance': art('043456', '69e4e682-88af-4992-8543-eac78ac1948d', 'A glass scale weighing a feather of light against a heavy orb at a glowing boundary line — the 50-employee line for the health insurance mandate'),
  'what-is-a-level-funded-health-plan': art('043510', '0154714b-5819-4e17-b25c-37685d630b18', 'A domed glass reservoir with a level plane of light and a surplus stream returning from its base — how a level-funded health plan works'),
  'what-hr-tasks-can-be-outsourced': art('043513', '0fd5ce0e-7f00-49be-8945-daf952f79409', 'Outer glass gears rising on light threads toward a distant hub while a core cluster keeps turning — which HR tasks can be outsourced'),
  'how-much-does-an-hr-mistake-cost-a-small-business': art('043515', 'c0ca18fc-5692-401c-8b1d-9c5d6ad9d457', 'One toppled glass domino triggering a multiplying mirrored cascade of glowing tiles — how a single HR mistake compounds in cost'),
  'what-is-the-fica-tip-credit': art('043518', '0aa0a045-4eda-4777-ba7e-1b4e2f98108e', 'A river of light bending back to return gold droplets into a glass vault — the FICA tip credit refunding employer payroll taxes on tips'),
  'does-nevada-allow-a-tip-credit': art('043520', 'd74e72bf-090e-467c-a04b-7f726b02bc3f', 'A glass dam holding light at the full-wage line while a golden stream flows freely over the top — Nevada\'s ban on the tip credit'),
  'are-service-charges-taxed-like-tips': art('043522', 'e57bd2f8-b24e-4996-9228-107d6a7074c5', 'A light stream forking into free golden mist and rigid glass bars — why service charges are wages while tips remain tips'),
  'who-can-legally-share-a-tip-pool': art('043525', 'f8814472-0a15-4a8e-83cb-a956d42ed7d0', 'A ring of glass chalices sharing golden light with one tall dark vessel excluded outside the circle — who can legally share a tip pool'),
  'what-benefits-do-small-business-employees-want-most': art('043527', '28a2e5c8-3f94-4eed-8f94-75019159ef05', 'A five-tier glass tower of glowing objects crowned by a radiant orb — the benefits small business employees rank highest'),
  'how-much-should-a-small-business-budget-for-benefits': art('043540', 'ef446505-c0c2-40ca-8f85-658169bf1d2c', 'A calibrated glass pitcher pouring equal measures of light into a row of cups — setting a fixed per-employee benefits budget'),
  'do-employee-benefits-reduce-turnover': art('043543', '65c6fb04-a1cc-4ea4-bacc-c18d8a81d00b', 'A glass anchor tethering glowing orbs against a strong current — how employee benefits hold teams and reduce turnover'),
  'what-does-a-benefits-broker-do': art('043545', 'e63ac81b-cc95-4116-8b47-b49951c887fb', 'A glass compass beaming a clear path through a prism labyrinth — the guidance a benefits broker provides at no added plan cost'),
  'how-much-does-a-peo-cost': art('043547', '79308d29-02f3-4663-aca7-157e5e1826f6', 'A glass engine turning one fuel stream of light into many synchronized working parts — what a PEO\'s bundled fee actually buys'),
  'what-is-co-employment': art('043549', 'ec772c3c-23cc-4541-ac85-8dfe2f9637d7', 'Two glass lattices interweaving into one load-bearing arch — the shared employer roles of co-employment'),
  'can-a-business-leave-a-peo': art('043552', '587d421b-6b09-48b0-86d1-e74dac97ea47', 'An open glass gate at a glowing year-line with a lit vessel sailing through as cargo transfers behind — leaving a PEO with a planned transition'),
  'when-is-open-enrollment-in-nevada': art('043554', 'd5a08659-8ed3-4787-adc0-2ce3109902cb', 'Glass calendar with a single glowing golden window of dates amid dark frozen panes — Nevada open enrollment dates'),
  'what-is-a-qualifying-life-event': art('043556', 'c4e80a98-e630-465b-8ce9-3e94b39e4ac1', 'Key of light opening one door in a ring of locked crystal doors — qualifying life events for special enrollment'),
  'can-you-buy-health-insurance-outside-open-enrollment': art('043610', 'c1c43560-8bc4-4635-a1ee-99dfef4da3c1', 'Closed glass gate with one narrow lit side passage and a dissolving rope bridge below — buying health insurance outside open enrollment'),
  'what-happens-if-you-miss-open-enrollment-in-nevada': art('043612', '4a136b83-55a0-4bf3-815f-03b807c128de', 'Spent hourglass before a long corridor leading to a distant lit doorway — consequences of missing Nevada open enrollment'),
  'what-is-nevada-health-link': art('043614', '3b72faed-d0ce-4282-8984-10a94feab9c9', 'Glowing glass pavilion with orbiting luminous plan cards around a silver column — Nevada Health Link state marketplace'),
  'is-nevada-health-link-the-same-as-healthcare-gov': art('043617', 'fa296d3b-fc89-40be-aa8e-a8925fec2f6f', 'Two crystal bridges over one river with light redirecting toward the nearer silver bridge — Nevada Health Link versus healthcare.gov'),
  'who-qualifies-for-health-insurance-subsidies-in-nevada': art('043619', 'cc6543ef-c5c1-400b-8f6c-d51714079b7b', 'Glass balance scale weighing luminous coins against a prism ladder of thresholds — who qualifies for Nevada health insurance subsidies'),
  'does-nevada-have-expanded-medicaid': art('043621', '1d5d814b-5c44-4dfd-811e-f0bb7a26885d', 'Glowing emerald safety net extended beyond old brass boundary markers — Nevada\'s expanded Medicaid'),
  'what-income-counts-for-aca-subsidies': art('043623', '389b5d95-8cfb-4e1a-81bb-a6ede3a9a34e', 'Glass funnel sorting glowing income streams into one measured beaker while excluded tokens deflect away — what income counts toward MAGI for ACA subsidies'),
  'do-aca-subsidies-have-to-be-paid-back': art('043625', '4c1e70a7-df52-4317-bcad-6e2b060c8b79', 'Glass siphon drawing a stream of golden coins from one stack back to a crystal ledger — paying back advance ACA subsidies at reconciliation'),
  'what-is-the-aca-subsidy-cliff': art('043641', '33d919c9-8aec-4f1b-854e-6b1f0072f22f', 'Amber glass staircase ending abruptly at a sheer dark cliff with a coin on the edge — the ACA subsidy cliff concept'),
  'can-you-get-aca-subsidies-if-an-employer-offers-insurance': art('043643', '4186bba1-b5a2-406c-b7bd-8d70064107ff', 'Blue glass employer platform blocking a golden marketplace doorway while family orbs slip around it — employer offers blocking ACA subsidies'),
  'does-gap-insurance-cover-the-deductible': art('043646', 'ba68f3f6-b201-4527-adf8-5a7af3460366', 'Golden pulse crossing a glass canyon only when a flare bursts overhead — GAP insurance paying toward the deductible on triggered events'),
  'is-hospital-indemnity-the-same-as-gap-insurance': art('043649', '60c75e00-b37a-473f-997f-a2f4e328fa48', 'Small sapphire orb nested inside a broader aqua glass bowl with overlapping halos — hospital indemnity as one design within GAP insurance'),
  'can-gap-insurance-pair-with-any-health-plan': art('043650', '7a497d70-4c8e-4a7b-9489-4912c7905e71', 'Rose-gold lens docking onto varied crystal plan monoliths with one caution-ringed exception — pairing GAP insurance with different health plans'),
  'is-gap-health-insurance-worth-it': art('043652', 'd0cc9e22-d8ee-431b-b2fd-9fa56560740b', 'Smoky quartz scale weighing a jagged red deductible shard against a small glowing premium sphere — whether GAP health insurance is worth it'),
  'what-is-the-difference-between-hmo-and-ppo': art('043655', '5ddeffd1-3a9b-4255-a7eb-e333450875f4', 'Closed emerald maze with a gatekeeper arch beside an open sapphire lattice with many exits — HMO versus PPO network design'),
  'what-is-an-out-of-pocket-maximum': art('043657', 'e3d4d8fa-7f51-45da-babf-be320ae89456', 'Coin column stopped by a glowing ceiling plate inside a crystal cylinder — the out-of-pocket maximum spending cap'),
  'how-do-you-check-if-a-doctor-is-in-network': art('043717', '42392672-b02e-42db-9239-d06fb1bc0070', 'Golden lens verifying stars on a shifting constellation map with green confirmation rings — checking whether a doctor is in network'),
  'which-metal-tier-is-best-for-families': art('043719', '5ff9e6eb-9002-4d4b-9cfa-3ae720f6d6ff', 'Bronze to platinum glass terraces with family light-orbs resting on a glowing silver step — choosing the best metal tier for families'),
  'does-a-stay-at-home-parent-need-life-insurance': art('043721', 'a85a3522-e34d-43d2-8306-f4103d859653', 'Glowing golden orbs orbiting an empty crystal chair inside a glass house, outweighing a coin on a balance scale — the unpaid economic value a stay-at-home parent\'s life insurance must replace'),
  'is-employer-life-insurance-enough': art('043724', '3720ae99-7df8-4835-9baf-728729aaeabc', 'A tiny tethered umbrella of light dissolving beside a large freestanding amber glass dome sheltering a house — employer life insurance versus personally owned coverage'),
  'what-is-the-dime-method-for-life-insurance': art('043725', '7d0067f5-15a4-476f-b0f3-00edb61d3efa', 'Four colored glass pillars channeling light into one floating prism above a reflective pool — the DIME method summing Debt, Income, Mortgage, and Education into a single coverage number'),
  'does-life-insurance-pay-off-a-mortgage': art('043728', '3571becd-dec1-44bf-97a1-d8c418a7659f', 'A radiant golden key of light shattering dark glass chains wrapped around a crystal house — a life insurance death benefit paying off the mortgage'),
  'can-term-life-be-converted-to-whole-life': art('043730', 'e4812912-8d59-49ad-b8b7-2cc8cb687f3f', 'A crystal bridge crossing through an open hourglass doorway toward a golden vault before the sands run out — converting term life to whole life within the conversion window'),
  'what-happens-when-a-term-life-policy-expires': art('043732', '04cf6c80-1b2f-48bc-83cf-1d256b4a0979', 'An hourglass dropping its last glowing grain as the canopy of light over a glass village fades away — coverage ending when a term life policy expires'),
  'is-whole-life-insurance-a-good-investment': art('043745', '0daabaf9-076b-40a9-8c95-f72965f9b15b', 'An emerald glass tree bearing small glowing fruit inside a golden vault while fast silver ribbons of light stream past outside — whole life insurance as steady protection rather than a market-beating investment'),
  'what-is-laddering-life-insurance': art('043748', 'f8df56ff-a364-44fd-9ac2-510e5e250c03', 'Three glowing glass ladders of staggered heights dissolving one by one against a shrinking crystal hill — laddering term life policies so coverage steps down as obligations disappear'),
  'what-does-dental-insurance-actually-cover': art('043750', 'e41e5f41-7ebd-4daf-b835-c7ae402e9204', 'Three rows of crystal teeth on a glass staircase, each row lit to a different level of golden light under a prismatic dome — the 100-80-50 structure of what dental insurance covers'),
  'do-dental-plans-have-waiting-periods': art('043752', '5b7956b4-f0fd-41d8-b44c-2bc237d6e9ca', 'Glass hourglass of golden light in front of crystal doors, one open and the rest sealed — the waiting periods built into dental insurance plans'),
  'is-vision-insurance-worth-it': art('043755', '1ddd6de7-987e-4a0d-b842-9d432f3ac35f', 'Giant glass lenses above a scale of light where refracted beams outweigh a small stack of coins — the break-even math of vision insurance for lens wearers'),
  'what-is-a-dental-annual-maximum': art('043757', '314f806f-7057-4325-9cd9-f37639036d38', 'Crystal treasure chest filling with golden light that stops at an etched limit line while the overflow drains into shadow — the annual maximum cap on dental insurance'),
  'how-do-dental-discount-plans-work': art('043759', '73da9f8f-d8b9-467e-8ff4-2e234af72123', 'Glass membership key opening a prism gate onto a corridor of shrinking light-tags — how dental discount plans unlock reduced member pricing'),
  'can-you-have-dental-insurance-and-a-discount-plan': art('043801', '55af4e85-2db8-4717-b7d1-ec97905d0d92', 'Gold and teal rivers of light running parallel through glass arches and joining only at a distant delta — pairing dental insurance with a discount plan across a year'),
  'are-dental-discount-plans-legit': art('043818', 'bdb8e637-5e2e-4725-b295-ce4876528b3f', 'Crystal loupe examining a glowing glass ledger of fees that projects an emerald seal of verification — vetting whether dental discount plans are legitimate'),
  'does-dental-insurance-cover-implants': art('043821', '71f79e4f-8276-4310-b913-9f1e04c08880', 'Monumental crystal tooth only partially wrapped in a fraying ribbon of golden light — the limited and often excluded coverage dental insurance gives implants'),
  'do-you-have-to-sign-up-for-medicare-at-65': art('043823', '98dc1d8b-ba0b-48c2-b668-efe9bfd8efd4', 'Glowing glass gateway with seven amber panels leading toward a luminous clock face — whether Medicare enrollment at 65 is required'),
  'what-is-the-medicare-part-b-penalty': art('043825', 'e88fc06a-af81-4196-8a75-da0fd05f92a7', 'Smoked-glass hourglass spilling golden sand that hardens into a permanent stack of luminous coins — the lifetime Medicare Part B late enrollment penalty'),
  'is-medicare-free-at-65': art('043827', '613d237e-ad70-4768-b1e2-f1a8c1a5f903', 'One free-floating crystal orb beside a twin orb enclosed in a tiered golden glass meter — which parts of Medicare are free at 65'),
  'can-you-delay-medicare-if-still-working': art('043829', '1285925d-551a-4fe2-85b3-9e5535e99924', 'Glass drawbridge paused above a river of light, supported by twenty glowing sapphire pillars — delaying Medicare while still working with qualifying employer coverage'),
  'why-are-medicare-advantage-premiums-zero-dollars': art('043832', '411b7553-a372-4826-bed3-233b3ca62281', 'Crystal zero glowing above a hidden cascade of gold flowing through translucent toll gates — why Medicare Advantage premiums can be zero dollars'),
  'can-you-switch-from-medicare-advantage-to-medigap': art('043834', 'b6fb3281-c18c-4f27-908a-7f412b29da18', 'Open door of light beside a sealed frosted-glass door with a prism lock — switching from Medicare Advantage to Medigap and the underwriting barrier'),
  'does-medigap-work-in-other-states': art('043850', '079d11db-8e2e-4302-8328-7bf91164a76e', 'Luminous glass passport casting beams across a golden crystalline map of the United States — Medigap coverage traveling to every state'),
  'what-is-medigap-open-enrollment': art('043852', 'cf438c8e-072d-499e-9982-49de74d90b30', 'Amber stained-glass window with six candles of light slowly frosting over — the one-time six-month Medigap open enrollment window'),
};

export const FAQ_ART = art('034236', 'ef11febc-6b23-4a46-b916-8d7739c65543', 'A spiral galaxy of glowing question orbs orbiting a radiant gradient beacon — every ProtectHealth question finding a clear answer');

// Higgsfield-generated brand imagery (hotlinked; localize with the Webflow set — see CLAUDE.md).
const HF = 'https://d8j0ntlcm91z4.cloudfront.net/user_3GY61bj0wPgc3RYJDtgyJ6LmhTH';
export const HF_ASSETS = {
  hero: `${HF}/hf_20260722_013708_a84d4826-1079-4760-9abb-41f524438e7d.png`,
  advisor: `${HF}/hf_20260722_013710_d47f6de9-17a4-470b-a6f0-9f0c5853ea68.png`,
  realtor: `${HF}/hf_20260722_013712_31f9529e-81b6-4bdd-9fe9-ac965a5246da.png`,
  employers: `${HF}/hf_20260722_013714_46d2a51a-942a-4ecc-aee3-a320f2aaca8c.png`,
  icons: {
    'health-insurance': `${HF}/hf_20260722_013725_2285183b-231e-4eae-9734-beb0340564fb.png`,
    'life-insurance': `${HF}/hf_20260722_013727_524ccf50-5b61-4320-b4d6-1b309fa33f23.png`,
    'gap-health-insurance': `${HF}/hf_20260722_013728_0cd1aa94-5acb-416b-b880-feef2b301dda.png`,
    'medicare': `${HF}/hf_20260722_013730_b4e06409-9e04-4111-9ee3-da84b8e14570.png`,
    'dental-insurance': `${HF}/hf_20260722_014206_f59ef6cb-24da-4761-9832-40407cda5f79.png`,
    'vision-insurance': `${HF}/hf_20260722_013733_dc867883-ef0f-4d28-8f20-f8c9ec35a715.png`,
  } as Record<string, string>,
};

// Team headshots: Nano Banana 2 re-renders on a unified studio gradient (identity-preserved from originals).
export const TEAM = [
  { slug: 'robert-morgen', name: 'Robert Morgen', role: 'Broker', photo: `${HF}/hf_20260722_022202_48d493a6-11bc-4126-8fb6-1e488b4d7c00.png` },
  { slug: 'brian-douglas', name: 'Brian Douglas', role: 'Broker', photo: `${HF}/hf_20260722_022205_acf0f6da-8988-4535-aa08-e853b51069f6.png` },
  { slug: 'brenda-morgen', name: 'Brenda Morgen', role: 'Broker', photo: `${HF}/hf_20260722_022208_8ac08dcc-e50f-4e83-82d7-1f6837eb2d36.png` },
  { slug: 'jason-vasquez', name: 'Jason Vasquez', role: 'Broker', photo: `${HF}/hf_20260722_022210_91cf9399-8eb2-4ff4-be17-d3fe8f072dd9.png` },
  { slug: 'janet-nevarez', name: 'Janet Nevarez', role: 'Broker', photo: `${HF}/hf_20260722_060923_afb0c89b-093a-4319-aa7e-95278d852b08.png` },
  { slug: 'chris-bridgeforth', name: 'Chris Bridgeforth', role: 'Broker', photo: `${HF}/hf_20260722_060925_8d3e3ee0-ceaa-4bba-8c6b-93d9257a7032.png` },
];

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
