# Opt-In Automation — Paychex Campaign

**Runs on:** the ProtectHealth CRM, Supabase project `hrzonmnswzwridwqbspb`. No third-party marketing tool in the path.
**Trigger:** a row in `ph_leads` with Source Form `employers` and Landing Page `/payroll-tax-asset`.
**Branching:** on the Biggest Friction intake field. Payroll Provider gates the Paychex introduction.

---

## What already exists and carries the sequence

| Piece | Status | Role here |
|---|---|---|
| `/api/lead` → `ph_leads` | Live | Intake. Four employer answers land as real fields. |
| Round robin at intake, `ph_round_robin`, `ph_opportunities` | Built, rotation needs rows | Assigns the broker, opens the deal at New Lead. |
| `/app` agent dashboard | Live | Broker sees the lead and the answers. |
| `ph-booking-emails` | Live | Prospect confirmation, house ops alert three minutes later. |
| `ph-lead-ttl` | Live, every five minutes | Reassigns after one untouched hour. |
| `ph_campaigns` + `ph_email_templates` + `ph-send-campaigns` | Live | Every email in the sequence is a campaign row. |
| `ph-followup-digest` | Live, 7 AM | Broker's daily list until the deal moves. |
| `ph_trigger_links` + `ph-click` | Live | Every link attributed to the email and contact. |
| `ph-unsubscribe` | Live | One-click, honoured locally first. |
| SMS | Not built | Twilio and A2P are last in the CRM plan. |

## What has to be added

Four campaign rows and one audience rule. Each row uses the existing shape: copy fields, `offset_days` from the lead's created date, `send_hour_local` 9, and an audience expression on the intake field. The sequence is data. Nothing deploys.

| Row | Offset | Audience |
|---|---|---|
| paychex-e2-retirement | 1 | friction = The retirement mandate |
| paychex-e2-tips | 1 | friction = Credits I might be missing |
| paychex-e2-benefits | 1 | friction = Benefits I can't afford |
| paychex-e2-payroll | 1 | friction = Payroll and HR time, or Hiring and keeping people |
| paychex-e3 | 3 | all campaign leads |
| paychex-e4 | 7 | friction is payroll or HR, or payroll provider is not Paychex |
| paychex-e5 | 10 | all campaign leads |

Exit: a row in `ph_appointments` for the contact stops the sequence. Unsubscribe stops it. A won or lost disposition stops it.

The prospect confirmation (email 1) is the existing booking-emails confirmation, reworded for a form lead rather than a booking.

---

## Email 1 — Confirmation, instant

**Subject:** Got it. Here's what happens next.

Hi {{first_name}},

Your form came through. I'm {{agent_first_name}}, the broker who'll be calling you.

I'll call within the hour during business hours. The call is twenty minutes. I'll ask a few questions about how {{company}} is built, then tell you which of the four doors apply to you and which don't. If nothing applies, I'll say that too.

Rather pick the time yourself? {{booking_link}}

Nothing to prepare.

{{agent_first_name}}
ProtectHealth · {{agent_phone}}
Insurance nerds, not tax professionals. Anything tax-related goes to your CPA before you act.

---

## Email 2 — The one-page answer, Day 1, branched

### Retirement
**Subject:** The state program vs a 401(k), on one page

Hi {{first_name}},

You said the retirement mandate is the thing on your mind. Here's the short version.

If {{company}} has six or more employees and three years in business, Nevada requires you to offer a retirement route. Two ways to do it.

The state program, NEST, is a Roth IRA the employee owns. You run the deduction. You are not permitted to contribute. For 2026 it caps at $7,500.

A 401(k) is your plan. You can match. For 2026 it caps at $24,500 in employee deferrals before your match, and federal credits cover up to 100% of startup costs, capped at $5,000 a year for three years, for employers with 50 or fewer people.

Neither is wrong. They're different tools. The full comparison: https://www.protecthealth.com/blog-post/nevada-retirement-plan-mandate

{{agent_first_name}}

### Tips
**Subject:** The one-page form most owners have never filed

Hi {{first_name}},

You said you might be missing credits. The most common one in Nevada is the FICA tip credit, and the reason it gets missed is not eligibility.

If your business takes tips, you compute it on Form 8846. One page. For thirty years it was a restaurant thing. As of tax years beginning after December 31, 2024, it also reaches barbering, hair, nails, esthetics and spa.

Two things people get wrong. A loss year doesn't kill it; the credit carries forward twenty years. And no PEO claims it for you; federal regulation puts it on your return.

What your payroll needs to capture: https://www.protecthealth.com/blog-post/tipped-payroll-mistakes-las-vegas

Take it to your CPA. We'll talk about the rest.

{{agent_first_name}}

### Benefits
**Subject:** Pre-tax premiums cut your payroll tax too

Hi {{first_name}},

You said benefits feel out of reach. Before we talk cost, here's the mechanism most small employers miss.

When health premiums come out of payroll pre-tax under a Section 125 plan, the employer's own FICA and FUTA fall with the employee's taxable wages. You save on the same dollars the employee saves on. Most small employers deduct after tax because nobody set up the document.

What it's worth at 2026 rates: https://www.protecthealth.com/blog-post/section-125-plan-employer-payroll-tax-savings

{{agent_first_name}}

### Payroll and HR
**Subject:** What a PEO actually changes, and what it doesn't

Hi {{first_name}},

You said payroll and HR are eating time. Here's the honest version of what a PEO does.

It takes payroll processing, employment tax remittance, benefits administration and HR support off your desk. A certified PEO becomes the employer for employment tax liability. If they collect your payroll taxes and fail to remit, the IRS pursues them, not you.

What it doesn't do: claim your tax credits for you. Those stay on your return by regulation. What it does do is make your payroll data clean enough to compute them every year.

The plain-English explainer: https://www.protecthealth.com/paychex

{{agent_first_name}}

---

## Email 3 — The correction, Day 3

**Subject:** The thing your accountant told you that's half right

Hi {{first_name}},

Every door we work has one belief attached to it that's wrong, and it's usually the reason nothing got done.

For the retirement mandate: that the state program is a benefit you offer. It isn't. It's a deduction you run, and you can't put money in.

For the tip credit: that a loss year disqualifies you. It doesn't. The credit parks and carries forward twenty years.

For Section 125: that it only helps the employee. It cuts your FICA too.

For a PEO: that it claims your credits for you. Federal regulation puts them on your return.

None of these are advice. They're the starting facts, with sources, so the call is about your situation and not about definitions.

Twenty minutes: {{booking_link}}

{{agent_first_name}}

---

## Email 4 — Paychex introduction, Day 7, filtered

Verbatim from the Paychex Channel Partner Marketing Portal, second template, with Fred in the rep slot. Lane A. Only email in the sequence carrying the PEO legal footer.

**Subject:** Elevate your HR support with Paychex

Hi {{first_name}},

I'm reaching out with some exciting news! I've recently teamed up with Paychex to provide even better HR support for my clients. I'd like to introduce you to Fred Simonds, a small business consultant assisting us. Paychex can provide comprehensive HR support for payroll, training, recruiting, performance management, and more.

I recommend scheduling a benchmark comparison with Fred to ensure you have access to the best possible solutions. This will allow you to assess your current HR needs and explore your options. There's no obligation or pressure to move forward right away. I'm here as your trusted advisor to help you find what works best for your unique goals and challenges.

What's your availability next week to have a quick introductory conversation? I'd love to chat with you and answer any questions you may have.

Thanks,
{{agent_first_name}}

Fred Simonds · Strategic Business Consultant, Paychex · (702) 203-0063 · fsimonds@paychex.com
Or go straight to Paychex: https://paychex.my.salesforce-sites.com/PaychexReferral?CustomerForm=true&PartnerId=461541

Professional employer organization (PEO) services provided by Paychex Business Solutions, LLC (Florida employee leasing license GL7), Oasis Outsourcing, LLC (Florida employee leasing license GL42), and their affiliates, which are licensed or registered to provide PEO services where required by law.

---

## Email 5 — Last note, Day 10

**Subject:** Last one from me

Hi {{first_name}},

I'll stop here. If the timing wasn't right, no problem, the offer stands whenever it is. Twenty minutes, no pitch, and you leave knowing which of the four doors apply to {{company}} and what to ask your CPA.

{{booking_link}}

Or reply to this and I'll call.

{{agent_first_name}}
ProtectHealth · {{agent_phone}}

---

## Build notes

Every email renders in the existing shell: navy brand bar, headline, body, broker card on the blue rule, navy footer with address and one-click unsubscribe. Sends from the house address with the assigned broker as reply-to and in the signature; house identity if unassigned.

`{{booking_link}}` is the assigned broker's calendar with `?skip=qualify` so the lead is not asked the four questions twice.

Every link is a trigger link with `utm_source=email&utm_medium=sequence&utm_campaign=ph-paychex&utm_content=e1..e5`.

Suppress the contact from every campaign ad audience the moment the form submits.

Before launch: the round-robin rotation needs rows. It has zero today, so nothing assigns until at least one broker is in it.
