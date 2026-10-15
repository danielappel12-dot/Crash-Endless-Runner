import { CONFIG } from '../config/settings.js';

// Procedural content for one segment: obstacles, crates, fruit trails, gems and
// power-ups. SAFETY RULES:
//  * Every row has a "safe lane" with no hazard in it. The safe lane of one row
//    differs by at most one lane from the previous row, so a route always exists.
//  * Full-width hazards (gap / low branch) only follow a plain "rest" row and
//    are always followed by one, so there is room to jump / slide and recover.
//  * Rolling-boulder sections keep one constant safe lane and add no other hazards.

const LX = CONFIG.lanes.x;
const TR = CONFIG.track;
const rnd = (a, b) => a + Math.random() * (b - a);
const chance = (p) => Math.random() < p;
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;

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

export class Layout {
  constructor({ obstacles, crates, collectibles, powerups }) {
    this.ob = obstacles;
    this.cr = crates;
    this.co = collectibles;
    this.pu = powerups;
    this.reset();
  }

  reset() {
    this.safe = 1;
    this.prevType = 'rest';
    this.prevBoulder = false;
  }

  speedAt(d) {
    const S = CONFIG.speed;
    return Math.min(S.max, S.start + (d / S.distanceToMax) * (S.max - S.start));
  }

  populate(seg, d) {
    const diff = clamp(d / CONFIG.speed.distanceToMax, 0, 1);
    const hazardsOn = d >= 56;
    const level = d / CONFIG.speed.levelEvery + 1;
    const rows = TR.rowsPerSegment;
    const canBoulder = hazardsOn && seg.biome !== 'bridge' && level >= CONFIG.difficulty.boulderFromLevel && !this.prevBoulder;
    const boulder = canBoulder && chance(0.18 + 0.25 * diff);
    this.prevBoulder = boulder;

    // 1) decide row types first (needed for look-ahead decisions)
    const types = [];
    let prev = this.prevType;
    for (let i = 0; i < rows; i++) {
      let t = 'rest';
      if (hazardsOn && !boulder) {
        const pFull = 0.1 + 0.2 * diff;
        const pBlocks = 0.4 + 0.45 * diff;
        const r = Math.random();
        if (prev === 'rest' && r < pFull) t = chance(0.55) ? 'gap' : 'branch';
        else if (prev !== 'gap' && prev !== 'branch' && r < pFull + pBlocks) t = 'blocks';
      }
      types.push(t);
      prev = t;
    }
    this.prevType = types[rows - 1];

    // 2) build rows
    const info = [];
    for (let i = 0; i < rows; i++) {
      const rc = seg.z0 + seg.rows[i].rc;
      const type = types[i];
      const from = this.safe;
      let S = from;
      if ((type === 'rest' || type === 'blocks') && !boulder && chance(0.3 + 0.3 * diff)) {
        S = clamp(from + (chance(0.5) ? -1 : 1), 0, 2);
      }
      this.safe = S;
      const row = { i, rc, type, from, S, hazards: [] };
      info.push(row);
      this.bridgeFruit(seg, rc, from, S);
      if (type === 'gap') this.gapRow(seg, row);
      else if (type === 'branch') this.branchRow(seg, row);
      else if (type === 'blocks') this.blocksRow(seg, row, diff);
      else this.restRow(seg, row, types, diff);
    }

    if (boulder) this.boulderSection(seg, info[0].S, diff);

    // 3) rewards
    this.rewards(seg, info, d, diff, hazardsOn);
  }

  // ------------------------------------------------------------ helpers
  fruit(seg, x, y, z) {
    seg.entities.push(this.co.fruit(x, y, z));
  }

  trail(seg, rc, lane, y = 0.8) {
    for (let k = 0; k < 5; k++) this.fruit(seg, LX[lane], y, rc + 5 - k * 2.5);
  }

  bridgeFruit(seg, rc, from, to) {
    for (let k = 1; k <= 2; k++) {
      this.fruit(seg, lerp(LX[from], LX[to], k / 3), 0.8, rc + 9 - k * 1.35);
    }
  }

  arc(seg, x, z, span = 7, peak = 2.7, base = 1.0, n = 5) {
    for (let k = 0; k < n; k++) {
      const t = k / (n - 1);
      const y = base + Math.sin(t * Math.PI) * (peak - base);
      this.fruit(seg, x, y, z + span / 2 - t * span);
    }
  }

  cue(seg, x, z, color, toward = false, w = 2.0) {
    seg.entities.push(this.ob.cue(x, z, color, toward, w));
  }

  sign(seg, z) {
    seg.entities.push(this.ob.sign(-3.9, z));
    seg.entities.push(this.ob.sign(3.9, z));
  }

  crate(seg, kind, lane, z) {
    const c = this.cr.spawn(kind, LX[lane], z);
    seg.entities.push(c);
    return c;
  }

  // ------------------------------------------------------------- rows
  restRow(seg, row, types, diff) {
    const { rc, S, i } = row;
    const others = [0, 1, 2].filter((l) => l !== S);
    const bounceOk = i <= 1 && types[i + 1] === 'rest' && types[i + 2] === 'rest';
    const roll = Math.random();
    let usedLane = -1;
    if (roll < 0.5 && i > 0 || (i === 0 && roll < 0.25)) {
      // a short line of crates beside the path
      const lane = pick(others);
      usedLane = lane;
      const kind = weighted({ fruit: 5, mystery: 2, bouncy: bounceOk ? 1.5 : 0 });
      if (kind === 'bouncy') {
        this.crate(seg, 'bouncy', lane, rc);
        this.bounceReward(seg, LX[lane], rc);
      } else {
        const n = chance(0.5) ? 3 : 2;
        for (let k = 0; k < n; k++) this.crate(seg, k === 1 && chance(0.4) ? 'mystery' : kind, lane, rc + 2.2 - k * 2.2);
      }
    }
    this.trail(seg, rc, S);
    // jump-only fruit arc in the free lane or on the path
    if (chance(0.22 + 0.2 * diff)) {
      const lane = pick(others.filter((l) => l !== usedLane).concat([S]));
      if (lane !== usedLane) this.arc(seg, LX[lane], rc, 8, 2.9, 1.9);
    }
  }

  bounceReward(seg, x, rc) {
    const v = CONFIG.crates.bounceVelocity;
    const g = CONFIG.player.gravity;
    const speed = this.speedAt(Math.max(0, -seg.z0)) * 1.02;
    for (let k = 1; k <= 5; k++) {
      const t = k * 0.16;
      const y = 1.4 + v * t - 0.5 * g * t * t;
      if (y > 1.5) this.fruit(seg, x, y + 0.2, rc - speed * t);
    }
  }

  gapRow(seg, row) {
    const { rc, S, i } = row;
    seg.addGap(i);
    // fruit arc hovering over the ravine (needs a jump) + approach trail
    for (let k = 0; k < 3; k++) this.fruit(seg, LX[S], 0.8, rc + 9 - k * 1.8);
    this.arc(seg, LX[S], rc, 7, 3.0, 1.2);
    for (const l of [0, 1, 2]) this.cue(seg, LX[l], rc + 7.5, 'amber', false);
    this.sign(seg, rc + 12);
  }

  branchRow(seg, row) {
    const { rc, S } = row;
    const b = this.ob.spawn('branch', 0, rc);
    seg.entities.push(b);
    this.trail(seg, rc - 0.5, S, 0.65);
    for (const l of [0, 1, 2]) {
      this.cue(seg, LX[l], rc + 6.5, 'cyan', false);
      this.cue(seg, LX[l], rc + 10, 'cyan', false);
    }
    this.sign(seg, rc + 12);
  }

  blocksRow(seg, row, diff) {
    const { rc, S } = row;
    const free = [0, 1, 2].filter((l) => l !== S);
    const two = chance(0.2 + 0.5 * diff);
    const lanes = two ? free : [pick(free)];
    for (const lane of lanes) {
      const kind = weighted({
        log: 4, rock: 2.5, barricade: 2.5, metal: 1.5 + diff, tnt: diff > 0.08 ? 2 : 0,
      });
      this.hazard(seg, kind, lane, rc);
      row.hazards.push({ kind, lane });
    }
    // path fruit
    this.trail(seg, rc, S);
    // reward arcs over jumpable logs
    for (const h of row.hazards) {
      if (h.kind === 'log' && chance(0.5)) this.arc(seg, LX[h.lane], rc, 7, 2.9, 1.6);
    }
    // a harmless fruit crate in an unused lane
    const unused = free.filter((l) => !lanes.includes(l));
    if (unused.length && chance(0.45)) this.crate(seg, weighted({ fruit: 4, mystery: 1 }), unused[0], rc);
  }

  hazard(seg, kind, lane, z) {
    const x = LX[lane];
    if (kind === 'metal') {
      this.crate(seg, 'metal', lane, z);
      this.cue(seg, x, z + 5, 'red', true, 1.8);
    } else if (kind === 'tnt') {
      this.crate(seg, 'tnt', lane, z);
      this.cue(seg, x, z + 5, 'red', true, 1.8);
    } else {
      seg.entities.push(this.ob.spawn(kind, x, z));
      if (kind === 'barricade') this.cue(seg, x, z + 4.5, 'red', true, 1.8);
    }
  }

  boulderSection(seg, safeLane, diff) {
    const free = [0, 1, 2].filter((l) => l !== safeLane);
    const lanes = diff > 0.45 && chance(0.6) ? free : [pick(free)];
    const zStart = seg.z0 - TR.segmentLength + 4;
    for (const lane of lanes) {
      const b = this.ob.spawn('boulder', LX[lane], zStart);
      seg.entities.push(b);
      for (let k = 0; k < 6; k++) this.cue(seg, LX[lane], seg.z0 - 6 - k * 8, 'red', true, 2.0);
    }
    this.sign(seg, seg.z0 - 3);
  }

  // ---------------------------------------------------------- rewards
  rewards(seg, info, d, diff, hazardsOn) {
    // power-up on a path in a plain row
    if (d > 80 && chance(0.2)) {
      const rest = info.filter((r) => r.type === 'rest');
      if (rest.length) {
        const r = pick(rest);
        const type = pick(['magnet', 'shield', 'multiplier']);
        seg.entities.push(this.pu.spawn(type, LX[r.S], 1.1, r.rc - 2.5));
      }
    }
    if (d < 100 || !chance(0.38 + 0.35 * diff)) return;
    // gem: prefer risky spots
    const gaps = info.filter((r) => r.type === 'gap');
    const branches = info.filter((r) => r.type === 'branch');
    const logs = info.filter((r) => r.hazards.some((h) => h.kind === 'log'));
    const kindRoll = weighted({ green: 55, purple: 30 + 10 * diff, blue: 10 + 15 * diff });
    let placed = false;
    if (gaps.length && chance(0.7)) {
      const r = pick(gaps);
      const relic = chance(0.14 + 0.1 * diff);
      seg.entities.push(relic ? this.co.gem('relic', LX[1], 2.2, r.rc) : this.co.gem(kindRoll, LX[1], 2.0, r.rc));
      placed = true;
    } else if (logs.length && chance(0.7)) {
      const r = pick(logs);
      const h = r.hazards.find((x) => x.kind === 'log');
      seg.entities.push(this.co.gem(kindRoll, LX[h.lane], 2.4, r.rc));
      placed = true;
    } else if (branches.length) {
      const r = pick(branches);
      const lane = pick([0, 1, 2]);
      seg.entities.push(this.co.gem(kindRoll, LX[lane], 0.6, r.rc));
      placed = true;
    }
    if (!placed) {
      const rest = info.filter((r) => r.type === 'rest' || r.type === 'blocks');
      const r = pick(rest);
      // reward path: gem in the guaranteed-safe lane, framed by fruit
      seg.entities.push(this.co.gem(kindRoll, LX[r.S], 1.1, r.rc - 1));
    }
  }
}
