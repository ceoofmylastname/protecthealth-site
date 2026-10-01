// healthlinknevada.com booking.
//
//   POST { action: 'profile' }                                   -> the broker card (name, photo, length)
//   POST { action: 'slots' }                                     -> open slots on the HLN broker's calendar
//   POST { action: 'book', start_at, name, email, phone, notes } -> books it
//
// Every booking from healthlinknevada.com lands on ONE broker's calendar. The
// broker is ph_private_config.hln_agent_id (Jason Vasquez as of Oct 1 2026), read
// here on the server, so the page cannot be pointed at anyone else by editing a
// request. The actual booking is delegated to ph-book: same slot rules, same
// Google Calendar check and write-back, same client confirmation and broker
// alert. This function only adds what is specific to the site:
//   - ph_appointments.source = 'healthlinknevada' (what /admin/healthlink lists)
//   - the contact is tagged 'healthlinknevada.com' (office tag) with that source
//   - an entry in the admin notification feed

import { createClient } from 'jsr:@supabase/supabase-js@2';

const URL_ = Deno.env.get('SUPABASE_URL')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const db = createClient(URL_, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const FALLBACK_AGENT = '01066b45-09b0-44f1-a030-5a99f0cbcf3b';
const TAG = 'healthlinknevada.com';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json', ...CORS } });

async function agentId(): Promise<string> {
  const { data } = await db.from('ph_private_config').select('value').eq('key', 'hln_agent_id').maybeSingle();
  const v = String(data?.value ?? '').replace(/"/g, '').trim();
  return /^[0-9a-f-]{36}$/i.test(v) ? v : FALLBACK_AGENT;
}

async function phBook(body: Record<string, unknown>) {
  const r = await fetch(`${URL_}/functions/v1/ph-book`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: `Bearer ${ANON}` },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, body: j };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  let p: Record<string, any>; try { p = await req.json(); } catch { return json({ error: 'invalid JSON' }, 400); }
  const aid = await agentId();

  try {
    if (p.action === 'profile') {
      const [{ data: a }, { data: s }] = await Promise.all([
        db.from('ph_agents').select('full_name, headshot_url, title, is_active').eq('id', aid).maybeSingle(),
        db.from('ph_agent_scheduling').select('slot_minutes, timezone').eq('agent_id', aid).maybeSingle(),
      ]);
      if (!a?.is_active) return json({ error: 'unavailable' }, 404);
      return json({ ok: true, name: a.full_name, photo: a.headshot_url, title: a.title, slot_minutes: s?.slot_minutes ?? 60, timezone: s?.timezone ?? 'America/Los_Angeles' });
    }

    if (p.action === 'slots') {
      const r = await phBook({ action: 'slots', agent_id: aid });
      return json(r.body, r.status);
    }

    if (p.action === 'book') {
      const r = await phBook({
        action: 'book', agent_id: aid, start_at: p.start_at,
        name: p.name, email: p.email, phone: p.phone,
        notes: [p.notes ? String(p.notes).trim() : '', 'Booked on healthlinknevada.com'].filter(Boolean).join('\n'),
      });
      if (r.status !== 200 || !r.body?.ok) return json(r.body, r.status);

      const apptId = r.body.appointment_id;
      const { data: appt } = await db.from('ph_appointments').update({ source: 'healthlinknevada' }).eq('id', apptId).select('contact_id, invitee_name, start_at').maybeSingle();
      if (appt?.contact_id) {
        const { data: c } = await db.from('ph_contacts').select('tags').eq('ghl_contact_id', appt.contact_id).maybeSingle();
        const tags = Array.from(new Set([...(c?.tags ?? []), TAG]));
        await db.from('ph_contacts').update({ tags, source: TAG }).eq('ghl_contact_id', appt.contact_id);
      }
      const when = new Date(r.body.start_at).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
      try {
        await db.from('ph_admin_notifications').insert({
          kind: 'hln_booked', title: `${String(p.name || 'Someone').trim()} booked on healthlinknevada.com`,
          body: `${when} (Vegas) with ${r.body.agent ?? 'the broker'}`, actor_name: 'healthlinknevada.com',
        });
      } catch (_e) { /* feed is best effort */ }
      return json(r.body);
    }

    return json({ error: 'unknown action' }, 400);
  } catch (e) {
    return json({ error: 'Something went wrong. Please call 1-888-547-5220.', detail: String((e as Error).message).slice(0, 200) }, 500);
  }
});
