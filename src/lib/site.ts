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
    // TODO: swap for the real Google Business Profile review link
    url: 'https://www.google.com/search?q=ProtectHealth+Las+Vegas+Google+reviews',
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
