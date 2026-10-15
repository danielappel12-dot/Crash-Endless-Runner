import { CONFIG, laneY } from '../config/settings.js';

// Fixed-size 2D particle pool: dots, stars, wood/stone chunks, rings, text pops.
// Positions are world x and height-above-ground y.
const hex = (n) => '#' + n.toString(16).padStart(6, '0');

export class ParticleSystem {
  constructor() {
    this.list = [];
    for (let i = 0; i < CONFIG.particles.max; i++) {
      this.list.push({ life: 0, x: 0, y: 0, vx: 0, vy: 0, max: 1, size: 8, color: '#fff', type: 'dot', rot: 0, vr: 0, g: 0, grow: 0, text: '', lane: 1 });
    }
    this.next = 0;
    this.lane = 1;
  }

  _get() {
    const p = this.list[this.next];
    this.next = (this.next + 1) % this.list.length;
    p.lane = this.lane;
    return p;
  }

  emit(x, y, count, o = {}) {
    const colors = o.colors || [o.color ?? 0xffffff];
    for (let k = 0; k < count; k++) {
      const p = this._get();
      const a = (o.angle ?? Math.random() * Math.PI * 2) + (o.angle !== undefined ? (Math.random() - 0.5) * (o.arc ?? 1) : 0);
      const sp = (o.speed ?? 260) * (0.4 + Math.random() * 0.8);
      p.x = x + (Math.random() - 0.5) * (o.spread ?? 10);
      p.y = y + (Math.random() - 0.5) * (o.spread ?? 10);
      p.vx = Math.cos(a) * sp + (o.vx ?? 0);
      p.vy = Math.sin(a) * sp + (o.up ?? 0) * Math.random();
      p.max = p.life = (o.life ?? 0.6) * (0.6 + Math.random() * 0.6);
      p.size = (o.size ?? 10) * (0.6 + Math.random() * 0.8);
      p.color = typeof colors[0] === 'number' ? hex(colors[(Math.random() * colors.length) | 0]) : colors[(Math.random() * colors.length) | 0];
      p.type = o.type || 'dot';
      p.rot = Math.random() * 6;
      p.vr = (Math.random() - 0.5) * 12;
      p.g = o.gravity ?? 900;
      p.grow = o.grow ?? 0;
    }
  }

  stars(x, y, count, colors, speed = 380) {
    this.emit(x, y, count, { colors, type: 'star', speed, up: 200, life: 0.7, size: 16, gravity: 900 });
  }

  chunks(x, y, count, colors, power = 520) {
    this.emit(x, y, count, { colors, type: 'chunk', speed: power, up: power * 0.8, life: 1.0, size: 16, gravity: 2200, spread: 40 });
  }

  ring(x, y, color, size = 20, life = 0.45) {
    const p = this._get();
    p.x = x; p.y = y; p.vx = p.vy = 0; p.g = 0;
    p.max = p.life = life; p.size = size; p.grow = 160;
    p.color = typeof color === 'number' ? hex(color) : color;
    p.type = 'ring'; p.rot = 0; p.vr = 0;
  }

  // cartoon "POW!" style burst text
  pop(x, y, text, color = '#ffd23a') {
    const p = this._get();
    p.x = x; p.y = y; p.vx = 0; p.vy = 90; p.g = 0;
    p.max = p.life = 0.8; p.size = 40; p.grow = 0;
    p.color = color; p.type = 'text'; p.text = text; p.rot = (Math.random() - 0.5) * 0.4; p.vr = 0;
  }

  update(dt) {
    for (const p of this.list) {
      if (p.life <= 0) continue;
      p.life -= dt;
      p.vy -= p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.type === 'chunk' && p.y < 4) {
        p.y = 4;
        p.vy *= -0.4;
        p.vx *= 0.7;
      }
      if (p.type === 'ring') p.size += p.grow * dt;
    }
  }

  draw(ctx, camX, r) {
    for (const p of this.list) {
      if (p.life <= 0) continue;
      const t = Math.max(0, p.life / p.max);
      const sx = r.snap(p.x - camX);
      const sy = r.snap(laneY(p.lane) - p.y);
      ctx.save();
      ctx.translate(sx, sy);
      ctx.globalAlpha = Math.min(1, t * 1.8);
      if (p.type === 'dot') {
        const s = p.size * (0.5 + t * 0.5);
        ctx.fillStyle = p.color;
        ctx.strokeStyle = 'rgba(40,20,8,0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, s, 0, 7);
        ctx.fill();
        ctx.stroke();
      } else if (p.type === 'star') {
        ctx.rotate(p.rot);
        const s = p.size * (0.4 + t * 0.6);
        ctx.fillStyle = p.color;
        ctx.strokeStyle = '#2b1608';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const r = i % 2 ? s * 0.45 : s;
          const a = (i / 10) * Math.PI * 2;
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (p.type === 'chunk') {
        ctx.rotate(p.rot);
        const s = p.size * Math.min(1, t * 3);
        ctx.fillStyle = p.color;
        ctx.strokeStyle = '#2b1608';
        ctx.lineWidth = 2.5;
        ctx.fillRect(-s / 2, -s / 3, s, s * 0.66);
        ctx.strokeRect(-s / 2, -s / 3, s, s * 0.66);
      } else if (p.type === 'ring') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 6 * t + 1;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, 7);
        ctx.stroke();
      } else if (p.type === 'text') {
        ctx.rotate(p.rot);
        const sc = 0.6 + Math.min(1, (1 - t) * 6) * 0.5;
        ctx.scale(sc, sc);
        ctx.font = '900 44px Impact, "Arial Black", sans-serif';
        ctx.textAlign = 'center';
        ctx.lineWidth = 9;
        ctx.strokeStyle = '#2b1608';
        ctx.lineJoin = 'round';
        ctx.strokeText(p.text, 0, 0);
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, 0, 0);
      }
      ctx.restore();
    }
  }

  clear() {
    for (const p of this.list) p.life = 0;
  }
}
