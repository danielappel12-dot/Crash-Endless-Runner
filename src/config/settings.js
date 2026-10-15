// Central place for every gameplay constant plus persisted user settings.
// World units are virtual pixels on a 720px-tall stage; "height" means pixels above the ground line.

export const CONFIG = {
  // Three depth lanes: feet y of lane 0 (back), 1 (middle), 2 (front). Ground band starts at horizonY.
  view: { H: 720, minW: 960, maxW: 1700, horizonY: 430, laneY: [490, 580, 670], laneGap: 90, playerX: 300, pxPerM: 30, pixel: 0.32 },

  player: {
    jumpVelocity: 1300, // px/s
    gravity: 3700, // px/s^2  -> apex ~228px, air time ~0.7s
    fastFall: 1900,
    slideDuration: 0.75,
    coyoteTime: 0.1,
    inputBuffer: 0.14,
    halfWidth: 24, // hit box
    standHeight: 118,
    slideHeight: 54,
    lives: 3,
    hitInvuln: 1.8,
    hitStagger: 0.6,
    hitSlowdown: 0.55,
  },

  speed: { start: 15, max: 34, distanceToMax: 2600, levelEvery: 250 }, // m/s, metres

  difficulty: { maxLevel: 12, boulderFromLevel: 3, specialBiomeBase: 0.25, specialBiomePerLevel: 0.07, specialBiomeMax: 0.8, biomeLength: 450 },

  scoring: {
    perMetre: 1, fruit: 10, crate: 50, mystery: 100, nearMiss: 25,
    gem: { green: 500, purple: 1000, blue: 2000, relic: 5000 },
  },

  powerups: {
    magnet: { duration: 9, radius: 330 },
    shield: { duration: 14 },
    multiplier: { duration: 10, factor: 2 },
  },

  crates: {
    size: 84, tntFuse: 0.9, tntBlastHalfWidth: 190, tntBlastHeight: 130,
    bounceVelocity: 1650, fruitPerCrate: 5,
  },

  boulder: { speed: 520, warnDistance: 1000, triggerDistance: 350 },
  particles: { max: 420 },
};

const KEY = 'wumpaRush.v1';

const DEFAULT_STORE = {
  best: { score: 0, distance: 0, gems: 0, fruit: 0 },
  settings: { sound: true, volume: 0.7, music: true, musicVolume: 0.6, swipe: 1, shake: true, quality: 'high' },
};

export function loadStore() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT_STORE);
    const parsed = JSON.parse(raw);
    return {
      best: { ...DEFAULT_STORE.best, ...(parsed.best || {}) },
      settings: { ...DEFAULT_STORE.settings, ...(parsed.settings || {}) },
    };
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
}

export function saveStore(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable - game still works */
  }
}

export const store = loadStore();
export const persist = () => saveStore(store);

// feet y (virtual px) for a (possibly fractional) lane index
export function laneY(l) {
  const a = CONFIG.view.laneY;
  const i = Math.max(0, Math.min(1.9999, l));
  const k = Math.floor(i);
  return a[k] + (a[k + 1] - a[k]) * (i - k);
}
