# 🍊 WUMPA RUSH
**Hop wild. Dodge everything.**

A complete **Crossy‑Road / Frogger‑style hopper**, built with **Vite + HTML Canvas 2D** (plain JavaScript ES modules, no runtime dependencies). Click or tap a tile to hop toward it, cross endless rows of traffic, rivers and train tracks, and see how far Rukk can get.
Everything is original and generated in code: the hero, scenery, crates, sound effects and music. No downloaded assets, API keys or external services (the optional "Titan One" / "Press Start 2P" fonts load from Google Fonts when online; system fonts are used offline).

* **Look:** a soft hand‑painted top‑down lagoon (default) with piers, palms, purple rock spires and crystal shards, plus jungle, ruins and rocky zones. Switch to a chunky **Pixel** style (low‑res + dithering) in Settings → ART STYLE.
* **Rows:** endless, procedurally generated and always passable: grass/pier rows (trees, rocks and iron crates block), trails with carts, boulders and beetles, rivers with logs and lily pads, and rails where the Tiki Express thunders through after a bell and red lights.
* **Pressure:** stand still and the camera creeps up on you; fall off the bottom and a hawk snatches you.
* **Hero:** *Rukk*, an original orange‑brown cartoon marsupial. Spirit masks absorb hits (three = golden invincibility).
* **Audio:** Web Audio sound effects and a procedural chiptune soundtrack with a tune per zone.
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
| Hop toward a tile (keeps walking across safe grass, stops before traffic or water) | Click a tile | Tap a tile |
| Hop forward / back / left / right | `W` `S` `A` `D`, arrows, `Space` = forward | Swipe, or the on‑screen d‑pad |
| Pause | `Esc` or `P` | ❚❚ button |
| Restart (after game over) | `R` | Restart button |

## 🌴 How to play

* You have **3 hearts**. Carts, boulders, beetles, trains and open water cost a heart and put you back on your last safe tile. Standing on a log is safe, but logs drift: don't get carried off the side.
* **Crates:** hop into a fruit crate to smash it (+4 fruit). Iron crates block the way.
* **Pick‑ups:** fruit and gems (green 500, purple 1000, blue 2000), spirit masks, Magnet (pulls fruit) and Fruit ×2.
* Progress is scored per row hopped, plus fruit, gems and crates. Zones change every 48 rows (lagoon, jungle, ruins, rocky) with new music.

---

## 🗂 Project layout

```
index.html            entry page
vite.config.js
start.command         macOS launcher
src/
  main.js             boot + fatal-error screen
  config/settings.js  gameplay constants + localStorage store
  game/
    Game.js           state machine, loop, hits, pick‑ups, camera creep, hawk, music cues
    Grid.js           lazy endless row generator (grass / road / river / rail) with safety rules
    Hero.js           tile hopping, click‑to‑walk, log riding, respawn (wraps Player.js for the pose)
    TopRenderer.js    painted + pixel top‑down render pipelines
    Paint.js          painting helpers (trees, rocks, temples)
    Sprites.js        fruit, gems, crates, carts, trains, logs, masks, power‑ups
    ParticleSystem.js pooled particles and "POW!" text
    ScoreManager.js   score, stats, best‑score persistence
    AudioManager.js   Web Audio synth sound effects
    MusicManager.js   procedural chiptune sequencer
    InputManager.js   keyboard, mouse click, touch tap/swipe
    PowerUp.js        power‑up timers and the spirit‑mask stack
    Pool.js           tiny object pool
  ui/                 HUD.js, Menu.js, GameOver.js, icons.js, styles.css
```

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
