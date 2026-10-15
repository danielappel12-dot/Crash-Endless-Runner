import { CONFIG } from '../config/settings.js';
import { Pool } from './Pool.js';

// Pooled world entities (hazards, crates, collectibles, ravine gaps) and the
// pattern-based layout generator. The track has three depth lanes (0 back, 1 middle,
// 2 front). SAFETY RULES:
//  * every row of hazards leaves at least one lane free, and the free lane of one
//    row is at most one lane away from the free lane of the previous row
//  * every hazard is also individually beatable by jumping (or sliding for branches)
//  * a recovery space of one full jump (plus reaction time) follows every hazard row
//  * ravine gaps (full width) are narrower than a jump at the speed they were made for
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
  branch: { w: 150, h: 520, y0: 104, platform: false },
  boulder: { w: 116, h: 116, y0: 0, platform: false },
};

export const ENEMY = {
  scuttler: { w: 88, h: 64, y0: 0, stomp: true, range: 90, speed: 110 },
  spiky: { w: 92, h: 96, y0: 0, stomp: false, range: 0, speed: 0 },
  bat: { w: 96, h: 62, y0: 95, stomp: true, range: 70, speed: 90 },
};

export class World {
  constructor() {
    this.enemies = new Pool(() => ({}));
    this.platforms = new Pool(() => ({}));
    this.hazards = new Pool(() => ({}));
    this.crates = new Pool(() => ({}));
    this.items = new Pool(() => ({}));
    this.gaps = new Pool(() => ({}));
    this.viewW = 1280;
    this.reset();
  }

  reset() {
    this.enemies.clear();
    this.platforms.clear();
    this.hazards.clear();
    this.crates.clear();
    this.items.clear();
    this.gaps.clear();
    this.nextX = 1100;
    this.lastKind = '';
    this.boulderCooldown = 0;
    this.safe = 1;
    this.time = 0;
  }

  // --------------------------------------------------------------- spawners
  hazard(kind, x, lane = 1) {
    const s = HAZ[kind];
    const h = this.hazards.acquire();
    h.kind = kind; h.x = x; h.lane = lane; h.w = s.w; h.h = s.h; h.y0 = s.y0; h.platform = s.platform;
    h.passed = false; h.state = 'idle'; h.rolled = 0; h.warn = 0;
    return h;
  }

  crate(kind, x, lane = 1, y0 = 0) {
    const c = this.crates.acquire();
    c.kind = kind; c.x = x; c.lane = lane; c.y0 = y0; c.w = c.h = CONFIG.crates.size;
    c.platform = kind === 'metal'; c.armed = false; c.fuse = CONFIG.crates.tntFuse; c.flash = 0;
    c.squash = 0; c.passed = false; c.tick = 0;
    return c;
  }

  item(kind, x, y, lane = 1) {
    const it = this.items.acquire();
    it.kind = kind; it.x = x; it.y = y; it.lane = lane; it.lf = lane; it.state = 'idle'; it.t = 0; it.vx = it.vy = 0;
    it.phase = Math.random() * 6;
    return it;
  }

  enemy(kind, x, lane = 1) {
    const E = ENEMY[kind];
    const e = this.enemies.acquire();
    e.kind = kind; e.x = e.ox = x; e.lane = lane; e.w = E.w; e.h = E.h; e.y0 = e.by = E.y0; e.stomp = E.stomp;
    e.range = E.range; e.speed = E.speed; e.t = Math.random() * 6; e.dir = -1; e.passed = false;
    return e;
  }

  // one-way floating platform: you can run under it and land on top of it
  platform(x, lane, top, w) {
    const pl = this.platforms.acquire();
    pl.x = x; pl.lane = lane; pl.w = w; pl.h = 26; pl.top = top; pl.y0 = top - 26;
    return pl;
  }

  gap(x0, x1) {
    const g = this.gaps.acquire();
    g.x0 = x0; g.x1 = x1;
    return g;
  }

  fruit(x, y, lane = 1) { return this.item('fruit', x, y, lane); }

  pop(x, y, count, lane = 1) {
    for (let i = 0; i < count; i++) {
      const f = this.fruit(x, y, lane);
      f.state = 'pop';
      f.vx = rnd(-160, 340);
      f.vy = rnd(560, 880);
    }
  }

  popItem(kind, x, y, lane = 1) {
    const it = this.item(kind, x, y, lane);
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
  nextSafe(diff) {
    const move = chance(0.35 + 0.3 * diff) ? (chance(0.5) ? -1 : 1) : 0;
    this.safe = clamp(this.safe + move, 0, 2);
    return this.safe;
  }

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
        fruitLine: 3, fruitArc: 2, crateRun: 2.4,
        bounce: distance > 120 ? 1.2 : 0,
        single: hazardsOn ? 4 + 4 * diff : 0,
        double: hazardsOn ? 1 + 3.5 * diff : 0,
        gap: hazardsOn ? 1.2 + 2 * diff : 0,
        stones: distance > 150 ? 0.9 + 1.8 * diff : 0,
        highRoad: distance > 60 ? 1.8 : 0,
        branch: hazardsOn ? 1.6 + 1.5 * diff : 0,
        boulder: hazardsOn && level >= CONFIG.difficulty.boulderFromLevel && this.boulderCooldown <= 0 ? 1.2 + 1.5 * diff : 0,
      };
      if (this.lastKind === 'hazard') {
        table.single = table.double = table.gap = table.branch = table.boulder = table.bounce = table.stones = 0;
      }
      const kind = weighted(table);
      this.boulderCooldown -= 1;
      switch (kind) {
        case 'fruitLine': w = this.pFruitLine(start, diff); break;
        case 'fruitArc': w = this.pFruitArc(start, spx, diff); break;
        case 'crateRun': w = this.pCrateRun(start, diff); break;
        case 'bounce': w = this.pBounce(start, spx, diff); hazardous = true; break;
        case 'single': w = this.pSingle(start, spx, diff); hazardous = true; break;
        case 'double': w = this.pDouble(start, spx, diff); hazardous = true; break;
        case 'gap': w = this.pGap(start, spx, diff, distance); hazardous = true; break;
        case 'stones': w = this.pStones(start, spx, diff, distance); hazardous = true; break;
        case 'highRoad': w = this.pHighRoad(start, spx, diff, distance); break;
        case 'branch': w = this.pBranch(start, spx, diff, distance); hazardous = true; break;
        case 'boulder': w = this.pBoulder(start, spx, diff); hazardous = true; this.boulderCooldown = 4; break;
      }
      this.lastKind = hazardous ? 'hazard' : 'calm';
      this.nextX = start + w + (hazardous ? rest : rnd(120, 260));
      if (distance > 80 && chance(0.1)) {
        this.item(pick(['magnet', 'mask', 'mask', 'multiplier']), this.nextX - rest * 0.5 + 40, 120, this.safe);
      }
    }
  }

  pFruitLine(x, diff) {
    const n = 5 + ((Math.random() * 5) | 0);
    const wave = chance(0.4);
    let lane = this.safe;
    const switchAt = chance(0.5) ? ((n / 2) | 0) : 99;
    for (let i = 0; i < n; i++) {
      if (i === switchAt) lane = this.nextSafe(diff);
      this.fruit(x + i * 68, 64 + (wave ? Math.sin(i * 0.8) * 34 : 0), lane);
    }
    return n * 68;
  }

  arcAt(x0, span, base, peak, n, lane) {
    for (let k = 0; k < n; k++) {
      const t = k / (n - 1);
      this.fruit(x0 + t * span, base + Math.sin(t * Math.PI) * (peak - base), lane);
    }
  }

  pFruitArc(x, spx, diff) {
    const span = clamp(spx * 0.62, 380, 620);
    const lane = this.nextSafe(diff);
    this.arcAt(x, span, 70, 270, 7, lane);
    if (chance(0.25)) this.item(pick(['green', 'green', 'purple']), x + span / 2, 300, lane);
    return span;
  }

  pCrateRun(x, diff) {
    const n = 2 + ((Math.random() * 3) | 0);
    const k = weighted({ fruit: 5, mystery: 2 });
    const lane = pick([0, 1, 2]);
    for (let i = 0; i < n; i++) this.crate(i === 1 && chance(0.4) ? 'mystery' : k, x + 60 + i * 96, lane);
    if (chance(0.5)) this.arcAt(x + 40, n * 96 + 40, 150, 230, 5, lane);
    // keep the free lane's fruit going alongside
    const o = this.nextSafe(diff);
    if (o !== lane) for (let i = 0; i < n + 1; i++) this.fruit(x + 40 + i * 80, 64, o);
    return n * 96 + 140;
  }

  pBounce(x, spx, diff) {
    const lane = this.nextSafe(diff);
    this.crate('bouncy', x + 60, lane);
    const v = CONFIG.crates.bounceVelocity, g = CONFIG.player.gravity;
    for (let k = 1; k <= 6; k++) {
      const t = k * 0.14;
      const y = CONFIG.crates.size + v * t - 0.5 * g * t * t;
      if (y > 150) this.fruit(x + 60 + spx * t, y + 20, lane);
    }
    if (chance(0.35)) this.item('blue', x + 60 + spx * 0.5, CONFIG.crates.size + v * 0.5 - 0.5 * g * 0.25 + 30, lane);
    return spx * 0.9;
  }

  hazardKind(diff) {
    return weighted({
      log: 3.5, rock: 2.2, barricade: 2.2, metal: 1.2 + diff, tnt: diff > 0.06 ? 1.8 : 0,
      scuttler: 3, spiky: diff > 0.1 ? 1.6 : 0, bat: diff > 0.06 ? 1.6 : 0,
    });
  }

  place(kind, x, lane) {
    if (ENEMY[kind]) return this.enemy(kind, x, lane);
    if (kind === 'metal') return this.crate('metal', x, lane);
    if (kind === 'tnt') return this.crate('tnt', x, lane);
    return this.hazard(kind, x, lane);
  }

  // one row of hazards: blocked lanes everywhere except the free lane `free`
  row(hx, free, diff, kinds) {
    const blocked = [0, 1, 2].filter((l) => l !== free);
    const lanes = kinds || (chance(0.25 + 0.45 * diff) ? blocked : [pick(blocked)]);
    for (const l of lanes) {
      const kind = this.hazardKind(diff);
      this.place(kind, hx, l);
      // jump-over fruit arc / trophies above beatable hazards
      if (kind === 'log' || kind === 'rock' || kind === 'barricade' || kind === 'scuttler' || kind === 'spiky') this.arcAt(hx - 150, 300, 120, kind === 'rock' ? 300 : 250, 5, l);
      else if (kind === 'metal') {
        this.fruit(hx - 20, CONFIG.crates.size + 50, l);
        this.fruit(hx + 30, CONFIG.crates.size + 50, l);
      }
    }
    return lanes;
  }

  pSingle(x, spx, diff) {
    const prev = this.safe;
    const free = this.nextSafe(diff);
    const hx = x + 380;
    for (let i = 0; i < 4; i++) this.fruit(x + i * 70, 64, prev);
    const lanes = this.row(hx, free, diff);
    for (let i = 0; i < 4; i++) this.fruit(hx - 120 + i * 80, 64, free);
    if (chance(0.3 + 0.2 * diff)) {
      const l = pick(lanes);
      const r = chance(0.14 + 0.1 * diff) ? 'relic' : weighted({ green: 55, purple: 30 + 10 * diff, blue: 10 + 15 * diff });
      this.item(r, hx, 300, l);
    }
    return 520;
  }

  pDouble(x, spx, diff) {
    const air = spx * 0.72;
    const hx1 = x + 360;
    const hx2 = hx1 + air + 260;
    const f1 = this.nextSafe(diff);
    this.row(hx1, f1, diff * 0.6);
    const f2 = this.nextSafe(diff);
    this.row(hx2, f2, diff * 0.6);
    for (let i = 0; i < 3; i++) this.fruit(x + i * 70, 64, f1);
    for (let i = 0; i < 4; i++) this.fruit(hx1 + 160 + i * ((hx2 - hx1 - 320) / 3), 64, i < 2 ? f1 : f2);
    return hx2 - x + 160;
  }

  pGap(x, spx, diff, distance) {
    const sp = clamp((spx / V.pxPerM - 15) / 19, 0, 1);
    const width = 190 + sp * 130;
    const g0 = x + 420;
    this.gap(g0, g0 + width);
    const lane = this.nextSafe(diff);
    for (let i = 0; i < 3; i++) this.fruit(x + i * 70, 64, lane);
    this.arcAt(g0 - 90, width + 180, 80, 270, 7, lane);
    if (distance > 100 && chance(0.4 + 0.3 * diff)) {
      const relic = chance(0.14 + 0.1 * diff);
      this.item(relic ? 'relic' : weighted({ green: 40, purple: 40, blue: 20 }), g0 + width / 2, 310, lane);
    }
    return 420 + width + 200;
  }

  // pit crossed by hopping across stepping-stone islands (full-width gaps between islands)
  pStones(x, spx, diff, distance) {
    const sp = clamp((spx / V.pxPerM - 15) / 19, 0, 1);
    const width = 170 + sp * 110;
    const island = Math.max(300, spx * 0.5);
    const n = diff > 0.35 && chance(0.5) ? 3 : 2;
    const g0 = x + 400;
    const lane = this.nextSafe(diff);
    for (let i = 0; i < 3; i++) this.fruit(x + i * 70, 64, lane);
    for (let k = 0; k < n; k++) {
      const a = g0 + k * (width + island);
      this.gap(a, a + width);
      this.arcAt(a - 70, width + 140, 80, 250, 5, lane);
      if (k < n - 1) for (let i = 0; i < 2; i++) this.fruit(a + width + island * (0.3 + i * 0.4), 64, lane);
    }
    if (distance > 100 && chance(0.4 + 0.3 * diff)) this.item(weighted({ green: 40, purple: 40, blue: 20 }), g0 + width + island / 2, 150, lane);
    return 400 + n * width + (n - 1) * island + 260;
  }

  // optional high road: stair-step floating platforms with fruit, gems and crates on top
  pHighRoad(x, spx, diff, distance) {
    const lane = pick([0, 1, 2]);
    const p1 = x + 420;
    this.platform(p1, lane, 92, 250);
    const p2 = p1 + 125 + 70 + 190;
    this.platform(p2, lane, 172, 380);
    for (let i = 0; i < 3; i++) this.fruit(p1 - 80 + i * 80, 92 + 56, lane);
    for (let i = 0; i < 4; i++) this.fruit(p2 - 130 + i * 86, 172 + 56, lane);
    if (chance(0.5)) this.crate(weighted({ fruit: 3, mystery: 2 }), p2 + 60, lane, 172);
    if (distance > 100 && chance(0.35 + 0.25 * diff)) this.item(weighted({ green: 45, purple: 35, blue: 20 }), p2, 172 + 130, lane);
    // keep the ground lanes interesting too
    const o = this.nextSafe(diff);
    for (let i = 0; i < 6; i++) this.fruit(x + 300 + i * 120, 64, o);
    return 420 + 125 + 70 + 380 + 190;
  }

  pBranch(x, spx, diff, distance) {
    const bx = x + 420;
    const free = this.nextSafe(diff);
    const blocked = [0, 1, 2].filter((l) => l !== free);
    const lanes = chance(0.3 + 0.4 * diff) ? blocked : [pick(blocked)];
    for (const l of lanes) {
      this.hazard('branch', bx, l);
      for (let i = 0; i < 4; i++) this.fruit(bx - 120 + i * 80, 44, l);
    }
    for (let i = 0; i < 4; i++) this.fruit(bx - 120 + i * 80, 64, free);
    if (distance > 100 && chance(0.35 + 0.25 * diff)) {
      this.item(weighted({ green: 55, purple: 30, blue: 15 }), bx, 40, pick(lanes));
    }
    return 620;
  }

  pBoulder(x, spx, diff) {
    // a long calm zone: boulders start at the far end and roll toward the hero
    const len = 1900;
    const free = this.nextSafe(0);
    const blocked = [0, 1, 2].filter((l) => l !== free);
    const lanes = diff > 0.4 && chance(0.5) ? blocked : [pick(blocked)];
    for (const l of lanes) this.hazard('boulder', x + len, l).state = 'idle';
    for (let i = 0; i < 12; i++) this.fruit(x + 120 + i * 130, 64 + (i % 3 === 1 ? 46 : 0), free);
    return len + 200;
  }

  // ----------------------------------------------------------------- update
  update(dt, ctx) {
    const { camX, speedPx, player, playerX, time, cb } = ctx;
    this.time = time;
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
    for (const e of this.enemies.active) {
      e.t += dt;
      if (e.kind === 'scuttler') {
        const ph = (e.t * e.speed) / e.range;
        e.x = e.ox + Math.sin(ph) * e.range;
        e.dir = Math.cos(ph) >= 0 ? 1 : -1;
      } else if (e.kind === 'bat') {
        const ph = (e.t * e.speed) / e.range;
        e.x = e.ox + Math.sin(ph) * e.range;
        e.y0 = e.by + Math.sin(e.t * 3.2) * 24;
        e.dir = Math.cos(ph) >= 0 ? 1 : -1;
      }
    }
    const pcx = playerX, pcy = player.y + player.h / 2;
    const gap = V.laneGap;
    for (let i = this.items.active.length - 1; i >= 0; i--) {
      const it = this.items.active[i];
      it.t += dt;
      if (it.state === 'idle') {
        if (ctx.magnet > 0 && it.kind === 'fruit') {
          const dx = it.x - pcx, dy = it.y - pcy + (it.lf - player.laneF) * -gap;
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
        it.lf += (player.laneF - it.lf) * Math.min(1, dt * 14);
      }
    }
    const behind = camX - 260;
    for (const pool of [this.hazards, this.crates, this.items, this.enemies, this.platforms]) {
      for (let i = pool.active.length - 1; i >= 0; i--) {
        const e = pool.active[i];
        if (e.x + 120 < behind) pool.release(e);
      }
    }
    for (let i = this.gaps.active.length - 1; i >= 0; i--) if (this.gaps.active[i].x1 < behind) this.gaps.release(this.gaps.active[i]);
  }
}
