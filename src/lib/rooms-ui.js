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
    if (s < be && e + buf * 60000 > bs) return `Overlaps ${b.agent_name || 'another booking'} (${fmtTime(b.start_at)} – ${fmtTime(b.end_at)})`;
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
const CSS = `
.rbk,.rbk-modal{--rb-blue:var(--blue,#197bff);--rb-ink:var(--ink,#0f172a);--rb-muted:var(--muted,#8494ab);--rb-line:var(--line,#e3e9f2);--rb-navy:#0f3567;color:var(--rb-ink)}
.rbk{font-family:var(--font,inherit)}
.rbk *,.rbk-modal *{box-sizing:border-box}
.rbk button{font-family:inherit;cursor:pointer}
.rbk-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:14px}
.rbk-nav{border:1.5px solid var(--rb-line);background:#fff;border-radius:10px;padding:8px 13px;font-weight:700;font-size:.86rem;color:var(--rb-ink)}
.rbk-nav:hover{border-color:var(--rb-blue);color:var(--rb-blue)}
.rbk-date{border:1.5px solid var(--rb-line);border-radius:10px;padding:7px 10px;font:inherit;font-size:.88rem;background:#fff}
.rbk-title{font-size:1.15rem;font-weight:800;letter-spacing:-.3px;color:var(--rb-navy);margin-right:auto;min-width:200px}
.rbk-rooms{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(300px,100%),1fr));gap:14px;margin-bottom:18px}
.rbk-room{display:grid;grid-template-columns:116px 1fr;gap:14px;background:#fff;border:1px solid var(--rb-line);border-radius:14px;padding:12px;box-shadow:0 1px 2px rgba(15,23,42,.05),0 8px 24px -14px rgba(15,23,42,.14)}
.rbk-room img,.rbk-room .rbk-ph{width:116px;height:116px;border-radius:10px;object-fit:cover;background:#eef3fa;display:block}
.rbk-room h4{margin:0 0 4px;font-size:1rem;font-weight:750}
.rbk-room p{margin:0;font-size:.8rem;line-height:1.45;color:#5b6b7c;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.rbk-room p.open{-webkit-line-clamp:unset}
.rbk-more{border:0;background:none;align-self:flex-start;text-align:left;color:var(--rb-blue);font-weight:650;font-size:.76rem;padding:2px 0}
.rbk-meta{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:8px}
.rbk-chip{font-size:.7rem;font-weight:700;padding:3px 9px;border-radius:99px;background:#eef3fa;color:#42536b}
.rbk-chip.off{background:#fde8e8;color:#b91c1c}
.rbk-book{margin-left:auto;border:0;background:linear-gradient(92deg,#197bff,#19c8ff 70%,#007db3);color:#fff;font-weight:700;font-size:.8rem;padding:7px 14px;border-radius:99px}
.rbk-board{background:#fff;border:1px solid var(--rb-line);border-radius:14px;overflow:auto;box-shadow:0 1px 2px rgba(15,23,42,.05)}
.rbk-grid{display:grid;min-width:560px;position:relative}
.rbk-hd{position:sticky;top:0;z-index:3;background:#f4f7fc;border-bottom:1px solid var(--rb-line);padding:10px;font-size:.8rem;font-weight:750;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rbk-hd small{display:block;font-weight:600;color:var(--rb-muted);font-size:.68rem}
.rbk-tcol{border-right:1px solid var(--rb-line)}
.rbk-tl{height:var(--rh);font-size:.66rem;color:var(--rb-muted);text-align:right;padding:2px 8px 0;white-space:nowrap;font-variant-numeric:tabular-nums;border-top:1px solid transparent}
.rbk-col{position:relative;border-right:1px solid var(--rb-line)}
.rbk-col:last-child{border-right:0}
.rbk-cell{height:var(--rh);border-bottom:1px solid #f0f3f8;width:100%;display:block;border-left:0;border-right:0;border-top:0;background:transparent;padding:0}
.rbk-cell.hr{border-bottom-color:#e3e9f2}
.rbk-cell.free:hover{background:rgba(25,123,255,.08)}
.rbk-cell.free:hover::after{content:'+ Book';font-size:.68rem;font-weight:700;color:var(--rb-blue);padding-left:8px}
.rbk-cell.na{background:repeating-linear-gradient(-45deg,#f6f8fb,#f6f8fb 6px,#eef2f7 6px,#eef2f7 12px);cursor:not-allowed}
.rbk-ev{position:absolute;left:4px;right:4px;border-radius:9px;padding:5px 8px;display:flex;flex-direction:column;justify-content:flex-start;align-items:flex-start;font-size:.72rem;line-height:1.25;color:#fff;overflow:hidden;text-align:left;border:0;z-index:2;background:#5b6f8c;box-shadow:0 2px 8px -3px rgba(15,23,42,.35)}
.rbk-ev b{display:block;max-width:100%;font-weight:750;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rbk-ev span{opacity:.9;white-space:nowrap}
.rbk-ev.mine{background:linear-gradient(135deg,#197bff,#0f5fd6)}
.rbk-ev.click:hover{filter:brightness(1.08)}
.rbk-ev.noclick{cursor:default}
.rbk-buf{position:absolute;left:4px;right:4px;border-radius:0 0 8px 8px;background:repeating-linear-gradient(-45deg,rgba(91,111,140,.12),rgba(91,111,140,.12) 4px,transparent 4px,transparent 8px);z-index:1;pointer-events:none}
.rbk-bo{position:absolute;left:4px;right:4px;border-radius:9px;background:repeating-linear-gradient(-45deg,#fde8e8,#fde8e8 6px,#fbd5d5 6px,#fbd5d5 12px);color:#9b1c1c;font-size:.7rem;font-weight:700;padding:5px 8px;z-index:1;overflow:hidden}
.rbk-now{position:absolute;left:0;right:0;height:2px;background:#e11d48;z-index:4;pointer-events:none}
.rbk-closed{position:absolute;inset:0;display:grid;place-items:center;color:var(--rb-muted);font-size:.8rem;font-weight:700;background:repeating-linear-gradient(-45deg,#f6f8fb,#f6f8fb 6px,#eef2f7 6px,#eef2f7 12px)}
.rbk-legend{display:flex;gap:14px;flex-wrap:wrap;font-size:.74rem;color:var(--rb-muted);margin-top:10px}
.rbk-legend i{display:inline-block;width:12px;height:12px;border-radius:4px;vertical-align:-2px;margin-right:5px}
.rbk-sec{font-size:.72rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--rb-muted);margin:24px 0 10px}
.rbk-list{display:grid;gap:8px}
.rbk-item{display:flex;align-items:center;gap:12px;background:#fff;border:1px solid var(--rb-line);border-radius:12px;padding:10px 14px;flex-wrap:wrap}
.rbk-item .when{font-weight:750;font-size:.9rem;min-width:190px}
.rbk-item .what{font-size:.85rem;color:#42536b;flex:1;min-width:140px}
.rbk-item .acts{display:flex;gap:6px;margin-left:auto}
.rbk-btn{border:1px solid var(--rb-line);background:#fff;border-radius:99px;padding:6px 13px;font-weight:650;font-size:.8rem;color:#42536b}
.rbk-btn:hover{border-color:var(--rb-blue);color:var(--rb-blue)}
.rbk-btn.pri{background:linear-gradient(92deg,#197bff,#19c8ff 70%,#007db3);border:0;color:#fff}
.rbk-btn.pri:hover{color:#fff;filter:brightness(1.05)}
.rbk-btn.dan{border-color:#f0c4c0;color:#b3261e}
.rbk-btn.dan:hover{background:#b3261e;border-color:#b3261e;color:#fff}
.rbk-btn:disabled{opacity:.5;cursor:not-allowed}
.rbk-empty{padding:16px;text-align:center;color:var(--rb-muted);font-size:.86rem;background:#fff;border:1px dashed var(--rb-line);border-radius:12px}
.rbk-modal{position:fixed;inset:0;z-index:300;display:grid;place-items:center;padding:16px;font-family:var(--font,'Bricolage Grotesque',system-ui,sans-serif)}
.rbk-modal-bg{position:absolute;inset:0;background:rgba(11,42,74,.45);backdrop-filter:blur(3px)}
.rbk-card{position:relative;background:#fff;border-radius:18px;width:100%;max-width:480px;max-height:90vh;overflow:auto;box-shadow:0 40px 80px rgba(11,42,74,.28);padding:22px 24px 24px;color:#0f172a}
.rbk-card h3{margin:0 0 4px;font-size:1.25rem;color:#0f3567}
.rbk-card .sub{margin:0 0 16px;color:#5b6b7c;font-size:.88rem}
.rbk-x{position:absolute;top:14px;right:14px;border:0;background:#eef3f8;width:30px;height:30px;border-radius:50%;cursor:pointer}
.rbk-form{display:grid;gap:12px}
.rbk-form label{display:grid;gap:5px;font-size:.78rem;font-weight:700;color:#42536b}
.rbk-form select,.rbk-form input,.rbk-form textarea{font:inherit;font-size:.92rem;border:1.5px solid #e3e9f2;border-radius:10px;padding:9px 11px;background:#fff;color:#0f172a;width:100%}
.rbk-form select:focus,.rbk-form input:focus,.rbk-form textarea:focus{outline:none;border-color:#197bff;box-shadow:0 0 0 3px rgba(25,123,255,.13)}
.rbk-row2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.rbk-hint{font-size:.78rem;color:#5b6b7c;min-height:1em}
.rbk-err{font-size:.84rem;color:#b91c1c;font-weight:600;min-height:1em}
.rbk-acts{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:6px}
.rbk-acts .rbk-btn.dan{margin-right:auto}
@media (max-width:640px){.rbk-room{grid-template-columns:88px 1fr}.rbk-room img,.rbk-room .rbk-ph{width:88px;height:88px}.rbk-row2{grid-template-columns:1fr}.rbk-item .when{min-width:0}}
`;
function ensureCss() {
  if (document.getElementById('rbk-css')) return;
  const s = document.createElement('style'); s.id = 'rbk-css'; s.textContent = CSS; document.head.appendChild(s);
}

export function modal(inner) {
  ensureCss();
  const wrap = document.createElement('div');
  wrap.className = 'rbk-modal';
  wrap.innerHTML = `<div class="rbk-modal-bg" data-close></div><div class="rbk-card" role="dialog" aria-modal="true"><button class="rbk-x" data-close aria-label="Close">✕</button>${inner}</div>`;
  document.body.appendChild(wrap);
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  const close = () => { wrap.remove(); document.removeEventListener('keydown', onKey); };
  wrap.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
  document.addEventListener('keydown', onKey);
  return { wrap, close, $: (s) => wrap.querySelector(s) };
}

// ---------------------------------------------------------------- the board
/**
 * mountBoard(el, opts)
 *   opts.sb        supabase client
 *   opts.mode      'agent' | 'admin'
 *   opts.agentId   the signed-in broker (agent mode)
 *   opts.agents    [{id, full_name}] (admin mode, for the "booked for" picker)
 *   opts.toast     fn(msg)
 *   opts.onChange  fn() after any write
 * Returns { refresh, setDate }.
 */
export function mountBoard(el, opts) {
  ensureCss();
  const admin = opts.mode === 'admin';
  const toast = opts.toast || (() => {});
  let cfg = null, day = { busy: [], blackouts: [] }, date = todayVegas(), mine = [], timer = null;

  el.classList.add('rbk');
  el.innerHTML = `
    <div class="rbk-bar">
      <div class="rbk-title"></div>
      <button type="button" class="rbk-nav" data-d="-1" aria-label="Previous day">←</button>
      <button type="button" class="rbk-nav" data-d="0">Today</button>
      <button type="button" class="rbk-nav" data-d="1" aria-label="Next day">→</button>
      <input type="date" class="rbk-date" aria-label="Pick a date" />
    </div>
    <div class="rbk-rooms"></div>
    <div class="rbk-board"><div class="rbk-grid"></div></div>
    <div class="rbk-legend">
      <span><i style="background:linear-gradient(135deg,#197bff,#0f5fd6)"></i>${admin ? 'Booking' : 'Your booking'}</span>
      ${admin ? '' : '<span><i style="background:#5b6f8c"></i>Booked by someone else</span>'}
      <span><i style="background:repeating-linear-gradient(-45deg,#fde8e8,#fde8e8 3px,#fbd5d5 3px,#fbd5d5 6px)"></i>Blacked out</span>
      <span><i style="background:repeating-linear-gradient(-45deg,#f6f8fb,#f6f8fb 3px,#e3e9f2 3px,#e3e9f2 6px)"></i>Closed</span>
    </div>
    ${admin ? '' : '<div class="rbk-sec">Your upcoming bookings</div><div class="rbk-list rbk-mine"></div>'}`;
  const $ = (s) => el.querySelector(s);

  el.querySelectorAll('[data-d]').forEach((b) => b.addEventListener('click', () => {
    const d = +b.getAttribute('data-d');
    setDate(d === 0 ? todayVegas() : addDays(date, d));
  }));
  $('.rbk-date').addEventListener('change', (e) => { if (e.target.value) setDate(e.target.value); });

  async function setDate(d) { date = d; await refresh(); }

  async function refresh() {
    try {
      if (!cfg) cfg = await loadConfig(opts.sb);
      day = await loadDay(opts.sb, date);
      if (!admin && opts.agentId) {
        const { data } = await opts.sb.from('ph_room_bookings').select('*').eq('agent_id', opts.agentId)
          .eq('status', 'booked').gte('end_at', new Date().toISOString()).order('start_at').limit(50);
        mine = data ?? [];
      }
      paint();
    } catch (e) {
      $('.rbk-grid').innerHTML = `<div class="rbk-empty" style="margin:14px">Could not load rooms: ${esc(friendlyError(e))}</div>`;
    }
  }
  async function reloadConfig() { cfg = null; await refresh(); }

  function paint() {
    $('.rbk-title').textContent = fmtDayLong(date) + (date === todayVegas() ? ' · Today' : '');
    $('.rbk-date').value = date;
    const rooms = cfg.rooms;

    // Room cards
    $('.rbk-rooms').innerHTML = rooms.length ? rooms.map((r) => {
      const h = cfg.hoursBy[r.id]?.[dowOf(date)];
      return `<div class="rbk-room">
        ${r.photo_url ? `<img src="${esc(r.photo_url)}" alt="${esc(r.name)}" loading="lazy">` : '<div class="rbk-ph"></div>'}
        <div style="min-width:0;display:flex;flex-direction:column">
          <h4>${esc(r.name)}</h4>
          <p>${esc(r.description || '')}</p>
          ${r.description && r.description.length > 150 ? '<button type="button" class="rbk-more">Read more</button>' : ''}
          <div class="rbk-meta" style="margin-top:auto;padding-top:8px">
            ${r.capacity ? `<span class="rbk-chip">Seats ${r.capacity}</span>` : ''}
            ${h ? `<span class="rbk-chip">${fmtClock(h.opens)} – ${fmtClock(h.closes)}</span>` : '<span class="rbk-chip off">Closed today</span>'}
            <button type="button" class="rbk-book" data-room="${esc(r.id)}">Book</button>
          </div>
        </div></div>`;
    }).join('') : '<div class="rbk-empty">No rooms are set up yet.</div>';
    el.querySelectorAll('.rbk-more').forEach((b) => b.addEventListener('click', () => {
      const p = b.previousElementSibling; p.classList.toggle('open'); b.textContent = p.classList.contains('open') ? 'Show less' : 'Read more';
    }));
    el.querySelectorAll('.rbk-book').forEach((b) => b.addEventListener('click', () => openBook({ roomId: b.getAttribute('data-room') })));

    // Timeline bounds: earliest open .. latest close across rooms today (fallback 8-5)
    const step = cfg.settings.step_minutes || 30;
    let lo = 24 * 60, hi = 0;
    rooms.forEach((r) => { const h = cfg.hoursBy[r.id]?.[dowOf(date)]; if (h) { lo = Math.min(lo, toMin(h.opens)); hi = Math.max(hi, toMin(h.closes)); } });
    day.busy.forEach((b) => { lo = Math.min(lo, toMin(vegasHM(+new Date(b.start_at)))); hi = Math.max(hi, toMin(vegasHM(+new Date(b.end_at))) || 24 * 60); });
    if (hi <= lo) { lo = 8 * 60; hi = 17 * 60; }
    lo = Math.floor(lo / 60) * 60; hi = Math.ceil(hi / 60) * 60;
    const RH = step === 15 ? 22 : step === 60 ? 44 : 30; // px per step
    const pxPerMin = RH / step;
    const dayStart = vegasMs(date, toHM(lo));

    const g = $('.rbk-grid');
    g.style.gridTemplateColumns = `64px repeat(${Math.max(rooms.length, 1)}, minmax(150px, 1fr))`;
    g.style.setProperty('--rh', RH + 'px');
    let html = '<div class="rbk-hd" style="background:#f4f7fc"></div>';
    html += rooms.map((r) => `<div class="rbk-hd">${esc(r.name)}<small>${r.capacity ? `Seats ${r.capacity}` : r.kind === 'workspace' ? 'Workspace' : 'Room'}</small></div>`).join('');
    // time column
    html += '<div class="rbk-tcol">';
    for (let m = lo; m < hi; m += step) html += `<div class="rbk-tl">${m % 60 === 0 ? fmtClock(toHM(m)) : ''}</div>`;
    html += '</div>';
    const nowMs = Date.now();
    rooms.forEach((r) => {
      const h = cfg.hoursBy[r.id]?.[dowOf(date)];
      html += `<div class="rbk-col" data-col="${esc(r.id)}">`;
      for (let m = lo; m < hi; m += step) {
        const s = vegasMs(date, toHM(m));
        const why = conflictFor({ room: r, cfg, day, date, s, e: s + step * 60000, admin });
        // Cells under a booking stay plain: the event block on top carries the meaning.
        const underEvent = day.busy.some((b) => b.room_id === r.id && s < +new Date(b.end_at) && s + step * 60000 > +new Date(b.start_at));
        const cls = !why ? ' free' : underEvent ? '' : ' na';
        html += `<button type="button" class="rbk-cell${(m + step) % 60 === 0 ? ' hr' : ''}${cls}" data-room="${esc(r.id)}" data-hm="${toHM(m)}" ${why ? 'tabindex="-1" aria-disabled="true"' : ''} title="${esc(!why ? `Book ${r.name} at ${fmtClock(toHM(m))}` : underEvent ? '' : why)}"></button>`;
      }
      if (!h && !admin) html += `<div class="rbk-closed">Closed</div>`;
      // blackouts
      day.blackouts.filter((x) => !x.room_id || x.room_id === r.id).forEach((x) => {
        const s = Math.max(+new Date(x.start_at), dayStart), e = Math.min(+new Date(x.end_at), vegasMs(date, toHM(hi)));
        if (e <= s) return;
        html += `<div class="rbk-bo" style="top:${(s - dayStart) / 60000 * pxPerMin}px;height:${(e - s) / 60000 * pxPerMin}px">${esc(x.reason || 'Unavailable')}</div>`;
      });
      // bookings
      day.busy.filter((b) => b.room_id === r.id).forEach((b) => {
        const s = +new Date(b.start_at), e = +new Date(b.end_at);
        const top = (s - dayStart) / 60000 * pxPerMin, ht = Math.max((e - s) / 60000 * pxPerMin, 18);
        const canOpen = admin || b.is_mine;
        html += `<button type="button" class="rbk-ev${b.is_mine && !admin ? ' mine' : admin ? ' mine' : ''} ${canOpen ? 'click' : 'noclick'}" data-bk="${esc(b.id)}" style="top:${top}px;height:${ht}px" title="${esc(`${b.agent_name} · ${fmtTime(b.start_at)} – ${fmtTime(b.end_at)}`)}">
          <b>${esc(b.is_mine && !admin ? 'You' : b.agent_name || 'Booked')}</b><span>${esc(fmtTime(b.start_at))} – ${esc(fmtTime(b.end_at))}</span></button>`;
        if (b.buffer_minutes) html += `<div class="rbk-buf" style="top:${top + ht}px;height:${b.buffer_minutes * pxPerMin}px"></div>`;
      });
      if (date === todayVegas() && nowMs > dayStart && nowMs < vegasMs(date, toHM(hi))) {
        html += `<div class="rbk-now" style="top:${(nowMs - dayStart) / 60000 * pxPerMin}px"></div>`;
      }
      html += '</div>';
    });
    g.innerHTML = rooms.length ? html : '';

    g.querySelectorAll('.rbk-cell.free').forEach((c) => c.addEventListener('click', () => openBook({ roomId: c.getAttribute('data-room'), startHM: c.getAttribute('data-hm') })));
    g.querySelectorAll('.rbk-ev.click').forEach((c) => c.addEventListener('click', () => {
      const b = day.busy.find((x) => x.id === c.getAttribute('data-bk'));
      if (b) openBook({ booking: b });
    }));

    // Mine
    const list = $('.rbk-mine');
    if (list) {
      list.innerHTML = mine.length ? mine.map((b) => {
        const r = cfg.allRooms.find((x) => x.id === b.room_id);
        return `<div class="rbk-item"><span class="when">${esc(fmtDayShort(b.start_at))} · ${esc(fmtTime(b.start_at))} – ${esc(fmtTime(b.end_at))}</span>
          <span class="what">${esc(r?.name || 'Room')}${b.notes ? ` · ${esc(b.notes)}` : ''}</span>
          <span class="acts"><button type="button" class="rbk-btn" data-go="${esc(b.id)}">View</button><button type="button" class="rbk-btn" data-edit="${esc(b.id)}">Change</button><button type="button" class="rbk-btn dan" data-cancel="${esc(b.id)}">Cancel</button></span></div>`;
      }).join('') : '<div class="rbk-empty">You have no upcoming room bookings. Pick a free slot above to book one.</div>';
      list.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => {
        const bk = mine.find((x) => x.id === b.getAttribute('data-go')); if (bk) setDate(vegasDate(+new Date(bk.start_at)));
      }));
      list.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', async () => {
        const bk = mine.find((x) => x.id === b.getAttribute('data-edit'));
        if (!bk) return;
        const d = vegasDate(+new Date(bk.start_at));
        if (d !== date) { date = d; await refresh(); }
        const full = day.busy.find((x) => x.id === bk.id) || { ...bk, is_mine: true };
        openBook({ booking: full });
      }));
      list.querySelectorAll('[data-cancel]').forEach((b) => b.addEventListener('click', () => {
        const bk = mine.find((x) => x.id === b.getAttribute('data-cancel')); if (bk) confirmCancel(bk);
      }));
    }
  }

  // ------------------------------------------------ book / edit modal
  function openBook({ roomId = null, startHM = null, booking = null } = {}) {
    const rooms = admin ? cfg.allRooms : cfg.rooms;
    const editing = !!booking;
    let bDate = editing ? vegasDate(+new Date(booking.start_at)) : date;
    let bDay = day;
    const room0 = editing ? booking.room_id : (roomId || rooms[0]?.id);
    const agentPick = admin ? `<label>Booked for<select name="agent">${(opts.agents || []).map((a) => `<option value="${esc(a.id)}"${(editing ? booking.agent_id : '') === a.id ? ' selected' : ''}>${esc(a.full_name)}</option>`).join('')}</select></label>` : '';
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
