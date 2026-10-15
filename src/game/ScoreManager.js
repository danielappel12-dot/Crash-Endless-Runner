import { CONFIG, store, persist } from '../config/settings.js';

// Run statistics, scoring and best-score persistence.
export class ScoreManager {
  constructor() {
    this.reset();
  }

  reset() {
    this.distance = 0;
    this.score = 0;
    this.fruit = 0;
    this.gems = 0;
    this.gemTypes = { green: 0, purple: 0, blue: 0, relic: 0 };
    this.crates = 0;
    this.nearMisses = 0;
    this._distAcc = 0;
    this.newBest = { score: false, distance: false, gems: false };
  }

  get best() {
    return store.best;
  }

  get level() {
    return 1 + Math.floor(this.distance / CONFIG.grid.levelRows);
  }

  addDistance(d) {
    this.distance += d;
    this._distAcc += d * CONFIG.scoring.perMetre;
    const whole = Math.floor(this._distAcc);
    if (whole > 0) {
      this.score += whole;
      this._distAcc -= whole;
    }
  }

  add(points) {
    this.score += points;
  }

  addFruit(n, mult = 1) {
    this.fruit += n * mult;
    this.score += CONFIG.scoring.fruit * n * mult;
  }

  addGem(kind) {
    this.gems++;
    this.gemTypes[kind]++;
    this.score += CONFIG.scoring.gem[kind];
  }

  // Persist bests; returns which records were broken this run.
  commit() {
    const b = store.best;
    this.newBest.score = this.score > b.score;
    this.newBest.distance = this.distance > b.distance;
    this.newBest.gems = this.gems > b.gems;
    b.score = Math.max(b.score, Math.floor(this.score));
    b.distance = Math.max(b.distance, Math.floor(this.distance));
    b.gems = Math.max(b.gems, this.gems);
    b.fruit = Math.max(b.fruit, this.fruit);
    persist();
    return this.newBest;
  }
}
