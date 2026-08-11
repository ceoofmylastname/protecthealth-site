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
