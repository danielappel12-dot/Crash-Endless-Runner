// Game-over summary with restart / main menu actions.
export class GameOver {
  constructor(root, h) {
    this.el = document.createElement('div');
    this.el.className = 'screen dim hidden';
    this.el.innerHTML = `
      <div class="card" style="text-align:center">
        <h1 class="go-title">GAME OVER</h1>
        <div class="stats">
          <div class="stat wide"><small>FINAL SCORE</small><b data-k="score">0</b><span class="new hidden" data-n="score">NEW BEST!</span></div>
          <div class="stat"><small>DISTANCE</small><b data-k="distance">0</b><span class="new hidden" data-n="distance">NEW!</span></div>
          <div class="stat"><small>FRUIT</small><b data-k="fruit">0</b></div>
          <div class="stat"><small>GEMS</small><b data-k="gems">0</b><span class="new hidden" data-n="gems">NEW!</span></div>
          <div class="stat"><small>CRATES SMASHED</small><b data-k="crates">0</b></div>
          <div class="stat wide"><small>BEST SCORE</small><b data-k="best">0</b></div>
        </div>
        <div class="row">
          <button class="btn green" data-a="restart">Restart</button>
          <button class="btn blue" data-a="menu">Main Menu</button>
        </div>
        <p style="opacity:.7;font-size:13px;margin-top:12px">Press <kbd>R</kbd> to restart</p>
      </div>`;
    root.appendChild(this.el);
    this.el.querySelector('[data-a="restart"]').addEventListener('click', () => { h.onClick(); h.onRestart(); });
    this.el.querySelector('[data-a="menu"]').addEventListener('click', () => { h.onClick(); h.onMainMenu(); });
  }

  show(sc, best, records) {
    const set = (k, v) => (this.el.querySelector(`[data-k="${k}"]`).textContent = v);
    const f = (n) => Math.floor(n).toLocaleString('en-US');
    set('score', f(sc.score));
    set('distance', `${f(sc.distance)} m`);
    set('fruit', sc.fruit);
    set('gems', sc.gems);
    set('crates', sc.crates);
    set('best', f(best.score));
    for (const k of ['score', 'distance', 'gems']) this.el.querySelector(`[data-n="${k}"]`).classList.toggle('hidden', !records[k]);
    this.el.classList.remove('hidden');
  }

  hide() { this.el.classList.add('hidden'); }
  get visible() { return !this.el.classList.contains('hidden'); }
}
