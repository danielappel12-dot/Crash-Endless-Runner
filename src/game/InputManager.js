import { store } from '../config/settings.js';

// Normalises keyboard, swipe and on-screen buttons into named actions:
// left, right, jump, slide, pause, restart.

const KEYMAP = {
  ArrowUp: 'laneUp', KeyW: 'laneUp',
  ArrowDown: 'laneDown', KeyS: 'laneDown',
  Space: 'jump', ArrowRight: 'jump', KeyD: 'jump',
  ArrowLeft: 'slide', KeyA: 'slide', ShiftLeft: 'slide', ShiftRight: 'slide',
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
      if (['jump', 'slide', 'laneUp', 'laneDown'].includes(a) || e.code === 'Space') e.preventDefault();
      if (e.repeat && a !== 'slide') return;
      this.held.add(a);
      this.onAction(a, 'key');
    });
    window.addEventListener('keyup', (e) => {
      const a = KEYMAP[e.code];
      if (a) this.held.delete(a);
    });

    // touch / mouse on the canvas: swipe up/down = change lane, tap right half = jump,
    // tap left half = slide. Mouse click = jump.
    let sx = 0, sy = 0, sid = null, fired = false;
    const threshold = () => 28 / Math.max(0.4, store.settings.swipe);
    target.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') {
        if (e.button === 0) this.onAction('jump', 'mouse');
        return;
      }
      sid = e.pointerId;
      sx = e.clientX;
      sy = e.clientY;
      fired = false;
    });
    target.addEventListener('pointermove', (e) => {
      if (e.pointerId !== sid || fired) return;
      const dy = e.clientY - sy;
      if (Math.abs(dy) < threshold() || Math.abs(dy) < Math.abs(e.clientX - sx)) return;
      fired = true;
      this.onAction(dy < 0 ? 'laneUp' : 'laneDown', 'touch');
    });
    target.addEventListener('pointerup', (e) => {
      if (e.pointerId !== sid) return;
      sid = null;
      if (!fired && Math.hypot(e.clientX - sx, e.clientY - sy) < threshold()) {
        this.onAction(e.clientX > window.innerWidth / 2 ? 'jump' : 'slide', 'touch');
      }
    });
    target.addEventListener('pointercancel', () => { sid = null; });
    target.addEventListener('contextmenu', (e) => e.preventDefault());
  }
}
