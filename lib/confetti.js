// Small confetti burst with a few graduation caps. Draws on a fixed full-screen canvas.
export function burst(x, y) {
  if (typeof window === "undefined") return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let c = document.getElementById("confetti");
  if (!c) { c = document.createElement("canvas"); c.id = "confetti"; document.body.appendChild(c); }
  const ctx = c.getContext("2d"), dpr = window.devicePixelRatio || 1;
  c.width = innerWidth * dpr; c.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cols = ["#1e6b3c", "#5aa469", "#a7cf6b", "#f2b84b", "#ffffff"];
  const P = Array.from({ length: 90 }, () => ({
    x, y, vx: (Math.random() - 0.5) * 9, vy: -Math.random() * 9 - 3, s: 4 + Math.random() * 5,
    r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: cols[(Math.random() * cols.length) | 0], cap: Math.random() < 0.12,
  }));
  let t = 0; c.style.display = "block";
  (function frame() {
    ctx.clearRect(0, 0, innerWidth, innerHeight); t++;
    for (const p of P) {
      p.vy += 0.28; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      if (p.cap) {
        ctx.fillStyle = "#143322"; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(0, -4); ctx.lineTo(8, 0); ctx.lineTo(0, 4); ctx.closePath(); ctx.fill(); ctx.fillRect(-4, 1, 8, 4);
      } else { ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); }
      ctx.restore();
    }
    if (t < 110) requestAnimationFrame(frame); else { ctx.clearRect(0, 0, innerWidth, innerHeight); c.style.display = "none"; }
  })();
}
