# Visual QA Report — 2026-04-19 (Verification: Crater Fade Fix)

## Verification Summary

**All three fix criteria: PASS.**

Test run: Wave 1, no player input, screenshots at T+0, T+7s, T+12s, T+17s, T+27s, T+37s.

The crater persistence fix is confirmed working. Dark explosion marks on terrain fade visibly within the 5-second lifetime and disappear completely. No permanent accumulation observed. Launcher-destruction craters appear at terrain surface level, not floating above it.

### Criterion Results

| Criterion | Result |
|-----------|--------|
| Dark marks fade within 5s of last impact | PASS |
| No area has permanently dark marks | PASS |
| After 10s with no new impacts, area is clean | PASS |

### Screenshot Evidence

| File | Timestamp | Observation |
|------|-----------|-------------|
| `/tmp/qa-screenshots/01-start-screen.png` | T-0 | Start screen — cover image centered and sized correctly |
| `/tmp/qa-screenshots/02-gameplay-start.png` | T+0 | Clean terrain, all 4 launchers present, HUD correct |
| `/tmp/qa-screenshots/03-combat-7s.png` | T+7s | HEAT-SK destroyed — dark explosion mark at x~450 visible at surface level (launcher crater positioning fix confirmed) |
| `/tmp/qa-screenshots/04-combat-12s.png` | T+12s | VULKAN destroyed — fresh mark x~970; x~450 mark visibly lighter than T+7s (fade in progress) |
| `/tmp/qa-screenshots/05-active-combat-17s.png` | T+17s | x~450 area nearly clean; right-side marks in mid-fade (consistent with ~5s elapsed since creation) |
| `/tmp/qa-screenshots/06-after-10s.png` | T+27s | All crater marks completely gone — terrain uniform brown with no dark residue |
| `/tmp/qa-screenshots/07-after-20s.png` | T+37s | Terrain remains clean, no marks of any kind |

### Additional Observations

- **Deduplication working**: No area shows excessive darkness from overlapping marks. Each impact site shows a single-opacity mark that fades normally, consistent with the timer-reset deduplication in `spawnCrater()`.
- **Launcher crater surface positioning**: The HEAT-SK destruction crater at T+7s is centered on the terrain surface, not floating above it — confirming the `terrain.getHeightAt()` positioning fix is applied.
- **Wave progression**: By T+17s, SAM, HEAT-SK, and VULKAN are all DESTROYED. Auto-switch to TRUCK launcher functions correctly.

---

# Visual QA Report — 2026-04-19 (Follow-up: BUG A and BUG B deep investigation)

## Summary

Follow-up QA pass targeting two previously-reported unresolved bugs. Full source code audit + Puppeteer session (screenshots at 11s, 16s, 21s, 26s, 36s, 51s intervals). BUG A is confirmed fixed. BUG B is partially fixed with remaining root cause identified.

---

# BUG A — Cover Image Not Centered on Start Screen

**Severity**: Resolved (no longer present)

**Status**: FIXED by previous developer

**Investigation method**: Puppeteer script loaded the page, captured start screen screenshot, and performed in-browser analysis of the actual cover image natural dimensions plus computed draw coordinates.

**Findings**:

The current code in `src/game.js` lines 234–239 correctly centers the image:

```js
const imgW = 2200;
const imgH = Math.round(imgW * img.naturalHeight / img.naturalWidth);
const imgX = (Renderer.LOGICAL_W - imgW) / 2;
const imgY = (Renderer.LOGICAL_H - imgH) / 2;
```

With actual image dimensions (`naturalWidth=1447, naturalHeight=736`):
- Rendered size: 2200 × 1119 logical pixels
- `imgX` = (2560 − 2200) / 2 = **180 logical px** (correct horizontal centering)
- `imgY` = (1440 − 1119) / 2 = **160.5 logical px** (correct vertical centering)
- Image center falls at **(1280, 720)** — exactly the screen center
- `offsetFromCenterX = 0`, `offsetFromCenterY = 0` confirmed by in-browser measurement

The centering math is correct. The bug is resolved. The visual screenshot confirms the image is centered on screen.

**Residual layout note (not a bug)**: The "MISSILE ATTACK" title text is drawn at logical y=1150. The cover image bottom edge is at y=1279.5. This means the title overlaps with the bottom 129.5 logical pixels of the cover image (rendered on top of it). The "Click to start" text at y=1300 appears just below the image. Both texts are clearly readable. This is a layout design choice, not a centering defect.

**Screenshot**: /tmp/qa-screenshots/01-start-screen.png

---

# BUG B — Terrain Explosion Marks Still Persist

**Severity**: High

**Status**: PARTIALLY FIXED — The terrain heightmap recovery is working. Dark marks persist far longer than `CRATER_LIFETIME=10s` due to an unaddressed `Crater` entity accumulation problem that previous fixes did not reach.

**File(s)**: `src/crater.js`, `src/collision.js`, `src/terrain.js`

## What was observed

Screenshots taken at 3s, 11s, 16s, 21s, 26s, 36s, and 51s after game start.

| Time | Screenshot | Observation |
|------|------------|-------------|
| 11s | B02 | First impacts. No large persistent blobs. |
| 16s | B03 | Active explosion visible. Terrain beginning to show marks. |
| 21s | B04 | **Large dark circular blob** at screen x≈430 (logical x≈900, HEAT-SK launcher). Approx 100 screen pixels wide. HUD shows HEAT-SK destroyed. |
| 26s | B05 | **Identical blob** — same size, same opacity. No visible fading. |
| 36s | B06 | **Dark patch still present** at same location. |
| 51s | B07 | **Terrain is clean.** All marks gone. |

The marks persisted continuously from approximately T=21s to somewhere between T=36s and T=51s — a minimum of 15 seconds and possibly up to 30 seconds. A single `Crater` entity with `CRATER_LIFETIME=10s` cannot produce 15–30 seconds of continuous dark marking.

Critically, the **terrain surface** (green grass contour line) appeared **smooth and undepressed** in all post-impact screenshots. There are no visible heightmap depressions. The heightmap recovery is working.

## Root cause

The dark marks are `Crater` entities drawn directly on the canvas (the polygon overlays in `src/crater.js`). They are not a terrain heightmap issue. Previous fixes correctly addressed heightmap recovery but left `Crater` entity accumulation unaddressed.

### How accumulation happens

1. An enemy missile destroys a launcher (e.g., HEAT-SK at x=900). `collision.js` line 209 spawns `new Crater(ix, iy, 3)` — a scale-3 crater at the launcher position. This is a large dark circle.
2. Subsequent enemy missiles that land near x=900 each spawn `new Crater(ex, ey, 1.5)` per `collision.js` line 168.
3. Each `Crater` entity lives for `CRATER_LIFETIME=10s` before calling `this.destroy()`. The entity is then removed by `EntityManager.update()` via the `.filter(e => e.alive)` pass.
4. Wave 1 fires missiles every 2.0 seconds (`missileInterval = max(0.8, 2.0 - 0*0.15) = 2.0s`). Random terrain targeting means some missiles hit the same area repeatedly.
5. Overlapping craters — each individually temporary — create a **continuously dark region** that appears permanent as long as impacts keep occurring there.

### Why the blob looks identical at T=21s and T=26s

The `Crater._alpha()` method returns `1.0` (full opacity) until `CRATER_LIFETIME - CRATER_FADE_DURATION = 10 - 3.5 = 6.5s` before expiry. A crater spawned at T≈21s (when HEAT-SK was destroyed) has `elapsed=5s` at T=26s. `timeLeft = 10 - 5 = 5s > CRATER_FADE_DURATION=3.5s`, so `_alpha()` returns **1.0 — full opacity**. This explains why the blob looks identical: it has not yet entered its fade window.

### Why marks are still visible at T=36s

The scale-3 crater from the launcher destruction at T≈21s would expire at T≈31s. The dark patch at T=36s must be a **different, fresh crater** spawned by a subsequent missile impact after T=26s (which is still within its 10s window at T=36s). This confirms ongoing impacts at overlapping locations.

### Additional positioning defect

In `collision.js`, craters spawned on launcher destruction are placed at `(launcher.x, launcher.y)` where `launcher.y = 1220` (from `LAUNCHER_POSITIONS` in `game.js`). The terrain surface at that x-position is `terrain.getHeightAt(launcher.x) ≈ 1240 + heights[i] ≈ 1240`. The crater polygon is drawn **approximately 20 logical pixels above the terrain surface**, producing a subtle visual float where the dark overlay does not align with the terrain depression below it.

## What the previous fixes DID achieve (confirmed working)

- `_recoverySpeedSlow = 9` u/s runs even during active waves (when `recovering = false`)
- A standard crater (`depth=22`) heals in `22/9 ≈ 2.4s`
- A launcher-destruction crater (`depth=35, radius=80`) heals in `35/9 ≈ 3.9s`
- The `_recoveryRedrawThreshold = 0.5` condition correctly triggers offscreen canvas redraws every frame during recovery (`totalMove ≈ 15 damaged columns × 0.15 u/frame = 2.25 >> 0.5`)
- **The terrain heightmap visually recovers correctly. This portion of the bug is fixed.**

## What is NOT fixed

The `Crater` entity accumulation is the remaining cause of visually persistent dark marks. Individual craters do fade and die correctly. The problem is the continuous rapid spawning of fresh craters at overlapping positions, collectively producing the appearance of a permanently dark area as long as missile impacts continue nearby.

## Screenshots

- /tmp/qa-screenshots/B02-after-11s.png — initial impacts, no large blobs yet
- /tmp/qa-screenshots/B03-after-16s.png — explosion active, terrain starting to show marks
- /tmp/qa-screenshots/B04-after-21s.png — large dark blob visible at HEAT-SK position (launcher just destroyed, scale-3 crater full opacity)
- /tmp/qa-screenshots/B05-after-26s.png — same blob, same size, same opacity (still within full-opacity window at elapsed=5s of 10s lifetime)
- /tmp/qa-screenshots/B06-after-36s.png — dark patch still present (fresh crater spawned by subsequent impact)
- /tmp/qa-screenshots/B07-after-51s.png — terrain fully clean

## Fix recommendations

**Option 1 — Deduplicate craters per area (recommended)**: Before spawning a new `Crater` entity, scan existing craters in the same group for any within a given radius. If one exists, reset its `elapsed` to 0 instead of spawning a new one. This caps darkness to single-crater opacity regardless of impact frequency, while preserving the fade behavior. Relevant file: `src/collision.js` `spawnCrater()` helper.

**Option 2 — Reduce crater lifetime**: `CRATER_LIFETIME = 10s` combined with a `CRATER_FADE_DURATION = 3.5s` means craters stay at full opacity for 6.5s. Reducing `CRATER_LIFETIME` to 5s (or `CRATER_FADE_DURATION` to 1s) would shrink the accumulation window and make individual craters fade faster. Would not fully eliminate stacking but significantly reduces visual duration.

**Option 3 — Fix launcher crater Y coordinate**: In `collision.js` (lines 199, 209 area), when spawning a crater on launcher destruction, replace `launcher.y` with `terrain.getHeightAt(launcher.x)` to align the crater overlay with the actual terrain surface rather than the fixed launcher spawn Y of 1220.

---

## Additional Observations

### Wave 1 completion never observed

All launchers were destroyed within the first 25 seconds of wave 1 in both test runs, triggering `gameover` before wave 1 completed. `terrain.recovering` was never set to `true`. The faster inter-wave recovery rate (`_recoverySpeed = 12 u/s`) was not exercised. This means the full recovery path is untested in these sessions.

### Crater entities drawn in game-world space

`Crater` entities draw via `entities.draw(ctx)` in the game world (with camera shake), not the UI layer. This is correct.

---

*Previous QA report content preserved below.*

---

# Visual QA Report — 2026-04-18 (Updated)

## Summary

3 bugs found. 0 critical, 2 high, 1 medium.

---

## Bugs

### BUG-001: Cover image too small on start screen

- **Severity**: High
- **File(s)**: `src/game.js` lines 234–239
- **Description**: The arcade cabinet cover image renders at a fixed logical width of 900px inside a 2560px-wide logical viewport. This gives the image approximately 35% of the screen width. On the 1280x720 display window the image appears as a roughly 450x270px rectangle — a postage stamp in the upper-centre of a large dark background. The design intent is for the image to dominate the screen like an arcade marquee. It should fill 85–95% of the logical viewport width (approximately 2200–2400 logical pixels). As currently drawn, the bottom edge of the image is forced to Y=560 and it extends upward; at 900px wide with a roughly 4:3 aspect ratio the image is only ~675px tall, leaving 765 logical pixels of dead dark space below the title text.
- **Steps to Reproduce**:
  1. Navigate to `http://localhost:8000`.
  2. Observe the start screen before clicking.
  3. The cover image is visibly small, occupying roughly the central third of the viewport width.
- **Root Cause Hypothesis**: The constant `imgW = 900` on line 235 of `src/game.js` is hard-coded at too small a value. The logical viewport is 2560px wide (`Renderer.LOGICAL_W`). A value of `imgW = 2200` (or `Renderer.LOGICAL_W * 0.86`) would make the image span almost the full width. The vertical anchor `imgY = 560 - imgH` places the bottom at Y=560; with a larger image the top would extend above Y=0 and the anchor would need to shift (e.g. centre vertically around Y=500, or place the image so it fills Y=0 to Y=900 with the title text overlaid at the bottom).
- **Screenshot**: `/tmp/qa-screenshots/A1_start_screen.png`

---

### BUG-002: Terrain crater deformations persist indefinitely during active waves

- **Severity**: High
- **File(s)**: `src/terrain.js` (recovery logic), `src/game.js` (wave callbacks)
- **Description**: After enemy missiles hit the terrain they carve visible craters (depressions in the heightmap that expose the dark brown soil beneath the green grass layer). These dark marks remain visible for the entire duration of Wave 1 — which in the test run lasted 40+ seconds with no player intervention. The terrain shows persistent dark dips at every impact site throughout the test, visible at 23s, 30s, and 40s after the first impact. The `Crater` entity overlay (the polygon scorch mark from `src/crater.js`) correctly fades and destroys itself after 10 seconds, but the underlying heightmap deformation does not recover quickly enough to be visually perceptible.
- **Steps to Reproduce**:
  1. Start the game, do not fire any player missiles.
  2. Wait for Wave 1 enemies to hit the terrain (~6–10 seconds after game start).
  3. Observe dark dips appearing in the terrain surface.
  4. Wait 15–20 seconds after the first impact.
  5. Dark marks in the terrain remain clearly visible; the surface has not returned to its pre-impact shape.
- **Root Cause Hypothesis**: Two compounding issues:

  **Issue A — `recovering` flag stays `false` during active waves.**
  `game.js` sets `this.terrain.recovering = false` on `onWaveStart` (line 89) and only sets it `true` on `onWaveComplete` (line 94). During an active wave the terrain uses `_recoverySpeedSlow = 2` units/second (`terrain.js` line 57). A standard enemy missile hit calls `terrain.damage(ex, ey, 60, 22)`, pushing the peak column down by up to 22 units. At 2 u/s passive recovery that single column takes 11 seconds to recover — but new impacts keep arriving every ~2 seconds in Wave 1, re-damaging already-recovering columns. The net effect is that craters accumulate visually for the entire wave.

  **Issue B — The terrain offscreen cache redraw threshold is too coarse for slow recovery.**
  The passive slow-recovery path accumulates movement in `_slowRecoveryAccum` and only sets `dirty = true` when the accumulator reaches `_recoveryRedrawThreshold * 8 = 4.0` units of total terrain movement (`terrain.js` lines 156–160). Because the slow movement is tiny (~0.033 units per column per frame), this threshold is rarely triggered during combat, so even the small amount of recovery that does occur is not visually flushed to the offscreen canvas regularly.

  The combined effect is that craters carved by terrain damage remain visible as dark brown soil depressions for the full duration of any active wave, far exceeding the 10-second lifetime of the `Crater` overlay entity that is supposed to represent the "permanent" mark.

- **Screenshots**:
  - `/tmp/qa-screenshots/B3_combat_11s.png` — dark craters visible ~5s after first impact
  - `/tmp/qa-screenshots/B4_combat_15s.png` — craters persist, terrain deformation accumulates
  - `/tmp/qa-screenshots/B5_post_combat_23s.png` — dark blobs still clearly visible, 23s from game start
  - `/tmp/qa-screenshots/B6_post_combat_30s.png` — dark blobs persist unchanged at 30s
  - `/tmp/qa-screenshots/B7_post_combat_40s.png` — terrain still visibly deformed at 40s

---

### BUG-003: Wave counter does not advance past Wave 1 in no-input test

- **Severity**: Medium
- **File(s)**: `src/wave.js`, `src/game.js`
- **Description**: Throughout a 40-second unattended session the HUD displays "Wave 1" the entire time. Wave 1 schedules 8 missiles at 2.0s intervals; the last missile spawns at ~14s from wave start. After that, `getEnemyCount()` should return 0 (all missiles have hit terrain or launchers), `_onWaveComplete` should fire, and Wave 2 should begin after a short inter-wave timer. Over 40 seconds the wave counter never increments.
- **Steps to Reproduce**:
  1. Start the game.
  2. Do not fire any player missiles; let all enemies hit the terrain or launchers.
  3. Wait 30–40 seconds.
  4. Observe that the HUD "Wave" counter does not increment beyond 1.
- **Root Cause Hypothesis**: The `wave.js` completion check at line 57 (`if (this.waveEvents.length === 0 && getEnemyCount() === 0)`) may not trigger because the `getEnemyCount()` lambda (`game.js` line 192) calls `this.entities.getGroup('enemy_missiles').length`. If destroyed enemies are not removed from the group atomically within the same frame the condition is evaluated, the count stays above 0 long enough that the condition is never seen as true. Alternatively, `Explosion` or `Crater` entities may be accidentally registered under the `'enemy_missiles'` group key — though the source does not show evidence of this. The exact mechanism needs interactive debugging to confirm; it may also be a test-environment artifact specific to no-player-input runs.
- **Screenshot**: `/tmp/qa-screenshots/B7_post_combat_40s.png` — HUD shows "Wave 1" at 40 seconds

---

## Additional Observations (Not Bugs)

- **Crosshair size and shape**: The SAM crosshair renders as a small traditional crosshair symbol. Size appears appropriate relative to game scale. No defect observed.
- **Launcher panel UI**: The four launcher tabs (SAM, HEAT-SK, TRUCK, VULKAN) render correctly at the bottom with selection highlight and DESTROYED state. No clipping or misalignment.
- **Score and wave text**: Both "Score: 0" and "Wave 1" render legibly in the top-left HUD. No truncation or misalignment.
- **Terrain baseline rendering**: Aside from the persistent crater deformation (BUG-002), the terrain, grass layer, mountain backgrounds, and decorations all render correctly with no visible artifacts.
- **Explosion effects**: In-flight explosion animations (fireball, shockwave ring, debris, sparks) appear correct and do not persist beyond their programmed lifetimes (~2.0s).
- **Launcher sprites**: All four launcher types render at the expected positions along the terrain. The destroyed TRUCK launcher correctly shows the DESTROYED label.
- **Ground scorch in Explosion.draw()**: The dark circular scorch drawn each frame in `explosion.js` lines 568–583 renders directly on the main canvas (not the offscreen terrain cache). It disappears when the Explosion entity is destroyed at 2.0–2.8s. This is correct behavior and does not contribute to the persistent dark marks described in BUG-002.

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
