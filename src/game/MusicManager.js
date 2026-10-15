import { store, persist } from '../config/settings.js';

// Procedural chiptune-ish music: a step sequencer scheduled ahead on the Web Audio
// clock. Each zone has its own tune (key, tempo, bass line, lead melody, drums);
// intensity (0..1, tied to run speed) adds arpeggios, hi-hat 16ths, octave leads
// and a slightly faster tempo.

const M = 'M', m = 'm';
const _ = null;

export const SONGS = {
  jungle: {
    bpm: 148, leadBase: 72, duty: 0.25, drums: 'bounce', swing: 0,
    roots: [48, 45, 41, 43, 41, 43, 48, 43], q: [M, m, M, M, M, M, M, M],
    bass: [0, 12, 0, 12, 7, 12, 0, 12],
    lead: [
      [4, 7, 4, 0, 2, 4, 7, _], [9, 12, 9, 4, 7, 9, 12, _], [9, 5, 9, 12, 11, 9, 5, _], [7, 11, 14, 11, 9, 7, 2, _],
      [5, 9, 12, 9, 5, 9, 12, 16], [2, 7, 11, 7, 2, 7, 11, 14], [4, 7, 12, 7, 4, 7, 12, _], [2, 5, 7, 11, 14, 11, 7, _],
    ],
  },
  ruins: {
    bpm: 118, leadBase: 69, duty: 0.5, drums: 'march', swing: 0,
    roots: [45, 41, 48, 43, 45, 41, 40, 40], q: [m, M, M, M, m, M, M, M],
    bass: [0, _, 0, 7, 0, _, 7, 12],
    lead: [
      [0, 3, 7, _, 12, _, 7, 3], [3, 0, -4, _, 0, 3, 5, _], [3, 7, 10, 7, 3, _, 0, _], [2, 5, 2, -2, 2, 5, 9, _],
      [0, 3, 7, 12, 7, 3, 0, _], [5, 3, 0, -4, 0, 3, 5, 8], [7, 11, 14, 11, 7, 11, 2, _], [14, 11, 7, 11, 2, _, _, _],
    ],
  },
  lagoon: {
    bpm: 132, leadBase: 67, duty: 0.25, drums: 'bounce', swing: 0.28,
    roots: [43, 48, 50, 43, 43, 48, 50, 40], q: [M, M, M, M, M, M, M, m],
    bass: [0, _, 7, _, 0, _, 7, 12],
    lead: [
      [0, 2, 4, 7, 4, 2, 0, _], [5, 7, 9, 12, 9, 7, 5, _], [2, 6, 9, 14, 9, 6, 2, _], [7, 4, 0, 4, 7, 12, 7, _],
      [0, 4, 7, 12, 11, 9, 7, _], [12, 9, 5, 9, 12, 16, 12, _], [14, 11, 9, 6, 2, 6, 9, _], [4, 7, 11, 7, 4, 7, 11, 16],
    ],
  },
  rocky: {
    bpm: 158, leadBase: 74, duty: 0.125, drums: 'drive', swing: 0,
    roots: [50, 46, 53, 48, 50, 46, 48, 45], q: [m, M, M, M, m, M, M, M],
    bass: [0, 0, 12, 0, 0, 0, 12, 7],
    lead: [
      [0, 3, 7, 3, 0, 3, 7, 12], [-4, 0, 3, 0, -4, 0, 3, 8], [3, 7, 10, 7, 3, 7, 10, 15], [-2, 2, 5, 2, -2, 2, 5, 10],
      [0, 3, 7, 10, 12, 10, 7, 3], [-4, 0, 3, 8, 3, 0, -4, _], [-2, 2, 5, 10, 5, 2, -2, _], [2, 7, 11, 7, 2, 7, 11, 14],
    ],
  },
  boss: {
    bpm: 172, leadBase: 62, duty: 0.125, drums: 'drive', swing: 0,
    roots: [50, 50, 53, 48, 50, 50, 55, 52], q: [m, m, M, M, m, m, M, m],
    bass: [0, 0, 12, 0, 0, 0, 12, 7],
    lead: [
      [0, 3, 7, 3, 0, 3, 7, 10], [12, 10, 7, 10, 12, 15, 12, _], [8, 12, 15, 12, 8, 12, 15, _], [2, 5, 9, 5, 2, 5, 9, 14],
      [0, 3, 7, 12, 10, 7, 3, 0], [12, 15, 17, 15, 12, 10, 7, _], [10, 14, 17, 14, 10, 14, 17, 22], [14, 12, 9, 7, 4, _, _, _],
    ],
  },
  menu: {
    bpm: 104, leadBase: 72, duty: 0.5, drums: 'soft', swing: 0.2, arp: true,
    roots: [48, 45, 41, 43, 41, 43, 48, 43], q: [M, m, M, M, M, M, M, M],
    bass: [0, _, _, _, 7, _, _, _],
    lead: [
      [4, _, 7, _, 12, _, 7, _], [9, _, 12, _, 16, _, 12, _], [9, _, 5, _, 12, _, 9, _], [7, _, 11, _, 14, _, 11, _],
      [5, _, 9, _, 12, _, 9, _], [2, _, 7, _, 11, _, 7, _], [4, _, 7, _, 12, _, 7, 4], [2, _, 5, _, 7, _, _, _],
    ],
  },
};

const CH = { M: [0, 4, 7], m: [0, 3, 7] };
const hz = (n) => 440 * Math.pow(2, (n - 69) / 12);

function pulseWave(ctx, duty) {
  const N = 24;
  const real = new Float32Array(N + 1), imag = new Float32Array(N + 1);
  for (let n = 1; n <= N; n++) real[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
  return ctx.createPeriodicWave(real, imag);
}

export class MusicManager {
  constructor() {
    this.ctx = null;
    this.enabled = store.settings.music;
    this.volume = store.settings.musicVolume;
    this.want = null;
    this.pending = null;
    this.song = null;
    this.timer = null;
    this.step = 0;
    this.totalSteps = 0;
    this.nextTime = 0;
    this.intensity = 0;
    this.paused = false;
  }

  attach(ctx, dest) {
    this.ctx = ctx;
    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.out.connect(dest);
    // little echo on the lead
    this.echoIn = ctx.createGain();
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.2;
    const fb = ctx.createGain();
    fb.gain.value = 0.32;
    const wet = ctx.createGain();
    wet.gain.value = 0.3;
    this.echoIn.connect(delay);
    delay.connect(fb);
    fb.connect(delay);
    delay.connect(wet);
    wet.connect(this.out);
    this.waves = {};
    const len = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    if (this.want) this._begin();
  }

  get level() {
    return this.enabled ? this.volume * 0.5 : 0;
  }

  _applyGain(fade = 0.15) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setTargetAtTime(this.paused ? 0 : this.level, t, fade);
  }

  setEnabled(on) {
    this.enabled = on;
    store.settings.music = on;
    persist();
    this._applyGain();
  }

  setVolume(v) {
    this.volume = v;
    store.settings.musicVolume = v;
    persist();
    this._applyGain();
  }

  play(name) {
    this.want = name;
    this.paused = false;
    if (!this.ctx) return;
    if (!this.timer) this._begin();
    else if (this.song !== SONGS[name]) this.pending = name;
    this._applyGain();
  }

  _begin() {
    this.song = SONGS[this.want];
    this.pending = null;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    clearInterval(this.timer);
    this.timer = setInterval(() => this._tick(), 25);
    this._applyGain(0.3);
  }

  stop(fade = 0.4) {
    this.want = null;
    if (!this.ctx) return;
    this.out.gain.setTargetAtTime(0, this.ctx.currentTime, fade / 3);
    clearInterval(this.timer);
    const t = this.timer;
    this.timer = null;
    setTimeout(() => {
      if (!this.timer && t) this.song = null;
    }, fade * 1000);
  }

  pause() {
    this.paused = true;
    this._applyGain(0.05);
  }

  resume() {
    this.paused = false;
    if (this.ctx && this.want && !this.timer) this._begin();
    this._applyGain(0.2);
  }

  setIntensity(v) {
    this.intensity = Math.max(0, Math.min(1, v));
  }

  _tick() {
    const ctx = this.ctx;
    if (!ctx || !this.song) return;
    if (this.paused) {
      this.nextTime = Math.max(this.nextTime, ctx.currentTime + 0.05);
      return;
    }
    while (this.nextTime < ctx.currentTime + 0.18) {
      if (this.step % 16 === 0 && this.pending && this.step % 128 === 0) {
        this.song = SONGS[this.pending];
        this.pending = null;
        this.step = 0;
      } else if (this.pending && this.step % 16 === 0) {
        // switch tunes at the next bar line
        this.song = SONGS[this.pending];
        this.pending = null;
        this.step = 0;
      }
      this._schedule(this.step, this.nextTime);
      const song = this.song;
      const stepDur = 60 / (song.bpm * (1 + this.intensity * 0.12)) / 4;
      this.nextTime += stepDur;
      this.step++;
      this.totalSteps++;
    }
  }

  _env(osc, t, dur, vol, att = 0.008, rel = 0.05, dest = this.out) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + att);
    g.gain.setValueAtTime(vol, t + Math.max(att, dur - rel));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + rel);
    osc.connect(g);
    g.connect(dest);
    osc.start(t);
    osc.stop(t + dur + rel + 0.02);
  }

  _note(midi, t, dur, { type = 'square', vol = 0.1, duty = 0, echo = false, att = 0.008, rel = 0.05, lp = 0 } = {}) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    if (duty) {
      const key = 'p' + duty;
      if (!this.waves[key]) this.waves[key] = pulseWave(ctx, duty);
      o.setPeriodicWave(this.waves[key]);
    } else o.type = type;
    o.frequency.value = hz(midi);
    let node = o;
    if (lp) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = lp;
      o.connect(f);
      node = f;
    }
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + att);
    g.gain.setValueAtTime(vol, t + Math.max(att, dur - rel));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + rel);
    node.connect(g);
    g.connect(this.out);
    if (echo) g.connect(this.echoIn);
    o.start(t);
    o.stop(t + dur + rel + 0.02);
  }

  _kick(t, v = 0.32) {
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    this._env(o, t, 0.1, v, 0.002, 0.08);
  }

  _noise(t, dur, vol, f, type = 'highpass', q = 0.7) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    const flt = this.ctx.createBiquadFilter();
    flt.type = type;
    flt.frequency.value = f;
    flt.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(flt);
    flt.connect(g);
    g.connect(this.out);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.02);
  }

  _schedule(step, t0) {
    const song = this.song;
    const I = this.intensity;
    const bar = Math.floor(step / 16) % 8;
    const s = step % 16;
    const stepDur = 60 / (song.bpm * (1 + I * 0.12)) / 4;
    // swing: push the off-beat 8ths late
    const t = s % 4 === 2 ? t0 + song.swing * stepDur : t0;
    const root = song.roots[bar];
    const tones = CH[song.q[bar]];

    // drums
    const d = song.drums;
    const kick = d === 'drive' ? s % 4 === 0 : d === 'march' ? [0, 6, 8, 14].includes(s) : d === 'soft' ? s === 0 || s === 8 : [0, 8, 10].includes(s);
    if (kick) this._kick(t, d === 'soft' ? 0.14 : 0.3);
    if (d !== 'soft' && (s === 4 || s === 12)) {
      this._noise(t, 0.12, 0.15, 1800, 'bandpass', 0.8);
      this._note(55, t, 0.05, { type: 'triangle', vol: 0.1, rel: 0.06 });
    }
    if (d === 'soft') {
      if (s === 4 || s === 12) this._noise(t, 0.05, 0.035, 7000);
    } else if (s % 2 === 0) this._noise(t, 0.03, s % 4 === 0 ? 0.06 : 0.035, 7500);
    else if (I > 0.5) this._noise(t, 0.02, 0.025, 8500);

    // bass
    const quarterBass = song.bass;
    if (s % 2 === 0) {
      const off = quarterBass[s / 2];
      if (off !== null) this._note(root + off, t, stepDur * 1.7, { type: 'square', vol: d === 'soft' ? 0.1 : 0.15, lp: 900, rel: 0.04 });
    }
    // pad on each bar line
    if (s === 0) for (const iv of tones) this._note(root + 12 + iv, t, stepDur * 15, { type: 'triangle', vol: song.drums === 'soft' ? 0.04 : 0.025, att: 0.06, rel: 0.25 });

    // arpeggio
    if (song.arp || I > 0.25) {
      const k = tones[s % 3] + (s % 6 < 3 ? 0 : 12);
      this._note(root + 24 + k, t, stepDur * 0.8, { duty: 0.125, vol: song.arp ? 0.035 : 0.03 + I * 0.02, rel: 0.02 });
    }

    // lead melody
    if (s % 2 === 0) {
      const n = song.lead[bar][s / 2];
      if (n !== null && n !== undefined) {
        const len = stepDur * (song.drums === 'soft' ? 3.4 : 1.8);
        this._note(song.leadBase + n, t, len, { duty: song.duty, vol: song.drums === 'soft' ? 0.065 : 0.085, echo: true, rel: 0.06, att: 0.01 });
        if (I > 0.75) this._note(song.leadBase + n + 12, t, len, { duty: 0.5, vol: 0.03, rel: 0.05 });
      }
    }
  }
}
