import * as THREE from 'three';
import { GeoBuilder } from '../world/GeoBuilder.js';
import { CONFIG } from '../config/settings.js';
import { Pool } from './Pool.js';

// Hazards: logs, rocks, spiked barricades, low branches, rolling boulders,
// plus non-colliding warning cues (signs + chevron decals).

const SPEC = {
  log: { hw: 0.98, hh: 0.85, hd: 0.5, y0: 0, platform: true },
  rock: { hw: 1.0, hh: 2.2, hd: 0.9, y0: 0, platform: false },
  barricade: { hw: 1.0, hh: 1.5, hd: 0.35, y0: 0, platform: false },
  branch: { hw: 4.2, hh: 1.15, hd: 0.5, y0: 0.95, platform: false },
  boulder: { hw: 1.05, hh: 2.2, hd: 1.1, y0: 0, platform: false },
};

function buildLog() {
  const b = new GeoBuilder();
  b.cyl(0.5, 0.5, 2.1, '#7a4a28', { y: 0.5, rz: Math.PI / 2 }, 8);
  b.cyl(0.43, 0.43, 0.06, '#e0b980', { x: 1.04, y: 0.5, rz: Math.PI / 2 }, 8);
  b.cyl(0.43, 0.43, 0.06, '#e0b980', { x: -1.04, y: 0.5, rz: Math.PI / 2 }, 8);
  b.cyl(0.52, 0.52, 0.12, '#5e3a1e', { x: 0.4, y: 0.5, rz: Math.PI / 2 }, 8);
  b.cyl(0.52, 0.52, 0.12, '#5e3a1e', { x: -0.45, y: 0.5, rz: Math.PI / 2 }, 8);
  b.sphere(0.4, '#4aa23a', { x: -0.2, y: 0.95, z: 0.05, sy: 0.35, sx: 1.4 });
  b.cone(0.12, 0.4, '#7a4a28', { x: 0.7, y: 0.9, z: 0.1, rz: -0.6 }, 5);
  return b.build();
}

function buildRock() {
  const b = new GeoBuilder();
  b.ico(1.25, '#8a8070', { y: 1.05, sx: 1.0, sy: 1.1, sz: 0.85 }, 0);
  b.ico(0.7, '#7a7060', { x: 0.7, y: 0.5, z: 0.2 }, 0);
  b.ico(0.55, '#948a78', { x: -0.8, y: 0.4, z: 0.3 }, 0);
  b.ico(0.9, '#4a9a3a', { y: 1.8, sx: 1, sy: 0.35, sz: 0.8 }, 0);
  return b.build();
}

function buildBarricade() {
  const b = new GeoBuilder();
  for (let i = 0; i < 5; i++) {
    const x = -0.8 + i * 0.4;
    b.cyl(0.04, 0.15, 1.5, '#a8743c', { x, y: 0.75, z: 0.05, rx: 0.18 }, 5);
    b.cone(0.1, 0.45, '#f0e6c8', { x, y: 1.55, z: 0.2, rx: 0.18 }, 5);
  }
  b.box(2.2, 0.18, 0.22, '#6a4020', { y: 0.45 });
  b.box(2.2, 0.18, 0.22, '#6a4020', { y: 0.95 });
  b.box(0.35, 0.5, 0.26, '#d8321e', { x: 0.3, y: 0.7 });
  b.box(0.25, 0.4, 0.26, '#d8321e', { x: -0.7, y: 0.7 });
  return b.build();
}

function buildBranch() {
  const b = new GeoBuilder();
  const W = CONFIG.track.width / 2 + 0.6;
  for (const s of [-1, 1]) {
    b.cyl(0.55, 0.75, 6, '#6d4426', { x: s * W, y: 3 }, 7);
    b.ico(1.8, '#2f9a35', { x: s * W, y: 6.2, sy: 0.8 });
  }
  b.cyl(0.32, 0.32, W * 2, '#7a4a28', { y: 1.75, rz: Math.PI / 2 }, 7);
  for (let x = -W + 0.8; x < W - 0.5; x += 1.15) {
    b.ico(0.65, ['#2f9a35', '#46b83c', '#1f8a3a'][((x + 10) | 0) % 3], { x, y: 1.45, sy: 0.8 });
    b.cyl(0.04, 0.04, 0.85, '#1f7a2a', { x: x + 0.4, y: 1.25 }, 4);
    b.sphere(0.13, '#5cc84a', { x: x + 0.4, y: 0.82 }, 5);
  }
  return b.build();
}

function buildSign() {
  const b = new GeoBuilder(0.02);
  b.cyl(0.07, 0.07, 1.8, '#6a4020', { y: 0.9 }, 5);
  b.octa(0.55, '#ffcf2a', { y: 1.9, sz: 0.1 });
  b.box(0.1, 0.34, 0.08, '#2a1a0a', { y: 1.97, z: 0.07 });
  b.box(0.1, 0.1, 0.08, '#2a1a0a', { y: 1.72, z: 0.07 });
  return b.build();
}

function buildBoulder() {
  const b = new GeoBuilder(0.08);
  b.ico(1.3, '#8a7868', { y: 1.3 }, 1);
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4;
    b.ico(0.4, '#6a5848', { x: Math.cos(a) * 1.0, y: 1.3 + Math.sin(a * 1.7) * 0.9, z: Math.sin(a) * 1.0 }, 0);
  }
  b.ico(0.6, '#4a9a3a', { x: 0.3, y: 2.3, z: 0.2, sy: 0.4 }, 0);
  return b.build();
}

export class ObstacleManager {
  constructor(scene, mats) {
    this.mats = mats;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.geo = {
      log: buildLog(), rock: buildRock(), barricade: buildBarricade(),
      branch: buildBranch(), sign: buildSign(), boulder: buildBoulder(),
    };
    this.pools = {};
    for (const type of Object.keys(SPEC)) {
      this.pools[type] = new Pool(() => {
        const mesh = new THREE.Mesh(this.geo[type], mats.vertex);
        this.group.add(mesh);
        return { type, mesh, pool: this.pools[type], ...SPEC[type], x: 0, z: 0, passed: false, state: 'idle', vz: 0 };
      });
    }
    this.signs = new Pool(() => {
      const mesh = new THREE.Mesh(this.geo.sign, mats.vertex);
      this.group.add(mesh);
      return { mesh, pool: this.signs };
    });
    const planeGeo = new THREE.PlaneGeometry(1, 1);
    planeGeo.rotateX(-Math.PI / 2);
    this.cues = new Pool(() => {
      const mesh = new THREE.Mesh(planeGeo, mats.cue.amber);
      mesh.renderOrder = 2;
      this.group.add(mesh);
      return { mesh, pool: this.cues };
    });
  }

  list() {
    return Object.values(this.pools);
  }

  spawn(type, x, z) {
    const o = this.pools[type].acquire();
    o.x = x;
    o.z = z;
    o.passed = false;
    o.state = 'idle';
    o.mesh.position.set(x, 0, z);
    o.mesh.rotation.set(0, 0, 0);
    if (type === 'rock') o.mesh.rotation.y = Math.random() * 6;
    if (type === 'log') o.mesh.rotation.y = (Math.random() - 0.5) * 0.25;
    if (type === 'branch') o.x = 0;
    if (type === 'boulder') {
      o.mesh.position.y = 0;
      o.rolled = 0;
    }
    return o;
  }

  sign(x, z) {
    const s = this.signs.acquire();
    s.mesh.position.set(x, 0, z);
    s.mesh.rotation.y = x > 0 ? -0.25 : 0.25;
    return s;
  }

  // chevron decal on the ground. color: red | amber | cyan. towardPlayer flips arrows.
  cue(x, z, color, towardPlayer = false, w = 2.0, len = 3.6) {
    const c = this.cues.acquire();
    c.mesh.material = this.mats.cue[color];
    c.mesh.position.set(x, 0.045, z);
    c.mesh.rotation.y = towardPlayer ? Math.PI : 0;
    c.mesh.scale.set(w, 1, len);
    return c;
  }

  update(dt, playerZ, time) {
    const pulse = 0.55 + Math.sin(time * 7) * 0.3;
    this.mats.cue.red.opacity = pulse + 0.15;
    this.mats.cue.amber.opacity = pulse;
    this.mats.cue.cyan.opacity = pulse;
    const bp = this.pools.boulder;
    for (const b of bp.active) {
      const dz = playerZ - b.z; // positive while boulder is ahead of player
      if (b.state === 'idle' && dz < CONFIG.boulder.triggerDistance) b.state = 'rolling';
      if (b.state === 'rolling') {
        b.z += CONFIG.boulder.speed * dt;
        b.rolled += CONFIG.boulder.speed * dt;
        b.mesh.position.z = b.z;
        b.mesh.rotation.x = b.rolled / 1.3;
        b.mesh.position.y = Math.abs(Math.sin(b.rolled * 0.9)) * 0.12;
        if (b.z > playerZ + 25) bp.release(b);
      }
    }
  }

  reset() {
    for (const p of this.list()) p.clear();
    this.signs.clear();
    this.cues.clear();
  }
}
