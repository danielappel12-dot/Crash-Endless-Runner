// Shared painting helpers (outlined, painted-style scenery pieces) used by the renderer.
let OUT = '#2b1608';
let OLK = 1; // outline width multiplier (thin in painted mode)
let PAINTED = false;

export function setPaintStyle(painted) {
  PAINTED = painted;
  OUT = painted ? 'rgba(40,24,52,0.62)' : '#2b1608';
  OLK = painted ? 0.42 : 1;
}

export function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function line(ctx, lw = 4) {
  ctx.lineWidth = Math.max(1, lw * OLK);
  ctx.strokeStyle = OUT;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

export function fs(ctx, fill, lw = 4) {
  ctx.fillStyle = fill;
  ctx.fill();
  line(ctx, lw);
}

export function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export function trunk(ctx, x, h, w, color) {
  ctx.beginPath();
  ctx.moveTo(x - w / 2, h);
  ctx.quadraticCurveTo(x - w * 0.3, h - 140, x - w * 0.18, h - 300);
  ctx.lineTo(x + w * 0.18, h - 300);
  ctx.quadraticCurveTo(x + w * 0.3, h - 140, x + w / 2, h);
  ctx.closePath();
  fs(ctx, color, 5);
}

export function canopy(ctx, x, y, r, c1, c2) {
  for (const [dx, dy, rr2, c] of [[-r * 0.7, 10, r * 0.7, c2], [r * 0.7, 14, r * 0.7, c2], [0, -r * 0.25, r, c1], [-r * 0.3, -r * 0.55, r * 0.55, c1]]) {
    ctx.beginPath();
    ctx.arc(x + dx, y + dy, rr2, 0, 7);
    fs(ctx, c, 5);
  }
  ctx.beginPath();
  ctx.ellipse(x - r * 0.35, y - r * 0.5, r * 0.25, r * 0.13, -0.5, 0, 7);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fill();
}

export function palm(ctx, x, base, h, lean, c1, c2, trunkC) {
  ctx.beginPath();
  const tx = x + lean, ty = base - h;
  ctx.moveTo(x - 12, base);
  ctx.quadraticCurveTo(x + lean * 0.2 - 6, base - h * 0.5, tx - 8, ty);
  ctx.lineTo(tx + 8, ty);
  ctx.quadraticCurveTo(x + lean * 0.2 + 10, base - h * 0.5, x + 12, base);
  ctx.closePath();
  fs(ctx, trunkC, 5);
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI + (i / 6) * Math.PI;
    const len = 90;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo(tx + Math.cos(a) * len * 0.6, ty + Math.sin(a) * len * 0.6 - 30, tx + Math.cos(a) * len, ty + Math.sin(a) * len * 0.3 + 28);
    ctx.quadraticCurveTo(tx + Math.cos(a) * len * 0.55, ty + Math.sin(a) * len * 0.5 + 6, tx, ty + 6);
    fs(ctx, i % 2 ? c1 : c2, 4);
  }
  ctx.beginPath();
  ctx.arc(tx - 8, ty + 10, 8, 0, 7);
  fs(ctx, '#7a4a28', 3);
  ctx.beginPath();
  ctx.arc(tx + 8, ty + 12, 8, 0, 7);
  fs(ctx, '#7a4a28', 3);
}

export function pillar(ctx, x, base, h, color, dark) {
  rr(ctx, x - 34, base - 24, 68, 24, 5);
  fs(ctx, dark, 5);
  rr(ctx, x - 24, base - h, 48, h - 20, 4);
  fs(ctx, color, 5);
  for (let y = base - 60; y > base - h + 20; y -= 46) {
    ctx.beginPath();
    ctx.moveTo(x - 24, y);
    ctx.lineTo(x + 24, y);
    line(ctx, 3);
  }
  rr(ctx, x - 38, base - h - 22, 76, 28, 5);
  fs(ctx, dark, 5);
  ctx.fillStyle = '#2fd8c8';
  ctx.fillRect(x - 7, base - h + 40, 14, 40);
}

export function temple(ctx, x, base, w) {
  let ww = w, yy = base;
  for (let i = 0; i < 4; i++) {
    rr(ctx, x - ww / 2, yy - 50, ww, 50, 4);
    fs(ctx, i % 2 ? '#c9b98c' : '#b7a678', 5);
    ctx.fillStyle = '#2fd8c8';
    ctx.fillRect(x - ww / 2 + 6, yy - 30, ww - 12, 6);
    yy -= 50;
    ww -= 56;
  }
  rr(ctx, x - 22, yy - 38, 44, 38, 4);
  fs(ctx, '#ffcf2a', 5);
}

export function rockSpire(ctx, x, base, h, w, c1, c2) {
  ctx.beginPath();
  ctx.moveTo(x - w / 2, base);
  ctx.lineTo(x - w * 0.3, base - h * 0.7);
  ctx.lineTo(x - w * 0.08, base - h * 0.62);
  ctx.lineTo(x + w * 0.05, base - h);
  ctx.lineTo(x + w * 0.35, base - h * 0.55);
  ctx.lineTo(x + w / 2, base);
  ctx.closePath();
  fs(ctx, c1, 5);
  ctx.beginPath();
  ctx.moveTo(x + w * 0.05, base - h);
  ctx.lineTo(x + w * 0.35, base - h * 0.55);
  ctx.lineTo(x + w / 2, base);
  ctx.lineTo(x + w * 0.05, base);
  ctx.closePath();
  ctx.fillStyle = c2;
  ctx.fill();
  line(ctx, 4);
}

export function mossBlob(ctx, x, y, r, fill = '#6fbf4c') {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.55, 0, 0, 7);
  ctx.ellipse(x - r * 0.6, y + r * 0.2, r * 0.55, r * 0.4, 0, 0, 7);
  ctx.ellipse(x + r * 0.6, y + r * 0.15, r * 0.5, r * 0.38, 0, 0, 7);
  ctx.fill();
}

export function purpleRock(ctx, x, base, hgt, wd, q) {
  const g = ctx.createLinearGradient(x - wd, 0, x + wd, 0);
  g.addColorStop(0, '#9b88d8');
  g.addColorStop(0.55, '#6a58b0');
  g.addColorStop(1, '#3d3280');
  ctx.beginPath();
  ctx.moveTo(x - wd * 0.7, base);
  ctx.lineTo(x - wd * 0.55, base - hgt * 0.5);
  ctx.lineTo(x - wd * 0.28, base - hgt * 0.86);
  ctx.lineTo(x + wd * 0.02, base - hgt);
  ctx.lineTo(x + wd * 0.34, base - hgt * 0.7);
  ctx.lineTo(x + wd * 0.58, base - hgt * 0.38);
  ctx.lineTo(x + wd * 0.72, base);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();
  if (!PAINTED) line(ctx, 4);
  // cracks and pits
  ctx.strokeStyle = 'rgba(30,20,70,0.45)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x - wd * 0.1, base - hgt * 0.9);
  ctx.lineTo(x + wd * 0.05, base - hgt * 0.55);
  ctx.lineTo(x - wd * 0.15, base - hgt * 0.3);
  ctx.stroke();
  ctx.fillStyle = 'rgba(40,28,90,0.5)';
  for (let k = 0; k < 6; k++) {
    ctx.beginPath();
    ctx.ellipse(x + (q() - 0.5) * wd * 0.8, base - q() * hgt * 0.8, 5 + q() * 5, 4 + q() * 4, 0, 0, 7);
    ctx.fill();
  }
  // moss cap + drips
  mossBlob(ctx, x - wd * 0.05, base - hgt * 0.94, wd * 0.34);
  mossBlob(ctx, x - wd * 0.4, base - hgt * 0.6, wd * 0.2);
  ctx.fillStyle = '#6fbf4c';
  ctx.fillRect(x - wd * 0.26, base - hgt * 0.92, 9, hgt * 0.1);
}
