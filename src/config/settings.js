// Central place for every gameplay constant plus persisted user settings.
// World units are virtual pixels on a 720px-tall stage; "height" means pixels above the ground line.

export const CONFIG = {
  // Top-down hopping view. One tile = 80 virtual px; rows scroll downwards as you move forward.
  view: { H: 720, minW: 960, maxW: 1700, tile: 80, baseY: 656, followRows: 2.6, pixel: 0.32 },

  grid: {
    half: 4, // playable columns are -half..+half
    hopTime: 0.15,
    hopHeight: 42,
    heroHalfWidth: 0.3, // tiles
    spanTiles: 30, // moving lanes wrap around this width
    zoneLength: 48, // rows per zone
    creepAfter: 2.2, // seconds standing still before the camera starts creeping
    creepStart: 0.3, // rows/s
    creepMax: 0.85,
    hawkMargin: 0.35, // hero this close to the bottom edge gets grabbed
    rowsAhead: 16,
    levelRows: 40,
  },

  // kept for the hero's pose animation
  player: {
    jumpVelocity: 1300, gravity: 3700, fastFall: 1900, slideDuration: 0.75, coyoteTime: 0.1, inputBuffer: 0.14,
    jumpCut: 0.7, spinDuration: 0.42, spinCooldown: 0.6, spinReach: 125, stompBounce: 950,
    halfWidth: 24, standHeight: 118, slideHeight: 54,
    lives: 3, hitInvuln: 2, hitStagger: 0.7, hitSlowdown: 0.55,
  },

  speed: { start: 15, max: 34, distanceToMax: 2600, levelEvery: 40 },

  scoring: {
    perMetre: 5, // points per new row reached
    fruit: 10, crate: 50, mystery: 100, nearMiss: 25,
    gem: { green: 500, purple: 1000, blue: 2000, relic: 5000 },
    enemy: 100,
  },

  powerups: {
    magnet: { duration: 9, radius: 2.4 }, // tiles
    mask: { duration: 12, needed: 3 }, // 3 masks collected = invincibility for `duration` seconds
    multiplier: { duration: 10, factor: 2 },
  },

  crates: { size: 84, fruitPerCrate: 4 },
  particles: { max: 420 },
};

const KEY = 'wumpaRush.v1';

const DEFAULT_STORE = {
  best: { score: 0, distance: 0, gems: 0, fruit: 0 },
  settings: { sound: true, volume: 0.7, music: true, musicVolume: 0.6, swipe: 1, shake: true, quality: 'high', style: 'painted' },
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
