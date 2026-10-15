import { CONFIG, store } from '../config/settings.js';
import { Grid, zoneAt } from './Grid.js';
import { Hero } from './Hero.js';
import { TopRenderer } from './TopRenderer.js';
import { ParticleSystem } from './ParticleSystem.js';
import { ScoreManager } from './ScoreManager.js';
import { AudioManager } from './AudioManager.js';
import { InputManager } from './InputManager.js';
import { PowerUps, POWERUPS, GEM_STYLE } from './PowerUp.js';
import { HUD } from '../ui/HUD.js';
import { Menu } from '../ui/Menu.js';
import { GameOver } from '../ui/GameOver.js';

const V = CONFIG.view;
const T = V.tile;
const G = CONFIG.grid;
const WOOD = [0xd9964e, 0x8a5424, 0xc28a4c, 0xf0d09a];
const ZONE_NAMES = { lagoon: 'LAGOON PIER', jungle: 'JUNGLE', ruins: 'ANCIENT RUINS', rocky: 'ROCKY CANYON' };

export class Game {
  constructor(canvas, uiRoot) {
    this.canvas = canvas;
    this.params = new URLSearchParams(location.search);
    this.god = this.params.has('god');

    this.renderer = new TopRenderer(canvas);
    this.audio = new AudioManager();
    this.particles = new ParticleSystem();
    this.powerups = new PowerUps();
    this.score = new ScoreManager();
    this.grid = new Grid();
    this.hero = new Hero(this);

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
    this.input = new InputManager(canvas, (a, src, data) => this.handleAction(a, src, data));

    const unlock = () => this.audio.unlock();
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'playing') this.pause();
    });
    window.addEventListener('blur', () => {
      if (this.state === 'playing') this.pause();
    });
    window.addEventListener('resize', () => this.renderer.resize());

    this.state = 'menu';
    this.time = 0;
    this.camRow = -V.followRows;
    this.bestRow = 0;
    this.combo = 0;
    this.comboT = 0;
    this.lives = CONFIG.player.lives;
    this.dyingT = 0;
    this.countT = 0;
    this.ambientT = 0;
    this.shake = 0;
    this.scroll = 0;
    this.zone = 'lagoon';
    this.menuMusicT = 0;
    this.applyQuality();
    this.toMenu();
    this.clock = performance.now();
    this.frame = this.frame.bind(this);
  }

  start() {
    requestAnimationFrame(this.frame);
  }

  applyQuality() {
    this.renderer.setStyle(store.settings.style || 'painted');
    document.body.classList.toggle('painted', this.renderer.style === 'painted');
    this.renderer.setQuality(store.settings.quality === 'low');
  }

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
    this.powerups.reset();
    this.grid.reset();
    this.hero.reset();
    this.camRow = -V.followRows;
    this.bestRow = 0;
    this.zone = 'lagoon';
    this.scroll = 0;
  }

  toMenu() {
    this.state = 'menu';
    this.gameOver.hide();
    this.hud.hide();
    this.resetWorld();
    this.hero.x = 2.4;
    this.hero.facing = -1;
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
    this.lives = CONFIG.player.lives;
    this.combo = this.comboT = 0;
    this.shake = 0;
    this.hud.reset(this.score.best);
    this.hud.setBoss(null);
    this.hud.show();
    this.hud.toast('HOP! HOP! HOP!', '#4ddc44');
    this.state = 'playing';
    this.audio.music.play(this.zone);
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

  die(kind) {
    if (this.state !== 'playing') return;
    this.state = 'dying';
    this.dyingT = 0;
    this.hero.dead = true;
    this.hero.buffer.length = 0;
    this.hero.target = null;
    this.shake = 14;
    this.audio.music.stop(0.3);
  }

  finishRun() {
    this.state = 'gameover';
    const records = this.score.commit();
    this.audio.gameOver();
    if (records.score) {
      this.hero.dead = false;
      this.hero.pl.mode = 'dance';
      this.audio.fanfare();
    }
    this.hud.hide();
    this.gameOver.show(this.score, this.score.best, records);
    this.menuMusicT = 3.2;
  }

  handleAction(a, src, data) {
    this.audio.unlock();
    switch (this.state) {
      case 'playing':
        if (a === 'up') this.hero.request(0, 1);
        else if (a === 'down') this.hero.request(0, -1);
        else if (a === 'left') this.hero.request(-1, 0);
        else if (a === 'right') this.hero.request(1, 0);
        else if (a === 'tile') {
          const t = this.renderer.screenToTile(data.x, data.y);
          this.hero.setTarget(t.col, t.row);
        } else if (a === 'pause') this.pause();
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

  get diff() {
    return Math.min(1, this.bestRow / 170);
  }

  update(dt) {
    this.time += dt;
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
      this.grid.time += dt;
      this.hero.update(dt);
      this.particles.update(dt);
      if (this.state === 'menu') this.ambient(dt);
      if (this.state === 'gameover' && this.menuMusicT > 0) {
        this.menuMusicT -= dt;
        if (this.menuMusicT <= 0) this.audio.music.play('menu');
      }
    }
    this.shake = Math.max(0, this.shake - dt * 30);
    const sh = store.settings.shake ? this.shake : 0;
    this.renderer.shakeX = sh ? (Math.random() - 0.5) * sh : 0;
    this.renderer.shakeY = sh ? (Math.random() - 0.5) * sh : 0;
  }

  ambient(dt) {
    this.ambientT -= dt;
    if (this.ambientT > 0) return;
    this.ambientT = 0.18;
    this.particles.lane = (this.camRow + 1 + Math.random() * 6) * T;
    this.particles.emit((Math.random() - 0.5) * this.renderer.viewW, 40 + Math.random() * 120, 1, {
      colors: [0xfff2a0, 0xb8ff90], speed: 20, life: 3, size: 6, gravity: -16, spread: 0,
    });
  }

  step(dt) {
    const dying = this.state === 'dying';
    if (dying) this.dyingT += dt;
    const hero = this.hero;
    this.grid.time += dt;
    hero.update(dt);

    // camera follows forward progress and creeps if you stand still
    const tgt = Math.max(this.camRow, hero.rowF - V.followRows);
    this.camRow += (tgt - this.camRow) * Math.min(1, dt * 7);
    this.scroll = 0;
    if (!dying && hero.idle > G.creepAfter && !hero.hop) {
      this.scroll = Math.min(G.creepMax, G.creepStart + this.diff * 0.55);
      this.camRow += this.scroll * dt;
    }
    if (!dying && !hero.dead && hero.rowF - this.camRow < G.hawkMargin) this.hawk();
    this.grid.prune(Math.floor(this.camRow));

    // zone changes
    const zone = zoneAt(Math.round(this.camRow) + 4);
    if (zone !== this.zone) {
      this.zone = zone;
      this.hud.toast(ZONE_NAMES[zone], '#ffffff', true);
      this.audio.music.play(zone);
    }
    this.audio.music.setIntensity(Math.min(1, this.bestRow / 150));

    // magnet
    if (!dying && this.powerups.has('magnet')) this.magnetPull();

    this.powerups.update(dt, (k) => {
      this.audio.powerdown();
      this.hud.toast(`${POWERUPS[k].label} ENDED`, '#ffffff', true);
      if (k === 'mask') hero.invuln = Math.max(hero.invuln, 0.8);
    });
    if (this.comboT > 0) {
      this.comboT -= dt;
      if (this.comboT <= 0) this.combo = 0;
    }
    this.particles.update(dt);
    if (dying && this.dyingT > 1.5) this.finishRun();

    this.hud.update(dt, {
      score: this.score.score, best: this.score.best, distance: this.score.distance, fruit: this.score.fruit,
      gems: this.score.gems, gemTypes: this.score.gemTypes, level: this.score.level, speed: this.scroll,
      speedRatio: Math.min(1, this.bestRow / 170), lives: this.lives, timers: this.powerups.timers,
      masks: this.powerups.masks, crates: this.score.crates, cratesTotal: this.grid.cratesTotal, zone: ZONE_NAMES[this.zone],
    });
  }

  // ----------------------------------------------------------- events
  onLand(hero) {
    if (hero.row > this.bestRow) {
      this.score.addDistance(hero.row - this.bestRow);
      this.bestRow = hero.row;
    }
    this.particles.lane = hero.row * T;
    this.particles.emit(hero.x * T, 4, 4, { color: 0xe8d8a8, speed: 120, angle: Math.PI / 2, arc: 3, life: 0.35, size: 9, gravity: 100 });
  }

  collectAt(row, hero) {
    const c = hero.col;
    const it = row.items.get(c);
    if (!it || it.taken || Math.abs(hero.x - c) > 0.6) return;
    it.taken = true;
    this.giveItem(it.kind, c, row.r);
  }

  magnetPull() {
    const R = CONFIG.powerups.magnet.radius;
    const hero = this.hero;
    for (let r = hero.row - 2; r <= hero.row + 3; r++) {
      const row = this.grid.row(r);
      for (const [c, it] of row.items) {
        if (it.taken || it.kind !== 'fruit') continue;
        const dx = c - hero.x, dy = r - hero.row;
        if (dx * dx + dy * dy <= R * R) {
          it.taken = true;
          this.giveItem('fruit', c, r);
        }
      }
    }
  }

  giveItem(kind, c, r) {
    const P = this.particles;
    P.lane = r * T;
    const x = c * T;
    if (kind === 'fruit') {
      const mult = this.powerups.has('multiplier') ? CONFIG.powerups.multiplier.factor : 1;
      this.score.addFruit(1, mult);
      this.combo++;
      this.comboT = 0.6;
      this.audio.fruit(this.combo);
      P.emit(x, 34, 6, { colors: [0xff8a1e, 0xffd23a, 0x4ddc44], speed: 220, life: 0.4, size: 9, gravity: 600 });
    } else if (GEM_STYLE[kind]) {
      const style = GEM_STYLE[kind];
      this.score.addGem(kind);
      this.audio.gem(kind);
      P.stars(x, 40, kind === 'relic' ? 16 : 10, style.particle, 420);
      P.ring(x, 34, style.color, 26, 0.5);
      this.hud.toast(`${style.label}  +${CONFIG.scoring.gem[kind]}`, '#' + style.color.toString(16).padStart(6, '0'));
      this.hud.flash('white');
    } else {
      const res = this.powerups.activate(kind);
      const info = POWERUPS[kind];
      P.ring(x, 34, info.color, 30, 0.5);
      P.stars(x, 40, 8, [info.color, 0xffffff], 380);
      if (kind === 'mask') {
        this.audio.maskGet(res === 'power');
        if (res === 'power') this.hud.toast('MASK POWER! INVINCIBLE', '#ffd23a');
        else this.hud.toast(`MASK ${this.powerups.masks}/${CONFIG.powerups.mask.needed}`, '#ffd23a', true);
      } else {
        this.audio.powerup();
        this.hud.toast(`${info.label}!`, info.css);
      }
    }
  }

  // hop into a breakable crate
  smashTile(row, c) {
    const t = row.tiles.get(c);
    if (!t) return;
    row.tiles.delete(c);
    const kind = t.kind.slice(6);
    const P = this.particles;
    P.lane = row.r * T;
    const x = c * T;
    P.chunks(x, 40, 12, kind === 'mystery' ? [0xb583e8, 0x6a3aa8, 0xffd23a] : WOOD, 480);
    P.stars(x, 40, 5, [0xffd23a, 0xffffff]);
    P.pop(x, 90, ['POW!', 'BAM!', 'SMASH!'][(Math.random() * 3) | 0]);
    this.audio.crate();
    this.shake = Math.max(this.shake, 3);
    this.score.crates++;
    if (kind === 'mystery') {
      this.score.add(CONFIG.scoring.mystery);
      const r = Math.random();
      if (r < 0.45) {
        const mult = this.powerups.has('multiplier') ? 2 : 1;
        this.score.addFruit(8, mult);
        this.hud.toast('FRUIT FRENZY!', '#ff8a1e', true);
      } else if (r < 0.7) this.giveItem('mask', c, row.r);
      else if (r < 0.88) this.giveItem('green', c, row.r);
      else this.giveItem(r < 0.96 ? 'purple' : 'blue', c, row.r);
    } else {
      this.score.add(CONFIG.scoring.crate);
      const mult = this.powerups.has('multiplier') ? 2 : 1;
      this.score.addFruit(CONFIG.crates.fruitPerCrate, mult);
      this.audio.fruit(3);
    }
  }

  // something dangerous touched the hero
  hurt(kind) {
    const hero = this.hero;
    if (this.state !== 'playing' || hero.invuln > 0 || hero.dead || this.god) return;
    const P = this.particles;
    P.lane = hero.row * T;
    const x = hero.x * T;
    const res = this.powerups.consumeMask();
    if (res === 'immune') return;
    if (res === 'absorbed') {
      hero.invuln = 1.6;
      this.audio.maskBreak();
      P.ring(x, 50, 0xffd23a, 40, 0.5);
      P.stars(x, 60, 12, [0xffd23a, 0xff8a1e, 0xffffff], 420);
      this.shake = 8;
      this.hud.flash('white');
      this.hud.toast('MASK LOST!', '#ffd23a', true);
      // the mask pushes you out of harm's way when you were in the water
      if (kind === 'water' || kind === 'drift') this.rescue();
      return;
    }
    this.lives--;
    this.combo = 0;
    this.shake = 14;
    this.hud.flash('hit');
    if (kind === 'water' || kind === 'drift') {
      this.audio.splash();
      P.emit(x, 20, 22, { colors: [0xbfe4ff, 0x5ab4ff, 0xffffff], speed: 360, up: 300, life: 0.7, size: 12, gravity: 900 });
      P.ring(x, 8, 0xffffff, 20, 0.5);
      P.pop(x, 110, 'SPLASH!', '#7fd0ff');
    } else {
      this.audio.squash();
      this.audio.hit();
      P.stars(x, 50, 12, [0xffd23a, 0xffffff, 0xff8a1e], 420);
      P.pop(x, 110, kind === 'train' ? 'WHOOSH!' : 'SPLAT!', '#ff6a4a');
    }
    if (this.lives <= 0) {
      hero.pl.hitTimer = 1;
      this.die(kind);
    } else {
      this.rescue();
    }
  }

  // put the hero back on the last safe grass tile (or the nearest one still on screen)
  rescue() {
    const hero = this.hero, grid = this.grid;
    let { x, row } = hero.lastSafe;
    const minRow = Math.ceil(this.camRow + 0.9);
    if (row < minRow) {
      row = minRow;
      while (grid.row(row).type !== 'grass') row++;
      const tiles = grid.row(row).tiles;
      x = 0;
      for (let d = 0; d <= G.half; d++) {
        if (!tiles.has(Math.round(hero.x) + d) && Math.abs(Math.round(hero.x) + d) <= G.half) { x = Math.round(hero.x) + d; break; }
        if (!tiles.has(Math.round(hero.x) - d) && Math.abs(Math.round(hero.x) - d) <= G.half) { x = Math.round(hero.x) - d; break; }
      }
    }
    hero.respawn(x, row);
    hero.lastSafe = { x, row };
  }

  hawk() {
    if (this.state !== 'playing') return;
    this.audio.hawk();
    this.hud.toast('A HAWK GRABBED YOU!', '#ff6a4a');
    this.hud.flash('hit');
    const P = this.particles;
    P.lane = this.hero.row * T;
    P.emit(this.hero.x * T, 60, 18, { colors: [0xd8c8a8, 0xffffff, 0x8a6a4a], speed: 300, up: 200, life: 0.9, size: 12, gravity: 300 });
    this.lives = 0;
    this.die('hawk');
  }
}
