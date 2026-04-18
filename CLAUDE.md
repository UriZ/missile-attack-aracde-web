# Missile Attack Arcade — HTML5/JS Reimplementation

## Overview
Browser-based reimplementation of a Godot 4.6 missile defense arcade game.
Original source: `/Users/urizonens/dev/multiagent/missile-attack-arcade/`

## Tech Stack
- **Rendering**: HTML5 Canvas 2D API (all visuals are procedural polygon drawing)
- **Audio**: Web Audio API (procedural sound synthesis — no audio files)
- **Language**: Vanilla JavaScript (ES modules)
- **Build**: None required — static files served directly
- **Viewport**: 2560x1440 logical, scaled to fit browser window

## Project Structure
```
index.html          — Entry point, canvas element
src/
  game.js           — Main game loop, state management
  renderer.js       — Canvas rendering pipeline
  input.js          — Mouse/keyboard input handling
  audio.js          — Web Audio procedural sound engine
  collision.js      — Collision detection system
  entities/
    launcher.js     — Base launcher class (turret tracking, selection)
    sam-launcher.js
    truck-launcher.js
    heat-seeking-launcher.js
    vulkan-cannon.js
    missile.js      — Player interceptor
    heat-seeking-missile.js
    vulkan-bullet.js
    enemy-missile.js
    super-missile.js
    drone.js
    suicide-drone.js
  terrain.js        — Deformable heightmap terrain + decorations
  explosion.js      — Procedural explosion effects
  ui.js             — HUD, score, wave banners, menus
  wave.js           — Wave generation and scheduling
```

## Key Design Decisions
- All entities are plain JS classes with `update(dt)` and `draw(ctx)` methods
- Game loop uses `requestAnimationFrame` with delta time
- Collision is checked each frame between relevant entity groups
- Terrain is a heightmap array rendered as canvas paths
- Audio uses Web Audio API oscillators and noise buffers to match Godot's procedural sounds

## Original Game Reference
See `/Users/urizonens/dev/multiagent/missile-attack-arcade/CLAUDE.md` for full architecture of the Godot version.
