# Visual QA Report — 2026-04-20

## Summary

7 bugs found. 1 critical, 3 high, 2 medium, 1 low.

The Enemy Nuke core feature is functional: the warhead spawns, flies ballistically, displays its hazard-stripe body with rocket fire trail, triggers the "!! NUKE INCOMING !!" warning banner, causes massive terrain deformation on impact, and the game does not crash. The HP system (MAX_HP = 3) mechanically tracks damage correctly, and heat-seeker instant-kill logic works. However several visual and behavioural bugs were found.

---

## Bugs

### BUG-001: nuke-alive-flag-not-cleared
- **Severity**: Critical
- **File(s)**: `src/entities/nuke.js`, `src/collision.js`
- **Description**: `Nuke.takeDamage()` returns `true` when HP reaches 0 but does NOT set `this.alive = false`. The entity continues to exist in the world until `enemy.destroy()` is called by the collision system. In the collision path this is handled correctly (collision.js line 155 calls `enemy.destroy()` after `takeDamage`). However any code path that calls `takeDamage` directly gets a `destroyed = true` return value while the nuke keeps flying and drawing. The test harness confirmed this: after 3 manual `takeDamage` calls the nuke's `alive` property was still `true`. Because the entity-manager only culls entities where `alive === false`, this creates a ghost nuke that keeps moving and can still trigger terrain collision damage.
- **Steps to Reproduce**:
  1. Start the game, call `window.game._spawnNuke()`.
  2. In the console run: `const n = window.game.entities.getGroup('nukes')[0]; n.takeDamage(1); n.takeDamage(1); const r = n.takeDamage(1); console.log(r, n.alive);`
  3. Observe: `takeDamage` returns `true` (destroyed) but `n.alive` is still `true`.
- **Root Cause Hypothesis**: `takeDamage` was designed as a pure query, delegating `destroy()` to the caller. This is fragile. The method should call `this.destroy()` itself when `hp <= 0`, mirroring the self-destruct pattern used by every other entity.
- **Screenshot**: /tmp/qa-screenshots/020_nuke_hit_3_result.png

---

### BUG-002: nuke-hp-pips-wrong-color
- **Severity**: High
- **File(s)**: `src/entities/nuke.js` lines 247-258
- **Description**: The HP pips displayed above the nuke are rendered red (`rgba(0.95, 0.1, 0.05, 0.9)`) with a yellow-orange ring. The spec and task brief require green dots to indicate remaining health. Red pips are visually confusing — they read as damage markers or danger indicators rather than health remaining, particularly since the nuke is already covered in a red nosecone and red pulsing glow.
- **Steps to Reproduce**:
  1. Spawn the game, call `window.game._spawnNuke()`.
  2. Observe the three small dots displayed above/beside the nuke sprite during flight.
- **Root Cause Hypothesis**: `src/entities/nuke.js` line 252: `ctx.fillStyle = rgba(0.95, 0.1, 0.05, 0.9)` — fill colour is red (R=0.95, G=0.10, B=0.05). Should be `rgba(0.1, 0.9, 0.25, 0.9)` or similar green to indicate hit points remaining.
- **Screenshot**: /tmp/qa-screenshots/006_nuke_in_flight_1.png

---

### BUG-003: nuke-overlaps-warning-banner
- **Severity**: High
- **File(s)**: `src/ui.js` line 493, `src/entities/nuke.js`
- **Description**: The nuke entity's flight path passes directly through the "!! NUKE INCOMING !!" warning banner. The nuke spawns at y = -120 logical and descends, while the warning banner is fixed at `barY = 215` logical (approximately y = 75 in the 720px viewport). A fast-descending nuke clips inside the banner rectangle for several frames. The nuke is drawn in world space (before `beginUI()`), the banner in UI space (after `beginUI()`), so the banner renders on top of the nuke and partially occludes it during a critical threat identification moment.
- **Steps to Reproduce**:
  1. Start game, call `window.game._spawnNuke()`.
  2. Wait approximately 0.5 to 1.5 seconds while the nuke descends from spawn.
  3. The nuke descends through the banner area near the top of the screen.
- **Root Cause Hypothesis**: The banner Y position (`barY = 215`) is chosen to sit below score/wave text but the nuke's initial descent path passes through this zone. Either push the banner lower (e.g. `barY = 350`) or offset the nuke spawn point higher (e.g. `spawnY = -280`) so the nuke is still off-screen when the banner first appears.
- **Screenshot**: /tmp/qa-screenshots/007_nuke_in_flight_2.png

---

### BUG-004: nuke-warning-and-wave-banner-displayed-simultaneously
- **Severity**: High
- **File(s)**: `src/ui.js`
- **Description**: When the "WAVE 1" wave banner (centred on screen, large gold text) is visible and a nuke spawns immediately, both the wave banner and the nuke warning banner render at the same time. The contextual top-centre info text is correctly suppressed by `_nukeWarningActive`, but the wave banner has no awareness of nuke warning state. This creates a confusing dual-alert state during the highest-urgency moment in the game: the large decorative "WAVE 1" banner competes for attention with the urgent red "!! NUKE INCOMING !!" bar.
- **Steps to Reproduce**:
  1. Click to start game (WAVE 1 banner appears).
  2. Immediately call `window.game._spawnNuke()` before the wave banner fades.
  3. Both banners are visible simultaneously on screen.
- **Root Cause Hypothesis**: `ui.js` `drawWaveBanner()` has no check for `this._nukeWarningActive`. The wave banner should either be suppressed or interrupted when a nuke warning activates. A simple guard at the top of `drawWaveBanner`: `if (this._nukeWarningActive) return;` would resolve this.
- **Screenshot**: /tmp/qa-screenshots/005_nuke_warning_banner.png

---

### BUG-005: nuke-warning-timer-resets-on-second-spawn
- **Severity**: Medium
- **File(s)**: `src/ui.js` lines 113-117
- **Description**: `showNukeWarning()` unconditionally resets `_nukeWarningTimer` to `NUKE_WARNING_DURATION` (3.0s) each call. If two nukes spawn in quick succession (possible at higher wave numbers), the second call resets the timer, discarding remaining time from the first warning. A player who saw the first warning and began tracking the first nuke will see the banner restart, potentially misinterpreting it as a single continuous warning rather than a new threat.
- **Steps to Reproduce**:
  1. Call `window.game._spawnNuke()`.
  2. Wait 2 seconds.
  3. Call `window.game._spawnNuke()` again.
  4. The 3-second countdown resets to 3s instead of extending from its current value.
- **Root Cause Hypothesis**: `src/ui.js` `showNukeWarning()` should use `Math.max(this._nukeWarningTimer, NUKE_WARNING_DURATION)` to only extend the warning, never shorten it. This ensures multi-nuke waves keep the banner visible at full duration.
- **Screenshot**: /tmp/qa-screenshots/011_nuke_warning_hud_overlap_check.png

---

### BUG-006: nuke-terrain-impact-awards-no-score
- **Severity**: Medium
- **File(s)**: `src/collision.js` lines 193-207
- **Description**: When a nuke impacts terrain, the collision handler (`collision.js` section 2, nuke branch) calls `enemy.destroy()`, spawns 5 mega explosions, damages terrain, and shakes the screen, but does NOT call `game.onEnemyDestroyed('nuke')`. In contrast, when a player interceptor destroys a nuke in flight, `game.onEnemyDestroyed('nuke')` is called (line 159), awarding 5 points. A player who fails to intercept a nuke gets 0 points for the encounter. Whether terrain-impact nukes should score is a design decision, but the asymmetry is undocumented and likely unintentional.
- **Steps to Reproduce**:
  1. Spawn a nuke, observe score (0).
  2. Let the nuke hit terrain without interception.
  3. Observe: score remains 0.
- **Root Cause Hypothesis**: `src/collision.js` nuke terrain branch (after line 194) is missing `game.onEnemyDestroyed('nuke')`. If scoring on terrain impact is not desired, this should be documented as intentional.
- **Screenshot**: /tmp/qa-screenshots/016_post_nuke_gameplay.png

---

### BUG-007: nuke-damage-visual-feedback-imperceptible-at-2hp
- **Severity**: Low
- **File(s)**: `src/entities/nuke.js` lines 136-155
- **Description**: At 2/3 HP (one hit taken) the visual change to the nuke is imperceptible during gameplay. The glow radius increases from 38 to ~41 logical pixels and alpha increases from `0.25 * pulse` to ~`0.40 * pulse`. At normal game scale these differences are invisible. A player cannot tell visually whether they have successfully hit a nuke without watching the HP pips carefully (which are small and currently red per BUG-002). The red flash overlay (`FLASH_DURATION = 0.12s`) is too brief to be reliably noticed.
- **Steps to Reproduce**:
  1. Spawn a nuke.
  2. Apply one hit: `window.game.entities.getGroup('nukes')[0].takeDamage(1)`.
  3. Compare appearance before and after — the glow change is not visible at gameplay distance.
- **Root Cause Hypothesis**: The linear `damageFrac` ramp is too subtle. Using an exponential curve (e.g. `damageFrac ** 2`) or adding a visible secondary visual cue (body crack lines, colour shift on body panels) would make intermediate damage states legible. The `FLASH_DURATION` at 0.12s should also be extended to at least 0.25s for reliable human perception.
- **Screenshot**: /tmp/qa-screenshots/019_nuke_hit_2_result.png

---

## Verified Working Correctly

- Nuke spawns with correct body geometry: gunmetal body, yellow/black hazard stripes, red nosecone, fins, radiation trefoil symbol
- Rocket fire trail renders correctly with layered particle glow (10 layers, wider than standard enemy missiles)
- Pulsing aura glow is visible and animates at correct PULSE_SPEED
- Ballistic arc physics work correctly (gravity = 60, nuke follows a natural arc)
- `takeDamage` HP accounting is mechanically correct: 3 standard hits return `destroyed = true`, heat-seeker kills instantly (hp set to 0)
- Warning banner renders at correct horizontal position (centred, 1000px wide), with dark shadow backing, red background, and yellow text
- Warning banner blinks correctly (Math.sin oscillator at ~1.5 Hz)
- Warning banner suppresses contextual top-centre info text while active
- Terrain takes massive damage on nuke impact (200px wide, 70px deep primary crater plus two flanking craters at +-80px)
- 5 mega explosions spawn at impact — confirmed visually in screenshots 014 and 024
- Screen shake triggers on nuke impact (intensity 50)
- Large crater entity spawns at impact zone with scale 10
- Game state remains 'playing' after nuke impact — no crash or exception
- Wave number and score HUD text are readable and correctly positioned (top-left)
- Launcher panel cards update correctly (DESTROYED state visible for launchers hit by nuke area damage)
- HP pips correctly count from 3 down to 0 as damage is applied and the nuke is destroyed
- Nuke area-of-effect launcher damage works: collision code destroys all launchers within 300px of impact
