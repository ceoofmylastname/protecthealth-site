// Cloudflare Pages Function — mirrors netlify/functions/lead.mjs. Env vars set in
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
  // Contact page — every "Talk To A Broker" button on the site lands here
  general: {
    tags: ['talk-to-a-broker', 'source:website'],
    oppPrefix: 'Talk To A Broker',
  },
  quote: {
    tags: ['quote-request', 'source:website'],
    oppPrefix: 'Quote Request',
  },
};

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
        body: `Website form (${formId}) — ${new Date().toISOString()}\n\n${lines.join('\n')}`,
      });
    }

    // 3. Opportunity in the ProtectHealth pipeline
    await ghl('/opportunities/', 'POST', token, {
      locationId: LOCATION_ID,
      pipelineId: PIPELINE_ID,
      pipelineStageId: STAGE_NEW_LEAD,
      contactId,
      name: `${campaign.oppPrefix} — ${fullName || email || phone}`,
      status: 'open',
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
