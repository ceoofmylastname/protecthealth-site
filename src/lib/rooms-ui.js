// Room & workspace booking UI, shared by the broker CRM (/app, "Book a Space")
// and the admin page (/admin/rooms). One board, two modes.
//
// The database is the source of truth for every rule (see
// supabase/migrations/20261001_room_booking.sql): open hours, blackouts,
// max length and, above all, the no-overlap exclusion constraint. The checks
// in here only exist so the picker never OFFERS a time the database would
// refuse. If the two ever disagree the database wins and the board refreshes.
//
// Everything is Las Vegas wall-clock time regardless of where the browser is.

export const TZ = 'America/Los_Angeles';
const DAY_MS = 864e5;

// ---------------------------------------------------------------- time
function tzOffsetMin(ms) {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(ms));
  const g = (t) => +p.find((x) => x.type === t).value;
  return Math.round((Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second')) - ms) / 60000);
}
/** 'YYYY-MM-DD' + 'HH:MM' in Vegas -> epoch ms (DST-safe). */
export function vegasMs(date, hm) {
  const [y, m, d] = date.split('-').map(Number);
  const [h, mi] = hm.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  const off = tzOffsetMin(guess);
  let ms = guess - off * 60000;
  const off2 = tzOffsetMin(ms);
  if (off2 !== off) ms = guess - off2 * 60000;
  return ms;
}
export const vegasDate = (ms) => new Date(ms).toLocaleDateString('en-CA', { timeZone: TZ });
export const vegasHM = (ms) => new Date(ms).toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
export const todayVegas = () => vegasDate(Date.now());
export const addDays = (date, n) => { const d = new Date(date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const dowOf = (date) => new Date(date + 'T12:00:00Z').getUTCDay();
const toMin = (hm) => { const [h, m] = String(hm).split(':').map(Number); return h * 60 + m; };
const toHM = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
export const fmtClock = (hm) => { const m = toMin(hm); const h = Math.floor(m / 60); return `${((h + 11) % 12) + 1}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
export const fmtTime = (iso) => new Date(iso).toLocaleTimeString('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });
export const fmtDayLong = (date) => new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric' });
export const fmtDayShort = (iso) => new Date(iso).toLocaleDateString('en-US', { timeZone: TZ, weekday: 'short', month: 'short', day: 'numeric' });
const durLabel = (min) => { const h = Math.floor(min / 60), m = min % 60; return [h ? `${h} hr${h > 1 ? 's' : ''}` : '', m ? `${m} min` : ''].filter(Boolean).join(' '); };

export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------------------------------------------------------------- errors
export function friendlyError(err) {
  const msg = String(err?.message || err || '');
  if (err?.code === '23P01' || /no_overlap|exclusion/i.test(msg)) return 'Someone just booked part of that time. The calendar has been refreshed, pick another slot.';
  const m = msg.match(/^[A-Z_]+:\s*(.*)$/s);
  if (m) return m[1];
  if (/row-level security/i.test(msg)) return 'You do not have permission to do that.';
  return msg || 'Something went wrong. Try again.';
}

// ---------------------------------------------------------------- data
export async function loadConfig(sb, { includeInactive = false } = {}) {
  const [rooms, hours, settings] = await Promise.all([
    sb.from('ph_rooms').select('*').order('sort_order').order('name'),
    sb.from('ph_room_hours').select('*'),
    sb.from('ph_room_settings').select('*').eq('id', 1).maybeSingle(),
  ]);
  if (rooms.error) throw rooms.error;
  const hoursBy = {};
  (hours.data ?? []).forEach((h) => { (hoursBy[h.room_id] ||= {})[h.weekday] = { opens: h.opens.slice(0, 5), closes: h.closes.slice(0, 5) }; });
  const all = rooms.data ?? [];
  return {
    rooms: includeInactive ? all : all.filter((r) => r.is_active),
    allRooms: all,
    hoursBy,
    settings: settings.data ?? { step_minutes: 30, max_hours: 9, max_days_ahead: 90 },
  };
}

export async function loadDay(sb, date) {
  const from = new Date(vegasMs(date, '00:00')).toISOString();
  const to = new Date(vegasMs(addDays(date, 1), '00:00')).toISOString();
  const [busy, bo] = await Promise.all([
    sb.rpc('ph_room_busy', { p_from: from, p_to: to }),
    sb.rpc('ph_room_blackouts_in', { p_from: from, p_to: to }),
  ]);
  if (busy.error) throw busy.error;
  return { busy: busy.data ?? [], blackouts: bo.data ?? [] };
}

// ---------------------------------------------------------------- availability math
/** Is [s,e) bookable in `room` given the day's data? Returns null or a reason. */
export function conflictFor({ room, cfg, day, date, s, e, ignoreId = null, admin = false }) {
  const buf = room.buffer_minutes || 0;
  for (const b of day.busy) {
    if (b.room_id !== room.id || b.id === ignoreId) continue;
    const bs = +new Date(b.start_at), be = +new Date(b.end_at) + (b.buffer_minutes || 0) * 60000;
    if (s < be && e + buf * 60000 > bs) return `That time is taken (${fmtTime(b.start_at)} – ${fmtTime(b.end_at)})`;
  }
  if (admin) return null;
  const h = cfg.hoursBy[room.id]?.[dowOf(date)];
  if (!h) return `${room.name} is closed that day`;
  if (s < vegasMs(date, h.opens) || e > vegasMs(date, h.closes)) return `${room.name} is open ${fmtClock(h.opens)} – ${fmtClock(h.closes)}`;
  for (const x of day.blackouts) {
    if (x.room_id && x.room_id !== room.id) continue;
    if (s < +new Date(x.end_at) && e > +new Date(x.start_at)) return `Unavailable${x.reason ? ` (${x.reason})` : ''}`;
  }
  if (s < Date.now() - 5 * 60000) return 'That time has passed';
  if (e - s > cfg.settings.max_hours * 3600000) return `Max ${cfg.settings.max_hours} hours per booking`;
  return null;
}

/** Start options for a room on a date, each flagged ok/not. */
function startOptions({ room, cfg, day, date, ignoreId, admin }) {
  const step = cfg.settings.step_minutes || 30;
  const h = cfg.hoursBy[room.id]?.[dowOf(date)];
  const open = h ? toMin(h.opens) : 7 * 60, close = h ? toMin(h.closes) : 19 * 60;
  const lo = admin ? Math.min(open, 6 * 60) : open, hi = admin ? Math.max(close, 21 * 60) : close;
  const out = [];
  for (let m = lo; m + step <= hi; m += step) {
    const s = vegasMs(date, toHM(m));
    out.push({ hm: toHM(m), ok: !conflictFor({ room, cfg, day, date, s, e: s + step * 60000, ignoreId, admin }) });
  }
  return out;
}
function endOptions({ room, cfg, day, date, startHM, ignoreId, admin }) {
  const step = cfg.settings.step_minutes || 30;
  const h = cfg.hoursBy[room.id]?.[dowOf(date)];
  const close = h ? toMin(h.closes) : 19 * 60;
  const hi = admin ? Math.max(close, 22 * 60) : close;
  const sMin = toMin(startHM), s = vegasMs(date, startHM);
  const maxMin = admin ? 24 * 60 : cfg.settings.max_hours * 60;
  const out = [];
  for (let m = sMin + step; m <= hi && m - sMin <= maxMin; m += step) {
    const e = vegasMs(date, toHM(m));
    if (conflictFor({ room, cfg, day, date, s, e, ignoreId, admin })) break;
    out.push(toHM(m));
  }
  return out;
}

// ---------------------------------------------------------------- styles (injected once)
// Every rule is scoped under .rbk (two classes deep) so the host page's own
// resets, like the CRM's `.ph button{background:none;border:none}`, cannot win.
const CSS = `
.rbk,.rbk-modal{--rb-blue:#197bff;--rb-blue2:#0f5fd6;--rb-ink:#0f172a;--rb-ink2:#42536b;--rb-muted:#8494ab;--rb-line:#e3e9f2;--rb-line2:#eef2f8;--rb-bg:#f4f7fc;--rb-navy:#0f3567;--rb-green:#10b981;--rb-grad:linear-gradient(92deg,#197bff,#19c8ff 70%,#007db3);color:var(--rb-ink)}
.rbk{font-family:var(--font,inherit);display:grid;gap:18px}
.rbk *,.rbk-modal *{box-sizing:border-box}
.rbk>*{min-width:0}
.rbk button{font-family:inherit;cursor:pointer}

/* ---- toolbar + date strip ---- */
.rbk .rbk-top{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.rbk .rbk-heading{margin-right:auto;min-width:0}
.rbk .rbk-heading b{display:block;font-size:1.28rem;font-weight:800;letter-spacing:-.4px;color:var(--rb-navy);line-height:1.15}
.rbk .rbk-heading span{font-size:.8rem;color:var(--rb-muted);font-weight:600}
.rbk .rbk-seg{display:inline-flex;background:#fff;border:1px solid var(--rb-line);border-radius:12px;padding:3px;gap:2px;box-shadow:0 1px 2px rgba(15,23,42,.04)}
.rbk .rbk-seg button{border:0;background:transparent;color:var(--rb-ink2);font-weight:700;font-size:.82rem;padding:7px 12px;border-radius:9px;line-height:1}
.rbk .rbk-seg button:hover{background:var(--rb-line2);color:var(--rb-ink)}
.rbk .rbk-seg input{border:0;font:inherit;font-size:.82rem;font-weight:650;color:var(--rb-ink2);padding:5px 8px;background:transparent;border-radius:9px}
.rbk .rbk-seg input:focus{outline:none;background:var(--rb-line2)}
.rbk .rbk-strip{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(64px,1fr);gap:8px;overflow-x:auto;padding:2px 2px 6px;scrollbar-width:thin}
.rbk .rbk-day{border:1px solid var(--rb-line);background:#fff;border-radius:14px;padding:9px 6px 10px;text-align:center;color:var(--rb-ink);transition:transform .12s,box-shadow .15s,border-color .15s}
.rbk .rbk-day:hover{border-color:#bcd6ff;transform:translateY(-1px);box-shadow:0 6px 16px -10px rgba(25,123,255,.6)}
.rbk .rbk-day small{display:block;font-size:.66rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--rb-muted)}
.rbk .rbk-day b{display:block;font-size:1.25rem;font-weight:800;letter-spacing:-.5px;margin-top:2px;line-height:1.1}
.rbk .rbk-day i{display:block;font-style:normal;font-size:.62rem;font-weight:700;color:var(--rb-muted);margin-top:3px;min-height:.8em}
.rbk .rbk-day.closed{background:#f7f9fc;color:#b3bfcf}
.rbk .rbk-day.closed b{color:#b3bfcf}
.rbk .rbk-day.today i{color:var(--rb-blue)}
.rbk .rbk-day.on{background:var(--rb-grad);border-color:transparent;color:#fff;box-shadow:0 10px 22px -12px rgba(25,123,255,.85)}
.rbk .rbk-day.on small,.rbk .rbk-day.on i{color:rgba(255,255,255,.85)}
.rbk .rbk-day.on b{color:#fff}

/* ---- room cards ---- */
.rbk .rbk-rooms{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr));gap:14px}
.rbk .rbk-rc{position:relative;display:flex;flex-direction:column;text-align:left;background:#fff;border:1.5px solid var(--rb-line);border-radius:18px;overflow:hidden;padding:0;color:var(--rb-ink);transition:border-color .15s,box-shadow .2s,transform .15s;box-shadow:0 1px 2px rgba(15,23,42,.04),0 12px 28px -22px rgba(15,23,42,.3)}
.rbk .rbk-rc:hover{transform:translateY(-2px);box-shadow:0 1px 2px rgba(15,23,42,.04),0 18px 34px -20px rgba(15,23,42,.35)}
.rbk .rbk-rc.on{border-color:var(--rb-blue);box-shadow:0 0 0 4px rgba(25,123,255,.14),0 18px 34px -20px rgba(25,123,255,.5)}
.rbk .rbk-rc .ph{position:relative;aspect-ratio:2/1;background:#e9eff7 center/cover no-repeat}
.rbk .rbk-rc .ph::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,29,61,0) 45%,rgba(8,29,61,.55))}
.rbk .rbk-rc .tag{position:absolute;left:12px;bottom:10px;z-index:1;color:#fff;font-weight:800;font-size:1.02rem;letter-spacing:-.2px;text-shadow:0 1px 8px rgba(0,0,0,.35)}
.rbk .rbk-rc .chk{position:absolute;top:10px;right:10px;z-index:1;width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,.92);display:grid;place-items:center;color:var(--rb-blue);font-weight:900;font-size:.8rem;opacity:0;transform:scale(.7);transition:all .15s}
.rbk .rbk-rc.on .chk{opacity:1;transform:none}
.rbk .rbk-rc .bd{padding:12px 14px 14px;display:grid;gap:9px}
.rbk .rbk-rc .meta{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.rbk .rbk-pill{display:inline-flex;align-items:center;gap:5px;font-size:.7rem;font-weight:750;padding:4px 9px;border-radius:99px;background:var(--rb-line2);color:var(--rb-ink2);white-space:nowrap}
.rbk .rbk-pill.off{background:#fdecec;color:#b91c1c}
.rbk .rbk-avail{display:grid;gap:5px}
.rbk .rbk-avail span{font-size:.78rem;font-weight:700;color:var(--rb-ink2)}
.rbk .rbk-avail span em{font-style:normal;color:var(--rb-green)}
.rbk .rbk-meter{height:6px;border-radius:99px;background:var(--rb-line2);overflow:hidden}
.rbk .rbk-meter i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#10b981,#34d399)}
.rbk .rbk-about{justify-self:start;border:0;background:none;padding:0;color:var(--rb-blue);font-weight:700;font-size:.76rem}
.rbk .rbk-about:hover{text-decoration:underline}

/* ---- availability timeline (rooms x hours) ---- */
.rbk .rbk-card{background:#fff;border:1px solid var(--rb-line);border-radius:18px;box-shadow:0 1px 2px rgba(15,23,42,.04),0 12px 28px -24px rgba(15,23,42,.3)}
.rbk .rbk-card-h{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:16px 18px 4px}
.rbk .rbk-card-h h4{margin:0;font-size:.98rem;font-weight:800;letter-spacing:-.2px;color:var(--rb-navy)}
.rbk .rbk-card-h p{margin:0;font-size:.78rem;color:var(--rb-muted);font-weight:600}
.rbk .rbk-legend{margin-left:auto;display:flex;gap:12px;flex-wrap:wrap;font-size:.72rem;font-weight:650;color:var(--rb-muted)}
.rbk .rbk-legend i{display:inline-block;width:11px;height:11px;border-radius:4px;vertical-align:-1px;margin-right:5px}
.rbk .rbk-tl-wrap{overflow-x:auto;padding:8px 18px 16px}
.rbk .rbk-tl{min-width:760px;display:grid;grid-template-columns:190px 1fr;row-gap:10px;align-items:center}
.rbk .rbk-ticks{position:relative;height:18px;grid-column:2}
.rbk .rbk-ticks span{position:absolute;top:0;transform:translateX(-50%);font-size:.66rem;font-weight:700;color:var(--rb-muted);white-space:nowrap}
.rbk .rbk-rl{display:flex;align-items:center;gap:9px;min-width:0;padding-right:12px;border:0;background:none;text-align:left;color:var(--rb-ink)}
.rbk .rbk-rl img,.rbk .rbk-rl .ph{width:30px;height:30px;border-radius:9px;object-fit:cover;background:#e9eff7;flex:none}
.rbk .rbk-rl b{font-size:.84rem;font-weight:750;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rbk .rbk-rl.on b{color:var(--rb-blue)}
.rbk .rbk-track{position:relative;height:46px;border-radius:12px;background:#f0fdf6;border:1px solid #d6f5e6;overflow:hidden;cursor:pointer}
.rbk .rbk-track.ro{cursor:default}
.rbk .rbk-grid-l{position:absolute;top:0;bottom:0;width:1px;background:rgba(15,53,103,.07);pointer-events:none}
.rbk .rbk-closed{position:absolute;top:0;bottom:0;background:repeating-linear-gradient(-45deg,#f3f6fa,#f3f6fa 5px,#e9eef5 5px,#e9eef5 10px);pointer-events:none}
.rbk .rbk-past{position:absolute;top:0;bottom:0;left:0;background:rgba(244,247,252,.78);pointer-events:none}
.rbk .rbk-blk{position:absolute;top:5px;bottom:5px;border-radius:9px;display:flex;align-items:center;gap:6px;padding:0 10px;font-size:.72rem;font-weight:750;overflow:hidden;white-space:nowrap;border:0;z-index:2}
.rbk .rbk-blk.busy{background:#e6ebf2;color:#5b6b80;cursor:default}
.rbk .rbk-blk.busy svg{width:12px;height:12px;flex:none;opacity:.7}
.rbk .rbk-blk.mine{background:var(--rb-grad);color:#fff;box-shadow:0 6px 14px -8px rgba(25,123,255,.9);cursor:pointer}
.rbk .rbk-blk.adm{background:linear-gradient(135deg,#334e7a,#203a63);color:#fff;cursor:pointer}
.rbk .rbk-blk.bo{background:repeating-linear-gradient(-45deg,#fdecec,#fdecec 5px,#fbdcdc 5px,#fbdcdc 10px);color:#a31d1d;cursor:default}
.rbk .rbk-buf{position:absolute;top:5px;bottom:5px;border-radius:0 9px 9px 0;background:repeating-linear-gradient(-45deg,rgba(91,111,140,.10),rgba(91,111,140,.10) 3px,transparent 3px,transparent 6px);pointer-events:none;z-index:1}
.rbk .rbk-ghost{position:absolute;top:5px;bottom:5px;border-radius:9px;border:2px dashed var(--rb-blue);background:rgba(25,123,255,.08);color:var(--rb-blue);font-size:.7rem;font-weight:800;display:none;align-items:center;padding:0 8px;pointer-events:none;z-index:3;white-space:nowrap}
.rbk .rbk-sel{position:absolute;top:4px;bottom:4px;border-radius:10px;border:2px solid var(--rb-blue);background:rgba(25,123,255,.12);z-index:3;pointer-events:none;box-shadow:0 0 0 4px rgba(25,123,255,.12)}
.rbk .rbk-now{position:absolute;top:0;bottom:0;width:2px;background:#e11d48;z-index:4;pointer-events:none}
.rbk .rbk-now::before{content:"";position:absolute;top:-1px;left:-3px;width:8px;height:8px;border-radius:50%;background:#e11d48}
.rbk .rbk-tl-empty{grid-column:1/-1;padding:18px;text-align:center;color:var(--rb-muted);font-weight:650;font-size:.86rem}

/* ---- booking panel ---- */
.rbk .rbk-panel{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:0}
.rbk .rbk-pick{padding:16px 18px 18px;border-right:1px solid var(--rb-line2)}
.rbk .rbk-sum{padding:16px 18px 18px;display:flex;flex-direction:column;gap:12px;background:linear-gradient(180deg,#fbfdff,#f6f9fe);border-radius:0 18px 18px 0}
.rbk .rbk-lbl{font-size:.68rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--rb-muted);margin:4px 0 8px}
.rbk .rbk-chips{display:flex;flex-wrap:wrap;gap:7px}
.rbk .rbk-chip{border:1.5px solid var(--rb-line);background:#fff;color:var(--rb-ink);font-weight:700;font-size:.8rem;padding:7px 11px;border-radius:10px;font-variant-numeric:tabular-nums;transition:all .12s}
.rbk .rbk-chip:hover{border-color:var(--rb-blue);color:var(--rb-blue)}
.rbk .rbk-chip.on{background:var(--rb-grad);border-color:transparent;color:#fff;box-shadow:0 6px 14px -8px rgba(25,123,255,.9)}
.rbk .rbk-none{font-size:.84rem;color:var(--rb-muted);font-weight:600;padding:6px 0}
.rbk .rbk-sum .room{display:flex;gap:12px;align-items:center}
.rbk .rbk-sum .room img,.rbk .rbk-sum .room .ph{width:56px;height:56px;border-radius:14px;object-fit:cover;background:#e9eff7;flex:none}
.rbk .rbk-sum .room b{display:block;font-size:1rem;font-weight:800;color:var(--rb-navy)}
.rbk .rbk-sum .room span{font-size:.78rem;color:var(--rb-muted);font-weight:650}
.rbk .rbk-when{border-radius:14px;background:#fff;border:1px solid var(--rb-line);padding:12px 14px}
.rbk .rbk-when b{display:block;font-size:1.15rem;font-weight:800;letter-spacing:-.3px;font-variant-numeric:tabular-nums}
.rbk .rbk-when span{font-size:.78rem;color:var(--rb-muted);font-weight:650}
.rbk .rbk-when.empty b{color:#b3bfcf;font-size:.95rem}
.rbk .rbk-sum textarea{width:100%;font:inherit;font-size:.86rem;border:1.5px solid var(--rb-line);border-radius:12px;padding:9px 11px;resize:vertical;min-height:44px;background:#fff;color:var(--rb-ink)}
.rbk .rbk-sum textarea:focus{outline:none;border-color:var(--rb-blue);box-shadow:0 0 0 3px rgba(25,123,255,.13)}
.rbk .rbk-cta{border:0;background:var(--rb-grad);color:#fff;font-weight:800;font-size:.95rem;padding:13px 16px;border-radius:14px;box-shadow:0 12px 24px -14px rgba(25,123,255,.95);transition:transform .12s,filter .12s}
.rbk .rbk-cta:hover{filter:brightness(1.05)}
.rbk .rbk-cta:active{transform:scale(.98)}
.rbk .rbk-cta:disabled{background:#dfe6ef;color:#8a99ae;box-shadow:none;cursor:not-allowed}
.rbk .rbk-fine{font-size:.72rem;color:var(--rb-muted);font-weight:600;line-height:1.45}
.rbk .rbk-err{font-size:.82rem;color:#b91c1c;font-weight:700;min-height:0}

/* ---- my bookings ---- */
.rbk .rbk-mine{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(320px,100%),1fr));gap:12px;padding:6px 18px 18px}
.rbk .rbk-bk{display:flex;gap:12px;align-items:center;background:#fff;border:1px solid var(--rb-line);border-radius:14px;padding:12px}
.rbk .rbk-date{width:52px;flex:none;border-radius:12px;background:var(--rb-grad);color:#fff;text-align:center;padding:6px 0}
.rbk .rbk-date small{display:block;font-size:.6rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;opacity:.9}
.rbk .rbk-date b{display:block;font-size:1.2rem;font-weight:800;line-height:1.1}
.rbk .rbk-bk .tx{min-width:0;flex:1}
.rbk .rbk-bk .tx b{display:block;font-size:.9rem;font-weight:800}
.rbk .rbk-bk .tx span{display:block;font-size:.78rem;color:var(--rb-muted);font-weight:650;overflow-wrap:anywhere}
.rbk .rbk-bk .ac{display:flex;gap:6px;flex:none}
.rbk .rbk-mini{border:1px solid var(--rb-line);background:#fff;color:var(--rb-ink2);font-weight:700;font-size:.74rem;padding:6px 10px;border-radius:9px}
.rbk .rbk-mini:hover{border-color:var(--rb-blue);color:var(--rb-blue)}
.rbk .rbk-mini.dan{color:#b3261e;border-color:#f3d0cd}
.rbk .rbk-mini.dan:hover{background:#b3261e;border-color:#b3261e;color:#fff}
.rbk .rbk-empty{grid-column:1/-1;padding:18px;text-align:center;color:var(--rb-muted);font-size:.86rem;font-weight:600;border:1.5px dashed var(--rb-line);border-radius:14px}

/* ---- modal ---- */
.rbk-modal{position:fixed;inset:0;z-index:300;display:grid;place-items:center;padding:16px;font-family:var(--font,'Bricolage Grotesque',system-ui,sans-serif)}
.rbk-modal-bg{position:absolute;inset:0;background:rgba(8,29,61,.42);backdrop-filter:blur(4px);animation:rbkFade .15s ease}
.rbk-card-m{position:relative;background:#fff;border-radius:22px;width:100%;max-width:480px;max-height:90vh;overflow:auto;box-shadow:0 40px 80px rgba(11,42,74,.3);padding:24px 24px 22px;color:#0f172a;animation:rbkPop .18s cubic-bezier(.2,.8,.2,1)}
.rbk-card-m.wide{max-width:640px;padding:0}
@keyframes rbkFade{from{opacity:0}}
@keyframes rbkPop{from{opacity:0;transform:translateY(8px) scale(.98)}}
.rbk-card-m h3{margin:0 0 4px;font-size:1.25rem;letter-spacing:-.3px;color:#0f3567}
.rbk-card-m .sub{margin:0 0 16px;color:#5b6b7c;font-size:.86rem}
.rbk-x{position:absolute;top:14px;right:14px;z-index:2;border:0;background:rgba(238,243,248,.95);width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:.85rem}
.rbk-form{display:grid;gap:12px}
.rbk-form label{display:grid;gap:5px;font-size:.76rem;font-weight:750;color:#42536b}
.rbk-form select,.rbk-form input,.rbk-form textarea{font:inherit;font-size:.92rem;border:1.5px solid #e3e9f2;border-radius:12px;padding:10px 12px;background:#fff;color:#0f172a;width:100%}
.rbk-form select:focus,.rbk-form input:focus,.rbk-form textarea:focus{outline:none;border-color:#197bff;box-shadow:0 0 0 3px rgba(25,123,255,.13)}
.rbk-row2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.rbk-hint{font-size:.76rem;color:#5b6b7c;min-height:1em}
.rbk-modal .rbk-err{font-size:.84rem;color:#b91c1c;font-weight:650;min-height:1em}
.rbk-acts{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:6px}
.rbk-acts .rbk-btn.dan{margin-right:auto}
.rbk-btn{border:1.5px solid #e3e9f2;background:#fff;border-radius:12px;padding:9px 15px;font-weight:750;font-size:.84rem;color:#42536b;cursor:pointer;font-family:inherit}
.rbk-btn:hover{border-color:#197bff;color:#197bff}
.rbk-btn.pri{background:linear-gradient(92deg,#197bff,#19c8ff 70%,#007db3);border-color:transparent;color:#fff;box-shadow:0 8px 18px -10px rgba(25,123,255,.9)}
.rbk-btn.pri:hover{color:#fff;filter:brightness(1.05)}
.rbk-btn.dan{border-color:#f3d0cd;color:#b3261e}
.rbk-btn.dan:hover{background:#b3261e;border-color:#b3261e;color:#fff}
.rbk-btn:disabled{opacity:.5;cursor:not-allowed}
.rbk-about-m img{width:100%;aspect-ratio:16/9;object-fit:cover;display:block;border-radius:22px 22px 0 0;background:#e9eff7}
.rbk-about-m .in{padding:18px 22px 22px}
.rbk-about-m p{margin:0 0 14px;color:#334155;line-height:1.6;font-size:.92rem}
.rbk-about-m .pills{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 14px}
.rbk-about-m .pills span{font-size:.72rem;font-weight:750;padding:4px 10px;border-radius:99px;background:#eef2f8;color:#42536b}

@media (max-width:860px){
  .rbk .rbk-panel{grid-template-columns:1fr}
  .rbk .rbk-pick{border-right:0;border-bottom:1px solid var(--rb-line2)}
  .rbk .rbk-sum{border-radius:0 0 18px 18px}
}
@media (max-width:640px){
  .rbk .rbk-rooms{grid-template-columns:none;grid-auto-flow:column;grid-auto-columns:80%;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:6px}
  .rbk .rbk-rc{scroll-snap-align:start}
  .rbk .rbk-rc:hover{transform:none}
  .rbk .rbk-tl{grid-template-columns:96px 1fr}
  .rbk .rbk-rl b{font-size:.76rem}
  .rbk .rbk-rl img,.rbk .rbk-rl .ph{display:none}
  .rbk-row2{grid-template-columns:1fr}
  .rbk .rbk-bk{flex-wrap:wrap}
}
@media (prefers-reduced-motion:reduce){.rbk *,.rbk-modal *{transition:none!important;animation:none!important}}
`;
function ensureCss() {
  const old = document.getElementById('rbk-css');
  if (old && old.dataset.v === '2') return;
  old?.remove();
  const s = document.createElement('style'); s.id = 'rbk-css'; s.dataset.v = '2'; s.textContent = CSS; document.head.appendChild(s);
}

export function modal(inner, { wide = false } = {}) {
  ensureCss();
  const wrap = document.createElement('div');
  wrap.className = 'rbk-modal';
  wrap.innerHTML = `<div class="rbk-modal-bg" data-close></div><div class="rbk-card-m${wide ? ' wide' : ''}" role="dialog" aria-modal="true"><button class="rbk-x" data-close aria-label="Close">✕</button>${inner}</div>`;
  document.body.appendChild(wrap);
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  const close = () => { wrap.remove(); document.removeEventListener('keydown', onKey); };
  wrap.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
  document.addEventListener('keydown', onKey);
  return { wrap, close, $: (s) => wrap.querySelector(s) };
}

const LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

// ---------------------------------------------------------------- the board
/**
 * mountBoard(el, opts)
 *   opts.sb        supabase client
 *   opts.mode      'agent' | 'admin'
 *   opts.agentId   the signed-in broker (agent mode)
 *   opts.agents    [{id, full_name}] (admin mode, for the "booked for" picker)
 *   opts.toast     fn(msg)
 *   opts.onChange  fn() after any write
 * Returns { refresh, reloadConfig, setDate, openBook }.
 *
 * Privacy: brokers see that a time is taken, never who took it. The name only
 * comes back from ph_room_busy() for the broker's own bookings or for admins,
 * so this is enforced by the database, not by what this file chooses to draw.
 */
const DUR_CHOICES = [30, 60, 90, 120, 180, 240, 360, 480];

export function mountBoard(el, opts) {
  ensureCss();
  const admin = opts.mode === 'admin';
  const toast = opts.toast || (() => {});
  let cfg = null, day = { busy: [], blackouts: [] }, date = todayVegas(), mine = [], timer = null;
  let stripStart = todayVegas();
  let roomSel = null, startSel = null, endSel = null;

  el.classList.add('rbk');
  el.innerHTML = `
    <div class="rbk-top">
      <div class="rbk-heading"><b></b><span></span></div>
      <div class="rbk-seg">
        <button type="button" data-w="-7" aria-label="Earlier">‹</button>
        <button type="button" data-today>Today</button>
        <button type="button" data-w="7" aria-label="Later">›</button>
        <input type="date" class="rbk-pickdate" aria-label="Jump to a date">
      </div>
    </div>
    <div class="rbk-strip" role="tablist" aria-label="Choose a day"></div>
    <div class="rbk-rooms"></div>
    <div class="rbk-card">
      <div class="rbk-card-h"><div><h4>Availability</h4><p>${admin ? 'Click any open time to add a booking, or a booking to edit it.' : 'Green is open. Click an open time to start a booking.'}</p></div>
        <div class="rbk-legend">
          <span><i style="background:#d6f5e6;border:1px solid #b9ecd3"></i>Open</span>
          <span><i style="background:#e6ebf2"></i>${admin ? 'Booked' : 'Unavailable'}</span>
          ${admin ? '' : '<span><i style="background:linear-gradient(92deg,#197bff,#19c8ff)"></i>Yours</span>'}
          <span><i style="background:repeating-linear-gradient(-45deg,#fdecec,#fdecec 3px,#fbdcdc 3px,#fbdcdc 6px)"></i>Blocked</span>
        </div>
      </div>
      <div class="rbk-tl-wrap"><div class="rbk-tl"></div></div>
    </div>
    ${admin ? '' : `<div class="rbk-card rbk-panel"><div class="rbk-pick"></div><div class="rbk-sum"></div></div>
    <div class="rbk-card"><div class="rbk-card-h"><div><h4>Your upcoming bookings</h4><p>Change or cancel anytime. Cancelling frees the time for everyone.</p></div></div><div class="rbk-mine"></div></div>`}`;
  const $ = (s) => el.querySelector(s);

  el.querySelectorAll('[data-w]').forEach((b) => b.addEventListener('click', () => {
    stripStart = addDays(stripStart, +b.getAttribute('data-w'));
    if (!admin && stripStart < todayVegas()) stripStart = todayVegas();
    paintStrip();
  }));
  $('[data-today]').addEventListener('click', () => { stripStart = todayVegas(); setDate(todayVegas()); });
  $('.rbk-pickdate').addEventListener('change', (e) => { if (e.target.value) { stripStart = e.target.value; setDate(e.target.value); } });

  async function setDate(d) { date = d; startSel = endSel = null; await refresh(); }

  async function refresh() {
    try {
      if (!cfg) cfg = await loadConfig(opts.sb);
      if (!roomSel || !cfg.rooms.some((r) => r.id === roomSel)) roomSel = cfg.rooms[0]?.id ?? null;
      day = await loadDay(opts.sb, date);
      if (!admin && opts.agentId) {
        const { data } = await opts.sb.from('ph_room_bookings').select('*').eq('agent_id', opts.agentId)
          .eq('status', 'booked').gte('end_at', new Date().toISOString()).order('start_at').limit(50);
        mine = data ?? [];
      }
      paint();
    } catch (e) {
      $('.rbk-tl').innerHTML = `<div class="rbk-tl-empty">Could not load rooms: ${esc(friendlyError(e))}</div>`;
    }
  }
  async function reloadConfig() { cfg = null; await refresh(); }

  const roomById = (id) => cfg.allRooms.find((r) => r.id === id);
  const hoursOf = (r, d = date) => cfg.hoursBy[r.id]?.[dowOf(d)];
  function freeMinutes(r) {
    const step = cfg.settings.step_minutes || 30;
    const h = hoursOf(r); if (!h) return { free: 0, total: 0 };
    let free = 0;
    for (let m = toMin(h.opens); m + step <= toMin(h.closes); m += step) {
      const s = vegasMs(date, toHM(m));
      if (!conflictFor({ room: r, cfg, day, date, s, e: s + step * 60000 })) free += step;
    }
    return { free, total: toMin(h.closes) - toMin(h.opens) };
  }

  function paint() {
    const isToday = date === todayVegas();
    $('.rbk-heading b').textContent = fmtDayLong(date);
    $('.rbk-heading span').textContent = isToday ? 'Today · Las Vegas time' : 'Las Vegas time';
    $('.rbk-pickdate').value = date;
    paintStrip(); paintRooms();
    if (!admin) { paintPanel(); paintMine(); }
    paintTimeline();
  }

  function paintStrip() {
    if (date < stripStart || date >= addDays(stripStart, 14)) {
      let s0 = addDays(date, -3);
      if (!admin && s0 < todayVegas()) s0 = todayVegas();
      stripStart = s0;
    }
    const days = Array.from({ length: 14 }, (_, i) => addDays(stripStart, i));
    $('.rbk-strip').innerHTML = days.map((d) => {
      const open = cfg?.rooms.some((r) => cfg.hoursBy[r.id]?.[dowOf(d)]);
      const dt = new Date(d + 'T12:00:00Z');
      const wk = dt.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short' });
      const mo = dt.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short' });
      const sub = d === todayVegas() ? 'Today' : !open ? 'Closed' : dt.getUTCDate() === 1 || d === days[0] ? mo : '';
      return `<button type="button" role="tab" class="rbk-day${d === date ? ' on' : ''}${open ? '' : ' closed'}${d === todayVegas() ? ' today' : ''}" data-day="${d}" aria-selected="${d === date}">
        <small>${wk}</small><b>${dt.getUTCDate()}</b><i>${sub}</i></button>`;
    }).join('');
    el.querySelectorAll('.rbk-day').forEach((b) => b.addEventListener('click', () => setDate(b.getAttribute('data-day'))));
  }

  function paintRooms() {
    $('.rbk-rooms').innerHTML = cfg.rooms.length ? cfg.rooms.map((r) => {
      const h = hoursOf(r);
      const { free, total } = freeMinutes(r);
      const pct = total ? Math.round(free / total * 100) : 0;
      return `<div class="rbk-rc${!admin && r.id === roomSel ? ' on' : ''}" data-room="${esc(r.id)}" role="button" tabindex="0" aria-pressed="${r.id === roomSel}">
        <div class="ph" style="background-image:url('${esc(r.photo_url || '')}')"><span class="tag">${esc(r.name)}</span><span class="chk">✓</span></div>
        <div class="bd">
          <div class="meta">
            ${r.capacity ? `<span class="rbk-pill">${r.capacity} seat${r.capacity === 1 ? '' : 's'}</span>` : ''}
            <span class="rbk-pill">${r.kind === 'workspace' ? 'Workspace' : 'Meeting room'}</span>
            ${h ? `<span class="rbk-pill">${fmtClock(h.opens)} – ${fmtClock(h.closes)}</span>` : '<span class="rbk-pill off">Closed this day</span>'}
          </div>
          ${h ? `<div class="rbk-avail"><span>${free ? `<em>${durLabel(free)}</em> open` : 'Fully booked'}${free && free < total ? ` of ${durLabel(total)}` : ''}</span><div class="rbk-meter"><i style="width:${pct}%"></i></div></div>` : ''}
          <button type="button" class="rbk-about" data-about="${esc(r.id)}">About this room</button>
        </div></div>`;
    }).join('') : '<div class="rbk-empty">No rooms are set up yet.</div>';
    el.querySelectorAll('.rbk-rc').forEach((c) => {
      const pick = () => {
        if (admin) { openBook({ roomId: c.getAttribute('data-room') }); return; }
        roomSel = c.getAttribute('data-room'); startSel = endSel = null; paintRooms(); paintPanel(); paintTimeline();
        $('.rbk-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      };
      c.addEventListener('click', (e) => { if (!e.target.closest('[data-about]')) pick(); });
      c.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    });
    el.querySelectorAll('[data-about]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); aboutRoom(roomById(b.getAttribute('data-about'))); }));
  }

  function aboutRoom(r) {
    if (!r) return;
    const days = [1, 2, 3, 4, 5, 6, 0].map((d) => ({ d, h: cfg.hoursBy[r.id]?.[d] })).filter((x) => x.h);
    const DN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const m = modal(`<div class="rbk-about-m">${r.photo_url ? `<img src="${esc(r.photo_url)}" alt="${esc(r.name)}">` : ''}
      <div class="in"><h3>${esc(r.name)}</h3>
        <div class="pills">${r.capacity ? `<span>${r.capacity} seats</span>` : ''}<span>${r.kind === 'workspace' ? 'Workspace' : 'Meeting room'}</span>
        ${days.map((x) => `<span>${DN[x.d]} ${fmtClock(x.h.opens)}–${fmtClock(x.h.closes)}</span>`).join('')}</div>
        <p>${esc(r.description || '')}</p>
        <div class="rbk-acts"><button type="button" class="rbk-btn" data-close>Close</button>${admin ? '' : '<button type="button" class="rbk-btn pri" data-pick>Book this room</button>'}</div></div></div>`, { wide: true });
    m.$('[data-pick]')?.addEventListener('click', () => {
      m.close(); roomSel = r.id; startSel = endSel = null; paintRooms(); paintPanel(); paintTimeline();
      $('.rbk-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  // Horizontal timeline: one row per room, one shared hour axis.
  function paintTimeline() {
    const step = cfg.settings.step_minutes || 30;
    const rooms = cfg.rooms;
    let lo = 24 * 60, hi = 0;
    rooms.forEach((r) => { const h = hoursOf(r); if (h) { lo = Math.min(lo, toMin(h.opens)); hi = Math.max(hi, toMin(h.closes)); } });
    day.busy.forEach((b) => { lo = Math.min(lo, toMin(vegasHM(+new Date(b.start_at)))); hi = Math.max(hi, toMin(vegasHM(+new Date(b.end_at))) || 24 * 60); });
    if (hi <= lo) { lo = 8 * 60; hi = 17 * 60; }
    lo = Math.floor(lo / 60) * 60; hi = Math.ceil(hi / 60) * 60;
    const span = hi - lo;
    const t0 = vegasMs(date, toHM(lo)), t1 = vegasMs(date, toHM(hi));
    const pct = (ms) => Math.max(0, Math.min(100, (ms - t0) / (t1 - t0) * 100));
    const anyOpen = rooms.some((r) => hoursOf(r));

    let html = '<div></div><div class="rbk-ticks">';
    for (let m = lo; m <= hi; m += 60) html += `<span style="left:${(m - lo) / span * 100}%">${fmtClock(toHM(m)).replace(':00', '')}</span>`;
    html += '</div>';
    if (!rooms.length) html += '<div class="rbk-tl-empty">No rooms are set up yet.</div>';
    else if (!anyOpen && !admin) html += '<div class="rbk-tl-empty">The office is closed this day. Pick another day above.</div>';
    const nowMs = Date.now();
    rooms.forEach((r) => {
      const h = hoursOf(r);
      html += `<button type="button" class="rbk-rl${!admin && r.id === roomSel ? ' on' : ''}" data-rl="${esc(r.id)}">${r.photo_url ? `<img src="${esc(r.photo_url)}" alt="">` : '<span class="ph"></span>'}<b>${esc(r.name)}</b></button>`;
      html += `<div class="rbk-track" data-track="${esc(r.id)}">`;
      for (let m = lo + 60; m < hi; m += 60) html += `<i class="rbk-grid-l" style="left:${(m - lo) / span * 100}%"></i>`;
      // closed areas
      if (!h) html += `<i class="rbk-closed" style="left:0;width:100%"></i>`;
      else {
        if (toMin(h.opens) > lo) html += `<i class="rbk-closed" style="left:0;width:${(toMin(h.opens) - lo) / span * 100}%"></i>`;
        if (toMin(h.closes) < hi) html += `<i class="rbk-closed" style="left:${(toMin(h.closes) - lo) / span * 100}%;right:0"></i>`;
      }
      if (date === todayVegas() && nowMs > t0) html += `<i class="rbk-past" style="width:${pct(nowMs)}%"></i>`;
      day.blackouts.filter((x) => !x.room_id || x.room_id === r.id).forEach((x) => {
        const a = pct(+new Date(x.start_at)), b = pct(+new Date(x.end_at));
        if (b > a) html += `<span class="rbk-blk bo" style="left:${a}%;width:${b - a}%" title="${esc(x.reason || 'Blocked')}">${esc(x.reason || 'Blocked')}</span>`;
      });
      day.busy.filter((b) => b.room_id === r.id).forEach((b) => {
        const s = +new Date(b.start_at), e = +new Date(b.end_at);
        const a = pct(s), w = pct(e) - a;
        const t = `${fmtTime(b.start_at)} – ${fmtTime(b.end_at)}`;
        if (b.buffer_minutes) html += `<i class="rbk-buf" style="left:${a + w}%;width:${pct(e + b.buffer_minutes * 60000) - pct(e)}%"></i>`;
        if (admin) html += `<button type="button" class="rbk-blk adm" data-bk="${esc(b.id)}" style="left:${a}%;width:${w}%" title="${esc(`${b.agent_name || ''} · ${t}`)}">${esc(b.agent_name || 'Booked')} · ${esc(t)}</button>`;
        else if (b.is_mine) html += `<button type="button" class="rbk-blk mine" data-bk="${esc(b.id)}" style="left:${a}%;width:${w}%" title="Your booking · ${esc(t)}">You · ${esc(t)}</button>`;
        else html += `<span class="rbk-blk busy" style="left:${a}%;width:${w}%" title="Unavailable · ${esc(t)}">${LOCK}Unavailable</span>`;
      });
      if (!admin && r.id === roomSel && startSel && endSel) html += `<i class="rbk-sel" style="left:${pct(vegasMs(date, startSel))}%;width:${pct(vegasMs(date, endSel)) - pct(vegasMs(date, startSel))}%"></i>`;
      if (date === todayVegas() && nowMs > t0 && nowMs < t1) html += `<i class="rbk-now" style="left:${pct(nowMs)}%"></i>`;
      html += `<span class="rbk-ghost"></span></div>`;
    });
    const tl = $('.rbk-tl');
    tl.innerHTML = html;

    tl.querySelectorAll('[data-rl]').forEach((b) => b.addEventListener('click', () => {
      if (admin) { openBook({ roomId: b.getAttribute('data-rl') }); return; }
      roomSel = b.getAttribute('data-rl'); startSel = endSel = null; paintRooms(); paintPanel(); paintTimeline();
    }));
    tl.querySelectorAll('.rbk-blk[data-bk]').forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      const bk = day.busy.find((x) => x.id === b.getAttribute('data-bk'));
      if (bk) openBook({ booking: bk });
    }));

    // Hover ghost + click-to-book on open time.
    const snapAt = (track, clientX) => {
      const rect = track.getBoundingClientRect();
      const m = lo + Math.floor(((clientX - rect.left) / rect.width * span) / step) * step;
      return Math.max(lo, Math.min(hi - step, m));
    };
    tl.querySelectorAll('.rbk-track').forEach((track) => {
      const r = roomById(track.getAttribute('data-track'));
      const ghost = track.querySelector('.rbk-ghost');
      const len = Math.max(step, 60);
      const fits = (m) => {
        const s = vegasMs(date, toHM(m));
        return !conflictFor({ room: r, cfg, day, date, s, e: s + step * 60000, admin });
      };
      track.addEventListener('mousemove', (e) => {
        if (e.target.closest('.rbk-blk')) { ghost.style.display = 'none'; return; }
        const m = snapAt(track, e.clientX);
        if (!fits(m)) { ghost.style.display = 'none'; track.style.cursor = 'not-allowed'; return; }
        track.style.cursor = 'pointer';
        ghost.style.display = 'flex';
        ghost.style.left = `${(m - lo) / span * 100}%`;
        ghost.style.width = `${Math.min(len, hi - m) / span * 100}%`;
        ghost.textContent = fmtClock(toHM(m));
      });
      track.addEventListener('mouseleave', () => { ghost.style.display = 'none'; });
      track.addEventListener('click', (e) => {
        if (e.target.closest('.rbk-blk')) return;
        const m = snapAt(track, e.clientX);
        if (!fits(m)) return;
        if (admin) { openBook({ roomId: r.id, startHM: toHM(m) }); return; }
        roomSel = r.id; startSel = toHM(m); endSel = null;
        paintRooms(); paintPanel(); paintTimeline();
        $('.rbk-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    });
  }

  // Agent booking panel: pick a start chip, then a length chip, then book.
  function paintPanel() {
    const pick = $('.rbk-pick'), sum = $('.rbk-sum');
    if (!pick) return;
    const r = roomById(roomSel);
    if (!r) { pick.innerHTML = '<div class="rbk-none">Choose a room above.</div>'; sum.innerHTML = ''; return; }
    const h = hoursOf(r);
    const starts = h ? startOptions({ room: r, cfg, day, date }).filter((o) => o.ok) : [];
    if (startSel && !starts.some((o) => o.hm === startSel)) { startSel = null; endSel = null; }
    const ends = startSel ? endOptions({ room: r, cfg, day, date, startHM: startSel }) : [];
    const durs = startSel ? [...new Set([...DUR_CHOICES.filter((d) => ends.includes(toHM(toMin(startSel) + d))), ...(ends.length ? [toMin(ends[ends.length - 1]) - toMin(startSel)] : [])])].sort((a, b) => a - b) : [];
    if (startSel && !endSel && durs.length) endSel = toHM(toMin(startSel) + (durs.includes(60) ? 60 : durs[0]));
    if (endSel && !ends.includes(endSel)) endSel = null;
    const morning = starts.filter((o) => toMin(o.hm) < 12 * 60), afternoon = starts.filter((o) => toMin(o.hm) >= 12 * 60);
    const chipRow = (list) => list.map((o) => `<button type="button" class="rbk-chip${o.hm === startSel ? ' on' : ''}" data-st="${o.hm}">${fmtClock(o.hm)}</button>`).join('');
    const closeMin = h ? toMin(h.closes) : 0;

    pick.innerHTML = !h ? `<div class="rbk-none">${esc(r.name)} is closed this day. Pick another day above.</div>`
      : !starts.length ? `<div class="rbk-none">${esc(r.name)} has no open times left this day. Try another room or day.</div>`
      : `${morning.length ? `<div class="rbk-lbl">Morning</div><div class="rbk-chips">${chipRow(morning)}</div>` : ''}
         ${afternoon.length ? `<div class="rbk-lbl" style="margin-top:14px">Afternoon</div><div class="rbk-chips">${chipRow(afternoon)}</div>` : ''}
         ${startSel ? `<div class="rbk-lbl" style="margin-top:18px">How long?</div><div class="rbk-chips">${durs.map((d) => {
            const end = toHM(toMin(startSel) + d);
            const label = toMin(end) === closeMin && !DUR_CHOICES.includes(d) ? `Until close · ${durLabel(d)}` : durLabel(d);
            return `<button type="button" class="rbk-chip${end === endSel ? ' on' : ''}" data-en="${end}">${label}</button>`;
          }).join('')}</div>` : ''}`;

    sum.innerHTML = `
      <div class="room">${r.photo_url ? `<img src="${esc(r.photo_url)}" alt="">` : '<span class="ph"></span>'}<div><b>${esc(r.name)}</b><span>${fmtDayLong(date)}</span></div></div>
      <div class="rbk-when${startSel && endSel ? '' : ' empty'}">${startSel && endSel
        ? `<b>${fmtClock(startSel)} – ${fmtClock(endSel)}</b><span>${durLabel(toMin(endSel) - toMin(startSel))}${r.buffer_minutes ? ` · ${r.buffer_minutes} min reset after` : ''}</span>`
        : `<b>${startSel ? 'Pick how long' : 'Pick a start time'}</b><span>Or click an open spot on the timeline</span>`}</div>
      <textarea rows="2" maxlength="500" placeholder="Notes (optional). Only you and the office see this." data-notes></textarea>
      <div class="rbk-err" role="alert"></div>
      <button type="button" class="rbk-cta" data-book ${startSel && endSel ? '' : 'disabled'}>${startSel && endSel ? `Book ${esc(r.name)}` : 'Book'}</button>
      <div class="rbk-fine">Once booked, the time disappears for every other broker. You can change or cancel it below.</div>`;

    pick.querySelectorAll('[data-st]').forEach((b) => b.addEventListener('click', () => { startSel = b.getAttribute('data-st'); endSel = null; paintPanel(); paintTimeline(); }));
    pick.querySelectorAll('[data-en]').forEach((b) => b.addEventListener('click', () => { endSel = b.getAttribute('data-en'); paintPanel(); paintTimeline(); }));
    sum.querySelector('[data-book]').addEventListener('click', async (e) => {
      const btn = e.currentTarget; btn.disabled = true; btn.textContent = 'Booking…';
      const err = sum.querySelector('.rbk-err'); err.textContent = '';
      const row = {
        room_id: r.id, agent_id: opts.agentId,
        start_at: new Date(vegasMs(date, startSel)).toISOString(),
        end_at: new Date(vegasMs(date, endSel)).toISOString(),
        notes: sum.querySelector('[data-notes]').value.trim() || null,
      };
      const { error } = await opts.sb.from('ph_room_bookings').insert(row);
      if (error) {
        err.textContent = friendlyError(error);
        btn.disabled = false; btn.textContent = `Book ${r.name}`;
        if (error.code === '23P01') { startSel = endSel = null; await refresh(); }
        return;
      }
      toast(`Booked ${r.name} · ${fmtClock(startSel)} – ${fmtClock(endSel)}`);
      startSel = endSel = null;
      await refresh(); opts.onChange?.();
    });
  }

  function paintMine() {
    const list = $('.rbk-mine');
    list.innerHTML = mine.length ? mine.map((b) => {
      const r = roomById(b.room_id);
      const d = new Date(b.start_at);
      return `<div class="rbk-bk">
        <div class="rbk-date"><small>${esc(d.toLocaleDateString('en-US', { timeZone: TZ, month: 'short' }))}</small><b>${esc(d.toLocaleDateString('en-US', { timeZone: TZ, day: 'numeric' }))}</b></div>
        <div class="tx"><b>${esc(r?.name || 'Room')}</b><span>${esc(d.toLocaleDateString('en-US', { timeZone: TZ, weekday: 'long' }))} · ${esc(fmtTime(b.start_at))} – ${esc(fmtTime(b.end_at))}</span>${b.notes ? `<span>${esc(b.notes)}</span>` : ''}</div>
        <div class="ac"><button type="button" class="rbk-mini" data-edit="${esc(b.id)}">Change</button><button type="button" class="rbk-mini dan" data-cancel="${esc(b.id)}">Cancel</button></div>
      </div>`;
    }).join('') : '<div class="rbk-empty">No upcoming bookings. Pick a room and a time above.</div>';
    list.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', async () => {
      const bk = mine.find((x) => x.id === b.getAttribute('data-edit'));
      if (!bk) return;
      const d = vegasDate(+new Date(bk.start_at));
      if (d !== date) { date = d; await refresh(); }
      openBook({ booking: day.busy.find((x) => x.id === bk.id) || { ...bk, is_mine: true } });
    }));
    list.querySelectorAll('[data-cancel]').forEach((b) => b.addEventListener('click', () => {
      const bk = mine.find((x) => x.id === b.getAttribute('data-cancel')); if (bk) confirmCancel(bk);
    }));
  }

  // ------------------------------------------------ book / edit modal
  function openBook({ roomId = null, startHM = null, booking = null } = {}) {
    const rooms = admin ? cfg.allRooms : cfg.rooms;
    const editing = !!booking;
    let bDate = editing ? vegasDate(+new Date(booking.start_at)) : date;
    let bDay = day;
    const room0 = editing ? booking.room_id : (roomId || rooms[0]?.id);
    const agentList = [...(opts.agents || [])];
    // Never let a save silently reassign a booking whose broker is not in the active list.
    if (editing && booking.agent_id && !agentList.some((a) => a.id === booking.agent_id)) agentList.unshift({ id: booking.agent_id, full_name: booking.agent_name || 'Current broker' });
    const agentPick = admin ? `<label>Booked for<select name="agent">${agentList.map((a) => `<option value="${esc(a.id)}"${(editing ? booking.agent_id : '') === a.id ? ' selected' : ''}>${esc(a.full_name)}</option>`).join('')}</select></label>` : '';
    const m = modal(`
      <h3>${editing ? (admin ? 'Edit booking' : 'Your booking') : 'Book a space'}</h3>
      <p class="sub">${editing ? `${esc(booking.agent_name || '')}` : 'Times are Las Vegas time. Once you book it, the time is gone for everyone else.'}</p>
      <form class="rbk-form">
        ${agentPick}
        <label>Room<select name="room">${rooms.map((r) => `<option value="${esc(r.id)}"${r.id === room0 ? ' selected' : ''}>${esc(r.name)}${r.is_active ? '' : ' (inactive)'}</option>`).join('')}</select></label>
        <label>Date<input type="date" name="date" value="${bDate}" min="${admin ? '' : todayVegas()}" max="${admin ? '' : addDays(todayVegas(), cfg.settings.max_days_ahead)}"></label>
        <div class="rbk-row2">
          <label>Start<select name="start"></select></label>
          <label>End<select name="end"></select></label>
        </div>
        <div class="rbk-hint"></div>
        <label>Notes <span style="font-weight:500;color:#8494ab">(optional, only you and the office see this)</span><textarea name="notes" rows="2" maxlength="500" placeholder="Client meeting with the Smiths">${esc(editing ? booking.notes || '' : '')}</textarea></label>
        <div class="rbk-err" role="alert"></div>
        <div class="rbk-acts">
          ${editing ? '<button type="button" class="rbk-btn dan" data-cancelbk>Cancel booking</button>' : ''}
          <button type="button" class="rbk-btn" data-close>Close</button>
          <button type="submit" class="rbk-btn pri">${editing ? 'Save changes' : 'Book it'}</button>
        </div>
      </form>`);
    const f = m.$('form');
    const ignoreId = editing ? booking.id : null;
    const roomOf = () => cfg.allRooms.find((r) => r.id === f.room.value);

    async function ensureDay() {
      if (f.date.value === date) { bDay = day; return; }
      try { bDay = await loadDay(opts.sb, f.date.value); } catch { bDay = { busy: [], blackouts: [] }; }
    }
    function fillStarts(prefer) {
      const r = roomOf(); if (!r || !f.date.value) return;
      const opts2 = startOptions({ room: r, cfg, day: bDay, date: f.date.value, ignoreId, admin });
      const okOnes = opts2.filter((o) => o.ok);
      f.start.innerHTML = okOnes.length ? okOnes.map((o) => `<option value="${o.hm}">${fmtClock(o.hm)}</option>`).join('') : '<option value="">No open times</option>';
      const want = prefer && okOnes.find((o) => o.hm === prefer) ? prefer : okOnes[0]?.hm;
      if (want) f.start.value = want;
      fillEnds();
    }
    function fillEnds(prefer) {
      const r = roomOf();
      if (!f.start.value) { f.end.innerHTML = ''; hint(); return; }
      const ends = endOptions({ room: r, cfg, day: bDay, date: f.date.value, startHM: f.start.value, ignoreId, admin });
      f.end.innerHTML = ends.map((hm) => `<option value="${hm}">${fmtClock(hm)} · ${durLabel(toMin(hm) - toMin(f.start.value))}</option>`).join('');
      const def = prefer && ends.includes(prefer) ? prefer : (ends.find((hm) => toMin(hm) - toMin(f.start.value) === 60) || ends[0]);
      if (def) f.end.value = def;
      hint();
    }
    function hint() {
      const r = roomOf(); const h = r && cfg.hoursBy[r.id]?.[dowOf(f.date.value)];
      const bits = [];
      if (h) bits.push(`Open ${fmtClock(h.opens)} – ${fmtClock(h.closes)}`); else bits.push(admin ? 'Normally closed this day (admin override)' : 'Closed this day');
      if (r?.buffer_minutes) bits.push(`${r.buffer_minutes} min reset time after each booking`);
      m.$('.rbk-hint').textContent = bits.join(' · ');
      f.querySelector('[type=submit]').disabled = !f.start.value || !f.end.value;
    }
    f.room.addEventListener('change', () => fillStarts(f.start.value));
    f.date.addEventListener('change', async () => { await ensureDay(); fillStarts(f.start.value); });
    f.start.addEventListener('change', () => fillEnds(f.end.value));

    (async () => {
      await ensureDay();
      const pre = editing ? vegasHM(+new Date(booking.start_at)) : startHM;
      fillStarts(pre);
      if (editing) fillEnds(vegasHM(+new Date(booking.end_at)));
    })();

    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = f.querySelector('[type=submit]'); btn.disabled = true;
      m.$('.rbk-err').textContent = '';
      const row = {
        room_id: f.room.value,
        start_at: new Date(vegasMs(f.date.value, f.start.value)).toISOString(),
        end_at: new Date(vegasMs(f.date.value, f.end.value)).toISOString(),
        notes: f.notes.value.trim() || null,
      };
      if (admin) row.agent_id = f.agent.value;
      let res;
      if (editing) res = await opts.sb.from('ph_room_bookings').update(row).eq('id', booking.id).select('id');
      else {
        if (!admin) row.agent_id = opts.agentId;
        else row.source = 'admin';
        res = await opts.sb.from('ph_room_bookings').insert(row).select('id');
      }
      if (res.error) {
        m.$('.rbk-err').textContent = friendlyError(res.error);
        btn.disabled = false;
        if (res.error.code === '23P01') { await refresh(); await ensureDay(); fillStarts(f.start.value); }
        return;
      }
      m.close();
      toast(editing ? 'Booking updated' : `Booked ${roomOf()?.name} · ${fmtClock(f.start.value)} – ${fmtClock(f.end.value)}`);
      if (f.date.value !== date) date = f.date.value;
      await refresh(); opts.onChange?.();
    });
    const cb = m.$('[data-cancelbk]');
    if (cb) cb.addEventListener('click', () => { m.close(); confirmCancel(booking); });
  }

  function confirmCancel(b) {
    const r = cfg.allRooms.find((x) => x.id === b.room_id);
    const m = modal(`<h3>Cancel this booking?</h3>
      <p class="sub">${esc(r?.name || 'Room')} · ${esc(fmtDayShort(b.start_at))}, ${esc(fmtTime(b.start_at))} – ${esc(fmtTime(b.end_at))}${admin && b.agent_name ? ` · ${esc(b.agent_name)}` : ''}</p>
      <form class="rbk-form">
        ${admin ? '<label>Reason <span style="font-weight:500;color:#8494ab">(optional, internal)</span><input name="reason" maxlength="200" placeholder="Room needed for training"></label>' : ''}
        <div class="rbk-err" role="alert"></div>
        <div class="rbk-acts"><button type="button" class="rbk-btn" data-close>Keep it</button><button type="submit" class="rbk-btn dan" style="margin-right:0">Cancel booking</button></div>
      </form>`);
    m.$('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const patch = { status: 'cancelled' };
      if (admin && e.target.reason?.value.trim()) patch.cancel_reason = e.target.reason.value.trim();
      const { error } = await opts.sb.from('ph_room_bookings').update(patch).eq('id', b.id);
      if (error) { m.$('.rbk-err').textContent = friendlyError(error); return; }
      m.close(); toast('Booking cancelled. The time is open again.');
      await refresh(); opts.onChange?.();
    });
  }

  // Keep the board honest while it is open: other brokers book in real time.
  const tick = () => { if (document.visibilityState === 'visible' && el.isConnected) refresh(); };
  timer = setInterval(() => { if (!el.isConnected) { clearInterval(timer); return; } tick(); }, 60000);
  document.addEventListener('visibilitychange', tick);

  refresh();
  return { refresh, reloadConfig, setDate, openBook: (o) => cfg && openBook(o), get cfg() { return cfg; } };
}
