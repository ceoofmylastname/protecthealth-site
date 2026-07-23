// Cloudflare Pages Function — mirrors netlify/functions/lead-magnet.mjs. Env vars set in
// Cloudflare Pages dashboard: GHL_API_TOKEN, RESEND_API_KEY, RESEND_FROM
// Lead magnet opt-in → GHL contact + tagged, then Resend delivers the PDF email.
// Env vars (Netlify → Site configuration → Environment variables):
//   GHL_API_TOKEN  - existing GHL Private Integration token
//   RESEND_API_KEY - Resend API key
//   RESEND_FROM    - optional, e.g. "ProtectHealth <guides@protecthealth.com>"
//                    (domain must be verified in Resend; defaults below)

const GHL_BASE = 'https://services.leadconnectorhq.com';
const GHL_VERSION = '2021-07-28';
const LOCATION_ID = 'nF7RwerbB5hn27XaM9D2';
const PIPELINE_ID = 'u24rkrB1oRJhb8cZnZvF';
const STAGE_NEW_LEAD = '46900ce3-750b-4d41-a1d4-a79d014a784b';
let SITE_URL = 'https://www.protecthealth.com'; // overridden per-request below to the serving origin

const MAGNETS = {
  'self-employed-playbook': {
    tags: ['campaign:ichra', 'lead-magnet', 'magnet:self-employed-playbook', 'source:website'],
    oppPrefix: 'Playbook Download',
    file: '/guides/protecthealth-self-employed-playbook.pdf',
    title: 'The Nevada Self-Employed Health Coverage Playbook',
    intro: 'Here is your playbook. The five doors to coverage when nobody hands you a benefits packet, the worst-case math, and the six questions that make you impossible to oversell.',
    cta: 'https://www.protecthealth.com/self-employed',
    ctaLabel: 'Book Your Free 20-Minute Strategy Conversation',
  },
  'employer-scorecard': {
    tags: ['campaign:paychex', 'lead-magnet', 'magnet:employer-scorecard', 'source:website'],
    oppPrefix: 'Scorecard Download',
    file: '/guides/protecthealth-employer-scorecard.pdf',
    title: "The Las Vegas Employer's Back-Office Scorecard",
    intro: 'Here is your scorecard. The Nevada payroll rules national playbooks get wrong, the tip credit most operators never claim, and the 12-point audit to run on your own back office tonight.',
    cta: 'https://www.protecthealth.com/employers',
    ctaLabel: 'Book Your Free Employer Strategy Conversation',
  },
};

async function ghl(path, method, token, body) {
  const res = await fetch(`${GHL_BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, Version: GHL_VERSION, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch {}
  if (!res.ok) throw new Error(`GHL ${method} ${path} -> ${res.status}: ${text.slice(0, 200)}`);
  return json;
}

function emailHtml(m, firstName) {
  const pdfUrl = `${SITE_URL}${m.file}`;
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f2f7fb;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f7fb;padding:28px 12px;"><tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden;">
      <tr><td style="background:linear-gradient(135deg,#081d3d,#0f3567);padding:34px 36px;">
        <p style="margin:0;color:#8ec9ff;font-size:11px;font-weight:bold;letter-spacing:2.5px;text-transform:uppercase;">ProtectHealth &middot; Las Vegas</p>
        <h1 style="margin:10px 0 0;color:#ffffff;font-size:26px;line-height:1.2;">${m.title}</h1>
      </td></tr>
      <tr><td style="padding:30px 36px 8px;">
        <p style="margin:0 0 14px;color:#16283c;font-size:16px;line-height:1.6;">${firstName ? `${firstName}, here` : 'Here'} it is, as promised.</p>
        <p style="margin:0 0 20px;color:#5a6f85;font-size:14.5px;line-height:1.65;">${m.intro}</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 8px;"><tr><td style="border-radius:99px;background:linear-gradient(120deg,#197bff,#19c8ff);">
          <a href="${pdfUrl}" style="display:inline-block;padding:15px 34px;color:#ffffff;font-size:16px;font-weight:bold;text-decoration:none;border-radius:99px;">Download Your PDF &rarr;</a>
        </td></tr></table>
        <p style="margin:8px 0 22px;text-align:center;color:#9ab0c6;font-size:12px;">Direct link: <a href="${pdfUrl}" style="color:#197bff;">${pdfUrl}</a></p>
        <div style="border-top:1px solid #e2e9f1;padding-top:20px;">
          <p style="margin:0 0 10px;color:#16283c;font-size:14.5px;line-height:1.6;"><b>When you finish reading:</b> the whole point of the guide is the 20-minute conversation it prepares you for. Free, no pitch, and if what you already have is right, that is exactly what you will hear.</p>
          <p style="margin:0 0 22px;"><a href="${m.cta}" style="color:#197bff;font-weight:bold;font-size:14.5px;">${m.ctaLabel} &rarr;</a></p>
        </div>
      </td></tr>
      <tr><td style="background:#f2f7fb;padding:20px 36px;border-top:1px solid #e2e9f1;">
        <p style="margin:0;color:#5a6f85;font-size:12px;line-height:1.6;"><b style="color:#0f3567;">ProtectHealth</b> &middot; 2915 W Charleston Blvd Ste 170, Las Vegas, NV &middot; 800-240-8185<br>
        The product should serve the strategy, not become the strategy.<br>
        <span style="color:#9ab0c6;">You received this because you requested this guide at protecthealth.com. ProtectHealth brokers are insurance professionals, not tax professionals.</span></p>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

export async function onRequestPost(context) {
  const req = context.request;
  const env = context.env;
  SITE_URL = new URL(req.url).origin;
  const ghlToken = env.GHL_API_TOKEN;
  const resendKey = env.RESEND_API_KEY;
  if (!ghlToken || !resendKey) {
    return new Response(JSON.stringify({ error: 'Server not configured (GHL_API_TOKEN / RESEND_API_KEY)' }), { status: 500 });
  }

  let data;
  try { data = await req.json(); } catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 }); }

  const magnet = MAGNETS[String(data.magnet || '')];
  const firstName = String(data.first_name || '').trim();
  const lastName = String(data.last_name || '').trim();
  const email = String(data.email || '').trim();
  if (!magnet) return new Response(JSON.stringify({ error: 'Unknown magnet' }), { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return new Response(JSON.stringify({ error: 'Valid email required' }), { status: 400 });

  try {
    // 1. Contact into GHL, tagged by magnet + campaign
    const upsert = await ghl('/contacts/upsert', 'POST', ghlToken, {
      locationId: LOCATION_ID,
      firstName, lastName, email,
      tags: magnet.tags,
      source: `lead-magnet:${data.magnet}`,
    });
    const contactId = upsert?.contact?.id;

    // 2. Opportunity so downloads are visible in the pipeline
    if (contactId) {
      await ghl('/opportunities/', 'POST', ghlToken, {
        locationId: LOCATION_ID, pipelineId: PIPELINE_ID, pipelineStageId: STAGE_NEW_LEAD,
        contactId, name: `${magnet.oppPrefix} — ${firstName || email}`, status: 'open',
      }).catch(() => {}); // duplicate opportunities are non-fatal
    }

    // 3. Email the PDF via Resend
    const from = env.RESEND_FROM || 'ProtectHealth <onboarding@resend.dev>';
    const rres = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [email],
        subject: `Your copy: ${magnet.title}`,
        html: emailHtml(magnet, firstName),
      }),
    });
    if (!rres.ok) {
      const t = await rres.text();
      console.error('Resend error:', rres.status, t.slice(0, 300));
      throw new Error('Email send failed');
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('lead-magnet error:', err.message);
    return new Response(JSON.stringify({ error: 'Delivery failed' }), { status: 502 });
  }
}
