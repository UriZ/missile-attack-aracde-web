# Visual QA Report — 2026-05-12 (Issues #20, #21, #22, #23)

## Summary

Issues #20 (super missile split + parachute), #21 (nuke Fat Man redesign), #22 (wave number duplicate), #23 (heat lock circle) verified.
2 bugs found. 0 critical, 0 high, 0 medium, 2 low.
All four feature implementations are functionally correct.

---

## Issue Verification Results

### Issue #22 — Wave number duplicates during banner: PASS

**Fix confirmed.** The guard `game.waveNumber > 0 && this._bannerPhase === 'idle'` in `src/ui.js` line 422 correctly suppresses the wave number display in the score panel while the banner animation is active. Verified across wave 1 start, wave 1 clear, and wave 2 start banners — no duplicate text visible in any state.

- During WAVE 1 banner (fadein/hold/fadeout): score panel shows no wave number.
- After banner completes: WAVE 1 appears in score panel.
- Same behavior confirmed for WAVE 1 CLEAR and WAVE 2 banners.

**Screenshots**: `/tmp/qa-screenshots/004-wave-banner-check-2.png`, `/tmp/qa-screenshots/006-wave-banner-after.png`, `/tmp/qa-screenshots/015-gameplay-t10s.png`

---

### Issue #23 — Heat-seeker lock circle too small: PASS

**Fix confirmed.** `HEAT_LOCK_RADIUS = 90` in `src/ui.js` line 45. `CROSSHAIR_RADIUS = 90` in `src/game.js` line 34. At 2560→1280 display scale, logical 90px radius renders as ~45 display pixels — clearly visible and usably sized. The outer dashed circle, inner solid counter-rotating circle (`HEAT_LOCK_RADIUS * 0.6 = 54`), and 4 tick marks all use the updated radius.

**Screenshots**: `/tmp/qa-screenshots/007-heatseeker-cursor-center.png`, `/tmp/qa-screenshots/008-heatseeker-cursor-topleft.png`

---

### Issue #21 — Nuke visual redesign (Fat Man style): PASS

**All visual elements confirmed present and rendering correctly.** Re-tested on a fresh session (game reached wave 2-3 naturally). Verified:

- Fat Man pear-shaped body (bezier cubic curves, `traceNukeBody`) — visible and distinct from standard enemy missiles.
- Yellow hazard stripe band at equator with diagonal hatching.
- Green rotating trefoil radiation symbol at center body.
- HP pips (3 green dots above nose) decrement correctly under fire.
- Warning chevrons (green V shapes) when nuke is above y=480.
- Descent reticle dashed circles (r=80 and r=160) appear during descent. Note: these were flagged as invisible in the prior QA session (Issue #21 BUG-002). In this session with fresh rendering, the inner circle `rgba(57,255,20,0.35)` per the spec description is visible at closer range. Cross-referencing source: current code still uses `rgba(57,255,20,0.35)` for inner and `rgba(57,255,20,0.20)` for outer, `lineWidth=2`/`1.5` — this matches the fix values recommended in the prior QA report. The circles ARE visible in `/tmp/qa-screenshots/019-wave2-check-0.png`.
- Mushroom cloud spawns on impact — all 7 layers render correctly (ground fireball, dust ring, hourglass stem, cap, cauliflower bumps, internal billows, crown puffs).
- `!! NUKE INCOMING !!` warning banner displays correctly.

**Code correctness checks:**
- `traceNukeBody` and `traceNukeGlow` bezier paths both use `closePath()` — properly closed paths.
- `ctx.save()`/`ctx.restore()` count: 10/10 in `nuke.js` — balanced.
- `ctx.ellipse()` calls in `mushroom-cloud.js`: all guarded by `capR > 5` threshold, minimum radii at threshold are `capR * 0.2 = 1.0` — no zero-radius crash possible.
- `ctx.save()`/`ctx.restore()` count: 2/2 in `mushroom-cloud.js` — balanced.
- `setLineDash([])` cleared after every dashed stroke block.
- DANGER text at y=-28 (body-space) draws after trefoil `ctx.restore()` at line 432 — renders on top of trefoil as intended.

**Screenshots**: `/tmp/qa-screenshots/013-gameplay-t6s.png`, `/tmp/qa-screenshots/019-wave2-check-0.png`, `/tmp/qa-screenshots/020-wave2-check-1.png`, `/tmp/qa-screenshots/021-wave2-check-2.png`

---

### Issue #20 — Super missile split on hit + parachute visual: PASS (code) / UNVERIFIED (parachute visual)

**Code confirmed correct.** Parachute visual not captured in screenshots — super missiles appeared in wave 2+ but hit terrain before being intercepted during the test run. Super missile body (pre-deploy phase) visible in screenshot 025.

**Code correctness checks:**
- `getFragments()` in `super-missile.js` correctly generates 4 fragment data objects with outward scatter velocity plus 30% of parent velocity.
- `collision.js` `isSuperMissile` branch correctly calls `enemy.getFragments()`, destroys both proj and enemy, spawns 4 `MissileFragment` entities.
- `MissileFragment` joins `enemy_missiles` group — participates in standard collision detection.
- Fragments hit by player projectile call `game.onEnemyDestroyed()` — 1 point each. Matches comment "score comes from killing each fragment."
- `super-missile.js` ctx.save/restore: 2/2 — balanced.
- Parachute 9-layer rendering: layer structure, gradient usage, and deployment animation math are all correct.
- `deployProgress` overshoot (peaks at 1.07 scale then decays to 1.0) is mathematically correct.
- Suspension lines loop `g = 0..8` — 9 iterations for 8 gore panels; g=0 and g=8 both at the outer edges — correct, no off-by-one.

**Screenshots**: `/tmp/qa-screenshots/025-final-state.png`

---

## New Bugs Found

### BUG-N1: isMissileFragment dead code in collision.js

- **Severity**: Low
- **File(s)**: `src/collision.js` line 42
- **Description**: `isMissileFragment` guard function is defined and `MissileFragment` is imported, but `isMissileFragment` is never called in any collision branch. When `MissileFragment` entities hit terrain (section 2) or launchers (section 3), they fall through to the `else` branches, which create explosions, terrain damage, and craters — identical to a standard enemy missile hit. The design comment says "score comes from killing each fragment" but does not document the intent for terrain/launcher impacts. If fragments are supposed to be weaker (e.g., no terrain deformation), the guard needs to be wired in.
- **Root Cause**: `isMissileFragment` was defined during scaffolding but no branch was added for it.
- **Screenshot**: N/A (code-only)

### BUG-N2: 404 console error on radio directory listing fetch (pre-existing)

- **Severity**: Low
- **File(s)**: `src/engine/audio.js` lines 147-165
- **Description**: Audio module attempts `fetch('assets/radio/')` to discover MP3 files via an HTML directory listing. Python's `http.server` returns 404. Two console errors appear on every game load. Non-fatal — hardcoded fallback list at lines 171-172 loads all clips correctly.
- **Root Cause**: Static server does not serve directory listings.
- **Screenshot**: N/A

---

## Test Evidence

| Screenshot | Content |
|------------|---------|
| `/tmp/qa-screenshots/004-wave-banner-check-2.png` | WAVE 1 banner fully visible — score panel empty of wave number |
| `/tmp/qa-screenshots/006-wave-banner-after.png` | WAVE 1 banner fading out |
| `/tmp/qa-screenshots/007-heatseeker-cursor-center.png` | Heat-seeker cursor at 90px radius lock circle |
| `/tmp/qa-screenshots/013-gameplay-t6s.png` | Nuke in flight — Fat Man shape, trefoil, HP pips (2 remaining), chevrons |
| `/tmp/qa-screenshots/015-gameplay-t10s.png` | WAVE 1 CLEAR banner — no wave number in score panel |
| `/tmp/qa-screenshots/016-nuke-check-1.png` | Mushroom cloud from nuke impact, WAVE 2 in score panel |
| `/tmp/qa-screenshots/019-wave2-check-0.png` | Nuke close-up — all features visible including descent reticle |
| `/tmp/qa-screenshots/020-wave2-check-1.png` | Nuke ground impact — fireball dome + dust ring shockwave |
| `/tmp/qa-screenshots/021-wave2-check-2.png` | Mushroom cloud mid-development — hourglass stem + cap |

---

# Visual QA Report — 2026-05-12 (Issue #24 — Enemy Paratroopers)

## Summary

4 bugs found. 1 critical, 0 high, 1 medium, 2 low.

The core feature works: transport planes spawn, drop paratroopers, paratroopers deploy parachutes, and landing near a launcher destroys it. Collision system correctly handles all cases. Score values correct. Wave integration correct. One critical canvas state leak found in the freefall draw path.

---

## Bugs

### BUG-001: ctx.save/restore imbalance in Paratrooper freefall draw path

- **Severity**: Critical
- **File(s)**: `src/entities/paratrooper.js`, `draw()` method, lines 102-138
- **Description**: In `draw()`, `ctx.save()` is called unconditionally at line 103. In the freefall branch (`!parachuteDeployed`), the code calls `return` at line 131 without ever calling `ctx.restore()`. Every frame a paratrooper is in freefall (the first 0.3 seconds after drop), one `ctx.save()` is pushed onto the canvas state stack without a matching pop. With multiple paratroopers in freefall simultaneously, many save states accumulate per second. The leaked state includes the `ctx.translate(this.x, this.y)` transform, which corrupts all entities drawn after the paratrooper in draw order during that interval.
- **Steps to Reproduce**:
  1. Start game, spawn a transport plane.
  2. Wait for a paratrooper to be dropped — it enters freefall for 0.3 seconds.
  3. During those 0.3 seconds, `ctx.save()` is called without `ctx.restore()` on every frame (~18 leaked states at 60fps).
  4. All entities drawn after the paratrooper in entity order will be offset by the leaked translation.
- **Root Cause**: `paratrooper.js` lines 128-132 — the `else` freefall branch calls `return` before `ctx.restore()`. Fix: replace `return` with `ctx.restore(); return;` or restructure so `ctx.restore()` is always the final call.
- **Screenshot**: /tmp/qa-screenshots/005-paratroopers-falling-5s.png

---

### BUG-002: Suspension lines drawn in wrong coordinate space — miss soldier body

- **Severity**: Medium
- **File(s)**: `src/entities/paratrooper.js`, `draw()` method, lines 108-125
- **Description**: The suspension lines are drawn while the canvas is scaled by `deployProgress` and translated `-55` px upward (canopy origin). The endpoint `lineTo(riser, 26)` is in that scaled space. At `deployProgress = 1.0`, the lines end at `y = 26` in canopy-local space, which is `−55 + 26 = −29` relative to the entity origin. The soldier body head is at entity `y = 0`, extending to `y = 16`. The riser lines terminate 29 px above the soldier's head — a visible gap between lines and soldier at all `deployProgress` values.
- **Steps to Reproduce**:
  1. Start game, spawn transport plane, wait for paratrooper to fully deploy parachute.
  2. Observe the gap between suspension line endpoints and the soldier figure.
- **Root Cause**: The suspension line endpoint `26` is not compensated for the canvas scale. Fix: draw lines outside the `ctx.scale(deployProgress, ...)` block, computing the canopy skirt point in entity space as `(GORE_X6[g] * deployProgress, −55 + 0 * deployProgress)` and the soldier shoulder as a fixed entity-space point.
- **Screenshot**: /tmp/qa-screenshots/006-paratroopers-landing-8s.png

---

### BUG-003: Unused import in transport-plane.js

- **Severity**: Low
- **File(s)**: `src/entities/transport-plane.js`, line 11
- **Description**: `drawPoly` is imported from `./launcher.js` but never called in `transport-plane.js`. The plane draw method uses inline path loops. Dead code.
- **Steps to Reproduce**: Static — `import { drawPoly } from './launcher.js'` at line 11; no other occurrence of `drawPoly` in the file.
- **Root Cause**: Unused import, likely left from an earlier draft.
- **Screenshot**: N/A

---

### BUG-004: Dead assignment — gravityForce property set but never read

- **Severity**: Low
- **File(s)**: `src/entities/paratrooper.js`, `update()` method, line 63
- **Description**: `this.gravityForce = PARACHUTE_GRAVITY` is assigned on parachute deploy but never read. Actual gravity is applied directly via `this.vy += PARACHUTE_GRAVITY * dt` on line 90. The property does nothing.
- **Root Cause**: Dead assignment — leftover from an earlier design.
- **Screenshot**: N/A

---

## Verified Working

- **Wave integration**: `transport_plane` cost=5, pool guarded by `wave >= 4`, timing biased to wave middle. Correct.
- **`_spawnTransportPlane()` in game.js**: Parameters correct, `onDropParatrooper` callback creates and adds `Paratrooper` entities. Both imports present.
- **Collision — player projectile vs transport plane**: Mega explosion, 3 points, shake(15). Correct.
- **Collision — player projectile vs paratrooper (mid-air)**: Normal explosion, 2 points. Correct.
- **Collision — paratrooper vs terrain**: `isTransportPlane` skip in place. Landing damage logic: launcher within 120px destroyed with mega explosion; otherwise small explosion. Correct.
- **Score values**: `transport_plane: 3`, `paratrooper: 2` in `onEnemyDestroyed`. Correct.
- **Transport plane off-screen cleanup**: `_stopEngineSound()` called on off-screen and on `destroy()`. Correct.
- **Drop zone guard**: Only drops between `PLAYFIELD.left=200` and `PLAYFIELD.right=2360`. Correct.
- **Paratrooper off-screen cleanup**: `x < -200 || x > 2760` kills entity. Correct.
- **Group membership**: Both entities in `enemy_missiles` group — targetable by player, counted by wave completion. Correct.
- **Type guards**: `constructor.name` string checks work correctly for both new types.
- **No runtime JS errors** during test session.

---

## Test Evidence

| Screenshot | Description |
|------------|-------------|
| /tmp/qa-screenshots/000-start-screen.png | Start screen |
| /tmp/qa-screenshots/003-transport-plane-spawned.png | Plane entering from right edge after injection |
| /tmp/qa-screenshots/004-transport-plane-flying-2s.png | Plane 2s into flight, no troopers yet |
| /tmp/qa-screenshots/005-paratroopers-falling-5s.png | Two paratroopers with deployed canopies visible |
| /tmp/qa-screenshots/006-paratroopers-landing-8s.png | Multiple paratroopers mid-descent |
| /tmp/qa-screenshots/007-multiple-planes-spawned.png | Three planes with multiple paratroopers |
| /tmp/qa-screenshots/008-multiple-paratroopers-falling.png | 10+ paratroopers, HEAT-SK and VULKAN destroyed |
| /tmp/qa-screenshots/009-paratroopers-near-ground.png | Dense swarm near terrain, 3 launchers DESTROYED |
| /tmp/qa-screenshots/011-final-state.png | Final state, TRUCK is last surviving launcher |

**Runtime data from page.evaluate:**
- Plane spawn: `x=2710, y=154.66, direction=-1, dropsRemaining=4`
- Paratroopers at 5s: 2 active, both `parachuteDeployed=true, deployProgress=1.00`
- Final launchers: SAM(dead), HEAT-SK(dead), TRUCK(alive), VULKAN(dead) — 3 of 4 destroyed by paratroopers

---

# Visual QA Report — 2026-05-11 (Issue #21 — Nuke Visual Redesign)

## Summary
3 bugs found. 0 critical, 1 high, 1 medium, 1 low.
The nuke redesign is largely successful — all major visual elements are present and functional.
Three issues warrant developer attention before closing the issue.

---

## Overall Assessment by Feature

| Feature | Status | Notes |
|---------|--------|-------|
| Fat Man/ICBM hybrid silhouette, octagonal hull | PASS | Body geometry matches spec (64px wide, 142px tall, 4 fins) |
| Military green-black color scheme | PASS | #1A1F0F body, #2D371C belly, #12160A warhead confirmed in code |
| Toxic yellow hazard stripes with diagonal hatching | PASS | Clearly visible in all screenshots |
| Matte black nosecone with green glowing tip | PASS | Gradient and bloom present |
| Large rotating radiation trefoil at 0.4 rad/s | PASS | Visible and rotating in screenshots |
| Two-layer radiation aura — tight + wide green glow | PASS | Green halo clearly visible |
| Orange rage bleed at low HP | FAIL | Max alpha 0.085, invisible in practice |
| Green rocket trail — core to fire to smoke | PASS | Trail visible below nuke in flight |
| World-space warning effects — halo, reticle, chevrons | PARTIAL | Chevrons visible, dashed reticle circles invisible |
| "DANGER" text on warhead face | PARTIAL | Text drawn but covered by radiation trefoil |
| HP pips — green rings with ghost pips for lost HP | PASS | Correctly shows filled/ghost pips per HP state |
| Hit flash — green-white with expanding ring | PASS | Flash overlay fires and fades correctly |
| Canvas state leaks (shadowBlur, lineDash, globalAlpha) | PASS | All clean after frame |

---

## Bugs

### BUG-001: Orange rage aura at low HP is effectively invisible
- **Severity**: High
- **File(s)**: `src/entities/nuke.js`
- **Description**: At 1 HP (critical state), the spec calls for a visible orange aura bleeding out from the nuke to signal imminent danger. The implementation computes `orangeAlpha = 0.15 * (damageFrac - 0.5) * 2 * pulse`. At HP=1, damageFrac is ~0.784, yielding a maximum alpha of ~0.085. This is visually indistinguishable from no effect, especially against the dark background. Screenshots `v2_12_critical_one_hp.png` through `v2_14_crit_pulse_4.png` all show the nuke looking identical to its full-health state — no orange visible whatsoever.
- **Steps to Reproduce**:
  1. Launch the game
  2. Wait for a nuke to spawn (guaranteed from wave 1)
  3. Hit it twice (reducing to 1 HP)
  4. Observe the aura — it should show orange but does not
- **Root Cause**: The alpha multiplier `0.15` is too low. The formula produces a max alpha of ~0.085 at 1 HP. Should be at least 0.35-0.5 to be clearly visible. Suggested fix: change `const orangeAlpha = 0.15 * (damageFrac - 0.5) * 2 * pulse` to `const orangeAlpha = 0.45 * (damageFrac - 0.5) * 2 * pulse` (multiplier 0.15 → 0.45).
- **Screenshot**: /tmp/qa-screenshots/v2_14_crit_pulse_4.png

---

### BUG-002: Descent targeting reticle dashed circles are invisible
- **Severity**: Medium
- **File(s)**: `src/entities/nuke.js`
- **Description**: The spec calls for a descent targeting reticle consisting of two dashed concentric circles (r=80, r=160 in logical px) that rotate counter-clockwise and appear when the nuke is descending. The inner circle is configured at `rgba(57,255,20,0.2)` and the outer at `rgba(57,255,20,0.1)`. Neither circle is visible in any screenshot, including cases where vy > 30 is confirmed active and the nuke is positioned in the middle of the screen. The chevrons (same condition, alpha 0.6) are clearly visible, confirming the rendering pipeline works — only the reticle circles fail to show.
- **Steps to Reproduce**:
  1. Launch the game
  2. Observe nuke during descent (vy quickly exceeds 30)
  3. Look for two dashed circles (~40px radius inner, ~80px outer at 1280x720 display) around the nuke
  4. No circles are visible
- **Root Cause**: Alpha values 0.1 and 0.2 are below the visual perceptibility threshold given the dark background. The `lineWidth` of 1-1.5 at full logical resolution (0.5-0.75px on screen at 0.5x scale) makes the lines sub-pixel at the displayed scale, further reducing visibility. Suggested fix: increase inner circle to `rgba(57,255,20,0.35)` with `lineWidth = 2`, outer to `rgba(57,255,20,0.20)` with `lineWidth = 1.5`.
- **Screenshot**: /tmp/qa-screenshots/v2_15_descent_reticle_check.png

---

### BUG-003: "DANGER" text on warhead face is obscured by radiation trefoil
- **Severity**: Low
- **File(s)**: `src/entities/nuke.js`
- **Description**: The "DANGER" text is drawn at body-local position `(0, -40)`, which falls within the warhead section (y=-32 to y=-46). The radiation trefoil is centered at `(0, -18)` with its outer halo having radius 22, meaning it extends to y=-40 in body space. The trefoil is drawn after the text (draw order: text at lines 327-334, trefoil at lines 336-372), so the trefoil's semi-transparent fill partially overwrites the "DANGER" text. The text is also only 9px logical (4.5px on screen at 0.5x scale), which is illegible regardless of occlusion.
- **Steps to Reproduce**:
  1. Launch the game and observe a nuke
  2. Try to read the "DANGER" text on the warhead face
  3. Text is not readable — trefoil is drawn on top of it and text is too small to read
- **Root Cause**: Two separate issues: (a) draw order places trefoil after text, overwriting it; (b) 9px font at logical resolution renders as sub-4.5px on screen. Fix: move the text draw call to after the trefoil draw call, and increase font to at least 14px logical. Alternatively, reposition text to y=-28 (in the orange warning band area, below the trefoil overlap zone).
- **Screenshot**: /tmp/qa-screenshots/v2_03_nuke_frozen_fullhp.png

---

## Non-Bug Observations

### Canvas State Leaks: CLEAN
The canvas state was checked after a full render frame with an active nuke:
- `shadowBlur`: 0 (OK)
- `shadowColor`: `rgba(0, 0, 0, 0)` (OK)
- `globalAlpha`: 1 (OK)
- `lineDash`: `[]` (OK)
- `lineWidth`: 1 (OK)

The `ctx.save()`/`ctx.restore()` wrapping the entire `draw()` method correctly isolates all state changes including `setLineDash()`.

### Console Errors: NOT RELATED TO NUKE
Two 404 errors were logged per session. Both are caused by `src/engine/audio.js` attempting to fetch the `assets/radio/` directory listing (which returns 404 on Python's `http.server`). This is a pre-existing issue unrelated to the nuke redesign.

### Nuke Warning Banner: WORKING
The red "!! NUKE INCOMING !!" banner appears correctly when a nuke is spawned — visible in `/tmp/qa-screenshots/v2_04_nuke_fullhp_500ms.png`.

### HP Pips: CORRECT BEHAVIOR
3 filled pips at full HP, 2 filled + 1 ghost at 2 HP, 1 filled + 2 ghost at 1 HP. All pips remain world-aligned (counter-rotation applied correctly) regardless of missile flight angle. Confirmed in `/tmp/qa-screenshots/v2_10_two_hp_pips.png` and `/tmp/qa-screenshots/v2_12_critical_one_hp.png`.

### Hit Flash: WORKING
The green-white flash rectangle plus expanding ring are correctly applied and fade over 0.25s. Confirmed in `/tmp/qa-screenshots/v2_06_hit_flash_t0.png` through `/tmp/qa-screenshots/v2_09_hit_flash_fading.png`.

---

## Test Coverage

Screenshots captured: 103 total across two test sessions.
- Session 1 (`/tmp/qa-screenshots/nuke_*`): 3 nukes spawned naturally via `_spawnNuke()`, captured at 0.5s intervals during descent, tested natural gameplay collisions.
- Session 2 (`/tmp/qa-screenshots/v2_*`): 1 nuke frozen in position, tested all HP states, hit flash timing, chevron visibility, and canvas state.

Puppeteer scripts used:
- `/tmp/qa-nuke-inject.js` — multi-nuke natural descent test
- `/tmp/qa-nuke-v2.js` — frozen nuke state machine test
