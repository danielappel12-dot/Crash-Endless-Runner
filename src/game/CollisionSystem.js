import { CONFIG } from '../config/settings.js';

// 2D AABB collisions between the hero and the world. Coordinates: x in world px,
// y = height above ground.

const SHRINK = 8;
const PLATFORM_TOL = 24;

export class CollisionSystem {
  constructor(game) {
    this.g = game;
  }

  playerRect(p, px) {
    return { x0: px - p.hw, x1: px + p.hw, y0: p.y, y1: p.y + p.h };
  }

  // Ground height below the hero for the next physics step (platforms & gaps).
  groundHeight(p, dt) {
    const { world } = this.g;
    const px = this.g.playerWorldX() + this.g.speedPx * dt;
    if (world.gapAt(px, 18)) return -Infinity;
    let ground = 0;
    const test = (e) => {
      if (!e.platform) return;
      if (px + p.hw * 0.8 < e.x - e.w / 2 || px - p.hw * 0.8 > e.x + e.w / 2) return;
      const top = e.y0 + e.h;
      if (p.y >= top - PLATFORM_TOL && top > ground) ground = top;
    };
    for (const e of world.hazards.active) test(e);
    for (const e of world.crates.active) test(e);
    return ground;
  }

  update(p, cb) {
    const g = this.g;
    const world = g.world;
    const px = g.playerWorldX();
    const r = this.playerRect(p, px);

    if (!Number.isFinite(p.groundY) && p.y < -60 && !p.falling) {
      p.falling = true;
      cb.fall();
    }

    const overlap = (e, shrink = SHRINK) =>
      r.x1 > e.x - e.w / 2 + shrink && r.x0 < e.x + e.w / 2 - shrink &&
      r.y1 > e.y0 + shrink && r.y0 < e.y0 + e.h - shrink;
    const standingOn = (e) => e.platform && p.y >= e.y0 + e.h - PLATFORM_TOL;

    for (const h of world.hazards.active) {
      if (Math.abs(h.x - px) > 400) continue;
      let hitBox = h;
      if (h.kind === 'boulder') hitBox = { x: h.x, w: h.w * 0.8, y0: 0, h: h.h * 0.85 };
      if (overlap(hitBox) && !standingOn(h)) cb.hit(h);
      this.nearMiss(p, px, h, cb);
    }

    for (let i = world.crates.active.length - 1; i >= 0; i--) {
      const c = world.crates.active[i];
      if (Math.abs(c.x - px) > 300) continue;
      const top = c.y0 + c.h;
      if (c.kind === 'metal') {
        if (overlap(c) && !standingOn(c)) cb.hit(c);
        this.nearMiss(p, px, c, cb);
      } else if (c.kind === 'tnt') {
        if (overlap(c, 12)) cb.explode(c);
      } else if (c.kind === 'bouncy') {
        if (c.squash > 0) continue;
        const hx = r.x1 > c.x - c.w / 2 && r.x0 < c.x + c.w / 2;
        if (hx && p.y >= top - 34 && p.vy <= 0 && !p.grounded) cb.bounce(c);
        else if (overlap(c, 10)) cb.smash(c);
      } else if (overlap(c, 8)) {
        cb.smash(c);
      }
    }

    const cy0 = p.y - 26, cy1 = p.y + p.h + 26;
    for (let i = world.items.active.length - 1; i >= 0; i--) {
      const it = world.items.active[i];
      const rad = it.kind === 'fruit' ? 30 : it.kind === 'magnet' || it.kind === 'shield' || it.kind === 'multiplier' ? 40 : 38;
      if (it.x + rad < r.x0 || it.x - rad > r.x1) continue;
      if (it.y < cy0 - 4 || it.y > cy1 + 4) continue;
      if (it.kind === 'magnet' || it.kind === 'shield' || it.kind === 'multiplier') cb.powerup(it);
      else cb.collect(it);
    }
  }

  // Awarded for clearing a hazard by a hair while jumping over it.
  nearMiss(p, px, e, cb) {
    if (e.passed) return;
    if (e.x + e.w / 2 < px - p.hw) {
      e.passed = true;
      if (e.kind === 'branch') return;
      const top = e.y0 + e.h;
      if (p.y > top - 6 && p.y - top < 36) cb.nearMiss(e);
    }
  }
}
