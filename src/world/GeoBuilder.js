import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Builds chunky, vertex-coloured, merged geometry out of primitives.
// One merged mesh per prop keeps draw calls low.

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();

const protos = new Map();
function proto(key, make) {
  let g = protos.get(key);
  if (!g) {
    g = make();
    protos.set(key, g);
  }
  return g;
}

export class GeoBuilder {
  constructor(jitter = 0.05) {
    this.geos = [];
    this.jitter = jitter;
  }

  add(geo, color, t = {}) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    _e.set(t.rx || 0, t.ry || 0, t.rz || 0);
    _q.setFromEuler(_e);
    _p.set(t.x || 0, t.y || 0, t.z || 0);
    _s.set(t.sx ?? 1, t.sy ?? 1, t.sz ?? 1);
    _m.compose(_p, _q, _s);
    g.applyMatrix4(_m);
    g.deleteAttribute('uv');
    _c.set(color);
    if (this.jitter) {
      const j = 1 + (Math.random() - 0.5) * 2 * this.jitter;
      _c.multiplyScalar(j);
    }
    const n = g.attributes.position.count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = _c.r;
      arr[i * 3 + 1] = _c.g;
      arr[i * 3 + 2] = _c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    this.geos.push(g);
    return this;
  }

  box(w, h, d, color, t) {
    return this.add(proto('box', () => new THREE.BoxGeometry(1, 1, 1)), color, { ...t, sx: w * (t?.sx ?? 1), sy: h * (t?.sy ?? 1), sz: d * (t?.sz ?? 1) });
  }
  sphere(r, color, t, seg = 7) {
    return this.add(proto('sph' + seg, () => new THREE.SphereGeometry(1, seg, Math.max(4, seg - 2))), color, { ...t, sx: r * (t?.sx ?? 1), sy: r * (t?.sy ?? 1), sz: r * (t?.sz ?? 1) });
  }
  ico(r, color, t, detail = 0) {
    return this.add(proto('ico' + detail, () => new THREE.IcosahedronGeometry(1, detail)), color, { ...t, sx: r * (t?.sx ?? 1), sy: r * (t?.sy ?? 1), sz: r * (t?.sz ?? 1) });
  }
  octa(r, color, t) {
    return this.add(proto('octa', () => new THREE.OctahedronGeometry(1, 0)), color, { ...t, sx: r * (t?.sx ?? 1), sy: r * (t?.sy ?? 1), sz: r * (t?.sz ?? 1) });
  }
  // unit cylinder radius 1, height 1; rTop/rBot via taper key
  cyl(rTop, rBot, h, color, t, seg = 7) {
    const g = new THREE.CylinderGeometry(rTop, rBot, h, seg);
    return this.add(g, color, t);
  }
  cone(r, h, color, t, seg = 6) {
    return this.add(proto('cone' + seg, () => new THREE.ConeGeometry(1, 1, seg)), color, { ...t, sx: r * (t?.sx ?? 1), sy: h * (t?.sy ?? 1), sz: r * (t?.sz ?? 1) });
  }
  torus(r, tube, color, t) {
    return this.add(new THREE.TorusGeometry(r, tube, 6, 12), color, t);
  }

  build() {
    const g = mergeGeometries(this.geos, false);
    this.geos.forEach((x) => x.dispose());
    this.geos = [];
    g.computeBoundingSphere();
    return g;
  }
}

export const R = (a, b) => a + Math.random() * (b - a);
export const pick = (arr) => arr[(Math.random() * arr.length) | 0];
