import { store } from '../config/settings.js';

// Normalises keyboard, swipe and on-screen buttons into named actions:
// left, right, jump, slide, pause, restart.

const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'jump', KeyW: 'jump', Space: 'jump',
  ArrowDown: 'slide', KeyS: 'slide',
  Escape: 'pause', KeyP: 'pause',
  KeyR: 'restart',
  Enter: 'confirm',
};

export class InputManager {
  constructor(target, onAction) {
    this.onAction = onAction;
    this.held = new Set();
    window.addEventListener('keydown', (e) => {
      const a = KEYMAP[e.code];
      if (!a) return;
      if (['jump', 'slide', 'left', 'right'].includes(a) || e.code === 'Space') e.preventDefault();
      if (e.repeat && a !== 'slide') return;
      this.held.add(a);
      this.onAction(a, 'key');
    });
    window.addEventListener('keyup', (e) => {
      const a = KEYMAP[e.code];
      if (a) this.held.delete(a);
    });

    // swipe gestures on the canvas
    let sx = 0, sy = 0, sid = null, fired = false;
    const threshold = () => 28 / Math.max(0.4, store.settings.swipe);
    target.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      sid = e.pointerId;
      sx = e.clientX;
      sy = e.clientY;
      fired = false;
    });
    target.addEventListener('pointermove', (e) => {
      if (e.pointerId !== sid || fired) return;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      const t = threshold();
      if (Math.abs(dx) < t && Math.abs(dy) < t) return;
      fired = true;
      if (Math.abs(dx) > Math.abs(dy)) this.onAction(dx < 0 ? 'left' : 'right', 'touch');
      else this.onAction(dy < 0 ? 'jump' : 'slide', 'touch');
    });
    const end = (e) => {
      if (e.pointerId === sid) sid = null;
    };
    target.addEventListener('pointerup', end);
    target.addEventListener('pointercancel', end);
    target.addEventListener('contextmenu', (e) => e.preventDefault());
  }
}
