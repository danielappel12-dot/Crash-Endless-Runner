import { CONFIG } from '../config/settings.js';

// The hero "Rukk": an original cartoon marsupial drawn with canvas paths.
// Physics works in pixels with y = height above the ground line. Limb angles
// are driven by sine-wave pose targets that are damped every frame.

const P = CONFIG.player;
const OUT = '#2b1608';
const FUR = '#e2782a', FUR_D = '#b85516', BELLY = '#ffd9a0';
const GLOVE = '#33d046', SHORTS = '#2f6be8', SNEAK = '#ee2c2c', WHITE = '#ffffff';

const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const NEUTRAL = {
  lean: 0.2, bob: 0, thighF: 0, kneeF: 0, thighB: 0, kneeB: 0, armF: 0, elbowF: 0, armB: 0, elbowB: 0,
  head: 0, ear: 0, tail: 0, rot: 0, blink: 1, hipDrop: 0,
};

export class Player {
  constructor() {
    this.callbacks = {};
    this.time = 0;
    this.pose = { ...NEUTRAL };
    this.reset();
  }

  reset() {
    this.y = 0;
    this.vy = 0;
    this.speed = 0;
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
    this.groundY = 0;
    this.squash = 0; // +stretch / -squash, decays
    this.spin = 0;
    this.fallGap = null;
    this.h = P.standHeight;
    this.pose = { ...NEUTRAL };
  }

  get hw() { return P.halfWidth; }

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
    this.squash = 0.28;
    this.callbacks.onJump?.();
  }

  slide() {
    if (this.mode !== 'run' || this.falling) return;
    if (this.sliding && this.grounded) {
      this.slideTimer = P.slideDuration; // holding / re-pressing keeps the slide going
      return;
    }
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
    this.squash = 0.4;
    this.spin = 0.001;
  }

  hit() {
    this.hitTimer = P.hitStagger;
    this.invuln = P.hitInvuln;
    this.sliding = false;
    this.slideTimer = 0;
    this.squash = -0.3;
  }

  update(dt, speed, groundH) {
    this.time += dt;
    this.speed = speed;
    this.groundY = groundH;
    if (this.hitTimer > 0) this.hitTimer -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.jumpBuffer > 0) this.jumpBuffer -= dt;
    if (this.pendingSlide > 0) this.pendingSlide -= dt;
    this.squash = damp(this.squash, 0, 9, dt);

    if (this.mode === 'run' || this.mode === 'dead') {
      if (this.grounded && groundH < this.y - 0.5) {
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
        if (this.y <= groundH && this.vy <= 0) {
          const impact = -this.vy;
          this.y = groundH;
          this.vy = 0;
          this.grounded = true;
          this.spin = 0;
          if (impact > 500) {
            this.squash = -clamp(impact / 3200, 0.15, 0.35);
            this.callbacks.onLand?.(impact);
          }
          if (this.pendingSlide > 0 && this.mode === 'run') this._startSlide();
          else if (this.jumpBuffer > 0 && this.mode === 'run') this._doJump();
        }
      }
    }
    if (this.sliding) {
      this.slideTimer -= dt;
      if (this.slideTimer <= 0 || !this.grounded) this.sliding = false;
    }
    this.h = this.sliding ? P.slideHeight : P.standHeight;
    this.animate(dt);
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
    const T = { ...NEUTRAL };
    let rate = 18;
    if (st === 'run') {
      const cadence = 10 + (this.speed - CONFIG.speed.start) * 0.22;
      this.phase += dt * cadence;
      const p = this.phase, sw = Math.sin(p), cs = Math.cos(p);
      T.thighF = sw * 0.95; T.thighB = -sw * 0.95;
      T.kneeF = -(Math.max(0, cs) * 1.5 + 0.2); T.kneeB = -(Math.max(0, -cs) * 1.5 + 0.2);
      T.armF = -sw * 1.05; T.armB = sw * 1.05;
      T.elbowF = 1.2; T.elbowB = 1.2;
      T.lean = 0.24; T.head = -0.08 + sw * 0.05; T.ear = -0.5 + Math.sin(p * 2) * 0.3;
      T.tail = Math.sin(p) * 0.4;
      T.bob = Math.abs(Math.cos(p)) * 7;
    } else if (st === 'jump') {
      const tuck = clamp((this.vy + 300) / 1000, 0, 1);
      T.thighF = 1.25 * tuck + 0.4 * (1 - tuck); T.thighB = 0.8 * tuck + 0.1 * (1 - tuck);
      T.kneeF = -1.9 * tuck - 0.2; T.kneeB = -1.5 * tuck - 0.2;
      const up = this.vy > 0 ? 2.75 : 2.1;
      T.armF = up; T.armB = up - 0.35; T.elbowF = 0.3; T.elbowB = 0.2;
      T.lean = this.vy > 0 ? 0.1 : 0.25; T.head = this.vy > 0 ? -0.25 : 0.1;
      T.ear = this.vy > 0 ? -1.0 : 0.8; T.tail = 0.5;
      if (this.spin > 0) {
        this.spin += dt * 10;
        T.rot = this.spin;
        if (this.spin > Math.PI * 2) this.spin = 0;
      }
    } else if (st === 'slide') {
      T.rot = -1.25; T.hipDrop = 10;
      T.thighF = 0.2; T.thighB = 0.45; T.kneeF = -0.1; T.kneeB = -0.2;
      T.armF = -1.9; T.armB = -2.2; T.elbowF = 0.2; T.elbowB = 0.2;
      T.lean = 0; T.head = 0.7; T.ear = -1.3; T.tail = 0.6;
      rate = 24;
    } else if (st === 'hit') {
      const sh = Math.sin(t * 40);
      T.rot = -0.4 - (this.mode === 'dead' ? 0.3 : 0); T.lean = 0;
      T.thighF = 0.5; T.thighB = -0.3; T.kneeF = -0.6; T.kneeB = -0.4;
      T.armF = 2.5 + sh * 0.2; T.armB = 2.3 - sh * 0.2; T.elbowF = 0.3; T.elbowB = 0.3;
      T.head = -0.25 + sh * 0.12; T.ear = 1.0; T.blink = 0.15; rate = 30;
    } else if (st === 'fall') {
      const fl = Math.sin(t * 22);
      T.thighF = 0.8 + fl * 0.7; T.thighB = 0.8 - fl * 0.7; T.kneeF = -0.7; T.kneeB = -0.7;
      T.armF = 2.8 + fl * 0.3; T.armB = 2.6 - fl * 0.3; T.elbowF = 0.2; T.elbowB = 0.2;
      T.rot = 0.4; T.ear = 1.4; T.blink = 1.2;
    } else if (st === 'dance') {
      const b = t * 7;
      T.thighF = Math.max(0, Math.sin(b)) * 0.9; T.thighB = Math.max(0, -Math.sin(b)) * 0.9;
      T.kneeF = -Math.max(0, Math.sin(b)) * 1.2 - 0.1; T.kneeB = -Math.max(0, -Math.sin(b)) * 1.2 - 0.1;
      T.armF = 2.6 + Math.sin(b) * 0.5; T.armB = 2.6 - Math.sin(b) * 0.5;
      T.elbowF = 0.5 + Math.sin(b * 2) * 0.4; T.elbowB = 0.5 - Math.sin(b * 2) * 0.4;
      T.lean = Math.sin(b) * 0.15; T.rot = Math.sin(b) * 0.12; T.head = Math.sin(b * 2) * 0.2;
      T.ear = Math.sin(b * 2) * 0.6; T.tail = Math.sin(b) * 0.9; T.bob = Math.abs(Math.sin(b)) * 22;
      rate = 20;
    } else {
      const b = t * 2.2;
      T.lean = 0.05 + Math.sin(b) * 0.02; T.head = Math.sin(t * 0.8) * 0.12;
      T.armF = 0.15 + Math.sin(b) * 0.08; T.armB = -0.1 - Math.sin(b) * 0.08; T.elbowF = 0.3; T.elbowB = 0.4;
      T.thighF = 0.05; T.thighB = -0.05 - Math.max(0, Math.sin(t * 5)) * 0.1;
      T.ear = Math.sin(t * 1.3) * 0.25; T.tail = Math.sin(t * 1.6) * 0.6; T.bob = Math.sin(b) * 1.5;
    }
    const bt = (t % 3.2) / 3.2;
    if (bt > 0.96) T.blink *= 0.1;
    const k = rate;
    const p = this.pose;
    for (const key in T) p[key] = damp(p[key], T[key], key === 'blink' ? 30 : k, dt);
  }

  // ------------------------------------------------------------------ draw
  limb(ctx, a1, l1, a2, l2, w, color, color1 = color) {
    const x1 = Math.sin(a1) * l1, y1 = Math.cos(a1) * l1;
    const x2 = x1 + Math.sin(a1 + a2) * l2, y2 = y1 + Math.cos(a1 + a2) * l2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = w + 7;
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.stroke();
    if (color1 !== color) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(x1 * 0.8, y1 * 0.8);
      ctx.strokeStyle = color1;
      ctx.lineWidth = w + 5;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x1 * 0.8, y1 * 0.8);
      ctx.lineTo(x1 * 0.8 + (x1 * 0.2), y1 * 0.8 + (y1 * 0.2));
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    return [x2, y2, a1 + a2];
  }

  shoe(ctx, x, y, ang) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-ang * 0.45 + 0.05);
    ctx.beginPath();
    ctx.ellipse(10, 6, 26, 14, 0, 0, 7);
    ctx.fillStyle = SNEAK;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = OUT;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(22, 6, 11, 10, 0, 0, 7);
    ctx.fillStyle = WHITE;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-14, 16);
    ctx.lineTo(34, 16);
    ctx.lineWidth = 6;
    ctx.strokeStyle = WHITE;
    ctx.stroke();
    ctx.restore();
  }

  glove(ctx, x, y) {
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, 7);
    ctx.fillStyle = GLOVE;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = OUT;
    ctx.stroke();
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.arc(x + 7 + i * 1, y + i * 6, 4, 0, 7);
      ctx.fillStyle = BELLY;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  }

  // sx, sy = screen position of feet at ground contact
  draw(ctx, sx, groundSy) {
    const p = this.pose;
    const flicker = this.invuln > 0 && this.mode !== 'dead' && Math.sin(this.time * 45) > 0.2;
    if (flicker) return;
    const sy = groundSy - this.y;
    // ground shadow
    const hgt = Math.max(0, this.y - (Number.isFinite(this.groundY) ? this.groundY : 0));
    if (Number.isFinite(this.groundY) && !this.falling) {
      const k = 1 / (1 + hgt / 220);
      ctx.save();
      ctx.fillStyle = 'rgba(30,15,5,0.28)';
      ctx.beginPath();
      ctx.ellipse(sx, groundSy - Math.max(0, this.groundY) + 3, 46 * k, 9 * k, 0, 0, 7);
      ctx.fill();
      ctx.restore();
    }
    ctx.save();
    ctx.translate(sx, sy);
    // squash & stretch around the feet
    const sq = this.squash;
    ctx.scale(1 - sq * 0.55, 1 + sq);
    let scx = 1;
    if (this.mode === 'dance') scx = Math.cos(this.time * 3);
    ctx.scale(scx, 1);

    ctx.translate(0, -62 + p.hipDrop - p.bob + (this.sliding ? 0 : 0));
    ctx.rotate(p.rot);
    ctx.rotate(p.lean * 0.0);

    // tail (behind body)
    ctx.save();
    ctx.translate(-14, -6);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-34, 16 + p.tail * 22, -62, -14 + p.tail * 30);
    ctx.lineCap = 'round';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 19;
    ctx.stroke();
    ctx.strokeStyle = FUR;
    ctx.lineWidth = 12;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-62, -14 + p.tail * 30, 8, 0, 7);
    ctx.fillStyle = BELLY;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = OUT;
    ctx.stroke();
    ctx.restore();

    // back leg + back arm
    const drawLeg = (th, kn) => {
      ctx.save();
      ctx.translate(-2, 2);
      const [ex, ey, ea] = this.limb(ctx, th, 28, kn, 30, 15, FUR_D, SHORTS);
      this.shoe(ctx, ex, ey, ea);
      ctx.restore();
    };
    drawLeg(p.thighB, p.kneeB);
    ctx.save();
    ctx.translate(0, 0);
    ctx.rotate(p.lean);
    ctx.save();
    ctx.translate(-2, -44);
    const [bx, by] = this.limb(ctx, p.armB, 24, p.elbowB, 24, 13, FUR_D);
    this.glove(ctx, bx, by);
    ctx.restore();

    // torso
    ctx.beginPath();
    ctx.ellipse(0, -28, 22, 30, 0, 0, 7);
    ctx.fillStyle = FUR;
    ctx.fill();
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = OUT;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(7, -24, 12, 19, 0.1, 0, 7);
    ctx.fillStyle = BELLY;
    ctx.fill();
    ctx.restore();

    // shorts
    ctx.beginPath();
    ctx.ellipse(0, 2, 24, 15, 0, 0, 7);
    ctx.fillStyle = SHORTS;
    ctx.fill();
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = OUT;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-23, -6);
    ctx.quadraticCurveTo(0, -12, 23, -6);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#ffe9a0';
    ctx.stroke();

    // front leg
    drawLeg(p.thighF, p.kneeF);

    // head
    ctx.save();
    ctx.rotate(p.lean);
    ctx.translate(8, -88);
    ctx.rotate(p.head);
    // ear behind head
    this.ear(ctx, -12, -22, -0.35 + p.ear * 0.5, 1);
    ctx.beginPath();
    ctx.arc(0, 0, 31, 0, 7);
    ctx.fillStyle = FUR;
    ctx.fill();
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = OUT;
    ctx.stroke();
    // snout
    ctx.beginPath();
    ctx.ellipse(31, 8, 25, 15, 0.12, 0, 7);
    ctx.fillStyle = FUR;
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(32, 15, 20, 8, 0.1, 0, 7);
    ctx.fillStyle = BELLY;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.stroke();
    // nose
    ctx.beginPath();
    ctx.ellipse(54, 3, 8, 7, 0, 0, 7);
    ctx.fillStyle = '#2a1410';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(52, 0, 2.2, 0, 7);
    ctx.fillStyle = WHITE;
    ctx.fill();
    // grin
    ctx.beginPath();
    ctx.arc(36, 12, 12, 0.15, 1.9);
    ctx.lineWidth = 3;
    ctx.strokeStyle = OUT;
    ctx.stroke();
    // oversized eyes
    const eye = (ex, ey, rx, ry, look) => {
      ctx.save();
      ctx.translate(ex, ey);
      ctx.scale(1, p.blink);
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, 7);
      ctx.fillStyle = WHITE;
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = OUT;
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(look, 1, rx * 0.55, ry * 0.62, 0, 0, 7);
      ctx.fillStyle = '#2a72e8';
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(look + 1.5, 1, rx * 0.3, ry * 0.4, 0, 0, 7);
      ctx.fillStyle = '#101010';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(look - 2, -5, 3.3, 0, 7);
      ctx.fillStyle = WHITE;
      ctx.fill();
      ctx.restore();
    };
    eye(-3, -8, 11, 15, 3);
    eye(17, -8, 14, 18, 4);
    // brow
    ctx.beginPath();
    ctx.moveTo(8, -29);
    ctx.lineTo(28, -27 - (p.blink < 0.5 ? -3 : 0));
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = FUR_D;
    ctx.stroke();
    // tuft
    ctx.fillStyle = FUR_D;
    ctx.lineWidth = 3;
    ctx.strokeStyle = OUT;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(-2 + i * 8, -28);
      ctx.lineTo(i * 10 + 6, -46 - (i === 0 ? 5 : 0));
      ctx.lineTo(8 + i * 8, -28);
      ctx.fill();
      ctx.stroke();
    }
    this.ear(ctx, 4, -26, 0.15 + p.ear * 0.5, 1.1);
    ctx.restore();

    // front arm
    ctx.save();
    ctx.rotate(p.lean);
    ctx.translate(4, -44);
    const [fx, fy] = this.limb(ctx, p.armF, 24, p.elbowF, 24, 14, FUR);
    this.glove(ctx, fx, fy);
    ctx.restore();

    ctx.restore();

    if (this.animState() === 'hit') {
      // dizzy stars
      ctx.save();
      ctx.translate(sx, sy - 170);
      for (let i = 0; i < 3; i++) {
        const a = this.time * 8 + (i * Math.PI * 2) / 3;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 34, Math.sin(a) * 9, 6, 0, 7);
        ctx.fillStyle = '#ffd23a';
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = OUT;
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  ear(ctx, x, y, ang, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.scale(s, s);
    ctx.beginPath();
    ctx.moveTo(-13, 0);
    ctx.quadraticCurveTo(-18, -50, 2, -66);
    ctx.quadraticCurveTo(18, -46, 13, 0);
    ctx.closePath();
    ctx.fillStyle = FUR;
    ctx.fill();
    ctx.lineWidth = 4.5;
    ctx.strokeStyle = OUT;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-6, -4);
    ctx.quadraticCurveTo(-8, -38, 2, -52);
    ctx.quadraticCurveTo(9, -36, 6, -4);
    ctx.closePath();
    ctx.fillStyle = '#ff9aa6';
    ctx.fill();
    ctx.restore();
  }
}
