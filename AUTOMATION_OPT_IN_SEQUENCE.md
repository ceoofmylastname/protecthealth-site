# Opt-In Automation — Paychex Campaign

**Trigger:** contact created or updated via `/api/lead` with Source Form = `employers` and Landing Page = `/payroll-tax-asset`, or tag `campaign:paychex` applied.
**Where it runs:** GoHighLevel, location `nF7RwerbB5hn27XaM9D2`.
**Branching:** on the Website Intake custom fields, not on tags. Biggest Friction (`5P4t9QZM7l2nVSf2N1m6`) picks the door. Payroll Provider (`ioUxcZEZUtWdOrNcGN7z`) gates the Paychex introduction.

The form is the start of a sequence, not the end of one. Every step below is a GHL workflow action. Total build time in GHL is under an hour once the copy is pasted.

---

## The sequence

| Step | Delay | Action | Condition |
|---|---|---|---|
| 1 | 0 | Add to Employer pipeline, stage New. Assign by round-robin or existing owner. | Always |
| 2 | 0 | Internal notification to assigned broker: SMS and email with the four intake answers. | Always |
| 3 | 0 | Email 1 to lead, from assigned broker. | Always |
| 4 | 5 min, business hours | Task for broker: call. If no answer, send SMS A. | Always |
| 5 | Day 1 | Email 2, branched by Biggest Friction. | Always |
| 6 | Day 3 | Email 3, branched by Biggest Friction. | Always |
| 7 | Day 5 | Task: follow-up call. SMS B if unreached. | Always |
| 8 | Day 7 | Email 4, the Paychex introduction. | Only if Biggest Friction = payroll/HR, or Payroll Provider ≠ Paychex |
| 9 | Day 10 | Email 5, the last note. Remove from sequence. | Always |
| Exit | Any | Appointment booked → exit, booking sequence takes over. Reply received → pause, notify broker. Unsubscribe → exit. | Always |

Business hours: 8am to 6pm Pacific, Monday to Friday. Emails send at 9:15am local. SMS only within business hours.

---

## Internal notification (Step 2)

**SMS to broker:**
New employer lead: {{contact.first_name}} {{contact.last_name}}, {{contact.company_name}}. Industry: {{contact.industry}}. Employees: {{contact.employee_count}}. Friction: {{contact.biggest_friction}}. Payroll: {{contact.payroll_provider}}. Call within the hour. {{contact.phone}}

**Email to broker, subject:** New employer lead · {{contact.company_name}} · {{contact.biggest_friction}}

Same four fields in the body, plus the Landing Page and UTM note, plus a link to the contact record.

---

## Email 1 — Confirmation (Step 3, instant)

**Subject:** Got it. Here's what happens next.

Hi {{contact.first_name}},

Your form came through. I'm {{user.first_name}}, the broker who'll be calling you.

Here's what to expect. I'll call within the hour during business hours. The call is twenty minutes. I'll ask a few questions about how {{contact.company_name}} is built, then tell you which of the four doors actually apply to you and which don't. If nothing applies, I'll say that too.

If you'd rather pick the time yourself: {{booking_link}}

Nothing to prepare. Bring whatever you know about your payroll and we'll take it from there.

{{user.first_name}}
ProtectHealth · {{user.phone}}
Insurance nerds, not tax professionals. Anything tax-related goes to your CPA before you act.

---

## SMS A (Step 4, after unanswered call)

Hi {{contact.first_name}}, {{user.first_name}} at ProtectHealth. Just tried you about the form you sent. Want to grab a time that works instead? {{booking_link}}

---

## Email 2 — The one-page answer (Step 5, Day 1)

Branched on Biggest Friction. One version sends.

### Branch: The Nevada retirement mandate

**Subject:** The state program vs a 401(k), on one page

Hi {{contact.first_name}},

You said the retirement mandate is the thing on your mind. Here's the short version.

If {{contact.company_name}} has six or more employees and three years in business, Nevada requires you to offer a retirement route. Two ways to do it.

The state program, NEST, is a Roth IRA the employee owns. You run the deduction. You are not permitted to contribute. For 2026 it caps at $7,500.

A 401(k) is your plan. You can match. For 2026 it caps at $24,500 in employee deferrals before your match, and federal credits cover up to 100% of startup costs, capped at $5,000 a year for three years, for employers with 50 or fewer people.

Neither is wrong. They're different tools. The full comparison: https://www.protecthealth.com/blog-post/nevada-retirement-plan-mandate

We'll go through which one fits when we talk.

{{user.first_name}}

### Branch: Tax credits I might be missing

**Subject:** The one-page form most owners have never filed

Hi {{contact.first_name}},

You said you might be missing credits. The most common one in Nevada is the FICA tip credit, and the reason it gets missed is not eligibility.

If your business takes tips, you compute it on Form 8846. One page. It flows onto Form 3800 with your other credits. For thirty years it was a restaurant thing. As of tax years beginning after December 31, 2024, it also reaches barbering, hair, nails, esthetics and spa.

Two things people get wrong. A loss year doesn't kill it, the credit carries forward twenty years. And no PEO claims it for you, federal regulation puts it on your return.

What your payroll needs to capture so it's computable: https://www.protecthealth.com/blog-post/tipped-payroll-mistakes-las-vegas

Take it to your CPA. We'll talk about the rest.

{{user.first_name}}

### Branch: Benefits I can't afford to offer

**Subject:** Pre-tax premiums cut your payroll tax too

Hi {{contact.first_name}},

You said benefits feel out of reach. Before we talk cost, here's the mechanism most small employers miss.

When health premiums come out of payroll pre-tax under a Section 125 plan, the employer's own FICA and FUTA fall with the employee's taxable wages. You save on the same dollars the employee saves on. Most small employers deduct premiums after tax because nobody set up the document.

What it's worth at 2026 rates: https://www.protecthealth.com/blog-post/section-125-plan-employer-payroll-tax-savings

That's one of four doors. We'll walk the other three on the call.

{{user.first_name}}

### Branch: Payroll and HR taking too much time · Hiring and keeping people

**Subject:** What a PEO actually changes, and what it doesn't

Hi {{contact.first_name}},

You said payroll and HR are eating time. Here's the honest version of what a PEO does.

It takes payroll processing, employment tax remittance, benefits administration and HR support off your desk. A certified PEO becomes the employer for employment tax liability. If they collect your payroll taxes and fail to remit, the IRS pursues them, not you.

What it doesn't do: claim your tax credits for you. Those stay on your return by regulation. What it does do is make your payroll data clean enough to compute them every year.

The plain-English explainer: https://www.protecthealth.com/paychex

We'll talk about whether it fits {{contact.company_name}} when we speak.

{{user.first_name}}

---

## Email 3 — The correction (Step 6, Day 3)

**Subject:** The thing your accountant told you that's half right

Hi {{contact.first_name}},

Every door we work has one belief attached to it that's wrong, and it's usually the reason nothing got done.

For the retirement mandate: that the state program is a benefit you offer. It isn't. It's a deduction you run, and you can't put money in.

For the tip credit: that a loss year disqualifies you. It doesn't. The credit parks and carries forward twenty years.

For Section 125: that it only helps the employee. It cuts your FICA too.

For a PEO: that it claims your credits for you. Federal regulation puts them on your return.

None of these are advice. They're the starting facts, with sources, so the call is about your situation and not about definitions.

Twenty minutes: {{booking_link}}

{{user.first_name}}

---

## SMS B (Step 7, Day 5, if unreached)

{{contact.first_name}}, {{user.first_name}} again. Still happy to do the twenty minutes whenever it suits. No pitch, just which doors apply. {{booking_link}}

---

## Email 4 — Paychex introduction (Step 8, Day 7, branched)

Uses the Paychex Channel Partner Marketing Portal's approved second template, verbatim, with Fred in the rep slot. Lane A.

**Subject:** Elevate your HR support with Paychex

Hi {{contact.first_name}},

I'm reaching out with some exciting news! I've recently teamed up with Paychex to provide even better HR support for my clients. I'd like to introduce you to Fred Simonds, a small business consultant assisting us. Paychex can provide comprehensive HR support for payroll, training, recruiting, performance management, and more.

I recommend scheduling a benchmark comparison with Fred to ensure you have access to the best possible solutions. This will allow you to assess your current HR needs and explore your options. There's no obligation or pressure to move forward right away. I'm here as your trusted advisor to help you find what works best for your unique goals and challenges.

What's your availability next week to have a quick introductory conversation? I'd love to chat with you and answer any questions you may have.

Thanks,
{{user.first_name}}

Fred Simonds · Strategic Business Consultant, Paychex · (702) 203-0063 · fsimonds@paychex.com
Or go straight to Paychex: https://paychex.my.salesforce-sites.com/PaychexReferral?CustomerForm=true&PartnerId=461541

*Legal footer on this email only:* Professional employer organization (PEO) services provided by Paychex Business Solutions, LLC (Florida employee leasing license GL7), Oasis Outsourcing, LLC (Florida employee leasing license GL42), and their affiliates, which are licensed or registered to provide PEO services where required by law.

---

## Email 5 — Last note (Step 9, Day 10)

**Subject:** Last one from me

Hi {{contact.first_name}},

I'll stop here. If the timing wasn't right, no problem, the offer stands whenever it is. Twenty minutes, no pitch, and you leave knowing which of the four doors apply to {{contact.company_name}} and what to ask your CPA.

{{booking_link}}

Or just reply to this and I'll call.

{{user.first_name}}
ProtectHealth · {{user.phone}}

---

## Build notes

Every email renders in the existing ProtectHealth client email shell: navy brand bar with the logo, headline, body, broker card on the blue accent rule, navy footer with the address and unsubscribe. Sender resolves from the assigned agent. House identity if unassigned.

`{{booking_link}}` is the assigned broker's calendar URL with `?skip=qualify` so a lead who already answered the four questions is not asked again.

Email 4 is the only one carrying Paychex language and is the only one that needs the PEO legal footer. Keep it off the other four so they stay entirely in ProtectHealth's voice.

Every link carries `utm_source=email&utm_medium=sequence&utm_campaign=ph-paychex&utm_content=e1..e5` so a booking can be traced to the email that produced it.

Suppress from all campaign ad audiences the moment the form submits. Nobody should see a retargeting ad for something they already opted into.
