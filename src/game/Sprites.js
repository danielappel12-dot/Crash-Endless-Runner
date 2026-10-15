// Cartoon sprites for collectibles, crates, hazards and power-ups.
// Thick dark outlines + flat bright fills. Hazards/crates are anchored bottom-centre,
// collectibles centre.

const OUT = '#2b1608';

function stroke(ctx, lw = 4) {
  ctx.lineWidth = lw;
  ctx.strokeStyle = OUT;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}
function fillStroke(ctx, fill, lw = 4) {
  ctx.fillStyle = fill;
  ctx.fill();
  stroke(ctx, lw);
}
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function star(ctx, r, pts = 4, inner = 0.35) {
  ctx.beginPath();
  for (let i = 0; i < pts * 2; i++) {
    const rr = i % 2 ? r * inner : r;
    const a = (i / (pts * 2)) * Math.PI * 2 - Math.PI / 2;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
}

export function drawFruit(ctx, t, r = 28) {
  ctx.save();
  // leaves
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.75);
  ctx.quadraticCurveTo(-r * 0.9, -r * 1.7, -r * 1.05, -r * 0.95);
  ctx.quadraticCurveTo(-r * 0.4, -r * 0.9, 0, -r * 0.75);
  ctx.quadraticCurveTo(r * 0.5, -r * 1.9, r * 0.95, -r * 1.2);
  ctx.quadraticCurveTo(r * 0.6, -r * 0.8, 0, -r * 0.75);
  fillStroke(ctx, '#46d23c', 3.5);
  // body
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.95, 0, 0, 7);
  fillStroke(ctx, '#ff5a1e', 4);
  ctx.beginPath();
  ctx.ellipse(r * 0.28, r * 0.3, r * 0.55, r * 0.5, 0, 0, 7);
  ctx.fillStyle = '#ff8a3a';
  ctx.fill();
  // highlight
  ctx.beginPath();
  ctx.ellipse(-r * 0.4, -r * 0.3, r * 0.2, r * 0.32, 0.5, 0, 7);
  ctx.fillStyle = '#fff3e0';
  ctx.fill();
  ctx.restore();
}

const GEM = {
  green: { a: '#2cff7a', b: '#14b858', c: '#c8ffe0', pts: [[0, -34], [20, -8], [0, 34], [-20, -8]] },
  purple: { a: '#b04cff', b: '#7a2cc8', c: '#e8c8ff', pts: [[0, -30], [30, -9], [19, 28], [-19, 28], [-30, -9]] },
  blue: { a: '#3ca8ff', b: '#1f78d0', c: '#cbe8ff', pts: [[-16, -28], [16, -28], [32, -2], [0, 32], [-32, -2]] },
};

export function drawGem(ctx, kind, t) {
  const g = GEM[kind];
  ctx.save();
  const sc = 1 + Math.sin(t * 5) * 0.05;
  ctx.scale(sc, sc);
  ctx.shadowColor = g.a;
  ctx.shadowBlur = 18;
  ctx.beginPath();
  g.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  fillStroke(ctx, g.a, 4);
  ctx.shadowBlur = 0;
  // facets
  ctx.beginPath();
  ctx.moveTo(g.pts[0][0], g.pts[0][1]);
  ctx.lineTo(g.pts[1][0], g.pts[1][1]);
  ctx.lineTo(0, -2);
  ctx.closePath();
  ctx.fillStyle = g.c;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, -2);
  ctx.lineTo(g.pts[1][0], g.pts[1][1]);
  ctx.lineTo(g.pts[2][0], g.pts[2][1]);
  ctx.closePath();
  ctx.fillStyle = g.b;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = OUT;
  ctx.beginPath();
  g.pts.forEach(([x, y]) => { ctx.moveTo(0, -2); ctx.lineTo(x, y); });
  ctx.stroke();
  // sparkle
  ctx.save();
  ctx.translate(-14, -18);
  ctx.rotate(t * 2);
  star(ctx, 8 + Math.sin(t * 8) * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

export function drawRelic(ctx, t) {
  ctx.save();
  ctx.shadowColor = '#ffd23a';
  ctx.shadowBlur = 24;
  rrect(ctx, -26, 22, 52, 14, 4);
  fillStroke(ctx, '#d9a21a', 4);
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.moveTo(-14, 24);
  ctx.lineTo(-24, -12);
  ctx.lineTo(24, -12);
  ctx.lineTo(14, 24);
  ctx.closePath();
  fillStroke(ctx, '#ffcf2a', 4);
  ctx.beginPath();
  ctx.arc(0, -26, 20, 0, 7);
  fillStroke(ctx, '#ffdc4a', 4);
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 10, -42);
    ctx.lineTo(s * 24, -62);
    ctx.lineTo(s * 24, -36);
    ctx.closePath();
    fillStroke(ctx, '#ffcf2a', 3.5);
    ctx.beginPath();
    ctx.ellipse(s * 8, -28, 5, 7, 0, 0, 7);
    fillStroke(ctx, '#2fe8d8', 2.5);
  }
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.lineTo(8, 4);
  ctx.lineTo(0, 14);
  ctx.lineTo(-8, 4);
  ctx.closePath();
  fillStroke(ctx, '#2fe8d8', 3);
  ctx.save();
  ctx.translate(-22, -48 + Math.sin(t * 4) * 2);
  ctx.rotate(t * 2);
  star(ctx, 9);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

// ---------------------------------------------------------------- crates
const CRATE = {
  fruit: { base: '#d9964e', frame: '#8a5424' },
  bouncy: { base: '#c4934e', frame: '#33a83a' },
  mystery: { base: '#b583e8', frame: '#6a3aa8' },
  tnt: { base: '#e63a24', frame: '#a81c0e' },
  metal: { base: '#8fa3b0', frame: '#566673' },
};

export function drawCrate(ctx, kind, s, t, flash = 0) {
  const c = CRATE[kind];
  const x = -s / 2, y = -s;
  rrect(ctx, x, y, s, s, 9);
  fillStroke(ctx, flash > 0 ? '#fff2c8' : c.base, 5);
  // plank lines
  if (kind !== 'metal') {
    ctx.strokeStyle = 'rgba(40,20,8,0.28)';
    ctx.lineWidth = 2;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(x + 8, y + (s * i) / 4);
      ctx.lineTo(x + s - 8, y + (s * i) / 4);
      ctx.stroke();
    }
  }
  // frame
  rrect(ctx, x + 5, y + 5, s - 10, s - 10, 6);
  ctx.lineWidth = 9;
  ctx.strokeStyle = c.frame;
  ctx.stroke();
  rrect(ctx, x, y, s, s, 9);
  stroke(ctx, 5);
  // diagonal brace
  ctx.beginPath();
  ctx.moveTo(x + 10, y + 10);
  ctx.lineTo(x + s - 10, y + s - 10);
  ctx.lineWidth = 7;
  ctx.strokeStyle = c.frame;
  ctx.stroke();
  // bolts
  ctx.fillStyle = '#f4efd8';
  for (const [bx, by] of [[x + 10, y + 10], [x + s - 10, y + 10], [x + 10, y + s - 10], [x + s - 10, y + s - 10]]) {
    ctx.beginPath();
    ctx.arc(bx, by, 3.5, 0, 7);
    ctx.fill();
  }
  // label plate
  ctx.save();
  ctx.translate(0, -s / 2);
  if (kind === 'fruit') {
    ctx.beginPath();
    ctx.arc(0, 0, 21, 0, 7);
    fillStroke(ctx, '#fff0cf', 3.5);
    ctx.scale(0.55, 0.55);
    drawFruit(ctx, 0, 28);
  } else if (kind === 'bouncy') {
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(24, 2);
    ctx.lineTo(10, 2);
    ctx.lineTo(10, 22);
    ctx.lineTo(-10, 22);
    ctx.lineTo(-10, 2);
    ctx.lineTo(-24, 2);
    ctx.closePath();
    fillStroke(ctx, '#7cff5a', 3.5);
  } else if (kind === 'mystery') {
    ctx.font = '900 62px Impact, "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 9;
    ctx.strokeStyle = OUT;
    ctx.strokeText('?', 0, 3);
    ctx.fillStyle = '#ffd23a';
    ctx.fillText('?', 0, 3);
  } else if (kind === 'tnt') {
    rrect(ctx, -30, -17, 60, 34, 5);
    fillStroke(ctx, '#fff2c8', 3.5);
    ctx.font = '900 25px Impact, "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#c4200e';
    ctx.fillText('TNT', 0, 2);
  } else {
    ctx.beginPath();
    ctx.rect(-28, -10, 56, 20);
    ctx.fillStyle = '#ffcf2a';
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#222';
    for (let i = -4; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 14, -10);
      ctx.lineTo(i * 14 + 7, -10);
      ctx.lineTo(i * 14 - 3, 10);
      ctx.lineTo(i * 14 - 10, 10);
      ctx.fill();
    }
    ctx.restore();
    ctx.beginPath();
    ctx.rect(-28, -10, 56, 20);
    stroke(ctx, 3);
  }
  ctx.restore();
  if (kind === 'tnt') {
    // fuse
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.quadraticCurveTo(8, y - 14, 18, y - 12);
    ctx.lineWidth = 5;
    ctx.strokeStyle = OUT;
    ctx.stroke();
    ctx.save();
    ctx.translate(20, y - 14);
    ctx.rotate(t * 6);
    star(ctx, 9 + Math.sin(t * 30) * 3, 4, 0.4);
    ctx.fillStyle = '#ffd23a';
    ctx.fill();
    ctx.restore();
  }
}

// ---------------------------------------------------------------- hazards
export function drawLog(ctx, w, h) {
  const r = h / 2;
  rrect(ctx, -w / 2, -h, w, h, r);
  fillStroke(ctx, '#9a5e2e', 5);
  ctx.strokeStyle = '#6a3c1a';
  ctx.lineWidth = 3;
  for (const dy of [-h * 0.7, -h * 0.4]) {
    ctx.beginPath();
    ctx.moveTo(-w / 2 + r, dy);
    ctx.lineTo(w / 2 - r * 1.4, dy);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.ellipse(w / 2 - r * 0.6, -r, r * 0.55, r * 0.8, 0, 0, 7);
  fillStroke(ctx, '#e9c48a', 4);
  ctx.beginPath();
  ctx.ellipse(w / 2 - r * 0.6, -r, r * 0.28, r * 0.42, 0, 0, 7);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#a8742f';
  ctx.stroke();
  // moss + leaf
  ctx.beginPath();
  ctx.ellipse(-w * 0.12, -h + 3, w * 0.2, 9, 0, 0, 7);
  fillStroke(ctx, '#58d048', 3.5);
  ctx.beginPath();
  ctx.ellipse(-w * 0.34, -h * 0.55, 6, 12, 0.3, 0, 7);
  fillStroke(ctx, '#46d23c', 3);
}

export function drawRock(ctx, w, h) {
  ctx.beginPath();
  ctx.moveTo(-w / 2, 0);
  ctx.quadraticCurveTo(-w * 0.58, -h * 0.55, -w * 0.25, -h * 0.9);
  ctx.quadraticCurveTo(0, -h * 1.08, w * 0.28, -h * 0.85);
  ctx.quadraticCurveTo(w * 0.6, -h * 0.5, w / 2, 0);
  ctx.closePath();
  fillStroke(ctx, '#9c9388', 5);
  ctx.beginPath();
  ctx.moveTo(-w * 0.3, -h * 0.2);
  ctx.quadraticCurveTo(-w * 0.1, -h * 0.5, w * 0.1, -h * 0.35);
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(40,30,20,0.5)';
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(-w * 0.2, -h * 0.55, w * 0.1, h * 0.14, 0.6, 0, 7);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fill();
  // moss cap
  ctx.beginPath();
  ctx.moveTo(-w * 0.28, -h * 0.82);
  ctx.quadraticCurveTo(-w * 0.1, -h * 1.08, w * 0.3, -h * 0.84);
  ctx.quadraticCurveTo(w * 0.1, -h * 0.66, -w * 0.05, -h * 0.74);
  ctx.quadraticCurveTo(-w * 0.18, -h * 0.64, -w * 0.28, -h * 0.82);
  fillStroke(ctx, '#58d048', 3.5);
}

export function drawBarricade(ctx, w, h, t, warn = 0) {
  const n = 5;
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + 10 + (i * (w - 20)) / (n - 1);
    const hh = h * (0.85 + (i % 2) * 0.15);
    ctx.beginPath();
    ctx.moveTo(x - 9, 0);
    ctx.lineTo(x - 9, -hh + 20);
    ctx.lineTo(x, -hh - 6);
    ctx.lineTo(x + 9, -hh + 20);
    ctx.lineTo(x + 9, 0);
    ctx.closePath();
    fillStroke(ctx, '#c28a4c', 4);
    ctx.beginPath();
    ctx.moveTo(x - 4, -hh + 18);
    ctx.lineTo(x, -hh - 2);
    ctx.lineTo(x + 4, -hh + 18);
    ctx.fillStyle = '#f6ecd0';
    ctx.fill();
  }
  for (const by of [-h * 0.28, -h * 0.62]) {
    rrect(ctx, -w / 2 - 4, by - 7, w + 8, 14, 5);
    fillStroke(ctx, '#7a4a28', 4);
  }
  // red rag
  ctx.beginPath();
  ctx.moveTo(w * 0.12, -h * 0.62);
  ctx.quadraticCurveTo(w * 0.28, -h * 0.5 + Math.sin(t * 6) * 4, w * 0.2, -h * 0.34);
  ctx.lineTo(w * 0.04, -h * 0.62);
  fillStroke(ctx, '#ee3a2a', 3);
}

export function drawBranch(ctx, w, y0, t) {
  // hangs from above the screen down to bottom edge at y = -y0 (anchor at ground level, y0 up)
  const bottom = -y0;
  const top = -900;
  for (const dx of [-w * 0.32, 0, w * 0.34]) {
    const sway = Math.sin(t * 2 + dx) * 4;
    ctx.beginPath();
    ctx.moveTo(dx - 9, top);
    ctx.lineTo(dx - 7 + sway, bottom - 20);
    ctx.lineTo(dx + 7 + sway, bottom - 20);
    ctx.lineTo(dx + 9, top);
    ctx.closePath();
    fillStroke(ctx, '#3fb83a', 3.5);
  }
  // thick branch
  rrect(ctx, -w / 2, bottom - 70, w, 34, 16);
  fillStroke(ctx, '#7a4a28', 5);
  // leaf clump
  const leaves = [[-w * 0.38, -18, 30], [-w * 0.18, -8, 36], [0, -4, 40], [w * 0.2, -10, 36], [w * 0.4, -18, 30]];
  leaves.forEach(([lx, ly, r], i) => {
    ctx.beginPath();
    ctx.arc(lx, bottom + ly - 34, r, 0, 7);
    fillStroke(ctx, ['#36b83c', '#46d23c', '#2a9f3a'][i % 3], 4.5);
  });
  for (const [lx, ly, r] of leaves) {
    ctx.beginPath();
    ctx.ellipse(lx - r * 0.3, bottom + ly - 34 - r * 0.3, r * 0.3, r * 0.2, -0.5, 0, 7);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fill();
  }
  // hanging leaf tips + warning drops
  for (let i = -2; i <= 2; i++) {
    const lx = (i * w) / 5.5;
    const sw = Math.sin(t * 3 + i) * 3;
    ctx.beginPath();
    ctx.moveTo(lx - 7, bottom - 24);
    ctx.quadraticCurveTo(lx + sw, bottom + 8, lx + 7, bottom - 24);
    fillStroke(ctx, '#5cdc4a', 3.5);
  }
}

export function drawBoulder(ctx, r, rot, t) {
  ctx.save();
  ctx.translate(0, -r);
  ctx.save();
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, 7);
  fillStroke(ctx, '#9a8878', 5);
  ctx.strokeStyle = 'rgba(40,25,15,0.55)';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(-r * 0.7, -r * 0.2);
  ctx.lineTo(-r * 0.3, -r * 0.1);
  ctx.lineTo(-r * 0.4, r * 0.3);
  ctx.moveTo(r * 0.2, -r * 0.7);
  ctx.lineTo(r * 0.1, -r * 0.35);
  ctx.lineTo(r * 0.5, -r * 0.2);
  ctx.moveTo(r * 0.3, r * 0.5);
  ctx.lineTo(r * 0.55, r * 0.25);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(-r * 0.3, -r * 0.55, r * 0.28, r * 0.15, 0.5, 0, 7);
  fillStroke(ctx, '#58d048', 3);
  ctx.restore();
  // angry eyes (don't rotate)
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * r * 0.3, -r * 0.05, r * 0.2, r * 0.24, 0, 0, 7);
    fillStroke(ctx, '#fff', 3.5);
    ctx.beginPath();
    ctx.arc(s * r * 0.3 - r * 0.07, 0, r * 0.08, 0, 7);
    ctx.fillStyle = '#111';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s * r * 0.55, -r * 0.4);
    ctx.lineTo(s * r * 0.08, -r * 0.22);
    ctx.lineWidth = 6;
    ctx.strokeStyle = OUT;
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- power-ups
export function drawPowerup(ctx, type, t) {
  ctx.save();
  const pulse = 1 + Math.sin(t * 6) * 0.07;
  ctx.scale(pulse * 1.1, pulse * 1.1);
  ctx.shadowBlur = 22;
  if (type === 'magnet') {
    ctx.shadowColor = '#ff4a4a';
    ctx.beginPath();
    ctx.arc(0, -4, 28, Math.PI, 0);
    ctx.lineWidth = 24;
    ctx.strokeStyle = OUT;
    ctx.stroke();
    ctx.lineWidth = 15;
    ctx.strokeStyle = '#ee2a2a';
    ctx.stroke();
    ctx.shadowBlur = 0;
    for (const s of [-1, 1]) {
      rrect(ctx, s * 28 - 12, -6, 24, 26, 4);
      fillStroke(ctx, '#f2f2f2', 4);
      ctx.fillStyle = '#ee2a2a';
      ctx.fillRect(s * 28 - 9, -4, 18, 8);
    }
  } else if (type === 'shield') {
    ctx.shadowColor = '#3ab8ff';
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, 7);
    ctx.fillStyle = 'rgba(90,200,255,0.55)';
    ctx.fill();
    stroke(ctx, 4.5);
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.ellipse(-12, -14, 9, 15, 0.6, 0, 7);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fill();
    ctx.save();
    ctx.rotate(t * 2);
    star(ctx, 15, 5, 0.5);
    fillStroke(ctx, '#bfe8ff', 3);
    ctx.restore();
  } else {
    ctx.shadowColor = '#ffcf2a';
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, 7);
    fillStroke(ctx, '#ffcf2a', 4.5);
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, 7);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#d98a00';
    ctx.stroke();
    ctx.font = '900 30px Impact, "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 6;
    ctx.strokeStyle = OUT;
    ctx.strokeText('x2', 0, 2);
    ctx.fillStyle = '#fff';
    ctx.fillText('x2', 0, 2);
  }
  ctx.restore();
}
