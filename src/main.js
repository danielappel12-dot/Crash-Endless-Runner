import './ui/styles.css';
import { Game } from './game/Game.js';

const canvas = document.getElementById('game-canvas');
const ui = document.getElementById('ui');

function fatal(err) {
  console.error(err);
  const box = document.createElement('div');
  box.className = 'errbox';
  box.innerHTML = `<div><h2>Wumpa Rush couldn't start</h2><p>${String(err && err.message ? err.message : err)}</p><p>Make sure your browser supports WebGL (try Chrome, Safari or Firefox).</p></div>`;
  document.body.appendChild(box);
}

try {
  const game = new Game(canvas, ui);
  window.__game = game; // handy for debugging / automated tests
  game.start();
} catch (e) {
  fatal(e);
}
