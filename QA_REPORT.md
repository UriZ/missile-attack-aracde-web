# Visual QA Report — 2026-05-12 (Issue #22 Re-verification — Wave Banner Duplicate)

## Summary

1 pass, 0 bugs found. Issue #22 is confirmed fixed. Wave banner duplication does not occur.

---

## Issue #22 Verification — Wave Number Duplicates During Banner

**Result: PASS — Bug is fixed, no duplication observed.**

### Code Analysis

The fix works through a guard in `_drawScorePanel` (`src/ui.js` line 422):

```js
if (game.waveNumber > 0 && this._bannerPhase === 'idle') {
    ctx.fillText(`WAVE ${game.waveNumber}`, ...);
}
```

This suppresses the panel's "WAVE N" text in ALL non-idle banner phases: `fadein`, `hold`, and `fadeout`. No duplicate wave text can appear during any stage of the banner animation.

### Timing Safety Analysis

A potential race condition was investigated: could the "WAVE N CLEAR" banner still be visible when the next "WAVE N+1" banner starts?

- Wave clear banner total duration: BANNER_FADE_IN (0.35s) + BANNER_HOLD (1.80s) + BANNER_FADE_OUT (0.45s) = **2.60s**
- Between-wave timer: **3.0s**
- Gap: 3.0 - 2.60 = **0.40s**

The "WAVE N CLEAR" banner completes with 0.4 seconds to spare before the next wave fires. The two banners cannot overlap. `showWaveBanner()` is a single-instance state machine — it overwrites `_bannerText` and resets the phase when called, so even if the timing were close, only one banner text can be active at a time.

### Redundant waveNumber Write — Non-Bug

`game.js` line 204 assigns `this.waveNumber = this.waves.getCurrentWave()` after every `waves.update()` call. This duplicates the assignment already made in the `onWaveStart` callback (line 93). Both produce the same value — no mismatch occurs. Harmless.

### Screenshot Evidence

- `/tmp/qa-screenshots/009_wave_1_start.png`: "WAVE 1" in top-left panel visible; no centered banner (banner had already completed before this screenshot, nuke warning showing).
- `/tmp/qa-screenshots/014_gameplay_t11s.png`: "WAVE 1 CLEAR" banner fading in — score panel has NO wave number. Suppression confirmed.
- `/tmp/qa-screenshots/015_final_state.png`: "WAVE 1 CLEAR" banner in hold phase — score panel still empty. Suppression sustained.

### Additional Observations (Not Bugs)

1. **Nuke warning suppresses wave banner rendering**: When a nuke spawns during the wave start banner, `drawWaveBanner` skips rendering while the nuke warning is active (`src/ui.js` line 201). The state machine still ticks. Under heavy nuke pressure, players can miss the "WAVE N" banner entirely. Design decision — no bug filed.

2. **Banner backdrop partially obscured by mushroom cloud**: In screenshots 014 and 015, a large mushroom cloud overlaps the left portion of the banner backdrop. Text remains centered and readable. Z-ordering is expected (game entities draw before UI). No bug.

---

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

### Issue #23 — Heat-seeker lock circle too small: PASS (Re-verified 2026-05-12)

**Fix confirmed on re-verification.** Two separate QA runs were executed with the heat-seeker launcher selected (`--launcher 2`) to independently confirm the prior PASS verdict.

**Code state verified:**
- `HEAT_LOCK_RADIUS = 90` at `src/ui.js` line 45 (was 50 per original bug report)
- `CROSSHAIR_RADIUS = 90` at `src/game.js` line 34 (was 50 per original bug report)

**Visual verification:**
At the Puppeteer viewport of 1280x720 (0.5x the 2560x1440 logical resolution), a logical radius of 90px renders as approximately 45 screen pixels. The dashed outer lock circle is clearly visible against the dark background. The inner counter-rotating solid circle (`HEAT_LOCK_RADIUS * 0.6 = 54` logical, ~27px screen) is also clearly visible. All 4 tick marks at N/S/E/W of the outer circle are rendered correctly.

**Functional verification:**
Screenshot `/tmp/qa-screenshots/012_gameplay_t6s.png` captured an enemy missile near the perimeter of the lock circle, confirming the visual circle accurately represents the lock detection zone. The detection range (`CROSSHAIR_RADIUS = 90`) and the visual circle (`HEAT_LOCK_RADIUS = 90`) are identical — no discrepancy between visual indicator and actual game mechanic.

**No regressions detected.** The locked-on state (dramatic pulsing circle, acquisition flash, spark particles, dashed line to target) was not captured in this run due to Puppeteer cursor behavior, but all rendering code paths were confirmed present and correct by code review.

**Screenshots**: `/tmp/qa-screenshots/003_launcher_2.png`, `/tmp/qa-screenshots/006_launcher_2_fired.png`, `/tmp/qa-screenshots/012_gameplay_t6s.png`

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

# Visual QA Report — 2026-05-12 (Issue #24 — Enemy Paratroopers) [PASS 3]

## Summary

4 bugs found. 0 critical, 2 high, 1 medium, 1 low.

This is the third QA pass on issue #24. The codebase has been updated since the prior pass — `this.gravityForce` dead assignment (prior BUG-004) is confirmed removed/fixed. Two prior "bugs" (BUG-001 save/restore imbalance, BUG-003 unused import) remain retracted as false positives.

New high-severity bug found this pass: grounded paratroopers trigger the generic enemy_missiles vs launchers circle collision before their attack state machine runs, bypassing the fuse/explosion animation entirely (BUG-001 this pass).

Prior confirmed bugs that remain in current code: BUG-002 (suspension lines gap — medium), BUG-003 (globalAlpha manual reset — low), BUG-004-PASS3 (wave spawn threshold — high, was first reported in prior pass as BUG-001, confirmed still present).

Feature overall: transport planes spawn, drop paratroopers, parachutes deploy, soldiers run toward launchers and destroy them. The mechanic works but the intended visual attack sequence (crouch + fuse animation + mega explosion) is bypassed by a collision system gap.

---

## New Bugs Found This Pass

### BUG-001 (PASS 3): Grounded paratrooper triggers generic launcher collision before attack state fires

- **Severity**: High
- **File(s)**: `src/collision.js` section 3 (lines 291-382), `src/entities/paratrooper.js` constants `ATTACK_RANGE`, `SOLDIER_GROUND_RADIUS`
- **Description**: Once a paratrooper lands, its `collisionRadius` is set to `SOLDIER_GROUND_RADIUS = 12`. The launcher's effective collision radius in `collision.js` is `launcherRadius = 50` (fallback, since launchers do not set `collisionRadius`). Combined, `sumR = 62px`. The paratrooper's attack state machine transitions to ATTACKING at `ATTACK_RANGE = 35px` horizontal distance. Since both entities are at terrain level (dy ≈ 0), the collision fires at `dx < 62px` — well before the trooper reaches `dx = 35px`. The collision falls through to the generic `else` branch (lines 369-378), which calls `enemy.destroy()` and `launcher.destroy()` and spawns a standard mega explosion with terrain damage and screen shake — no fuse animation, no crouch animation, no pulsing indicator. The attack state machine (`_updateAttacking`) never executes. The paratrooper visually disappears (via `enemy.destroy()`) before it can crouch and plant the explosive. The entire intended attack sequence is bypassed.
- **Steps to Reproduce**:
  1. Start game, inject `game._spawnTransportPlane()`.
  2. Let a paratrooper land and start running toward a launcher.
  3. When the paratrooper is within ~62px of a launcher, it will disappear and the launcher will be destroyed — but without the crouch/fuse animation described in the spec.
- **Root Cause**: Section 3 in `collision.js` lacks an `isParatrooper` guard (analogous to the `isTransportPlane` guard in section 2). Fix: add `if (isParatrooper(enemy)) continue;` at the start of the section 3 inner loop (or outer loop) to skip paratroopers, letting their own state machine handle launcher destruction.
- **Screenshot**: N/A (code-only analysis)

---

## Correction of Prior QA Session Errors

### PRIOR BUG-001 RETRACTED: ctx.save/restore imbalance — FALSE POSITIVE

The prior QA session claimed the freefall draw path leaked `ctx.save()` without a matching `ctx.restore()`. This is incorrect. Reading `paratrooper.js` lines 128-133:

```
} else {
  // Freefall — show soldier tumbling without chute
  this._drawSoldierBody(ctx, 0, 0, this.freefallTimer * 4.0);
  ctx.restore();   // <-- line 131: restore IS called
  return;          // <-- line 132: return AFTER restore
}
```

`ctx.restore()` at line 131 precedes `return` at line 132. The save/restore is balanced in all code paths. No canvas state leak exists in this method.

### PRIOR BUG-003 RETRACTED: Unused import in transport-plane.js — FALSE POSITIVE

The prior QA session claimed `drawPoly` was imported from `./launcher.js` at line 11 of `transport-plane.js`. Searching the actual file: no such import exists. `transport-plane.js` imports only `Entity` from `./entity.js` and `randf` from `../utils.js`. The bug description was fabricated.

---

## Prior-Session Bugs (Confirmed Status)

### BUG-002 (PASS 2, still present): Suspension lines terminate 29px above soldier's head — visible gap

- **Severity**: Medium
- **File(s)**: `src/entities/paratrooper.js`, `_drawParachutingTrooper()`, lines 373-396
- **Current code location**: Lines 380-390 draw suspension lines inside the `ctx.save()` block that applies `ctx.translate(0, -55)` and `ctx.scale(deployProgress, deployProgress)`.
- **Description**: At `deployProgress = 1.0`, the line endpoint `lineTo(riser, 26)` in canopy-local space maps to entity-space y = -55 + 26 = -29. The soldier head is at entity-space y = -6 to -1. The riser endpoints terminate ~23px above the soldier's head — a clearly visible gap. During deployment animation (deployProgress < 1), the gap changes continuously, making the lines appear to float disconnected. Fix: draw suspension lines outside the canopy `ctx.save/restore` block in entity space, with skirt X = `GORE_X6[g] * deployProgress` at y = -55, and riser anchor at `(riser, -6)` in entity space.
- **Screenshot**: N/A (fresh Bash unavailable; confirmed by coordinate analysis)

---

### BUG-003 (PASS 2, still present): globalAlpha manual reset without save/restore in _drawCanopy

- **Severity**: Low
- **File(s)**: `src/entities/paratrooper.js`, `_drawCanopy()`, lines 415-417
- **Description**: `ctx.globalAlpha = 0.95` set then `ctx.globalAlpha = 1.0` manually reset without `ctx.save()/ctx.restore()` wrapping. Functionally safe now but violates project convention and fragile to future edits. Fix: wrap the Layer 1 canopy base block in `ctx.save()/ctx.restore()`.
- **Screenshot**: N/A (code-only)

---

### BUG-004 (PASS 2, confirmed FIXED): Dead assignment — gravityForce property — RESOLVED

- `this.gravityForce` no longer exists in `paratrooper.js`. Fixed since prior QA pass. Closed.

---

### BUG-005 (wave spawn threshold, still present): Transport plane spawns from wave 1 — spec requires wave 4

- **Severity**: High
- **File(s)**: `src/wave.js`, line 96
- **Description**: Current code at line 96: `if (wave >= 1) pool.push('transport_plane')`. Prior QA report incorrectly stated `wave >= 2` — the actual code has always been `wave >= 1`. Transport planes (and their paratroopers) can spawn in wave 1, the very first wave, well before the spec's intended wave 4 introduction. This is more severe than the prior report indicated.
- **Root Cause**: Wrong threshold. Fix: `if (wave >= 4) pool.push('transport_plane')`.
- **Screenshot**: N/A (code-only)

---

## Verified Working

- **`_spawnTransportPlane()` in game.js**: Parameters correct (`fromLeft`, `yPos = randf(100, 250)`, `maxDrops = randf(3, 6)`). `onDropParatrooper` callback correctly creates and adds `Paratrooper` entities. Both `TransportPlane` and `Paratrooper` imported at game.js lines 22-23.
- **onDetonate wiring**: `trooper.onDetonate` correctly wired in `game.js` lines 588-599. Callback spawns `Explosion(px, py, true)` (mega), `Crater(px, craterY, 2)`, calls `terrain.damage(px, py, 70, 25)` and `shakeScreen(20)`. Correct.
- **Collision — player projectile vs transport plane**: `isTransportPlane` branch in `collision.js`: mega explosion at plane coords, `onEnemyDestroyed('transport_plane')` for 3 points, `shakeScreen(15)`. Correct per spec.
- **Collision — player projectile vs paratrooper (mid-air)**: `isParatrooper` branch: normal explosion at midpoint, `onEnemyDestroyed('paratrooper')` for 2 points. Correct per spec.
- **Collision — paratrooper vs terrain (section 2)**: Correctly SKIPPED via `if (isParatrooper(enemy)) continue;` at `collision.js` line 236. Paratrooper landing is handled by the `_land()` state machine, not the collision system.
- **Paratrooper attack state machine (state machine logic only)**: `_updateAttacking` correctly calls `onDetonate(x, y)`, then `_runTarget.destroy()` with alive guard, then `this.alive = false`. Logic is correct in isolation. However see BUG-001 — this state is never reached due to the collision system intercepting the trooper first.
- **Paratrooper idle path**: `_updateIdle` despawns after `IDLE_DESPAWN_DELAY = 1.5s` if no targets. Correct.
- **Retargeting**: `_findTarget()` skips `launcher.alive === false` launchers correctly. `_updateRunning` calls `_findTarget()` when current target dies.
- **Score values**: `onEnemyDestroyed` points map: `transport_plane: 3`, `paratrooper: 2`. Correct per spec.
- **Transport plane off-screen cleanup**: `_stopEngineSound()` called at both off-screen boundary and on `destroy()`. No sound leak possible.
- **Drop zone guard**: `this.x >= PLAYFIELD.left && this.x <= PLAYFIELD.right` (200-2360) ensures no drops happen off-screen. Correct.
- **Initial drop timer randomization**: `dropTimer = randf(0.8, 1.5)` prevents simultaneous drops. Correct.
- **Paratrooper freefall → parachute state machine**: `freefallTimer` increments for `FREEFALL_DURATION = 0.3s`, then state → `parachute`, `deployProgress` ramps 0 → 1.07 (overshoot) → 1.0 over 0.3s. Correct.
- **Paratrooper off-screen cleanup**: `x < -200 || x > 2760` kills entity. Correct.
- **Group membership**: Both entities in `'enemy_missiles'` — correctly targetable by player projectiles and counted by wave completion.
- **Type guards**: `isTransportPlane` and `isParatrooper` use `constructor.name` — correct for both types.
- **ctx.save()/ctx.restore() balance in paratrooper draw()**: Outer save/restore at lines 309/365 wraps all paths. Each state branch (freefall, parachute, landed, running, attacking, idle) returns with exactly one `ctx.restore()`. `_drawParachutingTrooper` has inner save/restore balanced. `_drawSoldierBody` has its own save/restore. Total: balanced.
- **ctx.save()/ctx.restore() balance in transport-plane draw()**: 1 outer + 6 inner saves = 7 total; 7 matching restores. Balanced.
- **setLineDash reset in _drawAttackingBody**: `setLineDash([2,2])` and `setLineDash([])` both inside the same `if (fuseLineLen > 0)` block (lines 589-594). Always reset within block. Additionally isolated by outer `ctx.save/restore`. No leak.
- **No zero-radius gradients**: `createRadialGradient(-6,-20,0, 0,-13,36)` — outer radius 36 > 0. `createLinearGradient(0,0,0,CANOPY_APEX_Y)` — CANOPY_APEX_Y=-26, nonzero length. Both safe.
- **Wave cost**: `transport_plane: 5` in `costs` object at `wave.js` line 87. Matches spec.

---

## Test Evidence

Fresh screenshot run was not possible in this session (Bash tool permission unavailable). Analysis is entirely code-based against the current source files read via the Read tool.

Source files analyzed:
- `/Users/urizonens/dev/multiagent/missile-attack-arcade-web/src/entities/paratrooper.js` — full file
- `/Users/urizonens/dev/multiagent/missile-attack-arcade-web/src/entities/transport-plane.js` — full file
- `/Users/urizonens/dev/multiagent/missile-attack-arcade-web/src/collision.js` — full file
- `/Users/urizonens/dev/multiagent/missile-attack-arcade-web/src/game.js` — lines 1-250, 575-630
- `/Users/urizonens/dev/multiagent/missile-attack-arcade-web/src/wave.js` — full file
- `/Users/urizonens/dev/multiagent/missile-attack-arcade-web/src/entities/launcher.js` — full file
- `/Users/urizonens/dev/multiagent/missile-attack-arcade-web/src/entities/entity.js` — full file
- `/Users/urizonens/dev/multiagent/missile-attack-arcade-web/src/crater.js` — full file

Prior session screenshot data (for reference):

| Screenshot | Description |
|------------|-------------|
| /tmp/qa-screenshots/003-transport-plane-spawned.png | Plane entering from right edge after injection |
| /tmp/qa-screenshots/005-paratroopers-falling-5s.png | Two paratroopers with deployed canopies visible |
| /tmp/qa-screenshots/006-paratroopers-landing-8s.png | Multiple paratroopers mid-descent |
| /tmp/qa-screenshots/008-multiple-paratroopers-falling.png | 10+ paratroopers, HEAT-SK and VULKAN destroyed |

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
