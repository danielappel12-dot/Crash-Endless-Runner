import * as THREE from 'three';
import { GeoBuilder } from '../world/GeoBuilder.js';
import { CONFIG } from '../config/settings.js';
import { Pool } from './Pool.js';

export const POWERUPS = {
  magnet: { label: 'MAGNET', color: 0xff3a3a, css: '#ff4a4a', icon: '🧲' },
  shield: { label: 'SHIELD', color: 0x3ab8ff, css: '#3ab8ff', icon: '🛡' },
  multiplier: { label: 'FRUIT x2', color: 0xffcf2a, css: '#ffcf2a', icon: '✦' },
};

function badgeTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#3a2000';
  x.beginPath();
  x.arc(64, 64, 60, 0, 7);
  x.fill();
  x.fillStyle = '#ffcf2a';
  x.beginPath();
  x.arc(64, 64, 52, 0, 7);
  x.fill();
  x.font = 'bold 64px Impact, "Arial Black", sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.lineWidth = 8;
  x.strokeStyle = '#7a2a00';
  x.strokeText('x2', 64, 68);
  x.fillStyle = '#fff';
  x.fillText('x2', 64, 68);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function buildPickup(type) {
  const g = new THREE.Group();
  if (type === 'magnet') {
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.12, 8, 14, Math.PI), new THREE.MeshPhongMaterial({ color: 0xe02a2a, emissive: 0x501010, shininess: 90 }));
    arc.rotation.z = 0; // opens downward after flip
    arc.rotation.x = 0;
    g.add(arc);
    const tipMat = new THREE.MeshPhongMaterial({ color: 0xeeeeee, emissive: 0x333333, shininess: 100 });
    for (const s of [-1, 1]) {
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.24), tipMat);
      tip.position.set(s * 0.34, -0.12, 0);
      g.add(tip);
    }
    g.position.y = 0;
  } else if (type === 'shield') {
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), new THREE.MeshPhongMaterial({ color: 0x3ab8ff, emissive: 0x104a7a, transparent: true, opacity: 0.55, shininess: 120 })));
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), new THREE.MeshPhongMaterial({ color: 0xbfe8ff, emissive: 0x4a9acc, flatShading: true }));
    core.name = 'core';
    g.add(core);
  } else {
    const star = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.16, 20), new THREE.MeshBasicMaterial({ map: badgeTexture() }));
    star.rotation.x = Math.PI / 2;
    g.add(star);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.07, 6, 16), new THREE.MeshPhongMaterial({ color: 0xffa000, emissive: 0x663300 }));
    g.add(ring);
  }
  return g;
}

export class PowerUpManager {
  constructor(scene, playerRoot) {
    this.group = new THREE.Group();
    scene.add(this.group);
    this.pools = {};
    this.time = 0;
    for (const type of Object.keys(POWERUPS)) {
      this.pools[type] = new Pool(() => {
        const mesh = buildPickup(type);
        this.group.add(mesh);
        return { type, mesh, pool: this.pools[type] };
      });
    }
    this.timers = { magnet: 0, shield: 0, multiplier: 0 };

    // ---- active-state effects attached to the hero --------------------
    this.fx = new THREE.Group();
    playerRoot.add(this.fx);
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.07, 6, 28), new THREE.MeshBasicMaterial({ color: 0xff4a4a, transparent: true, opacity: 0.8 }));
    this.ring.rotation.x = Math.PI / 2;
    this.ring.position.y = 0.9;
    this.ring2 = this.ring.clone();
    this.ring2.material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });
    this.ring2.scale.setScalar(0.8);
    this.bubble = new THREE.Mesh(new THREE.SphereGeometry(1.35, 18, 14), new THREE.MeshPhongMaterial({ color: 0x5ac8ff, emissive: 0x1a6aa0, transparent: true, opacity: 0.3, shininess: 150, depthWrite: false }));
    this.bubble.position.y = 0.9;
    this.stars = new THREE.Group();
    const starGeo = new THREE.OctahedronGeometry(0.16, 0);
    const starMat = new THREE.MeshBasicMaterial({ color: 0xffdc4a });
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Mesh(starGeo, starMat);
      s.userData.a = (i / 6) * Math.PI * 2;
      this.stars.add(s);
    }
    this.stars.position.y = 0.9;
    this.fx.add(this.ring, this.ring2, this.bubble, this.stars);
    this.ring.visible = this.ring2.visible = this.bubble.visible = this.stars.visible = false;
  }

  list() {
    return Object.values(this.pools);
  }

  spawn(type, x, y, z) {
    const p = this.pools[type].acquire();
    p.x = x;
    p.y = y;
    p.z = z;
    p.phase = Math.random() * 6;
    p.mesh.position.set(x, y, z);
    return p;
  }

  activate(type) {
    const cfg = CONFIG.powerups[type];
    this.timers[type] = cfg.duration;
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

  update(dt, time, playerZ, onExpire) {
    this.time = time;
    for (const k of Object.keys(this.timers)) {
      if (this.timers[k] > 0) {
        this.timers[k] -= dt;
        if (this.timers[k] <= 0) {
          this.timers[k] = 0;
          onExpire?.(k);
        }
      }
    }
    const { magnet, shield, multiplier } = this.timers;
    this.ring.visible = this.ring2.visible = magnet > 0;
    this.bubble.visible = shield > 0;
    this.stars.visible = multiplier > 0;
    if (magnet > 0) {
      const warn = magnet < 2 && Math.sin(time * 20) > 0;
      this.ring.rotation.z = time * 3;
      this.ring.scale.setScalar(1 + Math.sin(time * 6) * 0.08);
      this.ring2.scale.setScalar(0.8 + Math.sin(time * 6 + 1) * 0.08);
      this.ring.visible = this.ring2.visible = !warn;
    }
    if (shield > 0) {
      this.bubble.material.opacity = 0.26 + Math.sin(time * 5) * 0.06;
      this.bubble.visible = !(shield < 2 && Math.sin(time * 20) > 0);
    }
    if (multiplier > 0) {
      for (const s of this.stars.children) {
        const a = s.userData.a + time * 3.2;
        s.position.set(Math.cos(a) * 0.95, Math.sin(a * 1.3) * 0.5, Math.sin(a) * 0.95);
        s.rotation.y = time * 5;
      }
      this.stars.visible = !(multiplier < 2 && Math.sin(time * 20) > 0);
    }
    for (const pool of this.list()) {
      for (let i = pool.active.length - 1; i >= 0; i--) {
        const p = pool.active[i];
        if (p.z - playerZ > 25) {
          pool.release(p);
          continue;
        }
        p.mesh.rotation.y = time * 2.2 + p.phase;
        p.mesh.position.y = p.y + Math.sin(time * 3 + p.phase) * 0.18;
        const pulse = 1 + Math.sin(time * 6 + p.phase) * 0.08;
        p.mesh.scale.setScalar(1.25 * pulse);
      }
    }
  }

  reset() {
    for (const p of this.list()) p.clear();
    for (const k of Object.keys(this.timers)) this.timers[k] = 0;
    this.ring.visible = this.ring2.visible = this.bubble.visible = this.stars.visible = false;
  }
}
