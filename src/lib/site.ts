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
