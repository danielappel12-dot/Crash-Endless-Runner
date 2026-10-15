# 🍊 WUMPA RUSH
**Run wild. Smash everything.**

A complete 3D endless runner in the spirit of 1990s platformers, built with **Vite + Three.js** (plain JavaScript ES modules).
Everything is original and procedural: the hero, the jungle, the crates, the sound effects. There are no downloaded assets, no API keys and no external services.

* Hero: *Rukk*, an original orange‑brown cartoon marsupial (green fingerless gloves, blue shorts, oversized red sneakers), built from separate procedural meshes and animated with sine waves + quaternion slerps.
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

| Action | Keyboard | Touch |
|---|---|---|
| Move left / right | `A` `D` or `←` `→` | Swipe left/right, or ◀ ▶ buttons |
| Jump | `W`, `↑` or `Space` | Swipe up, or ▲ button |
| Slide | `S` or `↓` (in mid‑air: dive) | Swipe down, or ▼ button |
| Pause | `Esc` | ❚❚ button |
| Restart (after game over) | `R` | Restart button |

## 🌴 How to play

* Collect **Wumpa Fruit**, smash crates, hunt gems, survive. You have **3 hearts**; a hit gives a short grace period and a brief slow‑down.
* **Crates:** fruit crate (bursts into fruit) · bouncy crate (jump *onto* it to launch skyward) · mystery `?` crate (random reward: fruit, power‑up or gem) · **TNT** (fuse starts as you approach, move out of its lane or jump!) · iron crate (unbreakable, dodge it or hop on top).
* **Hazards:** fallen logs (jump or dodge) · big rocks (dodge) · spiked barricades (jump or dodge) · low branches (slide) · ravine gaps (jump) · **rolling boulders** (red chevrons warn you; stay out of their lane). Every layout always keeps a safe route.
* **Gems:** green 500 · purple 1000 · blue 2000 · golden relic 5000. Many are placed in risky spots: over gaps, above logs, under low branches.
* **Power‑ups:** 🧲 Magnet (pulls fruit) · 🛡 Shield (absorbs one hit) · ✦ Fruit ×2.
* Speed ramps from 15 → 34 m/s over ~2.6 km, obstacles get denser and special zones (ancient ruins, rope bridge over a ravine, rocky pass) appear more often.
* **Close calls** (jumping a hazard by a hair) earn bonus points.

---

## 🗂 Project layout

```
index.html            entry page
vite.config.js
start.command         macOS launcher
src/
  main.js             boot + fatal-error screen
  config/settings.js  ALL gameplay constants (speed, jump, lanes, hitboxes, power‑up durations…) + localStorage store
  game/
    Game.js           orchestrator: renderer, state machine, game loop, collision callbacks
    Player.js         hero model, procedural animation, movement physics
    CameraController.js  chase cam, shake, menu orbit
    TrackManager.js / Segment.js   endless segment recycling, biomes, ravine gaps
    Layout.js         safe procedural obstacle / crate / fruit / gem layout rules
    ObstacleManager.js / Crate.js / Collectible.js / PowerUp.js   pooled entities
    CollisionSystem.js  swept AABB collisions, platforms, gaps, near‑miss
    ParticleSystem.js pooled GPU points + instanced debris
    ScoreManager.js   score, stats, best‑score persistence
    AudioManager.js   Web Audio synth sound effects
    InputManager.js   keyboard + swipe input
    Pool.js           tiny object pool
  ui/                 HUD.js, Menu.js, GameOver.js, icons.js, styles.css
  world/              JungleGenerator.js (decor), GeoBuilder.js, Materials.js, ProceduralTextures.js
```

**Performance notes:** decorations are pre‑merged vertex‑coloured meshes (one draw call per segment), segments are recycled (never re‑created), and fruit, crates, obstacles, particles and debris all come from fixed pools.

### Tweaking
Open `src/config/settings.js`: change speeds, jump height, lane positions, hitbox sizes, power‑up durations, scoring and difficulty from one object.

Debug helpers: add `?god` to the URL for invulnerability; the game instance is available as `window.__game`.

---

## 🛠 Troubleshooting

| Problem | Fix |
|---|---|
| `start.command` does nothing / "cannot be opened" | Right‑click → Open (Gatekeeper), or `chmod +x start.command`. |
| "Node.js is required" | `brew install node` (or nodejs.org), then run the launcher again. |
| Blank page or "couldn't start" message | Your browser needs WebGL. Use a current Chrome, Safari or Firefox and make sure hardware acceleration is on. |
| Port 5173 busy | Vite automatically picks the next free port and opens it; or stop the other process. |
| No sound | Browsers only allow audio after a click/keypress – press any key or click once. Check the 🔊 button / Settings. |
| Choppy frame‑rate | Settings → Graphics → **Low** (renders at 1× resolution). Close other heavy tabs. |
| Stale save / want to reset | Settings → *Reset best scores*, or clear the site's local storage. |
| `npm install` fails | Check your connection; delete `node_modules` and `package-lock.json`, then run the launcher again. |

Enjoy the run! 🍊
