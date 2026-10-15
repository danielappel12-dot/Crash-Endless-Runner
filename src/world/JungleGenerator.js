import * as THREE from 'three';
import { GeoBuilder, R, pick } from './GeoBuilder.js';
import { CONFIG } from '../config/settings.js';

// Procedural decoration "variants". Each variant is one merged, vertex-coloured
// geometry in segment-local space: x lateral, z from 0 down to -segmentLength.
// Segments swap between pre-built variants when they are recycled.

const L = CONFIG.track.segmentLength;
const GREENS = ['#2f9a35', '#46b83c', '#1f8a3a', '#5cc84a', '#2a8f4a'];
const FLOWER = ['#ff5fa0', '#ffd23a', '#2fd0c8', '#ff8a2a', '#b46aff'];
const STONE = ['#b8a984', '#a89a76', '#c4b794', '#9c8f6c'];

const side = () => (Math.random() < 0.5 ? -1 : 1);
const lateral = (min, max) => side() * R(min, max);

function palm(b, x, z, h = R(5, 8)) {
  const lean = R(-0.5, 0.5);
  const n = 5;
  let tx = x, ty = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const cx = x + lean * t * t * h * 0.5;
    b.cyl(0.2 + 0.1 * (1 - t), 0.3 + 0.1 * (1 - t), h / n + 0.05, i % 2 ? '#8a5a30' : '#7a4a28', { x: cx, y: (i + 0.5) * (h / n), z, rz: -lean * (t + 0.1) * 0.6 }, 6);
    tx = cx;
    ty = (i + 1) * (h / n);
  }
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + R(-0.2, 0.2);
    const len = R(2.2, 3);
    b.box(0.7, 0.07, len, pick(GREENS), { x: tx + Math.sin(a) * len * 0.45, y: ty + 0.1 - 0.0, z: z + Math.cos(a) * len * 0.45, ry: a, rx: -0.45 });
    b.cone(0.28, len, '#37a838', { x: tx + Math.sin(a) * len * 0.5, y: ty + 0.05, z: z + Math.cos(a) * len * 0.5, ry: a, rx: Math.PI / 2 - 0.45 }, 4);
  }
  for (let i = 0; i < 3; i++) b.sphere(0.22, '#5a3418', { x: tx + R(-0.3, 0.3), y: ty - 0.2, z: z + R(-0.3, 0.3) });
}

function bigLeaf(b, x, z, s = R(0.9, 1.5)) {
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + R(-0.3, 0.3);
    const col = pick(GREENS);
    b.sphere(1, col, { x: x + Math.sin(a) * 0.9 * s, y: 0.7 * s + R(0, 0.3), z: z + Math.cos(a) * 0.9 * s, sx: 0.55 * s, sy: 0.06 * s, sz: 1.3 * s, ry: a, rx: -0.55 });
  }
  b.cyl(0.05, 0.08, 0.7 * s, '#2a7a2a', { x, y: 0.35 * s, z }, 5);
}

function fern(b, x, z, s = R(0.8, 1.3)) {
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    b.cone(0.13 * s, 1.5 * s, pick(GREENS), { x: x + Math.sin(a) * 0.45 * s, y: 0.5 * s, z: z + Math.cos(a) * 0.45 * s, ry: a, rx: -1.0 }, 4);
  }
}

function vine(b, x, y, z, len = R(2, 4.5)) {
  b.cyl(0.05, 0.05, len, '#1f7a2a', { x, y: y - len / 2, z }, 4);
  for (let i = 1; i < 4; i++) b.sphere(0.14, '#38a838', { x: x + R(-0.12, 0.12), y: y - (len * i) / 4, z: z + R(-0.1, 0.1) }, 5);
}

function jungleTree(b, x, z, h = R(6, 10)) {
  b.cyl(0.55, 0.85, h, '#6d4426', { x, y: h / 2, z }, 7);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * 6.28 + R(0, 1);
    b.cone(0.45, 1.5, '#6d4426', { x: x + Math.sin(a) * 0.8, y: 0.6, z: z + Math.cos(a) * 0.8, rz: Math.sin(a) * 0.5, rx: Math.cos(a) * 0.5 }, 5);
  }
  for (let i = 0; i < 4; i++) {
    b.ico(R(1.9, 3), pick(GREENS), { x: x + R(-2, 2), y: h + R(-0.6, 1.4), z: z + R(-2, 2), sy: 0.8 });
  }
  for (let i = 0; i < 2; i++) vine(b, x + R(-2, 2), h - 0.4, z + R(-2, 2), R(2.5, 5));
}

function mossRock(b, x, z, s = R(0.8, 2), grey = '#8a8070') {
  b.ico(s, grey, { x, y: s * 0.45, z, sx: R(1.1, 1.5), sy: 0.85, sz: R(1, 1.4), ry: R(0, 3) });
  b.ico(s * 0.8, '#4a9a3a', { x, y: s * 0.8, z, sx: 1.0, sy: 0.4, sz: 1.0, ry: R(0, 3) });
}

function flower(b, x, z) {
  const col = pick(FLOWER);
  b.cyl(0.03, 0.03, 0.5, '#2a8a2a', { x, y: 0.25, z }, 4);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * 6.28;
    b.sphere(0.13, col, { x: x + Math.sin(a) * 0.17, y: 0.52, z: z + Math.cos(a) * 0.17, sy: 0.5 }, 5);
  }
  b.sphere(0.1, '#ffec6a', { x, y: 0.55, z }, 5);
}

function pillar(b, x, z, h = R(3, 6), broken = Math.random() < 0.35) {
  const stone = pick(STONE);
  b.box(1.5, 0.4, 1.5, '#9c8f6c', { x, y: 0.2, z });
  b.box(1, h, 1, stone, { x, y: 0.4 + h / 2, z });
  for (let y = 1.2; y < h; y += 1.3) b.box(1.2, 0.16, 1.2, '#8c7f5c', { x, y, z });
  // turquoise inlay
  b.box(0.3, 0.5, 1.04, '#2fb8a8', { x, y: h * 0.55, z });
  b.box(1.04, 0.5, 0.3, '#2fb8a8', { x, y: h * 0.55, z });
  if (!broken) {
    b.box(1.5, 0.5, 1.5, '#a89a76', { x, y: h + 0.65, z });
    // carved face
    b.box(0.22, 0.22, 0.1, '#3d3626', { x: x - 0.28, y: h + 0.7, z: z + 0.78 });
    b.box(0.22, 0.22, 0.1, '#3d3626', { x: x + 0.28, y: h + 0.7, z: z + 0.78 });
    b.box(0.6, 0.12, 0.1, '#3d3626', { x, y: h + 0.5, z: z + 0.78 });
  } else {
    for (let i = 0; i < 4; i++) b.box(R(0.4, 0.8), R(0.3, 0.6), R(0.4, 0.8), pick(STONE), { x: x + R(-1.5, 1.5), y: 0.2, z: z + R(-1.5, 1.5), ry: R(0, 3) });
  }
  b.sphere(0.45, '#4aa23a', { x: x + 0.4, y: 0.5, z: z + 0.5, sy: 0.5 });
}

function ruinWall(b, x, z, len = R(3, 7)) {
  const h = R(1.5, 3.2);
  for (let i = 0; i < Math.floor(len); i++) {
    const hh = h - (i % 2) * R(0, 0.8);
    b.box(1.2, hh, 1.3, pick(STONE), { x, y: hh / 2, z: z - i * 1.2 });
    if (Math.random() < 0.4) b.box(1.22, 0.3, 1.32, '#4aa23a', { x, y: hh, z: z - i * 1.2 });
  }
}

function arch(b, x, z) {
  const s = x > 0 ? -1 : 1;
  pillar(b, x, z, 4.5, false);
  pillar(b, x + s * 4.5, z, 4.5, true);
  b.box(5.6, 0.8, 1.4, '#a89a76', { x: x + s * 2.25, y: 5.4, z, rz: s * 0.05 });
  b.box(1, 0.6, 1.2, '#2fb8a8', { x: x + s * 2.25, y: 6.1, z });
}

function ziggurat(b, x, z) {
  let w = 9;
  for (let i = 0; i < 4; i++) {
    b.box(w, 1.6, w, STONE[i % 4], { x, y: 0.8 + i * 1.6, z });
    b.box(w + 0.1, 0.25, w + 0.1, '#2fb8a8', { x, y: 1.5 + i * 1.6, z });
    w -= 2;
  }
  b.box(1.4, 1.4, 1.4, '#ffcf2a', { x, y: 7, z });
}

function spire(b, x, z, h = R(6, 13)) {
  const r = R(1.6, 3);
  const cols = ['#8c7a68', '#a8967f', '#7a6a58'];
  for (let i = 0; i < 4; i++) {
    const t = i / 4;
    b.cone(r * (1 - t * 0.75), h / 3, cols[i % 3], { x: x + R(-0.2, 0.2) * i, y: (h / 4) * (i + 0.5) + 0.3, z, ry: R(0, 3) }, 6);
  }
  b.ico(r * 0.9, '#4a9a3a', { x: x + 1.2, y: 0.6, z: z + 0.8, sy: 0.4 });
}

function stalagmite(b, x, z) {
  b.cone(R(0.4, 0.9), R(1.2, 2.6), pick(['#9a8870', '#7a6a58']), { x, y: 0.8, z }, 5);
}

function deadTree(b, x, z) {
  const h = R(3, 5);
  b.cyl(0.14, 0.28, h, '#5a4430', { x, y: h / 2, z, rz: R(-0.12, 0.12) }, 5);
  for (let i = 0; i < 3; i++) {
    const s = i % 2 ? 1 : -1;
    b.cyl(0.05, 0.12, 1.4, '#5a4430', { x: x + s * 0.5, y: h * (0.55 + i * 0.12), z, rz: s * -0.9 }, 4);
  }
}

function lowShrubs(b, x, z) {
  b.ico(R(0.6, 1.1), pick(GREENS), { x, y: 0.4, z, sy: 0.7 });
}

function farHill(b, x, z) {
  const r = R(10, 18);
  b.ico(r, pick(['#2a8a4a', '#1f7a4a', '#3a9a4a']), { x, y: 0, z, sy: R(0.5, 0.8) }, 1);
}

// ---------------------------------------------------------------------------
function placeAlong(count, fn, minX, maxX, margin = 2) {
  for (let i = 0; i < count; i++) {
    const z = -margin - (i + Math.random()) * ((L - margin * 2) / count);
    fn(lateral(minX, maxX), z);
  }
}

function jungleVariant(dense = true) {
  const b = new GeoBuilder();
  placeAlong(dense ? 8 : 5, (x, z) => jungleTree(b, x, z), 8, 20);
  placeAlong(dense ? 8 : 6, (x, z) => palm(b, x, z), 5.8, 16);
  placeAlong(10, (x, z) => bigLeaf(b, x, z), 5.2, 10);
  placeAlong(10, (x, z) => fern(b, x, z), 5.2, 9);
  placeAlong(5, (x, z) => mossRock(b, x, z), 5.8, 12);
  placeAlong(16, (x, z) => flower(b, x, z), 5, 9);
  placeAlong(5, (x, z) => lowShrubs(b, x, z), 5.5, 9);
  for (let i = 0; i < 6; i++) vine(b, lateral(5.5, 7.5), R(6, 7.5), -R(2, L - 2), R(3, 5));
  if (Math.random() < 0.5) pillar(b, lateral(8, 11), -R(8, L - 8));
  return b.build();
}

function ruinsVariant() {
  const b = new GeoBuilder();
  placeAlong(4, (x, z) => pillar(b, x, z), 6, 10);
  placeAlong(2, (x, z) => ruinWall(b, x, z), 7, 12, 4);
  if (Math.random() < 0.7) arch(b, lateral(7, 8), -R(14, L - 14));
  ziggurat(b, lateral(18, 24), -R(10, L - 10));
  placeAlong(5, (x, z) => palm(b, x, z), 9, 18);
  placeAlong(4, (x, z) => jungleTree(b, x, z), 14, 24);
  placeAlong(8, (x, z) => bigLeaf(b, x, z), 5.2, 9);
  placeAlong(6, (x, z) => fern(b, x, z), 5.2, 9);
  placeAlong(8, (x, z) => flower(b, x, z), 5, 8);
  placeAlong(3, (x, z) => mossRock(b, x, z, R(0.6, 1.2), '#a8a090'), 5.8, 10);
  // low steps beside track
  for (let i = 0; i < 3; i++) {
    const sx = side();
    for (let k = 0; k < 3; k++) b.box(3, 0.4, 2, '#b8a984', { x: sx * (6 + k * 0.4 + 1.5), y: 0.2 + k * 0.4, z: -10 - i * 16 - k * 0.2 });
  }
  return b.build();
}

function bridgeVariant() {
  const b = new GeoBuilder();
  const hw = 4.15;
  const ropeCol = '#d9c28a';
  for (const s of [-1, 1]) {
    for (let z = 0; z >= -L; z -= 4) {
      b.box(0.3, 1.5, 0.3, '#6a4020', { x: s * hw, y: 0.75, z });
      b.box(0.3, 7, 0.3, '#5a3418', { x: s * (hw - 0.1), y: -3.5, z: z - 1, rz: s * -0.0 });
    }
    b.box(0.16, 0.16, L, ropeCol, { x: s * hw, y: 1.4, z: -L / 2 });
    b.box(0.12, 0.12, L, ropeCol, { x: s * hw, y: 0.8, z: -L / 2 });
    // cliff walls and stepped rock
    b.box(3, 9, L, '#6a5040', { x: s * 8.9, y: -4.5, z: -L / 2 });
    b.box(3.4, 0.5, L, '#4aa23a', { x: s * 9.1, y: 0.05, z: -L / 2 });
    for (let i = 0; i < 5; i++) b.ico(R(1.2, 2.2), '#7a6050', { x: s * R(7.2, 7.8), y: -R(1.5, 7), z: -R(2, L - 2), sx: 0.6 });
  }
  // cross beams under the planks
  for (let z = -2; z > -L; z -= 8) b.box(8.6, 0.3, 0.4, '#5a3418', { x: 0, y: -0.35, z });
  placeAlong(5, (x, z) => palm(b, x, z, R(6, 9)), 10.5, 18);
  placeAlong(4, (x, z) => jungleTree(b, x, z), 14, 24);
  placeAlong(8, (x, z) => bigLeaf(b, x, z), 10, 13);
  placeAlong(6, (x, z) => flower(b, x, z), 9, 12);
  for (let i = 0; i < 4; i++) vine(b, lateral(8, 9), 1, -R(2, L - 2), R(3, 6));
  return b.build();
}

function rockyVariant() {
  const b = new GeoBuilder();
  placeAlong(5, (x, z) => spire(b, x, z), 8, 18);
  placeAlong(7, (x, z) => mossRock(b, x, z, R(1, 2.6), '#8c7a68'), 5.6, 13);
  placeAlong(8, (x, z) => stalagmite(b, x, z), 5.2, 9);
  placeAlong(3, (x, z) => deadTree(b, x, z), 6, 12);
  placeAlong(5, (x, z) => palm(b, x, z), 12, 20);
  placeAlong(6, (x, z) => fern(b, x, z), 5.2, 8);
  placeAlong(4, (x, z) => lowShrubs(b, x, z), 5.5, 8);
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) b.ico(R(3, 5), pick(['#7a6a58', '#6a5a4c', '#8c7a68']), { x: s * R(13, 16), y: R(1, 4), z: -(i + 0.5) * (L / 4), sy: 1.3 });
  }
  return b.build();
}

export function buildDecorVariants() {
  return {
    jungle: [jungleVariant(true), jungleVariant(true), jungleVariant(false)],
    ruins: [ruinsVariant(), ruinsVariant(), ruinsVariant()],
    bridge: [bridgeVariant(), bridgeVariant()],
    rocky: [rockyVariant(), rockyVariant(), rockyVariant()],
  };
}

// Distant hills + sky + sun, parallaxing slowly behind the action.
export function buildHills(materials) {
  const group = new THREE.Group();
  const b = new GeoBuilder(0.08);
  for (let i = 0; i < 26; i++) {
    const s = i % 2 ? 1 : -1;
    farHill(b, s * R(70, 150) + (i % 2 ? 0 : 0), -i * 28);
  }
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, fog: true });
  const mesh = new THREE.Mesh(b.build(), mat);
  mesh.position.y = -4;
  group.add(mesh);
  mesh.frustumCulled = false;
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0, fog: false });
  const sun = new THREE.Mesh(new THREE.CircleGeometry(40, 24), sunMat);
  sun.position.set(-80, 120, -420);
  sun.userData.isSun = true;
  group.add(sun);
  return { group, hills: mesh, sun };
}
