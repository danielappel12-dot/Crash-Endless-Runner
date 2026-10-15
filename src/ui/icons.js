import * as S from '../game/Sprites.js';

// Pixel-art icons: the game's own sprites rendered tiny, alpha-thresholded and
// shown with nearest-neighbour scaling (image-rendering: pixelated).

function paint(draw, n, span) {
  const c = document.createElement('canvas');
  c.width = c.height = n;
  const ctx = c.getContext('2d');
  Object.defineProperty(ctx, 'shadowBlur', { set() {}, get() { return 0; } });
  ctx.scale(n / span, n / span);
  ctx.translate(span / 2, span / 2);
  draw(ctx);
  return `<img class="paint-only" alt="" draggable="false" src="${c.toDataURL()}">`;
}

// both a crisp pixel version and a smooth painted version; CSS shows the one for the current style
function make(draw, n = 22, span = 84) {
  return crisp(draw, n, span) + paint(draw, 72, span);
}

function crisp(draw, n = 22, span = 84) {
  const c = document.createElement('canvas');
  c.width = c.height = n;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  // sprites use glow shadows; drop them so the silhouette stays crisp
  Object.defineProperty(ctx, 'shadowBlur', { set() {}, get() { return 0; } });
  ctx.scale(n / span, n / span);
  ctx.translate(span / 2, span / 2);
  draw(ctx);
  const img = ctx.getImageData(0, 0, n, n);
  for (let i = 0; i < img.data.length; i += 4) img.data[i + 3] = img.data[i + 3] > 110 ? 255 : 0;
  ctx.putImageData(img, 0, 0);
  return `<img class="px px-only" alt="" draggable="false" src="${c.toDataURL()}">`;
}

const heartPath = new Path2D('M16 27C4 18 1 11 1 8 1 3 5 1 8.5 1 12 1 15 3 16 6 17 3 20 1 23.5 1 27 1 31 3 31 8c0 3-3 10-15 19z');
function drawHeart(ctx) {
  ctx.save();
  ctx.scale(2.2, 2.2);
  ctx.translate(-16, -14);
  ctx.fillStyle = '#ff3a4a';
  ctx.fill(heartPath);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#3a0a10';
  ctx.stroke(heartPath);
  ctx.fillStyle = '#ffb0b8';
  ctx.fillRect(7, 6, 5, 3);
  ctx.restore();
}

function drawCrateIcon(c) {
  c.translate(0, 42);
  S.drawCrate(c, 'fruit', 84, 0, 0);
}

export const ICON = {
  face: make((c) => { c.translate(-4, 6); c.scale(0.9, 0.9); S.drawHeroFace(c); }, 30, 150),
  crate: make(drawCrateIcon, 24, 100),
  fruit: make((c) => S.drawFruit(c, 0, 30), 24),
  green: make((c) => S.drawGem(c, 'green', 0), 20, 80),
  purple: make((c) => S.drawGem(c, 'purple', 0), 20, 80),
  blue: make((c) => S.drawGem(c, 'blue', 0), 20, 80),
  relic: make((c) => { c.translate(0, 6); S.drawRelic(c, 0); }, 20, 110),
  heart: make(drawHeart, 20, 76),
  magnet: make((c) => S.drawPowerup(c, 'magnet', 0), 22, 110),
  mask: make((c) => { c.translate(0, 12); S.drawMask(c, 0, false); }, 24, 118),
  maskGold: make((c) => { c.translate(0, 12); S.drawMask(c, 0, true); }, 24, 118),
  multiplier: make((c) => S.drawPowerup(c, 'multiplier', 0), 22, 110),
};
