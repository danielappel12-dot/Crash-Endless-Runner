// Minimal object pool. Objects must expose `.mesh` (THREE.Object3D).
export class Pool {
  constructor(create) {
    this.create = create;
    this.free = [];
    this.active = [];
  }

  acquire() {
    const o = this.free.pop() || this.create();
    o.active = true;
    o._i = this.active.length;
    this.active.push(o);
    o.mesh.visible = true;
    return o;
  }

  release(o) {
    if (!o.active) return;
    o.active = false;
    o.mesh.visible = false;
    const last = this.active.pop();
    if (last !== o) {
      this.active[o._i] = last;
      last._i = o._i;
    }
    this.free.push(o);
  }

  clear() {
    while (this.active.length) this.release(this.active[this.active.length - 1]);
  }
}
