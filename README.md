# Missile Attack Arcade (Web)

Browser-based HTML5 Canvas reimplementation of a missile defense arcade game.

## Tech Stack

- Vanilla JavaScript (ES modules)
- HTML5 Canvas 2D rendering
- Web Audio API for procedural sound
- No build step required

## Run Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start a static server from the repo root:
   ```bash
   python3 -m http.server 8000
   ```
3. Open:
   `http://localhost:8000`

## Controls

- **Mouse move**: Aim current launcher
- **Mouse click**: Start game / fire selected launcher
- **Mouse hold**: Continuous fire for Vulkan cannon
- **Keys 1–4**: Select launcher slot

## Project Structure

```text
index.html
src/
  game.js
  terrain.js
  wave.js
  collision.js
  explosion.js
  ui.js
  engine/
    loop.js
    renderer.js
    input.js
    audio.js
  entities/
    launcher.js
    sam-launcher.js
    heat-seeking-launcher.js
    truck-launcher.js
    vulkan-cannon.js
    missile.js
    heat-seeking-missile.js
    vulkan-bullet.js
    enemy-missile.js
    super-missile.js
    drone.js
    suicide-drone.js
    nuke.js
```

## Notes

- Logical game resolution is `2560x1440`, scaled to the browser window.
- See `ARCHITECTURE.md` and `CLAUDE.md` for implementation details.
