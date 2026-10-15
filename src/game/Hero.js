import { CONFIG } from '../config/settings.js';
import { Player } from './Player.js';

// Rukk on the hop-map: tile-by-tile hopping, log riding, collisions with the
// current row, buffered input and click-to-walk. The Player class is reused only
// for the cartoon pose animation and drawing.

const G = CONFIG.grid;
const sign = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);

export class Hero {
  constructor(game) {
    this.g = game;
    this.pl = new Player();
    this.reset();
  }

  reset() {
    this.x = 0; // tiles (continuous so logs can carry you)
    this.row = 0;
    this.rowF = 0;
    this.hop = null;
    this.facing = 1;
    this.buffer = [];
    this.target = null;
    this.invuln = 0;
    this.lastSafe = { x: 0, row: 0 };
    this.idle = 0;
    this.nudge = null;
    this.dead = false;
    this.time = 0;
    const pl = this.pl;
    pl.reset();
    pl.mode = 'idle';
    pl.groundY = Infinity; // the renderer draws the shadow
    pl.squash = 0;
  }

  get col() {
    return Math.round(this.x);
  }

  // ----------------------------------------------------------- moving
  // what would a hop (dx, dr) do? -> {kind: 'ok'|'blocked'|'crate', toX, toR, crate?}
  probe(dx, dr) {
    const g = this.g, grid = g.grid;
    const here = grid.row(this.row);
    const base = here.type === 'river' ? this.x : Math.round(this.x);
    const toR = this.row + dr;
    const dest = grid.row(toR);
    const toX = dx ? base + dx : dest.type === 'river' ? base : Math.round(base);
    if (Math.abs(toX) > G.half + 0.01) return { kind: 'blocked' };
    if (toR < g.camRow + 0.45) return { kind: 'blocked' };
    if (dest.type === 'grass') {
      const t = dest.tiles.get(Math.round(toX));
      if (t) return t.kind.startsWith('crate:') && t.kind !== 'crate:metal' ? { kind: 'crate', col: Math.round(toX), row: dest, toX, toR } : { kind: 'blocked' };
    }
    return { kind: 'ok', toX, toR };
  }

  startHop(dx, dr) {
    const g = this.g;
    const p = this.probe(dx, dr);
    if (dx) this.facing = dx;
    if (p.kind === 'blocked') {
      this.nudge = { dx, dr, t: 0 };
      g.audio.bump();
      return false;
    }
    if (p.kind === 'crate') {
      this.nudge = { dx, dr, t: 0 };
      g.smashTile(p.row, p.col);
      this.idle = 0;
      return true;
    }
    this.hop = { t: 0, fx: this.x, fr: this.row, tx: p.toX, tr: p.toR };
    this.pl.squash = 0.28;
    g.audio.hop();
    this.idle = 0;
    return true;
  }

  request(dx, dr) {
    if (this.dead || this.g.state !== 'playing') return;
    this.target = null;
    if (this.hop) {
      if (this.buffer.length < 2) this.buffer.push([dx, dr]);
    } else this.startHop(dx, dr);
  }

  // click/tap on tile (col,row): hop toward it
  setTarget(col, row) {
    if (this.dead || this.g.state !== 'playing') return;
    const dc = col - this.col, dr = row - this.row;
    if (dc === 0 && dr === 0) return this.request(0, 1); // tapping yourself hops forward
    const prim = Math.abs(dr) >= Math.abs(dc) ? [0, sign(dr)] : [sign(dc), 0];
    const sec = Math.abs(dr) >= Math.abs(dc) ? [sign(dc), 0] : [0, sign(dr)];
    const steps = [prim, sec].filter((v) => v[0] || v[1]);
    this.buffer.length = 0;
    // the first hop is always taken; auto-walking continues only across safe grass
    this.target = { col, row };
    if (this.hop) return;
    this.stepToward(steps, true);
  }

  stepToward(steps, first = false) {
    const t = this.target;
    if (!t) return;
    const dc = t.col - this.col, dr = t.row - this.row;
    if (dc === 0 && dr === 0) {
      this.target = null;
      return;
    }
    if (!steps) {
      const prim = Math.abs(dr) >= Math.abs(dc) ? [0, sign(dr)] : [sign(dc), 0];
      const sec = Math.abs(dr) >= Math.abs(dc) ? [sign(dc), 0] : [0, sign(dr)];
      steps = [prim, sec].filter((v) => v[0] || v[1]);
    }
    for (const [dx, drr] of steps) {
      const p = this.probe(dx, drr);
      if (p.kind === 'blocked') continue;
      const destType = this.g.grid.row(this.row + drr).type;
      if (!first && destType !== 'grass') continue; // never auto-walk into traffic or water
      if (first && destType !== 'grass') this.target = null; // one deliberate hop, then stop
      this.startHop(dx, drr);
      return;
    }
    this.target = null;
  }

  respawn(x, row) {
    this.x = x;
    this.row = row;
    this.rowF = row;
    this.hop = null;
    this.buffer.length = 0;
    this.target = null;
    this.invuln = CONFIG.player.hitInvuln;
    this.pl.hitTimer = 0.6;
    this.pl.squash = -0.3;
  }

  // ----------------------------------------------------------- update
  update(dt) {
    const g = this.g, grid = g.grid, pl = this.pl;
    this.time += dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (pl.hitTimer > 0) pl.hitTimer -= dt;
    if (this.nudge) {
      this.nudge.t += dt;
      if (this.nudge.t > 0.16) this.nudge = null;
    }
    pl.squash += (0 - pl.squash) * Math.min(1, dt * 9);

    if (this.hop) {
      const h = this.hop;
      h.t += dt / G.hopTime;
      const f = Math.min(1, h.t);
      const e = f * f * (3 - 2 * f);
      this.x = h.fx + (h.tx - h.fx) * e;
      this.rowF = h.fr + (h.tr - h.fr) * e;
      if (f >= 1) this.land();
    } else if (!this.dead) {
      this.stand(dt);
    }

    if (!this.hop && !this.dead && g.state === 'playing') {
      if (this.buffer.length) {
        const [dx, dr] = this.buffer.shift();
        this.startHop(dx, dr);
      } else if (this.target) this.stepToward();
    }

    // pose animation
    const hopping = !!this.hop;
    pl.mode = this.dead ? 'dead' : hopping || this.nudge ? 'run' : 'idle';
    pl.grounded = !hopping;
    pl.vy = hopping ? (this.hop.t < 0.5 ? 600 : -600) : 0;
    pl.speed = hopping ? 30 : 0;
    pl.sliding = false;
    pl.spinTimer = 0;
    pl.falling = false;
    pl.y = 0;
    pl.h = 118;
    pl.invuln = this.invuln;
    pl.time += dt;
    pl.animate(dt);
  }

  hopHeight() {
    if (!this.hop) return 0;
    const f = Math.min(1, this.hop.t);
    return Math.sin(f * Math.PI) * G.hopHeight;
  }

  land() {
    const g = this.g, grid = g.grid;
    const h = this.hop;
    this.x = h.tx;
    this.row = h.tr;
    this.rowF = h.tr;
    this.hop = null;
    this.pl.squash = -0.25;
    const row = grid.row(this.row);
    if (row.type === 'grass') {
      this.x = Math.round(this.x);
      this.lastSafe = { x: this.x, row: this.row };
    }
    g.onLand(this);
    this.check(row);
  }

  // continuous checks for the row the hero stands in
  stand(dt) {
    const g = this.g, grid = g.grid;
    const row = grid.row(this.row);
    if (row.type === 'river') this.x += row.dir * row.speed * dt;
    this.check(row);
    this.idle += dt;
  }

  check(row) {
    const g = this.g, grid = g.grid;
    if (this.dead || g.state !== 'playing') return;
    if (row.type === 'river') {
      if (this.hop) return;
      if (!grid.support(row, this.x)) return g.hurt('water');
      if (Math.abs(this.x) > G.half + 1.6) return g.hurt('drift');
    } else if (row.type === 'road' || row.type === 'rail') {
      if (grid.hit(row, this.x)) return g.hurt(row.type === 'rail' ? 'train' : 'vehicle');
    }
    g.collectAt(row, this);
  }
}
