import { store } from '../config/settings.js';

// Keyboard, mouse and touch input for the hopper:
//  arrows / WASD            hop one tile
//  click / tap a tile       hop toward it (keeps walking across safe grass rows)
//  swipe                    hop in the swipe direction
// actions: up, down, left, right, tile{x,y}, pause, restart, confirm

const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up', Space: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  Escape: 'pause', KeyP: 'pause',
  KeyR: 'restart',
  Enter: 'confirm',
};

export class InputManager {
  constructor(target, onAction) {
    this.onAction = onAction;
    window.addEventListener('keydown', (e) => {
      const a = KEYMAP[e.code];
      if (!a) return;
      if (['up', 'down', 'left', 'right'].includes(a)) e.preventDefault();
      if (e.repeat && !['up', 'down', 'left', 'right'].includes(a)) return;
      this.onAction(a, 'key');
    });

    let sx = 0, sy = 0, sid = null, moved = false;
    const threshold = () => 26 / Math.max(0.4, store.settings.swipe);
    target.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') {
        if (e.button === 0) this.onAction('tile', 'mouse', { x: e.clientX, y: e.clientY });
        return;
      }
      sid = e.pointerId;
      sx = e.clientX;
      sy = e.clientY;
      moved = false;
    });
    target.addEventListener('pointermove', (e) => {
      if (e.pointerId !== sid || moved) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) < threshold() && Math.abs(dy) < threshold()) return;
      moved = true;
      if (Math.abs(dx) > Math.abs(dy)) this.onAction(dx < 0 ? 'left' : 'right', 'touch');
      else this.onAction(dy < 0 ? 'up' : 'down', 'touch');
    });
    target.addEventListener('pointerup', (e) => {
      if (e.pointerId !== sid) return;
      sid = null;
      if (!moved) this.onAction('tile', 'touch', { x: e.clientX, y: e.clientY });
    });
    target.addEventListener('pointercancel', () => { sid = null; });
    target.addEventListener('contextmenu', (e) => e.preventDefault());
  }
}
