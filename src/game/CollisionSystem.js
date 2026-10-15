import { CONFIG } from '../config/settings.js';

// AABB collision between the hero and everything else. Uses swept z-ranges
// (previous -> current position) so nothing is tunnelled at high speed or low FPS.

const SHRINK = 0.1; // hazards are slightly forgiving
const PLATFORM_TOL = 0.4;

export class CollisionSystem {
  constructor(game) {
    this.g = game;
  }

  // Ground height under the hero for the *next* physics step (platforms & gaps).
  groundHeight(player, dt) {
    const { track, obstacles, crates } = this.g;
    const lookZ = player.z - player.speed * dt;
    if (track.gapAt(lookZ, 0.35)) return -Infinity;
    let ground = 0;
    const px0 = player.x - player.hw * 0.8;
    const px1 = player.x + player.hw * 0.8;
    const z0 = lookZ - player.hd;
    const z1 = player.z + player.hd;
    const test = (e) => {
      if (!e.platform) return;
      if (px1 < e.x - e.hw || px0 > e.x + e.hw) return;
      if (z1 < e.z - e.hd || z0 > e.z + e.hd) return;
      const top = e.y0 + e.hh;
      if (player.y >= top - PLATFORM_TOL && top > ground) ground = top;
    };
    for (const pool of obstacles.list()) for (const e of pool.active) test(e);
    for (const pool of crates.list()) for (const e of pool.active) test(e);
    return ground;
  }

  update(player, cb) {
    const g = this.g;
    const b = player.box;

    // falling into a ravine
    if (!Number.isFinite(player.groundY) && player.y < -0.6 && !player.falling) {
      player.falling = true;
      cb.fall();
    }

    const near = (e) => e.z + e.hd + 1 > b.z0 && e.z - e.hd - 1 < b.z1;
    const overlap = (e, shrink = SHRINK) => {
      if (b.x1 <= e.x - e.hw + shrink || b.x0 >= e.x + e.hw - shrink) return false;
      if (b.z1 <= e.z - e.hd + shrink || b.z0 >= e.z + e.hd - shrink) return false;
      return b.y1 > e.y0 + shrink && b.y0 < e.y0 + e.hh - shrink;
    };
    const standingOn = (e) => e.platform && player.y >= e.y0 + e.hh - PLATFORM_TOL;

    // hazards
    for (const pool of g.obstacles.list()) {
      for (let i = pool.active.length - 1; i >= 0; i--) {
        const o = pool.active[i];
        if (!near(o)) {
          this.nearMiss(player, o, cb);
          continue;
        }
        if (overlap(o) && !standingOn(o)) cb.hit(o);
        this.nearMiss(player, o, cb);
      }
    }

    // crates
    for (const pool of g.crates.list()) {
      for (let i = pool.active.length - 1; i >= 0; i--) {
        const c = pool.active[i];
        if (!near(c)) {
          this.nearMiss(player, c, cb);
          continue;
        }
        const top = c.y0 + c.hh;
        if (c.kind === 'metal') {
          if (overlap(c) && !standingOn(c)) cb.hit(c);
        } else if (c.kind === 'tnt') {
          if (overlap(c, 0.2)) cb.explode(c);
        } else if (c.kind === 'bouncy') {
          if (c.squash > 0) continue;
          const px = b.x1 > c.x - c.hw && b.x0 < c.x + c.hw && b.z1 > c.z - c.hd && b.z0 < c.z + c.hd;
          if (px && player.y >= top - 0.55 && player.vy <= 0 && !player.grounded) cb.bounce(c);
          else if (overlap(c, 0.15)) cb.smash(c);
        } else if (overlap(c, 0.1)) {
          cb.smash(c);
        }
        this.nearMiss(player, c, cb);
      }
    }

    // collectibles (swept)
    const cy0 = player.y - 0.45;
    const cy1 = player.y + player.h + 0.45;
    for (const pool of g.collectibles.list()) {
      for (let i = pool.active.length - 1; i >= 0; i--) {
        const it = pool.active[i];
        const r = it.kind === 'fruit' ? 0.5 : 0.65;
        if (it.z + r < b.z0 || it.z - r > b.z1) continue;
        if (it.x + r < b.x0 || it.x - r > b.x1) continue;
        if (it.y < cy0 || it.y > cy1) continue;
        cb.collect(it);
      }
    }
    for (const pool of g.powerups.list()) {
      for (let i = pool.active.length - 1; i >= 0; i--) {
        const it = pool.active[i];
        if (it.z + 0.8 < b.z0 || it.z - 0.8 > b.z1) continue;
        if (it.x + 0.8 < b.x0 || it.x - 0.8 > b.x1) continue;
        if (it.y < cy0 - 0.2 || it.y > cy1 + 0.2) continue;
        cb.powerup(it);
      }
    }
  }

  // Awarded when the hero clears a hazard by a hair while jumping over it.
  nearMiss(player, e, cb) {
    if (e.passed || e.passed === undefined) return;
    if (e.z - e.hd > player.z) {
      e.passed = true;
      if (e.kind === 'fruit' || e.kind === 'bouncy' || e.kind === 'mystery' || e.kind === 'tnt') return;
      if (e.type === 'branch') return;
      const top = e.y0 + e.hh;
      if (Math.abs(player.x - e.x) < e.hw && player.y > top - 0.1 && player.y - top < 0.45) cb.nearMiss(e);
    }
  }
}
