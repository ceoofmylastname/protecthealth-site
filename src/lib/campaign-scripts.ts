// Vertical video scripts + typographic post cards for the two campaigns.
//
// CLIENT-SAFE BY DESIGN. This file renders on /campaign-gallery, which is
// noindex and out of the sitemap but has no authentication. So it carries only
// what a client or a video editor may read: the voiceover, the on-screen
// burn-in, the shot note and the ready-to-post caption.
//
// Deliberately NOT here, and it must stay that way:
//   - Fred, or any Paychex handoff mechanics. CLAUDE.md: internal scripts only.
//   - Audience targeting notes and paid-spend strategy.
//   - The compliance gating note on Paychex creative.
// Those live in the two source markdown files outside the repo.
//
// `card` is the matching 1080x1350 post graphic in /public/assets/campaign/.
// One script, one card, one social post, the ids line up on purpose so a
// missing pair is visible at a glance rather than discovered on launch day.

export type Beat = {
  t: string;    // timecode
  vo: string;   // what gets said
  text: string; // on-screen burn-in, six words max
  shot: string; // what the camera or the b-roll shows
};

export type Script = {
  id: string;
  file: string;      // suggested export filename
  title: string;
  runtime: string;
  pairs: string;     // which post in the approved sequence
  hookType: string;
  beats: Beat[];
  caption: string;   // ready to paste
  card: string;      // matching post graphic, /assets/campaign/*.webp
  landing: string;
};

const I_LAND = 'https://www.protecthealth.com/self-employed';
const E_LAND = 'https://www.protecthealth.com/employers';

export const ICHRA_SCRIPTS: Script[] = [
  {
    id: 'ichra-01',
    file: 'script-01-wrong-question-9x16.mp4',
    title: 'The Wrong Question',
    runtime: '38s',
    pairs: 'Post 1',
    hookType: 'Call-out',
    card: '/assets/campaign/ichra-01-wrong-question.webp',
    landing: I_LAND,
    beats: [
      { t: '0:00-0:04', vo: 'Every week somebody in a Realtor group asks the same two questions. And they’re the two least useful questions in health insurance.', text: 'The wrong question', shot: 'Phone in hand, scrolling a group thread, screen blurred' },
      { t: '0:04-0:14', vo: 'Who do you use. What do you pay. That’s it. And the comments fill up with names of agents and names of plans.', text: '"Who do you use?" / "What do you pay?"', shot: 'Two text cards stacking, comment-bubble motion' },
      { t: '0:14-0:26', vo: 'Here’s the problem. A plan that’s perfect for a 31-year-old single agent is a bad fit for a 52-year-old broker with a family of four and two prescriptions. Same plan. Same price. One of them is covered wrong.', text: 'Same plan. Different outcome.', shot: 'Split screen, two silhouettes, one plan document between them' },
      { t: '0:26-0:34', vo: 'The better question is this: is my coverage built around how my business is structured, or did I just buy what somebody was selling?', text: 'Built around your business?', shot: 'Slow push into the question on a navy card' },
      { t: '0:34-0:38', vo: 'If nobody’s ever asked you that, that’s worth noticing.', text: 'protecthealth.com/self-employed', shot: 'Logo lockup, URL, no hard CTA' },
    ],
    caption: 'Who you use and what you pay are the two least useful data points in health insurance. The better question is whether your coverage was built around how your business is actually structured. If nobody has ever asked you that, that is worth noticing.\n\nLearn more: https://www.protecthealth.com/self-employed',
  },
  {
    id: 'ichra-02',
    file: 'script-02-one-in-eight-9x16.mp4',
    title: 'The Number Nobody Talks About',
    runtime: '35s',
    pairs: 'Post 2',
    hookType: 'Stat',
    card: '/assets/campaign/ichra-02-one-in-eight.webp',
    landing: I_LAND,
    beats: [
      { t: '0:00-0:05', vo: 'One in eight Realtors has no health coverage at all. That’s not our number. That’s NAR’s.', text: '1 in 8', shot: 'Big number slams onto navy, subtle grain' },
      { t: '0:05-0:14', vo: 'Ten to fifteen percent, walking around with nothing. Before the ACA it was closer to thirty, so it’s better. But think about who we’re talking about.', text: '10-15% uninsured', shot: 'Counter animating down from 30 to 15' },
      { t: '0:14-0:26', vo: 'A profession full of smart, self-employed businesspeople. People who negotiate for a living. And it’s usually not because coverage doesn’t exist for them.', text: 'Not a knowledge problem.', shot: 'Realtor b-roll, open house sign, keys, handshake' },
      { t: '0:26-0:35', vo: 'It’s because nobody ever sat down and explained what’s actually available to somebody who’s 1099. Premiums and deductibles are where that conversation starts. Not where it ends.', text: 'The beginning, not the end.', shot: 'Two people at a table, papers, warm light. Logo + URL' },
    ],
    caption: 'NAR’s own number: 10 to 15 percent of Realtors have no health coverage at all. It is rarely because nothing exists for them. It is because nobody ever explained what is actually available to someone who is 1099.\n\nLearn more: https://www.protecthealth.com/self-employed',
  },
  {
    id: 'ichra-03',
    file: 'script-03-strategy-over-product-9x16.mp4',
    title: 'Strategy vs. Product',
    runtime: '32s',
    pairs: 'Post 3',
    hookType: 'Contrarian',
    card: '/assets/campaign/ichra-03-strategy-over-product.webp',
    landing: I_LAND,
    beats: [
      { t: '0:00-0:05', vo: 'Most of this industry is built to sell you a product. We think that’s backwards.', text: 'Backwards.', shot: 'A brochure sliding across a desk, then getting pushed back' },
      { t: '0:05-0:18', vo: 'Start with the person instead. How is the business structured, sole proprietor, LLC, S-corp, small team? What do you actually need coverage to do? What’s the real financial exposure if something goes wrong?', text: 'Structure. Need. Exposure.', shot: 'Three cards building left to right' },
      { t: '0:18-0:27', vo: 'Then, and only then, does a product enter the picture. The product should serve the strategy. Not become the strategy.', text: 'The product serves the strategy.', shot: 'Anchor line held on screen, gradient underline drawing' },
      { t: '0:27-0:32', vo: 'If your coverage started with a product instead of a plan, you might be paying for that in ways that never show up on the premium.', text: 'protecthealth.com/self-employed', shot: 'Logo lockup' },
    ],
    caption: 'The product should serve the strategy, not become the strategy. Start with how the business is built and what the real exposure is. The plan comes last.\n\nLearn more: https://www.protecthealth.com/self-employed',
  },
  {
    id: 'ichra-04',
    file: 'script-04-four-doors-9x16.mp4',
    title: 'The Structures Nobody Explained',
    runtime: '44s',
    pairs: 'Post 4',
    hookType: 'Vocabulary',
    card: '/assets/campaign/ichra-04-four-doors.webp',
    landing: I_LAND,
    beats: [
      { t: '0:00-0:05', vo: 'Nobody hands you a vocabulary list when you go 1099. So here’s the one that matters.', text: 'Nobody hands you this.', shot: 'A 1099 form, then it flips to a blank page' },
      { t: '0:05-0:20', vo: 'Depending on how your business is set up, there may be individual coverage, genuine PPO options, small-group opportunities, or tax-advantaged health-benefit structures. Things with names like ICHRA and Section 105.', text: 'Four possible doors', shot: 'Four doors appearing in a row, none of them opening yet' },
      { t: '0:20-0:31', vo: 'Does every one of those apply to every person? No. Business structure, income and household situation all matter, which is exactly why blanket advice in a comment thread is worth what you paid for it.', text: 'Not everyone qualifies.', shot: 'Doors dim one at a time, two stay lit' },
      { t: '0:31-0:39', vo: 'But here’s what is true for almost everybody watching this: nobody has ever properly explained these options to you. Not once.', text: 'Never explained. Not once.', shot: 'Hold on the line, slow zoom' },
      { t: '0:39-0:44', vo: 'And we’re insurance nerds, not tax professionals. So when structure comes up, we’ll always tell you to loop in your tax pro too. That’s the responsible way to do this.', text: 'Insurance nerds. Not tax pros.', shot: 'Logo + URL' },
    ],
    caption: 'ICHRA. Section 105. Small group. Genuine PPO access. Which of those doors is open depends entirely on how your business is structured, and no, not everyone qualifies. But almost nobody has had them explained even once. We are insurance nerds, not tax professionals, so we will always suggest looping in your tax pro.\n\nLearn more: https://www.protecthealth.com/self-employed',
  },
  {
    id: 'ichra-05',
    file: 'script-05-quiet-shift-9x16.mp4',
    title: 'The Quiet Shift',
    runtime: '40s',
    pairs: 'Post 5',
    hookType: 'Trend',
    card: '/assets/campaign/ichra-05-eighty-three.webp',
    landing: I_LAND,
    beats: [
      { t: '0:00-0:05', vo: 'Something shifted in employer health benefits this year and almost nobody noticed.', text: 'Nobody noticed.', shot: 'Slow drift across a Vegas skyline at dusk' },
      { t: '0:05-0:16', vo: 'Tax-advantaged reimbursement arrangements grew again. Fifth straight year. Small-employer adoption jumped more than fifty percent.', text: '+52% small employers', shot: 'Bar chart building, fifth bar highlighted' },
      { t: '0:16-0:28', vo: 'But here’s the stat that actually matters. Eighty-three percent of the employers who set one up last year had never offered health benefits before. These aren’t companies switching plans. They’re companies that finally found a structure that fit.', text: '83% had never offered before', shot: 'Big number, then small-business b-roll' },
      { t: '0:28-0:36', vo: 'Why does that matter to a Realtor or a 1099 contractor? Because brokerages, teams and small offices are structured a hundred different ways, and some of those structures open doors most agents don’t know exist.', text: 'Your structure may open a door.', shot: 'Doors motif callback' },
      { t: '0:36-0:40', vo: 'Worth a conversation? Depends entirely on your situation. Which is the whole point.', text: 'protecthealth.com/self-employed', shot: 'Logo lockup' },
    ],
    caption: 'Fifth straight year of growth in tax-advantaged reimbursement arrangements, and 83 percent of the employers who set one up last year had never offered coverage before. They did not switch plans. They found a structure that fit. Whether yours does is the conversation.\n\nLearn more: https://www.protecthealth.com/self-employed',
  },
  {
    id: 'ichra-06',
    file: 'script-06-good-coverage-9x16.mp4',
    title: 'What "Good Coverage" Actually Means',
    runtime: '36s',
    pairs: 'Post 6',
    hookType: 'Puzzle',
    card: '/assets/campaign/ichra-06-good-coverage.webp',
    landing: I_LAND,
    beats: [
      { t: '0:00-0:06', vo: 'Two Realtors. Same brokerage. Same premium. Same deductible. One of them has appropriate coverage and one of them doesn’t. How?', text: 'Same plan. Same price.', shot: 'Two identical plan cards side by side' },
      { t: '0:06-0:22', vo: 'Because good coverage isn’t decided by the number on the monthly bill. It’s decided by age, household income, tax-credit eligibility, provider networks, prescriptions, expected usage, and total financial exposure.', text: 'Seven things that decide it', shot: 'Seven short labels stacking fast, one per beat' },
      { t: '0:22-0:31', vo: 'So anyone who tells you whether a plan is good without asking about any of that is guessing. Confidently, maybe. But guessing.', text: 'That’s a guess.', shot: 'One card slides away, leaving a question mark' },
      { t: '0:31-0:36', vo: 'We’d rather ask than guess.', text: 'We’d rather ask.', shot: 'Logo + URL' },
    ],
    caption: 'Two Realtors, same brokerage, same premium, same deductible. One is covered appropriately and one is not. Good coverage is decided by age, income, tax-credit eligibility, networks, prescriptions, usage and real exposure. Anyone skipping those questions is guessing.\n\nLearn more: https://www.protecthealth.com/self-employed',
  },
  {
    id: 'ichra-07',
    file: 'script-07-twenty-minutes-9x16.mp4',
    title: 'The Resource Post',
    runtime: '34s',
    pairs: 'Post 7',
    hookType: 'Open offer',
    card: '/assets/campaign/ichra-07-twenty-minutes.webp',
    landing: I_LAND,
    beats: [
      { t: '0:00-0:06', vo: 'If you’re a Realtor, a 1099 contractor or self-employed in Las Vegas, this is an open offer.', text: 'Open offer. Vegas.', shot: 'Vegas street level, daytime, warm' },
      { t: '0:06-0:20', vo: 'Bring us your current coverage, or the fact that you don’t have any, and twenty minutes. We’ll walk through how your business is structured, what you actually need, and which options are worth exploring.', text: '20 minutes', shot: 'Two chairs, table, notebook. Clock graphic ticking to 20' },
      { t: '0:20-0:29', vo: 'No quote-blasting. No pressure. And if what you already have is right for you, we’ll tell you that too.', text: 'No pitch. No quote blast.', shot: 'Three quick text cards' },
      { t: '0:29-0:34', vo: 'We’re insurance nerds. This is the part we actually like.', text: 'Let’s talk through it.', shot: 'Logo + URL + "Book a strategy conversation"' },
    ],
    caption: 'Open offer for Vegas Realtors, 1099s and self-employed: bring your current coverage, or your lack of it, and 20 minutes. We will map what fits your structure and what does not. If what you have is already right, we will say so.\n\nLearn more: https://www.protecthealth.com/self-employed',
  },
  {
    id: 'ichra-08',
    file: 'script-08-team-leads-9x16.mp4',
    title: 'The Team Lead Post',
    runtime: '37s',
    pairs: 'Post 8',
    hookType: 'Direct address',
    card: '/assets/campaign/ichra-08-team-leads.webp',
    landing: I_LAND,
    beats: [
      { t: '0:00-0:05', vo: 'Team leads and brokers, this one’s yours.', text: 'For team leads.', shot: 'Office floor, desks, quiet motion' },
      { t: '0:05-0:18', vo: 'Your agents are 1099. Your staff might be W-2. And your office is structured like no other office in town, because every brokerage is.', text: '1099 + W-2 + you', shot: 'Org-chart graphic assembling unevenly on purpose' },
      { t: '0:18-0:29', vo: 'That mix is exactly why cookie-cutter benefits advice fails in real estate. And it’s why the right structure for your office might be something nobody’s ever put in front of you.', text: 'Cookie-cutter advice fails here.', shot: 'A generic template graphic tearing' },
      { t: '0:29-0:37', vo: 'If you’ve ever wished you could offer your people something real without becoming a benefits administrator. That’s a conversation we can have.', text: 'Something real. Without the admin.', shot: 'Logo + URL' },
    ],
    caption: 'Your agents are 1099. Your staff might be W-2. Your office is structured like no other office in town. That is exactly why cookie-cutter benefits advice fails in real estate. If you have wanted to offer your people something real without becoming a benefits administrator, that is a conversation.\n\nLearn more: https://www.protecthealth.com/self-employed',
  },
  {
    id: 'ichra-09',
    file: 'script-09-beginning-9x16.mp4',
    title: 'Beginning Of The Conversation (evergreen)',
    runtime: '40s',
    pairs: 'Post 9',
    hookType: 'Story callback',
    card: '/assets/campaign/ichra-09-beginning.webp',
    landing: I_LAND,
    beats: [
      { t: '0:00-0:07', vo: 'A while back a local Realtor asked her friends three questions. Who do you use. What do you pay. What’s your deductible.', text: 'Three questions.', shot: 'Three comment bubbles appearing in sequence' },
      { t: '0:07-0:15', vo: 'Good questions. Genuinely. But they’re the beginning of the conversation, not the end of it.', text: 'The beginning. Not the end.', shot: 'Bubbles fade, one line remains' },
      { t: '0:15-0:30', vo: 'Here’s what the end looks like. Coverage built around your business structure, your household, the doctors you actually want to keep, and your real financial exposure. A strategy, with a product serving it.', text: 'Structure. Household. Doctors. Exposure.', shot: 'Four labels forming a single shape' },
      { t: '0:30-0:40', vo: 'If nobody’s ever built that with you, we’re happy to be a resource. That’s the whole offer.', text: 'That’s the whole offer.', shot: 'Logo + URL, hold 2s' },
    ],
    caption: 'Who do you use, what do you pay, what is your deductible. Good questions, and the beginning of the conversation rather than the end. The end looks like coverage built around your structure, your household, your doctors and your real exposure.\n\nLearn more: https://www.protecthealth.com/self-employed',
  },
];

export const PAYCHEX_SCRIPTS: Script[] = [
  {
    id: 'paychex-A',
    file: 'script-A-partnership-9x16.mp4',
    title: 'Official Partnership Announcement',
    runtime: '42s',
    pairs: 'Post A. Runs first, everywhere',
    hookType: 'News',
    card: '/assets/campaign/paychex-A-partnership.webp',
    landing: E_LAND,
    beats: [
      { t: '0:00-0:06', vo: 'Some news we’re proud of. ProtectHealth has officially partnered with Paychex.', text: 'ProtectHealth × Paychex', shot: 'Clean navy card, two logo lockups meeting. Hold it. This is the badge' },
      { t: '0:06-0:18', vo: 'Here’s why that matters if you own a business. Most owners are juggling five or six vendors just to run the employer side of the company. Payroll here. HR questions there. Benefits somewhere else. Compliance… hopefully somewhere.', text: '5 vendors. 1 owner.', shot: 'Five scattered folder icons, one overwhelmed desk' },
      { t: '0:18-0:30', vo: 'Our job has always been the benefits strategy. Now, with Paychex alongside us, we can help you think through the whole picture. Payroll, HR support, compliance, benefits administration, onboarding, retirement.', text: 'The whole employer picture', shot: 'Icons pulling into a single organized row' },
      { t: '0:30-0:38', vo: 'To be clear about how this works: we’re not becoming payroll experts overnight. We’re the strategy conversation. When something’s worth exploring, we connect you straight to our Paychex team and they take it from there.', text: 'We’re the strategy. They’re the muscle.', shot: 'Two-panel graphic, arrow between them' },
      { t: '0:38-0:42', vo: 'One relationship. A much bigger toolbox.', text: 'protecthealth.com/employers', shot: 'Logo lockup + URL' },
    ],
    caption: 'ProtectHealth has officially partnered with Paychex. Our job has always been the benefits strategy. Now the conversation covers the whole employer picture: payroll, HR support, compliance, benefits administration, onboarding, retirement. We are not becoming payroll experts overnight. We are the strategy conversation, and when something is worth exploring we connect you directly to our Paychex team. One relationship, a much bigger toolbox.\n\nLearn more: https://www.protecthealth.com/employers',
  },
  {
    id: 'paychex-B',
    file: 'script-B-payroll-9x16.mp4',
    title: 'Payroll Headaches',
    runtime: '36s',
    pairs: 'Post 1',
    hookType: 'Relatable pain',
    card: '/assets/campaign/paychex-B-payroll.webp',
    landing: E_LAND,
    beats: [
      { t: '0:00-0:05', vo: 'Nobody starts a business because they love running payroll.', text: 'Nobody starts for this.', shot: 'Laptop open late, spreadsheet glow, coffee gone cold' },
      { t: '0:05-0:16', vo: 'But somehow it’s Thursday night again and you’re double-checking deductions, chasing down a W-4, and hoping the tax filing is right. Every week. Forever.', text: 'Thursday night. Again.', shot: 'Clock reading 9:40pm, papers, tired hands' },
      { t: '0:16-0:27', vo: 'Here’s the stat that made us wince. Seventy percent of small business owners spend more than a week every month on HR and payroll admin. A week. Per month.', text: '70% lose a week a month', shot: 'Calendar with one full week shading out' },
      { t: '0:27-0:36', vo: 'If payroll friction is stealing time you should be spending on customers, that’s exactly what our Paychex partnership is for. Tell us what the mess looks like and we’ll point you at the right fix.', text: 'Tell us what’s on your plate.', shot: 'Logo + URL' },
    ],
    caption: '70 percent of small business owners spend more than a week every month on HR and payroll admin. A week. Every month. If payroll friction is eating the time you should be spending on customers, that is exactly what our Paychex partnership exists for.\n\nLearn more: https://www.protecthealth.com/employers',
  },
  {
    id: 'paychex-C',
    file: 'script-C-hr-9x16.mp4',
    title: 'No Real HR Department',
    runtime: '38s',
    pairs: 'Post 2',
    hookType: 'Question',
    card: '/assets/campaign/paychex-C-hr.webp',
    landing: E_LAND,
    beats: [
      { t: '0:00-0:05', vo: 'Quick question for business owners. Who is your HR department?', text: 'Who’s your HR?', shot: 'Empty desk with an "HR" nameplate' },
      { t: '0:05-0:14', vo: 'If the answer is "me, I guess". You’re in the majority. Most small businesses have employees and no formal HR structure at all.', text: '"Me, I guess."', shot: 'Owner pointing at self, half-laughing' },
      { t: '0:14-0:25', vo: 'No handbook. Onboarding that lives in somebody’s head. Employee files spread across three drawers and an inbox. And it works fine. Right up until it doesn’t.', text: 'Works fine. Until it doesn’t.', shot: 'Three drawers opening, papers, then a beat of stillness' },
      { t: '0:25-0:34', vo: 'You don’t need to hire an HR person. You probably do need HR guidance you can actually reach. Handbooks, documentation, compliance support, onboarding that protects you.', text: 'Guidance you can reach.', shot: 'Four labels stacking cleanly' },
      { t: '0:34-0:38', vo: 'That’s a conversation we can have now, with Paychex in our corner. No charge to talk it through.', text: 'protecthealth.com/employers', shot: 'Logo + URL' },
    ],
    caption: 'If your HR department is "me, I guess," you are in the majority. No handbook, onboarding that lives in someone’s head, files in three drawers and an inbox. It works fine right up until it does not. You do not need to hire an HR person, but you probably need HR guidance you can actually reach.\n\nLearn more: https://www.protecthealth.com/employers',
  },
  {
    id: 'paychex-D',
    file: 'script-D-retention-9x16.mp4',
    title: 'Hiring, Retention, Employee Experience',
    runtime: '37s',
    pairs: 'Post 3',
    hookType: 'Contrarian',
    card: '/assets/campaign/paychex-D-retention.webp',
    landing: E_LAND,
    beats: [
      { t: '0:00-0:06', vo: 'The hardest part of running a business in 2026 isn’t finding customers. It’s keeping good people.', text: 'Keeping people is the hard part.', shot: 'Team on a floor, motion, faces soft' },
      { t: '0:06-0:18', vo: 'And here’s what we’ve noticed. The businesses that keep their people almost never win on salary alone. They win on the whole experience. Real benefits, a retirement plan, smooth onboarding, an employer that clearly has its act together.', text: 'They don’t win on salary.', shot: 'Four small tiles lighting one at a time' },
      { t: '0:18-0:29', vo: 'That full package used to be something only big companies could offer. That’s not true anymore.', text: 'Not just for big companies.', shot: 'Small storefront next to a tower, scale flipping' },
      { t: '0:29-0:37', vo: 'If you’re competing for talent against bigger employers, let’s talk about what your employee experience actually looks like right now. And what it could look like.', text: 'What could it look like?', shot: 'Logo + URL' },
    ],
    caption: 'The businesses that keep good people rarely win on salary alone. They win on the whole experience: real benefits, a retirement plan, smooth onboarding, an employer that has its act together. That package is not just for big companies anymore.\n\nLearn more: https://www.protecthealth.com/employers',
  },
  {
    id: 'paychex-E',
    file: 'script-E-tipped-9x16.mp4',
    title: 'Tipped Industries',
    runtime: '40s',
    pairs: 'Post 4',
    hookType: 'Niche call-out',
    card: '/assets/campaign/paychex-E-tipped.webp',
    landing: E_LAND,
    beats: [
      { t: '0:00-0:06', vo: 'Restaurants. Bars. Salons. Spas. If your team earns tips, this one’s for you.', text: 'If your team earns tips', shot: 'Fast cuts. Bar pour, salon chair, ticket printer' },
      { t: '0:06-0:18', vo: 'Tipped payroll is its own animal. Reporting, credits, compliance rules that most generic payroll setups handle badly. And in some cases handle wrong.', text: 'Its own animal.', shot: 'A generic payroll screen with a red flag icon' },
      { t: '0:18-0:28', vo: 'And in some cases there are tax-credit opportunities sitting on the table that nobody has ever mentioned to you. We’re not going to pretend to be tax experts in a thirty-second video. We’re insurance nerds, and your CPA should always be in the loop.', text: 'Your CPA stays in the loop.', shot: 'Text card, deliberately plain, no flash' },
      { t: '0:28-0:36', vo: 'But we can tell you this. Between our benefits work and our Paychex partnership, tipped businesses are exactly who we built this for.', text: 'Built for tipped businesses.', shot: 'Hospitality b-roll, warmer grade' },
      { t: '0:36-0:40', vo: 'Vegas runs on hospitality. Let’s make sure the back office runs as well as the front.', text: 'protecthealth.com/employers', shot: 'Strip at dusk, logo + URL' },
    ],
    caption: 'Tipped payroll is its own animal: reporting, credits, and compliance rules most generic setups handle badly. There are also credit opportunities that nobody may have mentioned to you. We are insurance nerds, not tax professionals, so your CPA stays in the loop. Vegas runs on hospitality. Let’s make sure the back office runs as well as the front.\n\nLearn more: https://www.protecthealth.com/employers',
  },
  {
    id: 'paychex-F',
    file: 'script-F-growth-9x16.mp4',
    title: 'Growing Pains',
    runtime: '39s',
    pairs: 'Post 5',
    hookType: 'Recognition',
    card: '/assets/campaign/paychex-F-growth.webp',
    landing: E_LAND,
    beats: [
      { t: '0:00-0:06', vo: 'There’s a moment every growing business hits.', text: 'Every growing business hits it.', shot: 'A second location sign going up' },
      { t: '0:06-0:17', vo: 'You added a location. Or your fifth employee. Or your tenth. And suddenly the systems that got you here stop working. The spreadsheet. The shoebox. The "I just handle it Sunday nights."', text: 'The spreadsheet stops working.', shot: 'Spreadsheet, shoebox of receipts, Sunday night kitchen table' },
      { t: '0:17-0:29', vo: 'Growth is the best problem to have, but it is a problem. Payroll gets more complex. Compliance gets real. And employees start asking about benefits.', text: 'The best problem is still a problem.', shot: 'Three escalating icons' },
      { t: '0:29-0:39', vo: 'If your back office is getting messy in the best possible way, that’s the right time to talk. We’ll help you sort what needs a system, what needs a strategy, and where our Paychex team can take work off your plate entirely.', text: 'Messy in the best way?', shot: 'Logo + URL' },
    ],
    caption: 'You added a location, or a fifth employee, or a tenth, and the systems that got you here stopped working. Growth is the best problem to have and it is still a problem. Payroll gets complex, compliance gets real, and employees start asking about benefits. If the back office is getting messy in the best possible way, that is the right time to talk.\n\nLearn more: https://www.protecthealth.com/employers',
  },
];

// The two Open Graph cards. Not social posts. These are what unfurls when
// either landing page gets pasted into a message or a feed.
export const OG_CARDS = [
  {
    file: 'og-self-employed.webp',
    img: '/assets/og-self-employed.webp',
    hook: 'Built around your business. Not somebody’s product.',
    note: 'Link preview for /self-employed. 1200×630. Replaces the placeholder og-default.webp.',
    landing: I_LAND,
  },
  {
    file: 'og-employers.webp',
    img: '/assets/og-employers.webp',
    hook: 'More than your group plan. A much bigger toolbox.',
    note: 'Link preview for /employers. 1200×630. Replaces the placeholder og-default.webp.',
    landing: E_LAND,
  },
];
