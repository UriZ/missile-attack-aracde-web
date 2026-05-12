# Visual QA Report — 2026-05-12
# Issue #19: UI Overhaul — Vulkan Cannon M134 Redesign

**QA Script**: `/tmp/vulkan-qa.js`
**Screenshots**: `/tmp/qa-screenshots/vc_*.png`
**Source files reviewed**: vulkan-cannon.js, ui.js, explosion.js, terrain.js, launcher.js, utils.js

---

## Summary

4 bugs found. 0 critical, 2 high, 1 medium, 1 low.

No JavaScript runtime errors from the Vulkan cannon or UI overhaul code. The game loads cleanly, fires bullets, builds heat, triggers overheat, cools, and all UI panels render. Two 404 console errors for `assets/coverfinal.png` are pre-existing and unrelated to this issue.

---

## Bugs

### BUG-001: shadowColor leaks from selection glow into heat glow overlays

- **Severity**: High
- **File(s)**: `src/entities/vulkan-cannon.js` lines 193–198
- **Description**: The selection glow block sets `ctx.shadowColor = '#5060FF'` and then resets `ctx.shadowBlur = 0` at line 198. However, `ctx.shadowColor` is never reset to its default `'rgba(0,0,0,0)'`. This leaks the blue color into the remainder of `draw()` — specifically into the heat glow overlay stages (lines 448–499), which later set their own `shadowColor` inside nested `ctx.save()` blocks. In stages heat>0.9 and heat>0.7, the nested save/restore correctly isolate their own shadow settings. However, the stage-1 subtle shimmer (heat>0.5, lines 492–499) does NOT use save/restore and sets NO `shadowColor`, so any subsequent call to set `shadowBlur > 0` anywhere after this block would use the stale `'#5060FF'` color. The real-world effect is that at heat stage 1 (0.5–0.7), if `shadowBlur` were non-zero, the glow would appear blue instead of warm amber.
- **Steps to Reproduce**: Select Vulkan cannon. Fire until heat is between 0.5 and 0.7. If any code path activates `shadowBlur` in this range, the shadow will be blue.
- **Root Cause Hypothesis**: Selection glow section (lines 193–199) should be wrapped in `ctx.save()/ctx.restore()` to contain the shadow state.
- **Screenshot**: `/tmp/qa-screenshots/vc_07_vulkan_heat_stage1.png`

---

### BUG-002: Overheat warning shimmer lines mutate strokeStyle/lineWidth without save/restore

- **Severity**: High
- **File(s)**: `src/entities/vulkan-cannon.js` lines 462–469
- **Description**: The warning shimmer lines drawn during overheat (lines 462–469) set `ctx.strokeStyle` to an orange-red and `ctx.lineWidth = 1`, but these are NOT wrapped in `ctx.save()/ctx.restore()`. These mutations are performed AFTER `ctx.restore()` at line 460 (which only restored the inner shadow state), meaning they persist in the turret rotation context. The muzzle flash section that immediately follows (lines 502–548) does not reset `strokeStyle` before stroking its side corona arcs. During overheat, if `_muzzleFlashTimer > 0` at the same frame, the corona arcs would use the orange-red shimmer stroke style rather than the intended flash color.
- **Steps to Reproduce**: Fire Vulkan cannon until overheat. Observe muzzle flash at the exact moment of overheat trigger (the final shot before overheat still triggers a flash). The corona arcs in the flash may show orange-red outline instead of the expected gold/yellow.
- **Root Cause Hypothesis**: Lines 462–469 need `ctx.save()` before and `ctx.restore()` after, or need to be moved inside the already-open save block at lines 452–460 before that restore.
- **Screenshot**: `/tmp/qa-screenshots/vc_10_vulkan_overheat.png`

---

### BUG-003: Ammo feed box and belt chute do not rotate with the gun body — visible detachment at non-vertical angles

- **Severity**: Medium
- **File(s)**: `src/entities/vulkan-cannon.js` lines 243–262 vs line 265–266
- **Description**: The ammo feed box (section 3, lines 243–262) is drawn BEFORE the turret rotation transform is applied (`ctx.save(); ctx.rotate(this.turretRotation)` at line 265). This intentionally makes the ammo box "non-rotating" per the comment, but at non-vertical turret angles the box visually detaches from the rotating receiver block it should be bolted to. When the turret points left or right (±40–80 degrees from vertical), the OD-green ammo box and brass belt chute remain anchored to the left side at fixed local coordinates, floating free from the barrel housing. In the real M134, the ammo box is rigidly attached to the receiver and would rotate with it.
- **Steps to Reproduce**: Select Vulkan cannon (key 4). Move mouse far to the right side of screen. The turret rotates right. The ammo feed box remains fixed to the left at the entity origin — visually disconnected from the rotating receiver block.
- **Root Cause Hypothesis**: Move the ammo feed box and belt chute drawing (lines 243–262) to inside the `ctx.save(); ctx.rotate()` block that starts at line 265, adjusting the draw coordinates if needed to match the rotated reference frame.
- **Screenshot**: `/tmp/qa-screenshots/vc_04_vulkan_aimed.png`

---

### BUG-004: Heat bar constant HEAT_BAR_W (200) is out of sync with actual rendered width (240)

- **Severity**: Low
- **File(s)**: `src/ui.js` lines 51 and 629
- **Description**: Module constant `HEAT_BAR_W = 200` is defined at line 51 but `_drawHeatBar()` hard-codes `const w = 240` at line 629. The constant is never referenced inside the method. The bar renders at 240px, not 200px. Any code that relies on `HEAT_BAR_W` for positioning or layout calculations will be off by 40px. Currently no other code references this constant, so there is no active breakage, but it creates a maintenance trap.
- **Steps to Reproduce**: Select Vulkan cannon, fire to build heat. The heat bar at bottom-left renders at 240px width, inconsistent with the constant value of 200.
- **Root Cause Hypothesis**: Either update the constant to 240, or change `_drawHeatBar` to use `HEAT_BAR_W` instead of the hard-coded 240.
- **Screenshot**: `/tmp/qa-screenshots/vc_05_vulkan_firing_start.png`

---

## Positive Findings (Feature Verified Working)

1. **No JS runtime errors** from vulkan-cannon.js, ui.js, explosion.js, or terrain.js code.
2. **M134 silhouette renders** — octagonal barrel shroud, pedestal mount, trunnion crossbar, foot plate bolts, motor housing, clamp rings all visible in the cannon sprite at bottom of screen.
3. **Barrel cluster present** — the 6-barrel arrangement inside the shroud is coded and draws with correct per-barrel gradients and bore holes.
4. **Heat bar visible and functional** — appears when Vulkan is selected and heat > 0.01, progresses green→yellow→orange→red, triggers OVERHEATED text.
5. **All 3 heat stages activate** — screenshots confirm warm shimmer, orange glow, and red inferno stages across the heat range.
6. **Overheat stops firing** — cannon stops producing bullets at heat=1.0, heat drains on release.
7. **Shell casings spawn** — brass shell rectangles with rim circle and shine line are coded and update with physics.
8. **Smoke wisps emit when hot** — code path confirmed active for heat>0.3.
9. **Muzzle flash** — cone + inner white core + side coronas + bloom + sparks all coded.
10. **ctx.save/ctx.restore stack balanced** — the 2 outer saves (entity, turret) and inner barrel spin save all have matching restores. Stack is not leaked.
11. **Wave banner** — gold "WAVE 1" and green "WAVE 1 CLEAR" banners with vignette backdrop, diamond decorations, flanking lines render correctly. Seen in screenshots `vc_06` through `vc_12`.
12. **Launcher cards** — all 4 cards render correctly, selected highlight (blue border + glow) on VULKAN, DESTROYED state displays correctly in red.
13. **Score panel** — SCORE label, bold numeric value, wave number (post-banner) visible at top-left.
14. **Per-launcher crosshairs** — SAM steel blue, Heat-seeker red dashed circle, Truck amber, Vulkan default gray all correct.
15. **Heat-seeker lock circle** — dashed outer circle (90px) and solid inner circle (54px) with tick marks, slow rotation visible.
16. **Nuke warning banner** — "!! NUKE INCOMING !!" renders with blinking, red gradient background, pulsing alert circles.
17. **Explosion effects** — shockwave ring, fireball, debris, spark trails, smoke wisps render and expire within 2.0s lifetime.
18. **Terrain** — background mountains (3 depth layers with snow caps), grass highlight, buildings, trees render without artifacts.
19. **Import resolution** — all imports in vulkan-cannon.js resolve correctly: `{ Launcher, drawPoly }` from `./launcher.js`, `{ TAU, rgba, lerp, clamp, randf }` from `../utils.js`. No missing exports.

---

## Pre-existing Issues (Not Introduced by Issue #19)

- `assets/coverfinal.png` returns 404 — the start screen cover image is missing from the server. This is unrelated to the Vulkan cannon or UI overhaul.
