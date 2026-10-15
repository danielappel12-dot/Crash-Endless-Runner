import * as THREE from 'three';
import { CONFIG } from '../config/settings.js';

// The hero: an original orange-brown cartoon marsupial ("Rukk") built from
// procedural meshes with separate joints, driven by sine-wave pose targets that
// are slerped every frame.

const P = CONFIG.player;
const FUR = 0xd2722a, FUR_DARK = 0xa8531a, BELLY = 0xf6cf94;
const GLOVE = 0x2fc23e, SHORTS = 0x2a64dc, SNEAKER = 0xe42a2a, WHITE = 0xffffff;

const matCache = new Map();
function mat(color) {
  if (!matCache.has(color)) matCache.set(color, new THREE.MeshLambertMaterial({ color }));
  return matCache.get(color);
}
const sphereGeo = new THREE.SphereGeometry(1, 16, 12);
const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 12);
const coneGeo = new THREE.ConeGeometry(1, 1, 10);
const boxGeo = new THREE.BoxGeometry(1, 1, 1);

function ell(color, sx, sy, sz, x = 0, y = 0, z = 0, parent = null) {
  const m = new THREE.Mesh(sphereGeo, mat(color));
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  parent?.add(m);
  return m;
}
function cyl(color, r, h, x, y, z, parent) {
  const m = new THREE.Mesh(cylGeo, mat(color));
  m.scale.set(r, h, r);
  m.position.set(x, y, z);
  parent?.add(m);
  return m;
}
function grp(x, y, z, parent) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent?.add(g);
  return g;
}

const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export class Player {
  constructor(scene, shadowMat) {
    this.root = new THREE.Group();
    scene.add(this.root);
    this.model = grp(0, 0, 0, this.root);
    this.model.rotation.y = Math.PI; // build facing +Z, run toward -Z
    this.joints = {};
    this.buildModel();

    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.7, 16), shadowMat);
    this.shadow.rotation.x = -Math.PI / 2;
    scene.add(this.shadow);

    this.callbacks = {};
    this.time = 0;
    this.reset();
  }

  // ---------------------------------------------------------------- model
  buildModel() {
    const J = this.joints;
    const reg = (name, obj) => {
      J[name] = { obj, q: new THREE.Quaternion(), e: new THREE.Euler() };
      return obj;
    };
    const hips = reg('hips', grp(0, 0.78, 0, this.model));
    // shorts + pelvis
    ell(SHORTS, 0.4, 0.3, 0.34, 0, 0, 0, hips);
    cyl(0xf4e2a0, 0.41, 0.07, 0, 0.17, 0, hips); // waistband
    const torso = reg('torso', grp(0, 0.05, 0, hips));
    ell(FUR, 0.4, 0.46, 0.34, 0, 0.34, 0, torso);
    ell(BELLY, 0.27, 0.34, 0.2, 0, 0.3, 0.2, torso);
    // head
    const head = reg('head', grp(0, 0.98, 0.02, torso));
    ell(FUR, 0.5, 0.46, 0.46, 0, 0, 0, head);
    ell(BELLY, 0.3, 0.2, 0.3, 0, -0.18, 0.28, head);
    // long snout + nose
    ell(FUR, 0.23, 0.2, 0.4, 0, -0.08, 0.5, head);
    ell(BELLY, 0.19, 0.12, 0.3, 0, -0.18, 0.52, head);
    ell(0x2a1a14, 0.12, 0.1, 0.1, 0, -0.01, 0.88, head);
    ell(0xffffff, 0.04, 0.03, 0.03, -0.03, 0.03, 0.96, head);
    // grin
    const grin = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.02, 6, 10, Math.PI), mat(0x5a2010));
    grin.position.set(0, -0.2, 0.74);
    grin.rotation.set(0.5, 0, Math.PI);
    grin.scale.set(1, 0.7, 1);
    head.add(grin);
    // oversized eyes
    for (const s of [-1, 1]) {
      const eye = reg(s < 0 ? 'eyeL' : 'eyeR', grp(s * 0.22, 0.17, 0.36, head));
      ell(WHITE, 0.23, 0.27, 0.16, 0, 0, 0, eye);
      ell(0x1e5ad6, 0.12, 0.15, 0.05, s * -0.015, -0.01, 0.13, eye); // iris
      ell(0x101010, 0.08, 0.1, 0.05, s * -0.015, -0.01, 0.16, eye); // pupil
      ell(WHITE, 0.035, 0.04, 0.03, s * -0.05, 0.06, 0.19, eye); // glint
      // brow
      const brow = new THREE.Mesh(boxGeo, mat(FUR_DARK));
      brow.scale.set(0.3, 0.06, 0.1);
      brow.position.set(s * 0.01, 0.3, 0.1);
      brow.rotation.z = s * 0.25;
      head.add(brow);
      brow.position.x += s * 0.22;
      brow.position.y += 0.17;
      brow.position.z += 0.26;
    }
    // large ears
    for (const s of [-1, 1]) {
      const ear = reg(s < 0 ? 'earL' : 'earR', grp(s * 0.3, 0.38, -0.05, head));
      const e = new THREE.Mesh(coneGeo, mat(FUR));
      e.scale.set(0.24, 0.8, 0.12);
      e.position.y = 0.38;
      ear.add(e);
      const inner = new THREE.Mesh(coneGeo, mat(0xf29aa0));
      inner.scale.set(0.15, 0.58, 0.05);
      inner.position.set(0, 0.34, 0.08);
      ear.add(inner);
      ear.rotation.z = -s * 0.35;
    }
    // head tuft
    for (let i = -1; i <= 1; i++) {
      const t = new THREE.Mesh(coneGeo, mat(FUR_DARK));
      t.scale.set(0.09, 0.3, 0.09);
      t.position.set(i * 0.1, 0.46, 0.0);
      t.rotation.z = -i * 0.35;
      t.rotation.x = -0.3;
      head.add(t);
    }
    // arms
    for (const s of [-1, 1]) {
      const n = s < 0 ? 'L' : 'R';
      const sh = reg('arm' + n, grp(s * 0.5, 0.58, 0, torso));
      ell(FUR, 0.15, 0.15, 0.15, 0, 0, 0, sh);
      cyl(FUR, 0.11, 0.4, 0, -0.2, 0, sh);
      const el = reg('elbow' + n, grp(0, -0.4, 0, sh));
      ell(FUR, 0.11, 0.11, 0.11, 0, 0, 0, el);
      cyl(FUR, 0.1, 0.34, 0, -0.17, 0, el);
      // green fingerless glove: cuff + fist, bare finger nubs
      const hand = grp(0, -0.38, 0, el);
      cyl(GLOVE, 0.15, 0.16, 0, 0.02, 0, hand);
      ell(GLOVE, 0.19, 0.17, 0.19, 0, -0.1, 0, hand);
      for (let f = -1; f <= 1; f++) ell(BELLY, 0.055, 0.07, 0.055, f * 0.075, -0.25, 0.04, hand);
      ell(BELLY, 0.055, 0.07, 0.055, s * 0.16, -0.1, 0.06, hand);
    }
    // legs
    for (const s of [-1, 1]) {
      const n = s < 0 ? 'L' : 'R';
      const lg = reg('leg' + n, grp(s * 0.19, -0.05, 0, hips));
      cyl(SHORTS, 0.17, 0.3, 0, -0.12, 0, lg);
      const kn = reg('knee' + n, grp(0, -0.3, 0, lg));
      ell(FUR, 0.11, 0.11, 0.11, 0, 0, 0, kn);
      cyl(FUR, 0.1, 0.24, 0, -0.14, 0, kn);
      cyl(0xffffff, 0.12, 0.07, 0, -0.27, 0, kn); // sock
      const foot = reg('foot' + n, grp(0, -0.3, 0, kn));
      // oversized red sneaker
      ell(SNEAKER, 0.21, 0.17, 0.4, 0, -0.1, 0.12, foot);
      ell(WHITE, 0.215, 0.06, 0.43, 0, -0.245, 0.14, foot); // sole
      ell(WHITE, 0.17, 0.11, 0.14, 0, -0.1, 0.4, foot); // toe cap
      ell(WHITE, 0.225, 0.04, 0.16, 0, -0.04, 0.12, foot); // stripe
    }
    // tail
    const tail = reg('tail', grp(0, 0.0, -0.3, hips));
    for (let i = 0; i < 4; i++) ell(i === 3 ? BELLY : FUR, 0.1 - i * 0.012, 0.1 - i * 0.012, 0.2, 0, -0.04 * i, -0.25 - i * 0.28, tail);

    this.J = J;
  }

  // -------------------------------------------------------------- state
  reset() {
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.prevZ = 0;
    this.vy = 0;
    this.speed = 0;
    this.lane = 1;
    this.targetX = CONFIG.lanes.x[1];
    this.x = this.targetX;
    this.grounded = true;
    this.coyote = 0;
    this.sliding = false;
    this.slideTimer = 0;
    this.pendingSlide = 0;
    this.jumpBuffer = 0;
    this.hitTimer = 0;
    this.invuln = 0;
    this.mode = 'idle'; // idle | run | dead | dance
    this.falling = false;
    this.phase = 0;
    this.h = P.standHeight;
    this.groundY = 0;
    this.spin = 0;
    this.visualY = 0;
    this.root.visible = true;
    this.model.visible = true;
    this.root.rotation.set(0, 0, 0);
    this.model.rotation.set(0, Math.PI, 0);
    this.model.position.set(0, 0, 0);
    this.syncTransform();
    for (const k in this.J) this.J[k].obj.quaternion.identity();
  }

  get hw() { return P.halfWidth; }
  get hd() { return P.halfDepth; }

  moveLane(dir) {
    if (this.mode !== 'run' || this.falling) return false;
    const n = clamp(this.lane + dir, 0, 2);
    if (n === this.lane) return false;
    this.lane = n;
    this.targetX = CONFIG.lanes.x[n];
    this.callbacks.onLane?.();
    return true;
  }

  jump() {
    if (this.mode !== 'run' || this.falling) return;
    this.jumpBuffer = P.inputBuffer;
  }

  _doJump() {
    this.vy = P.jumpVelocity;
    this.grounded = false;
    this.coyote = 0;
    this.sliding = false;
    this.slideTimer = 0;
    this.jumpBuffer = 0;
    this.callbacks.onJump?.();
  }

  slide() {
    if (this.mode !== 'run' || this.falling) return;
    if (this.grounded) this._startSlide();
    else {
      this.vy = Math.min(this.vy, -P.fastFall);
      this.pendingSlide = 0.25;
    }
  }

  _startSlide() {
    this.sliding = true;
    this.slideTimer = P.slideDuration;
    this.pendingSlide = 0;
    this.callbacks.onSlide?.();
  }

  bounce(v) {
    this.vy = v;
    this.grounded = false;
    this.sliding = false;
    this.slideTimer = 0;
    this.coyote = 0;
    this.spin = 0.001;
  }

  hit() {
    this.hitTimer = P.hitStagger;
    this.invuln = P.hitInvuln;
    this.sliding = false;
    this.slideTimer = 0;
  }

  get box() {
    return {
      x0: this.x - P.halfWidth, x1: this.x + P.halfWidth,
      y0: this.y, y1: this.y + this.h,
      z0: Math.min(this.z, this.prevZ) - P.halfDepth, z1: Math.max(this.z, this.prevZ) + P.halfDepth,
    };
  }

  // ------------------------------------------------------------- update
  update(dt, speed, groundY) {
    this.time += dt;
    this.speed = speed;
    this.groundY = groundY;
    this.prevZ = this.z;
    if (this.mode === 'run' && !this.falling) this.z -= speed * dt;

    // lane interpolation
    this.x = damp(this.x, this.targetX, CONFIG.lanes.switchRate, dt);
    if (Math.abs(this.x - this.targetX) < 0.004) this.x = this.targetX;

    if (this.hitTimer > 0) this.hitTimer -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.jumpBuffer > 0) this.jumpBuffer -= dt;
    if (this.pendingSlide > 0) this.pendingSlide -= dt;

    if (this.mode === 'run' || this.mode === 'dead') {
      // walked off a platform / edge?
      if (this.grounded && groundY < this.y - 0.02) {
        this.grounded = false;
        this.coyote = P.coyoteTime;
      }
      if (this.grounded) {
        this.coyote = P.coyoteTime;
        if (this.jumpBuffer > 0 && this.mode === 'run') this._doJump();
      } else {
        this.coyote -= dt;
        if (this.jumpBuffer > 0 && this.coyote > 0 && this.vy <= 0 && !this.falling && this.mode === 'run') this._doJump();
        this.vy -= P.gravity * dt;
        this.y += this.vy * dt;
        if (this.y <= groundY && this.vy <= 0) {
          const impact = -this.vy;
          this.y = groundY;
          this.vy = 0;
          this.grounded = true;
          this.spin = 0;
          if (impact > 8) this.callbacks.onLand?.(impact);
          if (this.pendingSlide > 0 && this.mode === 'run') this._startSlide();
          else if (this.jumpBuffer > 0 && this.mode === 'run') this._doJump();
        }
      }
    }

    if (this.sliding) {
      this.slideTimer -= dt;
      if (this.slideTimer <= 0 || !this.grounded) {
        this.sliding = false;
      }
    }
    this.h = this.sliding ? P.slideHeight : P.standHeight;
    this.syncTransform();
    this.animate(dt);
  }

  syncTransform() {
    this.root.position.set(this.x, this.y, this.z);
    const dx = this.targetX - this.x;
    this.root.rotation.z = -dx * 0.07;
    this.root.rotation.y = -dx * 0.12;
    // shadow stays on the ground below the hero
    const gy = Number.isFinite(this.groundY) ? Math.max(this.groundY, 0) : 0;
    this.shadow.visible = this.root.visible && !this.falling && Number.isFinite(this.groundY);
    const hgt = Math.max(0, this.y - gy);
    const s = 1 / (1 + hgt * 0.25);
    this.shadow.scale.set(s, s, 1);
    this.shadow.position.set(this.x, gy + 0.05, this.z);
  }

  // ---------------------------------------------------------- animation
  pose(name, x = 0, y = 0, z = 0) {
    const j = this.J[name];
    j.e.set(x, y, z);
    j.q.setFromEuler(j.e);
  }

  animState() {
    if (this.mode === 'dance') return 'dance';
    if (this.mode === 'idle') return 'idle';
    if (this.mode === 'dead' || this.hitTimer > 0) return 'hit';
    if (this.falling) return 'fall';
    if (!this.grounded) return 'jump';
    if (this.sliding) return 'slide';
    return 'run';
  }

  animate(dt) {
    const t = this.time;
    const st = this.animState();
    const J = this.J;
    const model = this.model;
    let rate = 18;
    let my = 0, mrx = 0, mry = Math.PI, mrz = 0;
    // reset all targets to neutral, then override
    for (const k in J) J[k].q.identity();
    this.pose('tail', -0.3, Math.sin(t * 3) * 0.2, 0);
    this.pose('earL', 0, 0, 0.35);
    this.pose('earR', 0, 0, -0.35);
    let blink = 1;

    if (st === 'run') {
      const cadence = 9.5 + (this.speed - CONFIG.speed.start) * 0.25;
      this.phase += dt * cadence;
      const p = this.phase;
      const sw = Math.sin(p);
      const cs = Math.cos(p);
      this.pose('legL', -sw * 1.0 - 0.1, 0, 0);
      this.pose('legR', sw * 1.0 - 0.1, 0, 0);
      this.pose('kneeL', Math.max(0, cs) * 1.5 + 0.25, 0, 0);
      this.pose('kneeR', Math.max(0, -cs) * 1.5 + 0.25, 0, 0);
      this.pose('footL', Math.max(0, cs) * 0.5 - 0.15, 0, 0);
      this.pose('footR', Math.max(0, -cs) * 0.5 - 0.15, 0, 0);
      this.pose('armL', sw * 1.1, 0, 0.12);
      this.pose('armR', -sw * 1.1, 0, -0.12);
      this.pose('elbowL', -1.2 - Math.max(0, sw) * 0.3, 0, 0);
      this.pose('elbowR', -1.2 - Math.max(0, -sw) * 0.3, 0, 0);
      this.pose('torso', 0.28, sw * 0.2, 0);
      this.pose('hips', 0, -sw * 0.15, 0);
      this.pose('head', -0.12, -sw * 0.1, Math.sin(p * 2) * 0.03);
      this.pose('tail', -0.2 + Math.sin(p * 2) * 0.1, Math.sin(p) * 0.5, 0);
      this.pose('earL', -0.3 + Math.sin(p * 2) * 0.2, 0, 0.55);
      this.pose('earR', -0.3 + Math.sin(p * 2 + 1) * 0.2, 0, -0.55);
      my = 0.1 * (0.5 + 0.5 * Math.cos(2 * p)) + 0.02;
    } else if (st === 'jump') {
      const tuck = clamp((this.vy + 4) / 14, 0, 1);
      const rising = this.vy > 0;
      this.pose('legL', -1.35 * tuck - 0.5 * (1 - tuck), 0, 0.05);
      this.pose('legR', -0.85 * tuck - 0.3 * (1 - tuck), 0, -0.05);
      this.pose('kneeL', 1.9 * tuck + 0.25 * (1 - tuck), 0, 0);
      this.pose('kneeR', 1.5 * tuck + 0.15 * (1 - tuck), 0, 0);
      this.pose('footL', 0.4, 0, 0);
      this.pose('footR', 0.2, 0, 0);
      const up = rising ? -2.7 : -1.2;
      this.pose('armL', up, 0, 0.5 + (rising ? 0 : 0.8));
      this.pose('armR', up, 0, -0.5 - (rising ? 0 : 0.8));
      this.pose('elbowL', -0.3, 0, 0);
      this.pose('elbowR', -0.3, 0, 0);
      this.pose('torso', rising ? 0.2 : 0.35, 0, 0);
      this.pose('head', rising ? -0.3 : 0.1, 0, 0);
      this.pose('earL', 0.5, 0, 0.7);
      this.pose('earR', 0.5, 0, -0.7);
      this.pose('tail', 0.5, 0, 0);
      my = 0.05;
      if (this.spin > 0) {
        this.spin += dt * 14;
        mrx = -Math.min(this.spin, Math.PI * 2);
        if (this.spin > Math.PI * 2) this.spin = 0;
      }
    } else if (st === 'slide') {
      this.pose('legL', -0.25, 0, 0.1);
      this.pose('legR', -0.35, 0, -0.1);
      this.pose('kneeL', 0.15, 0, 0);
      this.pose('kneeR', 0.35, 0, 0);
      this.pose('footL', 0.5, 0, 0);
      this.pose('footR', 0.5, 0, 0);
      this.pose('armL', 2.2, 0, 0.3);
      this.pose('armR', 2.4, 0, -0.3);
      this.pose('elbowL', -0.2, 0, 0);
      this.pose('elbowR', -0.2, 0, 0);
      this.pose('torso', 0.1, 0, 0);
      this.pose('head', 0.9, 0, 0);
      this.pose('earL', 0.9, 0, 0.9);
      this.pose('earR', 0.9, 0, -0.9);
      mrx = 1.2;
      my = 0.34;
      rate = 24;
    } else if (st === 'hit') {
      const sh = Math.sin(t * 40);
      this.pose('legL', -0.4, 0, 0.2);
      this.pose('legR', 0.3, 0, -0.2);
      this.pose('kneeL', 0.6, 0, 0);
      this.pose('kneeR', 0.4, 0, 0);
      this.pose('armL', -2.2, 0, 0.9 + sh * 0.2);
      this.pose('armR', -2.0, 0, -0.9 - sh * 0.2);
      this.pose('elbowL', -0.3, 0, 0);
      this.pose('elbowR', -0.3, 0, 0);
      this.pose('torso', -0.45, 0, 0);
      this.pose('head', -0.3, sh * 0.35, 0.2);
      this.pose('earL', 0.9, 0, 0.9);
      this.pose('earR', 0.9, 0, -0.9);
      mrx = 0.35 + (this.mode === 'dead' ? 0.4 : 0);
      my = 0.05;
      blink = 0.15;
      rate = 30;
    } else if (st === 'fall') {
      const fl = Math.sin(t * 22);
      this.pose('legL', -0.8 + fl * 0.8, 0, 0.2);
      this.pose('legR', -0.8 - fl * 0.8, 0, -0.2);
      this.pose('kneeL', 0.7, 0, 0);
      this.pose('kneeR', 0.7, 0, 0);
      this.pose('armL', -2.8 + fl * 0.3, 0, 0.6);
      this.pose('armR', -2.8 - fl * 0.3, 0, -0.6);
      this.pose('elbowL', -0.2, 0, 0);
      this.pose('elbowR', -0.2, 0, 0);
      this.pose('earL', 1.2, 0, 0.9);
      this.pose('earR', 1.2, 0, -0.9);
      mrx = 0.5;
      blink = 1.3;
    } else if (st === 'dance') {
      const b = t * 7;
      this.pose('hips', 0, Math.sin(b) * 0.4, Math.sin(b) * 0.12);
      this.pose('torso', 0.05, -Math.sin(b) * 0.3, -Math.sin(b) * 0.1);
      this.pose('legL', -0.2 - Math.max(0, Math.sin(b)) * 0.9, 0, 0.12);
      this.pose('legR', -0.2 - Math.max(0, -Math.sin(b)) * 0.9, 0, -0.12);
      this.pose('kneeL', 0.3 + Math.max(0, Math.sin(b)) * 1.2, 0, 0);
      this.pose('kneeR', 0.3 + Math.max(0, -Math.sin(b)) * 1.2, 0, 0);
      this.pose('armL', -2.6 + Math.sin(b) * 0.5, 0, 0.5);
      this.pose('armR', -2.6 - Math.sin(b) * 0.5, 0, -0.5);
      this.pose('elbowL', -0.6 + Math.sin(b * 2) * 0.4, 0, 0);
      this.pose('elbowR', -0.6 - Math.sin(b * 2) * 0.4, 0, 0);
      this.pose('head', Math.sin(b * 2) * 0.15, Math.sin(b) * 0.4, Math.sin(b) * 0.2);
      this.pose('earL', Math.sin(b * 2) * 0.4, 0, 0.5);
      this.pose('earR', -Math.sin(b * 2) * 0.4, 0, -0.5);
      this.pose('tail', -0.2, Math.sin(b) * 0.9, 0);
      my = Math.abs(Math.sin(b)) * 0.28;
      mry = Math.PI + Math.sin(t * 2) * 0.9;
      rate = 20;
    } else {
      // idle (menus): breathing, foot tap, looking around
      const b = t * 2.2;
      this.pose('torso', 0.06 + Math.sin(b) * 0.025, 0, 0);
      this.pose('head', Math.sin(t * 0.8) * 0.12, Math.sin(t * 0.7) * 0.5, Math.sin(t * 0.5) * 0.08);
      this.pose('armL', 0.15 + Math.sin(b) * 0.08, 0, 0.2);
      this.pose('armR', 0.1 - Math.sin(b) * 0.08, 0, -0.2);
      this.pose('elbowL', -0.35, 0, 0);
      this.pose('elbowR', -0.45, 0, 0);
      this.pose('legL', -0.05, 0, 0.04);
      this.pose('legR', -0.1 - Math.max(0, Math.sin(t * 5)) * 0.08, 0, -0.04);
      this.pose('footR', Math.max(0, Math.sin(t * 5)) * 0.25, 0, 0);
      this.pose('earL', Math.sin(t * 1.3) * 0.12, 0, 0.35 + Math.max(0, Math.sin(t * 0.9 + 1)) * 0.15);
      this.pose('earR', -Math.sin(t * 1.1) * 0.12, 0, -0.35);
      this.pose('tail', -0.2, Math.sin(t * 1.6) * 0.5, 0);
      my = Math.sin(b) * 0.012;
      mry = Math.PI + Math.sin(t * 0.5) * 0.12;
    }

    // blink
    const bt = (t % 3.2) / 3.2;
    if (bt > 0.96) blink *= 0.1;
    J.eyeL.obj.scale.y = damp(J.eyeL.obj.scale.y, blink, 30, dt);
    J.eyeR.obj.scale.y = J.eyeL.obj.scale.y;

    // blend joint quaternions toward targets
    const k = 1 - Math.exp(-rate * dt);
    for (const name in J) {
      if (name === 'eyeL' || name === 'eyeR') continue;
      J[name].obj.quaternion.slerp(J[name].q, k);
    }
    model.position.y = damp(model.position.y, my, 22, dt);
    model.rotation.x = damp(model.rotation.x, mrx, st === 'jump' && this.spin > 0 ? 60 : rate * 0.6, dt);
    model.rotation.y = damp(model.rotation.y, mry, 8, dt);
    model.rotation.z = damp(model.rotation.z, mrz, 10, dt);

    // invulnerability flicker
    this.model.visible = !(this.invuln > 0 && this.mode !== 'dead' && Math.sin(t * 45) > 0.2);
  }
}
