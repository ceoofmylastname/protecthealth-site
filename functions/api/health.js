// Deployment and configuration probe. GET /api/health
//
// Exists because diagnosing "the booking failed" took three round trips of
// guessing which commit was live and which secrets had been injected. This
// answers both in one request.
//
// Reports only whether each secret is PRESENT, never its value or length. // length alone can narrow a brute force, and there is no reason to leak it.
// Safe to call publicly and safe to paste into a chat.

export async function onRequestGet(context) {
  const env = context.env;

  // Bumped by hand whenever something lands that is worth confirming reached
  // production. If the deployed build is stale, this string is how you know.
  const BUILD = 'intake-fields-2026-07-25-a';

  const has = (name) => Boolean(env[name] && String(env[name]).length > 0);

  const config = {
    GHL_API_TOKEN: has('GHL_API_TOKEN'),
    RESEND_API_KEY: has('RESEND_API_KEY'),
    RESEND_FROM: has('RESEND_FROM'),
    PH_HOOK_SECRET: has('PH_HOOK_SECRET'),
  };

  // The booking flow needs the first and the last; the rest degrade gracefully.
  const bookingReady = config.GHL_API_TOKEN && config.PH_HOOK_SECRET;

  return new Response(
    JSON.stringify(
      {
        build: BUILD,
        bookingReady,
        config,
        notes: {
          GHL_API_TOKEN: 'required, availability and appointment writes',
          PH_HOOK_SECRET: 'required, records the lead in Supabase and queues the emails',
          RESEND_API_KEY: 'lead-magnet PDFs only; booking emails send from Supabase',
          RESEND_FROM: 'optional here, defaults to the verified insure.protecthealth.com sender',
        },
      },
      null,
      2,
    ),
    { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } },
  );
}
