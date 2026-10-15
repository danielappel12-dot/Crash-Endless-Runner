import { CONFIG } from '../config/settings.js';
import * as S from './Sprites.js';

// Canvas2D renderer: painted parallax backdrops (pre-rendered per biome),
// cartoon ground with ravine gaps, then entities, hero and particles.

const V = CONFIG.view;
const OUT = '#2b1608';
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
  bridge: {
    sky: ['#3aa6ea', '#9ad8f4', '#ffe0a8'], hill: ['#e8a15c', '#d08744'], mid: ['#2fa84a', '#208a3a'],
    trunk: '#8a5430', grass: '#62dc4c', grassD: '#3cb83a', dirt: '#b9803f', dirtD: '#8a5a28', ground: 'plank',
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
  ctx.lineWidth = lw;
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
function layer(w, h, scale, draw) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w * scale);
  c.height = Math.ceil(h * scale);
  const ctx = c.getContext('2d');
  ctx.scale(scale, scale);
  draw(ctx, w, h);
  c.vw = w;
  c.vh = h;
  return c;
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
      const n = name === 'bridge' ? 6 : 7;
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
  return layer(TW, 180, scale, (ctx, w, h) => {
    const R = rng(seed);
    for (let i = 0; i < 9; i++) {
      const x = R() * w;
      wrapR(ctx, w, x, 90, seed * 3 + i, (xx, q) => {
        for (let k = 0; k < 5; k++) {
          ctx.beginPath();
          ctx.moveTo(xx + (k - 2) * 12, h);
          ctx.quadraticCurveTo(xx + (k - 2) * 20, h - 40, xx + (k - 2) * 26 + q() * 8, h - 70 - q() * 40);
          ctx.quadraticCurveTo(xx + (k - 2) * 14 + 8, h - 40, xx + (k - 2) * 12 + 14, h);
          fs(ctx, k % 2 ? '#4cd040' : '#34ac36', 4);
        }
        if (i % 3 === 0) {
          const c = ['#ff5fa0', '#ffd23a', '#2fd0c8'][i % 9 === 0 ? 0 : i % 9 === 3 ? 1 : 2];
          for (let k = 0; k < 5; k++) {
            const a = (k / 5) * 6.28;
            ctx.beginPath();
            ctx.arc(xx + Math.cos(a) * 10, h - 85 + Math.sin(a) * 10, 9, 0, 7);
            fs(ctx, c, 3);
          }
          ctx.beginPath();
          ctx.arc(xx, h - 85, 7, 0, 7);
          fs(ctx, '#fff2a0', 3);
        }
      });
    }
  });
}

function groundTile(st, seed, scale) {
  const TH = 140, TWG = 512;
  return layer(TWG, TH, scale, (ctx, w, h) => {
    const R = rng(seed);
    const kind = st.ground;
    if (kind === 'plank') {
      // bridge deck
      ctx.fillStyle = '#b9803f';
      ctx.fillRect(0, 0, w, 52);
      for (let x = 0; x < w; x += 64) {
        rr(ctx, x + 3, 6, 58, 42, 6);
        fs(ctx, ['#c8904a', '#b27a38', '#d19a54'][(x / 64) % 3], 4);
        ctx.fillStyle = OUT;
        for (const dx of [10, 50]) { ctx.beginPath(); ctx.arc(x + dx, 27, 3, 0, 7); ctx.fill(); }
      }
      ctx.fillStyle = '#4ddacd';
      ctx.fillRect(0, 60, w, h - 60);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 6; i++) {
        const x = R() * w, y = 70 + R() * 60;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + 18, y - 8, x + 36, y);
        ctx.stroke();
      }
      ctx.fillStyle = OUT;
      ctx.fillRect(0, 52, w, 5);
      for (let x = 32; x < w; x += 128) {
        rr(ctx, x - 7, 52, 14, 90, 3);
        fs(ctx, '#7a4a28', 4);
      }
      return;
    }
    // earth body
    ctx.fillStyle = st.dirt;
    ctx.fillRect(0, 22, w, h - 22);
    if (kind === 'stone') {
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 3.5;
      for (let y = 40; y < h; y += 48) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        const off = (y / 48) % 2 ? 0 : 64;
        for (let x = off; x < w + 64; x += 128) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 48); ctx.stroke(); }
      }
      ctx.fillStyle = '#2fd8c8';
      for (let x = 20; x < w; x += 128) ctx.fillRect(x, 54, 40, 6);
    } else {
      for (let i = 0; i < 16; i++) {
        const x = R() * w, y = 42 + R() * (h - 52), r = 6 + R() * 14;
        wrap(ctx, w, x, r, (xx) => {
          ctx.beginPath();
          ctx.ellipse(xx, y, r, r * 0.7, 0, 0, 7);
          fs(ctx, i % 2 ? st.dirtD : '#d9a468', 3.5);
        });
      }
      ctx.fillStyle = st.dirtD;
      ctx.globalAlpha = 0.55;
      for (let i = 0; i < 6; i++) {
        const x = R() * w, y = 70 + R() * 50;
        ctx.beginPath(); ctx.ellipse(x, y, 40, 8, 0, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // scalloped grass lip on top
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
    ctx.beginPath();
    ctx.rect(0, 0, w, 10);
    ctx.fillStyle = st.grassD;
    ctx.fill();
    ctx.fillStyle = OUT;
    ctx.fillRect(0, 0, w, 3);
    // bottom fade
    const g = ctx.createLinearGradient(0, h * 0.5, 0, h);
    g.addColorStop(0, 'rgba(60,30,10,0)');
    g.addColorStop(1, 'rgba(60,30,10,0.45)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.viewW = 1280;
    this.scale = 1;
    this.ox = 0;
    this.oy = 0;
    this.dpr = 1;
    this.layers = {};
    this.biome = 'jungle';
    this.prevBiome = 'jungle';
    this.fade = 1;
    this.layerScale = 1;
    this.cloudX = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.slow = 0;
  }

  setQuality(low) {
    const want = low ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
    if (want !== this.layerScale || !Object.keys(this.layers).length) {
      this.layerScale = want;
      this.layers = {};
    }
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
    this.iw = iw;
    this.ih = ih;
  }

  setBiome(b) {
    if (b === this.biome) return;
    this.prevBiome = this.biome;
    this.biome = b;
    this.fade = 0;
  }

  getLayers(name) {
    if (!this.layers[name]) {
      const st = BIOME_STYLE[name];
      const k = this.layerScale;
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

  strip(ctx, img, scroll, y, alpha = 1) {
    const w = img.vw;
    let x = -(((scroll % w) + w) % w);
    ctx.globalAlpha = alpha;
    for (; x < this.viewW; x += w) ctx.drawImage(img, x, y, w + 1, img.vh);
    ctx.globalAlpha = 1;
  }

  drawBackdrop(ctx, camX, time, name, alpha) {
    const st = BIOME_STYLE[name];
    const G = V.groundY;
    ctx.globalAlpha = alpha;
    const g = ctx.createLinearGradient(0, 0, 0, G);
    g.addColorStop(0, st.sky[0]);
    g.addColorStop(0.55, st.sky[1]);
    g.addColorStop(1, st.sky[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.viewW, V.H);
    ctx.globalAlpha = 1;
  }

  drawSky(ctx, time) {
    // sun
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
    // clouds
    const cl = [[0.1, 90, 1], [0.38, 150, 0.8], [0.62, 70, 1.15], [0.9, 170, 0.7]];
    for (const [fx, y, s] of cl) {
      const x = (((fx * this.viewW + this.cloudX) % (this.viewW + 300)) + this.viewW + 300) % (this.viewW + 300) - 150;
      ctx.save();
      ctx.translate(x, y + Math.sin(time * 0.6 + fx * 9) * 4);
      ctx.scale(s, s);
      // outline pass then fill pass for a clean blobby silhouette
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

  drawGround(ctx, camX, gaps, name, alpha) {
    const G = V.groundY;
    const L = this.getLayers(name);
    const st = BIOME_STYLE[name];
    ctx.save();
    ctx.globalAlpha = alpha;
    // chasms first (behind the ground tiles)
    for (const gp of gaps) {
      const x0 = gp.x0 - camX, x1 = gp.x1 - camX;
      if (x1 < -20 || x0 > this.viewW + 20) continue;
      const g = ctx.createLinearGradient(0, G, 0, V.H);
      if (st.ground === 'plank') {
        g.addColorStop(0, '#45d6ca');
        g.addColorStop(1, '#1f9aa8');
      } else {
        g.addColorStop(0, '#5a3a6a');
        g.addColorStop(1, '#150a22');
      }
      ctx.fillStyle = g;
      ctx.fillRect(x0, G, x1 - x0, V.H - G + 4);
      // jagged walls
      ctx.fillStyle = st.dirtD;
      ctx.beginPath();
      ctx.moveTo(x0, G);
      for (let y = G + 20; y < V.H; y += 26) ctx.lineTo(x0 + (((y / 26) | 0) % 2 ? 14 : 5), y);
      ctx.lineTo(x0, V.H);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x1, G);
      for (let y = G + 20; y < V.H; y += 26) ctx.lineTo(x1 - (((y / 26) | 0) % 2 ? 5 : 14), y);
      ctx.lineTo(x1, V.H);
      ctx.fill();
    }
    // ground tiles with holes
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
    let x = -(((camX % w) + w) % w);
    for (; x < this.viewW; x += w) ctx.drawImage(tile, x, G, w + 1, tile.vh);
    ctx.restore();
    // gap lips
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

  render(game, dt) {
    const ctx = this.ctx;
    const { world, player, particles } = game;
    const time = game.time;
    this.cloudX -= dt * 8;
    if (this.fade < 1) this.fade = Math.min(1, this.fade + dt / 1.4);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#8fdcf0';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const k = this.dpr * this.scale;
    ctx.setTransform(k, 0, 0, k, this.ox * this.dpr + this.shakeX * k, this.oy * this.dpr + this.shakeY * k);
    // clip to the stage so oversized strips don't bleed into the letterbox
    ctx.save();
    ctx.beginPath();
    ctx.rect(-40, -40, this.viewW + 80, V.H + 80);
    ctx.clip();

    const camX = game.camX;
    // backdrops (with crossfade)
    if (this.fade < 1) this.drawBackdrop(ctx, camX, time, this.prevBiome, 1);
    this.drawBackdrop(ctx, camX, time, this.biome, this.fade < 1 ? this.fade : 1);
    this.drawSky(ctx, time);
    // sky is drawn over far layers? draw sun before layers: re-draw far/mid on top
    if (this.fade < 1) {
      this.drawLayersOnly(ctx, camX, this.prevBiome, 1);
    }
    this.drawLayersOnly(ctx, camX, this.biome, this.fade < 1 ? this.fade : 1);

    // ground
    if (this.fade < 1) this.drawGround(ctx, camX, world.gaps.active, this.prevBiome, 1);
    this.drawGround(ctx, camX, world.gaps.active, this.biome, this.fade < 1 ? this.fade : 1);

    const G = V.groundY;
    // entities
    for (const h of world.hazards.active) this.drawHazard(ctx, h, camX, time, game);
    for (const c of world.crates.active) this.drawCrateEnt(ctx, c, camX, time);
    for (const it of world.items.active) this.drawItem(ctx, it, camX, time);

    // hero
    ctx.save();
    ctx.translate(game.heroX(), G);
    ctx.scale(game.heroScale(), game.heroScale());
    player.draw(ctx, 0, 0);
    ctx.restore();
    this.drawPowerFx(ctx, game, time);
    particles.draw(ctx, camX, G);

    // front foliage
    const L = this.getLayers(this.biome);
    this.strip(ctx, L.front, camX * 1.25, V.H - 150, this.fade < 1 ? this.fade : 1);

    // boulder warnings (offscreen right)
    for (const b of world.hazards.active) {
      if (b.kind === 'boulder' && b.state === 'idle' && b.warn) this.drawWarn(ctx, time, b);
    }
    // speed lines
    if (game.speedPx > 700 && game.state === 'playing') {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 3;
      const n = 6;
      for (let i = 0; i < n; i++) {
        const y = 80 + ((i * 97 + time * 400) % 420);
        const x = ((i * 377 - time * 2400) % (this.viewW + 200) + this.viewW + 200) % (this.viewW + 200) - 100;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 90, y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  drawLayersOnly(ctx, camX, name, alpha) {
    const L = this.getLayers(name);
    const G = V.groundY;
    this.strip(ctx, L.far, camX * 0.1, G - 580 + 20, alpha);
    this.strip(ctx, L.mid, camX * 0.28, G - 680 + 24, alpha);
    this.strip(ctx, L.near, camX * 0.55, G - 330 + 14, alpha);
  }

  drawWarn(ctx, time, b) {
    const x = this.viewW - 60;
    const y = V.groundY - 70;
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
    // arrows
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

  drawHazard(ctx, h, camX, time, game) {
    const sx = h.x - camX;
    if (sx < -300 || sx > this.viewW + 300) return;
    ctx.save();
    ctx.translate(sx, V.groundY - h.y0);
    if (h.kind === 'log') S.drawLog(ctx, h.w, h.h);
    else if (h.kind === 'rock') S.drawRock(ctx, h.w, h.h);
    else if (h.kind === 'barricade') S.drawBarricade(ctx, h.w, h.h, time);
    else if (h.kind === 'branch') {
      ctx.translate(0, h.y0);
      S.drawBranch(ctx, h.w, h.y0, time);
    } else if (h.kind === 'boulder') {
      S.drawBoulder(ctx, h.w / 2, -h.rolled / (h.w / 2), time);
    }
    ctx.restore();
    // warning chevrons on the ground ahead of low branches and barricades
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
        ctx.moveTo(cx, V.groundY - 26);
        ctx.lineTo(cx + 22, V.groundY - 12);
        ctx.lineTo(cx, V.groundY + 2);
        ctx.lineTo(cx - 8, V.groundY - 12);
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
    ctx.translate(sx, V.groundY - c.y0);
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
    ctx.save();
    ctx.translate(sx, V.groundY - it.y - bob);
    if (it.kind === 'fruit') {
      ctx.rotate(Math.sin(time * 2.5 + it.phase) * 0.18);
      S.drawFruit(ctx, time);
    } else if (it.kind === 'relic') S.drawRelic(ctx, time);
    else if (it.kind === 'green' || it.kind === 'purple' || it.kind === 'blue') S.drawGem(ctx, it.kind, time + it.phase);
    else S.drawPowerup(ctx, it.kind, time + it.phase);
    ctx.restore();
  }

  drawPowerFx(ctx, game, time) {
    const t = game.powerups.timers;
    const p = game.player;
    const x = game.heroX();
    const y = V.groundY - p.y - (p.sliding ? 28 : 62);
    const warn = (v) => v < 2 && Math.sin(time * 20) > 0;
    if (t.shield > 0 && !warn(t.shield)) {
      ctx.save();
      ctx.translate(x, y);
      const r = 96 + Math.sin(time * 5) * 3;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, 7);
      ctx.fillStyle = 'rgba(90,200,255,0.22)';
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(40,140,230,0.9)';
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(-r * 0.4, -r * 0.45, r * 0.18, r * 0.3, 0.6, 0, 7);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fill();
      ctx.restore();
    }
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
