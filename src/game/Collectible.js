import * as THREE from 'three';
import { GeoBuilder } from '../world/GeoBuilder.js';
import { CONFIG } from '../config/settings.js';
import { Pool } from './Pool.js';

// Fruit + gems + relic. Each item: {kind,x,y,z,state}
// state: idle | pop (burst out of a crate) | home (flies into the player) | magnet

export const GEM_STYLE = {
  green: { color: 0x2cff7a, particle: [0x2cff7a, 0xb8ffd0], label: 'GREEN GEM' },
  purple: { color: 0xb04cff, particle: [0xb04cff, 0xe6c0ff], label: 'PURPLE GEM' },
  blue: { color: 0x3ca8ff, particle: [0x3ca8ff, 0xc0e4ff], label: 'BLUE GEM' },
  relic: { color: 0xffcf2a, particle: [0xffcf2a, 0xfff0a0, 0x2fe8d8], label: 'GOLDEN RELIC' },
};

function buildFruit() {
  const b = new GeoBuilder(0.02);
  b.sphere(0.4, '#ff5a1e', { sy: 1.05 }, 10);
  b.sphere(0.3, '#ff8a3a', { x: 0.1, y: -0.08, z: 0.16 }, 8);
  b.sphere(0.075, '#fff4e0', { x: -0.17, y: 0.2, z: 0.3, sy: 1.15 }, 6); // highlight
  b.sphere(0.05, '#ffffff', { x: -0.12, y: 0.3, z: 0.28 }, 5);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    b.cone(0.12, 0.42, i % 2 ? '#3cc43c' : '#58d84a', { x: Math.sin(a) * 0.11, y: 0.5, z: Math.cos(a) * 0.11, rx: Math.cos(a) * 0.6, rz: -Math.sin(a) * 0.6 }, 4);
  }
  b.cyl(0.03, 0.04, 0.12, '#2a7a2a', { y: 0.42 }, 4);
  return b.build();
}

function buildRelic() {
  const b = new GeoBuilder(0.03);
  b.box(0.7, 0.14, 0.5, '#d9a21a', { y: -0.42 });
  b.cyl(0.2, 0.34, 0.85, '#ffcf2a', { y: 0.05 }, 6);
  b.sphere(0.27, '#ffdc4a', { y: 0.62 }, 8);
  b.cone(0.13, 0.3, '#ffcf2a', { x: -0.2, y: 0.9, rz: 0.4 }, 4);
  b.cone(0.13, 0.3, '#ffcf2a', { x: 0.2, y: 0.9, rz: -0.4 }, 4);
  b.box(0.1, 0.1, 0.06, '#2fe8d8', { x: -0.1, y: 0.66, z: 0.24 });
  b.box(0.1, 0.1, 0.06, '#2fe8d8', { x: 0.1, y: 0.66, z: 0.24 });
  b.octa(0.12, '#2fe8d8', { y: 0.15, z: 0.28, sz: 0.5 });
  b.torus(0.5, 0.05, '#ffdc4a', { y: 0.2, rx: 0, z: -0.2 });
  return b.build();
}

export class CollectibleManager {
  constructor(scene, mats) {
    this.group = new THREE.Group();
    scene.add(this.group);
    this.time = 0;
    const fruitGeo = buildFruit();
    const fruitMat = new THREE.MeshPhongMaterial({ vertexColors: true, flatShading: false, shininess: 80, specular: 0x886644, emissive: 0x401408 });
    this.fruits = new Pool(() => {
      const holder = new THREE.Group();
      const m = new THREE.Mesh(fruitGeo, fruitMat);
      holder.add(m);
      this.group.add(holder);
      return { kind: 'fruit', mesh: holder, inner: m, pool: this.fruits };
    });
    const geos = {
      green: new THREE.OctahedronGeometry(0.42, 0).scale(0.8, 1.35, 0.8),
      purple: new THREE.IcosahedronGeometry(0.45, 0),
      blue: new THREE.DodecahedronGeometry(0.45, 0),
    };
    this.gemPools = {};
    for (const kind of ['green', 'purple', 'blue']) {
      const st = GEM_STYLE[kind];
      const mat = new THREE.MeshPhongMaterial({ color: st.color, emissive: new THREE.Color(st.color).multiplyScalar(0.55), flatShading: true, shininess: 140, specular: 0xffffff });
      this.gemPools[kind] = new Pool(() => {
        const holder = new THREE.Group();
        const m = new THREE.Mesh(geos[kind], mat);
        holder.add(m);
        this.group.add(holder);
        return { kind, mesh: holder, inner: m, pool: this.gemPools[kind] };
      });
    }
    const relicGeo = buildRelic();
    const relicMat = new THREE.MeshPhongMaterial({ vertexColors: true, flatShading: true, shininess: 120, specular: 0xffffff, emissive: 0x5a3a00 });
    this.gemPools.relic = new Pool(() => {
      const holder = new THREE.Group();
      holder.add(new THREE.Mesh(relicGeo, relicMat));
      holder.scale.setScalar(1.15);
      this.group.add(holder);
      return { kind: 'relic', mesh: holder, pool: this.gemPools.relic };
    });
  }

  list() {
    return [this.fruits, ...Object.values(this.gemPools)];
  }

  _init(o, x, y, z) {
    o.x = x;
    o.y = y;
    o.z = z;
    o.state = 'idle';
    o.t = 0;
    o.phase = Math.random() * 6.28;
    o.vx = o.vy = o.vz = 0;
    o.mesh.position.set(x, y, z);
    o.mesh.scale.setScalar(o.kind === 'relic' ? 1.15 : 1);
    return o;
  }

  fruit(x, y, z) {
    return this._init(this.fruits.acquire(), x, y, z);
  }

  gem(kind, x, y, z) {
    return this._init(this.gemPools[kind].acquire(), x, y, z);
  }

  // Fruit bursting out of a smashed crate; flies up, then homes in on the player.
  pop(x, y, z, count) {
    for (let i = 0; i < count; i++) {
      const f = this.fruit(x, y, z);
      const a = (i / count) * Math.PI * 2;
      f.state = 'pop';
      f.vx = Math.cos(a) * 2.5;
      f.vz = Math.sin(a) * 2.5 - 2;
      f.vy = 6 + Math.random() * 3;
    }
  }

  popGem(kind, x, y, z) {
    const g = this.gem(kind, x, y, z);
    g.state = 'pop';
    g.vx = 0;
    g.vz = -1;
    g.vy = 8;
    return g;
  }

  update(dt, time, player, magnetRadius) {
    this.time = time;
    const px = player.x;
    const py = player.y + 0.8;
    const pz = player.z;
    for (const pool of this.list()) {
      const arr = pool.active;
      for (let i = arr.length - 1; i >= 0; i--) {
        const o = arr[i];
        const dz = o.z - pz;
        if (o.state === 'idle') {
          if (dz > 25) {
            // collectible slipped behind the camera - free it
            pool.release(o);
            continue;
          }
          if (dz < -110) continue; // far ahead: static
          if (magnetRadius > 0 && o.kind === 'fruit') {
            const dx = o.x - px, dy = o.y - py;
            if (dx * dx + dy * dy + dz * dz < magnetRadius * magnetRadius) o.state = 'home';
          }
        }
        o.t += dt;
        if (o.state === 'pop') {
          o.vy -= 22 * dt;
          o.x += o.vx * dt;
          o.y += o.vy * dt;
          o.z += o.vz * dt;
          if (o.y < 0.5) {
            o.y = 0.5;
            o.vy = Math.abs(o.vy) * 0.3;
          }
          if (o.t > 0.38) {
            o.state = 'home';
            o.t = 0;
          }
          o.mesh.position.set(o.x, o.y, o.z);
        } else if (o.state === 'home') {
          const dx = px - o.x, dy = py - o.y, dzz = pz - o.z;
          const d = Math.hypot(dx, dy, dzz) || 1;
          const sp = Math.min(60, 22 + o.t * 70) + player.speed * 0.8;
          const step = Math.min(d, sp * dt);
          o.x += (dx / d) * step;
          o.y += (dy / d) * step;
          o.z += (dzz / d) * step;
          o.mesh.position.set(o.x, o.y, o.z);
        } else {
          o.mesh.position.y = o.y + Math.sin(time * 3 + o.phase) * 0.14;
        }
        const spin = o.kind === 'fruit' ? 1.6 : 1.1;
        o.mesh.rotation.y = time * spin + o.phase;
        if (o.kind === 'green' || o.kind === 'purple' || o.kind === 'blue') {
          o.mesh.children[0].rotation.z = Math.sin(time * 2 + o.phase) * 0.15;
        }
      }
    }
  }

  reset() {
    for (const p of this.list()) p.clear();
  }
}
