// healthlinknevada.com -> Jason Vasquez's booking page, served on its own domain.
//
// Cloudflare Worker attached to healthlinknevada.com and www.healthlinknevada.com
// (Workers & Pages > healthlinknevada > Settings > Domains & Routes).
// It fetches the page from protecthealth.com/healthlinknevada and returns it
// as healthlinknevada.com, so the address bar never changes. Only the page and
// the files it needs are passed through; any other path goes back to the home
// page, so this domain can't be used to browse protecthealth.com.

const ORIGIN = 'https://www.protecthealth.com';
const HOME = 'https://healthlinknevada.com/';
const PASS = (p) => p.startsWith('/_astro/') || p.startsWith('/assets/') || p === '/favicon.ico' || p === '/favicon.png';

export default {
  async fetch(req) {
    const u = new URL(req.url);

    // www -> bare domain
    if (u.hostname !== 'healthlinknevada.com') return Response.redirect(HOME + u.search.replace(/^\?$/, ''), 301);

    let path = u.pathname;
    if (path === '/' || path === '/index.html') path = '/healthlinknevada';
    else if (!PASS(path)) return Response.redirect(HOME, 301);

    const r = await fetch(ORIGIN + path + u.search, {
      headers: { 'User-Agent': req.headers.get('User-Agent') || 'healthlinknevada-worker', Accept: req.headers.get('Accept') || '*/*' },
      cf: { cacheTtl: path === '/healthlinknevada' ? 300 : 86400, cacheEverything: true },
    });

    const res = new Response(r.body, r);
    res.headers.delete('Set-Cookie');
    if (path === '/healthlinknevada') res.headers.set('Cache-Control', 'public, max-age=300');
    return res;
  },
};
