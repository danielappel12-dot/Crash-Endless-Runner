import * as THREE from 'three';
import { store } from '../config/settings.js';

const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));

// Third-person chase camera with subtle sway, FOV kick and impact shake, plus
// a slow orbit mode for the title screen.
export class CameraController {
  constructor(camera) {
    this.camera = camera;
    this.shake = 0;
    this.px = 0;
    this.py = 3.6;
    this.look = new THREE.Vector3();
    this.baseFov = 62;
    this.time = 0;
    this.mode = 'menu';
    this.orbit = 0;
    this.zoom = 0; // 0..1, pulls in during victory/dying
  }

  addShake(a) {
    if (store.settings.shake) this.shake = Math.max(this.shake, a);
  }

  snap(player) {
    this.px = player.x * 0.55;
    this.py = 3.6;
    this.time = 0;
  }

  update(dt, player, speedRatio) {
    this.time += dt;
    const cam = this.camera;
    if (this.mode === 'menu') {
      this.orbit += dt * 0.25;
      const a = 0.62 + Math.sin(this.orbit) * 0.35;
      const R = 4.6;
      const tx = player.x + Math.sin(a) * R;
      const tz = player.z - Math.cos(a) * R;
      cam.position.set(tx, 1.45 + Math.sin(this.orbit * 0.7) * 0.15, tz);
      this.look.set(player.x - 0.2, 1.15, player.z);
      cam.lookAt(this.look);
      cam.fov = damp(cam.fov, 50, 4, dt);
      cam.updateProjectionMatrix();
      return;
    }
    const lowAir = Math.max(0, player.y);
    this.px = damp(this.px, player.x * 0.6, 7, dt);
    this.py = damp(this.py, 3.7 + lowAir * 0.3, 6, dt);
    const sway = Math.sin(this.time * 1.7) * 0.05 * (0.5 + speedRatio);
    const bob = player.grounded ? Math.abs(Math.sin(player.phase)) * 0.04 : 0;
    const back = 7.2 - this.zoom * 2.5;
    cam.position.set(this.px + sway, this.py + bob, player.z + back);
    if (this.shake > 0.001) {
      cam.position.x += (Math.random() - 0.5) * this.shake;
      cam.position.y += (Math.random() - 0.5) * this.shake;
      this.shake = damp(this.shake, 0, 7, dt);
    }
    this.look.set(player.x * 0.35, 1.5 + lowAir * 0.35, player.z - 9);
    cam.lookAt(this.look);
    cam.rotateZ(-(player.targetX - player.x) * 0.012 + Math.sin(this.time * 1.3) * 0.004);
    cam.fov = damp(cam.fov, this.baseFov + speedRatio * 10, 3, dt);
    cam.updateProjectionMatrix();
  }
}
