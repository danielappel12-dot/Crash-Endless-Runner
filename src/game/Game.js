import { CONFIG, store } from '../config/settings.js';
import { Player } from './Player.js';
import { World } from './World.js';
import { Renderer } from './Renderer.js';
import { CollisionSystem } from './CollisionSystem.js';
import { ParticleSystem } from './ParticleSystem.js';
import { ScoreManager } from './ScoreManager.js';
import { AudioManager } from './AudioManager.js';
import { InputManager } from './InputManager.js';
import { PowerUps, POWERUPS, GEM_STYLE } from './PowerUp.js';
import { HUD } from '../ui/HUD.js';
import { Menu } from '../ui/Menu.js';
import { GameOver } from '../ui/GameOver.js';

const V = CONFIG.view;
const WOOD = [0xd9964e, 0x8a5424, 0xc28a4c, 0xf0d09a];
const FIRE = [0xff4a1a, 0xff8a1e, 0xffd23a, 0xffffff];
const SPECIAL = ['ruins', 'bridge', 'rocky'];

function seeded(i) {
  let s = (i * 2654435761) >>> 0;
  s = (s ^ (s >>> 15)) * 2246822519;
  s = (s ^ (s >>> 13)) >>> 0;
  return s / 4294967296;
}

export class Game {
  constructor(canvas, uiRoot) {
    this.canvas = canvas;
    this.params = new URLSearchParams(location.search);
    this.god = this.params.has('god');

    this.renderer = new Renderer(canvas);
    this.audio = new AudioManager();
    this.particles = new ParticleSystem();
    this.player = new Player();
    this.world = new World();
    this.powerups = new PowerUps();
    this.score = new ScoreManager();
    this.collision = new CollisionSystem(this);

    this.player.callbacks = {
      onJump: () => {
        this.audio.jump();
        this.particles.emit(this.playerWorldX() - 10, 6, 6, { color: 0xe8c898, speed: 150, angle: Math.PI, arc: 1.6, life: 0.4, size: 12, gravity: 200 });
      },
      onLand: (impact) => {
        this.audio.land();
        this.particles.emit(this.playerWorldX(), 6, 10, { color: 0xe8c898, speed: 240, angle: Math.PI / 2, arc: 3, life: 0.5, size: 14, gravity: 100 });
        if (impact > 1500) this.shake = Math.max(this.shake, 4);
      },
      onSlide: () => this.audio.slide(),
      onLane: () => this.audio.lane(),
    };

    const hudHandlers = {
      onPause: () => this.pause(),
      onMute: () => this.toggleSound(),
      onAction: (a) => this.handleAction(a),
      isSoundOn: () => this.audio.enabled,
    };
    this.hud = new HUD(uiRoot, hudHandlers);
    this.menu = new Menu(uiRoot, {
      onPlay: () => this.startRun(),
      onResume: () => this.resume(),
      onRestart: () => this.startRun(),
      onMainMenu: () => this.toMenu(),
      onMute: () => this.toggleSound(),
      onVolume: (v) => this.audio.setVolume(v),
      onMusic: () => { this.audio.unlock(); this.audio.music.setEnabled(!this.audio.music.enabled); this.menu.syncSettings(); this.audio.click(); },
      onMusicVolume: (v) => this.audio.music.setVolume(v),
      onQuality: () => this.applyQuality(),
      onClick: () => this.audio.click(),
    });
    this.gameOver = new GameOver(uiRoot, { onRestart: () => this.startRun(), onMainMenu: () => this.toMenu(), onClick: () => this.audio.click() });
    this.input = new InputManager(canvas, (a, src) => this.handleAction(a, src));

    const unlock = () => this.audio.unlock();
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'playing') this.pause();
    });
    window.addEventListener('blur', () => {
      if (this.state === 'playing') this.pause();
    });
    window.addEventListener('resize', () => {
      this.renderer.resize();
      this.world.viewW = this.renderer.viewW;
    });

    this.state = 'menu';
    this.time = 0;
    this.camX = 0;
    this.speed = 0;
    this.speedPx = 0;
    this.combo = 0;
    this.comboT = 0;
    this.lives = CONFIG.player.lives;
    this.slowT = 0;
    this.runTime = 0;
    this.dyingT = 0;
    this.countT = 0;
    this.ambientT = 0;
    this.dustT = 0;
    this.shake = 0;
    this.applyQuality();
    this.toMenu();
    this.clock = performance.now();
    this.frame = this.frame.bind(this);
  }

  start() {
    requestAnimationFrame(this.frame);
  }

  applyQuality() {
    this.renderer.setQuality(store.settings.quality === 'low');
    this.world.viewW = this.renderer.viewW;
  }

  playerWorldX() { return this.camX + V.playerX; }
  heroX() { return this.state === 'menu' ? this.renderer.viewW * 0.7 : V.playerX; }
  heroScale() { return this.state === 'menu' ? 1.55 : 1; }

  toggleSound() {
    this.audio.unlock();
    this.audio.setEnabled(!this.audio.enabled);
    this.hud.setMuteIcon(this.audio.enabled);
    this.menu.syncSettings();
    this.audio.click();
  }

  // ------------------------------------------------------------- states
  resetWorld() {
    this.particles.clear();
    this.player.reset();
    this.powerups.reset();
    this.camX = 0;
    this.world.reset();
    this.world.viewW = this.renderer.viewW;
    this.world.nextX = 700;
    this.world.ensure(0, CONFIG.speed.start, 0);
    this.renderer.biome = this.renderer.prevBiome = 'jungle';
    this.renderer.fade = 1;
  }

  toMenu() {
    this.state = 'menu';
    this.gameOver.hide();
    this.hud.hide();
    this.resetWorld();
    this.player.mode = 'idle';
    this.menu.showTitle();
    this.score.reset();
    this.audio.music.play('menu');
    this.audio.music.setIntensity(0);
  }

  startRun() {
    this.audio.unlock();
    this.gameOver.hide();
    this.menu.hideAll();
    this.menu.hideSoundBtn();
    this.score.reset();
    this.resetWorld();
    this.player.mode = 'run';
    this.lives = CONFIG.player.lives;
    this.combo = this.comboT = 0;
    this.slowT = 0;
    this.runTime = 0;
    this.shake = 0;
    this.speed = CONFIG.speed.start * 0.6;
    this.hud.reset(this.score.best);
    this.hud.show();
    this.hud.toast('GO!', '#4ddc44');
    this.state = 'playing';
    this.audio.music.play('jungle');
    this.audio.music.setIntensity(0);
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.menu.showPause();
    this.audio.click();
    this.audio.music.pause();
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'countdown';
    this.countT = 1.8;
    this.audio.music.resume();
  }

  die() {
    if (this.state !== 'playing') return;
    this.state = 'dying';
    this.dyingT = 0;
    this.player.mode = 'dead';
    this.shake = 14;
    this.audio.hit();
    this.audio.music.stop(0.3);
  }

  finishRun() {
    this.state = 'gameover';
    const records = this.score.commit();
    this.audio.gameOver();
    if (records.score) {
      this.player.mode = 'dance';
      this.player.invuln = 0;
      this.audio.fanfare();
    }
    this.hud.hide();
    this.gameOver.show(this.score, this.score.best, records);
    this.menuMusicT = 3.2;
  }

  handleAction(a) {
    this.audio.unlock();
    const p = this.player;
    switch (this.state) {
      case 'playing':
        if (a === 'jump') p.jump();
        else if (a === 'slide') p.slide();
        else if (a === 'laneUp') p.moveLane(-1);
        else if (a === 'laneDown') p.moveLane(1);
        else if (a === 'pause') this.pause();
        break;
      case 'paused':
        if (a === 'pause') {
          this.menu.hideAll();
          this.resume();
        } else if (a === 'restart') this.startRun();
        break;
      case 'gameover':
        if (a === 'restart' || a === 'confirm') this.startRun();
        else if (a === 'pause') this.toMenu();
        break;
      case 'menu':
        if (a === 'confirm' && !this.menu.howto.offsetParent && !this.menu.settings.offsetParent) this.startRun();
        break;
    }
  }

  // --------------------------------------------------------------- loop
  frame(now) {
    requestAnimationFrame(this.frame);
    const dt = Math.min(0.05, Math.max(0.0001, (now - this.clock) / 1000));
    this.clock = now;
    this.update(dt);
    this.renderer.render(this, dt);
  }

  baseSpeed() {
    const S = CONFIG.speed;
    return S.start + (S.max - S.start) * Math.min(1, this.score.distance / S.distanceToMax);
  }

  biomeAt(distance) {
    const idx = Math.floor(distance / CONFIG.difficulty.biomeLength);
    const D = CONFIG.difficulty;
    const pick = (i) => {
      if (i <= 0) return 'jungle';
      const level = (i * D.biomeLength) / CONFIG.speed.levelEvery;
      const p = Math.min(D.specialBiomeMax, D.specialBiomeBase + level * D.specialBiomePerLevel);
      if (seeded(i) < p) return SPECIAL[Math.floor(seeded(i + 99) * SPECIAL.length)];
      return 'jungle';
    };
    let b = pick(idx);
    if (b !== 'jungle' && b === pick(idx - 1)) b = SPECIAL[(SPECIAL.indexOf(b) + 1) % SPECIAL.length];
    return b;
  }

  update(dt) {
    this.time += dt;
    const p = this.player;
    if (this.state === 'countdown') {
      this.countT -= dt;
      const n = Math.ceil(this.countT / 0.6);
      this.hud.countdown(n > 0 ? n : 'GO');
      if (this.countT <= 0) {
        this.hud.endCountdown();
        this.state = 'playing';
      }
    } else if (this.state === 'playing' || this.state === 'dying') {
      this.step(dt);
    } else if (this.state === 'menu' || this.state === 'gameover') {
      p.update(dt, 0, 0);
      this.world.update(dt, this.worldCtx(0));
      this.particles.update(dt);
      if (this.state === 'menu') this.ambient(dt);
      if (this.state === 'gameover' && this.menuMusicT > 0) {
        this.menuMusicT -= dt;
        if (this.menuMusicT <= 0) this.audio.music.play('menu');
      }
    }
    // screen shake decays
    this.shake = Math.max(0, this.shake - dt * 30);
    const sh = store.settings.shake ? this.shake : 0;
    this.renderer.shakeX = sh ? (Math.random() - 0.5) * sh : 0;
    this.renderer.shakeY = sh ? (Math.random() - 0.5) * sh : 0;
  }

  ambient(dt) {
    this.ambientT -= dt;
    if (this.ambientT > 0) return;
    this.ambientT = 0.15;
    this.particles.emit(this.camX + Math.random() * this.renderer.viewW, 60 + Math.random() * 300, 1, {
      colors: [0xfff2a0, 0xb8ff90], speed: 25, life: 3, size: 6, gravity: -20, spread: 0,
    });
  }

  worldCtx(magnet) {
    return {
      camX: this.camX, speedPx: this.speedPx, player: this.player, playerX: this.playerWorldX(), time: this.time,
      magnet,
      cb: { tick: () => this.audio.tick(), explode: (c) => this.explodeCrate(c) },
    };
  }

  step(dt) {
    const p = this.player;
    const dying = this.state === 'dying';
    if (dying) this.dyingT += dt;
    this.runTime += dt;
    this.slowT = Math.max(0, this.slowT - dt / 2.2);

    const S = CONFIG.speed;
    let speed = this.baseSpeed();
    speed *= 1 - (1 - CONFIG.player.hitSlowdown) * this.slowT;
    speed *= Math.min(1, 0.55 + (this.runTime / 1.6) * 0.45);
    if (dying) speed *= Math.max(0, 1 - this.dyingT / 0.7);
    if (p.falling) speed = 0;
    this.speed = speed;
    this.speedPx = speed * V.pxPerM;

    const ground = this.collision.groundHeight(p, dt);
    p.update(dt, speed, ground);
    this.camX += this.speedPx * dt;
    if (!dying && !p.falling) this.score.addDistance(speed * dt);

    const biome = this.biomeAt(this.score.distance + 160);
    if (this.renderer.setBiome(biome)) this.audio.music.play(biome);
    this.audio.music.setIntensity((speed - S.start) / (S.max - S.start));
    this.particles.lane = p.laneF;
    this.world.ensure(this.camX, Math.max(speed, S.start * 0.8), this.score.distance);
    const magnet = this.powerups.has('magnet') ? CONFIG.powerups.magnet.radius : 0;
    this.world.update(dt, this.worldCtx(magnet));
    this.powerups.update(dt, (k) => {
      this.audio.powerdown();
      this.hud.toast(`${POWERUPS[k].label} ENDED`, '#ffffff', true);
    });

    if (!dying) this.collision.update(p, this.callbacks());
    if (p.falling && p.y < -520) this.fellOut();
    if (this.state === 'dying' && this.dyingT > 1.5) this.finishRun();

    if (this.comboT > 0) {
      this.comboT -= dt;
      if (this.comboT <= 0) this.combo = 0;
    }
    if (p.mode === 'run' && p.grounded && !p.sliding) {
      this.dustT -= dt;
      if (this.dustT <= 0) {
        this.dustT = 0.08;
        this.particles.emit(this.playerWorldX() - 18, 8, 1, { color: 0xe8c898, speed: 90, angle: Math.PI, arc: 1.2, life: 0.45, size: 12, gravity: 120 });
      }
    } else if (p.sliding) {
      this.particles.emit(this.playerWorldX() - 20, 10, 1, { colors: [0xe8c898, 0xffffff], speed: 140, angle: Math.PI, arc: 1, life: 0.4, size: 12, gravity: 120 });
    }

    this.particles.update(dt);
    this.hud.update(dt, {
      score: this.score.score, best: this.score.best, distance: this.score.distance, fruit: this.score.fruit,
      gems: this.score.gems, gemTypes: this.score.gemTypes, level: this.score.level, speed,
      speedRatio: Math.max(0, Math.min(1, (speed - S.start) / (S.max - S.start))), lives: this.lives, timers: this.powerups.timers,
    });
  }

  // ------------------------------------------------------ collision callbacks
  callbacks() {
    if (this._cb) return this._cb;
    this._cb = {
      hit: (o) => this.damage(o.kind),
      smash: (c) => this.smashCrate(c),
      bounce: (c) => this.bounceCrate(c),
      explode: (c) => this.explodeCrate(c),
      collect: (it) => this.collect(it),
      powerup: (it) => this.pickPowerup(it),
      nearMiss: (e) => {
        this.score.add(CONFIG.scoring.nearMiss);
        this.score.nearMisses++;
        this.audio.nearMiss();
        this.particles.pop(this.playerWorldX() + 40, this.player.y + 150, `+${CONFIG.scoring.nearMiss}`, '#35e0d0');
      },
      fall: () => {
        this.audio.fall();
        this.player.fallGap = this.world.gapAt(this.playerWorldX(), 0) || this.world.gapAt(this.playerWorldX() + 40, 0);
      },
    };
    return this._cb;
  }

  sameLane(e) {
    return Math.abs((e.lf ?? e.lane) - this.player.laneF) < 0.62;
  }

  damage(source) {
    const p = this.player;
    if (this.state !== 'playing' || p.invuln > 0 || p.falling || this.god) return;
    const px = this.playerWorldX();
    const cy = p.y + p.h / 2;
    this.particles.lane = p.laneF;
    if (this.powerups.consumeShield()) {
      p.invuln = 1.3;
      this.audio.shieldPop();
      this.particles.ring(px, cy, 0x5ac8ff, 70, 0.5);
      this.particles.emit(px, cy, 18, { colors: [0x5ac8ff, 0xffffff], speed: 420, life: 0.6, size: 12 });
      this.shake = 8;
      this.hud.flash('white');
      this.hud.toast('SHIELD BROKEN!', '#3ab8ff');
      return;
    }
    this.lives--;
    p.hit();
    this.slowT = 1;
    this.audio.hit();
    this.shake = 16;
    this.hud.flash('hit');
    this.particles.stars(px + 20, cy, 10, [0xffd23a, 0xffffff, 0xff8a1e]);
    this.particles.pop(px + 30, p.y + 160, 'OUCH!', '#ff6a4a');
    this.combo = 0;
    if (this.lives <= 0) this.die();
    else if (source === 'boulder') this.hud.toast('BOULDER!', '#ff5a3a', true);
  }

  fellOut() {
    const p = this.player;
    this.lives--;
    this.hud.flash('hit');
    if (this.lives <= 0) {
      p.falling = false;
      this.die();
      return;
    }
    const gap = p.fallGap;
    const landX = gap ? gap.x1 + 150 : this.playerWorldX() + 300;
    this.camX = landX - V.playerX;
    p.y = 80;
    p.vy = 0;
    p.falling = false;
    p.grounded = false;
    p.invuln = 2.2;
    p.hitTimer = 0.4;
    this.slowT = 1;
    this.shake = 10;
    this.audio.hit();
    this.hud.toast('WATCH YOUR STEP!', '#ff5a3a', true);
  }

  smashCrate(c) {
    if (!c.active) return;
    this.world.crates.release(c);
    const cy = c.y0 + c.h / 2;
    this.particles.lane = c.lane;
    this.particles.chunks(c.x, cy, 14, c.kind === 'mystery' ? [0xb583e8, 0x6a3aa8, 0xffd23a] : WOOD, 560);
    this.particles.stars(c.x, cy, 6, [0xffd23a, 0xffffff]);
    this.particles.pop(c.x, cy + 70, ['POW!', 'BAM!', 'SMASH!'][(Math.random() * 3) | 0]);
    this.audio.crate();
    this.shake = Math.max(this.shake, 4);
    this.score.crates++;
    if (c.kind === 'mystery') {
      this.score.add(CONFIG.scoring.mystery);
      this.mysteryReward(c);
    } else {
      this.score.add(CONFIG.scoring.crate);
      this.world.pop(c.x, cy, CONFIG.crates.fruitPerCrate, c.lane);
    }
  }

  mysteryReward(c) {
    const r = Math.random();
    const y = c.y0 + c.h / 2;
    if (r < 0.5) {
      this.world.pop(c.x, y, 8, c.lane);
      this.hud.toast('FRUIT FRENZY!', '#ff8a1e', true);
    } else if (r < 0.68) {
      const type = ['magnet', 'shield', 'multiplier'][(Math.random() * 3) | 0];
      this.world.popItem(type, c.x, y, c.lane);
      this.hud.toast(`${POWERUPS[type].label}!`, POWERUPS[type].css, true);
    } else {
      const kind = r < 0.82 ? 'green' : r < 0.9 ? 'purple' : r < 0.96 ? 'blue' : 'relic';
      this.world.popItem(kind, c.x, y, c.lane);
    }
    this.particles.lane = c.lane;
    this.particles.ring(c.x, y, 0xffd23a, 30, 0.4);
  }

  bounceCrate(c) {
    c.squash = 0.35;
    this.particles.lane = c.lane;
    this.player.bounce(CONFIG.crates.bounceVelocity);
    this.audio.bounce();
    this.shake = Math.max(this.shake, 4);
    this.score.add(CONFIG.scoring.crate);
    this.score.crates++;
    this.world.pop(c.x, c.y0 + c.h, 3, c.lane);
    this.particles.ring(c.x, c.y0 + c.h, 0x7cff5a, 40, 0.45);
    this.particles.emit(c.x, c.y0 + c.h, 10, { colors: [0x7cff5a, 0xffffff], speed: 360, angle: Math.PI / 2, arc: 2.4, life: 0.5, size: 10 });
    this.particles.pop(c.x, c.y0 + c.h + 80, 'BOING!', '#7cff5a');
  }

  explodeCrate(c) {
    if (!c.active) return;
    this.world.crates.release(c);
    const cy = c.y0 + c.h / 2;
    const P = this.particles;
    P.lane = c.lane;
    P.emit(c.x, cy, 34, { colors: FIRE, speed: 520, up: 200, life: 0.7, size: 30, gravity: 300, grow: 0 });
    P.emit(c.x, cy + 20, 14, { colors: [0x444444, 0x666666], speed: 160, up: 300, life: 1.1, size: 34, gravity: -80 });
    P.ring(c.x, cy, 0xffd23a, 40, 0.45);
    P.chunks(c.x, cy, 16, [0xee3a24, 0xa81c0e, 0x4a0a04, 0xf3e6c8], 700);
    P.stars(c.x, cy, 8, [0xffd23a, 0xff8a1e, 0xffffff], 520);
    P.pop(c.x, cy + 110, 'BOOM!', '#ff8a1e');
    this.audio.explosion();
    this.shake = 18;
    const pl = this.player;
    const C = CONFIG.crates;
    if (this.sameLane(c) && Math.abs(this.playerWorldX() - c.x) < C.tntBlastHalfWidth + pl.hw && pl.y < C.tntBlastHeight) this.damage('tnt');
  }

  collect(it) {
    if (!it.active) return;
    const P = this.particles;
    P.lane = it.lf;
    if (it.kind === 'fruit') {
      this.world.items.release(it);
      const mult = this.powerups.has('multiplier') ? CONFIG.powerups.multiplier.factor : 1;
      this.score.addFruit(1, mult);
      this.combo++;
      this.comboT = 0.6;
      this.audio.fruit(this.combo);
      P.emit(it.x, it.y, 6, { colors: [0xff8a1e, 0xffd23a, 0x4ddc44], speed: 220, life: 0.4, size: 9, gravity: 600 });
      return;
    }
    const style = GEM_STYLE[it.kind];
    const pts = CONFIG.scoring.gem[it.kind];
    this.world.items.release(it);
    this.score.addGem(it.kind);
    this.audio.gem(it.kind);
    P.stars(it.x, it.y, it.kind === 'relic' ? 16 : 10, style.particle, 460);
    P.ring(it.x, it.y, style.color, 30, 0.5);
    this.hud.toast(`${style.label}  +${pts}`, '#' + style.color.toString(16).padStart(6, '0'));
    this.hud.flash('white');
    this.shake = Math.max(this.shake, 3);
  }

  pickPowerup(it) {
    const type = it.kind;
    this.world.items.release(it);
    this.powerups.activate(type);
    this.audio.powerup();
    this.particles.lane = it.lf;
    const c = POWERUPS[type];
    this.particles.ring(it.x, it.y, c.color, 40, 0.55);
    this.particles.stars(it.x, it.y, 10, [c.color, 0xffffff], 420);
    this.hud.toast(`${c.label}!`, c.css);
  }
}
