import { store, persist } from '../config/settings.js';

// Title screen, how-to-play, settings and pause overlays.
export class Menu {
  constructor(root, h) {
    this.h = h;
    this.root = root;
    this.title = this.make('div', 'title-wrap hidden', `
      <h1 class="logo">WUMPA<span>RUSH</span></h1>
      <div class="tagline">RUN WILD. SMASH EVERYTHING.</div>
      <div class="menu-btns">
        <button class="btn green" data-a="play">Play</button>
        <button class="btn" data-a="howto">How to Play</button>
        <button class="btn blue" data-a="settings">Settings</button>
      </div>
      <div class="best-line" data-k="best"></div>`);
    this.howto = this.make('div', 'screen dim hidden', `
      <div class="card">
        <h2>HOW TO PLAY</h2>
        <p>Rukk the marsupial sprints automatically through the jungle. Collect <b>Wumpa Fruit</b>, smash crates, grab gems and survive as long as you can!</p>
        <h3>CONTROLS</h3>
        <div class="keys">
          <div><kbd>W</kbd><kbd>↑</kbd></div><div>Move to the lane behind</div>
          <div><kbd>S</kbd><kbd>↓</kbd></div><div>Move to the lane in front</div>
          <div><kbd>Space</kbd><kbd>D</kbd><kbd>→</kbd></div><div>Jump (land on bouncy crates to launch!)</div>
          <div><kbd>A</kbd><kbd>←</kbd><kbd>Shift</kbd></div><div>Slide (hold to keep sliding; in mid-air: dive)</div>
          <div><kbd>Esc</kbd></div><div>Pause</div>
          <div><kbd>R</kbd></div><div>Restart after game over</div>
          <div>Touch</div><div>Swipe up/down = change lane · tap right = jump · tap left = slide · or use the buttons</div>
        </div>
        <h3>HAZARDS</h3>
        <ul>
          <li>The track has <b>3 lanes</b>. Hazards never block all of them: dodge sideways or jump.</li>
          <li><b>Logs, rocks &amp; barricades</b> – change lane or jump. Hop onto logs and iron crates.</li>
          <li><b>Low branches</b> – slide under or change lane. <b>Ravines</b> – jump across (every lane).</li>
          <li><b>Rolling boulders</b> – a red ! shows the lane they come down. Dodge or jump.</li>
          <li><b>TNT crates</b> light a fuse as you approach – leave the lane or jump the blast!</li>
        </ul>
        <h3>GOODIES</h3>
        <ul>
          <li>Fruit crates and <b>?</b> mystery crates burst into fruit. Green arrow crates bounce you sky-high.</li>
          <li>Gems: <b style="color:#2cff7a">green</b>, <b style="color:#b04cff">purple</b>, <b style="color:#3ca8ff">blue</b> and the legendary <b style="color:#ffcf2a">golden relic</b>.</li>
          <li>Power-ups: <b>Magnet</b> pulls fruit, <b>Shield</b> absorbs a hit, <b>x2</b> doubles fruit.</li>
          <li>You have 3 hearts. A hit gives a short grace period.</li>
        </ul>
        <div class="row"><button class="btn small" data-a="back">Back</button></div>
      </div>`);
    this.settings = this.make('div', 'screen dim hidden', `
      <div class="card" style="min-width:min(480px,92vw)">
        <h2>SETTINGS</h2>
        <div class="setting"><label>ALL SOUND</label><button class="toggle" data-k="sound"></button></div>
        <div class="setting"><label>SFX VOLUME</label><input type="range" min="0" max="1" step="0.05" data-k="volume"></div>
        <div class="setting"><label>MUSIC</label><button class="toggle" data-k="music"></button></div>
        <div class="setting"><label>MUSIC VOLUME</label><input type="range" min="0" max="1" step="0.05" data-k="musicVolume"></div>
        <div class="setting"><label>SWIPE SENSITIVITY</label><input type="range" min="0.5" max="2" step="0.1" data-k="swipe"></div>
        <div class="setting"><label>CAMERA SHAKE</label><button class="toggle" data-k="shake"></button></div>
        <div class="setting"><label>GRAPHICS</label><select class="toggle" data-k="quality"><option value="high">HIGH</option><option value="low">LOW</option></select></div>
        <div class="setting"><label>BEST SCORES</label><button class="toggle" data-a="reset">RESET</button></div>
        <div class="row"><button class="btn small" data-a="back">Back</button></div>
      </div>`);
    this.pause = this.make('div', 'screen dim hidden', `
      <div class="card" style="text-align:center">
        <h2>PAUSED</h2>
        <div class="menu-btns" style="align-items:center">
          <button class="btn green" data-a="resume">Resume</button>
          <button class="btn" data-a="restart">Restart</button>
          <button class="btn blue" data-a="psettings">Settings</button>
          <button class="btn small" data-a="menu">Main Menu</button>
        </div>
      </div>`);
    this.sound = document.createElement('button');
    this.sound.className = 'round-btn sound-btn hidden';
    this.sound.addEventListener('click', () => h.onMute());
    root.appendChild(this.sound);

    this.from = 'title';
    for (const scr of [this.title, this.howto, this.settings, this.pause]) {
      scr.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => this.act(b.dataset.a)));
    }
    // settings controls
    const q = (k) => this.settings.querySelector(`[data-k="${k}"]`);
    this.ctl = { sound: q('sound'), volume: q('volume'), music: q('music'), musicVolume: q('musicVolume'), swipe: q('swipe'), shake: q('shake'), quality: q('quality') };
    this.ctl.sound.addEventListener('click', () => h.onMute());
    this.ctl.volume.addEventListener('input', () => h.onVolume(parseFloat(this.ctl.volume.value)));
    this.ctl.music.addEventListener('click', () => h.onMusic());
    this.ctl.musicVolume.addEventListener('input', () => h.onMusicVolume(parseFloat(this.ctl.musicVolume.value)));
    this.ctl.swipe.addEventListener('input', () => {
      store.settings.swipe = parseFloat(this.ctl.swipe.value);
      persist();
    });
    this.ctl.shake.addEventListener('click', () => {
      store.settings.shake = !store.settings.shake;
      persist();
      this.syncSettings();
    });
    this.ctl.quality.addEventListener('change', () => {
      store.settings.quality = this.ctl.quality.value;
      persist();
      h.onQuality();
    });
    this.syncSettings();
  }

  make(tag, cls, html) {
    const e = document.createElement(tag);
    e.className = cls;
    e.innerHTML = html;
    this.root.appendChild(e);
    return e;
  }

  act(a) {
    this.h.onClick();
    switch (a) {
      case 'play': this.hideAll(); this.h.onPlay(); break;
      case 'howto': this.hideAll(); this.howto.classList.remove('hidden'); this.from = 'title'; break;
      case 'settings': this.hideAll(); this.syncSettings(); this.settings.classList.remove('hidden'); this.from = 'title'; break;
      case 'psettings': this.hideAll(); this.syncSettings(); this.settings.classList.remove('hidden'); this.from = 'pause'; break;
      case 'back': this.hideAll(); this.from === 'pause' ? this.showPause() : this.showTitle(); break;
      case 'resume': this.hideAll(); this.h.onResume(); break;
      case 'restart': this.hideAll(); this.h.onRestart(); break;
      case 'menu': this.hideAll(); this.h.onMainMenu(); break;
      case 'reset':
        store.best = { score: 0, distance: 0, gems: 0, fruit: 0 };
        persist();
        this.updateBest();
        break;
    }
  }

  syncSettings() {
    const s = store.settings;
    this.ctl.sound.textContent = s.sound ? 'ON' : 'OFF';
    this.ctl.sound.classList.toggle('on', s.sound);
    this.ctl.shake.textContent = s.shake ? 'ON' : 'OFF';
    this.ctl.shake.classList.toggle('on', s.shake);
    this.ctl.volume.value = s.volume;
    this.ctl.music.textContent = s.music ? 'ON' : 'OFF';
    this.ctl.music.classList.toggle('on', s.music);
    this.ctl.musicVolume.value = s.musicVolume;
    this.ctl.swipe.value = s.swipe;
    this.ctl.quality.value = s.quality;
    this.sound.textContent = s.sound ? '🔊' : '🔇';
  }

  updateBest() {
    const b = store.best;
    this.title.querySelector('[data-k="best"]').textContent = b.score
      ? `BEST SCORE ${b.score.toLocaleString('en-US')}  ·  ${b.distance} m  ·  ${b.gems} GEMS`
      : 'NO RUNS YET — GO SET A RECORD!';
  }

  hideAll() {
    for (const s of [this.title, this.howto, this.settings, this.pause]) s.classList.add('hidden');
  }

  showTitle() {
    this.hideAll();
    this.updateBest();
    this.title.classList.remove('hidden');
    this.sound.classList.remove('hidden');
  }
  showPause() {
    this.hideAll();
    this.pause.classList.remove('hidden');
  }
  hideSoundBtn() { this.sound.classList.add('hidden'); }
  isOpen() { return [this.title, this.howto, this.settings, this.pause].some((s) => !s.classList.contains('hidden')); }
}
