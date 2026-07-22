// Service page data, one entry per coverage line. Old Webflow URLs were
// /projects/[slug]; Cloudflare redirects map them to /services/[slug] (see public/_redirects).
export interface Service {
  slug: string;
  image: string;
  name: string;
  headline: string;
  description: string;
  intro: string;
  body: { h2: string; text: string }[];
  faq: { q: string; a: string }[];
}

export const SERVICES: Service[] = [
  {
    slug: 'health-insurance',
    image: 'https://cdn.prod.website-files.com/66c61e498a0b1c025cc02da3/66c7ac0fddbd0ad40b70125c_66c61e498a0b1c025cc02e1c_64dcea930cfc1c9b6dbaffbb_business%20(1).webp',
    name: 'Health Insurance',
    headline: 'Health insurance built around your life, not a sales quota',
    description:
      'ProtectHealth helps Nevadans compare individual and family health insurance plans based on income, tax-credit eligibility, provider networks, prescriptions, and total financial exposure.',
    intro:
      'Health insurance is the coverage people get wrong most often, because most plans are sold on premium and deductible alone. ProtectHealth starts with the person: age, household income, tax-credit eligibility, provider networks, prescriptions, expected usage, and total financial exposure. Then the plan gets chosen, not the other way around.',
    body: [
      {
        h2: 'What does a health insurance strategy include?',
        text: 'A health insurance strategy includes plan type, network fit, subsidy and tax-credit analysis, prescription coverage checks, and a clear picture of worst-case out-of-pocket costs. ProtectHealth walks through each element before recommending any plan.',
      },
      {
        h2: 'Who does ProtectHealth help with health insurance?',
        text: 'ProtectHealth helps individuals, families, Realtors, 1099 contractors, self-employed professionals, and small businesses across Nevada. Self-employed clients may also have access to tax-advantaged health-benefit structures worth exploring, see the ProtectHealth self-employed strategy page.',
      },
    ],
    faq: [
      { q: 'Does ProtectHealth charge for health insurance consultations?', a: 'No. ProtectHealth consultations are free. Brokers are compensated by insurance carriers, and plan prices are the same whether a person enrolls through a broker or directly.' },
      { q: 'Can ProtectHealth help with Nevada marketplace plans?', a: 'Yes. ProtectHealth helps Nevadans compare and enroll in plans through the Silver State Health Insurance Exchange, including tax-credit eligibility review.' },
      { q: 'What information is needed for a health insurance consultation?', a: 'A rough estimate of household income, the names of preferred doctors, a list of current prescriptions, and any current plan documents are enough to start.' },
    ],
  },
  {
    slug: 'life-insurance',
    image: 'https://cdn.prod.website-files.com/66c61e498a0b1c025cc02da3/66d0ff50cb9b30e70b619ce1_photo.png',
    name: 'Life Insurance',
    headline: 'Life insurance that matches your financial goals',
    description:
      'ProtectHealth offers tailored life insurance guidance in Nevada, term, whole, and final expense, aligned with income protection and family financial goals.',
    intro:
      'Life insurance is not one product. Term, whole life, and final expense coverage serve different goals, and the right answer depends on income, debts, dependents, and time horizon. ProtectHealth builds the strategy first, then matches the coverage.',
    body: [
      {
        h2: 'How much life insurance does a person need?',
        text: 'A common starting point is 10 to 12 times annual income, adjusted for mortgage balance, dependents, existing savings, and final expenses. ProtectHealth walks through the actual numbers rather than quoting a generic multiple.',
      },
    ],
    faq: [
      { q: 'What is the difference between term and whole life insurance?', a: 'Term life insurance covers a fixed period, typically 10 to 30 years, at lower premiums. Whole life insurance covers the insured for life and builds cash value at higher premiums. The right fit depends on budget and goals.' },
      { q: 'Can self-employed people deduct life insurance premiums?', a: 'Generally personal life insurance premiums are not tax-deductible. Business-owned policies have different rules. ProtectHealth brokers are insurance professionals, not tax professionals, a licensed tax professional should confirm any deduction question.' },
      { q: 'Does ProtectHealth offer life insurance quotes without a consultation?', a: 'ProtectHealth prefers a short conversation first because age, health, and coverage goals change pricing significantly. A quote without context is a guess.' },
    ],
  },
  {
    slug: 'gap-health-insurance',
    image: 'https://cdn.prod.website-files.com/66c61e498a0b1c025cc02da3/66c7abdf78e83b92eb53fe04_Gap%203.png',
    name: 'GAP Health Insurance',
    headline: 'Cover the costs your main health plan leaves behind',
    description:
      'GAP health insurance helps cover deductibles, co-pays, and out-of-pocket costs left by a primary health plan. ProtectHealth explains when GAP coverage makes sense in Nevada.',
    intro:
      'GAP health insurance pays toward deductibles, co-pays, and other out-of-pocket costs that a primary health plan leaves behind. For households with high-deductible plans, GAP coverage can be a cost-effective way to reduce financial exposure.',
    body: [
      {
        h2: 'When does GAP health insurance make sense?',
        text: 'GAP coverage makes the most sense for households on high-deductible plans that could not comfortably absorb the full deductible in a bad year. The math depends on premium cost versus realistic exposure, a calculation ProtectHealth runs in every GAP consultation.',
      },
    ],
    faq: [
      { q: 'Is GAP health insurance a replacement for major medical coverage?', a: 'No. GAP health insurance supplements a primary health plan. GAP coverage pays toward out-of-pocket costs; it does not replace comprehensive medical coverage.' },
      { q: 'What does GAP health insurance typically cover?', a: 'GAP plans typically pay fixed benefits toward deductibles, co-pays, and coinsurance triggered by hospitalizations, surgeries, or accidents, depending on the specific plan.' },
      { q: 'How much does GAP health insurance cost in Nevada?', a: 'GAP plan pricing varies by age, coverage level, and household size. Because GAP only makes sense when the premium is meaningfully lower than the exposure it covers, ProtectHealth reviews the math case by case.' },
    ],
  },
  {
    slug: 'medicare',
    image: 'https://cdn.prod.website-files.com/66c61e498a0b1c025cc02da3/66c7ad9efc08b6777e87e631_medicare.png',
    name: 'Medicare Solutions',
    headline: 'Medicare without the maze',
    description:
      'ProtectHealth simplifies Medicare in Nevada, Part A, Part B, Medicare Advantage, Part D prescription plans, and Medigap supplements, with tailored enrollment guidance.',
    intro:
      'Medicare has more moving parts than any other coverage type: Part A, Part B, Medicare Advantage (Part C), prescription drug plans (Part D), and Supplement plans (Medigap). ProtectHealth brokers simplify the enrollment process and match coverage to actual doctors, prescriptions, and budgets.',
    body: [
      {
        h2: 'What is the difference between Medicare Advantage and Medigap?',
        text: 'Medicare Advantage replaces Original Medicare with a private plan that often includes drug coverage and extras, usually with network restrictions. Medigap supplements Original Medicare by covering cost-sharing, with broad provider access and separate drug coverage. The right choice depends on doctors, travel habits, prescriptions, and budget.',
      },
    ],
    faq: [
      { q: 'When can a person enroll in Medicare?', a: 'The Initial Enrollment Period spans seven months around a person\'s 65th birthday, three months before the birthday month, the birthday month, and three months after. Annual and special enrollment periods provide additional windows.' },
      { q: 'Does Medicare Advantage cost more than Original Medicare?', a: 'Many Medicare Advantage plans carry low or zero additional premiums beyond Part B, but total cost depends on usage, networks, and out-of-pocket maximums. Premium alone does not determine the better deal.' },
      { q: 'Can ProtectHealth compare Medicare plans from multiple carriers?', a: 'Yes. ProtectHealth is a brokerage, which means brokers compare plans across carriers rather than selling a single company\'s products.' },
    ],
  },
  {
    slug: 'dental-insurance',
    image: 'https://cdn.prod.website-files.com/66c61e498a0b1c025cc02da3/66c7b09eb31be63f3432da85_Dental.png',
    name: 'Dental Insurance',
    headline: 'Dental coverage that keeps you smiling',
    description:
      'ProtectHealth finds dental insurance plans in Nevada matched to individual and family needs, preventive care, major work, and orthodontics.',
    intro:
      'Dental plans differ widely in waiting periods, annual maximums, and coverage for major work. ProtectHealth matches dental coverage to the care a household actually anticipates, from cleanings to crowns to orthodontics.',
    body: [
      {
        h2: 'What should a person check before buying dental insurance?',
        text: 'The four items to check are the annual maximum, waiting periods for major work, coverage percentages by category (preventive, basic, major), and whether preferred dentists are in network. ProtectHealth reviews all four in every dental consultation.',
      },
    ],
    faq: [
      { q: 'Do dental plans cover orthodontics?', a: 'Some dental plans include orthodontic benefits, usually with lifetime maximums and waiting periods. Plans differ significantly, which is why ProtectHealth reviews orthodontic needs before recommending a plan.' },
      { q: 'Is standalone dental insurance worth the cost?', a: 'For households that use preventive care twice a year and occasionally need fillings or major work, dental insurance typically pays for itself. For rare dental users, discount plans may fit better. The answer depends on expected usage.' },
      { q: 'Can dental insurance be added mid-year?', a: 'Yes. Unlike major medical coverage, standalone dental plans can generally be purchased year-round.' },
    ],
  },
  {
    slug: 'vision-insurance',
    image: 'https://cdn.prod.website-files.com/66c61e498a0b1c025cc02da3/66c7b243cd3f082ce0c6f28c_vision.png',
    name: 'Vision Insurance',
    headline: 'See clearly, pay less',
    description:
      'ProtectHealth helps Nevadans find vision insurance plans covering eye exams, glasses, and contacts at affordable rates.',
    intro:
      'Vision insurance keeps routine eye care affordable: exams, glasses, and contacts. ProtectHealth matches vision plans to household needs and pairs them with health and dental coverage where bundling saves money.',
    body: [
      {
        h2: 'What does vision insurance typically cover?',
        text: 'Vision insurance typically covers an annual eye exam, an allowance toward frames or contact lenses, and discounts on lens upgrades. Some plans add discounts on LASIK and other corrective procedures.',
      },
    ],
    faq: [
      { q: 'Is vision insurance included in health insurance?', a: 'Adult vision coverage is generally not included in major medical plans. Children\'s vision is an essential health benefit under ACA-compliant plans, but adults typically need a standalone vision plan.' },
      { q: 'How much does vision insurance cost?', a: 'Individual vision plans in Nevada commonly range from roughly $10 to $25 per month depending on the allowance and network. ProtectHealth compares options across carriers.' },
      { q: 'Can vision insurance be purchased any time of year?', a: 'Yes. Standalone vision plans are available year-round without an enrollment window.' },
    ],
  },
];
