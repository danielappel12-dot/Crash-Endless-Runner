import * as THREE from 'three';
import { CONFIG } from '../config/settings.js';

// One pooled THREE.Points buffer for sparks/dust/smoke plus an InstancedMesh of
// wooden/stone debris chunks. Fixed capacity: nothing is allocated at runtime.

const VERT = /* glsl */ `
  attribute float aSize;
  attribute vec4 aColor;
  varying vec4 vColor;
  uniform float uScale;
  void main() {
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uScale / max(0.1, -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;
const FRAG = /* glsl */ `
  varying vec4 vColor;
  void main() {
    vec2 d = gl_PointCoord - 0.5;
    float r = length(d) * 2.0;
    if (r > 1.0 || vColor.a <= 0.0) discard;
    float a = smoothstep(1.0, 0.35, r) * vColor.a;
    gl_FragColor = vec4(vColor.rgb, a);
  }
`;

const _c = new THREE.Color();

export class ParticleSystem {
  constructor(scene) {
    const N = CONFIG.particles.max;
    this.N = N;
    this.pos = new Float32Array(N * 3);
    this.col = new Float32Array(N * 4);
    this.size = new Float32Array(N);
    this.vel = new Float32Array(N * 3);
    this.life = new Float32Array(N);
    this.maxLife = new Float32Array(N);
    this.grav = new Float32Array(N);
    this.baseSize = new Float32Array(N);
    this.grow = new Float32Array(N);
    this.rgb = new Float32Array(N * 3);
    this.next = 0;

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.uniforms = { uScale: { value: 500 } };
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
    });
    this.points = new THREE.Points(g, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    scene.add(this.points);

    // debris
    const D = CONFIG.particles.debris;
    this.D = D;
    this.debris = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: 0xffffff }), D);
    this.debris.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.debris.frustumCulled = false;
    this.dData = [];
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < D; i++) {
      this.dData.push({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), rv: new THREE.Vector3(), s: 0.2 });
      this.debris.setMatrixAt(i, zero);
      this.debris.setColorAt(i, _c.set(0xffffff));
    }
    this.dNext = 0;
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._v = new THREE.Vector3();
    this._s = new THREE.Vector3();
    scene.add(this.debris);
  }

  setViewport(heightPx, fovDeg) {
    this.uniforms.uScale.value = (heightPx * 0.5) / Math.tan((fovDeg * Math.PI) / 360);
  }

  /**
   * emit(x,y,z,count,{color|colors,speed,up,life,size,gravity,spread,grow})
   */
  emit(x, y, z, count, o = {}) {
    const colors = o.colors || [o.color ?? 0xffffff];
    const speed = o.speed ?? 4;
    const up = o.up ?? 2;
    const life = o.life ?? 0.7;
    const size = o.size ?? 0.35;
    const gravity = o.gravity ?? 9;
    const spread = o.spread ?? 0.2;
    const grow = o.grow ?? 0;
    for (let k = 0; k < count; k++) {
      const i = this.next;
      this.next = (this.next + 1) % this.N;
      const a = Math.random() * Math.PI * 2;
      const u = Math.random() * 2 - 1;
      const r = Math.sqrt(1 - u * u);
      const sp = speed * (0.4 + Math.random() * 0.8);
      this.pos[i * 3] = x + (Math.random() - 0.5) * spread;
      this.pos[i * 3 + 1] = y + (Math.random() - 0.5) * spread;
      this.pos[i * 3 + 2] = z + (Math.random() - 0.5) * spread;
      this.vel[i * 3] = Math.cos(a) * r * sp;
      this.vel[i * 3 + 1] = u * sp * 0.6 + up * Math.random();
      this.vel[i * 3 + 2] = Math.sin(a) * r * sp + (o.forward ?? 0);
      this.life[i] = this.maxLife[i] = life * (0.6 + Math.random() * 0.6);
      this.grav[i] = gravity;
      this.baseSize[i] = size * (0.6 + Math.random() * 0.8);
      this.grow[i] = grow;
      _c.set(colors[(Math.random() * colors.length) | 0]);
      this.rgb[i * 3] = _c.r;
      this.rgb[i * 3 + 1] = _c.g;
      this.rgb[i * 3 + 2] = _c.b;
    }
  }

  ring(x, y, z, count, o = {}) {
    for (let k = 0; k < count; k++) {
      const i = this.next;
      this.next = (this.next + 1) % this.N;
      const a = (k / count) * Math.PI * 2;
      const sp = o.speed ?? 6;
      this.pos[i * 3] = x;
      this.pos[i * 3 + 1] = y;
      this.pos[i * 3 + 2] = z;
      this.vel[i * 3] = Math.cos(a) * sp;
      this.vel[i * 3 + 1] = o.up ?? 0.5;
      this.vel[i * 3 + 2] = Math.sin(a) * sp;
      this.life[i] = this.maxLife[i] = o.life ?? 0.5;
      this.grav[i] = 0;
      this.baseSize[i] = o.size ?? 0.4;
      this.grow[i] = 0;
      _c.set(o.color ?? 0xffffff);
      this.rgb[i * 3] = _c.r;
      this.rgb[i * 3 + 1] = _c.g;
      this.rgb[i * 3 + 2] = _c.b;
    }
  }

  chunks(x, y, z, count, colors, power = 6) {
    for (let k = 0; k < count; k++) {
      const d = this.dData[this.dNext];
      const idx = this.dNext;
      this.dNext = (this.dNext + 1) % this.D;
      d.life = 0.9 + Math.random() * 0.5;
      d.p.set(x + (Math.random() - 0.5) * 0.8, y + Math.random() * 0.6, z + (Math.random() - 0.5) * 0.8);
      d.v.set((Math.random() - 0.5) * power, 2 + Math.random() * power * 0.7, (Math.random() - 0.5) * power);
      d.r.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      d.rv.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14);
      d.s = 0.14 + Math.random() * 0.22;
      this.debris.setColorAt(idx, _c.set(colors[(Math.random() * colors.length) | 0]));
    }
    if (this.debris.instanceColor) this.debris.instanceColor.needsUpdate = true;
  }

  update(dt) {
    const { pos, vel, life, maxLife, col, size, rgb, grav, baseSize, grow } = this;
    for (let i = 0; i < this.N; i++) {
      if (life[i] <= 0) {
        if (size[i] !== 0) {
          size[i] = 0;
          col[i * 4 + 3] = 0;
        }
        continue;
      }
      life[i] -= dt;
      const t = Math.max(0, life[i] / maxLife[i]);
      vel[i * 3 + 1] -= grav[i] * dt;
      pos[i * 3] += vel[i * 3] * dt;
      pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
      pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      col[i * 4] = rgb[i * 3];
      col[i * 4 + 1] = rgb[i * 3 + 1];
      col[i * 4 + 2] = rgb[i * 3 + 2];
      col[i * 4 + 3] = Math.min(1, t * 1.6);
      size[i] = baseSize[i] * (grow[i] ? 1 + (1 - t) * grow[i] : 0.5 + t * 0.5);
    }
    const a = this.points.geometry.attributes;
    a.position.needsUpdate = a.aColor.needsUpdate = a.aSize.needsUpdate = true;

    let any = false;
    for (let i = 0; i < this.D; i++) {
      const d = this.dData[i];
      if (d.life <= 0) continue;
      d.life -= dt;
      any = true;
      d.v.y -= 22 * dt;
      d.p.addScaledVector(d.v, dt);
      if (d.p.y < 0.05) {
        d.p.y = 0.05;
        d.v.y *= -0.35;
        d.v.x *= 0.7;
        d.v.z *= 0.7;
      }
      d.r.x += d.rv.x * dt;
      d.r.y += d.rv.y * dt;
      d.r.z += d.rv.z * dt;
      const s = d.life > 0 ? d.s * Math.min(1, d.life * 3) : 0;
      this._q.setFromEuler(d.r);
      this._s.set(s, s * 0.7, s);
      this._m.compose(d.p, this._q, this._s);
      this.debris.setMatrixAt(i, this._m);
      if (d.life <= 0) {
        this._m.makeScale(0, 0, 0);
        this.debris.setMatrixAt(i, this._m);
      }
    }
    if (any || this._dirty) this.debris.instanceMatrix.needsUpdate = true;
    this._dirty = any;
  }

  clear() {
    this.life.fill(0);
    this.size.fill(0);
    this.col.fill(0);
    const z = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < this.D; i++) {
      this.dData[i].life = 0;
      this.debris.setMatrixAt(i, z);
    }
    this.debris.instanceMatrix.needsUpdate = true;
  }
}
