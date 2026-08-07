// Cloudflare Pages Function. Single source of truth: the Netlify mirror was deleted Aug 7 2026.
// Live availability for the Talk To A Broker booking calendar.
//
// GET /api/slots?days=21&tz=America/Los_Angeles
//
// Proxies GoHighLevel's free-slots endpoint so the private integration token
// never reaches the browser. Returns slots grouped by day, already converted
// to the visitor's own timezone, so the calendar UI renders without further math.
//
// Requires env var GHL_API_TOKEN (GHL Private Integration token) with the
// calendars.readonly scope. Same token as /api/lead, add the scope in
// GHL → Settings → Private Integrations, then redeploy.

const GHL_BASE = 'https://services.leadconnectorhq.com';
const GHL_VERSION = '2021-07-28';
const BOOKING_CALENDAR_ID = 'naoB13PMLUxH7fAcVXg0'; // ProtectHealth Consultation
const BUSINESS_TZ = 'America/Los_Angeles';
const MAX_WINDOW_DAYS = 31; // hard cap enforced by the GHL API

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

function isValidTimeZone(tz) {
  if (!tz || typeof tz !== 'string' || tz.length > 64) return false;
  if (!/^[A-Za-z0-9+\-_/]+$/.test(tz)) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export async function onRequestGet(context) {
  const token = context.env.GHL_API_TOKEN;
  if (!token) return json({ error: 'GHL_API_TOKEN not configured' }, 500);

  const url = new URL(context.request.url);

  // Visitor timezone, falling back to the brokerage's own. Anything that fails
  // validation is discarded rather than passed upstream.
  const requested = url.searchParams.get('tz') || '';
  const timezone = isValidTimeZone(requested) ? requested : BUSINESS_TZ;

  let days = parseInt(url.searchParams.get('days') || '21', 10);
  if (!Number.isFinite(days) || days < 1) days = 21;
  days = Math.min(days, MAX_WINDOW_DAYS);

  const start = Date.now();
  const end = start + days * 86400000;

  const qs = new URLSearchParams({
    startDate: String(start),
    endDate: String(end),
    timezone,
  });

  try {
    const res = await fetch(`${GHL_BASE}/calendars/${BOOKING_CALENDAR_ID}/free-slots?${qs}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Version: GHL_VERSION,
        Accept: 'application/json',
      },
    });

    const text = await res.text();
    if (!res.ok) {
      console.error('slots upstream error:', res.status, text.slice(0, 300));
      return json({ error: 'Availability is temporarily unavailable' }, 502);
    }

    const raw = JSON.parse(text);

    // GHL returns { "2026-07-27": { slots: [...] }, traceId: "..." }.
    // Flatten to an ordered array and drop the non-date keys.
    const grouped = Object.entries(raw)
      .filter(([key, value]) => /^\d{4}-\d{2}-\d{2}$/.test(key) && Array.isArray(value?.slots))
      .map(([date, value]) => ({ date, slots: value.slots }))
      .filter((day) => day.slots.length > 0)
      .sort((a, b) => (a.date < b.date ? -1 : 1));

    return json({ timezone, days: grouped }, 200, {
      // Short cache so a burst of page loads doesn't hammer the GHL API,
      // without letting a booked slot linger long enough to matter.
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=120',
    });
  } catch (err) {
    console.error('slots function error:', err.message);
    return json({ error: 'Availability is temporarily unavailable' }, 502);
  }
}
