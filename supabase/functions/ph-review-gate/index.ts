// ph-review-gate
// Server-side gate for /partners/review on protecthealth.com.
//
// Two actions over POST:
//   { action: "verify", code: "123456" }  -> { token, label, exp }
//   { action: "load",   token }           -> { content, assets }
//
// The static page never contains the review content. It contains the gate
// and a renderer. Content and signed asset URLs only leave this function
// after a valid token is presented, so view-source shows nothing.
//
// Secrets (set with `supabase secrets set`):
//   REVIEW_PEPPER        random string, mixed into the code hash
//   REVIEW_TOKEN_SECRET  random string, HMAC key for session tokens
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  provided by the platform
//
// Tables: ph_review_codes, ph_review_attempts (see migration).
// Bucket:  review-assets (private).

import { createClient } from "npm:@supabase/supabase-js@2";
import content from "./content.json" with { type: "json" };

const ALLOWED_ORIGINS = new Set([
  "https://www.protecthealth.com",
  "https://protecthealth.com",
  "http://localhost:4321",
]);

const TOKEN_TTL_S = 60 * 60 * 8; // 8 hours
const SIGNED_URL_TTL_S = 60 * 60; // 1 hour
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const BUCKET = "review-assets";

const enc = new TextEncoder();

function cors(origin: string | null) {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://www.protecthealth.com";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, authorization, apikey",
    "Vary": "Origin",
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
  };
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(origin), "Content-Type": "application/json" },
  });
}

async function sha256Hex(s: string) {
  const d = await crypto.subtle.digest("SHA-256", enc.encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

function b64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string) {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad), (c) => c.charCodeAt(0));
}

async function signToken(secret: string, label: string, exp: number) {
  const payload = `${label}|${exp}`;
  const key = await hmacKey(secret);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
  return `${b64url(enc.encode(payload))}.${b64url(sig)}`;
}

async function verifyToken(secret: string, token: string): Promise<{ label: string; exp: number } | null> {
  const [p, s] = token.split(".");
  if (!p || !s) return null;
  const payloadBytes = fromB64url(p);
  const key = await hmacKey(secret);
  const ok = await crypto.subtle.verify("HMAC", key, fromB64url(s), payloadBytes);
  if (!ok) return null;
  const payload = new TextDecoder().decode(payloadBytes);
  const i = payload.lastIndexOf("|");
  const label = payload.slice(0, i);
  const exp = Number(payload.slice(i + 1));
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return null;
  return { label, exp };
}

function clientIp(req: Request) {
  return req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "POST only" }, 405, origin);

  const pepper = Deno.env.get("REVIEW_PEPPER");
  const tokenSecret = Deno.env.get("REVIEW_TOKEN_SECRET");
  if (!pepper || !tokenSecret) return json({ error: "Gate is not configured." }, 500, origin);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  let body: { action?: string; code?: string; token?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Bad request." }, 400, origin);
  }

  // ---------------------------------------------------------------- verify
  if (body.action === "verify") {
    const code = String(body.code ?? "").replace(/\D/g, "");
    if (code.length !== 6) return json({ error: "Enter the six-digit code." }, 400, origin);

    // Rate limit per IP: MAX_ATTEMPTS per WINDOW_MS.
    const ip = clientIp(req);
    const now = Date.now();
    const { data: att } = await sb.from("ph_review_attempts").select("window_start, count").eq("ip", ip).maybeSingle();
    let count = 0;
    let windowStart = now;
    if (att && now - new Date(att.window_start).getTime() < WINDOW_MS) {
      count = att.count;
      windowStart = new Date(att.window_start).getTime();
    }
    if (count >= MAX_ATTEMPTS) {
      return json({ error: "Too many attempts. Try again in fifteen minutes." }, 429, origin);
    }
    await sb.from("ph_review_attempts").upsert({ ip, window_start: new Date(windowStart).toISOString(), count: count + 1 });

    const hash = await sha256Hex(`${pepper}:${code}`);
    const { data: row } = await sb
      .from("ph_review_codes")
      .select("id, label, active, expires_at, uses")
      .eq("code_hash", hash)
      .maybeSingle();

    if (!row || !row.active || (row.expires_at && new Date(row.expires_at).getTime() < now)) {
      return json({ error: "That code is not valid." }, 401, origin);
    }

    await sb.from("ph_review_codes").update({ last_used_at: new Date().toISOString(), uses: (row.uses ?? 0) + 1 }).eq("id", row.id);
    await sb.from("ph_review_attempts").delete().eq("ip", ip);

    const exp = Math.floor(now / 1000) + TOKEN_TTL_S;
    const token = await signToken(tokenSecret, row.label, exp);
    return json({ token, label: row.label, exp }, 200, origin);
  }

  // ------------------------------------------------------------------ load
  if (body.action === "load") {
    const t = await verifyToken(tokenSecret, String(body.token ?? ""));
    if (!t) return json({ error: "Session expired. Enter the code again." }, 401, origin);

    // Sign every gallery asset. Missing files return null so the page can show a placeholder.
    const assets: Record<string, string | null> = {};
    for (const item of content.gallery) {
      const { data } = await sb.storage.from(BUCKET).createSignedUrl(item.asset, SIGNED_URL_TTL_S);
      assets[item.id] = data?.signedUrl ?? (item as { image?: string }).image ?? null;
    }
    // Logo files for the co-branded footer preview.
    for (const f of ["logos/paychex-900x246.png", "logos/protecthealth.png"]) {
      const { data } = await sb.storage.from(BUCKET).createSignedUrl(f, SIGNED_URL_TTL_S);
      assets[f] = data?.signedUrl ?? null;
    }

    return json({ content, assets }, 200, origin);
  }

  return json({ error: "Unknown action." }, 400, origin);
});
