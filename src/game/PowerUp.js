import { CONFIG } from '../config/settings.js';

export const POWERUPS = {
  magnet: { label: 'MAGNET', color: 0xff3a3a, css: '#ff4a4a', icon: '🧲' },
  shield: { label: 'SHIELD', color: 0x3ab8ff, css: '#3ab8ff', icon: '🛡' },
  multiplier: { label: 'FRUIT x2', color: 0xffcf2a, css: '#ffcf2a', icon: '✦' },
};

export const GEM_STYLE = {
  green: { color: 0x2cff7a, particle: [0x2cff7a, 0xb8ffd0], label: 'GREEN GEM' },
  purple: { color: 0xb04cff, particle: [0xb04cff, 0xe6c0ff], label: 'PURPLE GEM' },
  blue: { color: 0x3ca8ff, particle: [0x3ca8ff, 0xc0e4ff], label: 'BLUE GEM' },
  relic: { color: 0xffcf2a, particle: [0xffcf2a, 0xfff0a0, 0x2fe8d8], label: 'GOLDEN RELIC' },
};

// Active power-up timers.
export class PowerUps {
  constructor() {
    this.timers = { magnet: 0, shield: 0, multiplier: 0 };
  }
  activate(type) {
    this.timers[type] = CONFIG.powerups[type].duration;
  }
  has(type) {
    return this.timers[type] > 0;
  }
  consumeShield() {
    if (this.timers.shield > 0) {
      this.timers.shield = 0;
      return true;
    }
    return false;
  }
  update(dt, onExpire) {
    for (const k of Object.keys(this.timers)) {
      if (this.timers[k] > 0) {
        this.timers[k] -= dt;
        if (this.timers[k] <= 0) {
          this.timers[k] = 0;
          onExpire?.(k);
        }
      }
    }
  }
  reset() {
    for (const k of Object.keys(this.timers)) this.timers[k] = 0;
  }
}
