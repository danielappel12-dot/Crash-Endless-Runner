import * as THREE from 'three';
import { CONFIG, store } from '../config/settings.js';
import { createMaterials } from '../world/Materials.js';
import { buildHills } from '../world/JungleGenerator.js';
import { Player } from './Player.js';
import { CameraController } from './CameraController.js';
import { TrackManager } from './TrackManager.js';
import { ObstacleManager } from './ObstacleManager.js';
import { CrateManager } from './Crate.js';
import { CollectibleManager, GEM_STYLE } from './Collectible.js';
import { PowerUpManager, POWERUPS } from './PowerUp.js';
import { CollisionSystem } from './CollisionSystem.js';
import { ParticleSystem } from './ParticleSystem.js';
import { ScoreManager } from './ScoreManager.js';
import { AudioManager } from './AudioManager.js';
import { InputManager } from './InputManager.js';
import { HUD } from '../ui/HUD.js';
import { Menu } from '../ui/Menu.js';
import { GameOver } from '../ui/GameOver.js';

const FOG = 0xe4e6b0;
const WOOD = [0xc98a4a, 0x8a5424, 0xa8743c, 0xe0b980];
const METAL = [0x9fb0bc, 0x6e7f8c, 0xffcf2a];
const FIRE = [0xff4a1a, 0xff8a1e, 0xffd23a, 0xffffff];

export class Game {
  constructor(canvas, uiRoot) {
    this.canvas = canvas;
    this.params = new URLSearchParams(location.search);
    this.god = this.params.has('god');

    // ---------------- renderer / scene
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(FOG);
    this.scene.fog = new THREE.Fog(FOG, 70, 240);
    this.camera = new THREE.PerspectiveCamera(62, 1, 0.1, 700);
    this.scene.add(this.camera);

    const hemi = new THREE.HemisphereLight(0xdff4ff, 0x8a6a3a, 1.05);
    const sun = new THREE.DirectionalLight(0xffe0a0, 2.0);
    sun.position.set(-8, 14, 6);
    this.scene.add(hemi, sun);

    this.mats = createMaterials();
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(400, 16, 10), this.mats.sky);
    this.sky.renderOrder = -10;
    this.sky.frustumCulled = false;
    this.scene.add(this.sky);
    const hills = buildHills(this.mats);
    this.hills = hills.hills;
    this.sun = hills.sun;
    this.sunHalo = new THREE.Mesh(new THREE.CircleGeometry(80, 24), new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.25, fog: false, depthWrite: false }));
    this.scene.add(hills.group, this.sunHalo);

    // ---------------- systems
    this.audio = new AudioManager();
    this.particles = new ParticleSystem(this.scene);
    this.player = new Player(this.scene, this.mats.shadow);
    this.obstacles = new ObstacleManager(this.scene, this.mats);
    this.crates = new CrateManager(this.scene, this.mats);
    this.collectibles = new CollectibleManager(this.scene, this.mats);
    this.powerups = new PowerUpManager(this.scene, this.player.root);
    this.track = new TrackManager(this.scene, this.mats, {
      obstacles: this.obstacles, crates: this.crates, collectibles: this.collectibles, powerups: this.powerups,
    });
    this.cam = new CameraController(this.camera);
    this.score = new ScoreManager();
    this.collision = new CollisionSystem(this);

    this.player.callbacks = {
      onJump: () => {
        this.audio.jump();
        this.particles.emit(this.player.x, 0.15, this.player.z, 6, { color: 0xd8b078, speed: 1.5, up: 0.8, life: 0.4, size: 0.4, gravity: 2 });
      },
      onLand: (impact) => {
        this.audio.land();
        this.particles.emit(this.player.x, 0.12, this.player.z, 10, { color: 0xd8b078, speed: 2.4, up: 0.6, life: 0.5, size: 0.45, gravity: 2 });
        if (impact > 20) this.cam.addShake(0.1);
      },
      onSlide: () => this.audio.slide(),
      onLane: () => this.audio.lane(),
    };

    // ---------------- UI
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
    window.addEventListener('resize', () => this.resize());

    // ---------------- state
    this.state = 'menu';
    this.time = 0;
    this.combo = 0;
    this.comboT = 0;
    this.lives = CONFIG.player.lives;
    this.slowT = 0;
    this.runTime = 0;
    this.dyingT = 0;
    this.countT = 0;
    this.ambientT = 0;
    this.dustT = 0;
    this.speed = 0;
    this.applyQuality();
    this.toMenu();
    this.clock = performance.now();
    this.frame = this.frame.bind(this);
  }

  start() {
    requestAnimationFrame(this.frame);
  }

  // ------------------------------------------------------------ plumbing
  applyQuality() {
    const low = store.settings.quality === 'low';
    this.pixelRatio = low ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.resize();
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.cam.baseFov = this.camera.aspect < 1 ? 62 + (1 - this.camera.aspect) * 30 : 62;
    this.camera.updateProjectionMatrix();
    this.particles.setViewport(h * this.pixelRatio, this.camera.fov);
  }

  toggleSound() {
    this.audio.unlock();
    this.audio.setEnabled(!this.audio.enabled);
    this.hud.setMuteIcon(this.audio.enabled);
    this.menu.syncSettings();
    this.audio.click();
  }

  // -------------------------------------------------------------- states
  resetWorld() {
    this.obstacles.reset();
    this.crates.reset();
    this.collectibles.reset();
    this.powerups.reset();
    this.particles.clear();
    this.player.reset();
    this.track.reset();
  }

  toMenu() {
    this.state = 'menu';
    this.gameOver.hide();
    this.hud.hide();
    this.resetWorld();
    this.player.mode = 'idle';
    this.cam.mode = 'menu';
    this.cam.zoom = 0;
    this.menu.showTitle();
    this.score.reset();
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
    this.speed = CONFIG.speed.start * 0.6;
    this.cam.mode = 'run';
    this.cam.zoom = 0;
    this.cam.snap(this.player);
    this.camera.fov = this.cam.baseFov;
    this.hud.reset(this.score.best);
    this.hud.show();
    this.hud.toast('GO!', '#4ddc44');
    this.state = 'playing';
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.menu.showPause();
    this.audio.click();
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'countdown';
    this.countT = 1.8;
  }

  die() {
    if (this.state !== 'playing') return;
    this.state = 'dying';
    this.dyingT = 0;
    this.player.mode = 'dead';
    this.cam.addShake(0.7);
    this.audio.hit();
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
  }

  handleAction(a) {
    this.audio.unlock();
    const p = this.player;
    switch (this.state) {
      case 'playing':
        if (a === 'left') p.moveLane(-1);
        else if (a === 'right') p.moveLane(1);
        else if (a === 'jump') p.jump();
        else if (a === 'slide') p.slide();
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

  // ---------------------------------------------------------------- loop
  frame(now) {
    requestAnimationFrame(this.frame);
    const dt = Math.min(0.05, Math.max(0.0001, (now - this.clock) / 1000));
    this.clock = now;
    this.update(dt);
    this.renderer.render(this.scene, this.camera);
  }

  baseSpeed() {
    const S = CONFIG.speed;
    return S.start + (S.max - S.start) * Math.min(1, this.score.distance / S.distanceToMax);
  }

  update(dt) {
    this.time += dt;
    const p = this.player;
    this.particles.setViewport(this.renderer.domElement.height, this.camera.fov);

    if (this.state === 'countdown') {
      this.countT -= dt;
      const n = Math.ceil(this.countT / 0.6);
      this.hud.countdown(n > 0 ? n : 'GO');
      if (this.countT <= 0) {
        this.hud.endCountdown();
        this.state = 'playing';
      }
      this.cam.update(0.0001, p, 0);
    } else if (this.state === 'playing' || this.state === 'dying') {
      this.step(dt);
    } else if (this.state === 'menu' || this.state === 'gameover') {
      p.update(dt, 0, 0);
      this.collectibles.update(dt, this.time, p, 0);
      this.crates.update(dt, p.z + 99999, 0, { tick() {}, explode() {} }); // idle animations only
      this.powerups.update(dt, this.time, p.z, null);
      this.obstacles.update(dt, p.z + 99999, this.time);
      this.particles.update(dt);
      if (this.state === 'menu') this.ambient(dt);
      if (this.state === 'gameover') this.cam.zoom = Math.min(1, this.cam.zoom + dt);
      this.cam.update(dt, p, 0);
    }
    // paused: freeze everything

    // background follows the camera
    const cp = this.camera.position;
    this.sky.position.copy(cp);
    this.sun.position.set(cp.x - 90, cp.y + 110, cp.z - 380);
    this.sunHalo.position.set(cp.x - 90, cp.y + 110, cp.z - 379);
    this.hills.position.z = p.z * 0.9 + 120;
    this.hills.position.x = 0;
    this.sun.lookAt(cp);
    this.sunHalo.lookAt(cp);
  }

  ambient(dt) {
    this.ambientT -= dt;
    if (this.ambientT > 0) return;
    this.ambientT = 0.12;
    const p = this.player;
    this.particles.emit(p.x + (Math.random() - 0.5) * 12, 0.5 + Math.random() * 3, p.z + (Math.random() - 0.5) * 12, 1, {
      colors: [0xfff2a0, 0xb8ff90], speed: 0.4, up: 0.2, life: 3, size: 0.14, gravity: -0.1, spread: 0,
    });
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
    speed *= Math.min(1, 0.55 + this.runTime / 1.6 * 0.45);
    if (dying) speed *= Math.max(0, 1 - this.dyingT / 0.7);
    if (p.falling) speed = 0;
    this.speed = speed;

    const ground = this.collision.groundHeight(p, dt);
    p.update(dt, speed, ground);
    if (!dying && !p.falling) this.score.addDistance(speed * dt);

    this.track.update(p.z);
    const magnet = this.powerups.has('magnet') ? CONFIG.powerups.magnet.radius : 0;
    this.obstacles.update(dt, p.z, this.time);
    this.crates.update(dt, p.z, speed, {
      tick: () => this.audio.tick(),
      explode: (c) => this.explodeCrate(c),
    });
    this.collectibles.update(dt, this.time, p, magnet);
    this.powerups.update(dt, this.time, p.z, (k) => {
      this.audio.powerdown();
      this.hud.toast(`${POWERUPS[k].label} ENDED`, '#ffffff', true);
    });

    if (!dying) this.collision.update(p, this.callbacks());

    if (p.falling && p.y < -7) this.fellOut();
    if (this.state === 'dying' && this.dyingT > 1.5) this.finishRun();

    // combo timer
    if (this.comboT > 0) {
      this.comboT -= dt;
      if (this.comboT <= 0) this.combo = 0;
    }
    // footstep dust
    if (p.mode === 'run' && p.grounded && !p.sliding) {
      this.dustT -= dt;
      if (this.dustT <= 0) {
        this.dustT = 0.09;
        this.particles.emit(p.x, 0.1, p.z + 0.4, 1, { color: 0xd8b078, speed: 0.6, up: 0.5, life: 0.45, size: 0.3, gravity: 0.5 });
      }
    } else if (p.sliding) {
      this.particles.emit(p.x, 0.15, p.z + 0.4, 1, { colors: [0xd8b078, 0xffffff], speed: 1, up: 0.6, life: 0.4, size: 0.3, gravity: 0.5 });
    }

    this.particles.update(dt);
    this.cam.update(dt, p, (speed - S.start) / (S.max - S.start));
    this.hud.update(dt, {
      score: this.score.score, best: this.score.best, distance: this.score.distance, fruit: this.score.fruit,
      gems: this.score.gems, gemTypes: this.score.gemTypes, level: this.score.level, speed,
      speedRatio: Math.max(0, Math.min(1, (speed - S.start) / (S.max - S.start))), lives: this.lives, timers: this.powerups.timers,
    });
  }

  // ---------------------------------------------------- collision callbacks
  callbacks() {
    if (this._cb) return this._cb;
    this._cb = {
      hit: (o) => this.damage(o.type || o.kind),
      smash: (c) => this.smashCrate(c),
      bounce: (c) => this.bounceCrate(c),
      explode: (c) => this.explodeCrate(c),
      collect: (it) => this.collect(it),
      powerup: (it) => this.pickPowerup(it),
      nearMiss: (e) => {
        this.score.add(CONFIG.scoring.nearMiss);
        this.score.nearMisses++;
        this.audio.nearMiss();
        this.hud.toast(`CLOSE CALL +${CONFIG.scoring.nearMiss}`, '#2fd8c8', true);
      },
      fall: () => {
        this.audio.fall();
        this.player.fallGap = this.track.gapAt(this.player.z, 0) || this.track.gapAt(this.player.z + 2, 0);
      },
    };
    return this._cb;
  }

  damage(source) {
    const p = this.player;
    if (this.state !== 'playing' || p.invuln > 0 || p.falling || this.god) return;
    if (this.powerups.consumeShield()) {
      p.invuln = 1.3;
      this.audio.shieldPop();
      this.particles.ring(p.x, 0.9, p.z, 24, { color: 0x5ac8ff, speed: 8, life: 0.5, size: 0.5 });
      this.particles.emit(p.x, 0.9, p.z, 20, { colors: [0x5ac8ff, 0xffffff], speed: 6, life: 0.6, size: 0.35 });
      this.cam.addShake(0.25);
      this.hud.flash('white');
      this.hud.toast('SHIELD BROKEN!', '#3ab8ff');
      return;
    }
    this.lives--;
    p.hit();
    this.slowT = 1;
    this.audio.hit();
    this.cam.addShake(0.6);
    this.hud.flash('hit');
    this.particles.emit(p.x, 1.0, p.z, 18, { colors: [0xffd23a, 0xffffff, 0xff8a1e], speed: 5, up: 3, life: 0.6, size: 0.4 });
    this.combo = 0;
    if (this.lives <= 0) this.die();
    else this.hud.toast(source === 'boulder' ? 'BOULDER!' : 'OUCH!', '#ff5a3a', true);
  }

  fellOut() {
    const p = this.player;
    this.lives--;
    this.hud.flash('hit');
    if (this.lives <= 0 || this.god && false) {
      p.falling = false;
      this.die();
      return;
    }
    // respawn beyond the far edge of the ravine we fell into
    const gap = p.fallGap;
    const z = gap ? gap.z2 - 2.5 : p.z - 8;
    p.z = z;
    p.prevZ = z;
    p.y = 0.2;
    p.vy = 0;
    p.falling = false;
    p.grounded = false;
    p.invuln = 2.2;
    p.hitTimer = 0.4;
    this.slowT = 1;
    this.cam.addShake(0.4);
    this.audio.hit();
    this.hud.toast('WATCH YOUR STEP!', '#ff5a3a', true);
  }

  smashCrate(c) {
    if (!c.active) return;
    c.pool.release(c);
    const p = this.particles;
    p.chunks(c.x, 0.7, c.z, 14, c.kind === 'mystery' ? [0xa874d8, 0x6a3aa8, 0xffd23a] : WOOD, 7);
    p.emit(c.x, 0.7, c.z, 10, { color: 0xe8d8b0, speed: 3, up: 1.5, life: 0.5, size: 0.5, gravity: 2 });
    this.audio.crate();
    this.cam.addShake(0.12);
    this.score.crates++;
    if (c.kind === 'mystery') {
      this.score.add(CONFIG.scoring.mystery);
      this.mysteryReward(c);
    } else {
      this.score.add(CONFIG.scoring.crate);
      this.collectibles.pop(c.x, 1.0, c.z, CONFIG.crates.fruitPerCrate);
    }
  }

  mysteryReward(c) {
    const r = Math.random();
    const y = 1.1;
    if (r < 0.5) {
      this.collectibles.pop(c.x, y, c.z, 8);
      this.hud.toast('FRUIT FRENZY!', '#ff8a1e', true);
    } else if (r < 0.68) {
      const type = ['magnet', 'shield', 'multiplier'][(Math.random() * 3) | 0];
      this.powerups.spawn(type, c.x, y, c.z - 2.5);
      this.hud.toast(`${POWERUPS[type].label}!`, POWERUPS[type].css, true);
    } else {
      const kind = r < 0.82 ? 'green' : r < 0.9 ? 'purple' : r < 0.96 ? 'blue' : 'relic';
      this.collectibles.popGem(kind, c.x, y, c.z);
    }
    this.particles.ring(c.x, 0.9, c.z, 14, { color: 0xffd23a, speed: 5, life: 0.4, size: 0.4 });
  }

  bounceCrate(c) {
    c.squash = 0.35;
    this.player.bounce(CONFIG.crates.bounceVelocity);
    this.audio.bounce();
    this.cam.addShake(0.1);
    this.score.add(CONFIG.scoring.crate);
    this.score.crates++;
    this.collectibles.pop(c.x, 1.6, c.z, 3);
    this.particles.ring(c.x, 1.4, c.z, 16, { color: 0x7cff5a, speed: 6, life: 0.45, size: 0.45 });
    this.particles.emit(c.x, 1.5, c.z, 10, { colors: [0x7cff5a, 0xffffff], speed: 4, up: 3, life: 0.5, size: 0.35 });
  }

  explodeCrate(c) {
    if (!c.active) return;
    c.pool.release(c);
    const p = this.particles;
    p.emit(c.x, 0.9, c.z, 50, { colors: FIRE, speed: 9, up: 4, life: 0.8, size: 1.1, gravity: 4, grow: 1.5 });
    p.emit(c.x, 1.2, c.z, 24, { colors: [0x333333, 0x555555], speed: 3, up: 5, life: 1.2, size: 1.3, gravity: -1, grow: 1.2 });
    p.ring(c.x, 0.4, c.z, 24, { color: 0xffd23a, speed: 10, life: 0.4, size: 0.6 });
    p.chunks(c.x, 0.9, c.z, 20, [0xd8321e, 0xa81c0e, 0x4a0a04, 0xf3e6c8], 11);
    this.audio.explosion();
    this.cam.addShake(0.55);
    const pl = this.player;
    const C = CONFIG.crates;
    const dx = Math.abs(pl.x - c.x);
    const dz = Math.abs(pl.z - c.z);
    if (dx < C.tntBlastHalfWidth + pl.hw && dz < C.tntBlastHalfDepth + pl.hd && pl.y < C.tntBlastHeight) this.damage('tnt');
  }

  collect(it) {
    if (!it.active) return;
    const p = this.particles;
    if (it.kind === 'fruit') {
      it.pool.release(it);
      const mult = this.powerups.has('multiplier') ? CONFIG.powerups.multiplier.factor : 1;
      this.score.addFruit(1, mult);
      this.combo++;
      this.comboT = 0.6;
      this.audio.fruit(this.combo);
      p.emit(it.x, it.y, it.z, 7, { colors: [0xff8a1e, 0xffd23a, 0x4ddc44], speed: 3, up: 1.5, life: 0.4, size: 0.3, gravity: 3 });
      return;
    }
    const style = GEM_STYLE[it.kind];
    const pts = CONFIG.scoring.gem[it.kind];
    it.pool.release(it);
    this.score.addGem(it.kind);
    this.audio.gem(it.kind);
    p.emit(it.x, it.y, it.z, it.kind === 'relic' ? 60 : 34, { colors: style.particle, speed: 7, up: 3, life: 0.9, size: 0.45, gravity: 4 });
    p.ring(it.x, it.y, it.z, 20, { color: style.color, speed: 7, life: 0.5, size: 0.5 });
    this.hud.toast(`${style.label}  +${pts}`, '#' + style.color.toString(16).padStart(6, '0'));
    this.hud.flash('white');
    this.cam.addShake(0.08);
  }

  pickPowerup(it) {
    const type = it.type;
    it.pool.release(it);
    this.powerups.activate(type);
    this.audio.powerup();
    const c = POWERUPS[type];
    this.particles.ring(it.x, it.y, it.z, 24, { color: c.color, speed: 7, life: 0.55, size: 0.55 });
    this.particles.emit(it.x, it.y, it.z, 26, { colors: [c.color, 0xffffff], speed: 6, up: 3, life: 0.7, size: 0.4, gravity: 3 });
    this.hud.toast(`${c.label}!`, c.css);
  }
}
