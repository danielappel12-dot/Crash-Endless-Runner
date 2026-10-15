import * as THREE from 'three';

// All textures are painted on <canvas> at startup - no external assets.

function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function toTexture(c, { repeat = null, aniso = 4 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

function rnd(a, b) {
  return a + Math.random() * (b - a);
}

function blotches(ctx, w, h, colors, count, rMin, rMax, alpha = 0.35) {
  for (let i = 0; i < count; i++) {
    ctx.globalAlpha = rnd(alpha * 0.4, alpha);
    ctx.fillStyle = colors[(Math.random() * colors.length) | 0];
    ctx.beginPath();
    ctx.ellipse(rnd(0, w), rnd(0, h), rnd(rMin, rMax), rnd(rMin, rMax) * 0.8, rnd(0, 3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// Pebbles + moss tufts that visually separate the lanes without a painted line.
function laneDetail(ctx, w, h, laneU, stone, moss) {
  for (const u of laneU) {
    const cx = u * w;
    for (let y = 0; y < h; y += 5) {
      if (Math.random() < 0.55) {
        ctx.fillStyle = stone[(Math.random() * stone.length) | 0];
        const r = rnd(2.5, 6);
        ctx.beginPath();
        ctx.ellipse(cx + rnd(-9, 9), y + rnd(0, 5), r, r * 0.75, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      if (Math.random() < 0.22) {
        ctx.fillStyle = moss;
        ctx.beginPath();
        ctx.ellipse(cx + rnd(-12, 12), y, rnd(3, 7), rnd(2, 4), 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

export function groundTexture(biome) {
  const S = 512;
  const [c, ctx] = canvas(S);
  const laneU = [0.5 - 1.1 / 8, 0.5 + 1.1 / 8];
  if (biome === 'jungle') {
    ctx.fillStyle = '#b8743a';
    ctx.fillRect(0, 0, S, S);
    blotches(ctx, S, S, ['#9a5a28', '#cf8a4a', '#8a4e22', '#d9a066'], 160, 6, 38, 0.4);
    laneDetail(ctx, S, S, laneU, ['#8a8a78', '#a8a290', '#6d6a5c'], '#4aa23a');
    // grassy fringe on the outer edges
    ctx.fillStyle = '#3c9a34';
    for (let y = 0; y < S; y += 6) {
      ctx.fillRect(0, y, rnd(6, 20), 8);
      ctx.fillRect(S - rnd(6, 20), y, 20, 8);
    }
  } else if (biome === 'ruins') {
    ctx.fillStyle = '#b3a584';
    ctx.fillRect(0, 0, S, S);
    blotches(ctx, S, S, ['#9c8f70', '#c8bb98', '#8a7f62'], 120, 8, 40, 0.35);
    ctx.strokeStyle = '#6a5f46';
    ctx.lineWidth = 4;
    for (let y = 0; y <= S; y += 128) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(S, y);
      ctx.stroke();
    }
    for (const u of laneU) {
      // carved groove with turquoise inlay
      ctx.fillStyle = '#5b5238';
      ctx.fillRect(u * S - 7, 0, 14, S);
      ctx.fillStyle = '#2fb8a8';
      for (let y = 6; y < S; y += 32) ctx.fillRect(u * S - 3, y, 6, 14);
    }
    blotches(ctx, S, S, ['#4aa23a'], 30, 4, 14, 0.5);
  } else if (biome === 'bridge') {
    ctx.fillStyle = '#9a6a38';
    ctx.fillRect(0, 0, S, S);
    for (let y = 0; y < S; y += 64) {
      ctx.fillStyle = ['#a8743c', '#8f5f30', '#b27e46'][(y / 64) % 3];
      ctx.fillRect(0, y + 3, S, 58);
      ctx.strokeStyle = 'rgba(60,30,10,0.45)';
      ctx.lineWidth = 2;
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        const yy = y + 12 + k * 13;
        ctx.moveTo(0, yy);
        ctx.bezierCurveTo(S * 0.3, yy + rnd(-4, 4), S * 0.6, yy + rnd(-4, 4), S, yy);
        ctx.stroke();
      }
      ctx.fillStyle = '#3a2410';
      for (const x of [14, S - 14]) {
        ctx.beginPath();
        ctx.arc(x, y + 32, 4, 0, 7);
        ctx.fill();
      }
    }
    // rope-like lane dividers
    for (const u of laneU) {
      ctx.fillStyle = '#d9c28a';
      for (let y = 0; y < S; y += 14) ctx.fillRect(u * S - 3, y, 6, 9);
    }
  } else {
    // rocky pass
    ctx.fillStyle = '#8c7a68';
    ctx.fillRect(0, 0, S, S);
    blotches(ctx, S, S, ['#6f6050', '#a8967f', '#5a4e42', '#b8a68e'], 220, 5, 30, 0.45);
    laneDetail(ctx, S, S, laneU, ['#5d5448', '#a29582', '#78705f'], '#5b8f3a');
    ctx.fillStyle = '#4a4036';
    for (let i = 0; i < 70; i++) {
      ctx.beginPath();
      ctx.arc(rnd(0, S), rnd(0, S), rnd(1.5, 4), 0, 7);
      ctx.fill();
    }
  }
  return toTexture(c);
}

export function sideGroundTexture() {
  const [c, ctx] = canvas(256);
  ctx.fillStyle = '#2f8a30';
  ctx.fillRect(0, 0, 256, 256);
  blotches(ctx, 256, 256, ['#3fa63a', '#256f28', '#58b848', '#d9b04a'], 160, 4, 26, 0.45);
  return toTexture(c, { repeat: [10, 10] });
}

export function rockTexture() {
  const [c, ctx] = canvas(256);
  ctx.fillStyle = '#4a3a2e';
  ctx.fillRect(0, 0, 256, 256);
  blotches(ctx, 256, 256, ['#2c2018', '#5e4a3a', '#6a5646'], 120, 6, 30, 0.5);
  return toTexture(c, { repeat: [3, 2] });
}

// Striped chevron arrows used for warning decals on the track.
export function chevronTexture(hex) {
  const [c, ctx] = canvas(128, 256);
  ctx.clearRect(0, 0, 128, 256);
  ctx.strokeStyle = hex;
  ctx.lineWidth = 22;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < 2; i++) {
    const y = 40 + i * 120;
    ctx.beginPath();
    ctx.moveTo(18, y + 50);
    ctx.lineTo(64, y);
    ctx.lineTo(110, y + 50);
    ctx.stroke();
  }
  const t = toTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function woodBase(ctx, S, base, dark) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 26; i++) {
    const y = rnd(0, S);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(S * 0.3, y + rnd(-6, 6), S * 0.6, y + rnd(-6, 6), S, y + rnd(-3, 3));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function frame(ctx, S, color, edge, w = 26) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, S, w);
  ctx.fillRect(0, S - w, S, w);
  ctx.fillRect(0, 0, w, S);
  ctx.fillRect(S - w, 0, w, S);
  ctx.strokeStyle = edge;
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, S - 4, S - 4);
  ctx.strokeRect(w, w, S - 2 * w, S - 2 * w);
  // diagonal brace
  ctx.fillStyle = color;
  ctx.save();
  ctx.translate(S / 2, S / 2);
  ctx.rotate(Math.PI / 4);
  ctx.fillRect(-S * 0.72, -9, S * 1.44, 18);
  ctx.restore();
}

function bolts(ctx, S, color) {
  ctx.fillStyle = color;
  for (const [x, y] of [[13, 13], [S - 13, 13], [13, S - 13], [S - 13, S - 13]]) {
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, 7);
    ctx.fill();
  }
}

export function crateTexture(kind) {
  const S = 256;
  const [c, ctx] = canvas(S);
  if (kind === 'fruit') {
    woodBase(ctx, S, '#c98a4a', '#7a4a1e');
    frame(ctx, S, '#8a5424', '#4a2a0e');
    bolts(ctx, S, '#d8d0b8');
    // painted fruit badge
    ctx.fillStyle = '#ff5a1e';
    ctx.beginPath();
    ctx.arc(S / 2, S / 2 + 8, 44, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#ffd0a0';
    ctx.beginPath();
    ctx.arc(S / 2 - 15, S / 2 - 6, 11, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#3cc43c';
    ctx.beginPath();
    ctx.moveTo(S / 2, S / 2 - 34);
    ctx.quadraticCurveTo(S / 2 - 40, S / 2 - 76, S / 2 - 52, S / 2 - 40);
    ctx.quadraticCurveTo(S / 2 - 20, S / 2 - 40, S / 2, S / 2 - 34);
    ctx.quadraticCurveTo(S / 2 + 40, S / 2 - 76, S / 2 + 52, S / 2 - 40);
    ctx.quadraticCurveTo(S / 2 + 20, S / 2 - 40, S / 2, S / 2 - 34);
    ctx.fill();
  } else if (kind === 'bouncy') {
    woodBase(ctx, S, '#b8864e', '#6e4220');
    frame(ctx, S, '#3a8f3a', '#1c4c1c');
    bolts(ctx, S, '#f0f0e0');
    ctx.fillStyle = '#7cff5a';
    ctx.strokeStyle = '#1c4c1c';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(S / 2, 60);
    ctx.lineTo(S / 2 + 56, 128);
    ctx.lineTo(S / 2 + 22, 128);
    ctx.lineTo(S / 2 + 22, 196);
    ctx.lineTo(S / 2 - 22, 196);
    ctx.lineTo(S / 2 - 22, 128);
    ctx.lineTo(S / 2 - 56, 128);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (kind === 'mystery') {
    woodBase(ctx, S, '#a874d8', '#5a2e8a');
    frame(ctx, S, '#6a3aa8', '#2e1252');
    bolts(ctx, S, '#ffe9a0');
    ctx.font = 'bold 170px Impact, "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#2e1252';
    ctx.strokeText('?', S / 2, S / 2 + 10);
    ctx.fillStyle = '#ffd23a';
    ctx.fillText('?', S / 2, S / 2 + 10);
  } else if (kind === 'tnt') {
    woodBase(ctx, S, '#d8321e', '#7a140a');
    frame(ctx, S, '#a81c0e', '#4a0a04');
    bolts(ctx, S, '#f3e6c8');
    ctx.fillStyle = '#fff2c8';
    ctx.fillRect(34, 86, S - 68, 84);
    ctx.strokeStyle = '#4a0a04';
    ctx.lineWidth = 5;
    ctx.strokeRect(34, 86, S - 68, 84);
    ctx.font = 'bold 72px Impact, "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#c4200e';
    ctx.fillText('BOOM', S / 2, 130);
    // warning bomb icon
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(S / 2, 208, 16, 0, 7);
    ctx.fill();
    ctx.strokeStyle = '#ffb02a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(S / 2 + 8, 194);
    ctx.lineTo(S / 2 + 20, 178);
    ctx.stroke();
    ctx.fillStyle = '#ffdd3a';
    ctx.beginPath();
    ctx.arc(S / 2 + 22, 176, 6, 0, 7);
    ctx.fill();
  } else {
    // metal
    const g = ctx.createLinearGradient(0, 0, S, S);
    g.addColorStop(0, '#9fb0bc');
    g.addColorStop(0.5, '#6e7f8c');
    g.addColorStop(1, '#8a9aa6');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    frame(ctx, S, '#4d5a64', '#242c32', 30);
    bolts(ctx, S, '#c8d4dc');
    ctx.fillStyle = '#ffcf2a';
    for (let i = -2; i < 8; i++) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(46, 46, S - 92, S - 92);
      ctx.clip();
      ctx.translate(i * 44, 0);
      ctx.transform(1, 0, -0.7, 1, 0, 0);
      ctx.fillRect(40, 0, 22, S);
      ctx.restore();
    }
    ctx.fillStyle = '#222';
    ctx.globalAlpha = 0.5;
    ctx.fillRect(46, 46, S - 92, S - 92);
    ctx.globalAlpha = 1;
    ctx.font = 'bold 54px Impact, "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffcf2a';
    ctx.fillText('IRON', S / 2, S / 2);
  }
  return toTexture(c);
}

export function barkTexture() {
  const [c, ctx] = canvas(128);
  woodBase(ctx, 128, '#7a4e2a', '#3e2412');
  return toTexture(c, { repeat: [1, 2] });
}

export function skyTexture() {
  const [c, ctx] = canvas(8, 256);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#2fa6d8');
  g.addColorStop(0.45, '#8fdcec');
  g.addColorStop(0.78, '#ffe9a8');
  g.addColorStop(1, '#ffd08a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 8, 256);
  return toTexture(c, { aniso: 1 });
}
