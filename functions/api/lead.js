// Cloudflare Pages Function (Netlify mirror deleted Aug 7 2026). Env vars set in
// Cloudflare Pages dashboard: GHL_API_TOKEN
// Lead intake → GoHighLevel.
// Creates/updates the contact, tags it by campaign, attaches the full form
// answers as a note, and opens an opportunity in the ProtectHealth pipeline.
// Requires env var GHL_API_TOKEN (GHL Private Integration token with
// contacts.write + opportunities.write scopes). Set it in Netlify → Site
// configuration → Environment variables, then redeploy.

const GHL_BASE = 'https://services.leadconnectorhq.com';
const GHL_VERSION = '2021-07-28';
const LOCATION_ID = 'nF7RwerbB5hn27XaM9D2';

// ProtectHealth New Lead/Client pipeline
const PIPELINE_ID = 'u24rkrB1oRJhb8cZnZvF';
const STAGE_NEW_LEAD = '46900ce3-750b-4d41-a1d4-a79d014a784b';

const CAMPAIGNS = {
  ichra: {
    tags: ['campaign:ichra', 'strategy-over-product', 'source:website'],
    oppPrefix: 'ICHRA Strategy Call',
  },
  employers: {
    tags: ['campaign:paychex', 'more-than-your-group-plan', 'source:website'],
    oppPrefix: 'Employer Strategy Call',
  },
  // Contact page, every "Talk To A Broker" button on the site lands here
  general: {
    tags: ['talk-to-a-broker', 'source:website'],
    oppPrefix: 'Talk To A Broker',
  },
  quote: {
    tags: ['quote-request', 'source:website'],
    oppPrefix: 'Quote Request',
  },
};

// ── Website Intake custom fields ─────────────────────────────────────────────
// Created in GHL on 2026-07-25 under the "Website Intake" folder. Ids rather
// than keys, because /contacts/upsert resolves ids without a second lookup.
// Keep this block byte-identical in lead.js, book.js, lead-magnet.js and their
// this file. Keep the three handlers' copies identical.
const CF = {
  role:        'KFgNfn7tOxlTCmvjvTNj', // Website Intake: Which Best Describes You
  structure:   'hN30YvoSCFjYZyl2WYzc', // Website Intake: Business Structure
  coverage:    'j39bQETsnhN3IHgHl6eA', // Website Intake: Current Coverage
  priority:    'XAWgGwWLHnw4qQLUNAVv', // Website Intake: What Matters Most
  notes:       'p9xHNA0ev7CyVgwriRXU', // Website Intake: Notes From Lead
  timezone:    '2zyAtyCO5Xd1QKfRLCVI', // Website Intake: Visitor Timezone
  industry:    'wDaeieEvNZtIDU419r2T', // Website Intake: Industry
  employees:   'lecOVPOTtfw5PLObZjYQ', // Website Intake: Employee Count
  friction:    '5P4t9QZM7l2nVSf2N1m6', // Website Intake: Biggest Friction
  payroll:     'ioUxcZEZUtWdOrNcGN7z', // Website Intake: Payroll Provider
  sourceForm:  '2u611YcsKF5hCczUvpMw', // Website Intake: Source Form
  page:        'gz9zZmpnqjpJYm6ig9nU', // Website Intake: Landing Page
  appointment: 'TkMZgKyFxOvXOpJZ0Jji', // Website Intake: Appointment Time
  magnet:      'ES17xjYL7S5hOepLnXGj', // Website Intake: Lead Magnet
};

// Every form asks "which best describes you" under a different key: the ICHRA
// page calls it profile, the quote and contact pages call it interest, the
// booking page calls it role. One column, three spellings.
const ROLE_KEYS = ['role', 'profile', 'interest'];

// Builds the customFields array for an upsert. Blank answers are dropped rather
// than sent as '', because /contacts/upsert merges what it receives, a lead who
// books after filling a shorter form keeps the answers the longer form captured.
function intakeFields(data, extra = {}) {
  const merged = { ...data, ...extra };
  const clean = (v) => String(v ?? '').trim();
  const role = ROLE_KEYS.map((k) => clean(merged[k])).find((v) => v !== '');
  return [
    [CF.role, role],
    [CF.structure, merged.structure],
    [CF.coverage, merged.coverage],
    [CF.priority, merged.priority],
    [CF.notes, merged.notes],
    [CF.timezone, merged.timezone],
    [CF.industry, merged.industry],
    [CF.employees, merged.employees],
    [CF.friction, merged.friction],
    [CF.payroll, merged.payroll],
    [CF.sourceForm, merged.sourceForm],
    [CF.page, merged.page],
    [CF.appointment, merged.appointmentTime],
    [CF.magnet, merged.magnet],
  ]
    .filter(([, value]) => clean(value) !== '')
    .map(([id, value]) => ({ id, field_value: clean(value) }));
}


// Supabase (ProtectHealth Ticketing System), mirrors form submissions into
// ph_leads so they show up in the admin dashboard alongside real bookings.
// Requires env var PH_HOOK_SECRET. Non-fatal by design.
const PH_HOOK = 'https://hrzonmnswzwridwqbspb.supabase.co/functions/v1/ph-booking-emails';

async function recordLead(secret, payload) {
  if (!secret) return;
  try {
    const res = await fetch(PH_HOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-ph-secret': secret },
      body: JSON.stringify({ action: 'record', kind: 'form', ...payload }),
    });
    if (!res.ok) console.error('ph record failed:', res.status, (await res.text()).slice(0, 200));
  } catch (err) {
    console.error('ph record error:', err.message);
  }
}

async function ghl(path, method, token, body) {
  const res = await fetch(`${GHL_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Version: GHL_VERSION,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch { /* non-JSON error body */ }
  if (!res.ok) {
    throw new Error(`GHL ${method} ${path} -> ${res.status}: ${text.slice(0, 300)}`);
  }
  return json;
}

export async function onRequestPost(context) {
  const req = context.request;
  const env = context.env;
  const token = env.GHL_API_TOKEN;
  if (!token) {
    return new Response(JSON.stringify({ error: 'GHL_API_TOKEN not configured' }), { status: 500 });
  }

  let data;
  try { data = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const formId = String(data.source || 'general');
  const campaign = CAMPAIGNS[formId] || CAMPAIGNS.general;

  // Forms send first_name/last_name; fall back to splitting a legacy full name.
  let firstName = String(data.first_name || '').trim();
  let lastName = String(data.last_name || '').trim();
  if (!firstName && data.name) {
    const fullName = String(data.name).trim();
    firstName = fullName.split(/\s+/)[0] || '';
    lastName = fullName.split(/\s+/).slice(1).join(' ') || '';
  }
  const fullName = [firstName, lastName].filter(Boolean).join(' ');
  const email = String(data.email || '').trim();
  const phone = String(data.phone || '').trim();
  if (!email && !phone) {
    return new Response(JSON.stringify({ error: 'Email or phone required' }), { status: 400 });
  }

  try {
    // 1. Upsert contact (dedupes on email/phone)
    const upsert = await ghl('/contacts/upsert', 'POST', token, {
      locationId: LOCATION_ID,
      firstName,
      lastName,
      email: email || undefined,
      phone: phone || undefined,
      companyName: data.business ? String(data.business) : undefined,
      tags: campaign.tags,
      source: `website:${formId}`,
      // Every answer the form collected, into its own segmentable field.
      customFields: intakeFields(data, { sourceForm: formId }),
    });
    const contactId = upsert?.contact?.id;
    if (!contactId) throw new Error('No contact id returned from upsert');

    // 2. Note with the full form answers (skip core identity fields)
    const skip = new Set(['name', 'first_name', 'last_name', 'email', 'phone', 'source']);
    const lines = Object.entries(data)
      .filter(([k, v]) => !skip.has(k) && String(v || '').trim() !== '')
      .map(([k, v]) => `${k}: ${String(v).trim()}`);
    if (lines.length) {
      await ghl(`/contacts/${contactId}/notes`, 'POST', token, {
        body: `Website form (${formId}), ${new Date().toISOString()}\n\n${lines.join('\n')}`,
      });
    }

    // 3. Opportunity in the ProtectHealth pipeline
    await ghl('/opportunities/', 'POST', token, {
      locationId: LOCATION_ID,
      pipelineId: PIPELINE_ID,
      pipelineStageId: STAGE_NEW_LEAD,
      contactId,
      name: `${campaign.oppPrefix}, ${fullName || email || phone}`,
      status: 'open',
    });

    // Mirror to Supabase for the admin dashboard. No emails are queued for a
    // form submission. There is no appointment to remind anyone about.
    await recordLead(env.PH_HOOK_SECRET, {
      // The owner-sync sweep in Supabase matches on this. Without it a form
      // lead has no join key and its assigned broker never reaches the
      // dashboard, however long it waits.
      ghl_contact_id: contactId,
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      role: data.profile ?? data.interest ?? data.role ?? null,
      structure: data.structure ?? null,
      coverage: data.coverage ?? null,
      priority: data.priority ?? null,
      notes: data.notes ?? null,
      source_form: formId,
      page: data.page ?? null,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('lead function error:', err.message);
    return new Response(JSON.stringify({ error: 'Lead submission failed' }), { status: 502 });
  }
}
