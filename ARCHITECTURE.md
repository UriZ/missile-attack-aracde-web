# Missile Attack Arcade — Web Architecture

## 1. Tech Stack Decisions

### Language: Vanilla JavaScript (ES Modules) — CONFIRMED

TypeScript would add value for a larger team or longer-lived project, but here the overhead outweighs the benefit:
- No build step means instant iteration — critical for a game where you tweak constants constantly.
- The codebase is ~15 files with well-defined interfaces. Type errors are unlikely to be the bottleneck.
- JSDoc `@typedef` comments can provide IDE autocomplete where needed without a compiler.

### Rendering: Canvas 2D API — CONFIRMED with caveats

The original Godot game is 100% procedural polygon drawing (Polygon2D nodes, `draw_circle`, `draw_line`, `draw_arc`). Canvas 2D maps directly to this. WebGL would add complexity for no visual benefit — there are no textures, shaders, or 3D transforms.

**Performance concern addressed:** The terrain decoration system creates many polygon nodes (trees with 10+ blobs, buildings with 30+ parts, bridges with 50+ elements). In Godot these are persistent scene nodes. In Canvas 2D, we redraw every frame, which is actually *cheaper* — no scene graph overhead, just immediate-mode draw calls. At 2560x1440 with ~200 polygons per frame, Canvas 2D will not break a sweat. The explosion system (the heaviest visual load) peaks at ~100 draw calls for a mega explosion — trivial for Canvas 2D.

**One optimization to plan for:** Terrain + decorations are static between damage events. We should render them to an offscreen canvas and only re-render on `damage()`. This avoids redrawing 200+ decoration polygons every frame.

### Audio: Web Audio API — CONFIRMED, but architecture differs significantly

The Godot version generates `AudioStreamWAV` buffers sample-by-sample (PCM data in `PackedByteArray`). Web Audio offers two paths:

1. **AudioBuffer approach (recommended):** Pre-generate PCM Float32Arrays using the same math as Godot, wrap in `AudioBuffer`, play via `AudioBufferSourceNode`. This is the closest 1:1 translation of the Godot code.

2. **OscillatorNode approach:** Use Web Audio's built-in oscillators and noise generators. Cleaner API but would require rewriting the sound design from scratch.

**Decision:** Use approach #1 (AudioBuffer with procedural PCM generation). The Godot sound code translates almost line-for-line. The main differences:
- Godot uses 16-bit int PCM → Web Audio uses Float32 (-1.0 to 1.0), so we skip the int conversion.
- Godot's `AudioStreamPlayer2D` has positional audio → we can use `StereoPannerNode` for basic left/right panning based on x-position, but skip full spatial audio (not needed for a 2D game).
- Looping sounds (heat-seeker motor, vulkan spool) use `AudioBufferSourceNode.loop = true`.

### Build: None — CONFIRMED

ES modules with `<script type="module">` work in all modern browsers. No bundler needed.

### Serving: Any static file server

`python3 -m http.server` or VS Code Live Server during development.

---

## 2. Coordinate System & Viewport

- **Logical resolution:** 2560 x 1440 (matches Godot viewport exactly)
- **Canvas scaling:** Set canvas CSS to fill the window; use `ctx.setTransform()` to scale logical coordinates to physical pixels.
- **Coordinate origin:** Top-left (0,0), same as Godot's default 2D.
- **Y-axis:** Down is positive (same as Godot 2D).
- **Mouse coordinates:** Transform from DOM events to logical coordinates using the inverse of the display scale.

```
scaleX = canvas.clientWidth / 2560
scaleY = canvas.clientHeight / 1440
scale = Math.min(scaleX, scaleY)  // keep aspect ratio
offsetX = (canvas.clientWidth - 2560 * scale) / 2
offsetY = (canvas.clientHeight - 1440 * scale) / 2

logicalX = (event.clientX - offsetX) / scale
logicalY = (event.clientY - offsetY) / scale
```

---

## 3. Module Structure & Interfaces

### `src/game.js` — Game Controller (translates `main.gd`)

```js
export class Game {
  constructor(canvas)

  // State
  state        // 'start' | 'playing' | 'gameover'
  score        // int
  waveNumber   // int
  selectedLauncher  // Launcher | null
  entities     // EntityManager

  // Lifecycle
  start()      // transition from start/gameover → playing
  update(dt)   // called every frame
  render(ctx)  // called every frame

  // Game events
  selectLauncher(launcher)
  fireMissile(targetPos)
  onEnemyDestroyed()
  shakeScreen(intensity)
  checkGameOver()
}
```

### `src/engine/loop.js` — Game Loop

```js
export function startLoop(updateFn, renderFn)
// Uses requestAnimationFrame
// Calculates dt, caps at 1/20s to prevent spiral-of-death
// Calls updateFn(dt) then renderFn(ctx)
```

### `src/engine/input.js` — Input Manager

```js
export class Input {
  constructor(canvas, coordinateTransform)

  mouseX, mouseY      // logical coordinates
  mouseDown           // bool (left button)
  mouseJustPressed    // bool (true for one frame on click)

  // Keyboard
  isKeyDown(key)
  wasKeyPressed(key)  // true for one frame

  update()            // call at start of each frame to reset per-frame state
}
```

### `src/engine/renderer.js` — Rendering Utilities

```js
export class Renderer {
  constructor(canvas)

  // Setup
  beginFrame()        // clear, apply camera transform
  endFrame()

  // Camera (for screen shake)
  cameraOffsetX, cameraOffsetY

  // Drawing helpers (wrap ctx calls for convenience)
  drawPolygon(points, color)
  drawCircle(x, y, radius, color)
  drawLine(x1, y1, x2, y2, color, width)
  drawArc(x, y, radius, startAngle, endAngle, color, width)
  drawText(text, x, y, font, color, align)

  // Offscreen canvas management
  createOffscreen(width, height)  // returns {canvas, ctx}

  // Coordinate transform
  logicalToScreen(x, y)
  screenToLogical(clientX, clientY)
}
```

### `src/engine/audio.js` — Audio Engine

```js
export class Audio {
  constructor()

  audioCtx          // AudioContext (created on first user interaction)

  // Pre-generated buffers (created once)
  init()            // generate all sound buffers

  // Playback
  playExplosion(x, isMega)
  playLaunch(x, type)        // type: 'sam' | 'heatseeker' | 'vulkan_shot'
  playMotorLoop(x)           // returns handle for stop/update
  playSpoolLoop(x)           // returns handle for stop/update
  stopLoop(handle)
  updateLoopPan(handle, x)   // update stereo position
  updateLoopPitch(handle, pitch)
  updateLoopVolume(handle, volume)

  // Internal
  _generateExplosionBuffer(isMega)
  _generateLaunchBuffer(type)
  _generateMotorBuffer()
  _generateSpoolBuffer()
  _generateVulkanShotBuffer()
  _playBuffer(buffer, volume, pitch, panX)
}
```

### `src/entities/entity.js` — Base Entity

```js
export class Entity {
  x, y               // position
  rotation           // radians
  alive              // bool
  groups             // Set<string>  e.g. {'enemy_missiles', 'launchers'}

  constructor(x, y)
  update(dt)         // override
  draw(ctx)          // override
  destroy()          // mark alive = false, cleanup
}
```

### `src/entities/entity-manager.js` — Entity Collection

```js
export class EntityManager {
  entities           // Entity[]

  add(entity)
  remove(entity)
  update(dt)         // update all, remove dead
  draw(ctx)          // draw all in z-order
  getGroup(name)     // returns Entity[] in group
  clear()
}
```

### `src/entities/launcher.js` — Base Launcher

```js
export class Launcher extends Entity {
  isSelected         // bool
  turretRotation     // radians
  health             // not in original, but implied (alive/dead)

  constructor(x, y, type)  // type: 'sam' | 'truck' | 'heatseeker' | 'vulkan'

  update(dt)         // turret tracking toward mouse
  draw(ctx)          // draw base + turret polygons
  setSelected(selected)
  getLaunchPosition() // tip of turret
  containsPoint(x, y) // for click detection

  // Subclass-specific polygon data stored as const arrays
}
```

Subclasses: `SAMLauncher`, `TruckLauncher`, `HeatSeekerLauncher`, `VulkanCannon`

The `VulkanCannon` extends `Launcher` and adds:
```js
  heat               // 0.0 to 1.0
  overheated          // bool
  isFiring            // bool
  barrelSpin          // degrees
  barrelSpeed         // degrees/sec

  startFiring()
  stopFiring()
  fireBullet()        // spawns VulkanBullet
```

### `src/entities/missile.js` — Player Interceptor

```js
export class Missile extends Entity {
  velocity           // {x, y}
  gravityForce       // 200

  constructor(x, y)
  launchTo(targetX, targetY, launchTime)
  update(dt)         // physics, rotation, off-screen check
  draw(ctx)          // missile body + engine fire trail
}
```

Similarly: `HeatSeekingMissile`, `EnemyMissile`, `SuperMissile`, `VulkanBullet`, `Drone`, `SuicideDrone`

### `src/terrain.js` — Deformable Terrain

```js
export class Terrain {
  static WIDTH = 2560
  static DEPTH = 200
  static RESOLUTION = 8

  heights            // Float32Array
  decorations        // [{node data}]
  offscreenCanvas    // cached render (invalidated on damage)
  dirty              // bool

  constructor()
  generateHeights()
  spawnDecorations()
  damage(worldX, worldY, radius, depth)
  draw(ctx)          // blit offscreen if clean, re-render if dirty
  getHeightAt(x)     // interpolated surface Y for placement
  containsPoint(x, y) // for collision
}
```

### `src/explosion.js` — Explosion Effect

```js
export class Explosion extends Entity {
  isMega             // bool
  elapsed            // float
  totalLifetime      // float
  // All the visual state from explosion.gd

  constructor(x, y, isMega)
  update(dt)         // physics for debris, sparks, cinders
  draw(ctx)          // layered procedural effects
}
```

### `src/ui.js` — UI Layer

```js
export class UI {
  constructor(game)

  drawHUD(ctx)            // score, wave, launcher panel
  drawStartScreen(ctx)    // title, play button
  drawGameOver(ctx)       // final score, play again
  drawWaveBanner(ctx)     // animated wave text
  drawHeatBar(ctx)        // vulkan heat meter
  drawCrosshair(ctx, type) // 'default' | 'heat' | 'locked'
  drawLockOverlay(ctx, mouseX, mouseY, lockedEnemy)

  // Click detection for UI buttons
  handleClick(x, y)       // returns true if UI consumed the click
}
```

### `src/wave.js` — Wave Generator

```js
export class WaveSystem {
  waveNumber         // int
  waveTimer          // float
  waveEvents         // [{time, type}]
  inBetweenWave      // bool
  betweenWaveTimer   // float

  update(dt, spawnFn, enemyCount)
  generateWaveEvents(wave)    // returns sorted event list
  getCurrentWave()
}
```

### `src/collision.js` — Collision Detection

```js
export class CollisionSystem {
  // Check and resolve collisions between entity groups each frame
  update(entityManager, terrain, game)
}
```

---

## 4. Entity System Design

### Lifecycle

1. Entity created via `new Entity(x, y)` — constructor sets initial state
2. Added to `EntityManager` via `entities.add(entity)`
3. Each frame: `entity.update(dt)` then `entity.draw(ctx)`
4. Entity calls `this.destroy()` when done (off-screen, exploded, etc.)
5. `EntityManager.update()` filters out `alive === false` entities after updating

### Groups (replaces Godot's `add_to_group`)

Entities declare their groups in the constructor:
```js
this.groups.add('enemy_missiles')  // EnemyMissile, SuperMissile, Drone, SuicideDrone
this.groups.add('launchers')       // all Launcher subclasses
this.groups.add('terrain')         // Terrain (singleton but uses same system)
```

`EntityManager.getGroup('enemy_missiles')` returns all living entities in that group.

### Signals → Callbacks

Godot signals become callback functions passed at construction or set as properties:
- `launcher_clicked` → `launcher.onClick = (launcher) => game.selectLauncher(launcher)`
- `enemy_destroyed` → `missile.onEnemyDestroyed = () => game.onEnemyDestroyed()`

---

## 5. Rendering Pipeline

### Draw Order (back to front)

1. **Sky background** — gradient fill or solid dark color
2. **Background mountains** — layered silhouettes (z: -10 in Godot)
3. **Terrain offscreen canvas** — ground + grass + decorations (blit cached)
4. **Crater marks** — scorch polygons on ground (z: -1 in Godot)
5. **Selection glow** — under selected launcher (z: -2, -3 in Godot)
6. **Launchers** — base + turret polygons
7. **Projectiles** — missiles, bullets, enemy missiles, drones
8. **Explosions** — fireball, debris, sparks, smoke (drawn on top)
9. **UI overlay** — score, wave banner, HUD, heat bar, crosshair

### Screen Shake

Camera offset applied via `ctx.translate(shakeX, shakeY)` at the start of the game-world rendering pass (steps 1-8). UI (step 9) is drawn without the shake offset.

```js
// In render:
ctx.save()
ctx.translate(cameraOffsetX, cameraOffsetY)
// draw game world...
ctx.restore()
// draw UI (unshaken)
```

---

## 6. Collision System Design

### Collision Groups

| Attacker | Target | Effect |
|----------|--------|--------|
| Player missile / heat-seeker / vulkan bullet | `enemy_missiles` group | Both destroyed, score +1, explosion |
| Enemy missile | `terrain` | Terrain damage, crater, explosion |
| Enemy missile | `launchers` | Launcher destroyed, mega explosion, big crater |
| Super missile | `terrain` | Triple damage, triple mega explosion |
| Super missile | `launchers` | Launcher destroyed, massive damage |
| Suicide drone | `launchers` | Launcher destroyed, mega explosion |
| Player missile / heat-seeker | `terrain` | Small terrain damage, small crater |
| Vulkan bullet | `terrain` | No damage, despawn |

### Detection Method

All entities in the original game use Godot's `Area2D` with simple collision shapes (rectangles). We replicate this with AABB (axis-aligned bounding box) or circle-based checks:

```js
function checkCollision(a, b) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  return dist < (a.collisionRadius + b.collisionRadius)
}
```

Circle collision is sufficient — the entities are small relative to the viewport and pixel-perfect collision is unnecessary for this game.

### Terrain Collision

Terrain collision uses the heightmap directly:
```js
function collidesWithTerrain(entity, terrain) {
  const heightAtX = terrain.getHeightAt(entity.x)
  return entity.y >= terrain.baseY + heightAtX
}
```

Where `terrain.baseY` is the terrain's world Y position (1240 in the original).

### Per-Frame Check Order

1. Player projectiles vs `enemy_missiles` group
2. Enemy projectiles vs `terrain`
3. Enemy projectiles vs `launchers` group
4. Player projectiles vs `terrain`

Short-circuit on first hit per entity (an entity can only collide once per frame).

---

## 7. Audio System Design

### Godot → Web Audio Translation

| Godot Concept | Web Audio Equivalent |
|--------------|---------------------|
| `AudioStreamWAV` with PCM data | `AudioBuffer` with Float32Array |
| `AudioStreamPlayer.play()` | `AudioBufferSourceNode.start()` |
| `AudioStreamPlayer2D` (positional) | `StereoPannerNode` (pan based on x / 1280 - 1) |
| `volume_db` | `GainNode.gain.value = Math.pow(10, db/20)` |
| `pitch_scale` | `AudioBufferSourceNode.playbackRate.value` |
| `loop_mode = LOOP_FORWARD` | `AudioBufferSourceNode.loop = true` |
| `tanh` soft clipping | Same — `Math.tanh()` in generation code |

### Sound Buffer Pre-generation

On first user click (to satisfy autoplay policy), create `AudioContext` and generate all buffers:

- `explosionBuffer` — 0.7s, 22050 Hz
- `megaExplosionBuffer` — 1.1s, 22050 Hz
- `launchBuffer` — 0.55s (SAM/truck)
- `heatSeekerLaunchBuffer` — 0.65s
- `motorLoopBuffer` — 0.3s (loopable)
- `spoolLoopBuffer` — 0.2s (loopable)
- `vulkanShotBuffer` — 0.06s

Each buffer is generated using the exact same math as the Godot code, with the only change being Float32 output instead of 16-bit int.

### Continuous Sound Management

Heat-seeker motor and vulkan spool are continuous loops that need dynamic pitch/volume:

```js
class SoundLoop {
  constructor(audioCtx, buffer) {
    this.source = audioCtx.createBufferSource()
    this.gain = audioCtx.createGain()
    this.panner = audioCtx.createStereoPanner()
    this.source.buffer = buffer
    this.source.loop = true
    this.source.connect(this.gain)
    this.gain.connect(this.panner)
    this.panner.connect(audioCtx.destination)
  }
  start() { this.source.start() }
  stop() { this.source.stop() }
  setPitch(rate) { this.source.playbackRate.value = rate }
  setVolume(db) { this.gain.gain.value = Math.pow(10, db / 20) }
  setPan(x) { this.panner.pan.value = Math.max(-1, Math.min(1, x / 1280 - 1)) }
}
```

---

## 8. Game State Management

### States and Transitions

```
START ──[play click]──> PLAYING ──[all launchers dead]──> GAMEOVER
                           ^                                  |
                           └────────[play again click]────────┘
```

### State-specific behavior

| State | Update | Render | Input |
|-------|--------|--------|-------|
| START | Animate play button pulse | Start screen + cover | Click play button only |
| PLAYING | All game logic, waves, collisions | Full game world + UI | Mouse aim, click fire, 1-4 select launcher |
| GAMEOVER | Screen shake decay only | Game world frozen + overlay | Click play again only |

### Wave System Flow

```
PLAYING starts → betweenWaveTimer = 2.5s (grace period)
  → timer expires → _startWave(1) → waveEvents populated
  → waveTimer ticks → events fire → enemies spawn
  → all events fired AND no enemies alive → _onWaveComplete()
  → betweenWaveTimer = 3.0s → next wave
```

---

## 9. Key Godot → JS Translation Patterns

### Polygon2D nodes → Canvas path drawing

Godot scene files define visual structure as nested Polygon2D nodes with fixed vertex arrays. In JS, each entity stores its polygon data as const arrays and draws them in `draw(ctx)`:

```js
// Godot .tscn:
// [node name="BaseSlab" type="Polygon2D" parent="."]
// color = Color(0.24, 0.26, 0.22, 1)
// polygon = PackedVector2Array(-54, 28, 54, 28, 48, 14, -48, 14)

// JS equivalent in draw():
ctx.fillStyle = 'rgba(61, 66, 56, 1)'  // 0.24*255, 0.26*255, 0.22*255
ctx.beginPath()
ctx.moveTo(this.x - 54, this.y + 28)
ctx.lineTo(this.x + 54, this.y + 28)
ctx.lineTo(this.x + 48, this.y + 14)
ctx.lineTo(this.x - 48, this.y + 14)
ctx.closePath()
ctx.fill()
```

### Turret rotation (child node transform)

Godot's nested Node2D rotation becomes `ctx.save/translate/rotate/restore`:

```js
// Draw turret (rotated child)
ctx.save()
ctx.translate(this.x, this.y)
ctx.rotate(this.turretRotation)
// draw turret polygons relative to (0,0)
ctx.restore()
```

### `lerp_angle` → custom function

```js
function lerpAngle(from, to, weight) {
  let diff = ((to - from + Math.PI * 3) % (Math.PI * 2)) - Math.PI
  return from + diff * weight
}
```

### `randf_range(a, b)` → `a + Math.random() * (b - a)`

### `queue_free()` → `this.alive = false`

### `get_tree().get_nodes_in_group(name)` → `entityManager.getGroup(name)`

### `get_global_mouse_position()` → `input.mouseX, input.mouseY`

### `create_tween()` → Simple tween utility or inline lerp in update()

For UI animations (play button pulse, wave banner fade), a lightweight tween helper:

```js
class Tween {
  constructor(target, prop, from, to, duration, easing)
  update(dt)  // returns true when complete
}
```

### Color conversion

Godot `Color(r, g, b, a)` where r,g,b are 0-1 → CSS `rgba(r*255, g*255, b*255, a)`.

Helper:
```js
function rgba(r, g, b, a = 1) {
  return `rgba(${(r*255)|0},${(g*255)|0},${(b*255)|0},${a})`
}
```

---

## 10. Terrain Decoration Caching Strategy

The terrain decoration system is the most polygon-heavy part of the game. A single industry building has ~30 polygons. With 20-30 decorations, that is 300-600 polygons redrawn every frame.

**Solution:** Render terrain + all decorations to an offscreen canvas. Blit this cached canvas to the main canvas each frame. Only re-render the offscreen canvas when `damage()` is called.

```js
// On terrain init or damage:
this.dirty = true

// In draw:
if (this.dirty) {
  this._renderToOffscreen()
  this.dirty = false
}
ctx.drawImage(this.offscreenCanvas, 0, this.baseY)
```

Crater marks are drawn separately (on top of the cached terrain) since they accumulate over time. They can also be rendered to a second offscreen canvas that gets appended to on each crater.

---

## 11. File Organization (Revised)

The proposed structure in CLAUDE.md is mostly correct. Changes:

```
index.html
src/
  game.js              -- Game controller, state management
  engine/
    loop.js            -- requestAnimationFrame game loop
    renderer.js        -- Canvas setup, coordinate transform, draw helpers
    input.js           -- Mouse/keyboard input with logical coordinate mapping
    audio.js           -- Web Audio procedural sound engine
    tween.js           -- Lightweight tween/animation utility
  entities/
    entity.js          -- Base entity class
    entity-manager.js  -- Entity collection, group queries, lifecycle
    launcher.js        -- Base launcher (turret tracking, selection, polygon data)
    sam-launcher.js    -- SAM site polygons + behavior
    truck-launcher.js
    heat-seeking-launcher.js
    vulkan-cannon.js   -- Rapid fire + overheat + barrel spin
    missile.js         -- Player interceptor
    heat-seeking-missile.js
    vulkan-bullet.js
    enemy-missile.js
    super-missile.js
    drone.js
    suicide-drone.js
  terrain.js           -- Heightmap + damage + decoration rendering + offscreen cache
  explosion.js         -- Procedural explosion effects (visual only)
  crater.js            -- Persistent crater/scorch marks
  collision.js         -- Per-frame collision checks between groups
  wave.js              -- Wave event generation and scheduling
  ui.js                -- HUD, menus, banners, crosshair
  utils.js             -- Math helpers (lerpAngle, rgba, randf, clamp, etc.)
```

**Changes from proposed structure:**
- Added `engine/` subdirectory for core systems that are game-agnostic
- Added `entity.js` and `entity-manager.js` (missing from original proposal)
- Added `crater.js` (separate from explosion — craters persist, explosions don't)
- Added `tween.js` for UI animations
- Added `utils.js` for shared math helpers
- Separated `loop.js` from `game.js` (game loop is a reusable engine piece)

---

## 12. Phase Dependency Review & Recommended Changes

### Current phases (from task list):

1. Phase 0: Architecture (this document)
2. Phase 1: Core Engine (loop, renderer, input)
3. Phase 2: Terrain System
4. Phase 3: Collision Detection
5. Phase 4: Launcher System
6. Phase 5: Player Projectiles
7. Phase 6: Enemy Units
8. Phase 7: Explosion & Particle Effects
9. Phase 8: Procedural Audio Engine
10. Phase 9: Wave System & Game Flow
11. Phase 10: UI & HUD
12. Phase 11: Integration, Polish & Testing

### Issues and recommendations:

**Move Collision later.** Phase 3 (Collision) depends on having entities to collide. It should come after Phase 5 (Player Projectiles) and Phase 6 (Enemy Units), or be built incrementally alongside them. Building a collision system with no entities to test is premature.

**Move Explosion earlier.** Explosions are needed as soon as anything collides. They should be built alongside or immediately after collision, not in Phase 7.

**Audio can be parallel.** Audio is completely independent of all other systems. It can be built at any point and plugged in. Phase 8 is fine, but a developer could start it as early as Phase 1 if they wanted.

**UI should be split.** The UI has two distinct parts: (a) game screens (start/gameover) which are needed for game flow, and (b) HUD elements (score, wave banner, heat bar, crosshair) which are gameplay-dependent. The screens should be part of Phase 9 (Game Flow). The HUD can be Phase 10.

**Recommended revised order:**

1. Phase 0: Architecture (done)
2. Phase 1: Core Engine — loop, renderer, input, entity system, utils
3. Phase 2: Terrain System — heightmap, decorations, offscreen caching
4. Phase 3: Launcher System — all 4 launcher types, selection, turret tracking
5. Phase 4: Player Projectiles — missile, heat-seeker, vulkan bullet
6. Phase 5: Enemy Units — enemy missile, super missile, drone, suicide drone
7. Phase 6: Collision + Explosions — collision checks, explosion effects, crater marks, terrain damage
8. Phase 7: Procedural Audio Engine — all sounds, loop management
9. Phase 8: Wave System & Game Flow — wave generation, game states, start/gameover screens
10. Phase 9: UI & HUD — score, wave banner, launcher HUD, heat bar, crosshair
11. Phase 10: Integration, Polish & Testing

**Key dependency chain:** 1 → 2 → 3 → 4 → 5 → 6 → 8 → 9. Audio (7) and UI details (9) can be parallelized.

---

## 13. Risks & Potential Issues

### Crosshair / Custom Cursor
Godot uses `Input.set_custom_mouse_cursor()` with procedurally generated textures. In the browser, we have two options:
- CSS `cursor: none` + draw crosshair at mouse position on canvas (recommended — more flexible, matches game rendering)
- CSS `cursor: url(data:image/png;base64,...)` — limited to 32x32/128x128 depending on browser

**Recommendation:** Hide the OS cursor and draw the crosshair on the canvas. This gives us full control over the crosshair appearance and animation (lock circle, target line).

### AudioContext Autoplay Policy
Browsers block `AudioContext` creation before user interaction. The start screen's "PLAY" button click is the natural place to initialize audio. This is already handled by the game flow.

### Screen Shake with Canvas Transforms
Canvas `translate()` shifts the entire coordinate space. We need to be careful that click coordinates are transformed *without* shake offset (they are — mouse events come from DOM, not canvas). The shake only affects rendering.

### Entity Cleanup
Godot's `queue_free()` defers deletion to end of frame. Our `alive = false` pattern achieves the same — entities are filtered out at the end of `EntityManager.update()`. Important: never remove entities mid-iteration.

### Performance Budget
Worst case frame: mega explosion (100 draw calls) + terrain (1 blit) + 4 launchers (40 draw calls each) + 24 enemy missiles + decorations. Total: ~300 draw calls. Canvas 2D handles 1000+ draw calls at 60fps easily. No concern here.
