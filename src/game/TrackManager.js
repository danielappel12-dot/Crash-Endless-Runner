import { CONFIG } from '../config/settings.js';
import { Segment } from './Segment.js';
import { Layout } from './Layout.js';
import { buildDecorVariants } from '../world/JungleGenerator.js';

const TR = CONFIG.track;
const L = TR.segmentLength;
const SPECIAL = ['ruins', 'bridge', 'rocky'];

// Keeps a ring of segments ahead of the player. Segments that fall behind are
// recycled to the far end and re-populated with a new layout.
export class TrackManager {
  constructor(scene, mats, managers) {
    this.variants = buildDecorVariants();
    this.segments = [];
    for (let i = 0; i < TR.segmentCount; i++) this.segments.push(new Segment(scene, mats, this.variants));
    this.layout = new Layout(managers);
    this.lastBiome = 'jungle';
    this.recycled = 0;
  }

  pickBiome(distance) {
    if (distance < 200) return 'jungle';
    const level = distance / CONFIG.speed.levelEvery;
    const D = CONFIG.difficulty;
    const p = Math.min(D.specialBiomeMax, D.specialBiomeBase + level * D.specialBiomePerLevel);
    if (Math.random() < p) {
      const options = SPECIAL.filter((b) => b !== this.lastBiome);
      return options[(Math.random() * options.length) | 0];
    }
    return 'jungle';
  }

  _setup(seg, z0) {
    seg.releaseEntities();
    const distance = Math.max(0, -z0);
    const biome = this.pickBiome(distance);
    this.lastBiome = biome;
    seg.configure(z0, biome);
    this.layout.populate(seg, distance);
  }

  reset() {
    this.layout.reset();
    this.lastBiome = 'jungle';
    this.recycled = 0;
    let z0 = L; // one segment behind the starting line
    this.segments.forEach((seg, i) => {
      this._setup(seg, z0);
      z0 -= L;
    });
  }

  update(playerZ) {
    // segments are ordered nearest -> farthest
    while (this.segments[0].z0 - L > playerZ + TR.recycleBehind) {
      const seg = this.segments.shift();
      const tail = this.segments[this.segments.length - 1];
      this._setup(seg, tail.z0 - L);
      this.segments.push(seg);
      this.recycled++;
    }
  }

  // true if world-z lies inside a ravine gap
  gapAt(z, margin = 0) {
    for (const s of this.segments) {
      if (z > s.z0 + 1 || z < s.z0 - L - 1) continue;
      for (const g of s.gaps) if (z < g.z1 - margin && z > g.z2 + margin) return g;
    }
    return null;
  }
}
