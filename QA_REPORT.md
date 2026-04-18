# Visual QA Report — 2026-04-18

## Summary

6 bugs found. 0 critical, 2 high, 2 medium, 2 low.

Confirmed issues under investigation: heat-seeker lock circle IS too large (confirmed, high severity). Crater persistence: Crater entities fade and destroy correctly at 10 s — the permanent terrain deformations are intentional heightmap edits, not stuck entities.

---

## Bugs

### BUG-001: heat-lock-circle-oversized

- **Severity**: High
- **File(s)**: `src/ui.js` (line 42), `src/game.js` (line 31)
- **Description**: The heat-seeker lock circle rendered around the crosshair has a radius of 80 logical pixels. The original Godot source (`main.gd` line 26) defines `crosshair_radius = 50.0`. The HTML5 port set both the detection radius (`CROSSHAIR_RADIUS = 80` in `game.js`) and the visual radius (`HEAT_LOCK_RADIUS = 80` in `ui.js`) to 80 — 60% larger than the reference game. The circle visually overwhelms the crosshair arms (arm length is only 32 px, gap 14 px) and makes the lock zone appear inaccurately large to the player.
- **Steps to Reproduce**:
  1. Start the game and click to begin play.
  2. Press key `2` to select the HEAT-SEEKER launcher.
  3. Move mouse to open sky. Observe the red circle around the crosshair.
- **Root Cause Hypothesis**: `CROSSHAIR_RADIUS` in `src/game.js` was set to 80 instead of the reference value of 50. `HEAT_LOCK_RADIUS` in `src/ui.js` was set to match that value (80) instead of the intended visual radius. Both constants must be reduced to 50.
- **Fix**: Change `const CROSSHAIR_RADIUS = 80` in `src/game.js` to `50`, and change `const HEAT_LOCK_RADIUS = 80` in `src/ui.js` to `50`.
- **Screenshot**: /tmp/qa-screenshots/04_heatseeker_selected.png

---

### BUG-002: start-screen-text-vertically-misaligned

- **Severity**: High
- **File(s)**: `src/game.js` (lines 222–234, the `render()` method start-screen branch)
- **Description**: The "MISSILE ATTACK" title is drawn at logical Y = 500 and "Click to start" at Y = 700. The logical canvas height is 1440, so vertical center is Y = 720. Both texts are rendered in the upper third of the screen, leaving the bottom ~50% of the viewport completely empty dark space. The composition is clearly top-heavy and visually unbalanced. Expected: title near Y = 560–600 (upper third, intentional) but "Click to start" should be closer to Y = 750–800 to feel centered below the title.
- **Steps to Reproduce**:
  1. Load the game at http://localhost:8000.
  2. Observe the start screen before clicking.
- **Root Cause Hypothesis**: The Y coordinates in `game.js`'s start-screen render block (500 and 700) were likely copied from a 1080p or smaller reference without adjusting for the 2560×1440 logical resolution. At 1440px height, Y = 700 is only 48.6% down — barely past center. A sub-title hint at Y = 700 out of 1440 does not create a centered layout.
- **Fix**: Move "MISSILE ATTACK" to approximately Y = 580 and "Click to start" to Y = 780, or alternatively center the layout around `LOGICAL_H / 2` (720) with the title above and prompt below.
- **Screenshot**: /tmp/qa-screenshots/01_start_screen.png

---

### BUG-003: wave-counter-shows-zero-before-wave-starts

- **Severity**: Medium
- **File(s)**: `src/ui.js` (line 121), `src/game.js` (line 184)
- **Description**: The HUD shows "Wave 0" during the brief pre-wave delay after the game starts (visible in screenshot `02_gameplay_initial`). The wave number is initialised to 0 in `game.js` and only updates to 1 when `waves.onWaveStart` fires. The text "Wave 0" is meaningless to the player and exposes an internal counter state.
- **Steps to Reproduce**:
  1. Click to start the game.
  2. Observe the top-left HUD immediately after the game starts (before wave 1 banner appears).
- **Root Cause Hypothesis**: `this.waveNumber` is initialised to 0 in `Game.start()` and rendered directly via `drawHUD`. No special-case guard hides the "Wave 0" text before the first wave begins.
- **Fix**: Either initialise `waveNumber` to 1, or add a guard in `drawHUD` to suppress or replace the wave text when `waveNumber === 0` (e.g. show "Preparing..." or omit the line).
- **Screenshot**: /tmp/qa-screenshots/02_gameplay_initial.png

---

### BUG-004: heat-bar-visible-at-zero-heat

- **Severity**: Medium
- **File(s)**: `src/ui.js` (lines 139–142, `drawHUD`)
- **Description**: The HEAT bar and its "HEAT" label are drawn as soon as the Vulkan Cannon is selected, even when `sel.heat === 0` (no heat accumulated). The bar track renders with an empty fill, adding visual clutter during normal play before the player has ever fired. In the original Godot version the heat bar only becomes relevant during sustained fire. Displaying it at heat=0 gives a false impression that the weapon is already partially limited.
- **Steps to Reproduce**:
  1. Start the game.
  2. Press key `4` to select VULKAN without firing.
  3. Observe the bottom-left: a "HEAT" label and empty bar track appear immediately.
- **Root Cause Hypothesis**: `_drawHeatBar` is called unconditionally whenever the Vulkan is selected (`src/ui.js` line 140: `if (sel && sel.type === 'vulkan' && sel.alive)`), with no minimum-heat threshold.
- **Fix**: Add a guard: only draw the heat bar when `sel.heat > 0` (or a small epsilon like 0.01) to hide it when the weapon is cold. Alternatively, show the bar but start it collapsed to zero width with just the track, and only show the label once heat begins building.
- **Screenshot**: /tmp/qa-screenshots/07_vulkan_selected.png

---

### BUG-005: crosshair-clips-at-viewport-edge

- **Severity**: Low
- **File(s)**: `src/ui.js` (all `_draw*Crosshair` methods)
- **Description**: When the cursor is near the edge of the browser window, the crosshair arms and corner brackets extend beyond the canvas boundary and are clipped. In screenshot `18_cursor_edge`, the crosshair at the top-right corner shows a partial rendering (only the two arms pointing inward are visible). This is a minor cosmetic issue with no gameplay impact, but it looks unpolished.
- **Steps to Reproduce**:
  1. Start a game.
  2. Move the mouse to any corner or near-edge of the browser window.
  3. Observe the crosshair being partially cut off.
- **Root Cause Hypothesis**: No clamping is applied to the cursor position when drawing crosshair elements. The Canvas clip region naturally clips lines that go outside `(0, 0, LOGICAL_W, LOGICAL_H)`. A simple clamp on mouse position (or canvas clip path) would prevent the artifact.
- **Fix**: In `drawCrosshair`, clamp `mx` and `my` inward by `CROSSHAIR_GAP + CROSSHAIR_LINE_LEN` (about 46 px) so arms never extend off-canvas.
- **Screenshot**: /tmp/qa-screenshots/18_cursor_edge.png

---

### BUG-006: terrain-deformation-craters-accumulate-permanently

- **Severity**: Low
- **File(s)**: `src/terrain.js` (`damage()` method)
- **Description**: Each missile impact calls `terrain.damage()` which permanently raises `this.heights[]` at the impact zone, creating V-shaped depressions in the terrain mesh that accumulate across the entire game session and are never restored. In long sessions or waves with many impacts, the entire terrain baseline can be pushed down into deep pits, distorting the visual landscape significantly. Screenshots `19_many_craters` and `20_craters_should_be_gone` show this clearly: the terrain profile is deeply pockmarked after a few minutes of play, with the baseline surface pushed down at multiple points. The `Crater` entity overlays (scorch marks) do correctly fade and destroy after 10 seconds, confirming that part works. However the underlying heightmap damage is permanent.
- **Note**: This may be intentional design (matching the Godot original's deformable terrain behaviour), but the effect is visually jarring at scale and there is no upper-bound cap on cumulative damage per region beyond `TERRAIN_DEPTH - 10`.
- **Steps to Reproduce**:
  1. Start a game and wait for multiple waves.
  2. Allow enemy missiles to reach the terrain (do not intercept them all).
  3. Observe the terrain profile gradually becoming heavily cratered with no restoration.
- **Root Cause Hypothesis**: `terrain.damage()` only adds depth; there is no cooldown, partial-repair, or maximum-per-column cap on damage to prevent complete terrain destruction at a single X coordinate.
- **Fix** (if intentional behaviour should be capped): Add a per-column minimum floor, e.g. `this.heights[i] = Math.min(this.heights[i], TERRAIN_DEPTH * 0.85)`, or add a gradual terrain recovery system that slowly restores heights between waves.
- **Screenshot**: /tmp/qa-screenshots/20_craters_should_be_gone.png

---

## Verified Non-Issues

- **Crater entity persistence**: `Crater` entities (`src/crater.js`) correctly fade over 3.5 seconds beginning at 6.5 seconds after creation, and call `this.destroy()` at 10 seconds. Screenshots `12_craters_at_6s` and `13_craters_at_13s` confirm the scorch-mark overlays disappear as expected. The dark patches remaining after 10 seconds are permanent terrain heightmap deformations (see BUG-006), not stuck `Crater` entities.
- **Explosion lifetime**: `Explosion` entities destroy themselves after 2.0s (normal) or 2.8s (mega) as defined in `src/explosion.js`. No stuck explosions were observed.
- **Launcher panel rendering**: All four launcher cards render correctly with correct selection highlight, DESTROYED state, and READY dot. Switching between launchers updates the panel correctly.
- **Wave banner**: The "WAVE N" and "WAVE N CLEAR" banners animate in/hold/fade correctly as seen in screenshots `06_truck_selected` and `07_vulkan_selected`.
- **Vulkan heat bar fill and color**: The heat bar fills correctly and shows the green-to-red color gradient when firing (screenshot `08_vulkan_firing_heat_bar`).
