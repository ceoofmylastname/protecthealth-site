// Content blocks for broker landing pages, one per line of insurance. A broker's
// lines_of_insurance (from onboarding) decides which of these render — a
// Medicare-only broker never shows a health-focused block.
//
// Brand rules enforced here: never name a carrier, lead with strategy not
// product, CTA is always "book a conversation" (never "get a quote"), never
// imply universal eligibility, and note we're not tax professionals wherever
// tax or business structure comes up.

export interface LineBlock {
  key: string;        // matches a lines_of_insurance value exactly
  eyebrow: string;
  title: string;
  body: string;
  points: string[];
  cta: string;
}

export const LINE_BLOCKS: Record<string, LineBlock> = {
  'Health': {
    key: 'Health',
    eyebrow: 'Health',
    title: 'Health coverage built around your life',
    body:
      "Self-employed, 1099, a Realtor, or between group plans? The right individual " +
      "coverage starts with your situation, not a product pitch. We map genuine PPO " +
      "access and tax-advantaged options to how you actually work and who you need covered.",
    points: [
      'Genuine PPO networks, not bait-and-switch plans',
      'Options for the self-employed, contractors, and Realtors',
      "Tax-advantaged strategies where you qualify — we're insurance nerds, not tax pros, so we'll bring one in",
    ],
    cta: 'Talk through your health options',
  },
  'Medicare': {
    key: 'Medicare',
    eyebrow: 'Medicare',
    title: 'Medicare without the mailbox avalanche',
    body:
      'Turning 65 or already on Medicare? One clear conversation to compare what actually ' +
      'fits your doctors, your prescriptions, and your budget — no pressure, no jargon, ' +
      'and a licensed local broker instead of a call center.',
    points: [
      'Compare plans against your own doctors and medications',
      'Understand your enrollment windows before they close',
      'A licensed Nevada broker who picks up the phone',
    ],
    cta: 'Get your Medicare questions answered',
  },
  'Life': {
    key: 'Life',
    eyebrow: 'Life',
    title: 'Life insurance that protects the plan',
    body:
      'Term or permanent, the goal is the same: your family keeps its footing if something ' +
      "happens to you. We start with what you're protecting and how long you need to protect " +
      'it, then match the coverage to that — never to a quota.',
    points: [
      'Term and permanent options explained plainly',
      'Coverage sized to your real obligations',
      'Straight answers on what you actually need',
    ],
    cta: 'Talk through life coverage',
  },
  'Annuities': {
    key: 'Annuities',
    eyebrow: 'Annuities',
    title: "Annuities for income you won't outlive",
    body:
      "If guaranteed retirement income is on your mind, we'll walk through whether an annuity " +
      'actually fits your bigger picture before anything else. It has to serve the plan, not ' +
      'become the plan.',
    points: [
      'Guaranteed-income strategies in plain language',
      'Fit-checked against the rest of your retirement plan',
      "We're insurance nerds, not tax professionals — we'll loop one in",
    ],
    cta: 'Explore retirement income options',
  },
  'Group Benefits': {
    key: 'Group Benefits',
    eyebrow: 'Group Benefits',
    title: 'Group benefits your team will actually value',
    body:
      'For business owners weighing employee coverage, we help you compare traditional group ' +
      'options and modern alternatives so the benefit fits your payroll and your people — not ' +
      'a one-size template.',
    points: [
      'Group medical, dental, and vision',
      'Modern alternatives to a traditional group plan',
      'Built around your headcount and budget',
    ],
    cta: 'Talk employer benefits',
  },
  'Supplements': {
    key: 'Supplements',
    eyebrow: 'Supplemental',
    title: 'Supplemental coverage for the gaps',
    body:
      'The coverage that fills in around your main plan, so a hospital stay or an unexpected ' +
      'diagnosis does not turn into a financial hit. It layers on top of what you already have.',
    points: [
      'Hospital, critical illness, and more',
      'Sits on top of your primary coverage',
      'Affordable peace of mind',
    ],
    cta: 'Ask about supplemental plans',
  },
  'Dental': {
    key: 'Dental',
    eyebrow: 'Dental',
    title: "Dental coverage that's worth using",
    body:
      'Standalone dental that covers cleanings, major work, and the things that sneak up on ' +
      "you — sized to what you'll actually use and easy to pair with your health plan.",
    points: [
      'Individual and family options',
      'Preventive and major care covered',
      'Pairs cleanly with your health plan',
    ],
    cta: 'Ask about dental coverage',
  },
  'Vision': {
    key: 'Vision',
    eyebrow: 'Vision',
    title: 'Vision coverage for exams, frames, and lenses',
    body:
      'Simple vision plans that make annual exams and new glasses or contacts affordable for ' +
      'you and your family, and easy to add alongside health or dental.',
    points: [
      'Annual eye exams covered',
      'Allowances for frames, lenses, and contacts',
      'Easy to add to your other coverage',
    ],
    cta: 'Ask about vision coverage',
  },
  'Accident / Gap': {
    key: 'Accident / Gap',
    eyebrow: 'Accident & Gap',
    title: 'Accident & gap coverage for the what-ifs',
    body:
      'Cash benefits that help with the out-of-pocket costs a high-deductible plan leaves ' +
      'behind — from an ER visit to a broken bone — paid directly to you.',
    points: [
      'Helps cover deductibles and out-of-pocket costs',
      'Pays cash benefits straight to you',
      'Pairs with any health plan',
    ],
    cta: 'Ask about accident & gap coverage',
  },
};

// Stable, shared slug for a broker's landing page. Used by getStaticPaths and by
// the Meet the Team link so both point at the same URL.
export const brokerSlug = (name: string): string =>
  String(name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-') || 'broker';

// Shared Higgsfield imagery for every broker landing page (same set for all).
// Hotlinked to the Higgsfield CDN like the rest of the site's art; localizing
// these into /public is the standing image-localization roadmap item.
const HF = 'https://d8j0ntlcm91z4.cloudfront.net/user_3HO1vPQtOhOaysTUBeL4ts348h5';
export const HERO_IMAGE = `${HF}/hf_20260811_163432_1d96896a-d3d9-46f7-866b-0d973bb61349.png`;
export const LINE_IMAGES: Record<string, string> = {
  'Health': `${HF}/hf_20260811_164110_4b217399-b52c-4b32-b6ec-251afa98af0d.png`,
  'Medicare': `${HF}/hf_20260811_163907_8aa4b71d-2434-4298-a9ac-b63f9703dd0f.png`,
  'Life': `${HF}/hf_20260811_164110_09d0a5a8-ad63-484a-9417-1dab93eeadc7.png`,
  'Annuities': `${HF}/hf_20260811_164333_62478d30-80e6-45da-918b-0ee1bf6f60e8.png`,
  'Group Benefits': `${HF}/hf_20260811_163907_538aca83-a6d9-4035-b02b-ea9715693485.png`,
  'Supplements': `${HF}/hf_20260811_164110_80fafd25-1854-4a93-ac48-aac32d49cb8a.png`,
  'Dental': `${HF}/hf_20260811_163907_c3721c59-25a8-48ba-9dc2-7c0f0e075670.png`,
  'Vision': `${HF}/hf_20260811_163907_027eeea0-05ee-4bcb-95e4-f8ba6b8ef621.png`,
  'Accident / Gap': `${HF}/hf_20260811_164110_06aac9ae-f4f2-439c-aa7b-eefbb85c2d64.png`,
};

// US phone display: turn whatever is stored (+17029317099, 7029317099,
// "702.931.7099") into (702) 931-7099. Anything that is not a recognizable
// 10-digit US number is returned trimmed, so international or extension
// formats survive untouched instead of being mangled.
export const fmtPhone = (raw: string | null | undefined): string => {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  const d = s.replace(/\D/g, '');
  const ten = d.length === 11 && d.startsWith('1') ? d.slice(1) : d;
  if (ten.length !== 10) return s;
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
};

// tel: href for the same value. Returns '' (not 'tel:+1') when there is no
// number, so callers can fall back with `telHref(x) || officeHref` instead of
// rendering a dead link.
export const telHref = (raw: string | null | undefined): string => {
  const d = String(raw ?? '').replace(/\D/g, '');
  if (!d) return '';
  const ten = d.length === 11 && d.startsWith('1') ? d.slice(1) : d;
  return 'tel:+1' + (ten.length === 10 ? ten : d);
};
