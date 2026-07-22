// Long-form service page content. Rendered by src/pages/services/[slug].astro.
// Conventions: H2s are real questions, direct answer in the first 160 characters
// under every H2, no em dashes, Las Vegas / Nevada localization, internal links
// to blog + QA + FAQ + landing pages, third-party links only to non-sellers.

export interface RichService {
  sections: { h2: string; paras: string[] }[];
  chart?: { title: string; note?: string; bars: { label: string; value: number; display: string }[] };
  chartAfter?: number; // section index the chart renders after
  table?: { title: string; head: string[]; rows: string[][] };
  tableAfter?: number; // section index the table renders after
  resources: { label: string; href: string; why: string }[];
  reading: { label: string; href: string }[];
}

export const RICH: Record<string, RichService> = {
  'health-insurance': {
    sections: [
      {
        h2: 'Why does health insurance feel so confusing in Nevada?',
        paras: [
          `Health insurance feels confusing because plans are marketed on two numbers, premium and deductible, while the real cost of a plan lives in five or six numbers most people never see until a bill arrives. Network rules, coinsurance, copay structures, prescription tiers, and the out-of-pocket maximum all decide what a bad year actually costs. A plan that looks cheap in October can be the most expensive thing a family owns by March.`,
          `Las Vegas adds its own wrinkles. The valley's hospital systems and physician groups contract differently with different plans, so the doctor who is in-network in Summerlin may be out-of-network for the same plan design in Henderson. Nevada also runs its own state exchange rather than using the federal one, which changes where you shop and who can help you. ProtectHealth's job is to translate all of it into one clear picture before any plan gets picked.`,
          `If a term on this page is unfamiliar, the <a href="/faq">ProtectHealth FAQ</a> covers the vocabulary, and the guide to <a href="/blog-post/how-to-choose-a-health-insurance-plan-nevada">choosing a health insurance plan in Nevada</a> walks the full decision from start to finish.`,
        ],
      },
      {
        h2: 'What actually determines what you pay for health insurance?',
        paras: [
          `Four numbers determine what a health plan really costs: the monthly premium, the deductible, the coinsurance rate after the deductible, and the annual out-of-pocket maximum. The premium is the only one you pay for certain. The other three only show up when care happens, which is exactly why they get ignored at signup and remembered in the emergency room.`,
          `The out-of-pocket maximum is the single most protective number on the page, because it is the ceiling on what a catastrophic year can cost. Two plans with identical premiums can carry ceilings thousands of dollars apart. ProtectHealth compares plans on total financial exposure, meaning premium times twelve plus the realistic worst case, not on the sticker alone. The quick answer on <a href="/qa/what-is-an-out-of-pocket-maximum">what an out-of-pocket maximum is</a> breaks the math down with examples.`,
          `Prescriptions deserve their own check. Every plan sorts drugs into tiers, and the same medication can be a $10 copay on one plan and a coinsurance percentage of a high list price on another. Bringing a current medication list to a consultation takes two minutes and regularly changes the recommendation.`,
        ],
      },
      {
        h2: 'How do the metal tiers work on Nevada marketplace plans?',
        paras: [
          `Marketplace plans come in four metal tiers, and the metal names describe cost sharing, not quality of care. By design, a Bronze plan covers about 60 percent of the average member's costs, Silver about 70 percent, Gold about 80 percent, and Platinum about 90 percent, with the member responsible for the rest through deductibles and copays.`,
          `Lower metal does not mean worse doctors or worse hospitals. It means you carry more of the bill when care happens in exchange for a lower premium. That trade is right for some households and wrong for others, and income plays a surprising role: at certain income levels, cost-sharing reductions supercharge Silver plans and quietly make them the best value on the shelf. The answer on <a href="/qa/which-metal-tier-is-best-for-families">which metal tier fits families</a> goes deeper on picking a tier.`,
        ],
      },
      {
        h2: 'What is the difference between HMO, PPO, and EPO plans in Las Vegas?',
        paras: [
          `HMO plans use a primary care doctor as the gatekeeper and generally cover only in-network care. PPO plans cover out-of-network care at a higher cost and rarely require referrals. EPO plans sit in the middle, with no referral requirement but no out-of-network coverage either. In the Las Vegas market, all three exist, and genuine PPO access for individuals is rarer than most people assume.`,
          `Network type matters more in Clark County than in most places because care is concentrated in a handful of systems. If keeping a specific cardiologist, OB, or pediatric group matters to your household, that constraint should drive the plan choice, not follow it. The two-minute check described in <a href="/qa/how-do-you-check-if-a-doctor-is-in-network">how to verify a doctor is in-network</a> has saved ProtectHealth clients from expensive surprises more times than any other habit. The full comparison lives at <a href="/qa/what-is-the-difference-between-hmo-and-ppo">HMO versus PPO</a>.`,
        ],
      },
      {
        h2: 'How do subsidies and premium tax credits work in Nevada?',
        paras: [
          `Premium tax credits lower the monthly cost of marketplace coverage based on household income, and they are the single most underused tool in Nevada health insurance. Eligibility is driven by modified adjusted gross income relative to the federal poverty level, and the credit is reconciled on the tax return, so estimating income honestly matters.`,
          `Nevada runs its own exchange, Nevada Health Link, and subsidies only apply to plans purchased through it. Plenty of Nevadans pay full price off-exchange for coverage they could have subsidized. The plain-English walkthrough in <a href="/blog-post/aca-premium-tax-credits-explained">ACA premium tax credits explained</a> covers the mechanics, <a href="/qa/what-income-counts-for-aca-subsidies">what income counts</a> covers the definition that trips people up, and <a href="/qa/who-qualifies-for-health-insurance-subsidies-in-nevada">who qualifies in Nevada</a> covers eligibility.`,
          `For households near the eligibility edges, small income swings change the math in big ways. Commission-heavy earners, Realtors especially, should read <a href="/qa/can-commission-income-qualify-for-health-insurance-subsidies">how commission income interacts with subsidies</a> before assuming they earn too much or too little. ProtectHealth runs the credit estimate as the first step of every marketplace conversation, and it costs nothing to check.`,
        ],
      },
      {
        h2: 'When can Nevadans enroll in health insurance?',
        paras: [
          `Open enrollment for Nevada marketplace plans runs from November 1 to January 15 each year. Outside that window, a qualifying life event such as losing employer coverage, moving, getting married, or having a child opens a 60-day special enrollment period. Miss both and the realistic options narrow sharply until the next fall.`,
          `The dates and deadlines are covered in the guide to <a href="/blog-post/nevada-open-enrollment-health-insurance">Nevada open enrollment</a>, and the specifics of special enrollment live in <a href="/qa/what-is-a-qualifying-life-event">what counts as a qualifying life event</a> and <a href="/qa/can-you-buy-health-insurance-outside-open-enrollment">buying coverage outside open enrollment</a>. If the window is already missed, <a href="/qa/what-happens-if-you-miss-open-enrollment-in-nevada">this answer</a> maps what still works.`,
        ],
      },
      {
        h2: 'What are the options for self-employed Nevadans and 1099 workers?',
        paras: [
          `Self-employed Nevadans have more paths to coverage than employees do, not fewer, but almost nobody explains those paths. Marketplace plans with tax credits, spousal coverage, and structure-dependent tools like reimbursement arrangements each fit different situations, and the right answer depends on how the business is set up.`,
          `This is the exact question the ProtectHealth <a href="/self-employed">self-employed strategy page</a> exists to answer, and it is the heart of the Strategy Over Product approach: the business structure gets examined first, then the coverage follows. The deep dive on <a href="/blog-post/health-insurance-options-self-employed-nevada">self-employed health insurance options in Nevada</a> lays out every door, and <a href="/qa/can-self-employed-nevadans-deduct-health-insurance-premiums">the premium deduction answer</a> covers the tax side at a high level. On anything involving deductions or entity structure, ProtectHealth brokers are insurance nerds, not tax professionals, and a quick conversation with a licensed tax professional is always the recommended companion step.`,
        ],
      },
      {
        h2: 'What does working with a ProtectHealth broker actually look like?',
        paras: [
          `Working with ProtectHealth starts with a 20-minute conversation, not a quote blast. The broker asks about household income, preferred doctors, current prescriptions, and how much financial risk feels tolerable, then compares real plans on total exposure and presents the trade-offs in plain language. The consultation is free, and plan prices are identical whether a person enrolls through a broker or alone, because broker compensation comes from carriers at no markup to the member.`,
          `ProtectHealth is based at 2915 W Charleston Blvd in Las Vegas and serves the whole state, from the valley to Reno. Locals can start with the <a href="/free-quote">consultation request page</a>, call 800-240-8185, or use the <a href="/contact-us">Talk To A Broker</a> form, and the team responds with a scheduled conversation rather than a pressure pitch. Reviews from Las Vegas clients are on the <a href="/">ProtectHealth home page</a>, pulled straight from Google.`,
        ],
      },
      {
        h2: 'How is Nevada Health Link different from HealthCare.gov?',
        paras: [
          `Nevada Health Link is Nevada's own state-run marketplace, and it replaced HealthCare.gov for Nevadans in 2019. Same federal law, same subsidy rules, different storefront. If a Las Vegas household starts an application on the federal site, it gets redirected home, and any subsidy only flows through the state platform.`,
          `The distinction matters for more than trivia. State control means Nevada sets some of its own deadlines and runs its own outreach, and certified brokers like ProtectHealth work directly inside the state system on your behalf at no cost. The history and mechanics are covered in the guide to the <a href="/blog-post/silver-state-health-insurance-exchange">Silver State Health Insurance Exchange</a> and the quick answer <a href="/qa/is-nevada-health-link-the-same-as-healthcare-gov">comparing Nevada Health Link and HealthCare.gov</a>. What Nevada Health Link does not do is compare plans against your specific doctors, prescriptions, and worst-case math. That analysis is the broker's job, and it is the difference between enrolling in a plan and choosing one.`,
        ],
      },
      {
        h2: 'What mistakes do Nevadans make most often when picking a plan?',
        paras: [
          `The most expensive mistake is shopping on premium alone, which is like judging a car payment without asking the price of the car. The second is assuming a doctor is in-network because they were last year, when Las Vegas networks reshuffle annually and the plan that fit in January can orphan a specialist by the next renewal.`,
          `Three more round out the list. Households skip the subsidy check because they assume they earn too much, when eligibility reaches further up the income scale than most people expect. Auto-renewal quietly rolls families into plans whose networks and drug lists changed underneath them. And self-employed people buy individual coverage without ever asking whether their business structure opens better doors, the exact blind spot the <a href="/self-employed">Strategy Over Product conversation</a> was built to close. Every one of these mistakes costs real money, and every one dies in a 20-minute review. That is the entire argument for doing the review.`,
        ],
      },
    ],
    chart: {
      title: 'How much of average medical costs each metal tier is designed to cover',
      note: 'Actuarial value targets set by the Affordable Care Act. The member is responsible for the remainder through deductibles, copays, and coinsurance.',
      bars: [
        { label: 'Bronze', value: 60, display: '60%' },
        { label: 'Silver', value: 70, display: '70%' },
        { label: 'Gold', value: 80, display: '80%' },
        { label: 'Platinum', value: 90, display: '90%' },
      ],
    },
    chartAfter: 2,
    table: {
      title: 'HMO vs PPO vs EPO at a glance',
      head: ['Feature', 'HMO', 'PPO', 'EPO'],
      rows: [
        ['Primary care referral required', 'Yes', 'No', 'Usually no'],
        ['Out-of-network coverage', 'Emergencies only', 'Yes, at higher cost', 'Emergencies only'],
        ['Typical premium level', 'Lowest', 'Highest', 'Middle'],
        ['Best fit', 'Predictable care, budget first', 'Specific doctors, travel, flexibility', 'No-referral freedom at a lower price'],
      ],
    },
    tableAfter: 3,
    resources: [
      { label: 'Nevada Health Link', href: 'https://www.nevadahealthlink.com/', why: `Nevada's official state marketplace, the only place premium tax credits apply.` },
      { label: 'Nevada Division of Insurance', href: 'https://doi.nv.gov/', why: 'The state regulator. License lookups, consumer complaints, and plan rules.' },
      { label: 'HealthCare.gov glossary', href: 'https://www.healthcare.gov/glossary/', why: 'Plain-English definitions for every insurance term on this page.' },
      { label: 'KFF (Kaiser Family Foundation)', href: 'https://www.kff.org/', why: 'Independent health policy research and premium data, no products sold.' },
    ],
    reading: [
      { label: 'How to choose a health insurance plan in Nevada', href: '/blog-post/how-to-choose-a-health-insurance-plan-nevada' },
      { label: 'Nevada open enrollment guide', href: '/blog-post/nevada-open-enrollment-health-insurance' },
      { label: 'ACA premium tax credits explained', href: '/blog-post/aca-premium-tax-credits-explained' },
      { label: 'Silver State Health Insurance Exchange', href: '/blog-post/silver-state-health-insurance-exchange' },
      { label: 'What is an out-of-pocket maximum?', href: '/qa/what-is-an-out-of-pocket-maximum' },
      { label: 'HMO vs PPO: what is the difference?', href: '/qa/what-is-the-difference-between-hmo-and-ppo' },
      { label: 'Which metal tier is best for families?', href: '/qa/which-metal-tier-is-best-for-families' },
      { label: 'When is open enrollment in Nevada?', href: '/qa/when-is-open-enrollment-in-nevada' },
      { label: 'Self-employed? Start with strategy', href: '/self-employed' },
    ],
  },

  'life-insurance': {
    sections: [
      {
        h2: 'What is life insurance actually for?',
        paras: [
          `Life insurance exists to replace an income that a household depends on. Everything else, cash value, investment features, riders, is secondary to that one job. If someone would struggle to pay the mortgage, keep the kids in their schools, or retire on schedule because you died, that gap is the thing being insured.`,
          `Framed that way, most decisions get simpler. A single 26-year-old renter with no dependents needs very little. A 38-year-old with a Summerlin mortgage, two kids, and a spouse working part time needs a lot, for a defined window of years. ProtectHealth starts every life insurance conversation with the gap, not the product, which is the same strategy-first approach behind everything the brokerage does.`,
        ],
      },
      {
        h2: 'How much life insurance does a person actually need?',
        paras: [
          `A useful starting estimate is 10 to 12 times annual income, but the honest answer comes from adding four numbers: outstanding debts, years of income to replace, mortgage balance, and future education costs. That framework is called DIME, and it turns a vague guess into arithmetic a household can check itself.`,
          `Las Vegas numbers make the exercise concrete. With valley home prices where they are, the mortgage line alone often runs $300,000 to $450,000, and income replacement for a decade dwarfs everything else. The step-by-step walkthrough in <a href="/blog-post/how-much-life-insurance-do-i-need">how much life insurance do I need</a> runs full examples, and the quick answer on <a href="/qa/what-is-the-dime-method-for-life-insurance">the DIME method</a> condenses it to five minutes.`,
          `One correction worth making early: the group life policy from an employer is a benefit, not a plan. Coverage of one or two times salary disappears the day the job does, and it is rarely enough. The answer on <a href="/qa/is-employer-life-insurance-enough">whether employer life insurance is enough</a> explains when it falls short.`,
        ],
      },
      {
        h2: 'What is the difference between term and whole life insurance?',
        paras: [
          `Term life insurance covers a fixed window, usually 10 to 30 years, for the lowest premium per dollar of coverage. Whole life covers the insured for life, builds cash value, and costs several times more for the same death benefit. Neither is universally right. Term fits temporary needs like a mortgage and child-raising years. Permanent coverage fits permanent needs like final expenses and certain estate situations.`,
          `The pattern that hurts households is buying a small whole life policy because the premium fit the budget, when the same dollars in term would have covered the actual gap. The full comparison lives in <a href="/blog-post/term-vs-whole-life-insurance">term versus whole life insurance</a>, the conversion path is covered in <a href="/qa/can-term-life-be-converted-to-whole-life">converting term to whole life</a>, and the investment question gets a straight answer in <a href="/qa/is-whole-life-insurance-a-good-investment">is whole life a good investment</a>.`,
        ],
      },
      {
        h2: 'What is laddering, and why do brokers who do math love it?',
        paras: [
          `Laddering means holding several smaller term policies with different end dates instead of one large policy, so coverage steps down as obligations shrink. The mortgage gets smaller, the kids get older, the retirement accounts get bigger, and the insurance need falls accordingly. Paying for a flat $1 million for 30 years insures a need that mostly disappears by year 20.`,
          `A Las Vegas household might ladder a 30-year policy sized to the mortgage, a 20-year policy sized to the child-raising years, and a 10-year policy covering the peak-debt stretch. Total premium usually comes in meaningfully below a single flat policy. The quick answer on <a href="/qa/what-is-laddering-life-insurance">laddering life insurance</a> shows the structure with numbers.`,
        ],
      },
      {
        h2: 'What do self-employed Nevadans and Realtors need to know?',
        paras: [
          `Self-employed people carry a heavier life insurance burden because nobody hands them group coverage. No employer policy, no automatic enrollment, nothing. A Realtor supporting a family on commission income has the same mortgage and the same kids as a salaried neighbor, with none of the default protection.`,
          `Commission volatility also argues for locking coverage during strong years, because premiums are priced on age and health at application, and both only move one direction. Self-employed readers thinking about the bigger benefits picture should see the <a href="/self-employed">ProtectHealth self-employed strategy page</a>, where life insurance is one piece of a structure-first conversation. On premium deductibility questions, personal life insurance is generally not deductible, business-owned policies have different rules, and a licensed tax professional should make that call. ProtectHealth brokers are insurance nerds, not tax professionals.`,
        ],
      },
      {
        h2: 'What happens when a term policy ends?',
        paras: [
          `When a term policy expires, coverage simply stops, and buying new coverage at that age costs dramatically more. That is not a flaw. It is the design, and it is why the term length should be chosen to outlast the obligations it covers, with a small permanent policy layered in if final expenses matter.`,
          `Most term policies can convert to permanent coverage without a new medical exam before a stated deadline, which becomes valuable if health changes mid-term. The mechanics are in <a href="/qa/what-happens-when-a-term-life-policy-expires">what happens when a term policy expires</a>, and conversion timing is in <a href="/qa/can-term-life-be-converted-to-whole-life">this answer</a>. Final expense coverage, the small whole life policy sized to funeral and end-of-life costs, is the third tool, and ProtectHealth quotes it honestly at its actual job size.`,
        ],
      },
      {
        h2: 'How does buying life insurance through ProtectHealth work?',
        paras: [
          `The process is a short conversation, an application, and in many cases no medical exam at all for healthy applicants at moderate coverage amounts. The conversation sizes the gap with the DIME numbers, the broker shops multiple carriers, and the household sees options priced side by side with the trade-offs explained in plain language.`,
          `Pricing is set by carriers and is identical with or without a broker, so the guidance costs nothing. Waiting is the only expensive move, because every birthday raises the price of the same coverage. Las Vegas locals can start at the <a href="/contact-us">Talk To A Broker page</a> or call 800-240-8185, and anyone still in research mode can keep reading through the guides linked below or the <a href="/faq">FAQ</a>.`,
        ],
      },
      {
        h2: 'Does getting life insurance require a medical exam?',
        paras: [
          `Often no. Accelerated underwriting programs approve many healthy applicants using prescription history, medical databases, and a phone interview, with no needles and no clinic visit, sometimes inside 48 hours. Exam-based underwriting still exists and still matters, mostly for larger coverage amounts and for applicants whose health story benefits from documentation.`,
          `The exam question cuts both ways, and a broker who knows both paths will route each applicant to the cheaper one. Very healthy people sometimes get better pricing by taking the exam, because lab-verified numbers beat database assumptions. People managing conditions like controlled blood pressure or past issues often do better through carriers whose underwriting treats their specific history most kindly, and carriers differ on this far more than the public assumes. This is the quiet, unglamorous work that changes premiums by real percentages, and it costs nothing to have done for you.`,
        ],
      },
      {
        h2: 'What riders are actually worth attention?',
        paras: [
          `Three riders earn their keep for most Las Vegas families. An accelerated death benefit rider, which pays part of the benefit early during a terminal diagnosis and is often included free. A waiver of premium rider, which keeps the policy alive if a disability stops the income that pays for it. And a child rider, which covers every child in the house for one small charge and typically converts to adult coverage later without underwriting.`,
          `The riders to be skeptical of are the ones that quietly turn a clean term policy into an expensive bundle: return-of-premium designs that charge heavily for the refund feature, and small accidental-death add-ons that duplicate what the base policy already does. The rule that keeps buyers safe is boring and reliable: every rider must answer a real risk in this specific household, or it comes off the quote. That test takes one minute per rider inside a consultation.`,
        ],
      },
      {
        h2: 'How do payouts actually work for a Nevada family?',
        paras: [
          `A life insurance death benefit pays the named beneficiaries directly, generally free of income tax, and it does not wait for probate. For a Las Vegas family, that means the mortgage servicer, the utility company, and the grocery bill do not have to wait for a court calendar. Claims on in-force policies routinely pay within weeks of the paperwork arriving.`,
          `The mechanics fail at exactly one point: outdated beneficiary designations. Divorces, remarriages, and new children make old forms wrong, and the form controls over the will. The five-minute fix is a beneficiary review at every major life event, primary and contingent both named, and ProtectHealth builds that check into every policy conversation. It is the highest-value five minutes in this entire product category.`,
        ],
      },
      {
        h2: 'When is the right time to buy, and how much does waiting cost?',
        paras: [
          `The right time is when the obligation appears: the mortgage closing, the pregnancy announcement, the business loan with a personal guarantee. Pricing is built on age and health at application, and both ratchet in one direction, so the same coverage bought at 42 simply costs more than it did at 35, every time, for everyone.`,
          `Las Vegas adds a specific version of this story. The valley absorbs thousands of transplants a year who arrive mid-career, buy a house at today's prices, and carry coverage sized to a life they left two states ago. New city, new mortgage, new coverage math. A ten-minute review after any major move catches it, and the review is free. Health changes are the other silent clock: a policy locked while healthy keeps its pricing even if next year's physical brings surprises, which is the strongest argument against waiting for a rainy day in a product built entirely for rainy days.`,
        ],
      },
    ],
    chart: {
      title: 'DIME method example for a Las Vegas household',
      note: 'Illustrative example: $70,000 income, 10 years replaced, $350,000 mortgage, two kids. Real numbers vary by household.',
      bars: [
        { label: 'Debts', value: 40, display: '$40,000' },
        { label: 'Income x 10', value: 700, display: '$700,000' },
        { label: 'Mortgage', value: 350, display: '$350,000' },
        { label: 'Education', value: 100, display: '$100,000' },
      ],
    },
    chartAfter: 1,
    table: {
      title: 'Term vs whole life at a glance',
      head: ['Feature', 'Term life', 'Whole life'],
      rows: [
        ['Coverage length', '10 to 30 years', 'Lifetime'],
        ['Relative cost for the same death benefit', 'Lowest', 'Several times higher'],
        ['Cash value', 'None', 'Builds slowly over time'],
        ['Best job', 'Mortgage years, child-raising years, income replacement', 'Final expenses, permanent needs, some estate planning'],
        ['Common mistake', 'Outliving the need it covered (fine)', 'Buying too small a benefit because premiums are high'],
      ],
    },
    tableAfter: 2,
    resources: [
      { label: 'Nevada Division of Insurance', href: 'https://doi.nv.gov/', why: 'Verify any agent license and read Nevada consumer guides.' },
      { label: 'NAIC Life Insurance Buyer’s Guide', href: 'https://content.naic.org/consumer/life-insurance.htm', why: 'The state regulators’ association guide, written for consumers.' },
      { label: 'Insurance Information Institute', href: 'https://www.iii.org/', why: 'Industry-funded education nonprofit. Explains products, sells nothing.' },
    ],
    reading: [
      { label: 'How much life insurance do I need?', href: '/blog-post/how-much-life-insurance-do-i-need' },
      { label: 'Term vs whole life insurance', href: '/blog-post/term-vs-whole-life-insurance' },
      { label: 'What is the DIME method?', href: '/qa/what-is-the-dime-method-for-life-insurance' },
      { label: 'What is laddering life insurance?', href: '/qa/what-is-laddering-life-insurance' },
      { label: 'Is employer life insurance enough?', href: '/qa/is-employer-life-insurance-enough' },
      { label: 'Is whole life a good investment?', href: '/qa/is-whole-life-insurance-a-good-investment' },
      { label: 'What happens when a term policy expires?', href: '/qa/what-happens-when-a-term-life-policy-expires' },
      { label: 'Self-employed? Start with strategy', href: '/self-employed' },
    ],
  },

  'gap-health-insurance': {
    sections: [
      {
        h2: 'What is GAP health insurance in plain English?',
        paras: [
          `GAP health insurance is a supplemental policy that pays cash toward the deductible, coinsurance, and out-of-pocket costs a primary health plan leaves behind. It does not replace health insurance. It sits behind it, and when a covered event like a hospital stay or outpatient surgery happens, it pays a lump benefit that closes some or all of the hole.`,
          `The product exists because modern health plans shifted costs onto members. A family can be fully insured and still face thousands of dollars of exposure before the plan pays in full. The primer at <a href="/blog-post/what-is-gap-health-insurance">what is GAP health insurance</a> covers the category from zero, and this page goes deeper on fit, structure, and the honest cases where GAP is the wrong buy.`,
        ],
      },
      {
        h2: 'Why do high deductibles create real financial risk?',
        paras: [
          `Because the deductible is due in full before most benefits start, and the majority of American households cannot absorb a surprise expense of several thousand dollars without borrowing. Insurance status and financial protection are not the same thing. A Bronze plan family in North Las Vegas can be insured on paper and one ambulance ride from a payment plan in practice.`,
          `The arithmetic is worth staring at. A plan with a $6,000 deductible and 20 percent coinsurance up to an $9,000 out-of-pocket maximum means a bad hospital week costs $9,000 out of pocket, every dollar of it after premiums were already paid. The quick answer on <a href="/qa/what-is-an-out-of-pocket-maximum">out-of-pocket maximums</a> explains the ceiling, and the chart below shows how the exposure stacks in a typical high-deductible year.`,
        ],
      },
      {
        h2: 'What does a GAP plan actually pay for?',
        paras: [
          `GAP plans pay fixed benefits for defined events, most commonly inpatient hospital admissions, and depending on the design, outpatient surgery, emergency room visits, ambulance transport, and certain diagnostics. The benefit arrives as money applied against what you owe, which is why pairing the GAP benefit amount to the primary plan's deductible is the whole game.`,
          `Design details matter and this is where a broker earns their keep. Benefit amounts, covered events, waiting periods, and pre-existing condition rules differ meaningfully between products. A GAP plan whose benefit matches your deductible turns a $6,000 hospital surprise into something close to zero. One bought blind can pay far less than expected for the event that actually happens. The comparison in <a href="/qa/is-hospital-indemnity-the-same-as-gap-insurance">GAP versus hospital indemnity</a> untangles the closely related product names.`,
        ],
      },
      {
        h2: 'Who is GAP coverage a good fit for in Las Vegas?',
        paras: [
          `GAP fits people who chose a high-deductible plan for the premium savings but could not comfortably write a check for the full deductible tomorrow. In Las Vegas that describes a lot of households: tipped and hourly workers in hospitality, self-employed contractors, Realtors on commission cycles, and young families running Bronze plans to keep monthly costs down.`,
          `The strategy-first framing is simple. Premium savings from a high-deductible plan are real money, and a GAP policy costs a fraction of those savings while removing most of the downside. For a self-employed household already thinking about structure, this pairing decision belongs inside the bigger conversation on the <a href="/self-employed">self-employed strategy page</a>. The direct answer on <a href="/qa/is-gap-health-insurance-worth-it">whether GAP insurance is worth it</a> runs the numbers both ways.`,
        ],
      },
      {
        h2: 'When is GAP insurance the wrong buy?',
        paras: [
          `GAP is the wrong buy when the household already holds liquid savings covering the full out-of-pocket maximum, when the primary plan's deductible is already low, or when the budget dollars would do more good buying a stronger primary plan in the first place. A supplemental policy should never be a bandage on a primary plan that was wrong from the start.`,
          `ProtectHealth says this out loud because the win condition is a correct fit, not a policy count. Roughly a third of GAP conversations end with the advice to skip it. That honesty is cheap for us and valuable for you, and it is the same reason campaign pages across this site push a conversation rather than a quote. Whether GAP can sit behind your specific plan is answered in <a href="/qa/can-gap-insurance-pair-with-any-health-plan">can GAP pair with any health plan</a>.`,
        ],
      },
      {
        h2: 'How does GAP interact with the plan you pick in open enrollment?',
        paras: [
          `The GAP decision should be made at the same table as the primary plan decision, because the two prices move against each other. Dropping from Gold to Bronze saves premium and raises exposure. Adding GAP spends a little of that savings to buy the exposure back down. Evaluated together, the Bronze-plus-GAP structure sometimes beats Gold alone on both monthly cost and worst case.`,
          `That evaluation only works during enrollment season or a qualifying event, when the primary plan can still change. Nevada's window runs November 1 to January 15, detailed in the <a href="/blog-post/nevada-open-enrollment-health-insurance">open enrollment guide</a>, and mid-year changes hinge on <a href="/qa/what-is-a-qualifying-life-event">qualifying life events</a>. Bring both questions to the same 20-minute conversation and the answer comes out cleaner than solving them one at a time.`,
        ],
      },
      {
        h2: 'How does ProtectHealth structure a GAP recommendation?',
        paras: [
          `The broker starts from the primary plan's numbers: deductible, coinsurance, and out-of-pocket maximum. Then the household's cash cushion gets an honest look. The difference between the two is the exposure worth insuring, and the GAP benefit gets sized to that number, not to a product brochure.`,
          `The whole review takes minutes when the plan documents are handy, and it is free. Las Vegas locals can bring a current plan card to the <a href="/contact-us">Talk To A Broker</a> conversation or start at the <a href="/free-quote">consultation page</a>, and the <a href="/faq">FAQ</a> answers the common process questions. If the honest answer is that your savings account already does this job, that is exactly what you will hear.`,
        ],
      },
      {
        h2: 'How is GAP different from accident and critical illness plans?',
        paras: [
          `They are cousins in the same supplemental family, and the difference is the trigger. GAP and hospital indemnity plans key off medical events like admissions and surgeries. Accident plans pay fixed amounts for injuries, broken bones, ER visits after a fall or a crash. Critical illness plans pay a lump sum on diagnosis of listed conditions like heart attack, stroke, or cancer.`,
          `The right pick follows the household's actual risk picture. A roofer or a family of dirt-bike kids gets more from an accident plan than an office worker does. A family history of cardiac disease argues for critical illness. A high-deductible plan with thin savings argues for GAP first, because hospital events are the most common way the deductible gets hit. Some households layer two of these deliberately, and the layering only makes sense when each policy answers a named risk rather than a salesperson's quota. That is the test ProtectHealth applies out loud.`,
        ],
      },
      {
        h2: 'What questions should you ask before buying any GAP policy?',
        paras: [
          `Six questions strip the category to the truth. What events trigger a benefit? How much does each event pay? Is there a waiting period before coverage starts? How are pre-existing conditions treated? Does the benefit coordinate with the primary plan or pay independently? And what does the policy cost per year against the exposure it removes?`,
          `Any product that survives all six with clear answers is worth considering. Any pitch that dodges them is telling you something more useful than the brochure. Bring the six questions to any seller, including ProtectHealth, and expect direct answers. The broader vocabulary behind them, deductibles, coinsurance, out-of-pocket ceilings, lives in the <a href="/faq">FAQ</a> and the <a href="/qa/what-is-an-out-of-pocket-maximum">out-of-pocket maximum answer</a>, and five minutes with those pages turns anyone into a much harder person to oversell.`,
        ],
      },
      {
        h2: 'What does a real Las Vegas example look like end to end?',
        paras: [
          `Take a Henderson bartender and her husband, a self-employed handyman, both healthy, carrying a Bronze plan with a $6,500 deductible because the premium fit the budget. Their honest cash cushion is about $2,000. The gap between what they could absorb and what one hospital admission would cost them is measured in thousands, and that gap is not hypothetical. It is one kidney stone, one appendix, one bad night on the 95.`,
          `A GAP policy sized to their deductible costs them a fraction of what upgrading to a Gold plan would, and the night the admission actually happens, the benefit check covers most of what the hospital bills them. Same family, same Bronze premium, radically different financial outcome. That is the whole product in one story. It is also why the recommendation changes for their neighbor with $15,000 in savings: same plan, same deductible, no GAP needed, because the cushion already exists. The product follows the household, never the other way around.`,
        ],
      },
      {
        h2: 'Does GAP coverage make sense for families with kids?',
        paras: [
          `Families hit deductibles more often than singles for the least surprising reason in medicine: kids break arms, spike fevers at 2 a.m., and find the emergency room with a reliability adults never match. A family deductible on a high-deductible plan is a number the household should genuinely expect to meet in some years, not a theoretical ceiling.`,
          `That frequency changes the math in GAP's favor for young families on Bronze and Silver plans, and it changes the design too, because the policy needs to cover every family member, not just the adults. It also sharpens the alternative: some families do better spending the same dollars on a lower-deductible primary plan instead, especially when subsidy dollars stretch further at Silver. The only way to know which family you are is to run both structures side by side, which is a ten-minute exercise inside the same free conversation, and the <a href="/qa/which-metal-tier-is-best-for-families">family metal tier answer</a> is good preparation for it.`,
        ],
      },
    ],
    chart: {
      title: 'Where the money goes in a bad year on a high-deductible plan',
      note: 'Illustrative example: $6,000 deductible plan with 20% coinsurance and a $9,000 out-of-pocket maximum, one inpatient hospital stay.',
      bars: [
        { label: 'Deductible', value: 6000, display: '$6,000' },
        { label: 'Coinsurance', value: 3000, display: '$3,000' },
        { label: 'Total exposure', value: 9000, display: '$9,000' },
      ],
    },
    chartAfter: 1,
    table: {
      title: 'What GAP plans typically cover vs what they do not',
      head: ['Typically covered events', 'Typically not covered'],
      rows: [
        ['Inpatient hospital admission', 'Routine doctor visits and preventive care'],
        ['Outpatient surgery', 'Prescription costs'],
        ['Emergency room and ambulance (design dependent)', 'Events during a waiting period'],
        ['Certain diagnostics like MRI or CT (design dependent)', 'Some pre-existing conditions, per policy terms'],
      ],
    },
    tableAfter: 2,
    resources: [
      { label: 'Nevada Division of Insurance', href: 'https://doi.nv.gov/', why: 'The state regulator for supplemental products sold in Nevada.' },
      { label: 'HealthCare.gov glossary', href: 'https://www.healthcare.gov/glossary/', why: 'Definitions for deductible, coinsurance, and out-of-pocket maximum.' },
      { label: 'KFF (Kaiser Family Foundation)', href: 'https://www.kff.org/', why: 'Independent research on deductible trends and household exposure.' },
    ],
    reading: [
      { label: 'What is GAP health insurance?', href: '/blog-post/what-is-gap-health-insurance' },
      { label: 'Is GAP health insurance worth it?', href: '/qa/is-gap-health-insurance-worth-it' },
      { label: 'GAP vs hospital indemnity', href: '/qa/is-hospital-indemnity-the-same-as-gap-insurance' },
      { label: 'Can GAP pair with any health plan?', href: '/qa/can-gap-insurance-pair-with-any-health-plan' },
      { label: 'What is an out-of-pocket maximum?', href: '/qa/what-is-an-out-of-pocket-maximum' },
      { label: 'Nevada open enrollment guide', href: '/blog-post/nevada-open-enrollment-health-insurance' },
      { label: 'Self-employed? Start with strategy', href: '/self-employed' },
    ],
  },

  'medicare': {
    sections: [
      {
        h2: 'What does turning 65 in Nevada actually set in motion?',
        paras: [
          `Turning 65 opens a seven-month Initial Enrollment Period: the three months before the birthday month, the birthday month, and the three months after. Inside that window, Medicare decisions are penalty-free and health questions mostly cannot be used against you. Outside it, late enrollment penalties and medical underwriting start changing the math, some of it permanently.`,
          `That is why the calendar, not the mailbox full of ads, should drive the process. Las Vegas seniors get buried in Medicare marketing every fall, and almost none of it explains the sequencing that actually matters. The step-by-step <a href="/blog-post/turning-65-in-nevada-medicare-checklist">turning 65 in Nevada checklist</a> lays out the whole timeline, and the first honest question, covered in <a href="/qa/is-medicare-free-at-65">is Medicare free at 65</a>, clears up the most common surprise: Part A is usually premium-free, and the rest is not.`,
        ],
      },
      {
        h2: 'What do the four parts of Medicare cover?',
        paras: [
          `Part A covers hospital stays, Part B covers doctors and outpatient care, Part D covers prescriptions, and Part C, called Medicare Advantage, bundles A and B and usually D into a private plan. Original Medicare means A plus B, typically with a standalone D plan and often a Medigap supplement filling the cost-sharing holes.`,
          `The table below keeps the parts straight. The structural decision that shapes everything after it is Original Medicare with Medigap on one path, or Medicare Advantage on the other. They are different philosophies: broad provider freedom with predictable costs on one side, lower monthly cost with network rules and plan-managed care on the other. The full local comparison lives in <a href="/blog-post/medicare-advantage-vs-medigap-nevada">Medicare Advantage versus Medigap in Nevada</a>.`,
        ],
      },
      {
        h2: 'Why do so many Las Vegas Medicare Advantage plans cost zero dollars?',
        paras: [
          `A $0 premium means the private insurer is paid by Medicare itself to manage your care, not that the coverage is free. Clark County is one of the most competitive Medicare Advantage markets in the country, which is why the zero-premium ads blanket the valley every October.`,
          `Zero-premium plans can be a genuinely good fit, and they can also carry copays, prior authorizations, and network limits that surprise people mid-treatment. The mechanics of how $0 works are explained straight in <a href="/qa/why-are-medicare-advantage-premiums-zero-dollars">why Medicare Advantage premiums are zero dollars</a>. The honest evaluation compares the whole year of expected use, not the monthly sticker, which is exactly the total-exposure math ProtectHealth runs on every plan type.`,
        ],
      },
      {
        h2: 'What happens if Medicare enrollment is late?',
        paras: [
          `The Part B late enrollment penalty adds 10 percent to the premium for every full year enrollment was delayed without qualifying coverage, and the penalty lasts for life. Three years late means paying 30 percent extra every month, forever. Part D carries its own smaller but also permanent penalty.`,
          `The chart below shows how the Part B penalty compounds. The important exception: people still covered by an employer plan at 65 can often delay without penalty, but the rules are specific and the burden of proof is on you. That situation is mapped in <a href="/qa/can-you-delay-medicare-if-still-working">delaying Medicare while working</a>, and the penalty arithmetic is in <a href="/qa/what-is-the-medicare-part-b-penalty">what is the Part B penalty</a>.`,
        ],
      },
      {
        h2: 'What is Medigap open enrollment, and why is it a one-time door?',
        paras: [
          `Medigap open enrollment is the six-month window starting when Part B begins, during which supplement plans must accept you regardless of health history. After it closes, carriers in most situations can underwrite, meaning health conditions can raise prices or block approval entirely.`,
          `This is the single most consequential deadline in the whole Medicare sequence, because it is the one that cannot be reopened next fall. Choosing Advantage now and hoping to switch to Medigap later is a plan that depends on passing underwriting later. The details are in <a href="/qa/what-is-medigap-open-enrollment">what is Medigap open enrollment</a>, and it is the reason ProtectHealth pushes the Advantage-versus-Medigap decision to the front of the conversation rather than the end.`,
        ],
      },
      {
        h2: 'How does Medicare fit a self-employed Nevadan or working senior?',
        paras: [
          `Plenty of Las Vegas 65-year-olds are still working, still running businesses, or still covering a younger spouse, and each of those changes the sequencing. Employer coverage can justify delaying Part B. A marketplace plan usually cannot, and keeping subsidized exchange coverage past Medicare eligibility creates repayment problems.`,
          `Self-employed seniors juggling a business, a health plan, and Medicare timing are exactly who the <a href="/self-employed">strategy-first conversation</a> was built for, and employers with Medicare-age staff can find the workplace side covered on the <a href="/employers">employers page</a>. One structural crossover worth knowing exists between reimbursement arrangements and Medicare premiums, answered in <a href="/qa/can-an-ichra-reimburse-medicare-premiums">can an ICHRA reimburse Medicare premiums</a>. On any tax angle, the standing rule applies: ProtectHealth brokers are insurance nerds, not tax professionals.`,
        ],
      },
      {
        h2: 'How does ProtectHealth help with Medicare in Las Vegas?',
        paras: [
          `ProtectHealth walks Nevadans through the sequence in order: enrollment windows first, the Advantage-or-Medigap fork second, then specific plan selection against your actual doctors, prescriptions, and budget. Consultations are free, and Medicare plan pricing is set by carriers and CMS, identical with or without a broker.`,
          `The team is local, at 2915 W Charleston Blvd, and does this across the valley's networks every enrollment season. Independent help exists too, and good brokers say so: Nevada's State Health Insurance Assistance Program offers free unbiased counseling, linked below alongside the federal tools. To start the conversation, use <a href="/contact-us">Talk To A Broker</a>, call 800-240-8185, or begin with the reading list at the bottom of this page and the <a href="/faq">FAQ</a>.`,
        ],
      },
      {
        h2: 'How do prescriptions actually work under Part D?',
        paras: [
          `Every Part D and Medicare Advantage drug plan runs on a formulary, a tiered list deciding what each medication costs, and the same drug can sit on a cheap tier in one plan and an expensive tier in another. That is why the correct first step in any Medicare plan comparison is not the premium. It is typing in the actual medication list.`,
          `Formularies also change every January, which is how a plan that fit perfectly two years ago quietly becomes the wrong plan without the member changing anything. The annual notice of change that arrives each fall is genuinely worth reading, and the fall enrollment window from October 15 to December 7 exists precisely so members can react to it. ProtectHealth runs the drug-list check as a standing part of every Medicare review, because a $0 premium plan with the wrong formulary is not a $0 plan.`,
        ],
      },
      {
        h2: 'What Medicare mistakes cost Las Vegas seniors the most?',
        paras: [
          `Three mistakes do most of the damage. Missing the Part B window while uncovered, which buys a permanent penalty. Treating the Medigap open enrollment window as reopenable, when it is the one door that health history can lock forever. And picking a plan from a TV commercial or a friend's recommendation without checking its network against your own doctors and its formulary against your own prescriptions.`,
          `A fourth deserves its own sentence: assuming all help is equal. Some Medicare help lines are sales floors for a single carrier's products. Independent brokers compare across carriers, and Nevada SHIP counselors sell nothing at all. Ask anyone offering Medicare help one question, how do you get paid, and route accordingly. ProtectHealth answers it plainly: carrier commissions at identical consumer pricing, across multiple carriers, with the <a href="/blog-post/turning-65-in-nevada-medicare-checklist">checklist</a> and <a href="/blog-post/medicare-advantage-vs-medigap-nevada">comparison guide</a> published free either way.`,
        ],
      },
      {
        h2: 'How do dental, vision, and hearing fit into Medicare?',
        paras: [
          `Original Medicare covers essentially none of the big three: routine dental, routine vision, and hearing aids all sit outside Parts A and B. That surprise arrives at exactly the age when teeth, eyes, and ears start sending bills, and it drives more supplemental shopping than any other Medicare gap.`,
          `Medicare Advantage plans market embedded dental and vision extras heavily, and those extras are real but bounded, with their own annual maximums and networks that deserve the same scrutiny as the medical side. Seniors on Original Medicare with Medigap typically add standalone coverage instead, and the same evaluation frameworks from the ProtectHealth <a href="/services/dental-insurance">dental page</a> and <a href="/services/vision-insurance">vision page</a> apply unchanged at 68 as at 38. The honest comparison is never extras versus no extras. It is the whole year of costs under each structure, side by side, including the crown and the progressive lenses.`,
        ],
      },
      {
        h2: 'What does a smart first year on Medicare look like?',
        paras: [
          `The smart first year runs on a short calendar. Three months before the 65th birthday, confirm the enrollment path with Social Security and decide the Advantage-or-Medigap fork with real plan comparisons in hand. During the birthday window, enroll, and if the choice is Original Medicare, use the six-month Medigap door while it is guaranteed open. That fall, read the annual notice of change even though the plan is brand new, because the first renewal sets the habit that protects every year after.`,
          `From there the maintenance load is genuinely light: one plan review each fall against the current doctor list and medication list, which takes less than an hour and catches formulary drift before it costs anything. Las Vegas seniors who run that one-hour ritual with a broker or a SHIP counselor essentially never end up in the horror stories that fill the valley's fall news cycle. The <a href="/blog-post/turning-65-in-nevada-medicare-checklist">turning 65 checklist</a> turns this whole section into a printable sequence.`,
        ],
      },
    ],
    chart: {
      title: 'Medicare Part B late enrollment penalty by years delayed',
      note: 'Set by federal rule: 10% added to the Part B premium per full year without qualifying coverage, for life.',
      bars: [
        { label: '1 year late', value: 10, display: '+10% for life' },
        { label: '2 years late', value: 20, display: '+20% for life' },
        { label: '3 years late', value: 30, display: '+30% for life' },
        { label: '4 years late', value: 40, display: '+40% for life' },
      ],
    },
    chartAfter: 3,
    table: {
      title: 'The four parts of Medicare',
      head: ['Part', 'What it covers', 'Worth knowing'],
      rows: [
        ['Part A', 'Hospital stays, skilled nursing, hospice', 'Premium-free for most people with 10 years of work history'],
        ['Part B', 'Doctor visits, outpatient care, preventive services', 'Monthly premium set annually by CMS, late penalty is permanent'],
        ['Part C (Medicare Advantage)', 'Bundles A and B, usually D, often dental and vision extras', 'Private plan with networks and prior authorization rules'],
        ['Part D', 'Prescription drugs', 'Formularies differ by plan, check your medication list first'],
      ],
    },
    tableAfter: 1,
    resources: [
      { label: 'Medicare.gov', href: 'https://www.medicare.gov/', why: 'The official plan finder and the source of record on coverage rules.' },
      { label: 'Social Security Administration', href: 'https://www.ssa.gov/medicare/', why: 'Where Medicare enrollment actually happens.' },
      { label: 'Nevada SHIP (free counseling)', href: 'https://adsd.nv.gov/Programs/Seniors/SHIP/SHIP_Prog/', why: `Nevada's State Health Insurance Assistance Program. Free, unbiased, sells nothing.` },
      { label: 'KFF Medicare research', href: 'https://www.kff.org/medicare/', why: 'Independent data on Advantage, Medigap, and drug coverage trends.' },
    ],
    reading: [
      { label: 'Turning 65 in Nevada: the Medicare checklist', href: '/blog-post/turning-65-in-nevada-medicare-checklist' },
      { label: 'Medicare Advantage vs Medigap in Nevada', href: '/blog-post/medicare-advantage-vs-medigap-nevada' },
      { label: 'Is Medicare free at 65?', href: '/qa/is-medicare-free-at-65' },
      { label: 'Why are some Advantage premiums $0?', href: '/qa/why-are-medicare-advantage-premiums-zero-dollars' },
      { label: 'What is the Part B penalty?', href: '/qa/what-is-the-medicare-part-b-penalty' },
      { label: 'Can you delay Medicare if still working?', href: '/qa/can-you-delay-medicare-if-still-working' },
      { label: 'What is Medigap open enrollment?', href: '/qa/what-is-medigap-open-enrollment' },
    ],
  },

  'dental-insurance': {
    sections: [
      {
        h2: 'How does dental insurance actually work?',
        paras: [
          `Dental insurance runs on a structure most plans share: preventive care covered at or near 100 percent, basic procedures like fillings around 80 percent, and major work like crowns around 50 percent, all capped by an annual maximum the plan will pay. The industry shorthand is 100-80-50, and understanding it explains almost every dental bill that ever surprised anyone.`,
          `The annual maximum is the part people miss. Most plans stop paying entirely once they have spent $1,000 to $2,000 in a year, and every dollar past the cap is yours. That flips the usual insurance logic on its head: dental insurance is excellent at covering the small predictable stuff and weakest at the catastrophic year. The mechanics are broken down in <a href="/qa/what-does-dental-insurance-actually-cover">what dental insurance actually covers</a> and <a href="/qa/what-is-a-dental-annual-maximum">what an annual maximum is</a>.`,
        ],
      },
      {
        h2: 'Is dental insurance worth it in Las Vegas?',
        paras: [
          `For most households the honest answer depends on one comparison: annual premium versus the cash price of two cleanings, exams, and X-rays at a Las Vegas dentist. When the premium lands near that number, the insurance is effectively prepaying care you should get anyway, with the 80 percent and 50 percent tiers riding along as real protection against the year a crown shows up.`,
          `The full analysis, including when the answer is no, lives in <a href="/blog-post/is-dental-insurance-worth-it">is dental insurance worth it</a>. The short version: skipping the dentist to save money is the one strategy that reliably backfires, because a $150 filling ignored long enough becomes a $1,500 crown or a root canal. Prevention is the highest-yield purchase in all of dental care, which is exactly what the 100 percent tier is designed to make free.`,
        ],
      },
      {
        h2: 'What is the difference between dental insurance and discount plans?',
        paras: [
          `A dental discount plan is not insurance. It is a membership that buys reduced rates at participating dentists, with no claims, no annual maximum, and no waiting periods. Real insurance pays a share of the bill. A discount plan lowers the bill you still pay yourself.`,
          `Both are legitimate tools with different jobs, and Las Vegas has plenty of both. Discount plans shine for people who missed enrollment windows, need major work immediately, or cannot get traditional coverage. Insurance wins for households that use preventive care on schedule. The straight comparison is in <a href="/blog-post/dental-insurance-vs-discount-plans">dental insurance versus discount plans</a>, the legitimacy question is answered in <a href="/qa/are-dental-discount-plans-legit">are discount plans legit</a>, and the combination play is covered in <a href="/qa/can-you-have-dental-insurance-and-a-discount-plan">can you hold both at once</a>.`,
        ],
      },
      {
        h2: 'What do waiting periods mean for new dental coverage?',
        paras: [
          `Most dental plans impose waiting periods before they pay for anything beyond preventive care, commonly six months for basic work and twelve months for major work. The design exists to stop people from buying coverage on the way to the oral surgeon and dropping it after.`,
          `The practical lesson is to buy dental coverage before the toothache, not after. Someone who already knows a crown is coming should compare the waiting period math against discount plans and cash negotiation, because paying premiums for a plan that will not cover this year's procedure helps nobody. This is a two-minute conversation with a ProtectHealth broker and it regularly changes the answer.`,
        ],
      },
      {
        h2: 'Who needs standalone dental coverage in Nevada?',
        paras: [
          `Anyone without employer benefits: Realtors, 1099 contractors, self-employed professionals, early retirees, and every Las Vegas worker whose job comes without a benefits packet. Marketplace health plans in Nevada generally do not include adult dental, so the coverage has to be added deliberately or it simply does not exist.`,
          `Children are the exception worth knowing: pediatric dental is an essential health benefit, so kids are often covered through the health plan while the parents are not. Self-employed households building a full benefits picture from scratch should fold dental into the bigger structure-first conversation on the <a href="/self-employed">self-employed strategy page</a>, because buying each coverage line separately is how people end up overpaying for a patchwork.`,
        ],
      },
      {
        h2: 'How does ProtectHealth handle dental recommendations?',
        paras: [
          `The broker asks about the household's actual dental habits, any work a dentist has already flagged, and whether specific Las Vegas dentists matter, then compares plans on network, waiting periods, and the annual maximum rather than premium alone. The consultation is free and takes minutes.`,
          `Dental rarely travels alone. It usually gets bundled into the same conversation as health and vision coverage, where a broker can see the whole picture at once. Start at <a href="/contact-us">Talk To A Broker</a>, call 800-240-8185, or browse the <a href="/faq">FAQ</a> and the reading list below if you are still in research mode.`,
        ],
      },
      {
        h2: 'What does dental work cost without any coverage?',
        paras: [
          `Cash prices in the Las Vegas market follow the same steep curve as everywhere: cleanings and exams run low hundreds, fillings a few hundred, and the big four, crowns, root canals, implants, and orthodontics, run from four figures per tooth into five figures per mouth. The curve is the argument. Prevention is cheap, restoration is not, and the gap between them is where every dental financial disaster lives.`,
          `Cash payers have more leverage than they think. Many valley dentists discount for same-day cash payment, publish membership pricing of their own, and will sequence a treatment plan across calendar years to work with insurance maximums. A household without coverage should still never skip the preventive visits, because the $200 cleaning is the only reliably good deal in dentistry. The comparison math against premiums is in <a href="/blog-post/is-dental-insurance-worth-it">is dental insurance worth it</a>.`,
        ],
      },
      {
        h2: 'How should you pick a dental network in Las Vegas?',
        paras: [
          `Start from the chair, not the brochure. If the household already has a dentist it trusts, the first question for any plan is whether that office is in-network, because out-of-network dental benefits shrink fast. If there is no current dentist, network size across the valley matters more, especially for families in Henderson, North Las Vegas, or the far west side where office density thins out.`,
          `PPO-style dental plans dominate the individual market and allow any dentist with better pricing in-network. DHMO-style plans cost less and lock care to a specific office. Neither is wrong, but the trade should be chosen consciously. One local wrinkle worth knowing: Las Vegas has a high concentration of corporate dental chains, and treatment philosophy varies between offices far more than plan documents do. A second opinion on any four-figure treatment plan is normal, wise, and completely within your rights under every plan design.`,
        ],
      },
      {
        h2: 'How does dental coverage work for kids in Nevada?',
        paras: [
          `Pediatric dental is an essential health benefit under the ACA, which means children's dental coverage is built into or offered alongside every marketplace health plan in Nevada. Parents buying through Nevada Health Link should confirm whether the health plan embeds it or requires a small standalone child dental plan, because both structures exist.`,
          `The practical result is good news: in most Nevada households, the kids are the cheapest people to cover for dental, and the adults are the ones going bare. Sealants and fluoride treatments for children are covered as prevention on most designs and are two of the highest-value procedures in all of dentistry. Families sorting out the full stack, health plan, kids' dental, adult dental, adult vision, get it solved fastest in one conversation, which is what the <a href="/contact-us">Talk To A Broker</a> call is for.`,
        ],
      },
      {
        h2: 'Does dental insurance cover orthodontics or cosmetic work?',
        paras: [
          `Mostly no, and knowing that up front prevents the two most common dental coverage disappointments. Cosmetic procedures, whitening, veneers, and elective smile work sit outside nearly every plan. Orthodontics is usually excluded on individual adult plans, sometimes included for children with a lifetime maximum, and always worth reading in the actual policy language rather than the marketing page.`,
          `Households expecting braces have real options anyway: plans with pediatric ortho benefits, payment plans direct from valley orthodontists, and health savings account dollars where eligible. The move that fails is buying a random dental plan assuming braces are in it. The move that works is naming the goal in the first conversation so the broker filters for it from the start. Where a procedure has both a medical and cosmetic version, like some crowns and implants after an injury, the health plan sometimes shares the load, which is exactly the kind of coordination question worth asking out loud before treatment.`,
        ],
      },
      {
        h2: 'What is the smartest way to use a dental plan once you have it?',
        paras: [
          `Use the free tier relentlessly and schedule the expensive tiers deliberately. The preventive visits cost nothing and reset the whole risk curve, so they go on the calendar first. Big treatment plans should be sequenced against the annual maximum: a crown in December and a second crown in January draws on two years of maximums instead of blowing through one.`,
          `Ask the dental office to submit a pre-treatment estimate for any major work, which turns the plan's coverage from a guess into a written number before the drill touches anything. And keep the plan through gaps in employment rather than dropping it casually, because re-entering later means new waiting periods on the exact procedures most likely to be pending. Ten minutes of calendar strategy per year captures most of the value in this entire product, and it is the kind of thing a broker walks through once and a household runs forever.`,
        ],
      },
      {
        h2: 'Why does oral health matter beyond the teeth?',
        paras: [
          `Because the mouth is connected to everything behind it. Gum disease is linked in research to cardiovascular problems and complicates blood sugar control in diabetics, and dentists are often the first clinicians to spot signs of acid reflux, nutritional problems, and oral cancers. The CDC's oral health division, linked below, publishes the evidence in plain language.`,
          `That is the real case for the preventive tier being free on nearly every plan: the cleanings are cheap, and what they catch early is not. For the tens of thousands of Las Vegas hospitality workers whose smile is literally part of the job, and for everyone else whose health simply rides on it, the twice-a-year habit is one of the few pieces of health advice with no downside, no controversy, and no better time than the next open calendar slot.`,
        ],
      },
    ],
    chart: {
      title: 'The 100-80-50 structure most dental plans follow',
      note: 'Typical plan design. Preventive, basic, and major categories vary by plan, always confirm the specific policy.',
      bars: [
        { label: 'Preventive (cleanings, exams, X-rays)', value: 100, display: '100% covered' },
        { label: 'Basic (fillings, simple extractions)', value: 80, display: '~80% covered' },
        { label: 'Major (crowns, bridges, dentures)', value: 50, display: '~50% covered' },
      ],
    },
    chartAfter: 0,
    table: {
      title: 'Dental insurance vs discount plan',
      head: ['Feature', 'Dental insurance', 'Discount plan'],
      rows: [
        ['What it is', 'Insurance that pays a share of covered care', 'Membership pricing at participating dentists'],
        ['Annual maximum', 'Yes, typically $1,000 to $2,000', 'None'],
        ['Waiting periods', 'Common for basic and major work', 'None'],
        ['Best fit', 'Households using preventive care on schedule', 'Immediate major work, missed windows, cash payers'],
      ],
    },
    tableAfter: 2,
    resources: [
      { label: 'CDC Oral Health', href: 'https://www.cdc.gov/oral-health/', why: 'Federal prevention data and guidance, no products involved.' },
      { label: 'MouthHealthy by the ADA', href: 'https://www.mouthhealthy.org/', why: `The American Dental Association's consumer site on procedures and costs.` },
      { label: 'Nevada Division of Insurance', href: 'https://doi.nv.gov/', why: 'Verify any dental plan or discount program sold in Nevada.' },
    ],
    reading: [
      { label: 'Is dental insurance worth it?', href: '/blog-post/is-dental-insurance-worth-it' },
      { label: 'Dental insurance vs discount plans', href: '/blog-post/dental-insurance-vs-discount-plans' },
      { label: 'What does dental insurance actually cover?', href: '/qa/what-does-dental-insurance-actually-cover' },
      { label: 'What is a dental annual maximum?', href: '/qa/what-is-a-dental-annual-maximum' },
      { label: 'Are dental discount plans legit?', href: '/qa/are-dental-discount-plans-legit' },
      { label: 'Can you have insurance and a discount plan?', href: '/qa/can-you-have-dental-insurance-and-a-discount-plan' },
      { label: 'Self-employed? Start with strategy', href: '/self-employed' },
    ],
  },

  'vision-insurance': {
    sections: [
      {
        h2: 'What does vision insurance actually cover?',
        paras: [
          `Vision insurance covers the predictable annual costs of eye care: a comprehensive exam, a lens benefit, a frame allowance on a schedule, and a contact lens allowance that usually substitutes for the glasses benefit. It is less like health insurance and more like a prepaid maintenance plan with negotiated pricing attached.`,
          `That design is why the value question is so easy to answer with arithmetic. Add the retail price of an exam and a year's worth of eyewear at a Las Vegas optometrist, compare it to twelve months of premium, and the plan either pays for itself or it does not. For most people who wear glasses or contacts, it does. For people with perfect vision and no family eye history, it often does not, and the honest math is laid out in <a href="/qa/is-vision-insurance-worth-it">is vision insurance worth it</a>.`,
        ],
      },
      {
        h2: 'Why do eye exams matter even with perfect vision?',
        paras: [
          `A comprehensive eye exam is one of the few checkups that can spot systemic disease before symptoms appear. Optometrists routinely catch early signs of diabetes, high blood pressure, and high cholesterol in the blood vessels of the retina, sometimes years before a physician would otherwise see them.`,
          `That makes the exam benefit the quietly valuable part of a vision plan, separate from the eyewear discounts. Nevada's diabetes rates make routine retinal checks genuinely consequential for a lot of valley households. The National Eye Institute and the American Academy of Ophthalmology, both linked below and neither selling anything, publish the recommended exam schedules by age and risk factor.`,
        ],
      },
      {
        h2: 'What does living in the desert do to your eyes?',
        paras: [
          `Las Vegas is hard on eyes in two specific ways: intense year-round UV exposure and some of the driest air in the country. UV exposure accumulates over a lifetime and raises cataract risk, and desert dryness drives chronic dry eye complaints that fill valley optometry offices every summer.`,
          `Both have cheap, boring, effective answers: quality UV-blocking sunglasses and regular exams that catch problems early. A vision plan's frame allowance can cover prescription sunglasses, which is one of the more underused benefits in the whole product. Screen time compounds the dryness problem for anyone working long days on a computer, which in a city full of hospitality schedulers, dealers, and remote workers is most people.`,
        ],
      },
      {
        h2: 'How do the typical vision benefits renew?',
        paras: [
          `Most vision plans refresh the exam and lens benefits every 12 months and the frame allowance every 24 months, which is the rhythm the chart below shows. Contact lens wearers usually choose between the contact allowance and the glasses benefit each cycle rather than getting both.`,
          `The renewal schedule rewards people who actually use it. Skipping a year of benefits you paid premiums for is the most common way vision coverage quietly becomes a bad deal, and using every cycle is how it becomes a clearly good one. A calendar reminder in the birthday month solves it permanently.`,
        ],
      },
      {
        h2: 'Who should buy standalone vision coverage in Nevada?',
        paras: [
          `The same crowd that needs standalone dental: Realtors, 1099 contractors, self-employed professionals, and anyone whose work does not come with a benefits packet. Marketplace health plans cover children's vision as an essential benefit, but adult vision almost always has to be added on purpose.`,
          `Vision is inexpensive as coverage lines go, which makes it an easy add to the health and dental conversation rather than a decision worth agonizing over alone. Households building the whole picture should start from structure on the <a href="/self-employed">self-employed strategy page</a>, and glasses-wearing families comparing plan designs can sanity-check terminology in the <a href="/faq">FAQ</a> or the <a href="/blog-post/how-to-choose-a-health-insurance-plan-nevada">plan-choosing guide</a>, since the same network logic applies at a smaller scale.`,
        ],
      },
      {
        h2: 'How does ProtectHealth handle vision coverage?',
        paras: [
          `Vision usually enters the conversation as the third line in a health, dental, and vision bundle, and ProtectHealth prices it that way, checking whether preferred Las Vegas eye doctors and optical shops are in-network before anything else. The consultation is free, and plan pricing is the same with or without a broker.`,
          `If the honest math says skip it and pay cash, the broker says so, the same way the <a href="/services/gap-health-insurance">GAP page</a> says a supplemental plan is sometimes the wrong buy. Start at <a href="/contact-us">Talk To A Broker</a>, call 800-240-8185, or request a time on the <a href="/free-quote">consultation page</a>, and bring the current glasses prescription if there is one.`,
        ],
      },
      {
        h2: 'What do glasses and contacts cost without coverage?',
        paras: [
          `Paying cash, a comprehensive exam plus a complete pair of glasses at a Las Vegas optical shop routinely lands in the mid hundreds, and progressive lenses or premium frames push it higher. Contact lens wearers replace product all year, so their annual spend runs on a subscription curve instead of a purchase curve. Against numbers like that, a modest monthly premium with an exam copay and allowances usually wins for anyone with a prescription.`,
          `Online retailers changed the frame math, and a vision plan does not forbid using them. Plenty of members use the covered exam locally, apply the allowance to a primary pair, and buy backup pairs online with the prescription in hand. That hybrid is often the cheapest total strategy of all, and a broker who says so out loud is telling you the plan is a tool, not a loyalty program.`,
        ],
      },
      {
        h2: 'How should families handle kids and school vision screenings?',
        paras: [
          `A school screening is a filter, not an exam. It catches some distance-vision problems and misses plenty else, including the focusing and eye-teaming issues that show up as reading struggles rather than blurry whiteboards. Pediatric vision care is an essential health benefit in marketplace plans, so most Nevada kids already have exam coverage their parents have never used.`,
          `The American Academy of Ophthalmology and the National Eye Institute publish age-based exam schedules, both linked below, and the practical version is simple: a comprehensive exam before first grade, then as recommended. Kids' frames also break on a schedule best described as constantly, which is exactly what allowances and impact-resistant lens benefits exist for. A child squinting at homework is a cheaper problem this year than next year, in every sense.`,
        ],
      },
      {
        h2: 'Is vision insurance worth it for remote workers and heavy screen users?',
        paras: [
          `Screen-heavy work raises the value of the exam cycle because digital eye strain, dryness, and slowly creeping prescriptions are occupational realities, and Las Vegas runs on screen-heavy work, from casino operations to the valley's growing remote workforce. Computer-distance lenses and blue-light options ride the same lens benefit most plans already include.`,
          `The strain itself also responds to free habits, the 20-20-20 rule most of all: every 20 minutes, look at something 20 feet away for 20 seconds. No plan required. The honest summary for this whole page is the same one ProtectHealth gives in person, documented in <a href="/qa/is-vision-insurance-worth-it">is vision insurance worth it</a>: glasses or contacts in the house, the plan usually pays for itself. Perfect vision and no family history, pay cash and put the difference toward the <a href="/services/dental-insurance">dental conversation</a> instead.`,
        ],
      },
      {
        h2: 'How do vision plans handle LASIK and corrective surgery?',
        paras: [
          `LASIK and similar procedures are elective, which puts them outside standard vision benefits, but most vision plans carry negotiated member discounts with participating surgery centers, commonly in the range of meaningful hundreds off per eye. A discount is not coverage, and it should be weighed exactly that way: real money, not the main reason to buy a plan.`,
          `Las Vegas has a deep bench of refractive surgery providers, and prices vary enough that the plan discount is only one variable among several. Anyone considering surgery should get the full quote picture first, then check what the plan's discount actually applies to, because advertised prices and final prices are famously different animals in this category. Health savings dollars can typically pay for LASIK where eligible, which for some households beats any discount a vision plan offers. The right sequence is surgeon first, financing second, plan discount third.`,
        ],
      },
      {
        h2: 'What happens when an eye problem is medical instead of routine?',
        paras: [
          `The moment an eye issue becomes medical, an infection, an injury, cataracts, glaucoma, a diabetic retina check, it generally moves from the vision plan to the health plan, billed like any other medical care with deductibles and copays. Vision plans own the routine layer: exams for prescriptions, lenses, and frames. Health plans own disease.`,
          `That split explains bills that otherwise look like errors, like a routine exam that becomes a medical visit because the optometrist found something worth treating. It is also one more reason the health plan and vision plan belong in the same conversation, because the two need to fit together at exactly the seams where eyes stop being routine. That whole-picture fitting is the standing offer on this site: one free conversation at <a href="/contact-us">Talk To A Broker</a>, the full library in the <a href="/blog">guides</a> and <a href="/faq">FAQ</a> for everyone who prefers to read first.`,
        ],
      },
      {
        h2: 'How do you get the most out of a vision plan year after year?',
        paras: [
          `Treat the benefits like a subscription you already paid for. Book the exam in the same month every year, use the full frame allowance even when the current pair still works, and let the covered backup become the car pair, the work pair, or the prescription sunglasses the desert demands. Members who run that rhythm extract several times more value than members who enroll and forget.`,
          `Two smaller moves compound it. Flexible spending and health savings dollars can cover the copays and overages a plan leaves behind, where eligible, which effectively discounts the whole category. And families should stagger who uses which cycle when budgets are tight, prioritizing kids and heavy prescriptions first. None of this is complicated. It is calendar discipline attached to money already spent, and it is the difference between a vision plan that quietly pays for itself and one that quietly does not. When in doubt, bring the whole picture to the same free conversation that handles the health and dental lines, and let the numbers decide.`,
        ],
      },
    ],
    chart: {
      title: 'Typical vision benefit refresh schedule',
      note: 'Common plan design, measured in months between covered benefits. Specific plans vary.',
      bars: [
        { label: 'Eye exam', value: 12, display: 'every 12 months' },
        { label: 'Lenses or contacts', value: 12, display: 'every 12 months' },
        { label: 'Frames', value: 24, display: 'every 24 months' },
      ],
    },
    chartAfter: 3,
    table: {
      title: 'What a typical vision plan includes',
      head: ['Benefit', 'How it usually works'],
      rows: [
        ['Comprehensive eye exam', 'Covered once per cycle with a small copay'],
        ['Lenses', 'Standard lenses covered, upgrades like progressives cost extra'],
        ['Frames', 'Fixed allowance, member pays the difference above it'],
        ['Contact lenses', 'Allowance that typically replaces the glasses benefit for the cycle'],
        ['Prescription sunglasses', 'Frame allowance can often be applied here, an underused move in the desert'],
      ],
    },
    tableAfter: 0,
    resources: [
      { label: 'National Eye Institute', href: 'https://www.nei.nih.gov/', why: 'Federal research institute. Exam schedules and eye disease basics.' },
      { label: 'EyeSmart by the AAO', href: 'https://www.aao.org/eye-health', why: `The American Academy of Ophthalmology's consumer education site.` },
      { label: 'Prevent Blindness', href: 'https://preventblindness.org/', why: 'A century-old nonprofit focused on vision health, sells nothing.' },
    ],
    reading: [
      { label: 'Is vision insurance worth it?', href: '/qa/is-vision-insurance-worth-it' },
      { label: 'How to choose a health insurance plan in Nevada', href: '/blog-post/how-to-choose-a-health-insurance-plan-nevada' },
      { label: 'What is an out-of-pocket maximum?', href: '/qa/what-is-an-out-of-pocket-maximum' },
      { label: 'Dental insurance: is it worth it?', href: '/blog-post/is-dental-insurance-worth-it' },
      { label: 'Self-employed? Start with strategy', href: '/self-employed' },
    ],
  },
};
