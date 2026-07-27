// Branded side-cannon confetti, fired on a completed booking.
//
// Shared by BrokerBooking.astro (calendar booking) and LeadForm.astro (form
// submission) so both celebrations look like the same brand rather than two
// different implementations that drifted.
//
// Renders to a fixed, full-viewport canvas rather than one scoped to a card,
// so the cannons genuinely fire from the edges of the screen. The canvas is
// created on demand and removed when the last particle dies. Nothing is left
// in the DOM between bookings.

const BRAND = [
  '#197bff', // --blue
  '#19c8ff', // cyan accent used across the gradients
  '#007db3', // --accent
  '#0f3567', // --navy
  '#f5b942', // --gold
  '#66e0ff', // pale cyan from the button sheen
  '#ffffff',
];

let running = false;

export function fireConfetti(): void {
  if (typeof window === 'undefined') return;

  // Motion this large is exactly what a reduced-motion preference is for.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // A double-fire would double the particle count and tank the frame rate on
  // a mid-range phone. One celebration at a time.
  if (running) return;
  running = true;

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText =
    'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483000;';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) { canvas.remove(); running = false; return; }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let vw = window.innerWidth;
  let vh = window.innerHeight;
  const size = () => {
    vw = window.innerWidth;
    vh = window.innerHeight;
    canvas.width = Math.floor(vw * dpr);
    canvas.height = Math.floor(vh * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  size();
  window.addEventListener('resize', size);

  interface Piece {
    x: number; y: number; vx: number; vy: number;
    w: number; h: number; rot: number; vr: number;
    color: string; life: number; maxLife: number; round: boolean;
  }
  const pieces: Piece[] = [];

  // side 0 = left edge firing right, side 1 = right edge firing left.
  function cannon(side: 0 | 1, count: number, power: number) {
    for (let i = 0; i < count; i++) {
      // Aim slightly upward and inward, with spread so it reads as a burst
      // rather than a straight line.
      const spread = (Math.random() - 0.5) * 0.85;
      const angle = (side === 0 ? -0.32 : Math.PI + 0.32) + spread;
      const speed = (8 + Math.random() * 10) * power;
      pieces.push({
        x: side === 0 ? -10 : vw + 10,
        y: vh * (0.5 + Math.random() * 0.3),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 6 - Math.random() * 4,
        w: 6 + Math.random() * 7,
        h: 4 + Math.random() * 6,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.35,
        color: BRAND[(Math.random() * BRAND.length) | 0],
        life: 0,
        maxLife: 150 + Math.random() * 90,
        round: Math.random() < 0.18, // a few dots among the ribbons
      });
    }
  }

  const scale = Math.min(1, vw / 1200); // fewer particles on small screens
  const per = Math.round(80 * Math.max(0.55, scale));

  cannon(0, per, 1); cannon(1, per, 1);
  window.setTimeout(() => { cannon(0, Math.round(per * 0.7), 0.9); cannon(1, Math.round(per * 0.7), 0.9); }, 260);
  window.setTimeout(() => { cannon(0, Math.round(per * 0.45), 0.8); cannon(1, Math.round(per * 0.45), 0.8); }, 620);

  let frames = 0;
  const MAX_FRAMES = 60 * 12; // hard stop, so a backgrounded tab can't spin forever

  function tick() {
    ctx.clearRect(0, 0, vw, vh);

    for (let i = pieces.length - 1; i >= 0; i--) {
      const p = pieces[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.3;      // gravity
      p.vx *= 0.987;    // drag
      p.vy *= 0.995;
      p.rot += p.vr;
      p.life++;

      // Fade over the last third of life rather than popping out.
      const remaining = p.maxLife - p.life;
      ctx.globalAlpha = Math.max(0, Math.min(1, remaining / 45));
      ctx.fillStyle = p.color;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      if (p.round) {
        ctx.beginPath();
        ctx.arc(0, 0, p.h / 1.6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Squash on rotation so flat ribbons read as tumbling in 3D.
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.rot * 1.4)));
      }
      ctx.restore();

      if (p.life >= p.maxLife || p.y > vh + 40) pieces.splice(i, 1);
    }
    ctx.globalAlpha = 1;

    if (pieces.length && frames++ < MAX_FRAMES) {
      window.requestAnimationFrame(tick);
    } else {
      window.removeEventListener('resize', size);
      canvas.remove();
      running = false;
    }
  }

  window.requestAnimationFrame(tick);
}
