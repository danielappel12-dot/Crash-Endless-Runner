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
  } else if (type === 'mask') {
    ctx.shadowColor = '#ffd23a';
    ctx.scale(0.95, 0.95);
    drawMask(ctx, t, false);
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

// ---------------------------------------------------------------- spirit mask
// An original tribal guardian mask: carved wood face, teal war paint, feather crown.
export function drawMask(ctx, t, gold = false, wobble = 0) {
  ctx.save();
  ctx.rotate(Math.sin(t * 2.3) * 0.08 + wobble);
  const wood = gold ? '#ffd23a' : '#d79a52';
  const woodD = gold ? '#e0a010' : '#a56a2c';
  const paint = gold ? '#fff2a0' : '#2fd8c8';
  // feather crown
  const feathers = [[-26, -26, -0.7, '#ff5a3a'], [-13, -34, -0.3, '#ffb02a'], [0, -38, 0, '#2fd8c8'], [13, -34, 0.3, '#ffb02a'], [26, -26, 0.7, '#ff5a3a']];
  feathers.forEach(([fx, fy, rot, col], i) => {
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(rot + Math.sin(t * 3 + i) * 0.05);
    ctx.beginPath();
    ctx.ellipse(0, -16, 8, 20, 0, 0, 7);
    fillStroke(ctx, gold ? '#fff2a0' : col, 3.5);
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(0, -30);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(40,20,8,0.45)';
    ctx.stroke();
    ctx.restore();
  });
  // face
  ctx.beginPath();
  ctx.ellipse(0, 0, 30, 38, 0, 0, 7);
  fillStroke(ctx, wood, 4.5);
  // wood grain + cheek paint
  ctx.strokeStyle = woodD;
  ctx.lineWidth = 2.5;
  for (const dy of [-18, 0, 18]) {
    ctx.beginPath();
    ctx.moveTo(-16, dy + 6);
    ctx.quadraticCurveTo(0, dy + 10, 16, dy + 6);
    ctx.stroke();
  }
  ctx.fillStyle = paint;
  for (const s2 of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s2 * 30, 4);
    ctx.lineTo(s2 * 14, 8);
    ctx.lineTo(s2 * 22, 20);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = OUT;
    ctx.stroke();
  }
  // brows
  ctx.lineWidth = 6;
  ctx.strokeStyle = OUT;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-23, -16);
  ctx.lineTo(-6, -9);
  ctx.moveTo(23, -16);
  ctx.lineTo(6, -9);
  ctx.stroke();
  // carved eyes
  for (const s2 of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s2 * 14, -2, 9, 11, 0, 0, 7);
    fillStroke(ctx, '#fff', 3.5);
    ctx.beginPath();
    ctx.arc(s2 * 14 + (Math.sin(t) * 2), 0, 4.5, 0, 7);
    ctx.fillStyle = '#1a0f08';
    ctx.fill();
  }
  // nose ridge
  ctx.beginPath();
  ctx.moveTo(0, -4);
  ctx.lineTo(6, 12);
  ctx.lineTo(-6, 12);
  ctx.closePath();
  fillStroke(ctx, woodD, 3);
  // grin with tusks
  ctx.beginPath();
  ctx.moveTo(-14, 22);
  ctx.quadraticCurveTo(0, 32, 14, 22);
  ctx.quadraticCurveTo(0, 27, -14, 22);
  fillStroke(ctx, '#3a1408', 3);
  for (const s2 of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s2 * 9, 23);
    ctx.lineTo(s2 * 12, 33);
    ctx.lineTo(s2 * 5, 25);
    ctx.closePath();
    fillStroke(ctx, '#fff7e0', 2.5);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- enemies
export function drawScuttler(ctx, w, h, t, dir = -1) {
  ctx.save();
  ctx.scale(-dir, 1); // faces `dir`
  const step = Math.sin(t * 14);
  ctx.strokeStyle = OUT;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const lx = -w * 0.28 + i * w * 0.28;
    const ph = step * (i % 2 ? 1 : -1) * 7;
    ctx.beginPath();
    ctx.moveTo(lx, -h * 0.35);
    ctx.lineTo(lx + ph, 0);
    ctx.lineWidth = 9;
    ctx.stroke();
    ctx.strokeStyle = '#7a2a1a';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.strokeStyle = OUT;
  }
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h * 0.3);
  ctx.quadraticCurveTo(-w * 0.5, -h * 1.15, 0, -h * 1.05);
  ctx.quadraticCurveTo(w * 0.5, -h * 1.15, w / 2, -h * 0.3);
  ctx.closePath();
  fillStroke(ctx, '#e8402a', 4.5);
  for (const [sx, sy, r] of [[-w * 0.18, -h * 0.75, 7], [w * 0.1, -h * 0.85, 8], [w * 0.28, -h * 0.55, 6]]) {
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, 7);
    ctx.fillStyle = '#7a1a10';
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(-w * 0.12, -h * 0.9, w * 0.1, h * 0.12, -0.5, 0, 7);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fill();
  // head + angry eyes
  ctx.beginPath();
  ctx.ellipse(-w * 0.46, -h * 0.4, w * 0.2, h * 0.3, 0, 0, 7);
  fillStroke(ctx, '#3a1a1a', 4);
  for (const ex of [-w * 0.52, -w * 0.4]) {
    ctx.beginPath();
    ctx.arc(ex, -h * 0.46, 6.5, 0, 7);
    fillStroke(ctx, '#ffe94a', 2.5);
    ctx.beginPath();
    ctx.arc(ex - 1.5, -h * 0.45, 2.6, 0, 7);
    ctx.fillStyle = '#111';
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(-w * 0.6, -h * 0.62);
  ctx.lineTo(-w * 0.34, -h * 0.54);
  ctx.lineWidth = 4;
  ctx.strokeStyle = OUT;
  ctx.stroke();
  ctx.restore();
}

export function drawSpiky(ctx, w, t) {
  const r = w * 0.38;
  ctx.save();
  ctx.translate(0, -r - 6);
  ctx.rotate(Math.sin(t * 2) * 0.12);
  const n = 12;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    ctx.save();
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(-8, -r + 4);
    ctx.lineTo(0, -r - 24);
    ctx.lineTo(8, -r + 4);
    ctx.closePath();
    fillStroke(ctx, '#ffd23a', 3);
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, 7);
  fillStroke(ctx, '#8a4ae0', 4.5);
  ctx.beginPath();
  ctx.ellipse(-r * 0.35, -r * 0.45, r * 0.22, r * 0.14, -0.6, 0, 7);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fill();
  ctx.rotate(-Math.sin(t * 2) * 0.12);
  for (const ex of [-r * 0.36, r * 0.36]) {
    ctx.beginPath();
    ctx.ellipse(ex, -r * 0.05, 8, 10, 0, 0, 7);
    fillStroke(ctx, '#fff', 3);
    ctx.beginPath();
    ctx.arc(ex - 1.5, 0, 3.5, 0, 7);
    ctx.fillStyle = '#111';
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(-r * 0.62, -r * 0.4);
  ctx.lineTo(-r * 0.12, -r * 0.2);
  ctx.moveTo(r * 0.62, -r * 0.4);
  ctx.lineTo(r * 0.12, -r * 0.2);
  ctx.lineWidth = 5;
  ctx.strokeStyle = OUT;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-r * 0.3, r * 0.4);
  ctx.quadraticCurveTo(0, r * 0.2, r * 0.3, r * 0.4);
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();
}

export function drawBat(ctx, w, t) {
  ctx.save();
  const flap = Math.sin(t * 16);
  ctx.translate(0, -26);
  for (const s2 of [-1, 1]) {
    ctx.save();
    ctx.scale(s2, 1);
    ctx.rotate(flap * 0.45);
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.quadraticCurveTo(w * 0.35, -w * 0.45, w * 0.62, -6);
    ctx.lineTo(w * 0.46, 4);
    ctx.lineTo(w * 0.36, -2);
    ctx.lineTo(w * 0.24, 8);
    ctx.closePath();
    fillStroke(ctx, '#6a3aa8', 4);
    ctx.restore();
  }
  ctx.beginPath();
  ctx.ellipse(0, 0, 22, 26, 0, 0, 7);
  fillStroke(ctx, '#4a2a7a', 4.5);
  for (const s2 of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s2 * 8, -22);
    ctx.lineTo(s2 * 15, -38);
    ctx.lineTo(s2 * 20, -20);
    ctx.closePath();
    fillStroke(ctx, '#4a2a7a', 3.5);
    ctx.beginPath();
    ctx.ellipse(s2 * 9, -5, 7, 9, 0, 0, 7);
    fillStroke(ctx, '#ffe94a', 3);
    ctx.beginPath();
    ctx.arc(s2 * 8, -4, 3, 0, 7);
    ctx.fillStyle = '#111';
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(-14, -14);
  ctx.lineTo(-3, -10);
  ctx.moveTo(14, -14);
  ctx.lineTo(3, -10);
  ctx.lineWidth = 4;
  ctx.strokeStyle = OUT;
  ctx.stroke();
  for (const s2 of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s2 * 4, 12);
    ctx.lineTo(s2 * 7, 22);
    ctx.lineTo(s2 * 1, 14);
    ctx.closePath();
    fillStroke(ctx, '#fff', 2.5);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- platforms
// anchored bottom-centre of the slab; the visible slab is `h` tall plus a decorative underside
export function drawPlatform(ctx, biome, w, h, t) {
  const x = -w / 2;
  const top = -h;
  if (biome === 'ruins') {
    rrect(ctx, x, top, w, h + 8, 6);
    fillStroke(ctx, '#cdbd90', 4.5);
    ctx.fillStyle = '#2fd8c8';
    for (let i = x + 20; i < w / 2 - 30; i += 70) ctx.fillRect(i, top + h * 0.45, 36, 6);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 3;
    for (let i = x + 90; i < w / 2 - 20; i += 140) {
      ctx.beginPath();
      ctx.moveTo(i, top + 3);
      ctx.lineTo(i, top + h + 6);
      ctx.stroke();
    }
  } else if (biome === 'lagoon') {
    for (let i = x; i < w / 2 - 10; i += 46) {
      rrect(ctx, i + 2, top, 42, h + 2, 4);
      fillStroke(ctx, ['#c8904a', '#b27a38', '#d19a54'][((i - x) / 46) | 0 % 3 ? 0 : 1], 3.5);
    }
    ctx.strokeStyle = '#e8d29a';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x + 10, top + h + 6);
    ctx.quadraticCurveTo(0, top + h + 26, w / 2 - 10, top + h + 6);
    ctx.stroke();
  } else if (biome === 'rocky') {
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(w / 2, top);
    ctx.lineTo(w / 2 - 20, top + h + 18);
    ctx.lineTo(x + 30, top + h + 24);
    ctx.closePath();
    fillStroke(ctx, '#a8744a', 4.5);
    ctx.fillStyle = '#8ad04a';
    ctx.fillRect(x + 3, top, w - 6, 9);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 3.5;
    ctx.strokeRect(x + 3, top, w - 6, 9);
  } else {
    // floating jungle island
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(w / 2, top);
    ctx.quadraticCurveTo(w / 2 - 10, top + h + 24, w / 2 - 50, top + h + 30);
    ctx.lineTo(x + 50, top + h + 30);
    ctx.quadraticCurveTo(x + 10, top + h + 24, x, top);
    ctx.closePath();
    fillStroke(ctx, '#c8803e', 4.5);
    ctx.beginPath();
    ctx.moveTo(x - 2, top - 2);
    ctx.lineTo(w / 2 + 2, top - 2);
    ctx.lineTo(w / 2 + 2, top + 12);
    for (let i = w / 2; i >= x; i -= 26) ctx.quadraticCurveTo(i - 13, top + 24, i - 26, top + 12);
    ctx.closePath();
    fillStroke(ctx, '#62dc4c', 4);
    for (const rx of [x + 60, 0, w / 2 - 70]) {
      ctx.beginPath();
      ctx.moveTo(rx, top + h + 24);
      ctx.quadraticCurveTo(rx + 8 + Math.sin(t * 2 + rx) * 3, top + h + 44, rx + 2, top + h + 58);
      ctx.lineWidth = 6;
      ctx.strokeStyle = OUT;
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#46d23c';
      ctx.stroke();
    }
  }
}

// Rukk's face (HUD portrait): same design as the in-game head
export function drawHeroFace(ctx) {
  const FUR = '#e2782a', FUR_D = '#b85516', BELLY = '#ffd9a0';
  const ear = (x, y, ang, sc) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.scale(sc, sc);
    ctx.beginPath();
    ctx.moveTo(-13, 0);
    ctx.quadraticCurveTo(-18, -50, 2, -66);
    ctx.quadraticCurveTo(18, -46, 13, 0);
    ctx.closePath();
    fillStroke(ctx, FUR, 4.5);
    ctx.beginPath();
    ctx.moveTo(-6, -4);
    ctx.quadraticCurveTo(-8, -38, 2, -52);
    ctx.quadraticCurveTo(9, -36, 6, -4);
    ctx.closePath();
    ctx.fillStyle = '#ff9aa6';
    ctx.fill();
    ctx.restore();
  };
  ctx.save();
  ctx.translate(-6, 8);
  ear(-14, -22, -0.45, 1);
  ctx.beginPath();
  ctx.arc(0, 0, 31, 0, 7);
  fillStroke(ctx, FUR, 4.5);
  ctx.beginPath();
  ctx.ellipse(31, 8, 25, 15, 0.12, 0, 7);
  fillStroke(ctx, FUR, 4.5);
  ctx.beginPath();
  ctx.ellipse(32, 15, 20, 8, 0.1, 0, 7);
  fillStroke(ctx, BELLY, 3);
  ctx.beginPath();
  ctx.ellipse(54, 3, 8, 7, 0, 0, 7);
  ctx.fillStyle = '#2a1410';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(36, 12, 13, 0.1, 2.0);
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = OUT;
  ctx.stroke();
  for (const [ex, ey, rx, ry] of [[-3, -8, 11, 15], [17, -8, 14, 18]]) {
    ctx.beginPath();
    ctx.ellipse(ex, ey, rx, ry, 0, 0, 7);
    fillStroke(ctx, '#fff', 4);
    ctx.beginPath();
    ctx.ellipse(ex + 3, ey + 1, rx * 0.55, ry * 0.62, 0, 0, 7);
    ctx.fillStyle = '#2a72e8';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(ex + 4.5, ey + 1, rx * 0.3, ry * 0.4, 0, 0, 7);
    ctx.fillStyle = '#101010';
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(6, -30);
  ctx.lineTo(30, -24);
  ctx.lineWidth = 6;
  ctx.strokeStyle = FUR_D;
  ctx.stroke();
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(-2 + i * 8, -28);
    ctx.lineTo(i * 10 + 6, -46 - (i === 0 ? 5 : 0));
    ctx.lineTo(8 + i * 8, -28);
    fillStroke(ctx, FUR_D, 3);
  }
  ear(4, -26, 0.2, 1.1);
  ctx.restore();
}

// ---------------------------------------------------------------- boss
export function drawCoconut(ctx, r, rot, t, hot = false) {
  ctx.save();
  ctx.translate(0, -r);
  ctx.save();
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, 7);
  fillStroke(ctx, hot ? '#e8a04a' : '#8a5a32', 4.5);
  ctx.strokeStyle = 'rgba(40,20,8,0.55)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.35 * (i % 2 ? 1 : 0.2) + 4, r * 0.95, (i * Math.PI) / 4, 0, 7);
    ctx.stroke();
  }
  ctx.restore();
  // angry eyes + fuse
  for (const s2 of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s2 * r * 0.32, -r * 0.05, r * 0.2, r * 0.24, 0, 0, 7);
    fillStroke(ctx, '#fff', 3);
    ctx.beginPath();
    ctx.arc(s2 * r * 0.32 - 2, 0, r * 0.08, 0, 7);
    ctx.fillStyle = '#111';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s2 * r * 0.58, -r * 0.4);
    ctx.lineTo(s2 * r * 0.1, -r * 0.22);
    ctx.lineWidth = 5;
    ctx.strokeStyle = OUT;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.quadraticCurveTo(r * 0.3, -r * 1.4, r * 0.1, -r * 1.55);
  ctx.lineWidth = 5;
  ctx.strokeStyle = OUT;
  ctx.stroke();
  ctx.save();
  ctx.translate(r * 0.12, -r * 1.58);
  ctx.rotate(t * 9);
  star(ctx, 9 + Math.sin(t * 30) * 3, 4, 0.4);
  ctx.fillStyle = hot ? '#7cff5a' : '#ffd23a';
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

// KING SCUTTLER: a huge crowned beetle. o = {state, flash, t}
export function drawBossBeetle(ctx, t, o) {
  ctx.save();
  const stunned = o.state === 'stun';
  const windup = o.state === 'windup';
  const bob = Math.sin(t * 6) * (stunned ? 0 : 3);
  ctx.translate(0, bob);
  if (o.flash > 0 && Math.sin(o.flash * 60) > 0) ctx.globalAlpha = 0.55;
  drawScuttler(ctx, 150, 106, stunned ? 0 : t * 0.5, -1);
  // crown
  ctx.save();
  ctx.translate(-4, -110);
  ctx.beginPath();
  ctx.moveTo(-34, 0);
  ctx.lineTo(-34, -30);
  ctx.lineTo(-17, -14);
  ctx.lineTo(0, -38);
  ctx.lineTo(17, -14);
  ctx.lineTo(34, -30);
  ctx.lineTo(34, 0);
  ctx.closePath();
  fillStroke(ctx, '#ffcf2a', 4.5);
  for (const [gx, col] of [[-20, '#2fd8c8'], [0, '#ff4a6a'], [20, '#2fd8c8']]) {
    ctx.beginPath();
    ctx.arc(gx, -9, 6, 0, 7);
    fillStroke(ctx, col, 2.5);
  }
  ctx.restore();
  // little arms; raised with a coconut during wind-up
  const arm = (sx2, raised) => {
    ctx.save();
    ctx.translate(sx2, -62);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(raised ? -10 : -26, raised ? -58 : 8);
    ctx.lineCap = 'round';
    ctx.lineWidth = 17;
    ctx.strokeStyle = OUT;
    ctx.stroke();
    ctx.lineWidth = 9;
    ctx.strokeStyle = '#7a2a1a';
    ctx.stroke();
    ctx.restore();
  };
  arm(-62, windup);
  arm(-20, windup);
  if (windup) {
    ctx.save();
    ctx.translate(-48, -150);
    const sc = 0.7 + Math.min(1, o.t * 1.5) * 0.3;
    ctx.scale(sc, sc);
    drawCoconut(ctx, 36, t * 2, t, true);
    ctx.restore();
  }
  if (stunned) {
    for (let i = 0; i < 4; i++) {
      const a = t * 7 + (i * Math.PI) / 2;
      ctx.save();
      ctx.translate(-52 + Math.cos(a) * 60, -148 + Math.sin(a) * 14);
      ctx.rotate(t * 6);
      star(ctx, 11, 5, 0.5);
      fillStroke(ctx, '#ffd23a', 2.5);
      ctx.restore();
    }
  }
  ctx.restore();
}

// ============================================================ hopper-map sprites
// all anchored bottom-centre unless noted

export function drawBush(ctx, v = 0) {
  const cols = ['#58d048', '#46c23c', '#6ae05a'];
  for (const [dx, dy, r, i] of [[-20, -18, 22, 0], [18, -16, 20, 1], [0, -32, 26, 2]]) {
    ctx.beginPath();
    ctx.arc(dx, dy, r, 0, 7);
    fillStroke(ctx, cols[(i + v) % 3], 4);
  }
  ctx.beginPath();
  ctx.ellipse(-6, -42, 8, 5, -0.5, 0, 7);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fill();
  if (v % 2 === 0) for (const [fx, fy] of [[-26, -14], [22, -26], [4, -52]]) {
    ctx.beginPath();
    ctx.arc(fx, fy, 5, 0, 7);
    fillStroke(ctx, '#ff6aa0', 2.5);
  }
}

export function drawTreeRound(ctx, v = 0) {
  ctx.beginPath();
  ctx.moveTo(-12, 0);
  ctx.quadraticCurveTo(-9, -40, -7, -76);
  ctx.lineTo(7, -76);
  ctx.quadraticCurveTo(9, -40, 12, 0);
  ctx.closePath();
  fillStroke(ctx, '#8a5430', 4.5);
  const g = ['#36b83c', '#46d23c', '#2a9f3a'];
  for (const [dx, dy, r, i] of [[-26, -92, 30, 0], [26, -92, 30, 2], [0, -118, 40, 1], [-6, -84, 34, 1]]) {
    ctx.beginPath();
    ctx.arc(dx, dy, r, 0, 7);
    fillStroke(ctx, g[(i + v) % 3], 4.5);
  }
  ctx.beginPath();
  ctx.ellipse(-14, -132, 14, 8, -0.5, 0, 7);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(18, -86);
  ctx.quadraticCurveTo(26, -64, 18, -44);
  ctx.lineWidth = 7;
  ctx.strokeStyle = OUT;
  ctx.stroke();
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = '#46d23c';
  ctx.stroke();
}

export function drawPalmTree(ctx, v = 0, t = 0) {
  const lean = v % 2 ? -14 : 14;
  ctx.beginPath();
  ctx.moveTo(-10, 0);
  ctx.quadraticCurveTo(lean * 0.2 - 6, -50, lean - 6, -108);
  ctx.lineTo(lean + 6, -108);
  ctx.quadraticCurveTo(lean * 0.2 + 12, -50, 10, 0);
  ctx.closePath();
  fillStroke(ctx, '#9a6638', 4.5);
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI + (i / 6) * Math.PI;
    const sway = Math.sin(t * 1.5 + i) * 3;
    ctx.beginPath();
    ctx.moveTo(lean, -108);
    ctx.quadraticCurveTo(lean + Math.cos(a) * 36, -108 + Math.sin(a) * 36 - 24, lean + Math.cos(a) * 66 + sway, -108 + Math.sin(a) * 16 + 24);
    ctx.quadraticCurveTo(lean + Math.cos(a) * 34, -108 + Math.sin(a) * 26 + 4, lean, -102);
    fillStroke(ctx, i % 2 ? '#3cc64a' : '#2aa83c', 3.5);
  }
  for (const dx of [-6, 8]) {
    ctx.beginPath();
    ctx.arc(lean + dx, -100, 7, 0, 7);
    fillStroke(ctx, '#7a4a28', 2.5);
  }
}

export function drawStoneColumn(ctx, v = 0) {
  const h = 70 + (v % 3) * 16;
  rrect(ctx, -26, -14, 52, 14, 4);
  fillStroke(ctx, '#a89870', 4);
  rrect(ctx, -18, -h, 36, h - 10, 3);
  fillStroke(ctx, '#d2c298', 4);
  ctx.strokeStyle = 'rgba(60,45,20,0.5)';
  ctx.lineWidth = 2.5;
  for (let y = -34; y > -h + 10; y -= 24) {
    ctx.beginPath();
    ctx.moveTo(-18, y);
    ctx.lineTo(18, y);
    ctx.stroke();
  }
  ctx.fillStyle = '#2fd8c8';
  ctx.fillRect(-5, -h * 0.55, 10, 22);
  if (v % 2 === 0) {
    rrect(ctx, -28, -h - 14, 56, 18, 4);
    fillStroke(ctx, '#a89870', 4);
  } else {
    ctx.beginPath();
    ctx.ellipse(-24, -8, 14, 8, 0.3, 0, 7);
    fillStroke(ctx, '#c9b98c', 3);
  }
  ctx.beginPath();
  ctx.ellipse(10, -12, 12, 6, 0, 0, 7);
  fillStroke(ctx, '#58d048', 2.5);
}

export function drawCrystalRock(ctx, v = 0) {
  const cols = ['#9a7a5a', '#b08a62', '#8a6a4a'];
  ctx.beginPath();
  ctx.moveTo(-34, 0);
  ctx.lineTo(-26, -34);
  ctx.lineTo(-10, -52);
  ctx.lineTo(4, -36);
  ctx.lineTo(18, -62);
  ctx.lineTo(30, -28);
  ctx.lineTo(36, 0);
  ctx.closePath();
  fillStroke(ctx, cols[v % 3], 4.5);
  ctx.beginPath();
  ctx.moveTo(18, -62);
  ctx.lineTo(30, -28);
  ctx.lineTo(36, 0);
  ctx.lineTo(16, 0);
  ctx.closePath();
  ctx.fillStyle = 'rgba(40,20,10,0.25)';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-6, -36);
  ctx.lineTo(-2, -76);
  ctx.lineTo(8, -40);
  ctx.closePath();
  fillStroke(ctx, '#7fd0ff', 3.5);
  ctx.beginPath();
  ctx.moveTo(-2, -76);
  ctx.lineTo(3, -44);
  ctx.lineTo(8, -40);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fill();
}

export function drawLily(ctx, r, t, v = 0) {
  ctx.save();
  ctx.translate(0, -r * 0.18);
  ctx.scale(1, 0.62);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, r, 0.35, Math.PI * 2 - 0.05);
  ctx.closePath();
  fillStroke(ctx, '#46c846', 4);
  ctx.strokeStyle = 'rgba(20,90,30,0.55)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(1 + i * 1.3) * r * 0.85, Math.sin(1 + i * 1.3) * r * 0.85);
    ctx.stroke();
  }
  ctx.restore();
  if (v % 2 === 0) {
    ctx.save();
    ctx.translate(r * 0.2, -r * 0.5 + Math.sin(t * 2 + v) * 1.5);
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.ellipse(Math.cos(i * 1.26) * 7, Math.sin(i * 1.26) * 4 - 4, 6, 9, i * 1.26, 0, 7);
      fillStroke(ctx, '#ff8ab4', 2);
    }
    ctx.beginPath();
    ctx.arc(0, -5, 4, 0, 7);
    ctx.fillStyle = '#ffe45a';
    ctx.fill();
    ctx.restore();
  }
}

// wooden jungle cart / wagon, front at +x (flip with dir)
export function drawCart(ctx, w, dir, t, variant = 'cart', phase = 0) {
  ctx.save();
  ctx.scale(dir, 1);
  const h = variant === 'wagon' ? 46 : 52;
  const wheelR = 15;
  const spin = phase;
  // load
  if (variant === 'wagon') {
    for (let i = -1; i <= 1; i++) {
      rrect(ctx, i * (w * 0.28) - 14, -h - 22, 28, 28, 5);
      fillStroke(ctx, '#b87a3a', 3.5);
      ctx.beginPath();
      ctx.moveTo(i * (w * 0.28) - 14, -h - 8);
      ctx.lineTo(i * (w * 0.28) + 14, -h - 8);
      ctx.lineWidth = 3;
      ctx.strokeStyle = OUT;
      ctx.stroke();
    }
  } else {
    ctx.beginPath();
    ctx.arc(-w * 0.12, -h - 6, 17, 0, 7);
    fillStroke(ctx, '#ff5a1e', 3.5);
    ctx.beginPath();
    ctx.arc(w * 0.08, -h - 4, 14, 0, 7);
    fillStroke(ctx, '#ff8a3a', 3.5);
  }
  // body
  rrect(ctx, -w / 2, -h - wheelR + 8, w, h - 8, 8);
  fillStroke(ctx, variant === 'wagon' ? '#2fb8a8' : '#d9964e', 4.5);
  ctx.strokeStyle = 'rgba(40,20,8,0.4)';
  ctx.lineWidth = 2.5;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 6, -h - wheelR + 8 + ((h - 8) * i) / 3);
    ctx.lineTo(w / 2 - 6, -h - wheelR + 8 + ((h - 8) * i) / 3);
    ctx.stroke();
  }
  rrect(ctx, -w / 2 - 2, -h - wheelR + 4, w + 4, 10, 4);
  fillStroke(ctx, variant === 'wagon' ? '#1f8a7c' : '#8a5424', 3.5);
  // tiki face on the front
  ctx.beginPath();
  ctx.ellipse(w / 2 - 14, -h * 0.55 - 6, 9, 11, 0, 0, 7);
  fillStroke(ctx, '#f6e2b0', 3);
  ctx.fillStyle = '#1a0f08';
  ctx.fillRect(w / 2 - 18, -h * 0.55 - 11, 4, 5);
  ctx.fillRect(w / 2 - 10, -h * 0.55 - 11, 4, 5);
  ctx.fillRect(w / 2 - 17, -h * 0.55 - 2, 8, 3);
  // wheels
  const wheels = variant === 'wagon' ? [-w * 0.3, w * 0.3] : [-w * 0.26, w * 0.26];
  for (const wx of wheels) {
    ctx.save();
    ctx.translate(wx, -wheelR + 2);
    ctx.rotate(spin);
    ctx.beginPath();
    ctx.arc(0, 0, wheelR, 0, 7);
    fillStroke(ctx, '#5a3a22', 4);
    ctx.strokeStyle = '#d9b27a';
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      ctx.rotate(Math.PI / 3);
      ctx.beginPath();
      ctx.moveTo(-wheelR + 3, 0);
      ctx.lineTo(wheelR - 3, 0);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}

// the "Tiki Express": a long mine-cart train; `len` in px, heading `dir`
export function drawTrain(ctx, len, dir, t) {
  ctx.save();
  ctx.scale(dir, 1);
  const car = 120;
  const n = Math.floor((len - 150) / car);
  const x0 = -len / 2;
  const cols = ['#e8402a', '#ffb02a', '#2fb8a8', '#8a4ae0'];
  for (let i = 0; i < n; i++) {
    const cx = x0 + i * car;
    rrect(ctx, cx + 4, -84, car - 8, 66, 8);
    fillStroke(ctx, cols[i % 4], 4.5);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let k = 0; k < 2; k++) ctx.fillRect(cx + 18 + k * 48, -72, 34, 22);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 3;
    for (let k = 0; k < 2; k++) ctx.strokeRect(cx + 18 + k * 48, -72, 34, 22);
    for (const wx of [24, car - 32]) {
      ctx.beginPath();
      ctx.arc(cx + wx, -12, 13, 0, 7);
      fillStroke(ctx, '#3a2a22', 3.5);
    }
  }
  // locomotive (front, +x)
  const lx = x0 + n * car;
  rrect(ctx, lx + 4, -96, 140, 78, 10);
  fillStroke(ctx, '#2a62d8', 5);
  rrect(ctx, lx + 70, -128, 70, 40, 8);
  fillStroke(ctx, '#e8402a', 4.5);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillRect(lx + 82, -118, 46, 18);
  rrect(ctx, lx + 20, -122, 24, 34, 6);
  fillStroke(ctx, '#1a1a22', 4);
  ctx.beginPath();
  ctx.arc(lx + 32 + Math.sin(t * 8) * 3, -138 - (t * 40 % 20), 11, 0, 7);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fill();
  // face on the front
  ctx.beginPath();
  ctx.ellipse(lx + 132, -58, 14, 18, 0, 0, 7);
  fillStroke(ctx, '#ffe45a', 4);
  ctx.fillStyle = '#1a0f08';
  ctx.fillRect(lx + 124, -68, 5, 7);
  ctx.fillRect(lx + 134, -68, 5, 7);
  ctx.beginPath();
  ctx.moveTo(lx + 122, -76);
  ctx.lineTo(lx + 142, -72);
  ctx.lineWidth = 4;
  ctx.stroke();
  for (const wx of [30, 70, 110]) {
    ctx.beginPath();
    ctx.arc(lx + wx, -14, 15, 0, 7);
    fillStroke(ctx, '#3a2a22', 3.5);
  }
  ctx.restore();
}

// railway warning signal (anchored at the base of the post)
export function drawSignal(ctx, on, t) {
  rrect(ctx, -5, -86, 10, 86, 3);
  fillStroke(ctx, '#d8d8e0', 3);
  rrect(ctx, -20, -112, 40, 30, 8);
  fillStroke(ctx, '#2a2a34', 3.5);
  const flash = on && Math.sin(t * 16) > 0;
  for (const [lx, lit] of [[-9, flash], [9, on && !flash]]) {
    ctx.save();
    if (lit) {
      ctx.shadowColor = '#ff3a2a';
      ctx.shadowBlur = 22;
    }
    ctx.beginPath();
    ctx.arc(lx, -97, 7, 0, 7);
    fillStroke(ctx, lit ? '#ff4a3a' : '#6a2a2a', 2.5);
    ctx.restore();
  }
}
