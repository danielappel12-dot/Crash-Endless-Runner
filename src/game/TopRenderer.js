import { CONFIG } from '../config/settings.js';
import * as S from './Sprites.js';
import * as P from './Paint.js';

// Top-down "slab" renderer for the hop-map. Rows are drawn far -> near; objects in a
// row are drawn right after that row's ground so nearer rows overlap them correctly.
// Two pipelines: painted (smooth, default) and pixel (low-res + dithering).

const V = CONFIG.view;
const T = V.tile;
const G = CONFIG.grid;
const FACE = 14; // height of a slab's front face
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const LEVELS = 26;

const PAL = {
  lagoon: { a: '#dcc592', b: '#cbb07a', road: '#58606e', face: '#8a6a3a', water: ['#5eb4f2', '#2f7fdc'], rock: '#5a5260' },
  jungle: { a: '#7fe05e', b: '#6ccf50', road: '#5b5666', face: '#3f8f36', water: ['#4aa6ee', '#2b78d2'], rock: '#58505e' },
  ruins: { a: '#cfc29a', b: '#bfb086', road: '#6a6360', face: '#8f8260', water: ['#3fc0c8', '#2a8ec0'], rock: '#645c58' },
  rocky: { a: '#b49a74', b: '#a68c66', road: '#4f4a52', face: '#7a6240', water: ['#58b0f0', '#2f78cc'], rock: '#4a4650' },
};

function hash(a, b) {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export class TopRenderer {
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
    this.pats = {};
    this.cam = 0;
    this.shakeX = 0;
    this.shakeY = 0;
  }

  setStyle(style) {
    this.style = style;
    P.setPaintStyle(style === 'painted');
    this.pats = {};
    this.resize();
  }

  setQuality(low) {
    this.PIX = low ? 0.26 : V.pixel;
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
  }

  snap(v) {
    return this.style === 'pixel' ? Math.round(v * this.PIX) / this.PIX : v;
  }

  // ---- coordinate helpers (stage space, virtual px)
  bottom(r) {
    return V.baseY - (r - this.cam) * T;
  }
  sx(x) {
    return this.viewW / 2 + x;
  }
  sy(wz) {
    return this.bottom(wz / T) - T / 2;
  }

  // client px -> tile
  screenToTile(cx, cy) {
    const x = (cx - this.ox) / this.scale;
    const y = (cy - this.oy) / this.scale;
    const col = Math.round((x - this.viewW / 2) / T);
    const row = Math.floor(this.cam + (V.baseY - y) / T);
    return { col, row };
  }

  // ---- ground patterns
  pattern(zone, kind, parity) {
    const key = zone + kind + parity;
    if (this.pats[key]) return this.pats[key];
    const W = 320;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = T;
    const x = c.getContext('2d');
    const pal = PAL[zone];
    const R = P.rng(zone.length * 131 + kind.length * 17 + parity * 7 + 3);
    const painted = this.style === 'painted';
    if (kind === 'ground') {
      if (zone === 'lagoon') {
        const tones = [['#e2cb98', '#cdb27c'], ['#d6bd88', '#c1a46e']];
        for (let r = 0; r < 2; r++) {
          let px = -(r * 70 + parity * 40);
          while (px < W) {
            const len = 110 + R() * 90;
            const t = tones[(r + parity) % 2];
            const g = x.createLinearGradient(0, r * 40, 0, r * 40 + 40);
            g.addColorStop(0, t[0]);
            g.addColorStop(1, t[1]);
            x.fillStyle = g;
            x.fillRect(px, r * 40, len, 40);
            x.strokeStyle = 'rgba(80,50,20,0.5)';
            x.lineWidth = 2.5;
            x.strokeRect(px, r * 40, len, 40);
            x.fillStyle = 'rgba(70,40,14,0.7)';
            x.beginPath(); x.arc(px + 8, r * 40 + 20, 2.2, 0, 7); x.arc(px + len - 8, r * 40 + 20, 2.2, 0, 7); x.fill();
            px += len;
          }
        }
      } else if (zone === 'ruins') {
        x.fillStyle = parity ? pal.a : pal.b;
        x.fillRect(0, 0, W, T);
        x.strokeStyle = 'rgba(70,55,30,0.55)';
        x.lineWidth = 3;
        for (let px = 0; px <= W; px += 80) { x.beginPath(); x.moveTo(px, 0); x.lineTo(px, T); x.stroke(); }
        x.fillStyle = '#2fd8c8';
        for (let px = 14; px < W; px += 160) x.fillRect(px, T / 2 - 3, 52, 6);
        x.fillStyle = 'rgba(70,170,70,0.5)';
        for (let i = 0; i < 4; i++) { x.beginPath(); x.ellipse(R() * W, R() * T, 14 + R() * 10, 7, 0, 0, 7); x.fill(); }
      } else if (zone === 'rocky') {
        x.fillStyle = parity ? pal.a : pal.b;
        x.fillRect(0, 0, W, T);
        for (let i = 0; i < 38; i++) {
          x.fillStyle = R() < 0.5 ? 'rgba(80,60,40,0.45)' : 'rgba(255,235,200,0.3)';
          x.beginPath(); x.ellipse(R() * W, R() * T, 3 + R() * 6, 2 + R() * 4, R() * 3, 0, 7); x.fill();
        }
      } else {
        const g = x.createLinearGradient(0, 0, 0, T);
        g.addColorStop(0, parity ? '#86e465' : '#78d958');
        g.addColorStop(1, parity ? '#6dd052' : '#60c448');
        x.fillStyle = g;
        x.fillRect(0, 0, W, T);
        x.lineCap = 'round';
        for (let i = 0; i < 70; i++) {
          const bx = R() * W, by = R() * T;
          x.strokeStyle = R() < 0.5 ? 'rgba(30,110,30,0.35)' : 'rgba(210,255,170,0.4)';
          x.lineWidth = 2;
          x.beginPath(); x.moveTo(bx, by); x.lineTo(bx + (R() - 0.5) * 6, by - 6 - R() * 5); x.stroke();
        }
        for (let i = 0; i < 3; i++) {
          const fx = R() * W, fy = 10 + R() * (T - 30);
          x.fillStyle = ['#ffd23a', '#ff8ab4', '#fff'][i % 3];
          x.beginPath(); x.arc(fx, fy, 3.5, 0, 7); x.fill();
        }
      }
    } else if (kind === 'road') {
      x.fillStyle = pal.road;
      x.fillRect(0, 0, W, T);
      for (let i = 0; i < 60; i++) {
        x.fillStyle = R() < 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.14)';
        x.beginPath(); x.ellipse(R() * W, R() * T, 2 + R() * 5, 1.5 + R() * 3, 0, 0, 7); x.fill();
      }
      if (zone === 'lagoon') {
        x.strokeStyle = 'rgba(255,255,255,0.1)';
        x.lineWidth = 2;
        for (let px = 0; px < W; px += 80) { x.beginPath(); x.moveTo(px, 0); x.lineTo(px, T); x.stroke(); }
      }
    } else if (kind === 'river') {
      const g = x.createLinearGradient(0, 0, 0, T);
      g.addColorStop(0, pal.water[0]);
      g.addColorStop(1, pal.water[1]);
      x.fillStyle = g;
      x.fillRect(0, 0, W, T);
      x.strokeStyle = 'rgba(255,255,255,0.22)';
      x.lineWidth = 2.5;
      for (let i = 0; i < 7; i++) {
        const wx = R() * W, wy = 8 + R() * (T - 16);
        x.beginPath(); x.moveTo(wx, wy); x.quadraticCurveTo(wx + 14, wy - 5, wx + 28, wy); x.stroke();
      }
    } else if (kind === 'rail') {
      x.fillStyle = parity ? '#9a8f7a' : '#8e8470';
      x.fillRect(0, 0, W, T);
      for (let i = 0; i < 50; i++) {
        x.fillStyle = R() < 0.5 ? 'rgba(60,45,30,0.4)' : 'rgba(255,240,210,0.3)';
        x.beginPath(); x.ellipse(R() * W, R() * T, 2 + R() * 3, 1.5 + R() * 2, 0, 0, 7); x.fill();
      }
      for (let px = 10; px < W; px += 44) {
        x.fillStyle = '#7a5530';
        x.fillRect(px, 6, 22, T - 12);
        x.strokeStyle = 'rgba(40,22,8,0.7)';
        x.lineWidth = 2;
        x.strokeRect(px, 6, 22, T - 12);
      }
    }
    if (painted && kind !== 'river') {
      // soft light from above
      const g = x.createLinearGradient(0, 0, 0, T);
      g.addColorStop(0, 'rgba(255,255,255,0.1)');
      g.addColorStop(1, 'rgba(10,20,60,0.12)');
      x.fillStyle = g;
      x.fillRect(0, 0, W, T);
    }
    const pat = this.ctx.createPattern(c, 'repeat');
    this.pats[key] = pat;
    return pat;
  }

  // ---- main render
  render(game, dt) {
    const pixel = this.style === 'pixel';
    const L = this.lctx;
    const PIX = this.PIX;
    this.cam = game.camRow;
    let ctx;
    if (pixel) {
      L.setTransform(1, 0, 0, 1, 0, 0);
      L.imageSmoothingEnabled = false;
      L.fillStyle = '#5ac84a';
      L.fillRect(0, 0, this.low.width, this.low.height);
      L.setTransform(PIX, 0, 0, PIX, Math.round(this.shakeX * PIX), Math.round(this.shakeY * PIX));
      ctx = L;
    } else {
      ctx = this.ctx;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.fillStyle = '#5ac84a';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      const k = this.dpr * this.scale;
      ctx.setTransform(k, 0, 0, k, this.ox * this.dpr + this.shakeX * k, this.oy * this.dpr + this.shakeY * k);
      ctx.save();
      ctx.beginPath();
      ctx.rect(-80, -80, this.viewW + 160, V.H + 160);
      ctx.clip();
    }
    const grid = game.grid;
    const time = game.time;
    const hero = game.hero;
    const heroDraw = Math.round(hero.rowF);
    const rMin = Math.floor(this.cam) - 2;
    const rMax = Math.ceil(this.cam + V.H / T) + 3;
    for (let r = rMax; r >= rMin; r--) {
      const row = grid.row(r);
      this.drawRow(ctx, row, r, grid, time, game);
      if (r === heroDraw) this.drawHero(ctx, game, time);
    }
    game.particles.draw(ctx, 0, this);
    // distance haze at the top of the screen
    if (!pixel) {
      const g = ctx.createLinearGradient(0, 0, 0, 220);
      g.addColorStop(0, 'rgba(205,230,255,0.6)');
      g.addColorStop(1, 'rgba(205,230,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.viewW, 220);
      ctx.restore();
      return;
    }
    L.setTransform(1, 0, 0, 1, 0, 0);
    this.post(L, this.low.width, this.low.height);
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#0e2a14';
    c.fillRect(0, 0, this.canvas.width, this.canvas.height);
    c.imageSmoothingEnabled = false;
    c.drawImage(this.low, 0, 0, this.low.width, this.low.height,
      Math.round(this.ox * this.dpr), Math.round(this.oy * this.dpr),
      Math.round(this.viewW * this.scale * this.dpr), Math.round(V.H * this.scale * this.dpr));
  }

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

  // ---- rows
  drawRow(ctx, row, r, grid, time, game) {
    const bottom = this.bottom(r);
    const top = bottom - T;
    if (top > V.H + 10 || bottom < -240) return;
    const zone = row.zone;
    const pal = PAL[zone];
    const W = this.viewW;
    const half = G.half;
    const parity = r & 1;
    const kind = row.type === 'grass' ? 'ground' : row.type;

    // ground slab
    ctx.save();
    ctx.translate(0, top);
    ctx.fillStyle = this.pattern(zone, kind, parity);
    if (row.type === 'river') {
      ctx.fillRect(0, 0, W, T);
      // animated glints + bank shading
      for (let k = 0; k < 8; k++) {
        const x = ((((k * 210 + row.dir * row.speed * T * 1.2 * time + r * 53) % (W + 260)) + W + 260) % (W + 260)) - 130;
        ctx.fillStyle = 'rgba(255,255,255,0.32)';
        ctx.fillRect(this.snap(x), this.snap(10 + (k % 4) * 17), 46 + (k % 3) * 18, 3);
      }
      ctx.fillStyle = 'rgba(10,40,90,0.28)';
      ctx.fillRect(0, 0, W, 5);
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(0, T - 4, W, 3);
    } else {
      ctx.fillRect(0, 0, W, T - FACE);
      // front face of the slab
      const fg = ctx.createLinearGradient(0, T - FACE, 0, T);
      fg.addColorStop(0, row.type === 'grass' ? pal.face : '#3a3640');
      fg.addColorStop(1, 'rgba(20,12,8,0.85)');
      ctx.fillStyle = fg;
      ctx.fillRect(0, T - FACE, W, FACE);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(0, T - FACE - 2, W, 2);
      if (row.type === 'grass') {
        // forest floor outside the playable columns
        ctx.fillStyle = 'rgba(8,50,20,0.2)';
        const edge = (half + 0.5) * T;
        ctx.fillRect(0, 0, W / 2 - edge, T - FACE);
        ctx.fillRect(W / 2 + edge, 0, W / 2 - edge, T - FACE);
      } else if (row.type === 'road') {
        const next = grid.row(r - 1);
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 3;
        if (next.type === 'road') {
          ctx.setLineDash([26, 22]);
          ctx.strokeStyle = '#ffd23a';
        }
        ctx.beginPath();
        ctx.moveTo(0, T - FACE - 3);
        ctx.lineTo(W, T - FACE - 3);
        ctx.stroke();
        ctx.setLineDash([]);
        if (grid.row(r + 1).type !== 'road') {
          ctx.strokeStyle = 'rgba(255,255,255,0.7)';
          ctx.beginPath();
          ctx.moveTo(0, 4);
          ctx.lineTo(W, 4);
          ctx.stroke();
        }
      } else if (row.type === 'rail') {
        for (const y of [24, 46]) {
          ctx.fillStyle = '#2a2a34';
          ctx.fillRect(0, y - 3, W, 7);
          ctx.fillStyle = '#c7ccd8';
          ctx.fillRect(0, y - 2, W, 3);
        }
      }
    }
    ctx.restore();

    const cx = W / 2;
    const gy = bottom - FACE; // standing line of this row

    // side scenery
    if (row.type === 'grass') {
      const maxC = Math.ceil(W / 2 / T) + 1;
      for (let c = half + 1; c <= maxC; c++) {
        for (const s of [-1, 1]) {
          const h = hash(r * 7 + s, c);
          if (h > 0.5) continue;
          this.drawDecor(ctx, zone, h, cx + s * c * T, gy, time);
        }
      }
    }

    if (row.type === 'rail') this.drawRailSignals(ctx, row, grid, cx, gy, time, game);

    // obstacles
    if (row.tiles.size) {
      for (const [c, t] of row.tiles) this.drawTile(ctx, t, zone, cx + c * T, gy, r, c, time);
    }
    // pickups
    if (row.items.size) {
      for (const [c, it] of row.items) if (!it.taken) this.drawItem(ctx, it, cx + c * T, gy, time, c + r);
    }
    // moving things
    if (row.type === 'road') this.drawVehicles(ctx, row, grid, cx, gy, time);
    else if (row.type === 'river') this.drawRiver(ctx, row, grid, cx, gy, time);
    else if (row.type === 'rail') {
      const tr = grid.train(row);
      if (tr.state === 'pass') {
        ctx.save();
        ctx.translate(this.snap(cx + tr.x * T), this.snap(gy - 4));
        ctx.fillStyle = 'rgba(20,10,5,0.3)';
        ctx.fillRect(-row.trainLen * T / 2, -4, row.trainLen * T, 10);
        S.drawTrain(ctx, row.trainLen * T, row.dir, time);
        ctx.restore();
      }
    }
  }

  drawDecor(ctx, zone, h, x, gy, time) {
    ctx.save();
    ctx.translate(this.snap(x), this.snap(gy + 6));
    const v = Math.floor(h * 100);
    const s = 0.85 + (h * 7 % 1) * 0.3;
    ctx.scale(s, s);
    if (zone === 'jungle') {
      if (v % 2) S.drawTreeRound(ctx, v);
      else S.drawPalmTree(ctx, v, time);
    } else if (zone === 'lagoon') {
      if (v % 3 === 0) {
        const q = P.rng(v + 5);
        P.purpleRock(ctx, 0, 0, 90 + (v % 5) * 24, 50 + (v % 3) * 12, q);
      } else S.drawPalmTree(ctx, v, time);
    } else if (zone === 'ruins') {
      if (v % 4 === 0) S.drawTreeRound(ctx, v);
      else S.drawStoneColumn(ctx, v);
    } else {
      S.drawCrystalRock(ctx, v);
    }
    ctx.restore();
  }

  drawTile(ctx, t, zone, x, gy, r, c, time) {
    ctx.save();
    ctx.translate(this.snap(x), this.snap(gy + 8));
    const v = (r * 5 + c * 3 + 100) | 0;
    ctx.fillStyle = 'rgba(30,15,5,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, -2, 30, 9, 0, 0, 7);
    ctx.fill();
    if (t.kind === 'tree') {
      if (zone === 'jungle') (v % 2 ? S.drawTreeRound(ctx, v) : S.drawPalmTree(ctx, v, time));
      else if (zone === 'lagoon') S.drawPalmTree(ctx, v, time);
      else if (zone === 'ruins') S.drawStoneColumn(ctx, v);
      else S.drawCrystalRock(ctx, v);
    } else if (t.kind === 'rock') S.drawRock(ctx, 64, 54);
    else if (t.kind === 'bush') S.drawBush(ctx, v);
    else if (t.kind.startsWith('crate:')) {
      const k = t.kind.slice(6);
      const bob = k === 'mystery' ? Math.sin(time * 3 + c) * 3 : 0;
      ctx.translate(0, -bob);
      ctx.scale(0.86, 0.86);
      S.drawCrate(ctx, k, 84, time, 0);
    }
    ctx.restore();
  }

  drawItem(ctx, it, x, gy, time, seed) {
    const bob = Math.sin(time * 3.2 + seed) * 5;
    ctx.save();
    ctx.translate(this.snap(x), this.snap(gy - 30 - bob));
    ctx.fillStyle = 'rgba(30,15,5,0.2)';
    ctx.save();
    ctx.translate(0, 30 + bob);
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 5, 0, 0, 7);
    ctx.fill();
    ctx.restore();
    const k = it.kind;
    if (k === 'fruit') {
      ctx.rotate(Math.sin(time * 2.5 + seed) * 0.18);
      ctx.scale(0.85, 0.85);
      S.drawFruit(ctx, time);
    } else if (k === 'green' || k === 'purple' || k === 'blue') {
      ctx.scale(0.62, 0.62);
      S.drawGem(ctx, k, time + seed);
    } else if (k === 'relic') {
      ctx.scale(0.55, 0.55);
      S.drawRelic(ctx, time);
    } else if (k === 'mask') {
      ctx.scale(0.5, 0.5);
      S.drawMask(ctx, time + seed, false);
    } else {
      ctx.scale(0.72, 0.72);
      S.drawPowerup(ctx, k, time + seed);
    }
    ctx.restore();
  }

  drawVehicles(ctx, row, grid, cx, gy, time) {
    for (const m of row.movers) {
      const x = grid.moverX(row, m);
      const sx = cx + x * T;
      if (sx < -200 || sx > this.viewW + 200) continue;
      ctx.save();
      ctx.translate(this.snap(sx), this.snap(gy + 4));
      ctx.fillStyle = 'rgba(15,8,4,0.32)';
      ctx.beginPath();
      ctx.ellipse(0, -2, m.w * T * 0.46, 9, 0, 0, 7);
      ctx.fill();
      const phase = x * T * 0.07 * row.dir;
      if (m.kind === 'cart') S.drawCart(ctx, m.w * T * 0.9, row.dir, time, 'cart', phase);
      else if (m.kind === 'wagon') S.drawCart(ctx, m.w * T * 0.92, row.dir, time, 'wagon', phase);
      else if (m.kind === 'boulder') S.drawBoulder(ctx, 36, x * T * 0.04 * row.dir, time);
      else S.drawScuttler(ctx, 84, 60, time * 1.4 + m.base, row.dir);
      ctx.restore();
    }
  }

  drawRiver(ctx, row, grid, cx, gy, time) {
    const top = gy + FACE - T;
    for (const m of row.movers) {
      const x = grid.moverX(row, m);
      const sx = cx + x * T;
      if (sx < -T * 3 || sx > this.viewW + T * 3) continue;
      ctx.save();
      ctx.translate(this.snap(sx), this.snap(top + T / 2 + 22));
      // wake / foam
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 6, m.w * T * 0.5 + 6, 10, 0, 0, 7);
      ctx.stroke();
      if (m.kind === 'log') {
        S.drawLog(ctx, m.w * T - 6, 56);
      } else {
        S.drawLily(ctx, 38, time, Math.floor(m.base * 3));
      }
      ctx.restore();
    }
  }

  drawRailSignals(ctx, row, grid, cx, gy, time, game) {
    const tr = grid.train(row);
    const on = tr.state === 'warn';
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.translate(this.snap(cx + s * (G.half + 0.95) * T), this.snap(gy + 6));
      S.drawSignal(ctx, on || tr.state === 'pass', time);
      ctx.restore();
    }
    if (on) {
      ctx.save();
      ctx.globalAlpha = 0.18 + Math.sin(time * 16) * 0.1;
      ctx.fillStyle = '#ff2a1a';
      ctx.fillRect(0, gy + FACE - T, this.viewW, T);
      ctx.restore();
    }
  }

  drawHero(ctx, game, time) {
    const hero = game.hero;
    const pl = hero.pl;
    const cx = this.viewW / 2;
    const rowBottom = this.bottom(hero.rowF);
    const gy = rowBottom - FACE;
    let sx = cx + hero.x * T;
    let sy = gy + 8;
    if (hero.nudge) {
      const k = Math.sin((hero.nudge.t / 0.16) * Math.PI);
      sx += hero.nudge.dx * 12 * k;
      sy -= hero.nudge.dr * 12 * k;
    }
    // shadow stays on the ground
    ctx.save();
    ctx.translate(this.snap(sx), this.snap(sy));
    const h = hero.hopHeight();
    const k = 1 / (1 + h / 120);
    ctx.fillStyle = 'rgba(25,12,5,0.32)';
    ctx.beginPath();
    ctx.ellipse(0, -2, 30 * k, 10 * k, 0, 0, 7);
    ctx.fill();
    ctx.restore();

    // invincibility aura
    const pu = game.powerups;
    if (pu.invincible && !(pu.timers.mask < 2 && Math.sin(time * 20) > 0)) {
      ctx.save();
      ctx.translate(this.snap(sx), this.snap(sy - h - 56));
      ctx.rotate(time * 1.5);
      ctx.fillStyle = 'rgba(255,214,60,0.38)';
      for (let i = 0; i < 10; i++) {
        ctx.rotate(Math.PI / 5);
        ctx.beginPath();
        ctx.moveTo(-6, -46);
        ctx.lineTo(0, -66 - Math.sin(time * 8 + i) * 5);
        ctx.lineTo(6, -46);
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.save();
    ctx.translate(this.snap(sx), this.snap(sy - h));
    const sc = 0.6;
    ctx.scale(sc * hero.facing, sc);
    pl.draw(ctx, 0, 0);
    ctx.restore();

    // floating spirit masks
    const n = pu.invincible ? 1 : Math.min(2, pu.masks);
    for (let i = 0; i < n; i++) {
      ctx.save();
      ctx.translate(this.snap(sx - 44 - i * 30), this.snap(sy - h - 92 + Math.sin(time * 3 + i * 1.8) * 6 + i * 14));
      const ms = pu.invincible ? 0.55 : 0.38;
      ctx.scale(ms, ms);
      S.drawMask(ctx, time + i, pu.invincible);
      ctx.restore();
    }
    if (pu.timers.magnet > 0) {
      ctx.save();
      ctx.translate(this.snap(sx), this.snap(sy - h - 40));
      ctx.strokeStyle = 'rgba(255,70,70,0.6)';
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 10]);
      ctx.lineDashOffset = -time * 50;
      ctx.beginPath();
      ctx.arc(0, 0, CONFIG.powerups.magnet.radius * T * 0.5, 0, 7);
      ctx.stroke();
      ctx.restore();
    }
  }
}
