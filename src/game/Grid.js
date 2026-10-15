import { CONFIG } from '../config/settings.js';

// The endless hop-map. Rows are generated lazily, one at a time, as the camera
// moves forward. Row types: grass (obstacles + pickups), road (vehicles), river
// (logs and lily pads you must ride), rail (a train with a warning signal).
// SAFETY: every grass row keeps a free corridor (the "safe column" drifts by at
// most one tile per row) and rivers never leave a gap wider than ~2 tiles.

const G = CONFIG.grid;
export const ZONES = ['lagoon', 'jungle', 'ruins', 'rocky'];
export const zoneAt = (r) => ZONES[Math.floor(Math.max(0, r) / G.zoneLength) % ZONES.length];

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

const MAX_RUN = { grass: 3, road: 3, river: 3, rail: 2 };

// vehicle catalogue (width in tiles)
export const VEHICLES = {
  cart: { w: 1.7 },
  wagon: { w: 2.9 },
  boulder: { w: 0.95 },
  beetle: { w: 1.2 },
};

export class Grid {
  constructor() {
    this.reset();
  }

  reset() {
    this.rows = new Map();
    this.next = 0;
    this.lastType = 'grass';
    this.run = 0;
    this.safe = 0;
    this.lastRiverDir = 1;
    this.cratesTotal = 0;
    this.time = 0;
    this.empty = { r: -1, type: 'grass', zone: 'lagoon', tiles: new Map(), items: new Map(), movers: [], static: true };
  }

  row(r) {
    if (r < 0) return this.empty;
    while (this.next <= r) this._gen(this.next++);
    return this.rows.get(r);
  }

  prune(minRow) {
    for (const k of this.rows.keys()) if (k < minRow - 8) this.rows.delete(k);
  }

  // x (tiles) of a looping mover at the current time
  moverX(row, m) {
    const span = G.spanTiles;
    const v = m.base + row.dir * row.speed * this.time;
    return ((((v + span / 2) % span) + span) % span) - span / 2;
  }

  // river support under x (tiles), or null
  support(row, x) {
    for (const m of row.movers) if (Math.abs(x - this.moverX(row, m)) < m.w / 2 + 0.14) return m;
    return null;
  }

  // vehicle (or train) hitting a hero at x (tiles)
  hit(row, x) {
    if (row.type === 'road') {
      for (const m of row.movers) if (Math.abs(x - this.moverX(row, m)) < m.w / 2 + G.heroHalfWidth) return m;
    } else if (row.type === 'rail') {
      const t = this.train(row);
      if (t.state === 'pass' && Math.abs(x - t.x) < row.trainLen / 2 + G.heroHalfWidth) return t;
    }
    return null;
  }

  // rail state: idle | warn | pass (+ x position of the train in tiles)
  train(row) {
    const phase = (this.time + row.offset) % row.period;
    const passStart = row.period - row.pass;
    const warnStart = passStart - row.warn;
    if (phase >= passStart) {
      const k = (phase - passStart) / row.pass;
      const reach = G.spanTiles / 2 + row.trainLen / 2 + 1;
      return { state: 'pass', x: row.dir * (-reach + 2 * reach * k), k };
    }
    return { state: phase >= warnStart ? 'warn' : 'idle', x: 0, k: 0 };
  }

  _gen(r) {
    const diff = Math.min(1, r / 170);
    const zone = zoneAt(r);
    let type;
    if (r < 3) type = 'grass';
    else {
      const w = {
        grass: 3,
        road: 2.6 + diff * 2.2,
        river: (zone === 'lagoon' ? 3.2 : 1.7) + diff,
        rail: 0.5 + diff * 1.2 + (zone === 'ruins' ? 0.8 : 0),
      };
      if (this.lastType !== 'grass' && this.run >= MAX_RUN[this.lastType]) {
        w.grass = 100;
        w.road = w.river = w.rail = 0;
      } else if (this.lastType === 'grass' && this.run >= 2) {
        w.grass *= 0.25;
      }
      if (this.lastType === 'rail' && this.run >= 1) w.rail *= 0.3;
      type = weighted(w);
    }
    this.run = type === this.lastType ? this.run + 1 : 1;
    const afterHazard = this.lastType !== 'grass';
    this.lastType = type;

    const row = { r, type, zone, tiles: new Map(), items: new Map(), movers: [], dir: 1, speed: 0 };
    if (type === 'grass') this._grass(row, diff, afterHazard);
    else if (type === 'road') this._road(row, diff);
    else if (type === 'river') this._river(row, diff);
    else this._rail(row, diff);
    this.rows.set(r, row);
  }

  _grass(row, diff, afterHazard) {
    const half = G.half;
    const prev = this.safe;
    const next = row.r < 3 ? 0 : clamp(prev + pick([-1, 0, 0, 1]), -3, 3);
    const lo = Math.min(prev, next), hi = Math.max(prev, next);
    const density = row.r < 3 ? 0 : (afterHazard ? 0.1 : 0.2 + 0.2 * diff) * (0.7 + Math.random() * 0.6);
    for (let c = -half; c <= half; c++) {
      if (c >= lo && c <= hi) continue;
      if (Math.random() < density) {
        const kind = weighted({ tree: 5, rock: 2, bush: 2, 'crate:fruit': 1.2, 'crate:mystery': 0.35, 'crate:metal': 0.35 });
        row.tiles.set(c, { kind });
        if (kind.startsWith('crate') && kind !== 'crate:metal') this.cratesTotal++;
      }
    }
    // pickups on free tiles
    for (let c = -half; c <= half; c++) {
      if (row.tiles.has(c) || row.r < 1) continue;
      const roll = Math.random();
      if (roll < 0.16) row.items.set(c, { kind: 'fruit' });
      else if (roll < 0.175 && row.r > 12) row.items.set(c, { kind: pick(['green', 'green', 'purple', 'blue']) });
      else if (roll < 0.19 && row.r > 6) row.items.set(c, { kind: pick(['mask', 'mask', 'magnet', 'multiplier']) });
    }
    this.safe = next;
  }

  _road(row, diff) {
    row.dir = chance(0.5) ? 1 : -1;
    row.speed = Math.min(6.4, 1.5 + diff * 3.1 + Math.random() * 1.4);
    const span = G.spanTiles;
    const minGap = 2.4 - diff * 0.3;
    let x = Math.random() * 3;
    const kinds = { cart: 4, boulder: 2.5 + diff, beetle: 2, wagon: diff > 0.15 ? 2 + diff * 2 : 0 };
    const placed = [];
    while (x < span - 3) {
      const kind = weighted(kinds);
      const w = VEHICLES[kind].w;
      placed.push({ kind, w, base: x + w / 2 - span / 2 });
      x += w + minGap + Math.random() * (5.2 - diff * 1.7);
    }
    // the wrap-around gap must also be wide enough
    const last = placed[placed.length - 1];
    const first = placed[0];
    const wrapGap = (first.base - first.w / 2 + span) - (last.base + last.w / 2);
    if (wrapGap < minGap + 0.5) placed.pop();
    row.movers = placed;
    // risky coins in the middle of the road
    for (let c = -G.half; c <= G.half; c++) if (Math.random() < 0.08) row.items.set(c, { kind: 'fruit' });
  }

  _river(row, diff) {
    row.dir = -this.lastRiverDir;
    this.lastRiverDir = row.dir;
    row.speed = 0.9 + diff * 1.5 + Math.random() * 0.5;
    const span = G.spanTiles;
    const lily = chance(0.28);
    let x = Math.random() * 2;
    while (x < span - 2) {
      const w = lily ? 1.25 : pick(diff > 0.5 ? [2, 2, 3, 3, 4] : [2, 3, 3, 4]);
      const kind = lily ? 'lily' : 'log';
      row.movers.push({ kind, w, base: x + w / 2 - span / 2 });
      x += w + (lily ? 0.8 + Math.random() * 0.6 : 0.9 + Math.random() * (1.0 + diff * 0.6));
    }
  }

  _rail(row, diff) {
    row.dir = chance(0.5) ? 1 : -1;
    row.period = rnd(5.2, 8) - diff * 1.2;
    row.offset = Math.random() * row.period;
    row.warn = 1.35;
    row.pass = 1.05;
    row.trainLen = 11;
    for (let c = -G.half; c <= G.half; c++) if (Math.random() < 0.07) row.items.set(c, { kind: 'fruit' });
  }
}
