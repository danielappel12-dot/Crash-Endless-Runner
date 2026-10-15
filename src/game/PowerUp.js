import { CONFIG } from '../config/settings.js';

export const POWERUPS = {
  magnet: { label: 'MAGNET', color: 0xff3a3a, css: '#ff4a4a' },
  mask: { label: 'MASK POWER', color: 0xffd23a, css: '#ffd23a' },
  multiplier: { label: 'FRUIT x2', color: 0xffcf2a, css: '#ffcf2a' },
};

export const GEM_STYLE = {
  green: { color: 0x2cff7a, particle: [0x2cff7a, 0xb8ffd0], label: 'GREEN GEM' },
  purple: { color: 0xb04cff, particle: [0xb04cff, 0xe6c0ff], label: 'PURPLE GEM' },
  blue: { color: 0x3ca8ff, particle: [0x3ca8ff, 0xc0e4ff], label: 'BLUE GEM' },
  relic: { color: 0xffcf2a, particle: [0xffcf2a, 0xfff0a0, 0x2fe8d8], label: 'GOLDEN RELIC' },
};

// Active power-up timers plus the spirit-mask stack.
// Each mask absorbs one hit; collecting 3 turns into a timed invincibility.
export class PowerUps {
  constructor() {
    this.timers = { magnet: 0, multiplier: 0, mask: 0 }; // mask timer = invincibility
    this.masks = 0;
  }

  // returns 'mask' | 'power' | type
  activate(type) {
    if (type === 'mask') {
      if (this.timers.mask > 0) {
        this.timers.mask = CONFIG.powerups.mask.duration;
        return 'power';
      }
      this.masks++;
      if (this.masks >= CONFIG.powerups.mask.needed) {
        this.masks = 0;
        this.timers.mask = CONFIG.powerups.mask.duration;
        return 'power';
      }
      return 'mask';
    }
    this.timers[type] = CONFIG.powerups[type].duration;
    return type;
  }

  has(type) {
    return this.timers[type] > 0;
  }

  get invincible() {
    return this.timers.mask > 0;
  }

  // a hit arrives: 'immune' (invincible), 'absorbed' (a mask is lost) or null (take the hit)
  consumeMask() {
    if (this.timers.mask > 0) return 'immune';
    if (this.masks > 0) {
      this.masks--;
      return 'absorbed';
    }
    return null;
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
    this.masks = 0;
  }
}
