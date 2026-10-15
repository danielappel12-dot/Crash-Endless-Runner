# 🍊 WUMPA RUSH
**Run wild. Smash everything.**

A complete **painted 2D platform-runner with three dodge lanes**, in the spirit of 1990s platformers, built with **Vite + HTML Canvas 2D** (plain JavaScript ES modules, no runtime dependencies).
Everything is original and generated in code: the hero, the scenery, the crates, the sound effects and the music. There are no downloaded assets, no API keys and no external services (the optional "Titan One" / "Press Start 2P" fonts load from Google Fonts when online; system fonts are used offline).

* **Look:** a soft, hand-painted style (default): sunny lagoon with a wooden pier, mossy purple rock spires, giant blue crystal shards and puffy clouds, plus ancient ruins, jungle and rocky zones. Switch to a chunky **Pixel** style (low-res + dithering) in Settings → ART STYLE.
* **Lanes:** the ground is a three-lane band (back / middle / front) like a classic beat-'em-up. Move between lanes to dodge; hazards never block every lane.
* **Platforming:** spin attack, stompable critters, crate stacks you can jump onto, floating and bobbing platforms, stepping-stone pits, variable-height jumps, and a floating spirit mask that protects you (three masks = golden invincibility).
* **Bosses:** every ~1,500 m *King Scuttler* attacks. He hops between lanes and lobs coconut bombs: get into his lane and **spin to bat a coconut back** at him.
* **Hero:** *Rukk*, an original orange-brown cartoon marsupial (green fingerless gloves, blue shorts, oversized red sneakers), posed with sine-wave animation: run, jump (tucked legs), slide, spin, hit, victory dance, idle.
* **Audio:** sound effects and a **procedural chiptune soundtrack** synthesised live with the Web Audio API: a tune for each zone, a boss theme and a menu theme, getting faster and fuller as you speed up.
* **Saves:** best score, distance, gems and settings persist in `localStorage`.

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
| Move to the lane behind / in front | `W` `↑` / `S` `↓` | Swipe up / down, or ▲ ▼ buttons |
| Jump (hold = higher, tap = hop) | `Space`, `D` or `→` (or click) | Tap the right side, or JUMP |
| Slide | `A`, `←` or `Shift` (hold to keep sliding; in mid-air: dive) | Tap the left side, or SLIDE |
| Spin attack | `J`, `E`, `X` or `Ctrl` | SPIN button |
| Pause | `Esc` | ❚❚ button |
| Restart (after game over) | `R` | Restart button |

## 🌴 How to play

* Rukk runs on his own across three lanes. Collect **Wumpa Fruit**, smash crates, hunt gems, survive. Items only count when you are in their lane. You have **3 hearts**; a hit gives a short grace period and a brief slow‑down.
* **Crates:** fruit crate (bursts into fruit) · bouncy crate (jump *onto* it to launch skyward) · mystery `?` crate (random reward: fruit, power‑up or gem) · **TNT** (a fuse lights as you approach and it blows as you arrive: leave its lane or jump the blast!) · iron crate (unbreakable: change lane, jump it or hop on top). **Jump onto a crate** to break it and bounce; crate **stacks** break one at a time from the top, or all at once if you smash through the side.
* **Hazards:** fallen logs, big rocks and spiked barricades (change lane, jump or spin) · low branches (slide or change lane) · ravine gaps (jump; they cut across every lane) · **rolling boulders** (a red ! marks their lane) · **TNT** blasts only hit your own lane. At least one lane is always free, and hazards are spaced so there is room to jump, land and react.
* **Gems:** green 500 · purple 1000 · blue 2000 · golden relic 5000. Many are placed in risky spots: high over gaps and obstacles, or under low branches.
* **Spirit masks:** a carved tribal mask floats beside the hero and absorbs one hit (up to two at a time). Collect **three** for 12 seconds of golden invincibility: enemies are smashed on touch and nothing hurts you (pits still do!). Masks also come out of mystery crates.
* **Other power‑ups:** 🧲 Magnet (pulls fruit) · ✦ Fruit ×2.
* **Critters:** beetles and bats can be stomped from above or spun; spiky urchins can only be spun or dodged. Bats fly at head height, so slide under or dodge them.
* **Platforms:** floating stair-step platforms carry bonus fruit, crates and gems; **bobbing elevator platforms** hover over some pits (the pit can always be jumped without them). Some pits are crossed by hopping between stepping-stone islands.
* **Boss fight:** King Scuttler appears on the right and winds up (red warning lanes show where coconuts will roll). Stand in *his* lane, spin as a coconut arrives to knock it back, and it damages him. Coconuts in other lanes are decoys that you simply avoid. Defeating him drops fruit, gems and a mask, then the level resumes.
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
    Game.js           orchestrator: state machine, game loop, collision callbacks, music cues
    Player.js         hero physics (lanes, variable jump, slide, spin attack) + procedurally posed cartoon drawing
    Boss.js           the King Scuttler fight (lane hopping, coconut throws, deflect-to-damage)
    World.js          pooled hazards / crates / items / enemies / platforms / ravine gaps + lane-aware safe layout generator
    Renderer.js       painted + pixel render pipelines (parallax zones, lagoon/water, depth-sorted lanes)
    Sprites.js        sprites: fruit, gems, relic, spirit mask, crates, enemies, platforms, hazards, power-ups
    CollisionSystem.js  AABB collisions, platforms (logs, iron crates), gaps, near-miss
    ParticleSystem.js pooled dots, stars, debris, rings and "POW!" text
    ScoreManager.js   score, stats, best-score persistence
    AudioManager.js   Web Audio synth sound effects
    MusicManager.js   procedural chiptune sequencer: one tune per zone + menu theme
    InputManager.js   keyboard, mouse and touch input (swipes, taps)
    PowerUp.js        power-up timers and the spirit-mask stack
    Pool.js           tiny object pool
  ui/                 HUD.js, Menu.js, GameOver.js, icons.js, styles.css
```

**Performance notes:** in Pixel style the scene is rendered at ~410×230 and upscaled; backdrops are pre-rendered once per zone into tileable strips; fruit, crates, hazards, particles and debris all come from fixed pools; entities behind the hero are recycled.

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
| No sound or music | Browsers only allow audio after a click/keypress – press any key or click once. Check the 🔊 button and Settings (ALL SOUND, MUSIC, volumes). |
| Choppy frame‑rate | Settings → GRAPHICS → **Low**, or ART STYLE → Pixel. Close other heavy tabs. |
| Stale save / want to reset | Settings → *Reset best scores*, or clear the site's local storage. |
| `npm install` fails | Check your connection; delete `node_modules` and `package-lock.json`, then run the launcher again. |

Enjoy the run! 🍊
