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
  blog: {
    'nevada-open-enrollment-health-insurance': `${CDN}/66c61e498a0b1c025cc02da3/67111487cb7b1c725902576a_Nevada%20(4).png`,
    'small-business-health-insurance': `${CDN}/66c61e498a0b1c025cc02da3/671111326a6f578ca4a980da_Nevada%20(2).png`,
    'silver-state-health-insurance-exchange': `${CDN}/66c61e498a0b1c025cc02da3/67110e4b1fd87729670db5c6_Nevada%20(1).png`,
  } as Record<string, string>,
};

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

export const TEAM = [
  { slug: 'robert-morgen', name: 'Robert Morgen', role: 'Broker', photo: `${CDN}/66c61e498a0b1c025cc02da3/66ccf1320acdd4645e4ad420_IMG20240826105217_01_2_1_-removebg-preview.png` },
  { slug: 'brian-douglas', name: 'Brian Douglas', role: 'Broker', photo: `${CDN}/66c61e498a0b1c025cc02da3/66ce141a6e73f1177f30b916_Brian3.png` },
  { slug: 'brenda-morgen', name: 'Brenda Morgen', role: 'Broker', photo: `${CDN}/66c61e498a0b1c025cc02da3/66cced54887cb94e34ddd242_2024-05-08-14-55-45-468_2-removebg-preview.png` },
  { slug: 'jason-vasquez', name: 'Jason Vasquez', role: 'Broker', photo: `${CDN}/66c61e498a0b1c025cc02da3/66d126e6d9c01db944de9143_Jason.png` },
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
