import { store, persist } from '../config/settings.js';
import { MusicManager } from './MusicManager.js';

// Tiny synth built on the Web Audio API. All sounds are generated from
// oscillators and filtered noise, so no audio files are needed. The context is
// only created/resumed after the first user gesture.

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noiseBuf = null;
    this.enabled = store.settings.sound;
    this.volume = store.settings.volume;
    this._last = {};
    this.music = new MusicManager();
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? this.volume : 0;
      const comp = this.ctx.createDynamicsCompressor();
      this.master.connect(comp);
      comp.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 1;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.music.attach(this.ctx, this.master);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setEnabled(on) {
    this.enabled = on;
    store.settings.sound = on;
    persist();
    if (this.master) this.master.gain.value = on ? this.volume : 0;
  }

  setVolume(v) {
    this.volume = v;
    store.settings.volume = v;
    persist();
    if (this.master && this.enabled) this.master.gain.value = v;
  }

  get ready() {
    return this.ctx && this.enabled && this.ctx.state === 'running';
  }

  // throttle identical sounds
  _gate(name, ms) {
    const now = performance.now();
    if (now - (this._last[name] || 0) < ms) return false;
    this._last[name] = now;
    return true;
  }

  tone({ f = 440, f2 = null, dur = 0.15, type = 'square', vol = 0.2, delay = 0, attack = 0.005, curve = 'exp' }) {
    if (!this.ready) return;
    const t0 = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t0);
    if (f2) {
      if (curve === 'exp') o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + dur);
      else o.frequency.linearRampToValueAtTime(f2, t0 + dur);
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  noise({ dur = 0.2, vol = 0.2, f = 1200, f2 = null, q = 1, type = 'lowpass', delay = 0 }) {
    if (!this.ready) return;
    const t0 = this.ctx.currentTime + delay;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    const flt = this.ctx.createBiquadFilter();
    flt.type = type;
    flt.Q.value = q;
    flt.frequency.setValueAtTime(f, t0);
    if (f2) flt.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t0 + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(flt);
    flt.connect(g);
    g.connect(this.master);
    s.start(t0, Math.random() * 0.5);
    s.stop(t0 + dur + 0.05);
  }

  // ---- game sounds ------------------------------------------------------
  fruit(combo = 0) {
    if (!this._gate('fruit', 30)) return;
    const base = 660 * Math.pow(1.0595, Math.min(combo, 12));
    this.tone({ f: base, f2: base * 1.5, dur: 0.11, type: 'square', vol: 0.11 });
    this.tone({ f: base * 2, dur: 0.12, type: 'triangle', vol: 0.09, delay: 0.04 });
  }
  gem(kind = 'green') {
    const root = { green: 523, purple: 587, blue: 659, relic: 392 }[kind] || 523;
    const seq = kind === 'relic' ? [1, 1.25, 1.5, 2, 2.5] : [1, 1.25, 1.5, 2];
    seq.forEach((m, i) => this.tone({ f: root * m, dur: 0.22, type: 'triangle', vol: 0.18, delay: i * 0.07 }));
    this.tone({ f: root * 4, dur: 0.5, type: 'sine', vol: 0.1, delay: seq.length * 0.07 });
  }
  crate() {
    this.noise({ dur: 0.22, vol: 0.35, f: 3000, f2: 400, q: 0.8 });
    this.tone({ f: 220, f2: 80, dur: 0.15, type: 'square', vol: 0.18 });
    this.tone({ f: 880, f2: 440, dur: 0.08, type: 'triangle', vol: 0.1 });
  }
  bounce() {
    this.tone({ f: 200, f2: 900, dur: 0.28, type: 'sine', vol: 0.3, curve: 'lin' });
    this.tone({ f: 400, f2: 1400, dur: 0.22, type: 'triangle', vol: 0.12, delay: 0.04 });
  }
  jump() {
    this.tone({ f: 280, f2: 620, dur: 0.16, type: 'square', vol: 0.12 });
  }
  land() {
    if (!this._gate('land', 90)) return;
    this.noise({ dur: 0.1, vol: 0.25, f: 500, f2: 120, q: 0.5 });
    this.tone({ f: 120, f2: 60, dur: 0.1, type: 'sine', vol: 0.25 });
  }
  slide() {
    this.noise({ dur: 0.4, vol: 0.18, f: 3200, f2: 900, q: 1.5, type: 'bandpass' });
  }
  lane() {
    if (!this._gate('lane', 60)) return;
    this.noise({ dur: 0.07, vol: 0.06, f: 2400, f2: 1200, type: 'bandpass', q: 2 });
  }
  powerup() {
    [0, 4, 7, 12, 16].forEach((s, i) => this.tone({ f: 440 * Math.pow(1.0595, s), dur: 0.14, type: 'square', vol: 0.13, delay: i * 0.055 }));
    this.tone({ f: 1760, f2: 2400, dur: 0.3, type: 'sine', vol: 0.1, delay: 0.3 });
  }
  powerdown() {
    this.tone({ f: 600, f2: 200, dur: 0.3, type: 'triangle', vol: 0.14 });
  }
  spin() {
    this.noise({ dur: 0.3, vol: 0.2, f: 600, f2: 3200, q: 1.5, type: 'bandpass' });
    this.tone({ f: 300, f2: 700, dur: 0.2, type: 'triangle', vol: 0.08, curve: 'lin' });
  }
  stomp() {
    this.tone({ f: 260, f2: 120, dur: 0.1, type: 'square', vol: 0.18 });
    this.tone({ f: 520, f2: 900, dur: 0.12, type: 'triangle', vol: 0.12, delay: 0.05 });
    this.noise({ dur: 0.08, vol: 0.15, f: 1500, f2: 300 });
  }
  maskGet(power = false) {
    const seq = power ? [0, 4, 7, 12, 16, 19, 24] : [0, 7, 12];
    seq.forEach((s, i) => this.tone({ f: 523 * Math.pow(1.0595, s), dur: 0.16, type: 'triangle', vol: 0.15, delay: i * 0.06 }));
    this.tone({ f: 130, f2: 260, dur: 0.3, type: 'sawtooth', vol: 0.06, delay: 0.05 });
  }
  maskBreak() {
    this.noise({ dur: 0.3, vol: 0.25, f: 4000, f2: 600, q: 2, type: 'bandpass' });
    this.tone({ f: 600, f2: 180, dur: 0.25, type: 'square', vol: 0.15 });
    this.tone({ f: 300, f2: 120, dur: 0.3, type: 'triangle', vol: 0.12, delay: 0.05 });
  }
  shieldPop() {
    this.noise({ dur: 0.25, vol: 0.25, f: 5000, f2: 800, q: 3, type: 'bandpass' });
    this.tone({ f: 900, f2: 300, dur: 0.2, type: 'sine', vol: 0.2 });
  }
  tick() {
    this.tone({ f: 1500, dur: 0.05, type: 'square', vol: 0.12 });
  }
  explosion() {
    this.noise({ dur: 0.8, vol: 0.6, f: 2200, f2: 60, q: 0.7 });
    this.tone({ f: 110, f2: 28, dur: 0.6, type: 'sawtooth', vol: 0.35 });
  }
  hit() {
    this.noise({ dur: 0.25, vol: 0.4, f: 1800, f2: 200, q: 0.8 });
    this.tone({ f: 300, f2: 90, dur: 0.3, type: 'sawtooth', vol: 0.22 });
    this.tone({ f: 180, f2: 60, dur: 0.35, type: 'square', vol: 0.12, delay: 0.05 });
  }
  gameOver() {
    [392, 330, 262, 196].forEach((f, i) => this.tone({ f, dur: 0.32, type: 'triangle', vol: 0.2, delay: i * 0.22 }));
    this.tone({ f: 98, dur: 0.9, type: 'sawtooth', vol: 0.12, delay: 0.88 });
  }
  nearMiss() {
    this.tone({ f: 900, f2: 1500, dur: 0.1, type: 'sine', vol: 0.1 });
  }
  click() {
    this.tone({ f: 520, f2: 760, dur: 0.07, type: 'square', vol: 0.09 });
  }
  fall() {
    this.tone({ f: 700, f2: 90, dur: 0.7, type: 'sine', vol: 0.2, curve: 'exp' });
  }
  fanfare() {
    [0, 4, 7, 12, 7, 12, 16].forEach((s, i) => this.tone({ f: 330 * Math.pow(1.0595, s), dur: 0.2, type: 'square', vol: 0.12, delay: i * 0.11 }));
  }
}
