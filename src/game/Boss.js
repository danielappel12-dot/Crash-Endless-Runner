import { CONFIG, laneY } from '../config/settings.js';

// "King Scuttler": a giant crowned beetle on the right edge of the screen. It
// lobs coconut bombs down the lanes; spin (or have mask power) to bat a coconut
// back and hit it. It hops between lanes, so get into its lane and time the spin.
// Phase 2/3 add decoy coconuts in other lanes.

const C = CONFIG.boss;
const pick = (a) => a[(Math.random() * a.length) | 0];

export class Boss {
  constructor(game) {
    this.g = game;
    this.count = 0;
    this.reset();
  }

  reset() {
    this.active = false;
    this.state = 'none';
    this.warnLanes = [];
    this.decoys = [];
    this.hp = 0;
    this.maxHp = 0;
    this.flash = 0;
    this.t = 0;
    this.lane = 1;
    this.laneF = 1;
    this.sx = 0;
    this.alpha = 1;
    this.count = 0;
    this.waves = 0;
    this.explodeT = 0;
  }

  get worldX() {
    return this.g.camX + this.sx;
  }

  get phase() {
    return this.hp <= 1 ? 3 : this.hp <= this.maxHp / 2 ? 2 : 1;
  }

  begin() {
    const g = this.g, W = g.world;
    this.active = true;
    this.maxHp = C.baseHp + Math.min(3, this.count);
    this.hp = this.maxHp;
    this.count++;
    this.state = 'intro';
    this.t = 0;
    this.fightT = 0;
    this.lane = this.laneF = 1;
    this.alpha = 1;
    this.targetSx = g.renderer.viewW - C.bossX;
    this.sx = g.renderer.viewW + 320;
    W.frozen = true;
    // wipe everything generated beyond the screen so the arena is clean
    const limit = g.camX + g.renderer.viewW + 120;
    for (const pool of [W.hazards, W.crates, W.enemies, W.platforms, W.items]) {
      for (let i = pool.active.length - 1; i >= 0; i--) if (pool.active[i].x > limit) pool.release(pool.active[i]);
    }
    for (let i = W.gaps.active.length - 1; i >= 0; i--) if (W.gaps.active[i].x0 > limit) W.gaps.release(W.gaps.active[i]);
    g.hud.toast('BOSS: KING SCUTTLER!', '#ff6a3a');
    g.audio.bossRoar();
    g.audio.music.play('boss');
    g.shake = 14;
  }

  _planAttack() {
    const lanes = [0, 1, 2];
    // hop to another lane
    this.lane = pick(lanes.filter((l) => l !== this.lane));
    const phase = this.phase;
    this.decoys = [];
    const others = lanes.filter((l) => l !== this.lane);
    if (phase >= 2 && Math.random() < 0.6) this.decoys.push(pick(others));
    if (phase >= 3 && Math.random() < 0.5) {
      const rest = others.filter((l) => !this.decoys.includes(l));
      if (rest.length) this.decoys.push(rest[0]);
    }
    this.state = 'move';
    this.t = 0;
  }

  update(dt) {
    if (!this.active) return;
    const g = this.g, W = g.world;
    this.t += dt;
    this.fightT += dt;
    if (this.flash > 0) this.flash -= dt;
    // safety valve: a boss nobody can hit eventually leaves so the level can continue
    if (this.fightT > 80 && (this.state === 'idle' || this.state === 'recover')) {
      g.hud.toast('KING SCUTTLER ESCAPED!', '#ffffff', true);
      this._finish();
      return;
    }
    this.laneF += (this.lane - this.laneF) * Math.min(1, dt * 9);
    switch (this.state) {
      case 'intro':
        this.sx += (this.targetSx - this.sx) * Math.min(1, dt * 3.2);
        if (this.t > 2.1) { this.state = 'idle'; this.t = 0; }
        break;
      case 'idle':
        if (this.t > C.idle) this._planAttack();
        break;
      case 'move':
        if (this.t > 0.5) { this.state = 'windup'; this.t = 0; this.warnLanes = [this.lane, ...this.decoys]; g.audio.tick(); }
        break;
      case 'windup':
        if (Math.floor(this.t * 8) !== Math.floor((this.t - dt) * 8)) g.audio.tick();
        if (this.t > C.windup) {
          for (const l of [this.lane, ...this.decoys]) W.hazard('coconut', this.worldX - 70, l);
          g.audio.spin();
          this.warnLanes = [];
          this.state = 'recover';
          this.t = 0;
        }
        break;
      case 'recover':
        if (this.t > C.recover) { this.state = 'idle'; this.t = 0; }
        break;
      case 'stun':
        if (this.t > C.stun) { this.state = 'idle'; this.t = 0; }
        break;
      case 'dead':
        this.alpha = Math.max(0, 1 - this.t / 2.2);
        this.explodeT -= dt;
        if (this.explodeT <= 0 && this.t < 1.8) {
          this.explodeT = 0.16;
          const x = this.worldX + (Math.random() - 0.5) * 220;
          const y = 40 + Math.random() * 200;
          g.particles.lane = this.laneF;
          g.particles.emit(x, y, 14, { colors: [0xff4a1a, 0xff8a1e, 0xffd23a, 0xffffff], speed: 420, life: 0.6, size: 26, gravity: 200 });
          g.particles.stars(x, y, 3, [0xffd23a, 0xffffff], 360);
          g.audio.crate();
          g.shake = Math.max(g.shake, 9);
        }
        if (this.t > 2.4) this._finish();
        break;
    }
    // coconuts batted back into the boss
    if (this.state !== 'dead' && this.state !== 'intro') {
      for (let i = W.hazards.active.length - 1; i >= 0; i--) {
        const h = W.hazards.active[i];
        if (h.kind === 'coconut' && h.deflected && Math.abs(h.x - this.worldX) < 120 && Math.abs(h.lane - this.laneF) < 0.7) {
          W.hazards.release(h);
          this.hit(h);
        }
      }
    }
  }

  hit() {
    const g = this.g;
    this.hp--;
    this.flash = 0.5;
    g.particles.lane = this.laneF;
    g.particles.stars(this.worldX, 120, 14, [0xffd23a, 0xffffff, 0xff8a1e], 520);
    g.particles.emit(this.worldX, 110, 12, { colors: [0xe8402a, 0xffd23a], speed: 380, life: 0.5, size: 22, gravity: 400 });
    g.particles.pop(this.worldX - 40, 260, this.hp <= 0 ? 'K.O.!' : 'HIT!', '#ffd23a');
    g.audio.bossHit();
    g.shake = 14;
    g.score.add(500);
    g.hud.flash('white');
    // thank-you fruit that flies to the hero
    g.world.pop(this.worldX, 120, 6, Math.round(this.laneF));
    this.warnLanes = [];
    if (this.hp <= 0) this._defeat();
    else {
      this.state = 'stun';
      this.t = 0;
    }
  }

  _defeat() {
    const g = this.g;
    this.state = 'dead';
    this.t = 0;
    this.explodeT = 0;
    g.score.add(2000 * Math.min(3, this.count));
    g.score.bosses = (g.score.bosses || 0) + 1;
    g.audio.explosion();
    g.audio.maskGet(true);
    g.hud.toast('BOSS DEFEATED!', '#7cff5a');
    const lane = Math.round(this.laneF);
    g.world.pop(this.worldX, 160, 14, lane);
    g.world.popItem('purple', this.worldX, 200, lane);
    g.world.popItem('mask', this.worldX, 220, lane);
    if (this.count % 2 === 0) g.world.popItem('relic', this.worldX, 240, lane);
  }

  _finish() {
    const g = this.g;
    this.active = false;
    this.state = 'none';
    g.world.frozen = false;
    g.world.nextX = g.camX + g.renderer.viewW + 700;
    g.nextBossAt = g.score.distance + C.every;
    g.audio.music.play(g.renderer.biome);
  }
}
