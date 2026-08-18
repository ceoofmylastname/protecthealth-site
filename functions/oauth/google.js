// Google OAuth landing point, on OUR domain.
//
// Google shows the host of the redirect URI on its consent screen, so with the
// callback pointed straight at the Supabase function the broker was asked to
// "Go to hrzonmnswzwridwqbspb.supabase.co (unsafe)" — a hostname with no
// obvious relationship to ProtectHealth, on the one screen where we are asking
// them to hand over access to their calendar.
//
// This is more than cosmetic. Google will not verify an OAuth app unless every
// authorized domain, redirect URIs included, is a domain the developer has
// proven they own in Search Console. supabase.co cannot be proven, so while the
// callback lived there the app could never stop showing the unverified-app
// warning or escape the 100-user lifetime cap.
//
// All this does is hand Google's ?code=&state= to ph-gcal and pass its redirect
// straight back. The token exchange, the state check and the refresh token all
// still happen server-side in the edge function; nothing secret passes through
// here. ph-gcal must send this exact URL as redirect_uri in BOTH the
// authorization request and the token exchange, or Google rejects the exchange.

const UPSTREAM = 'https://hrzonmnswzwridwqbspb.supabase.co/functions/v1/ph-gcal';

export async function onRequestGet({ request }) {
  const target = new URL(UPSTREAM);
  target.search = new URL(request.url).search;

  let upstream;
  try {
    // redirect: 'manual' matters. ph-gcal answers with a 302 back into /app and
    // the default 'follow' would chase it here on the server, returning the
    // dashboard HTML from this URL instead of moving the browser.
    upstream = await fetch(target.toString(), { method: 'GET', redirect: 'manual' });
  } catch (_e) {
    return Response.redirect('https://www.protecthealth.com/app?gcal=error&why=unreachable#availability', 302);
  }

  const location = upstream.headers.get('Location');
  if (upstream.status >= 300 && upstream.status < 400 && location) {
    return new Response(null, { status: 302, headers: { Location: location, 'Cache-Control': 'no-store' } });
  }

  // Anything else means ph-gcal errored before it could redirect. Send the
  // broker somewhere with a visible explanation rather than leaving them on a
  // blank page holding a raw JSON body.
  return new Response(null, {
    status: 302,
    headers: {
      Location: 'https://www.protecthealth.com/app?gcal=error&why=' + encodeURIComponent('callback ' + upstream.status) + '#availability',
      'Cache-Control': 'no-store',
    },
  });
}
