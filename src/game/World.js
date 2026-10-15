import { CONFIG } from '../config/settings.js';
import { Pool } from './Pool.js';

// Pooled world entities (hazards, crates, collectibles, ravine gaps) and the
// pattern-based layout generator. SAFETY RULES:
//  * every hazard is individually avoidable (jump, slide, or hop on top)
//  * a recovery space of at least one full jump (plus reaction time) follows every hazard
//  * ravine gaps are always narrower than a jump at the speed they were generated for
//  * boulder zones contain nothing else except fruit

const V = CONFIG.view;
const rnd = (a, b) => a + Math.random() * (b - a);
const chance = (p) => Math.random() < p;
const pick = (a) => a[(Math.random() * a.length) | 0];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function weighted(table) {
  let sum = 0;
  for (const k in table) sum += table[k];
  let r = Math.random() * sum;
  for (const k in table) {
    r -= table[k];
    if (r <= 0) return k;
  }
  return Object.keys(table)[0];
}

export const HAZ = {
  log: { w: 136, h: 62, y0: 0, platform: true },
  rock: { w: 112, h: 140, y0: 0, platform: false },
  barricade: { w: 106, h: 104, y0: 0, platform: false },
  branch: { w: 160, h: 520, y0: 104, platform: false },
  boulder: { w: 116, h: 116, y0: 0, platform: false },
};

export class World {
  constructor() {
    this.hazards = new Pool(() => ({}));
    this.crates = new Pool(() => ({}));
    this.items = new Pool(() => ({}));
    this.gaps = new Pool(() => ({}));
    this.viewW = 1280;
    this.reset();
  }

  reset() {
    this.hazards.clear();
    this.crates.clear();
    this.items.clear();
    this.gaps.clear();
    this.nextX = 1100;
    this.lastKind = '';
    this.boulderCooldown = 0;
    this.time = 0;
  }

  // --------------------------------------------------------------- spawners
  hazard(kind, x) {
    const s = HAZ[kind];
    const h = this.hazards.acquire();
    h.kind = kind; h.x = x; h.w = s.w; h.h = s.h; h.y0 = s.y0; h.platform = s.platform;
    h.passed = false; h.state = 'idle'; h.rolled = 0; h.warn = 0;
    return h;
  }

  crate(kind, x, y0 = 0) {
    const c = this.crates.acquire();
    c.kind = kind; c.x = x; c.y0 = y0; c.w = c.h = CONFIG.crates.size;
    c.platform = kind === 'metal'; c.armed = false; c.fuse = CONFIG.crates.tntFuse; c.flash = 0;
    c.squash = 0; c.passed = false; c.tick = 0;
    return c;
  }

  item(kind, x, y) {
    const it = this.items.acquire();
    it.kind = kind; it.x = x; it.y = y; it.state = 'idle'; it.t = 0; it.vx = it.vy = 0;
    it.phase = Math.random() * 6;
    return it;
  }

  gap(x0, x1) {
    const g = this.gaps.acquire();
    g.x0 = x0; g.x1 = x1;
    return g;
  }

  fruit(x, y) { return this.item('fruit', x, y); }

  pop(x, y, count) {
    for (let i = 0; i < count; i++) {
      const f = this.fruit(x, y);
      f.state = 'pop';
      f.vx = rnd(-160, 340);
      f.vy = rnd(560, 880);
    }
  }

  popItem(kind, x, y) {
    const it = this.item(kind, x, y);
    it.state = 'pop';
    it.vx = 80;
    it.vy = 800;
    return it;
  }

  gapAt(x, margin = 0) {
    for (const g of this.gaps.active) if (x > g.x0 + margin && x < g.x1 - margin) return g;
    return null;
  }

  // --------------------------------------------------------------- layout
  ensure(camX, speedMps, distance) {
    const diff = clamp(distance / CONFIG.speed.distanceToMax, 0, 1);
    const level = distance / CONFIG.speed.levelEvery + 1;
    const spx = speedMps * V.pxPerM;
    while (this.nextX < camX + this.viewW + 1500) {
      const air = spx * 0.72;
      const rest = air * 1.05 + 240 - diff * 60;
      const start = this.nextX;
      const hazardsOn = distance >= 40;
      let w = 0;
      let hazardous = false;
      const table = {
        fruitLine: 3, fruitArc: 2.2, crateRun: 2.4,
        bounce: distance > 120 ? 1.2 : 0,
        single: hazardsOn ? 4 + 4 * diff : 0,
        double: hazardsOn ? 1 + 3.5 * diff : 0,
        gap: hazardsOn ? 1.5 + 2.5 * diff : 0,
        branch: hazardsOn ? 1.6 + 1.5 * diff : 0,
        boulder: hazardsOn && level >= CONFIG.difficulty.boulderFromLevel && this.boulderCooldown <= 0 ? 1.2 + 1.5 * diff : 0,
      };
      if (this.lastKind === 'hazard') {
        // after a hazard we still need breathing room: only calm patterns
        table.single = table.double = table.gap = table.branch = table.boulder = 0;
        table.bounce = 0;
      }
      const kind = weighted(table);
      this.boulderCooldown -= 1;
      switch (kind) {
        case 'fruitLine': w = this.pFruitLine(start, diff); break;
        case 'fruitArc': w = this.pFruitArc(start, spx); break;
        case 'crateRun': w = this.pCrateRun(start); break;
        case 'bounce': w = this.pBounce(start, spx); hazardous = true; break;
        case 'single': w = this.pSingle(start, spx, diff); hazardous = true; break;
        case 'double': w = this.pDouble(start, spx, diff); hazardous = true; break;
        case 'gap': w = this.pGap(start, spx, diff, distance); hazardous = true; break;
        case 'branch': w = this.pBranch(start, spx, diff, distance); hazardous = true; break;
        case 'boulder': w = this.pBoulder(start, spx); hazardous = true; this.boulderCooldown = 4; break;
      }
      this.lastKind = hazardous ? 'hazard' : 'calm';
      this.nextX = start + w + (hazardous ? rest : rnd(120, 260));
      // power-up now and then, in the calm gap
      if (distance > 80 && chance(0.1)) {
        this.item(pick(['magnet', 'shield', 'multiplier']), this.nextX - rest * 0.5 + 40, 120);
      }
    }
  }

  pFruitLine(x, diff) {
    const n = 5 + ((Math.random() * 5) | 0);
    const wave = chance(0.5);
    for (let i = 0; i < n; i++) this.fruit(x + i * 68, 64 + (wave ? Math.sin(i * 0.8) * 34 : 0));
    return n * 68;
  }

  arcAt(x0, span, base, peak, n = 7) {
    for (let k = 0; k < n; k++) {
      const t = k / (n - 1);
      this.fruit(x0 + t * span, base + Math.sin(t * Math.PI) * (peak - base));
    }
  }

  pFruitArc(x, spx) {
    const span = clamp(spx * 0.62, 380, 620);
    this.arcAt(x, span, 70, 270);
    if (chance(0.25)) this.item(pick(['green', 'green', 'purple']), x + span / 2, 300);
    return span;
  }

  pCrateRun(x) {
    const n = 2 + ((Math.random() * 3) | 0);
    const k = weighted({ fruit: 5, mystery: 2 });
    for (let i = 0; i < n; i++) this.crate(i === 1 && chance(0.4) ? 'mystery' : k, x + 60 + i * 96);
    if (chance(0.5)) this.arcAt(x + 40, n * 96 + 40, 150, 230, 5);
    return n * 96 + 140;
  }

  pBounce(x, spx) {
    this.crate('bouncy', x + 60);
    const v = CONFIG.crates.bounceVelocity, g = CONFIG.player.gravity;
    for (let k = 1; k <= 6; k++) {
      const t = k * 0.14;
      const y = CONFIG.crates.size + v * t - 0.5 * g * t * t;
      if (y > 150) this.fruit(x + 60 + spx * t, y + 20);
    }
    if (chance(0.35)) this.item('blue', x + 60 + spx * 0.5, CONFIG.crates.size + v * 0.5 - 0.5 * g * 0.25 + 30);
    return spx * 0.9;
  }

  hazardKind(diff) {
    return weighted({ log: 4, rock: 2.5, barricade: 2.5, metal: 1.4 + diff, tnt: diff > 0.06 ? 2 : 0 });
  }

  place(kind, x) {
    if (kind === 'metal') return this.crate('metal', x);
    if (kind === 'tnt') return this.crate('tnt', x);
    return this.hazard(kind, x);
  }

  pSingle(x, spx, diff) {
    const kind = this.hazardKind(diff);
    const hx = x + 360;
    this.place(kind, hx);
    // fruit trail leading in, and a jump arc over
    for (let i = 0; i < 4; i++) this.fruit(x + i * 70, 64);
    if (kind === 'metal') {
      // fruit on top rewards hopping up
      this.fruit(hx - 20, CONFIG.crates.size + 50);
      this.fruit(hx + 30, CONFIG.crates.size + 50);
    } else if (kind !== 'tnt') {
      this.arcAt(hx - 150, 300, 120, kind === 'rock' ? 300 : 250, 5);
    }
    const out = 520;
    if (chance(0.3 + 0.2 * diff)) {
      const r = chance(0.14 + 0.1 * diff) ? 'relic' : weighted({ green: 55, purple: 30 + 10 * diff, blue: 10 + 15 * diff });
      this.item(r, hx, kind === 'rock' ? 330 : 290);
    }
    return out;
  }

  pDouble(x, spx, diff) {
    const air = spx * 0.72;
    const k1 = this.hazardKind(diff * 0.5), k2 = this.hazardKind(diff * 0.5);
    const hx1 = x + 340;
    const hx2 = hx1 + air + 240; // jump, land, jump again
    this.place(k1, hx1);
    this.place(k2, hx2);
    for (let i = 0; i < 3; i++) this.fruit(x + i * 70, 64);
    if (k1 !== 'tnt' && k1 !== 'metal') this.arcAt(hx1 - 140, 280, 120, 250, 5);
    if (k2 !== 'tnt' && k2 !== 'metal') this.arcAt(hx2 - 140, 280, 120, 250, 5);
    return hx2 - x + 160;
  }

  pGap(x, spx, diff, distance) {
    const sp = clamp((spx / V.pxPerM - 15) / 19, 0, 1);
    const width = 190 + sp * 130;
    const g0 = x + 420;
    this.gap(g0, g0 + width);
    for (let i = 0; i < 3; i++) this.fruit(x + i * 70, 64);
    this.arcAt(g0 - 90, width + 180, 80, 270, 7);
    if (distance > 100 && chance(0.4 + 0.3 * diff)) {
      const relic = chance(0.14 + 0.1 * diff);
      this.item(relic ? 'relic' : weighted({ green: 40, purple: 40, blue: 20 }), g0 + width / 2, 310);
    }
    return 420 + width + 200;
  }

  pBranch(x, spx, diff, distance) {
    const bx = x + 420;
    this.hazard('branch', bx);
    for (let i = 0; i < 6; i++) this.fruit(bx - 170 + i * 66, 44);
    if (distance > 100 && chance(0.35 + 0.25 * diff)) {
      this.item(weighted({ green: 55, purple: 30, blue: 15 }), bx, 40);
    }
    return 640;
  }

  pBoulder(x, spx) {
    // a long calm zone: the boulder starts at the far end and rolls toward the hero
    const len = 1900;
    const b = this.hazard('boulder', x + len);
    b.state = 'idle';
    for (let i = 0; i < 12; i++) this.fruit(x + 120 + i * 130, 64 + (i % 3 === 1 ? 46 : 0));
    return len + 200;
  }

  // ----------------------------------------------------------------- update
  update(dt, ctx) {
    const { camX, speedPx, player, playerX, time, cb } = ctx;
    this.time = time;
    // boulders
    for (const b of this.hazards.active) {
      if (b.kind !== 'boulder') continue;
      const dist = b.x - camX;
      if (b.state === 'idle') {
        b.warn = dist < this.viewW + CONFIG.boulder.warnDistance ? 1 : 0;
        if (dist < this.viewW + CONFIG.boulder.triggerDistance) b.state = 'rolling';
      } else {
        b.x -= CONFIG.boulder.speed * dt;
        b.rolled += (CONFIG.boulder.speed + speedPx) * dt;
        b.warn = 0;
      }
    }
    // TNT + bouncy crates
    for (const c of this.crates.active) {
      if (c.kind === 'tnt') {
        if (!c.armed) {
          const dx = c.x - playerX;
          if (dx > 0 && dx < speedPx * CONFIG.crates.tntFuse + 40) {
            c.armed = true;
            c.fuse = CONFIG.crates.tntFuse;
          }
        } else {
          c.fuse -= dt;
          c.flash = Math.sin(time * (14 + (1 - c.fuse / CONFIG.crates.tntFuse) * 30)) > 0 ? 1 : 0;
          c.tick -= dt;
          if (c.tick <= 0) {
            c.tick = 0.16;
            cb.tick(c);
          }
          if (c.fuse <= 0) cb.explode(c);
        }
      } else if (c.kind === 'bouncy' && c.squash > 0) {
        c.squash -= dt;
        if (c.squash <= 0) this.crates.release(c);
      }
    }
    // items
    const pcx = playerX, pcy = player.y + player.h / 2;
    for (let i = this.items.active.length - 1; i >= 0; i--) {
      const it = this.items.active[i];
      it.t += dt;
      if (it.state === 'idle') {
        if (ctx.magnet > 0 && it.kind === 'fruit') {
          const dx = it.x - pcx, dy = it.y - pcy;
          if (dx * dx + dy * dy < ctx.magnet * ctx.magnet) it.state = 'home';
        }
      }
      if (it.state === 'pop') {
        it.vy -= 2200 * dt;
        it.x += it.vx * dt;
        it.y += it.vy * dt;
        if (it.y < 40) { it.y = 40; it.vy = Math.abs(it.vy) * 0.3; }
        if (it.t > 0.38) { it.state = 'home'; it.t = 0; }
      } else if (it.state === 'home') {
        const dx = pcx - it.x, dy = pcy - it.y;
        const d = Math.hypot(dx, dy) || 1;
        const sp = Math.min(2600, 900 + it.t * 2400) + speedPx;
        const step = Math.min(d, sp * dt);
        it.x += (dx / d) * step;
        it.y += (dy / d) * step;
      }
    }
    // cull things far behind
    const behind = camX - 260;
    for (const pool of [this.hazards, this.crates, this.items]) {
      for (let i = pool.active.length - 1; i >= 0; i--) {
        const e = pool.active[i];
        if (e.x + 120 < behind) pool.release(e);
      }
    }
    for (let i = this.gaps.active.length - 1; i >= 0; i--) if (this.gaps.active[i].x1 < behind) this.gaps.release(this.gaps.active[i]);
  }
}
