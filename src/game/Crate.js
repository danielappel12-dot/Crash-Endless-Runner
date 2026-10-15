import * as THREE from 'three';
import { CONFIG } from '../config/settings.js';
import { Pool } from './Pool.js';

// Crates: fruit (standard), bouncy, mystery, tnt, metal (unbreakable).

const S = CONFIG.crates.size;

export class CrateManager {
  constructor(scene, mats) {
    this.mats = mats;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.geo = new THREE.BoxGeometry(S, S, S);
    this.pools = {};
    for (const kind of ['fruit', 'bouncy', 'mystery', 'tnt', 'metal']) {
      this.pools[kind] = new Pool(() => {
        // TNT needs its own material so each box can flash independently.
        const mat = kind === 'tnt' ? mats.crate.tnt.clone() : mats.crate[kind];
        const mesh = new THREE.Mesh(this.geo, mat);
        this.group.add(mesh);
        return { kind, mesh, mat, pool: this.pools[kind], hw: S / 2, hh: S, hd: S / 2, y0: 0, x: 0, z: 0 };
      });
    }
    this.time = 0;
  }

  list() {
    return Object.values(this.pools);
  }

  spawn(kind, x, z) {
    const c = this.pools[kind].acquire();
    c.x = x;
    c.z = z;
    c.armed = false;
    c.fuse = CONFIG.crates.tntFuse;
    c.tickAt = 0;
    c.squash = 0;
    c.passed = false;
    c.hh = kind === 'metal' ? S : S;
    c.platform = kind === 'metal';
    c.mesh.position.set(x, S / 2, z);
    c.mesh.scale.set(1, 1, 1);
    c.mesh.rotation.set(0, 0, 0);
    if (kind === 'tnt') {
      c.mat.emissive.setHex(0x000000);
    }
    return c;
  }

  // Called per frame. cb.explode(c) / cb.tick(c)
  update(dt, playerZ, speed, cb) {
    this.time += dt;
    for (const c of this.pools.tnt.active) {
      if (!c.armed) {
        const dz = playerZ - c.z;
        if (dz > 0 && dz < speed * CONFIG.crates.tntFuse + 0.5) {
          c.armed = true;
          c.fuse = CONFIG.crates.tntFuse;
        }
      } else {
        c.fuse -= dt;
        const rate = 6 + (1 - c.fuse / CONFIG.crates.tntFuse) * 18;
        const on = Math.sin(this.time * rate) > 0;
        c.mat.emissive.setHex(on ? 0xff5a2a : 0x000000);
        const sc = 1 + (1 - Math.max(0, c.fuse) / CONFIG.crates.tntFuse) * 0.18;
        c.mesh.scale.set(sc, sc, sc);
        c.tickAt -= dt;
        if (c.tickAt <= 0) {
          c.tickAt = 0.16;
          cb.tick(c);
        }
        if (c.fuse <= 0) {
          cb.explode(c);
          this.pools.tnt.release(c);
        }
      }
    }
    for (const c of this.pools.mystery.active) {
      if (Math.abs(c.z - playerZ) < 90) {
        c.mesh.rotation.y = Math.sin(this.time * 2 + c.z) * 0.12;
        c.mesh.position.y = S / 2 + Math.sin(this.time * 3 + c.x) * 0.04;
      }
    }
    for (const c of this.pools.bouncy.active) {
      if (c.squash > 0) {
        c.squash -= dt;
        const k = Math.max(0, c.squash) / 0.35;
        c.mesh.scale.set(1 + (1 - k) * 0.3, 1 - Math.sin((1 - k) * Math.PI) * 0.45, 1 + (1 - k) * 0.3);
        if (c.squash <= 0) this.pools.bouncy.release(c);
      }
    }
  }

  reset() {
    for (const p of this.list()) p.clear();
  }
}
