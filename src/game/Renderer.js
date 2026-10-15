import { CONFIG, laneY } from '../config/settings.js';
import * as S from './Sprites.js';

// Canvas2D renderer: painted parallax backdrops (pre-rendered per biome),
// cartoon ground with ravine gaps, then entities, hero and particles.

const V = CONFIG.view;
let OUT = '#2b1608';
let OLK = 1; // outline width multiplier (thin in painted mode)
let PAINTED = false;
const TW = 1800; // tile width of the parallax strips (virtual px)

export const BIOME_STYLE = {
  jungle: {
    sky: ['#2fb4ea', '#8fdcf0', '#ffe9a6'], hill: ['#4cc08a', '#35a874'], mid: ['#35b04a', '#238a3c'],
    trunk: '#8a5430', grass: '#62dc4c', grassD: '#3cb83a', dirt: '#c8803e', dirtD: '#a8642a', ground: 'dirt',
  },
  ruins: {
    sky: ['#3cc0d8', '#9fe4e0', '#ffe2a0'], hill: ['#58c8a8', '#3eb094'], mid: ['#c9b98c', '#a89870'],
    trunk: '#8a5430', grass: '#6adc5a', grassD: '#40b04a', dirt: '#c2b48c', dirtD: '#9c8e68', ground: 'stone',
  },
  lagoon: {
    sky: ['#3d8de2', '#9ccff8', '#eaf5ff'], hill: ['#a9d27e', '#7fb868'], mid: ['#2fa84a', '#208a3a'],
    trunk: '#8a5430', grass: '#62dc4c', grassD: '#3cb83a', dirt: '#c9a96f', dirtD: '#8a6a3a', ground: 'pier',
    water: ['#9cc9f4', '#3f86dc', '#1d4aa4'],
  },
  rocky: {
    sky: ['#58b8e8', '#bce2f0', '#ffd6a0'], hill: ['#e49a5a', '#c47a3c'], mid: ['#b0643a', '#8a4a2a'],
    trunk: '#7a5030', grass: '#8ad04a', grassD: '#5ea83a', dirt: '#9a8470', dirtD: '#6e5c4c', ground: 'rock',
  },
};

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function line(ctx, lw = 4) {
  ctx.lineWidth = Math.max(1, lw * OLK);
  ctx.strokeStyle = OUT;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}
function fs(ctx, fill, lw = 4) {
  ctx.fillStyle = fill;
  ctx.fill();
  line(ctx, lw);
}
// deterministic rng so tiles are stable
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
function layer(w, h, scale, draw, haze = null) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * scale);
  c.height = Math.ceil(h * scale);
  const ctx = c.getContext('2d');
  ctx.scale(scale, scale);
  draw(ctx, w, h);
  if (haze === null) haze = { 580: 0.28, 680: 0.12, 330: 0, 64: 0, 300: 0, 334: 0 }[h] ?? null;
  if (PAINTED && haze !== null) paintify(ctx, w, h, haze);
  c.vw = w;
  c.vh = h;
  return c;
}

// soft painterly finish: light from above, aerial haze and brush-stroke noise,
// applied only where the layer already has paint (source-atop)
function paintify(ctx, w, h, haze) {
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(255,255,255,0.22)');
  g.addColorStop(0.55, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(24,44,120,0.24)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  if (haze > 0) {
    ctx.fillStyle = `rgba(178,214,255,${haze})`;
    ctx.fillRect(0, 0, w, h);
  }
  const R = rng(Math.floor(w * 7 + h));
  for (let i = 0; i < 1100; i++) {
    ctx.fillStyle = R() < 0.5 ? 'rgba(255,255,255,0.04)' : 'rgba(12,22,70,0.04)';
    ctx.save();
    ctx.translate(R() * w, R() * h);
    ctx.rotate(R() * 3.14);
    ctx.fillRect(-10, -1.4, 20, 2.8);
    ctx.restore();
  }
  ctx.restore();
}
// draw something so it wraps around the tile edge
function wrap(ctx, w, x, r, fn) {
  fn(x);
  if (x - r < 0) fn(x + w);
  if (x + r > w) fn(x - w);
}

// like wrap(), but every copy gets an identical random sequence so tile seams match
function wrapR(ctx, w, x, r, seed, fn) {
  wrap(ctx, w, x, r, (xx) => fn(xx, rng(seed)));
}

function farLayer(st, seed, scale) {
  if (st.water) return lagoonFar(st, seed, scale);
  return layer(TW, 580, scale, (ctx, w, h) => {
    const R = rng(seed);
    for (let i = 0; i < 9; i++) {
      const x = (i + 0.5) * (w / 9) + (R() - 0.5) * 60;
      const r = 130 + R() * 120;
      wrap(ctx, w, x, r, (xx) => {
        ctx.beginPath();
        if (st.ground === 'rock' || st.hill[0] === '#e8a15c') {
          ctx.moveTo(xx - r, h);
          ctx.lineTo(xx - r * 0.4, h - r * 1.5);
          ctx.lineTo(xx - r * 0.1, h - r * 1.2);
          ctx.lineTo(xx + r * 0.2, h - r * 1.9);
          ctx.lineTo(xx + r, h);
        } else {
          ctx.ellipse(xx, h, r, r * 1.05, 0, Math.PI, 0);
        }
        ctx.closePath();
        fs(ctx, i % 2 ? st.hill[0] : st.hill[1], 5);
      });
    }
  });
}

function trunk(ctx, x, h, w, color) {
  ctx.beginPath();
  ctx.moveTo(x - w / 2, h);
  ctx.quadraticCurveTo(x - w * 0.3, h - 140, x - w * 0.18, h - 300);
  ctx.lineTo(x + w * 0.18, h - 300);
  ctx.quadraticCurveTo(x + w * 0.3, h - 140, x + w / 2, h);
  ctx.closePath();
  fs(ctx, color, 5);
}
function canopy(ctx, x, y, r, c1, c2) {
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
function palm(ctx, x, base, h, lean, c1, c2, trunkC) {
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
function pillar(ctx, x, base, h, color, dark) {
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
function temple(ctx, x, base, w) {
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
function rockSpire(ctx, x, base, h, w, c1, c2) {
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

function midLayer(name, st, seed, scale) {
  if (st.water) return lagoonMid(st, seed, scale);
  return layer(TW, 680, scale, (ctx, w, h) => {
    const R = rng(seed);
    if (name === 'ruins') {
      for (let i = 0; i < 6; i++) {
        const x = (i + 0.5) * (w / 6) + (R() - 0.5) * 80;
        wrapR(ctx, w, x, 220, seed * 31 + i, (xx, q) => {
          if (i % 3 === 0) temple(ctx, xx, h, 250 + q() * 60);
          else pillar(ctx, xx, h, 160 + q() * 130, '#cdbd90', '#a89870');
        });
      }
      for (let i = 0; i < 7; i++) wrapR(ctx, w, R() * w, 160, seed + i, (xx, q) => canopy(ctx, xx, h - 50, 55 + q() * 25, '#3ab84a', '#27963a'));
    } else if (name === 'rocky') {
      for (let i = 0; i < 6; i++) {
        const x = (i + 0.5) * (w / 6) + (R() - 0.5) * 70;
        wrapR(ctx, w, x, 200, seed * 17 + i, (xx, q) => rockSpire(ctx, xx, h, 180 + q() * 220, 150 + q() * 90, '#c27a46', '#9a5a30'));
      }
      for (let i = 0; i < 5; i++) wrapR(ctx, w, R() * w, 120, seed + i, (xx, q) => canopy(ctx, xx, h - 36, 40 + q() * 20, '#6cc04a', '#4a9a3a'));
    } else {
      const n = 7;
      for (let i = 0; i < n; i++) {
        const x = (i + 0.5) * (w / n) + (R() - 0.5) * 80;
        wrapR(ctx, w, x, 280, seed * 13 + i, (xx, q) => {
          const th = 250 + q() * 120;
          trunk(ctx, xx, h, 54, st.trunk);
          canopy(ctx, xx + (q() - 0.5) * 20, h - th, 85 + q() * 35, st.mid[0], st.mid[1]);
          // hanging vine
          ctx.beginPath();
          ctx.moveTo(xx + 40, h - th + 40);
          ctx.quadraticCurveTo(xx + 52, h - th + 90, xx + 40, h - th + 140);
          ctx.lineWidth = 9;
          ctx.strokeStyle = OUT;
          ctx.stroke();
          ctx.lineWidth = 4.5;
          ctx.strokeStyle = '#46d23c';
          ctx.stroke();
        });
      }
    }
  });
}

function nearLayer(name, st, seed, scale) {
  if (st.water) return lagoonNear(st, seed, scale);
  return layer(TW, 330, scale, (ctx, w, h) => {
    const R = rng(seed);
    const bigLeaf = (x, y, s, ang, c) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-s * 0.5, -s * 0.55, 0, -s);
      ctx.quadraticCurveTo(s * 0.5, -s * 0.55, 0, 0);
      fs(ctx, c, 4.5);
      ctx.beginPath();
      ctx.moveTo(0, -4);
      ctx.lineTo(0, -s * 0.85);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(30,70,30,0.6)';
      ctx.stroke();
      ctx.restore();
    };
    for (let i = 0; i < 6; i++) {
      const x = (i + R() * 0.8) * (w / 6);
      wrapR(ctx, w, x, 190, seed * 7 + i, (xx, q) => {
        if (name === 'ruins' && i % 2) {
          pillar(ctx, xx, h, 120 + q() * 70, '#d8c89c', '#b3a37a');
        } else if (name === 'rocky') {
          rockSpire(ctx, xx, h, 90 + q() * 80, 120, '#a8744a', '#865830');
        } else {
          palm(ctx, xx, h, 170 + q() * 110, (q() - 0.5) * 80, '#3cc64a', '#2aa83c', '#9a6638');
        }
      });
    }
    for (let i = 0; i < 12; i++) {
      const x = R() * w;
      wrapR(ctx, w, x, 110, seed * 5 + i, (xx, q) => {
        for (let k = 0; k < 4; k++) bigLeaf(xx, h, 60 + q() * 36, -0.9 + k * 0.6 + q() * 0.2, k % 2 ? '#46d23c' : '#32b83a');
      });
    }
  });
}

function frontLayer(st, seed, scale) {
  return layer(TW, 64, scale, (ctx, w, h) => {
    const R = rng(seed);
    for (let i = 0; i < 12; i++) {
      const x = R() * w;
      wrapR(ctx, w, x, 60, seed * 3 + i, (xx, q) => {
        for (let k = 0; k < 4; k++) {
          ctx.beginPath();
          ctx.moveTo(xx + (k - 1.5) * 10, h);
          ctx.quadraticCurveTo(xx + (k - 1.5) * 16, h - 24, xx + (k - 1.5) * 22 + q() * 6, h - 40 - q() * 18);
          ctx.quadraticCurveTo(xx + (k - 1.5) * 12 + 6, h - 22, xx + (k - 1.5) * 10 + 12, h);
          fs(ctx, k % 2 ? '#4cd040' : '#34ac36', 3.5);
        }
      });
    }
  });
}

// Ground band (grass lip + earth) spanning all three lanes, with faint lane markers.
function groundTile(st, seed, scale) {
  if (st.ground === 'pier') return pierTile(st, seed, scale);
  const TH = 300, TWG = 512;
  const lanes = [105, 195];
  return layer(TWG, TH, scale, (ctx, w, h) => {
    const R = rng(seed);
    const kind = st.ground;
    if (kind === 'plank') {
      ctx.fillStyle = '#9a6a34';
      ctx.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 64) {
        rr(ctx, x + 3, 14, 58, h - 18, 5);
        fs(ctx, ['#c8904a', '#b27a38', '#d19a54'][(x / 64) % 3], 4);
        ctx.strokeStyle = 'rgba(60,30,10,0.35)';
        ctx.lineWidth = 2;
        for (let y = 40; y < h - 20; y += 38) {
          ctx.beginPath();
          ctx.moveTo(x + 10, y);
          ctx.quadraticCurveTo(x + 32, y + R() * 8 - 4, x + 54, y);
          ctx.stroke();
        }
        ctx.fillStyle = OUT;
        for (const dy of [28, h - 28]) for (const dx of [14, 50]) { ctx.beginPath(); ctx.arc(x + dx, dy, 3, 0, 7); ctx.fill(); }
      }
      // rope rail along the far edge
      ctx.fillStyle = '#e8d29a';
      ctx.fillRect(0, 0, w, 12);
      ctx.fillStyle = OUT;
      ctx.fillRect(0, 12, w, 4);
      for (let x = 20; x < w; x += 128) { rr(ctx, x - 6, -16, 12, 36, 3); fs(ctx, '#7a4a28', 4); }
      ctx.strokeStyle = 'rgba(60,30,10,0.4)';
      ctx.lineWidth = 3;
      for (const y of lanes) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.setLineDash([22, 18]); ctx.stroke(); ctx.setLineDash([]); }
      return;
    }
    ctx.fillStyle = st.dirt;
    ctx.fillRect(0, 22, w, h - 22);
    if (kind === 'stone') {
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 3.5;
      for (let y = 40; y < h; y += 52) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        const off = (y / 52) % 2 ? 0 : 64;
        for (let x = off; x < w + 64; x += 128) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 52); ctx.stroke(); }
      }
      ctx.fillStyle = '#2fd8c8';
      for (const y of lanes) for (let x = 20; x < w; x += 128) ctx.fillRect(x, y - 3, 44, 6);
    } else {
      for (let i = 0; i < 34; i++) {
        const x = R() * w, y = 42 + R() * (h - 52), r = 6 + R() * 14;
        wrap(ctx, w, x, r, (xx) => {
          ctx.beginPath();
          ctx.ellipse(xx, y, r, r * 0.7, 0, 0, 7);
          fs(ctx, i % 2 ? st.dirtD : '#d9a468', 3.5);
        });
      }
      ctx.strokeStyle = st.dirtD;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      for (const y of lanes) {
        ctx.setLineDash([26, 22]);
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w, 0);
    ctx.lineTo(w, 22);
    const steps = 16;
    for (let i = steps; i >= 0; i--) {
      const x = (i / steps) * w;
      ctx.quadraticCurveTo(x + w / steps / 2, 38 + (i % 2) * 8, x, 22);
    }
    ctx.closePath();
    fs(ctx, st.grass, 5);
    ctx.fillStyle = st.grassD;
    ctx.fillRect(0, 0, w, 10);
    ctx.fillStyle = OUT;
    ctx.fillRect(0, 0, w, 3);
    const g = ctx.createLinearGradient(0, h * 0.4, 0, h);
    g.addColorStop(0, 'rgba(60,30,10,0)');
    g.addColorStop(1, 'rgba(60,30,10,0.4)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}


// ------------------------------------------------------------------ lagoon scenery
function lagoonFar(st, seed, scale) {
  return layer(TW, 580, scale, (ctx, w, h) => {
    const R = rng(seed);
    const base = h - 190; // sea horizon
    // far islands
    for (let i = 0; i < 7; i++) {
      const x = (i + 0.5) * (w / 7) + (R() - 0.5) * 90;
      const r = 110 + R() * 100;
      wrapR(ctx, w, x, r * 1.4, seed * 7 + i, (xx, q) => {
        const hh = r * (0.5 + q() * 0.3);
        const g = ctx.createLinearGradient(0, base - hh, 0, base);
        g.addColorStop(0, '#b4d98a');
        g.addColorStop(1, '#6fae6c');
        ctx.beginPath();
        ctx.ellipse(xx, base, r * 1.2, hh, 0, Math.PI, 0);
        ctx.closePath();
        ctx.fillStyle = g;
        ctx.fill();
        if (!PAINTED) line(ctx, 4);
        ctx.fillStyle = '#8fc274';
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.arc(xx + (q() - 0.5) * r, base - hh * (0.55 + q() * 0.3), 22 + q() * 22, 0, 7);
          ctx.fill();
        }
        if (i % 3 === 0) { // pinkish coral tree
          ctx.fillStyle = '#e29a8c';
          ctx.beginPath();
          ctx.arc(xx + r * 0.3, base - hh * 0.8, 34, 0, 7);
          ctx.arc(xx + r * 0.3 + 26, base - hh * 0.72, 28, 0, 7);
          ctx.fill();
        }
      });
    }
    // giant crystal shards
    for (let i = 0; i < 6; i++) {
      const x = (i + 0.3 + R() * 0.5) * (w / 6);
      const hgt = 280 + R() * 230, wd = 34 + R() * 26, lean = (R() - 0.5) * 150;
      wrapR(ctx, w, x, 240, seed * 9 + i, (xx) => {
        const g = ctx.createLinearGradient(xx - wd, 0, xx + wd, 0);
        g.addColorStop(0, '#d3f0ff');
        g.addColorStop(0.45, '#69b8f2');
        g.addColorStop(1, '#2b6fd0');
        ctx.beginPath();
        ctx.moveTo(xx - wd, base);
        ctx.lineTo(xx + lean, base - hgt);
        ctx.lineTo(xx + wd, base);
        ctx.closePath();
        ctx.fillStyle = g;
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(xx + lean, base - hgt);
        ctx.lineTo(xx + wd * 0.1, base);
        ctx.lineTo(xx + wd, base);
        ctx.closePath();
        ctx.fillStyle = 'rgba(30,70,170,0.35)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.65)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(xx - wd, base);
        ctx.lineTo(xx + lean, base - hgt);
        ctx.stroke();
      });
    }
  }, 0.3);
}

function mossBlob(ctx, x, y, r, fill = '#6fbf4c') {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.55, 0, 0, 7);
  ctx.ellipse(x - r * 0.6, y + r * 0.2, r * 0.55, r * 0.4, 0, 0, 7);
  ctx.ellipse(x + r * 0.6, y + r * 0.15, r * 0.5, r * 0.38, 0, 0, 7);
  ctx.fill();
}

function purpleRock(ctx, x, base, hgt, wd, q) {
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

function lagoonMid(st, seed, scale) {
  return layer(TW, 680, scale, (ctx, w, h) => {
    const R = rng(seed);
    const base = h - 70;
    const n = 5;
    for (let i = 0; i < n; i++) {
      const x = (i + 0.5) * (w / n) + (R() - 0.5) * 90;
      wrapR(ctx, w, x, 300, seed * 13 + i, (xx, q) => {
        if (i % 3 === 0) {
          purpleRock(ctx, xx, base, 150 + q() * 100, 80 + q() * 40, q);
        } else if (i % 3 === 1) {
          // sea arch
          const rw = 130 + q() * 30, rh = 100 + q() * 30;
          const g = ctx.createLinearGradient(xx - rw, 0, xx + rw, 0);
          g.addColorStop(0, '#9b88d8');
          g.addColorStop(1, '#4a3d98');
          ctx.strokeStyle = g;
          ctx.lineCap = 'round';
          ctx.lineWidth = 46;
          ctx.beginPath();
          ctx.moveTo(xx - rw / 2, base);
          ctx.bezierCurveTo(xx - rw / 2, base - rh * 1.5, xx + rw / 2, base - rh * 1.5, xx + rw / 2, base);
          ctx.stroke();
          mossBlob(ctx, xx - rw * 0.1, base - rh * 1.08, 52);
          mossBlob(ctx, xx - rw * 0.5, base - rh * 0.5, 22);
        } else {
          // grassy islet with a tree
          const r = 90 + q() * 40;
          const g = ctx.createLinearGradient(0, base - r, 0, base);
          g.addColorStop(0, '#b6dc7e');
          g.addColorStop(1, '#5fa85c');
          ctx.beginPath();
          ctx.ellipse(xx, base, r * 1.1, r * 0.95, 0, Math.PI, 0);
          ctx.closePath();
          ctx.fillStyle = g;
          ctx.fill();
          if (!PAINTED) line(ctx, 4);
          ctx.fillStyle = '#7a5a3c';
          ctx.fillRect(xx - 9, base - r * 1.55, 18, r * 0.7);
          for (const [dx, dy, rr2] of [[0, -r * 1.65, 44], [-34, -r * 1.5, 30], [36, -r * 1.52, 32]]) {
            ctx.fillStyle = '#9acb64';
            ctx.beginPath();
            ctx.arc(xx + dx, base + dy, rr2, 0, 7);
            ctx.fill();
          }
        }
        // ripples around the base
        ctx.strokeStyle = 'rgba(255,255,255,0.45)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(xx, base + 6, 110, 11, 0, 0, 7);
        ctx.stroke();
      });
    }
  }, 0.12);
}

function lagoonNear(st, seed, scale) {
  return layer(TW, 330, scale, (ctx, w, h) => {
    const R = rng(seed);
    for (let i = 0; i < 6; i++) {
      const x = (i + R() * 0.7) * (w / 6);
      wrapR(ctx, w, x, 160, seed * 5 + i, (xx, q) => {
        const hh = 60 + q() * 90;
        purpleRock(ctx, xx, h - 8, hh, 50 + q() * 30, q);
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(xx, h - 4, 70, 8, 0, 0, 7);
        ctx.stroke();
      });
    }
  });
}

// wooden pier spanning all three lanes
function pierTile(st, seed, scale) {
  const TOP = 34, TH = 300, TWG = 512;
  const c = layer(TWG, TH + TOP, scale, (ctx, w, h) => {
    const R = rng(seed);
    const rows = 8, rh = TH / rows;
    const tones = [['#d9c08c', '#c4a468'], ['#cfb27a', '#b99a5e'], ['#dcc590', '#c8a96c'], ['#c9ad74', '#b0925a']];
    for (let r = 0; r < rows; r++) {
      const y = TOP + r * rh;
      let x = -((r % 2) * 96) - 40;
      while (x < w + 80) {
        const len = 150 + R() * 110;
        const t = tones[(r + ((R() * 3) | 0)) % 4];
        const g = ctx.createLinearGradient(0, y, 0, y + rh);
        g.addColorStop(0, t[0]);
        g.addColorStop(1, t[1]);
        ctx.fillStyle = g;
        ctx.fillRect(x, y, len, rh);
        ctx.strokeStyle = 'rgba(70,42,16,0.55)';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(x, y, len, rh);
        // grain
        ctx.strokeStyle = 'rgba(90,58,24,0.28)';
        ctx.lineWidth = 1.6;
        for (let k = 0; k < 3; k++) {
          const yy = y + 8 + k * 10;
          ctx.beginPath();
          ctx.moveTo(x + 8, yy);
          ctx.quadraticCurveTo(x + len / 2, yy + (R() - 0.5) * 6, x + len - 8, yy);
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(60,36,14,0.7)';
        for (const nx of [x + 10, x + len - 10]) { ctx.beginPath(); ctx.arc(nx, y + rh / 2, 2.4, 0, 7); ctx.fill(); }
        x += len;
      }
    }
    // algae along the far edge and some dark patches
    ctx.fillStyle = 'rgba(60,150,70,0.5)';
    for (let i = 0; i < 9; i++) {
      const x = R() * w;
      ctx.beginPath();
      ctx.ellipse(x, TOP + 4, 28 + R() * 30, 9, 0, 0, 7);
      ctx.fill();
    }
    // soft lane markings
    ctx.strokeStyle = 'rgba(70,42,16,0.38)';
    ctx.lineWidth = 5;
    ctx.setLineDash([30, 22]);
    for (const ly of [105, 195]) {
      ctx.beginPath();
      ctx.moveTo(0, TOP + ly);
      ctx.lineTo(w, TOP + ly);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // bollards along the far edge (mossy)
    for (let x = 40; x < w; x += 128) {
      const g = ctx.createLinearGradient(x - 15, 0, x + 15, 0);
      g.addColorStop(0, '#e6cf9c');
      g.addColorStop(1, '#a78650');
      rr(ctx, x - 15, 0, 30, TOP + 34, 13);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = 'rgba(70,42,16,0.6)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      mossBlob(ctx, x, 6, 15);
    }
    // shade towards the viewer
    const sh = ctx.createLinearGradient(0, TOP, 0, h);
    sh.addColorStop(0, 'rgba(255,240,200,0.12)');
    sh.addColorStop(1, 'rgba(50,25,5,0.28)');
    ctx.fillStyle = sh;
    ctx.fillRect(0, TOP, w, TH);
  });
  c.top = TOP;
  return c;
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const LEVELS = 26; // colour levels per channel after posterising (about 17k colours)

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.low = document.createElement('canvas');
    this.lctx = this.low.getContext('2d', { willReadFrequently: true });
    this.viewW = 1280;
    this.scale = 1;
    this.ox = 0;
    this.oy = 0;
    this.dpr = 1;
    this.PIX = V.pixel;
    this.style = 'painted';
    this.layerScale = 1.25;
    this.layers = {};
    this.biome = 'jungle';
    this.prevBiome = 'jungle';
    this.fade = 1;
    this.cloudX = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.list = [];
  }

  // style: 'painted' (smooth, soft shading) or 'pixel' (low-res, dithered)
  setStyle(style) {
    this.style = style;
    PAINTED = style === 'painted';
    OUT = PAINTED ? 'rgba(40,24,52,0.62)' : '#2b1608';
    OLK = PAINTED ? 0.42 : 1;
    this.layers = {};
    this.resize();
  }

  setQuality(low) {
    const pix = low ? 0.3125 : V.pixel;
    this.PIX = pix;
    this.layerScale = low ? 1 : 1.25;
    this.layers = {};
    this.dprCap = low ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    this.resize();
  }

  resize() {
    const iw = window.innerWidth, ih = window.innerHeight;
    const aspect = iw / ih;
    this.viewW = Math.round(Math.min(V.maxW, Math.max(V.minW, aspect * V.H)));
    this.scale = Math.min(iw / this.viewW, ih / V.H);
    this.ox = (iw - this.viewW * this.scale) / 2;
    this.oy = (ih - V.H * this.scale) / 2;
    this.dpr = this.dprCap || 1;
    this.canvas.width = Math.round(iw * this.dpr);
    this.canvas.height = Math.round(ih * this.dpr);
    if (this.style === 'pixel') {
      this.low.width = Math.round(this.viewW * this.PIX);
      this.low.height = Math.round(V.H * this.PIX);
    }
    this.iw = iw;
    this.ih = ih;
  }

  setBiome(b) {
    if (b === this.biome) return false;
    this.prevBiome = this.biome;
    this.biome = b;
    this.fade = 0;
    return true;
  }

  getLayers(name) {
    if (!this.layers[name]) {
      const st = BIOME_STYLE[name];
      const k = this.style === 'pixel' ? this.PIX : this.layerScale;
      const seed = name.length * 977;
      this.layers[name] = {
        far: farLayer(st, seed + 1, k),
        mid: midLayer(name, st, seed + 2, k),
        near: nearLayer(name, st, seed + 3, k),
        front: frontLayer(st, seed + 4, k),
        ground: groundTile(st, seed + 5, k),
      };
    }
    return this.layers[name];
  }

  snap(v) {
    return this.style === 'pixel' ? Math.round(v * this.PIX) / this.PIX : v;
  }

  strip(ctx, img, scroll, y, alpha = 1) {
    const w = img.vw;
    let x = this.snap(-(((scroll % w) + w) % w));
    const yy = this.snap(y);
    ctx.globalAlpha = alpha;
    for (; x < this.viewW; x += w) ctx.drawImage(img, x, yy, w + 1.5, img.vh);
    ctx.globalAlpha = 1;
  }

  drawSkyGradient(ctx, name, alpha) {
    const st = BIOME_STYLE[name];
    ctx.globalAlpha = alpha;
    const g = ctx.createLinearGradient(0, 0, 0, V.horizonY);
    g.addColorStop(0, st.sky[0]);
    g.addColorStop(0.55, st.sky[1]);
    g.addColorStop(1, st.sky[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.viewW, V.H);
    ctx.globalAlpha = 1;
  }

  drawSkyPainted(ctx, time) {
    const sx = this.viewW * 0.8, sy = 130;
    const glow = ctx.createRadialGradient(sx, sy, 10, sx, sy, 330);
    glow.addColorStop(0, 'rgba(255,248,205,0.95)');
    glow.addColorStop(0.12, 'rgba(255,240,170,0.6)');
    glow.addColorStop(0.5, 'rgba(255,235,170,0.14)');
    glow.addColorStop(1, 'rgba(255,235,170,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, this.viewW, V.horizonY);
    const clouds = [[0.05, 80, 1.5, 0.3], [0.33, 160, 1.1, 0.6], [0.58, 60, 1.7, 0.9], [0.86, 190, 1.0, 1.2], [0.98, 100, 1.3, 1.5]];
    for (const [fx, y, sc, ph] of clouds) {
      const x = (((fx * this.viewW + this.cloudX * 1.3) % (this.viewW + 500)) + this.viewW + 500) % (this.viewW + 500) - 250;
      ctx.save();
      ctx.translate(x, y + Math.sin(time * 0.35 + ph) * 5);
      ctx.scale(sc, sc * 0.62);
      for (let i = 0; i < 9; i++) {
        const px = (i - 4) * 38 + Math.sin(i * 2.1 + ph) * 16;
        const py = Math.sin(i * 1.3 + ph) * 18 - (4 - Math.abs(i - 4)) * 6;
        const r = 52 + ((i * 37) % 28);
        const g = ctx.createRadialGradient(px - r * 0.2, py - r * 0.35, r * 0.1, px, py, r);
        g.addColorStop(0, 'rgba(255,255,255,0.98)');
        g.addColorStop(0.6, 'rgba(240,247,255,0.85)');
        g.addColorStop(1, 'rgba(200,222,248,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, 7);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  drawSky(ctx, time) {
    if (this.style === 'painted') {
      this.drawSkyPainted(ctx, time);
      return;
    }
    const sx = this.viewW * 0.78, sy = 120;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(time * 0.1);
    ctx.fillStyle = 'rgba(255,240,150,0.45)';
    for (let i = 0; i < 12; i++) {
      ctx.rotate(Math.PI / 6);
      ctx.beginPath();
      ctx.moveTo(-14, -78);
      ctx.lineTo(0, -128);
      ctx.lineTo(14, -78);
      ctx.fill();
    }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(sx, sy, 62, 0, 7);
    fs(ctx, '#ffe45a', 5);
    ctx.beginPath();
    ctx.ellipse(sx - 18, sy - 20, 14, 8, -0.6, 0, 7);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fill();
    const cl = [[0.1, 90, 1], [0.38, 150, 0.8], [0.62, 70, 1.15], [0.9, 170, 0.7]];
    for (const [fx, y, s] of cl) {
      const x = (((fx * this.viewW + this.cloudX) % (this.viewW + 300)) + this.viewW + 300) % (this.viewW + 300) - 150;
      ctx.save();
      ctx.translate(x, y + Math.sin(time * 0.6 + fx * 9) * 4);
      ctx.scale(s, s);
      const parts = [[-40, 6, 30], [-6, -12, 40], [34, 2, 34], [66, 14, 22]];
      ctx.fillStyle = OUT;
      for (const [px, py, r] of parts) { ctx.beginPath(); ctx.arc(px, py, r + 4, 0, 7); ctx.fill(); }
      ctx.fillRect(-64, 6, 150, 34);
      ctx.fillStyle = '#fff';
      for (const [px, py, r] of parts) { ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.fill(); }
      ctx.fillRect(-60, 6, 142, 30);
      ctx.restore();
    }
  }

  drawLayers(ctx, camX, name, alpha, time = 0) {
    const L = this.getLayers(name);
    const st = BIOME_STYLE[name];
    const G = V.horizonY;
    this.strip(ctx, L.far, camX * 0.1, G - 580 + 20, alpha);
    if (st.water) this.drawWater(ctx, camX, time, st, alpha);
    this.strip(ctx, L.mid, camX * 0.28, G - 680 + 24, alpha);
    this.strip(ctx, L.near, camX * 0.55, G - 330 + 14, alpha);
  }

  // open sea between the horizon and the pier
  drawWater(ctx, camX, time, st, alpha) {
    const G = V.horizonY;
    const y0 = G - 190;
    ctx.save();
    ctx.globalAlpha = alpha;
    const g = ctx.createLinearGradient(0, y0, 0, G + 6);
    g.addColorStop(0, st.water[0]);
    g.addColorStop(0.35, st.water[1]);
    g.addColorStop(1, st.water[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, y0, this.viewW, G - y0 + 6);
    // drifting highlight streaks, longer and brighter towards the viewer
    for (let k = 0; k < 16; k++) {
      const t = k / 15;
      const y = y0 + 8 + t * t * (G - y0 - 14);
      const len = 50 + t * 150;
      const speed = 0.08 + t * 0.35;
      for (let j = 0; j < 7; j++) {
        const sx = (((j * 260 + k * 91 - camX * speed + Math.sin(time * 0.5 + k) * 18) % (this.viewW + 300)) + this.viewW + 300) % (this.viewW + 300) - 150;
        ctx.fillStyle = `rgba(255,255,255,${0.1 + t * 0.2})`;
        ctx.fillRect(this.snap(sx), this.snap(y), len, 2 + t * 3);
      }
    }
    // sun sparkles
    for (let i = 0; i < 18; i++) {
      const sx = (((i * 97 + time * 20 - camX * 0.1) % this.viewW) + this.viewW) % this.viewW;
      const sy = y0 + 16 + ((i * 53) % (G - y0 - 30));
      if (Math.sin(time * 3 + i * 1.7) > 0.5) {
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.fillRect(this.snap(sx), this.snap(sy), 5, 2);
      }
    }
    ctx.restore();
  }

  drawGround(ctx, camX, gaps, name, alpha) {
    const G = V.horizonY;
    const L = this.getLayers(name);
    const st = BIOME_STYLE[name];
    ctx.save();
    ctx.globalAlpha = alpha;
    for (const gp of gaps) {
      const x0 = gp.x0 - camX, x1 = gp.x1 - camX;
      if (x1 < -20 || x0 > this.viewW + 20) continue;
      const g = ctx.createLinearGradient(0, G, 0, V.H);
      if (st.ground === 'pier') {
        g.addColorStop(0, '#45d6ca');
        g.addColorStop(1, '#1f9aa8');
      } else {
        g.addColorStop(0, '#5a3a6a');
        g.addColorStop(1, '#150a22');
      }
      ctx.fillStyle = g;
      ctx.fillRect(x0, G, x1 - x0, V.H - G + 4);
      ctx.fillStyle = st.dirtD;
      ctx.beginPath();
      ctx.moveTo(x0, G);
      for (let y = G + 20; y < V.H; y += 30) ctx.lineTo(x0 + (((y / 30) | 0) % 2 ? 16 : 5), y);
      ctx.lineTo(x0, V.H);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x1, G);
      for (let y = G + 20; y < V.H; y += 30) ctx.lineTo(x1 - (((y / 30) | 0) % 2 ? 5 : 16), y);
      ctx.lineTo(x1, V.H);
      ctx.fill();
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, G - 40, this.viewW, V.H - G + 40);
    for (const gp of gaps) {
      const x0 = gp.x0 - camX, x1 = gp.x1 - camX;
      ctx.rect(x0, G - 40, x1 - x0, V.H - G + 40);
    }
    ctx.clip('evenodd');
    const tile = L.ground;
    const w = tile.vw;
    let x = this.snap(-(((camX % w) + w) % w));
    const yy = this.snap(G - (tile.top || 0));
    for (; x < this.viewW; x += w) ctx.drawImage(tile, x, yy, w + 1.5, tile.vh);
    ctx.restore();
    for (const gp of gaps) {
      const x0 = gp.x0 - camX, x1 = gp.x1 - camX;
      if (x1 < -20 || x0 > this.viewW + 20) continue;
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x0, G);
      ctx.lineTo(x0, V.H);
      ctx.moveTo(x1, G);
      ctx.lineTo(x1, V.H);
      ctx.stroke();
    }
    ctx.restore();
  }

  // posterise + ordered dither: gives the chunky "console" colour look
  post(ctx, w, h) {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    const step = 255 / (LEVELS - 1), inv = 1 / step;
    const amp = step * 0.85;
    let i = 0;
    for (let y = 0; y < h; y++) {
      const row = (y & 3) * 4;
      for (let x = 0; x < w; x++, i += 4) {
        const o = ((BAYER[row + (x & 3)] + 0.5) / 16 - 0.5) * amp;
        d[i] = Math.round((d[i] + o) * inv) * step;
        d[i + 1] = Math.round((d[i + 1] + o) * inv) * step;
        d[i + 2] = Math.round((d[i + 2] + o) * inv) * step;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  render(game, dt) {
    const L = this.lctx;
    const { world, player, particles } = game;
    const time = game.time;
    const PIX = this.PIX;
    this.cloudX -= dt * 8;
    if (this.fade < 1) this.fade = Math.min(1, this.fade + dt / 1.4);
    const fade = this.fade;

    const pixel = this.style === 'pixel';
    let ctx;
    if (pixel) {
      L.setTransform(1, 0, 0, 1, 0, 0);
      L.imageSmoothingEnabled = false;
      L.fillStyle = '#8fdcf0';
      L.fillRect(0, 0, this.low.width, this.low.height);
      L.setTransform(PIX, 0, 0, PIX, Math.round(this.shakeX * PIX), Math.round(this.shakeY * PIX));
      ctx = L;
    } else {
      ctx = this.ctx;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.fillStyle = '#8fdcf0';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      const k = this.dpr * this.scale;
      ctx.setTransform(k, 0, 0, k, this.ox * this.dpr + this.shakeX * k, this.oy * this.dpr + this.shakeY * k);
      ctx.save();
      ctx.beginPath();
      ctx.rect(-80, -80, this.viewW + 160, V.H + 160);
      ctx.clip();
    }
    const camX = game.camX;

    if (fade < 1) this.drawSkyGradient(ctx, this.prevBiome, 1);
    this.drawSkyGradient(ctx, this.biome, fade < 1 ? fade : 1);
    this.drawSky(ctx, time);
    if (fade < 1) this.drawLayers(ctx, camX, this.prevBiome, 1, time);
    this.drawLayers(ctx, camX, this.biome, fade < 1 ? fade : 1, time);
    if (fade < 1) this.drawGround(ctx, camX, world.gaps.active, this.prevBiome, 1);
    this.drawGround(ctx, camX, world.gaps.active, this.biome, fade < 1 ? fade : 1);

    // depth-sorted entities (back lane first, front lane last)
    this.dt = dt;
    const list = this.list;
    list.length = 0;
    for (const pl of world.platforms.active) list.push({ y: laneY(pl.lane) - 1, t: 5, e: pl });
    if (game.boss.active) {
      this.drawBossWarn(ctx, game.boss, time);
      list.push({ y: laneY(game.boss.laneF) + 0.1, t: 6, e: game.boss });
    }
    for (const e of world.enemies.active) list.push({ y: laneY(e.lane), t: 4, e });
    for (const h of world.hazards.active) list.push({ y: laneY(h.lane), t: 0, e: h });
    for (const c of world.crates.active) list.push({ y: laneY(c.lane), t: 1, e: c });
    for (const it of world.items.active) list.push({ y: laneY(it.lf), t: 2, e: it });
    const feet = laneY(player.laneF);
    list.push({ y: feet + 0.5, t: 3, e: player });
    list.sort((a, b) => a.y - b.y);
    for (const o of list) {
      if (o.t === 0) this.drawHazard(ctx, o.e, camX, time);
      else if (o.t === 1) this.drawCrateEnt(ctx, o.e, camX, time);
      else if (o.t === 2) this.drawItem(ctx, o.e, camX, time);
      else if (o.t === 4) this.drawEnemy(ctx, o.e, camX, time);
      else if (o.t === 5) this.drawPlatformEnt(ctx, o.e, camX, time);
      else if (o.t === 6) this.drawBossEnt(ctx, o.e, time);
      else this.drawHero(ctx, game, feet, time);
    }
    for (const m of game.maskFx) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, m.life * 2);
      ctx.translate(this.snap(m.x - camX), this.snap(laneY(m.lane) - m.y));
      ctx.rotate(m.rot);
      ctx.scale(0.7, 0.7);
      S.drawMask(ctx, time, false);
      ctx.restore();
    }
    particles.draw(ctx, camX, this);

    const Lr = this.getLayers(this.biome);
    this.strip(ctx, Lr.front, camX * 1.25, V.H - 56, fade < 1 ? fade : 1);

    for (const b of world.hazards.active) {
      if (b.kind === 'boulder' && b.state === 'idle' && b.warn) this.drawWarn(ctx, time, b);
    }
    if (game.speedPx > 700 && game.state === 'playing') {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 6; i++) {
        const y = 80 + ((i * 97 + time * 400) % 420);
        const x = ((i * 377 - time * 2400) % (this.viewW + 200) + this.viewW + 200) % (this.viewW + 200) - 100;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 90, y);
        ctx.stroke();
      }
    }

    if (!pixel) {
      ctx.restore();
      return;
    }
    L.setTransform(1, 0, 0, 1, 0, 0);
    this.post(L, this.low.width, this.low.height);

    // upscale to the screen with hard pixels
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#0e2a14';
    c.fillRect(0, 0, this.canvas.width, this.canvas.height);
    c.imageSmoothingEnabled = false;
    c.drawImage(this.low, 0, 0, this.low.width, this.low.height,
      Math.round(this.ox * this.dpr), Math.round(this.oy * this.dpr),
      Math.round(this.viewW * this.scale * this.dpr), Math.round(V.H * this.scale * this.dpr));
  }

  shadow(ctx, w, y, a = 0.28) {
    ctx.fillStyle = `rgba(30,15,5,${a})`;
    ctx.beginPath();
    ctx.ellipse(0, y, w, Math.max(5, w * 0.16), 0, 0, 7);
    ctx.fill();
  }

  drawHero(ctx, game, feet, time) {
    const p = game.player;
    const pu = game.powerups;
    const hx = this.snap(game.heroX());
    const hy = feet - p.y;
    // mask power: golden aura behind the hero
    if (pu.invincible && game.state !== 'menu') {
      const warn = pu.timers.mask < 2 && Math.sin(time * 20) > 0;
      if (!warn) {
        ctx.save();
        ctx.translate(hx, hy - (p.sliding ? 28 : 66));
        ctx.rotate(time * 1.5);
        ctx.fillStyle = 'rgba(255,214,60,0.35)';
        for (let i = 0; i < 10; i++) {
          ctx.rotate(Math.PI / 5);
          ctx.beginPath();
          ctx.moveTo(-10, -92);
          ctx.lineTo(0, -128 - Math.sin(time * 8 + i) * 8);
          ctx.lineTo(10, -92);
          ctx.fill();
        }
        ctx.restore();
        ctx.save();
        ctx.translate(hx, hy - (p.sliding ? 28 : 66));
        ctx.beginPath();
        ctx.arc(0, 0, 88 + Math.sin(time * 6) * 4, 0, 7);
        ctx.fillStyle = 'rgba(255,230,120,0.22)';
        ctx.fill();
        ctx.lineWidth = 5;
        ctx.strokeStyle = 'rgba(255,200,40,0.85)';
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.save();
    ctx.translate(hx, this.snap(feet));
    const hs = game.heroScale();
    ctx.scale(hs, hs);
    p.draw(ctx, 0, 0);
    ctx.restore();
    // spin attack slashes
    if (p.spinTimer > 0) {
      ctx.save();
      ctx.translate(hx, hy - 62);
      ctx.rotate(p.spinAngle * 0.5);
      for (let i = 0; i < 2; i++) {
        ctx.rotate(Math.PI);
        ctx.beginPath();
        ctx.arc(0, 0, 96, 0.1, 1.9);
        ctx.lineCap = 'round';
        ctx.lineWidth = 16;
        ctx.strokeStyle = OUT;
        ctx.stroke();
        ctx.lineWidth = 9;
        ctx.strokeStyle = '#fff';
        ctx.stroke();
      }
      ctx.restore();
    }
    // spirit mask companion(s)
    const n = pu.invincible ? 1 : Math.min(2, pu.masks);
    this.mp = this.mp || [];
    for (let i = 0; i < 2; i++) {
      if (i >= n) { this.mp[i] = null; continue; }
      const tx = hx - 82 - i * 66 + (p.sliding ? 20 : 0);
      const ty = hy - (p.sliding ? 70 : 150) + Math.sin(time * 3 + i * 1.8) * 9 + i * 28;
      const m = this.mp[i] || (this.mp[i] = { x: tx, y: ty });
      const k = 1 - Math.exp(-11 * (this.dt || 0.016));
      m.x += (tx - m.x) * k;
      m.y += (ty - m.y) * k;
      ctx.save();
      ctx.translate(this.snap(m.x), this.snap(m.y));
      const sc = pu.invincible ? 0.92 : 0.64 - i * 0.06;
      ctx.scale(sc, sc);
      S.drawMask(ctx, time + i, pu.invincible, (m.x - tx) * 0.004);
      ctx.restore();
    }
    this.drawPowerFx(ctx, game, time, feet);
  }

  drawBossEnt(ctx, b, time) {
    const base = laneY(b.laneF);
    ctx.save();
    ctx.globalAlpha = b.alpha;
    ctx.translate(this.snap(b.sx), this.snap(base));
    this.shadow(ctx, 150, 4, 0.3);
    ctx.scale(1.55, 1.55);
    S.drawBossBeetle(ctx, time, b);
    ctx.restore();
  }

  // lane warning bands from the boss to the hero while it winds up a throw
  drawBossWarn(ctx, b, time) {
    if (!b.warnLanes.length) return;
    for (const l of b.warnLanes) {
      const y = laneY(l);
      const main = l === b.lane;
      ctx.save();
      ctx.globalAlpha = 0.28 + Math.sin(time * 16) * 0.12;
      ctx.fillStyle = main ? '#ff2a1a' : '#ffb02a';
      ctx.fillRect(0, y - 46, b.sx, 46);
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 3;
      for (let i = 0; i < 9; i++) {
        const ax = b.sx - 120 - ((i * 130 + time * 480) % (b.sx - 160));
        ctx.beginPath();
        ctx.moveTo(ax, y - 38);
        ctx.lineTo(ax - 24, y - 23);
        ctx.lineTo(ax, y - 8);
        ctx.closePath();
        ctx.fillStyle = main ? '#ff3a2a' : '#ffc040';
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  drawEnemy(ctx, e, camX, time) {
    const sx = e.x - camX;
    if (sx < -200 || sx > this.viewW + 200) return;
    const base = laneY(e.lane);
    ctx.save();
    ctx.translate(this.snap(sx), this.snap(base));
    const lift = Math.max(0.4, 1 - e.y0 / 320);
    this.shadow(ctx, e.w * 0.5 * lift, 2, 0.25);
    ctx.translate(0, -e.y0);
    if (e.kind === 'scuttler') S.drawScuttler(ctx, e.w, e.h, time + e.t, e.dir);
    else if (e.kind === 'spiky') S.drawSpiky(ctx, e.w, time + e.t);
    else S.drawBat(ctx, e.w, time + e.t);
    ctx.restore();
  }

  drawPlatformEnt(ctx, pl, camX, time) {
    const sx = pl.x - camX;
    if (sx < -pl.w || sx > this.viewW + pl.w) return;
    const base = laneY(pl.lane);
    ctx.save();
    ctx.translate(this.snap(sx), this.snap(base));
    this.shadow(ctx, pl.w * 0.42, 2, 0.2);
    ctx.translate(0, -pl.y0);
    S.drawPlatform(ctx, this.biome, pl.w, pl.h, time);
    ctx.restore();
  }

  drawWarn(ctx, time, b) {
    const x = this.viewW - 60;
    const y = laneY(b.lane) - 70;
    const pul = 1 + Math.sin(time * 14) * 0.12;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pul, pul);
    ctx.beginPath();
    ctx.moveTo(0, -46);
    ctx.lineTo(44, 34);
    ctx.lineTo(-44, 34);
    ctx.closePath();
    ctx.fillStyle = '#ff3a2a';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = OUT;
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.font = '900 48px Impact, "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.fillText('!', 0, 28);
    ctx.restore();
    ctx.fillStyle = '#ff3a2a';
    for (let i = 0; i < 3; i++) {
      const ax = x - 80 - i * 36 + ((time * 120) % 36);
      ctx.beginPath();
      ctx.moveTo(ax, y - 14);
      ctx.lineTo(ax - 26, y);
      ctx.lineTo(ax, y + 14);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  drawHazard(ctx, h, camX, time) {
    const sx = h.x - camX;
    if (sx < -300 || sx > this.viewW + 300) return;
    const base = laneY(h.lane);
    ctx.save();
    ctx.translate(this.snap(sx), this.snap(base));
    if (h.kind !== 'branch') this.shadow(ctx, h.w * 0.55, 2);
    ctx.translate(0, -h.y0);
    if (h.kind === 'log') S.drawLog(ctx, h.w, h.h);
    else if (h.kind === 'rock') S.drawRock(ctx, h.w, h.h);
    else if (h.kind === 'barricade') S.drawBarricade(ctx, h.w, h.h, time);
    else if (h.kind === 'branch') {
      ctx.translate(0, h.y0);
      S.drawBranch(ctx, h.w, h.y0, time);
    } else if (h.kind === 'boulder') {
      S.drawBoulder(ctx, h.w / 2, -h.rolled / (h.w / 2), time);
    } else if (h.kind === 'coconut') {
      S.drawCoconut(ctx, h.w / 2, h.rolled / (h.w / 2), time, h.deflected);
    }
    ctx.restore();
    if ((h.kind === 'branch' || h.kind === 'barricade') && sx > 0 && sx < this.viewW) {
      const col = h.kind === 'branch' ? '#35e0d0' : '#ff5a3a';
      ctx.save();
      ctx.globalAlpha = 0.55 + Math.sin(time * 8) * 0.25;
      ctx.fillStyle = col;
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 3;
      for (let i = 0; i < 2; i++) {
        const cx = sx - 150 - i * 44;
        ctx.beginPath();
        ctx.moveTo(cx, base - 26);
        ctx.lineTo(cx + 22, base - 12);
        ctx.lineTo(cx, base + 2);
        ctx.lineTo(cx - 8, base - 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  drawCrateEnt(ctx, c, camX, time) {
    const sx = c.x - camX;
    if (sx < -150 || sx > this.viewW + 150) return;
    ctx.save();
    ctx.translate(this.snap(sx), this.snap(laneY(c.lane)));
    this.shadow(ctx, c.w * 0.6, 2);
    ctx.translate(0, -c.y0);
    if (c.kind === 'bouncy' && c.squash > 0) {
      const k = 1 - c.squash / 0.35;
      ctx.scale(1 + Math.sin(k * Math.PI) * 0.25, 1 - Math.sin(k * Math.PI) * 0.4);
    } else if (c.kind === 'tnt' && c.armed) {
      const s = 1 + (1 - Math.max(0, c.fuse) / CONFIG.crates.tntFuse) * 0.14 + Math.sin(time * 40) * 0.02;
      ctx.scale(s, s);
    } else if (c.kind === 'mystery') {
      ctx.translate(0, Math.sin(time * 3 + c.x * 0.01) * 4);
    }
    S.drawCrate(ctx, c.kind, c.w, time, c.flash);
    ctx.restore();
  }

  drawItem(ctx, it, camX, time) {
    const sx = it.x - camX;
    if (sx < -80 || sx > this.viewW + 80) return;
    const bob = it.state === 'idle' ? Math.sin(time * 3.2 + it.phase) * 6 : 0;
    const ly = laneY(it.lf);
    // small ground shadow shows which lane a floating item is in
    ctx.save();
    ctx.translate(this.snap(sx), this.snap(ly));
    const sc = Math.max(0.4, 1 - it.y / 520);
    this.shadow(ctx, 22 * sc, 2, 0.22);
    ctx.restore();
    ctx.save();
    ctx.translate(this.snap(sx), this.snap(ly - it.y - bob));
    if (it.kind === 'fruit') {
      ctx.rotate(Math.sin(time * 2.5 + it.phase) * 0.18);
      S.drawFruit(ctx, time);
    } else if (it.kind === 'relic') S.drawRelic(ctx, time);
    else if (it.kind === 'green' || it.kind === 'purple' || it.kind === 'blue') S.drawGem(ctx, it.kind, time + it.phase);
    else S.drawPowerup(ctx, it.kind, time + it.phase);
    ctx.restore();
  }

  drawPowerFx(ctx, game, time, feet) {
    const t = game.powerups.timers;
    const p = game.player;
    const x = game.heroX();
    const y = feet - p.y - (p.sliding ? 28 : 62);
    const warn = (v) => v < 2 && Math.sin(time * 20) > 0;
    if (t.magnet > 0 && !warn(t.magnet)) {
      ctx.save();
      ctx.translate(x, y);
      ctx.strokeStyle = 'rgba(255,70,70,0.75)';
      ctx.lineWidth = 5;
      ctx.setLineDash([16, 12]);
      ctx.lineDashOffset = -time * 60;
      ctx.beginPath();
      ctx.arc(0, 0, 120 + Math.sin(time * 6) * 6, 0, 7);
      ctx.stroke();
      ctx.restore();
    }
    if (t.multiplier > 0 && !warn(t.multiplier)) {
      for (let i = 0; i < 5; i++) {
        const a = time * 3 + (i * Math.PI * 2) / 5;
        ctx.save();
        ctx.translate(x + Math.cos(a) * 80, y + Math.sin(a) * 60);
        ctx.rotate(time * 4);
        ctx.beginPath();
        for (let k = 0; k < 8; k++) {
          const r = k % 2 ? 6 : 14;
          const aa = (k / 8) * Math.PI * 2;
          ctx.lineTo(Math.cos(aa) * r, Math.sin(aa) * r);
        }
        ctx.closePath();
        ctx.fillStyle = '#ffdc4a';
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = OUT;
        ctx.stroke();
        ctx.restore();
      }
    }
  }
}
