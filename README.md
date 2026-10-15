# 🍊 WUMPA RUSH
**Run wild. Smash everything.**

A complete, cartoony **2D side-scrolling endless runner** in the spirit of 1990s platformers, built with **Vite + HTML Canvas 2D** (plain JavaScript ES modules, no runtime dependencies).
Everything is original and drawn in code: the hero, the jungle, the crates, the sound effects. There are no downloaded assets, no API keys and no external services.

* Look: thick ink outlines, flat bright fills, squash-and-stretch, painted parallax backdrops (jungle, ancient ruins, rope bridge over a river canyon, rocky pass), POW/BAM/BOOM bursts.
* Hero: *Rukk*, an original orange-brown cartoon marsupial (green fingerless gloves, blue shorts, oversized red sneakers), posed with sine-wave animation: run, jump (tucked legs), slide, hit, victory dance, idle.
* Collectible: **Wumpa Fruit** (original artwork), plus green / purple / blue gems and the legendary golden relic.
* Audio: synthesized live with the Web Audio API (oscillators, envelopes, filtered noise).
* Saves: best score, distance, gems and settings persist in `localStorage`.

---

## 🚀 Quick start on macOS

1. Install **Node.js 18+** if you don't have it: `brew install node` or <https://nodejs.org>.
2. Double‑click **`start.command`** in Finder.
   * First time only: if macOS blocks it, right‑click → **Open** → **Open**.
     If it says "permission denied", run `chmod +x start.command` once in Terminal.
3. The launcher installs dependencies (first run only), starts the game server and opens <http://127.0.0.1:5173> in your browser.
4. Keep the Terminal window open while you play. Press `Ctrl+C` to stop.

### Manual start (any OS)

```bash
npm install
npm run dev        # http://127.0.0.1:5173
# or a production build:
npm run build && npm run preview
```

---

## 🎮 Controls

| Action | Keyboard / mouse | Touch |
|---|---|---|
| Jump | `W`, `↑` or `Space` (or click) | Tap the right side, swipe up, or JUMP button |
| Slide | `S` or `↓` (hold to keep sliding; in mid-air: dive) | Tap the left side, swipe down, or SLIDE button |
| Pause | `Esc` | ❚❚ button |
| Restart (after game over) | `R` | Restart button |

## 🌴 How to play

* Rukk runs on his own. Collect **Wumpa Fruit**, smash crates, hunt gems, survive. You have **3 hearts**; a hit gives a short grace period and a brief slow‑down.
* **Crates:** fruit crate (bursts into fruit) · bouncy crate (jump *onto* it to launch skyward) · mystery `?` crate (random reward: fruit, power‑up or gem) · **TNT** (a fuse lights as you approach and it blows as you arrive: jump over the blast!) · iron crate (unbreakable: jump it or hop on top).
* **Hazards:** fallen logs, big rocks and spiked barricades (jump) · low branches (slide) · ravine gaps (jump) · **rolling boulders** (a red ! warns you from the right; jump them). Hazards are always spaced so there is room to jump, land and react.
* **Gems:** green 500 · purple 1000 · blue 2000 · golden relic 5000. Many are placed in risky spots: high over gaps and obstacles, or under low branches.
* **Power‑ups:** 🧲 Magnet (pulls fruit) · 🛡 Shield (absorbs one hit) · ✦ Fruit ×2.
* Speed ramps from 15 → 34 m/s over ~2.6 km, obstacles get denser and special zones (ancient ruins, rope bridge, rocky pass) appear more often.
* **Close calls** (jumping a hazard by a hair) earn bonus points.

---

## 🗂 Project layout

```
index.html            entry page
vite.config.js
start.command         macOS launcher
src/
  main.js             boot + fatal-error screen
  config/settings.js  ALL gameplay constants (speed, jump, hitboxes, power-up durations…) + localStorage store
  game/
    Game.js           orchestrator: state machine, game loop, collision callbacks
    Player.js         hero physics + procedurally posed cartoon drawing
    World.js          pooled hazards / crates / items / ravine gaps + safe pattern-based layout generator
    Renderer.js       parallax backdrops per zone, ground, entity drawing, power-up effects
    Sprites.js        cartoon sprites: fruit, gems, relic, crates, logs, rocks, barricades, branches, boulders, power-ups
    CollisionSystem.js  AABB collisions, platforms (logs, iron crates), gaps, near-miss
    ParticleSystem.js pooled dots, stars, debris, rings and "POW!" text
    ScoreManager.js   score, stats, best-score persistence
    AudioManager.js   Web Audio synth sound effects
    InputManager.js   keyboard, mouse and touch input
    PowerUp.js        power-up definitions and timers
    Pool.js           tiny object pool
  ui/                 HUD.js, Menu.js, GameOver.js, icons.js, styles.css
```

**Performance notes:** backdrops are pre-rendered once per zone into tileable strips; fruit, crates, hazards, particles and debris all come from fixed pools; entities behind the hero are recycled.

### Tweaking
Open `src/config/settings.js`: change speeds, jump height, hitbox sizes, power‑up durations, scoring and difficulty from one object.

Debug helpers: add `?god` to the URL for invulnerability; the game instance is available as `window.__game`.

---

## 🛠 Troubleshooting

| Problem | Fix |
|---|---|
| `start.command` does nothing / "cannot be opened" | Right‑click → Open (Gatekeeper), or `chmod +x start.command`. |
| "Node.js is required" | `brew install node` (or nodejs.org), then run the launcher again. |
| Blank page or "couldn't start" message | Use a current Chrome, Safari, Edge or Firefox (Canvas 2D is required). |
| Port 5173 busy | Vite automatically picks the next free port and opens it; or stop the other process. |
| No sound | Browsers only allow audio after a click/keypress – press any key or click once. Check the 🔊 button / Settings. |
| Choppy frame‑rate | Settings → Graphics → **Low** (renders at 1× resolution). Close other heavy tabs. |
| Stale save / want to reset | Settings → *Reset best scores*, or clear the site's local storage. |
| `npm install` fails | Check your connection; delete `node_modules` and `package-lock.json`, then run the launcher again. |

Enjoy the run! 🍊
