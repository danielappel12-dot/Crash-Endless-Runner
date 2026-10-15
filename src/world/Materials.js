import * as THREE from 'three';
import * as T from './ProceduralTextures.js';

// Shared materials. Everything is created once and reused.

export const BIOMES = ['jungle', 'ruins', 'bridge', 'rocky'];

export function createMaterials() {
  const m = {};
  m.vertex = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  m.vertexEmissive = new THREE.MeshPhongMaterial({ vertexColors: true, flatShading: true, shininess: 90, specular: 0xffffff, emissive: 0x222222 });
  m.ground = {};
  for (const b of BIOMES) {
    const tex = T.groundTexture(b);
    tex.wrapT = THREE.RepeatWrapping;
    m.ground[b] = new THREE.MeshLambertMaterial({ map: tex });
  }
  m.side = new THREE.MeshLambertMaterial({ map: T.sideGroundTexture() });
  m.chasm = new THREE.MeshBasicMaterial({ map: T.rockTexture(), color: 0x886655, side: THREE.BackSide });
  m.water = new THREE.MeshBasicMaterial({ color: 0x1fb8b0, transparent: true, opacity: 0.85 });
  m.crate = {};
  for (const k of ['fruit', 'bouncy', 'mystery', 'tnt', 'metal']) {
    m.crate[k] = new THREE.MeshLambertMaterial({ map: T.crateTexture(k) });
  }
  m.bark = new THREE.MeshLambertMaterial({ map: T.barkTexture() });
  m.shadow = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false });
  m.cue = {
    red: new THREE.MeshBasicMaterial({ map: T.chevronTexture('#ff3a2a'), transparent: true, depthWrite: false, opacity: 0.9 }),
    amber: new THREE.MeshBasicMaterial({ map: T.chevronTexture('#ffb52a'), transparent: true, depthWrite: false, opacity: 0.9 }),
    cyan: new THREE.MeshBasicMaterial({ map: T.chevronTexture('#35e0d0'), transparent: true, depthWrite: false, opacity: 0.9 }),
  };
  for (const k in m.cue) m.cue[k].map.repeat.set(1, 1);
  m.sky = new THREE.MeshBasicMaterial({ map: T.skyTexture(), side: THREE.BackSide, fog: false, depthWrite: false });
  return m;
}
