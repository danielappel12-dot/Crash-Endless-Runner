import * as THREE from 'three';
import { CONFIG } from '../config/settings.js';

const TR = CONFIG.track;
const L = TR.segmentLength;

function flatPlane(w, len, uvLen) {
  const g = new THREE.PlaneGeometry(w, len);
  g.rotateX(-Math.PI / 2);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * (uvLen ?? len / 7));
  return g;
}

const fullGeo = flatPlane(TR.width, TR.rowSpacing);
const partLen = (TR.rowSpacing - TR.gapLength) / 2;
const partGeo = flatPlane(TR.width, partLen);
const sideGeo = flatPlane(60, L, L / 14);
const waterGeo = flatPlane(90, L, 1);
const chasmGeo = new THREE.BoxGeometry(TR.width, 7, TR.gapLength);

// One reusable stretch of track: ground tiles per row, side ground, a decoration
// mesh (geometry swapped from pre-built variants), and a list of spawned entities.
export class Segment {
  constructor(scene, mats, variants) {
    this.mats = mats;
    this.variants = variants;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.decor = new THREE.Mesh(variants.jungle[0], mats.vertex);
    this.group.add(this.decor);

    this.rows = [];
    for (let i = 0; i < TR.rowsPerSegment; i++) {
      const rc = -TR.rowSpacing / 2 - i * TR.rowSpacing;
      const full = new THREE.Mesh(fullGeo, mats.ground.jungle);
      full.position.set(0, 0, rc);
      const front = new THREE.Mesh(partGeo, mats.ground.jungle);
      front.position.set(0, 0, rc + TR.gapLength / 2 + partLen / 2);
      const back = new THREE.Mesh(partGeo, mats.ground.jungle);
      back.position.set(0, 0, rc - TR.gapLength / 2 - partLen / 2);
      const chasm = new THREE.Mesh(chasmGeo, mats.chasm);
      chasm.position.set(0, -3.5, rc);
      front.visible = back.visible = chasm.visible = false;
      this.group.add(full, front, back, chasm);
      this.rows.push({ rc, full, front, back, chasm, gap: false });
    }
    this.sideL = new THREE.Mesh(sideGeo, mats.side);
    this.sideR = new THREE.Mesh(sideGeo, mats.side);
    this.sideL.position.set(0, -0.02, -L / 2);
    this.sideR.position.set(0, -0.02, -L / 2);
    this.water = new THREE.Mesh(waterGeo, mats.water);
    this.water.position.set(0, -5.2, -L / 2);
    this.group.add(this.sideL, this.sideR, this.water);

    this.entities = [];
    this.gaps = [];
    this.z0 = 0;
    this.biome = 'jungle';
  }

  configure(z0, biome) {
    this.z0 = z0;
    this.biome = biome;
    this.group.position.z = z0;
    const list = this.variants[biome];
    this.decor.geometry = list[(Math.random() * list.length) | 0];
    this.decor.scale.x = Math.random() < 0.5 ? -1 : 1;
    const gm = this.mats.ground[biome];
    for (const r of this.rows) {
      r.full.material = r.front.material = r.back.material = gm;
      this.setGap(r, false);
    }
    const edge = biome === 'bridge' ? 7.4 : TR.width / 2 - 0.05;
    this.sideL.position.x = -(edge + 30);
    this.sideR.position.x = edge + 30;
    this.water.visible = biome === 'bridge';
    this.gaps.length = 0;
  }

  setGap(row, on) {
    row.gap = on;
    row.full.visible = !on;
    row.front.visible = row.back.visible = row.chasm.visible = on;
  }

  addGap(i) {
    const row = this.rows[i];
    this.setGap(row, true);
    const c = this.z0 + row.rc;
    this.gaps.push({ z1: c + TR.gapLength / 2, z2: c - TR.gapLength / 2 });
  }

  releaseEntities() {
    for (const e of this.entities) e.pool.release(e);
    this.entities.length = 0;
  }
}
