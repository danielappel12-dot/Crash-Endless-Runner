import { CONFIG } from '../config/settings.js';

// 2D AABB collisions between the hero and the world. Coordinates: x in world px,
// y = height above ground.

const SHRINK = 8;
const PLATFORM_TOL = 24;

export class CollisionSystem {
  constructor(game) {
    this.g = game;
  }

  // is entity e on the hero's lane (hero may be mid lane-switch)?
  sameLane(p, e) {
    return Math.abs((e.lf ?? e.lane) - p.laneF) < 0.62;
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
      if (!e.platform || !this.sameLane(p, e)) return;
      if (px + p.hw * 0.8 < e.x - e.w / 2 || px - p.hw * 0.8 > e.x + e.w / 2) return;
      const top = e.y0 + e.h;
      if (p.y >= top - PLATFORM_TOL && top > ground) ground = top;
    };
    for (const e of world.hazards.active) test(e);
    for (const e of world.crates.active) test(e);
    for (const pl of world.platforms.active) {
      if (!this.sameLane(p, pl)) continue;
      if (px + p.hw * 0.8 < pl.x - pl.w / 2 || px - p.hw * 0.8 > pl.x + pl.w / 2) continue;
      if (p.y >= pl.top - PLATFORM_TOL && pl.top > ground) ground = pl.top;
    }
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
      if (Math.abs(h.x - px) > 400 || !this.sameLane(p, h)) continue;
      let hitBox = h;
      if (h.kind === 'boulder') hitBox = { x: h.x, w: h.w * 0.8, y0: 0, h: h.h * 0.85 };
      if (overlap(hitBox) && !standingOn(h)) cb.hit(h);
      this.nearMiss(p, px, h, cb);
    }

    for (let i = world.crates.active.length - 1; i >= 0; i--) {
      const c = world.crates.active[i];
      if (Math.abs(c.x - px) > 300 || !this.sameLane(p, c)) continue;
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

    // spin attack: smash crates and enemies in reach
    const spinning = p.spinTimer > 0;
    const reach = CONFIG.player.spinReach;
    const vOverlap = (e) => p.y + p.h + 20 > e.y0 && p.y - 20 < e.y0 + e.h;
    if (spinning) {
      for (let i = world.crates.active.length - 1; i >= 0; i--) {
        const c = world.crates.active[i];
        if (c.kind === 'metal' || c.kind === 'tnt' || !this.sameLane(p, c)) continue;
        if (Math.abs(c.x - px) < reach + c.w / 2 && vOverlap(c)) cb.smash(c);
      }
    }
    // enemies
    for (let i = world.enemies.active.length - 1; i >= 0; i--) {
      const e = world.enemies.active[i];
      if (Math.abs(e.x - px) > 300 || !this.sameLane(p, e)) continue;
      if (spinning && Math.abs(e.x - px) < reach + e.w / 2 && vOverlap(e)) {
        cb.enemyKill(e, 'spin');
        continue;
      }
      // generous stomp: feet coming down near the enemy's head (one frame of travel of slack)
      const top = e.y0 + e.h;
      const stomp = e.stomp && p.vy < 0 && !p.grounded && p.y >= top - 44 && p.y <= top + 24 &&
        Math.abs(e.x - px) < e.w / 2 + p.hw + g.speedPx * 0.03;
      if (stomp) cb.enemyKill(e, 'stomp');
      else if (overlap(e, 6)) {
        if (g.powerups.invincible) cb.enemyKill(e, 'power');
        else cb.enemyHit(e);
      }
    }

    const cy0 = p.y - 26, cy1 = p.y + p.h + 26;
    for (let i = world.items.active.length - 1; i >= 0; i--) {
      const it = world.items.active[i];
      const rad = it.kind === 'fruit' ? 30 : it.kind === 'magnet' || it.kind === 'mask' || it.kind === 'multiplier' ? 40 : 38;
      if (!this.sameLane(p, it)) continue;
      if (it.x + rad < r.x0 || it.x - rad > r.x1) continue;
      if (it.y < cy0 - 4 || it.y > cy1 + 4) continue;
      if (it.kind === 'magnet' || it.kind === 'mask' || it.kind === 'multiplier') cb.powerup(it);
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
