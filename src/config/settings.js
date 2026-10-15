// Central place for every gameplay constant plus persisted user settings.

export const CONFIG = {
  lanes: { x: [-2.2, 0, 2.2], switchRate: 16 },

  player: {
    jumpVelocity: 17,
    gravity: 58,
    fastFall: 34,
    slideDuration: 0.75,
    coyoteTime: 0.1,
    inputBuffer: 0.14,
    // collision box (half extents / heights)
    halfWidth: 0.4,
    halfDepth: 0.35,
    standHeight: 1.7,
    slideHeight: 0.8,
    lives: 3,
    hitInvuln: 1.8,
    hitStagger: 0.6,
    hitSlowdown: 0.55, // speed multiplier right after a hit (recovers)
  },

  speed: {
    start: 15,
    max: 34,
    distanceToMax: 2600, // metres until the cap is reached
    levelEvery: 250, // metres per difficulty level
  },

  track: {
    segmentLength: 56,
    segmentCount: 8,
    rowSpacing: 14,
    rowsPerSegment: 4,
    recycleBehind: 60,
    width: 8,
    gapLength: 6,
  },

  difficulty: {
    maxLevel: 12,
    specialBiomeBase: 0.2,
    specialBiomePerLevel: 0.07,
    specialBiomeMax: 0.8,
    boulderFromLevel: 3,
  },

  scoring: {
    perMetre: 1,
    fruit: 10,
    crate: 50,
    mystery: 100,
    tnt: 0,
    nearMiss: 25,
    gem: { green: 500, purple: 1000, blue: 2000, relic: 5000 },
  },

  powerups: {
    magnet: { duration: 9, radius: 7.5 },
    shield: { duration: 14 },
    multiplier: { duration: 10, factor: 2 },
  },

  crates: {
    size: 1.4,
    tntFuse: 0.9,
    tntBlastHalfWidth: 1.5,
    tntBlastHalfDepth: 2.6,
    tntBlastHeight: 1.7,
    bounceVelocity: 26,
    fruitPerCrate: 5,
  },

  boulder: { speed: 22, warnDistance: 150, triggerDistance: 85 },

  particles: { max: 700, debris: 160 },
};

const KEY = 'wumpaRush.v1';

const DEFAULT_STORE = {
  best: { score: 0, distance: 0, gems: 0, fruit: 0 },
  settings: { sound: true, volume: 0.7, swipe: 1, shake: true, quality: 'high' },
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

export function saveStore(store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* storage unavailable (private mode) - game still works */
  }
}

export const store = loadStore();
export const persist = () => saveStore(store);
