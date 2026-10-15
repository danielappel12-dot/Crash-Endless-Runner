import { ICON } from './icons.js';
import { POWERUPS } from '../game/PowerUp.js';
import { CONFIG } from '../config/settings.js';

const fmt = (n) => Math.floor(n).toLocaleString('en-US');

export class HUD {
  constructor(root, handlers) {
    this.handlers = handlers;
    const el = (this.el = document.createElement('div'));
    el.className = 'hud hidden';
    el.innerHTML = `
      <div class="panel hud-left">
        <div class="hud-score chunk" data-k="score">0</div>
        <div class="hud-sub chunk"><span>BEST <b data-k="best">0</b></span></div>
        <div class="hearts" data-k="hearts"></div>
      </div>
      <div class="panel hud-center">
        <div class="hud-dist chunk"><span data-k="dist">0</span>m</div>
        <div class="hud-lvl" data-k="lvl">LV 1</div>
        <div class="speedbar"><i data-k="speed"></i></div>
      </div>
      <div class="panel hud-right">
        <div class="counter chunk" data-k="fruitbox">${ICON.fruit}<span data-k="fruit">0</span></div>
        <div class="gems chunk">
          <div>${ICON.green}<span data-k="g-green">0</span></div>
          <div>${ICON.purple}<span data-k="g-purple">0</span></div>
          <div>${ICON.blue}<span data-k="g-blue">0</span></div>
          <div>${ICON.relic}<span data-k="g-relic">0</span></div>
        </div>
        <div class="gem-total chunk">GEMS <b data-k="gems">0</b> · BEST <b data-k="bestgems">0</b></div>
      </div>
      <div class="hud-btns">
        <button class="round-btn" data-k="pause" title="Pause (Esc)">❚❚</button>
        <button class="round-btn" data-k="mute" title="Sound">🔊</button>
      </div>
      <div class="powerups" data-k="pus"></div>
      <div class="toasts" data-k="toasts"></div>
      <div class="flash" data-k="flash"></div>
      <div class="touch">
        <div class="grp"><button class="tbtn" data-a="laneUp">▲</button><button class="tbtn" data-a="laneDown">▼</button></div>
        <div class="grp"><button class="tbtn wide" data-a="slide">SLIDE</button><button class="tbtn wide" data-a="jump">JUMP</button></div>
      </div>
      <div class="countdown hidden" data-k="countdown"></div>`;
    root.appendChild(el);
    this.q = {};
    el.querySelectorAll('[data-k]').forEach((n) => (this.q[n.dataset.k] = n));

    // hearts
    this.hearts = [];
    for (let i = 0; i < CONFIG.player.lives; i++) {
      const h = document.createElement('div');
      h.className = 'heart';
      h.innerHTML = ICON.heart;
      this.q.hearts.appendChild(h);
      this.hearts.push(h);
    }
    // power-up chips
    this.chips = {};
    for (const [k, v] of Object.entries(POWERUPS)) {
      const c = document.createElement('div');
      c.className = 'pu hidden';
      c.style.setProperty('--c', v.css);
      c.innerHTML = `<div class="ic">${ICON[k]}</div><div><div class="nm chunk">${v.label}</div><div class="bar"><i></i></div></div>`;
      this.q.pus.appendChild(c);
      this.chips[k] = { el: c, bar: c.querySelector('i') };
    }

    // buttons
    this.q.pause.addEventListener('click', () => handlers.onPause());
    this.q.mute.addEventListener('click', () => handlers.onMute());
    el.querySelectorAll('[data-a]').forEach((b) => {
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        b.classList.add('act');
        handlers.onAction(b.dataset.a, 'touch');
      });
      const up = () => b.classList.remove('act');
      b.addEventListener('pointerup', up);
      b.addEventListener('pointerleave', up);
      b.addEventListener('pointercancel', up);
    });
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) document.body.classList.add('touch-on');

    this.disp = { score: 0, fruit: 0, gems: 0, dist: 0 };
    this.last = { fruit: 0, gems: 0, lives: -1 };
    this.setMuteIcon(handlers.isSoundOn());
  }

  show() { this.el.classList.remove('hidden'); }
  hide() { this.el.classList.add('hidden'); }

  setMuteIcon(on) { this.q.mute.textContent = on ? '🔊' : '🔇'; }

  reset(best) {
    this.disp = { score: 0, fruit: 0, gems: 0, dist: 0 };
    this.last = { fruit: 0, gems: 0, lives: -1 };
    this.q.toasts.innerHTML = '';
    this.q.best.textContent = fmt(best.score);
    this.q.bestgems.textContent = best.gems;
    for (const k of Object.keys(this.chips)) this.chips[k].el.classList.add('hidden');
  }

  toast(text, color = '#fff', small = false) {
    const t = document.createElement('div');
    t.className = 'toast chunk' + (small ? ' small' : '');
    t.style.setProperty('--c', color);
    t.textContent = text;
    this.q.toasts.appendChild(t);
    while (this.q.toasts.children.length > 4) this.q.toasts.firstChild.remove();
    setTimeout(() => t.remove(), small ? 1300 : 2300);
  }

  flash(kind = 'hit') {
    const f = this.q.flash;
    f.classList.toggle('white', kind === 'white');
    f.classList.add('on');
    requestAnimationFrame(() => requestAnimationFrame(() => f.classList.remove('on')));
  }

  countdown(text) {
    const c = this.q.countdown;
    c.classList.remove('hidden');
    c.innerHTML = `<span class="chunk">${text}</span>`;
  }
  endCountdown() { this.q.countdown.classList.add('hidden'); }

  update(dt, s) {
    const k = Math.min(1, dt * 9);
    const d = this.disp;
    d.score += (s.score - d.score) * k;
    if (s.score - d.score < 1) d.score = s.score;
    d.dist += (s.distance - d.dist) * Math.min(1, dt * 14);
    this.q.score.textContent = fmt(d.score);
    this.q.dist.textContent = fmt(d.dist);
    this.q.best.textContent = fmt(Math.max(s.best.score, s.score));
    this.q.lvl.textContent = `LV ${s.level} · ${Math.round(s.speed)} m/s`;
    this.q.speed.style.width = `${Math.round(s.speedRatio * 100)}%`;

    if (s.fruit !== this.last.fruit) {
      this.last.fruit = s.fruit;
      this.bump(this.q.fruitbox);
    }
    this.q.fruit.textContent = s.fruit;
    this.q.gems.textContent = s.gems;
    this.q.bestgems.textContent = Math.max(s.best.gems, s.gems);
    for (const t of ['green', 'purple', 'blue', 'relic']) this.q['g-' + t].textContent = s.gemTypes[t];
    if (s.gems !== this.last.gems) this.last.gems = s.gems;

    if (s.lives !== this.last.lives) {
      this.last.lives = s.lives;
      this.hearts.forEach((h, i) => h.classList.toggle('lost', i >= s.lives));
    }
    for (const [key, chip] of Object.entries(this.chips)) {
      const t = s.timers[key];
      chip.el.classList.toggle('hidden', !(t > 0));
      if (t > 0) {
        chip.bar.style.width = `${Math.min(100, (t / CONFIG.powerups[key].duration) * 100)}%`;
        chip.el.classList.toggle('warn', t < 2);
      }
    }
  }

  bump(node) {
    node.classList.remove('bump');
    void node.offsetWidth;
    node.classList.add('bump');
  }
}
