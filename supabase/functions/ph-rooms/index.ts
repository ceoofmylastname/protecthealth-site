// Room booking side effects.
//
//   POST { action: 'notify', id }   -> email the room admin about one ph_admin_notifications row.
//                                       Fired by pg_net from ph_admin_notifications_email. Idempotent
//                                       on emailed_at, so a retry or a replayed call never double-sends.
//   POST { action: 'seed-photos' }  -> copy any room photo still hotlinked from GoHighLevel's private
//                                       bucket into our public room-photos bucket and repoint the row.
//                                       Only ever touches rooms whose photo is on msgsndr storage.
//
// Recipient: ph_room_settings.notify_email, falling back to ph_settings.house_email (Janet).
// The booking itself lives in the database; this function only reports on it.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const RESEND_KEY = Deno.env.get('RESEND_API_KEY') ?? Deno.env.get('PH_RESEND_API_KEY') ?? '';
const SITE = (Deno.env.get('PH_SITE_URL') ?? 'https://www.protecthealth.com').replace(/\/+$/, '');
const FALLBACK_FROM = 'ProtectHealth <no-reply@insure.protecthealth.com>';
const LOGO = SITE + '/assets/email-logo.png';
const TZ = 'America/Los_Angeles';
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
const esc = (x: unknown) => String(x ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function brandedEmail(headline: string, inner: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#eef3fb;padding:24px 12px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" align="center" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(11,42,74,.10)">
    <tr><td style="padding:24px 28px 18px" align="left"><img src="${LOGO}" alt="ProtectHealth" width="220" style="display:block;height:auto;border:0"></td></tr>
    <tr><td style="height:4px;background:linear-gradient(90deg,#2563c9,#123f6b);font-size:0;line-height:0">&nbsp;</td></tr>
    <tr><td style="padding:28px 30px 30px"><h1 style="margin:0 0 14px;color:#0b2a4a;font-size:22px;line-height:1.25">${headline}</h1>${inner}</td></tr>
  </table>
</body></html>`;
}

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('en-US', { timeZone: TZ, weekday: 'long', month: 'long', day: 'numeric' });
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });

async function notify(id: string) {
  const { data: n } = await db.from('ph_admin_notifications').select('*').eq('id', id).maybeSingle();
  if (!n) return json({ error: 'not found' }, 404);
  if (n.emailed_at) return json({ ok: true, note: 'already emailed' });

  const { data: b } = n.booking_id
    ? await db.from('ph_room_bookings').select('*').eq('id', n.booking_id).maybeSingle()
    : { data: null };
  const [{ data: room }, { data: agent }, { data: rs }, { data: st }] = await Promise.all([
    b ? db.from('ph_rooms').select('name').eq('id', b.room_id).maybeSingle() : Promise.resolve({ data: null }),
    b ? db.from('ph_agents').select('full_name, email, phone').eq('id', b.agent_id).maybeSingle() : Promise.resolve({ data: null }),
    db.from('ph_room_settings').select('notify_email').eq('id', 1).maybeSingle(),
    db.from('ph_settings').select('mail_from, house_email').limit(1).maybeSingle(),
  ]);

  const to = (rs?.notify_email && String(rs.notify_email).trim()) || st?.house_email || '';
  const stamp = new Date().toISOString();
  if (!RESEND_KEY || !to) {
    await db.from('ph_admin_notifications').update({ emailed_at: stamp, email_error: 'no recipient or mail key' }).eq('id', id);
    return json({ ok: false, error: 'no recipient or key' });
  }

  const verb = n.kind === 'room_cancelled' ? 'cancelled' : n.kind === 'room_changed' ? 'changed' : 'booked';
  const color = n.kind === 'room_cancelled' ? '#b91c1c' : n.kind === 'room_changed' ? '#b45309' : '#16803c';
  const row = (k: string, v: string) => v ? `<tr><td style="padding:6px 14px 6px 0;color:#5b6b7c;font-size:14px;white-space:nowrap;vertical-align:top">${k}</td><td style="padding:6px 0;color:#0f172a;font-size:14px">${v}</td></tr>` : '';
  const inner = b ? `
    <p style="margin:0 0 16px;font-size:15px;color:#334155"><span style="display:inline-block;background:${color};color:#fff;font-weight:700;font-size:12px;letter-spacing:.04em;text-transform:uppercase;padding:4px 10px;border-radius:999px">${verb}</span></p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="background:#f6f9fe;border:1px solid #e6edf6;border-radius:12px;padding:12px 16px;width:100%">
      ${row('Room', `<b>${esc(room?.name ?? 'Room')}</b>`)}
      ${row('When', `${esc(fmtDay(b.start_at))}<br>${esc(fmtTime(b.start_at))} &ndash; ${esc(fmtTime(b.end_at))} (Vegas)`)}
      ${row('Booked by', esc(agent?.full_name ?? 'Unknown'))}
      ${row('Agent email', agent?.email ? `<a href="mailto:${esc(agent.email)}" style="color:#2563c9">${esc(agent.email)}</a>` : '')}
      ${row('Agent phone', esc(agent?.phone ?? ''))}
      ${n.actor_name && n.actor_name !== agent?.full_name ? row('Done by', esc(n.actor_name)) : ''}
      ${b.notes ? row('Notes', esc(b.notes)) : ''}
      ${b.cancel_reason ? row('Reason', esc(b.cancel_reason)) : ''}
    </table>
    <p style="margin:20px 0 0"><a href="${SITE}/admin/rooms" style="background:#2563c9;color:#fff;text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600;font-size:14px;display:inline-block">Open Room Bookings</a></p>`
    : `<p style="margin:0;color:#334155;font-size:15px">${esc(n.body ?? '')}</p>`;

  const subject = n.title;
  const from = (st?.mail_from && String(st.mail_from).trim()) || FALLBACK_FROM;
  let ok = false, pid: string | null = null, err: string | null = null;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, html: brandedEmail(esc(n.title), inner), reply_to: agent?.email ?? undefined }),
    });
    const j = await r.json().catch(() => ({}));
    ok = r.ok; pid = (j && j.id) || null; if (!r.ok) err = (j && (j.message || j.name)) || ('resend ' + r.status);
  } catch (e) { err = String((e as Error).message || e); }

  await db.from('ph_admin_notifications').update({ emailed_at: stamp, email_error: err }).eq('id', id);
  try {
    await db.from('ph_email_log').insert({ to_email: to, to_name: 'Room admin', to_role: 'admin', kind: n.kind, subject, status: ok ? 'sent' : 'failed', provider_id: pid, error: err });
  } catch (_e) { /* best effort */ }
  return json({ ok, to, error: err });
}

async function seedPhotos() {
  const { data: rooms } = await db.from('ph_rooms').select('id, name, photo_url').like('photo_url', '%msgsndr%');
  const out: unknown[] = [];
  for (const r of rooms ?? []) {
    try {
      const res = await fetch(r.photo_url);
      if (!res.ok) throw new Error('source ' + res.status);
      const buf = new Uint8Array(await res.arrayBuffer());
      const ext = (r.photo_url.split('.').pop() || 'jpg').toLowerCase().replace('jpeg', 'jpg');
      const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      const path = `${r.id}.${ext}`;
      const { error } = await db.storage.from('room-photos').upload(path, buf, { contentType: type, upsert: true, cacheControl: '31536000' });
      if (error) throw new Error(error.message);
      const url = db.storage.from('room-photos').getPublicUrl(path).data.publicUrl;
      await db.from('ph_rooms').update({ photo_url: url, updated_at: new Date().toISOString() }).eq('id', r.id);
      out.push({ room: r.name, url, bytes: buf.length });
    } catch (e) { out.push({ room: r.name, error: String((e as Error).message) }); }
  }
  return json({ ok: true, items: out });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  let p: Record<string, any>; try { p = await req.json(); } catch { return json({ error: 'invalid JSON' }, 400); }
  try {
    if (p.action === 'notify' && p.id) return await notify(String(p.id));
    if (p.action === 'seed-photos') return await seedPhotos();
    return json({ error: 'unknown action' }, 400);
  } catch (e) { return json({ ok: false, error: String((e as Error).message).slice(0, 300) }, 500); }
});
