# Scene Data Reference — Godot .tscn Polygon Extraction

All polygon vertex arrays and colors extracted from the original Godot scene files. Coordinates are relative to the entity's origin (0,0). Colors are in Godot format: `Color(r, g, b, a)` where r,g,b,a are 0.0-1.0.

**Canvas 2D translation:** Use `rgba(r*255, g*255, b*255, a)` for CSS colors. Draw polygons with `ctx.beginPath()` / `ctx.moveTo()` / `ctx.lineTo()` / `ctx.closePath()` / `ctx.fill()`.

**Turret children** are drawn in a rotated context: `ctx.save(); ctx.translate(x, y); ctx.rotate(turretRotation); /* draw turret polys */ ctx.restore();`

---

## Table of Contents

1. [SAM Launcher](#1-sam-launcher)
2. [Truck Launcher](#2-truck-launcher)
3. [Heat-Seeking Launcher](#3-heat-seeking-launcher)
4. [Vulkan Cannon](#4-vulkan-cannon)
5. [Player Missile](#5-player-missile)
6. [Heat-Seeking Missile](#6-heat-seeking-missile)
7. [Enemy Missile](#7-enemy-missile)
8. [Super Missile](#8-super-missile)
9. [Drone](#9-drone)
10. [Suicide Drone](#10-suicide-drone)
11. [Vulkan Bullet](#11-vulkan-bullet)
12. [Crater](#12-crater)
13. [Explosion / Mega Explosion](#13-explosion--mega-explosion)

---

## 1. SAM Launcher

**Root:** `Area2D` (script: `launcher.gd`)
**Collision:** Rectangle 80x100, offset (0, -10)
**Game position:** x=400, y=1220
**Turret tip offset:** `Vector2(0, -62).rotated(turretRotation)` from origin
**Turret clamp:** +/-80 degrees from vertical
**Turret lerp speed:** 10.0 * delta

### Base polygons (parent = root, drawn at entity position)

| Name | Color | Vertices |
|------|-------|----------|
| BaseSlab | (0.24, 0.26, 0.22, 1) | (-54,28), (54,28), (48,14), (-48,14) |
| BaseSlabRim | (0.14, 0.16, 0.12, 1) | (-54,30), (54,30), (54,28), (-54,28) |
| BaseUpper | (0.3, 0.32, 0.27, 1) | (-48,14), (48,14), (40,4), (-40,4) |
| BaseUpperEdge | (0.38, 0.4, 0.34, 1) | (-48,15), (48,15), (48,14), (-48,14) |
| WarningBandL | (0.78, 0.62, 0.08, 0.85) | (-54,20), (-50,20), (-38,28), (-42,28) |
| WarningBandR | (0.78, 0.62, 0.08, 0.85) | (50,20), (54,20), (42,28), (38,28) |
| PivotOuter | (0.18, 0.2, 0.17, 1) | (-32,4), (32,4), (32,-10), (-32,-10) |
| PivotEdgeTop | (0.12, 0.14, 0.11, 1) | (-32,-9), (32,-9), (32,-10), (-32,-10) |
| PivotEdgeBot | (0.28, 0.3, 0.25, 1) | (-32,4), (32,4), (32,5), (-32,5) |

### Turret polygons (parent = Turret, drawn in rotated context)

| Name | Color | Vertices |
|------|-------|----------|
| ArmShoulder | (0.22, 0.24, 0.2, 1) | (-26,-8), (26,-8), (26,-22), (-26,-22) |
| ArmBody | (0.17, 0.19, 0.16, 1) | (-24,-22), (24,-22), (24,-56), (-24,-56) |
| ArmRibL | (0.27, 0.3, 0.24, 1) | (-24,-22), (-19,-22), (-19,-56), (-24,-56) |
| ArmRibR | (0.27, 0.3, 0.24, 1) | (19,-22), (24,-22), (24,-56), (19,-56) |
| ArmBrace1 | (0.24, 0.26, 0.21, 1) | (-24,-30), (24,-30), (24,-33), (-24,-33) |
| ArmBrace2 | (0.24, 0.26, 0.21, 1) | (-24,-44), (24,-44), (24,-47), (-24,-47) |
| Missile1Body | (0.58, 0.18, 0.12, 1) | (-17,-20), (-10,-20), (-10,-57), (-17,-57) |
| Missile1Tip | (0.92, 0.9, 0.86, 1) | (-17,-57), (-13.5,-64), (-10,-57) |
| Missile1Band | (0.9, 0.85, 0.12, 1) | (-17,-38), (-10,-38), (-10,-34), (-17,-34) |
| Missile1FinL | (0.38, 0.12, 0.09, 1) | (-21,-21), (-17,-21), (-17,-30), (-22,-28) |
| Missile1FinR | (0.38, 0.12, 0.09, 1) | (-10,-21), (-6,-21), (-6,-28), (-10,-30) |
| Missile2Body | (0.58, 0.18, 0.12, 1) | (-8,-20), (-1,-20), (-1,-57), (-8,-57) |
| Missile2Tip | (0.92, 0.9, 0.86, 1) | (-8,-57), (-4.5,-64), (-1,-57) |
| Missile2Band | (0.9, 0.85, 0.12, 1) | (-8,-38), (-1,-38), (-1,-34), (-8,-34) |
| Missile2FinL | (0.38, 0.12, 0.09, 1) | (-12,-21), (-8,-21), (-8,-30), (-13,-28) |
| Missile2FinR | (0.38, 0.12, 0.09, 1) | (-1,-21), (3,-21), (3,-28), (-1,-30) |
| Missile3Body | (0.58, 0.18, 0.12, 1) | (1,-20), (8,-20), (8,-57), (1,-57) |
| Missile3Tip | (0.92, 0.9, 0.86, 1) | (1,-57), (4.5,-64), (8,-57) |
| Missile3Band | (0.9, 0.85, 0.12, 1) | (1,-38), (8,-38), (8,-34), (1,-34) |
| Missile3FinL | (0.38, 0.12, 0.09, 1) | (-3,-21), (1,-21), (1,-30), (-4,-28) |
| Missile3FinR | (0.38, 0.12, 0.09, 1) | (8,-21), (12,-21), (12,-28), (8,-30) |
| Missile4Body | (0.58, 0.18, 0.12, 1) | (10,-20), (17,-20), (17,-57), (10,-57) |
| Missile4Tip | (0.92, 0.9, 0.86, 1) | (10,-57), (13.5,-64), (17,-57) |
| Missile4Band | (0.9, 0.85, 0.12, 1) | (10,-38), (17,-38), (17,-34), (10,-34) |
| Missile4FinL | (0.38, 0.12, 0.09, 1) | (6,-21), (10,-21), (10,-30), (5,-28) |
| Missile4FinR | (0.38, 0.12, 0.09, 1) | (17,-21), (21,-21), (21,-28), (17,-30) |
| SensorHousing | (0.13, 0.17, 0.26, 1) | (-9,-55), (9,-55), (9,-70), (-9,-70) |
| SensorFace | (0.1, 0.45, 0.78, 1) | (-6.5,-57), (6.5,-57), (6.5,-68), (-6.5,-68) |
| SensorGlow | (0.2, 1.0, 0.45, 1) | (-2,-62), (2,-62), (2,-64), (-2,-64) |
| SensorAntennaL | (0.28, 0.32, 0.28, 1) | (-12,-56), (-9,-56), (-9,-70), (-12,-70) |
| SensorAntennaR | (0.28, 0.32, 0.28, 1) | (9,-56), (12,-56), (12,-70), (9,-70) |

### Selection glow (parent = root, visible only when selected)

| Name | Color | z_index | Vertices |
|------|-------|---------|----------|
| SelectionGlow | (0.2, 0.6, 1.0, 0.35) | -2 | (-58,22), (-44,34), (44,34), (58,22), (44,42), (-44,42) |
| SelectionGlow2 | (0.2, 0.6, 1.0, 0.15) | -3 | (-74,24), (-56,46), (56,46), (74,24), (56,52), (-56,52) |

**Selection animation:** Glow alpha pulses between 0.25 and 0.5 over 1.2s (sine ease in-out).

---

## 2. Truck Launcher

**Root:** `Area2D` (script: `launcher.gd`)
**Collision:** Rectangle 115x75, offset (0, 0)
**Game position:** x=1400, y=1220
**Turret tip offset:** `Vector2(0, -62).rotated(turretRotation)` from origin

### Base polygons (parent = root)

| Name | Color | Vertices |
|------|-------|----------|
| Chassis | (0.28, 0.35, 0.24, 1) | (-55,22), (55,22), (55,-6), (-55,-6) |
| ChassisRim | (0.16, 0.2, 0.13, 1) | (-55,22), (55,22), (55,24), (-55,24) |
| ChassisPanel | (0.24, 0.3, 0.2, 1) | (-16,20), (55,20), (55,16), (-16,16) |
| Cab | (0.32, 0.4, 0.27, 1) | (-55,-6), (-16,-6), (-16,-32), (-48,-32), (-55,-24) |
| CabRoof | (0.4, 0.48, 0.33, 1) | (-48,-32), (-16,-32), (-16,-36), (-44,-36) |
| CabWindow | (0.22, 0.36, 0.52, 0.92) | (-46,-9), (-20,-9), (-20,-28), (-44,-28) |
| WindowGlare | (0.7, 0.82, 0.95, 0.28) | (-46,-9), (-38,-9), (-38,-28), (-46,-22) |
| GrilleFace | (0.16, 0.18, 0.14, 1) | (-55,-8), (-49,-8), (-49,-22), (-55,-22) |
| GrilleSlat1 | (0.26, 0.28, 0.22, 1) | (-55,-10), (-49,-10), (-49,-11), (-55,-11) |
| GrilleSlat2 | (0.26, 0.28, 0.22, 1) | (-55,-14), (-49,-14), (-49,-15), (-55,-15) |
| GrilleSlat3 | (0.26, 0.28, 0.22, 1) | (-55,-18), (-49,-18), (-49,-19), (-55,-19) |
| Headlight | (0.88, 0.85, 0.5, 0.95) | (-55,-22), (-50,-22), (-50,-26), (-55,-26) |
| ExhaustPipe | (0.18, 0.2, 0.16, 1) | (-20,-32), (-16,-32), (-16,-44), (-20,-44) |
| ExhaustCap | (0.12, 0.14, 0.11, 1) | (-22,-42), (-14,-42), (-14,-44), (-22,-44) |

### Wheels (parent = root, octagonal shapes)

| Name | Color | Vertices |
|------|-------|----------|
| WheelA | (0.1, 0.1, 0.1, 1) | (-34,22), (-28,14), (-20,12), (-12,14), (-6,22), (-12,30), (-20,32), (-28,30) |
| WheelAHub | (0.35, 0.35, 0.35, 1) | (-28,22), (-25,17), (-20,15), (-15,17), (-12,22), (-15,27), (-20,29), (-25,27) |
| WheelACenter | (0.5, 0.5, 0.5, 1) | (-22,22), (-20,20), (-18,22), (-20,24) |
| WheelB | (0.1, 0.1, 0.1, 1) | (-6,22), (0,14), (8,12), (16,14), (22,22), (16,30), (8,32), (0,30) |
| WheelBHub | (0.35, 0.35, 0.35, 1) | (0,22), (3,17), (8,15), (13,17), (16,22), (13,27), (8,29), (3,27) |
| WheelBCenter | (0.5, 0.5, 0.5, 1) | (6,22), (8,20), (10,22), (8,24) |
| WheelC | (0.1, 0.1, 0.1, 1) | (26,22), (32,14), (40,12), (48,14), (54,22), (48,30), (40,32), (32,30) |
| WheelCHub | (0.35, 0.35, 0.35, 1) | (32,22), (35,17), (40,15), (45,17), (48,22), (45,27), (40,29), (35,27) |
| WheelCCenter | (0.5, 0.5, 0.5, 1) | (38,22), (40,20), (42,22), (40,24) |

### Turret polygons (parent = Turret)

| Name | Color | Vertices |
|------|-------|----------|
| PodShell | (0.38, 0.4, 0.35, 1) | (-14,-4), (52,-4), (52,-16), (-14,-16) |
| PodSideL | (0.3, 0.32, 0.27, 1) | (-14,-4), (-11,-4), (-11,-54), (-14,-54) |
| PodSideR | (0.3, 0.32, 0.27, 1) | (49,-4), (52,-4), (52,-54), (49,-54) |
| PodTop | (0.34, 0.36, 0.31, 1) | (-14,-52), (52,-52), (52,-54), (-14,-54) |
| PodRibA | (0.28, 0.3, 0.25, 1) | (10,-4), (12,-4), (12,-54), (10,-54) |
| PodRibB | (0.28, 0.3, 0.25, 1) | (33,-4), (35,-4), (35,-54), (33,-54) |
| Rocket1Body | (0.58, 0.18, 0.12, 1) | (-4,-16), (4,-16), (4,-52), (-4,-52) |
| Rocket1Tip | (0.92, 0.9, 0.86, 1) | (-4,-52), (0,-58), (4,-52) |
| Rocket1Band | (0.9, 0.85, 0.12, 1) | (-4,-34), (4,-34), (4,-30), (-4,-30) |
| Rocket2Body | (0.58, 0.18, 0.12, 1) | (8,-16), (16,-16), (16,-52), (8,-52) |
| Rocket2Tip | (0.92, 0.9, 0.86, 1) | (8,-52), (12,-58), (16,-52) |
| Rocket2Band | (0.9, 0.85, 0.12, 1) | (8,-34), (16,-34), (16,-30), (8,-30) |
| Rocket3Body | (0.58, 0.18, 0.12, 1) | (20,-16), (28,-16), (28,-52), (20,-52) |
| Rocket3Tip | (0.92, 0.9, 0.86, 1) | (20,-52), (24,-58), (28,-52) |
| Rocket3Band | (0.9, 0.85, 0.12, 1) | (20,-34), (28,-34), (28,-30), (20,-30) |
| Rocket4Body | (0.58, 0.18, 0.12, 1) | (32,-16), (40,-16), (40,-52), (32,-52) |
| Rocket4Tip | (0.92, 0.9, 0.86, 1) | (32,-52), (36,-58), (40,-52) |
| Rocket4Band | (0.9, 0.85, 0.12, 1) | (32,-34), (40,-34), (40,-30), (32,-30) |

### Selection glow

| Name | Color | z_index | Vertices |
|------|-------|---------|----------|
| SelectionGlow | (0.2, 0.6, 1.0, 0.35) | -2 | (-60,20), (-48,32), (48,32), (60,20), (48,40), (-48,40) |
| SelectionGlow2 | (0.2, 0.6, 1.0, 0.15) | -3 | (-76,22), (-58,44), (58,44), (76,22), (58,50), (-58,50) |

---

## 3. Heat-Seeking Launcher

**Root:** `Area2D` (script: `launcher.gd`)
**Collision:** Rectangle 90x100, offset (0, -18)
**Game position:** x=900, y=1220
**Special:** Has `RadarMast` child under Turret that spins independently at 1.8 rad/s

### Base polygons (parent = root)

| Name | Color | Vertices |
|------|-------|----------|
| BaseSlab | (0.18, 0.2, 0.24, 1) | (-46,28), (46,28), (40,14), (-40,14) |
| BaseSlabRim | (0.1, 0.12, 0.15, 1) | (-46,30), (46,30), (46,28), (-46,28) |
| BaseUpper | (0.22, 0.25, 0.3, 1) | (-40,14), (40,14), (34,4), (-34,4) |
| BaseTrimLine | (0.1, 0.55, 0.82, 0.9) | (-40,15), (40,15), (40,14), (-40,14) |
| PivotOuter | (0.18, 0.2, 0.26, 1) | (-30,4), (30,4), (30,-8), (-30,-8) |
| PivotTrimLine | (0.1, 0.55, 0.82, 0.7) | (-30,5), (30,5), (30,4), (-30,4) |

### Turret polygons (parent = Turret)

| Name | Color | Vertices |
|------|-------|----------|
| MastBase | (0.2, 0.24, 0.32, 1) | (-7,-6), (7,-6), (7,-22), (-7,-22) |
| MastBody | (0.17, 0.21, 0.28, 1) | (-4,-22), (4,-22), (4,-46), (-4,-46) |
| MastSheen | (0.3, 0.4, 0.55, 1) | (-4,-22), (-2,-22), (-2,-46), (-4,-46) |
| StatusLight | (0.1, 1.0, 0.4, 1) | (-2,-20), (2,-20), (2,-18), (-2,-18) |
| TubeL | (0.2, 0.24, 0.32, 1) | (-40,-8), (-28,-8), (-28,-50), (-40,-50) |
| TubeLSheen | (0.3, 0.38, 0.52, 1) | (-40,-8), (-38,-8), (-38,-50), (-40,-50) |
| TubeLFlange | (0.14, 0.16, 0.22, 1) | (-43,-6), (-25,-6), (-25,-9), (-43,-9) |
| TubeLMissile | (0.55, 0.18, 0.12, 1) | (-37,-12), (-31,-12), (-31,-48), (-37,-48) |
| TubeLTip | (0.92, 0.9, 0.86, 1) | (-37,-48), (-34,-54), (-31,-48) |
| TubeLBand | (0.9, 0.85, 0.12, 1) | (-37,-32), (-31,-32), (-31,-28), (-37,-28) |
| TubeR | (0.2, 0.24, 0.32, 1) | (28,-8), (40,-8), (40,-50), (28,-50) |
| TubeRSheen | (0.3, 0.38, 0.52, 1) | (28,-8), (30,-8), (30,-50), (28,-50) |
| TubeRFlange | (0.14, 0.16, 0.22, 1) | (25,-6), (43,-6), (43,-9), (25,-9) |
| TubeRMissile | (0.55, 0.18, 0.12, 1) | (31,-12), (37,-12), (37,-48), (31,-48) |
| TubeRTip | (0.92, 0.9, 0.86, 1) | (31,-48), (34,-54), (37,-48) |
| TubeRBand | (0.9, 0.85, 0.12, 1) | (31,-32), (37,-32), (37,-28), (31,-28) |

### Radar Mast (parent = Turret/RadarMast, position offset (0, -46), spins at 1.8 rad/s)

Draw in additional rotated context: `ctx.save(); ctx.translate(0, -46); ctx.rotate(radarRotation); /* draw */ ctx.restore();`

| Name | Color | Vertices |
|------|-------|----------|
| RadarArm | (0.22, 0.26, 0.34, 1) | (-2,0), (2,0), (2,-8), (-2,-8) |
| DishBack | (0.15, 0.19, 0.26, 1) | (-30,-8), (-22,-20), (-10,-26), (0,-28), (10,-26), (22,-20), (30,-8) |
| DishFace | (0.12, 0.46, 0.72, 1) | (-28,-9), (-20,-20), (-9,-26), (0,-27), (9,-26), (20,-20), (28,-9) |
| DishInner | (0.08, 0.65, 0.95, 0.85) | (-18,-11), (-11,-21), (0,-24), (11,-21), (18,-11) |
| DishGlow | (0.15, 0.95, 1.0, 0.9) | (-6,-14), (6,-14), (4,-22), (0,-24), (-4,-22) |
| DishCore | (0.4, 1.0, 1.0, 1) | (-2,-17), (2,-17), (1,-21), (0,-22), (-1,-21) |

### Selection glow

| Name | Color | z_index | Vertices |
|------|-------|---------|----------|
| SelectionGlow | (0.1, 0.7, 1.0, 0.35) | -2 | (-50,22), (-38,32), (38,32), (50,22), (38,40), (-38,40) |
| SelectionGlow2 | (0.1, 0.7, 1.0, 0.15) | -3 | (-64,24), (-48,44), (48,44), (64,24), (48,50), (-48,50) |

---

## 4. Vulkan Cannon

**Root:** `Area2D` (script: `vulkan_cannon.gd`)
**Collision:** Rectangle 70x80, offset (0, -10)
**Game position:** x=1900, y=1220
**Turret tip offset:** `Vector2(0, -58).rotated(turretRotation)` from origin
**Turret lerp speed:** 12.0 * delta
**Special:** BarrelGroup at offset (0, -44) rotates based on `barrelSpin` (degrees). Individual Tip nodes have position offsets.

### Base polygons (parent = root)

| Name | Color | Vertices |
|------|-------|----------|
| BaseOuter | (0.28, 0.28, 0.33, 1) | (-30,18), (-26,22), (-18,24), (0,25), (18,24), (26,22), (30,18), (30,8), (-30,8) |
| BaseInner | (0.33, 0.33, 0.38, 1) | (-24,14), (-20,18), (-12,20), (0,21), (12,20), (20,18), (24,14), (24,6), (-24,6) |
| BaseRing | (0.22, 0.22, 0.27, 1) | (-26,10), (-22,13), (-14,15), (0,16), (14,15), (22,13), (26,10), (26,8), (-26,8) |
| AmmoFeedL | (0.35, 0.3, 0.2, 1) | (-24,8), (-14,8), (-12,2), (-10,-4), (-22,-4), (-24,2) |
| AmmoBeltL | (0.55, 0.45, 0.1, 1) | (-22,4), (-12,4), (-12,2), (-22,2) |
| AmmoFeedR | (0.35, 0.3, 0.2, 1) | (14,8), (24,8), (24,2), (22,-4), (10,-4), (12,2) |
| AmmoBeltR | (0.55, 0.45, 0.1, 1) | (12,4), (22,4), (22,2), (12,2) |

### Turret polygons (parent = Turret)

| Name | Color | Vertices |
|------|-------|----------|
| TurretBase | (0.35, 0.35, 0.4, 1) | (-14,2), (-16,0), (-16,-6), (-14,-10), (14,-10), (16,-6), (16,0), (14,2) |
| BarrelHousing | (0.32, 0.32, 0.37, 1) | (-9,-8), (-10,-10), (-10,-40), (-9,-42), (9,-42), (10,-40), (10,-10), (9,-8) |
| HousingHighlight | (0.4, 0.4, 0.45, 1) | (-3,-10), (3,-10), (3,-40), (-3,-40) |
| HousingBand1 | (0.26, 0.26, 0.3, 1) | (-10,-16), (10,-16), (10,-19), (-10,-19) |
| HousingBand2 | (0.26, 0.26, 0.3, 1) | (-10,-30), (10,-30), (10,-33), (-10,-33) |
| MuzzleRing | (0.28, 0.28, 0.33, 1) | (-11,-40), (11,-40), (11,-43), (-11,-43) |

### BarrelGroup (parent = Turret/BarrelGroup, position offset (0, -44), rotates with barrelSpin)

Draw in additional rotated context within turret: `ctx.translate(0, -44); ctx.rotate(barrelSpinRadians);`

| Name | Color | Position Offset | Vertices |
|------|-------|-----------------|----------|
| Tip1 | (0.5, 0.5, 0.55, 1) | (0,0) | (-2,2), (2,2), (2,-12), (-2,-12) |
| Tip1Flash | (0.65, 0.6, 0.55, 1) | (0,0) | (-2.5,-10), (2.5,-10), (2.5,-14), (-2.5,-14) |
| Tip2 | (0.45, 0.45, 0.5, 1) | (-7,0) | (-2,2), (2,2), (2,-10), (-2,-10) |
| Tip2Flash | (0.6, 0.55, 0.5, 1) | (-7,0) | (-2.5,-8), (2.5,-8), (2.5,-12), (-2.5,-12) |
| Tip3 | (0.45, 0.45, 0.5, 1) | (7,0) | (-2,2), (2,2), (2,-10), (-2,-10) |
| Tip3Flash | (0.6, 0.55, 0.5, 1) | (7,0) | (-2.5,-8), (2.5,-8), (2.5,-12), (-2.5,-12) |
| Tip4 | (0.42, 0.42, 0.47, 1) | (-4,5) | (-2,2), (2,2), (2,-9), (-2,-9) |
| Tip5 | (0.42, 0.42, 0.47, 1) | (4,5) | (-2,2), (2,2), (2,-9), (-2,-9) |
| Tip6 | (0.4, 0.4, 0.45, 1) | (0,6) | (-2,2), (2,2), (2,-8), (-2,-8) |
| SpinHub | (0.38, 0.38, 0.42, 1) | (0,0) | (-6,5), (-3,7), (3,7), (6,5), (6,-3), (3,-5), (-3,-5), (-6,-3) |

**Note:** Tip colors change dynamically based on heat level. See `vulkan_cannon.gd:update_heat_visual()`. BarrelHousing and MuzzleRing also change color with heat.

### Selection glow

| Name | Color | z_index | Vertices |
|------|-------|---------|----------|
| SelectionGlow | (0.3, 0.5, 1.0, 0.35) | -1 | (-40,25), (40,25), (35,20), (-35,20) |
| SelectionGlow2 | (0.4, 0.6, 1.0, 0.15) | -1 | (-45,28), (45,28), (38,22), (-38,22) |

---

## 5. Player Missile

**Root:** `Area2D` (script: `missile.gd`)
**Collision:** Capsule, radius=11, height=64
**Rotation:** `velocity.angle() + PI/2`
**Gravity:** 200 px/s^2
**All polygons are children of root — draw in rotated context**

| Name | Color | Vertices |
|------|-------|----------|
| BodyGlow | (0.4, 0.6, 1.0, 0.18) | (-14,26), (14,26), (14,-18), (-14,-18) |
| Body | (0.78, 0.78, 0.82, 1) | (-11,22), (11,22), (11,-16), (-11,-16) |
| BodyStripe | (0.3, 0.45, 0.75, 1) | (-11,4), (11,4), (11,-2), (-11,-2) |
| Nosecone | (0.95, 0.15, 0.1, 1) | (-11,-16), (0,-36), (11,-16) |
| NoseBand | (0.55, 0.55, 0.58, 1) | (-11,-14), (11,-14), (11,-17), (-11,-17) |
| FinLeft | (0.55, 0.55, 0.58, 1) | (-11,14), (-22,26), (-11,22) |
| FinRight | (0.55, 0.55, 0.58, 1) | (11,14), (22,26), (11,22) |

### Rocket Fire (CPUParticles2D — translate to procedural trail)

- Position offset: (0, 22) — emits from tail
- Direction: (0, 1) — downward in local space (behind missile)
- Spread: 14 degrees
- Speed: 90-170 px/s
- Flame gradient: white -> yellow -> orange -> red -> transparent
  - Colors: (1,1,0.85,1) -> (1,0.82,0.1,1) -> (1,0.42,0,0.85) -> (0.9,0.12,0,0.45) -> (0.35,0.04,0,0)
- **Canvas translation:** Draw 5-8 small circles behind the missile tail, decreasing in size and opacity, transitioning from white/yellow to orange/red.

---

## 6. Heat-Seeking Missile

**Root:** `Area2D` (script: `heat_seeking_missile.gd`)
**Collision:** Capsule, radius=11, height=64
**Gravity:** 50 px/s^2 (less than regular missile)
**Tracking speed:** 3.0
**All polygons are children of root — draw in rotated context**

| Name | Color | Vertices | Notes |
|------|-------|----------|-------|
| BodyGlow | (0.1, 0.6, 1.0, 0.2) | (-14,26), (14,26), (14,-18), (-14,-18) | |
| Body | (0.3, 0.45, 0.72, 1) | (-11,22), (11,22), (11,-16), (-11,-16) | **Dynamic:** lerps to (0.5,0.3,0.3) when locked |
| BodyAccent | (0.2, 0.62, 0.88, 1) | (-11,2), (11,2), (11,-4), (-11,-4) | |
| SeekerRing | (0.15, 0.85, 0.95, 0.9) | (-11,-13), (11,-13), (11,-16), (-11,-16) | |
| Nosecone | (0.92, 0.9, 0.18, 1) | (-11,-16), (0,-36), (11,-16) | **Dynamic:** lerps to (1.0,0.2,0.1) when locked |
| FinLeft | (0.22, 0.36, 0.62, 1) | (-11,14), (-22,26), (-11,22) | |
| FinRight | (0.22, 0.36, 0.62, 1) | (11,14), (22,26), (11,22) | |

### Rocket Fire — blue-tinted flame

- Flame gradient: white/blue -> cyan -> blue -> dark blue -> transparent
  - Colors: (0.85,0.98,1,1) -> (0.3,0.85,1,1) -> (0.05,0.5,0.95,0.8) -> (0.02,0.2,0.7,0.35) -> (0,0.05,0.3,0)

---

## 7. Enemy Missile

**Root:** `Area2D` (script: `enemy_missile.gd`)
**Collision:** Capsule, radius=12, height=68
**Gravity:** 200 px/s^2
**Group:** `enemy_missiles`

| Name | Color | Vertices |
|------|-------|----------|
| BodyGlow | (1.0, 0.25, 0.05, 0.22) | (-16,26), (16,26), (16,-18), (-16,-18) |
| Body | (0.52, 0.52, 0.36, 1) | (-12,22), (12,22), (12,-16), (-12,-16) |
| BodyPanel | (0.44, 0.44, 0.3, 1) | (-12,8), (12,8), (12,2), (-12,2) |
| WarheadBand | (0.88, 0.75, 0.08, 1) | (-12,-13), (12,-13), (12,-17), (-12,-17) |
| Nosecone | (0.92, 0.1, 0.06, 1) | (-12,-16), (0,-38), (12,-16) |
| FinLeft | (0.38, 0.38, 0.26, 1) | (-12,14), (-24,28), (-12,22) |
| FinRight | (0.38, 0.38, 0.26, 1) | (12,14), (24,28), (12,22) |

### Rocket Fire — orange/red flame

- Flame gradient: (1,0.95,0.7,1) -> (1,0.72,0.05,1) -> (1,0.3,0,0.85) -> (0.85,0.08,0,0.4) -> (0.3,0.02,0,0)

---

## 8. Super Missile

**Root:** `Area2D` (script: `super_missile.gd`)
**Collision:** Capsule, radius=18, height=96 (much larger)
**Gravity:** 80 px/s^2 initially, drops to 15 when parachute deploys
**Group:** `enemy_missiles`
**Parachute speed:** 35 px/s terminal velocity

### Body polygons (parent = root)

| Name | Color | Vertices |
|------|-------|----------|
| BodyGlow | (1.0, 0.3, 0.05, 0.25) | (-22,38), (22,38), (22,-24), (-22,-24) |
| Body | (0.28, 0.22, 0.22, 1) | (-18,32), (18,32), (18,-20), (-18,-20) |
| BodyStripe1 | (0.85, 0.65, 0.0, 1) | (-18,12), (18,12), (18,6), (-18,6) |
| BodyStripe2 | (0.85, 0.65, 0.0, 1) | (-18,0), (18,0), (18,-6), (-18,-6) |
| BodyDetail | (0.22, 0.17, 0.17, 1) | (-18,-8), (18,-8), (18,-12), (-18,-12) |
| WarheadBand | (0.75, 0.72, 0.1, 1) | (-19,-18), (19,-18), (19,-22), (-19,-22) |
| Nosecone | (0.92, 0.1, 0.05, 1) | (-18,-20), (0,-48), (18,-20) |
| FinLeft | (0.22, 0.17, 0.17, 1) | (-18,24), (-30,38), (-18,32) |
| FinRight | (0.22, 0.17, 0.17, 1) | (18,24), (30,38), (18,32) |
| FinCenter | (0.22, 0.17, 0.17, 1) | (-5,28), (5,28), (5,38), (-5,38) |

### Parachute (parent = Parachute node, position offset (0, 34), initially hidden)

Visible only when `parachute_deployed = true`. Billows with `rotation = sin(swayTime * 2.0) * 0.08`.

| Name | Color | Vertices |
|------|-------|----------|
| Canopy | (0.85, 0.85, 0.8, 0.9) | (-45,0), (-40,-20), (-25,-32), (0,-38), (25,-32), (40,-20), (45,0), (30,4), (15,6), (0,7), (-15,6), (-30,4) |
| CanopyStripe1 | (0.9, 0.3, 0.1, 0.7) | (-15,1), (-10,-30), (0,-35), (10,-30), (15,1), (5,4), (0,5), (-5,4) |
| CanopyStripe2 | (0.9, 0.3, 0.1, 0.7) | (-40,-10), (-35,-22), (-25,-28), (-20,-18), (-30,-5) |
| CanopyStripe3 | (0.9, 0.3, 0.1, 0.7) | (40,-10), (35,-22), (25,-28), (20,-18), (30,-5) |

### Parachute Lines (draw as lines, width=1)

| Name | Color | From | To |
|------|-------|------|----|
| LineLeft | (0.4, 0.4, 0.35, 0.8) | (-42, 0) | (-10, -35) |
| LineRight | (0.4, 0.4, 0.35, 0.8) | (42, 0) | (10, -35) |
| LineCenterL | (0.4, 0.4, 0.35, 0.8) | (-20, -3) | (-5, -35) |
| LineCenterR | (0.4, 0.4, 0.35, 0.8) | (20, -3) | (5, -35) |

### Rocket Fire — same orange gradient as regular missile, larger (radius 4, 35 particles)

---

## 9. Drone

**Root:** `Area2D` (script: `drone.gd`)
**Collision:** Rectangle 80x18
**Group:** `enemy_missiles`
**Speed:** 130 px/s horizontal
**Visual node flips horizontally** based on direction: `Visual.scale.x = direction` (1 or -1)

All polygons are under a `Visual` Node2D child. Apply `ctx.scale(direction, 1)` before drawing.

| Name | Color | Vertices |
|------|-------|----------|
| Body | (0.30, 0.52, 0.75, 1) | (-45,0), (-28,-5), (-5,-7), (20,-5), (40,-2), (45,0), (40,2), (20,5), (-5,7), (-28,5) |
| Cockpit | (0.15, 0.70, 1.0, 1) | (8,-5), (28,-4), (38,0), (28,4), (8,5), (15,0) |
| UpperWing | (0.22, 0.42, 0.62, 0.95) | (-8,-7), (12,-7), (-2,-28), (-22,-10) |
| LowerFin | (0.20, 0.38, 0.58, 0.95) | (-8,7), (5,7), (-5,22), (-22,10) |
| TailFin | (0.25, 0.45, 0.65, 1) | (-35,0), (-50,-14), (-47,0), (-50,5), (-35,1) |
| EngineGlow | (1.0, 0.7, 0.15, 1) | (-48,0), (-44,-4), (-40,0), (-44,4) |

**EngineGlow animation:** `modulate.a = 0.55 + sin(time * 0.01) * 0.4` (use `performance.now()` for time)

---

## 10. Suicide Drone

**Root:** `Area2D` (script: `suicide_drone.gd`)
**Collision:** Circle, radius=24
**Group:** `enemy_missiles`
**States:** WANDER -> LOCK -> DIVE
**Wander speed:** 140 px/s, **Dive speed:** 380 px/s

All polygons under `Visual` Node2D child. Visual rotation tracks `wander_angle` (wander) or `velocity.angle()` (dive).

| Name | Color | Vertices |
|------|-------|----------|
| Body | (0.65, 0.10, 0.08, 1) | (-40,0), (-24,-5), (-2,-6), (18,-4), (36,-2), (42,0), (36,2), (18,4), (-2,6), (-24,5) |
| Cockpit | (1.0, 0.20, 0.05, 1) | (5,-4), (24,-3), (36,0), (24,3), (5,4), (12,0) |
| UpperWing | (0.50, 0.08, 0.06, 0.95) | (-5,-6), (14,-6), (-6,-28), (-24,-9) |
| LowerWing | (0.50, 0.08, 0.06, 0.95) | (-5,6), (14,6), (-6,28), (-24,9) |
| TailFin | (0.45, 0.08, 0.06, 1) | (-32,0), (-48,-13), (-44,0), (-48,5), (-32,1) |
| EngineGlow | (1.0, 0.35, 0.0, 1) | (-44,0), (-40,-5), (-35,0), (-40,5) |

**EngineGlow animation:**
- Wander: `alpha = 0.5 + sin(time * 0.007) * 0.35`
- Dive: `alpha = 0.5 + sin(time * 0.025) * 0.5` (rapid pulse)
- Dive body tint: `modulate = Color(1.0 + pulse*0.4, 1.0, 1.0, 1.0)` where `pulse = 0.5 + sin(time * 0.025) * 0.5`

**Lock flash animation:** 4-step tween: bright orange -> white -> bright orange -> white over ~0.44s total

---

## 11. Vulkan Bullet

**Root:** `Area2D` (script: `vulkan_bullet.gd`)
**Collision:** Circle, radius=6
**Speed:** 1800 px/s
**Lifetime:** 1.2s
**Spread:** +/- 0.04 radians (~2.3 degrees)

| Name | Color | Vertices |
|------|-------|----------|
| TracerGlow | (1, 0.9, 0.3, 0.4) | (-4,8), (4,8), (4,-4), (-4,-4) |
| TracerCore | (1, 1, 0.7, 0.9) | (-2,6), (2,6), (2,-3), (-2,-3) |
| TracerTip | (1, 0.5, 0.1, 1) | (-2,-3), (0,-7), (2,-3) |

**Fade:** After 70% lifetime, alpha lerps from 1.0 to 0.0.

---

## 12. Crater

**Root:** `Node2D` (no script, no collision)
**z_index:** -1 (drawn behind game entities)
**Scale varies by context:**
- Player missile hit: scale (1, 1)
- Enemy missile terrain hit: scale (1.5, 1.5)
- Launcher destruction: scale (3, 3)
- Super missile terrain: scale (5, 5)
- Super missile launcher: scale (7, 7)

| Name | Color | Vertices |
|------|-------|----------|
| OuterRim | (0.15, 0.15, 0.1, 1) | (-20,-8), (-15,-12), (-8,-15), (0,-16), (8,-15), (15,-12), (20,-8), (20,8), (15,12), (8,15), (0,16), (-8,15), (-15,12), (-20,8) |
| MiddleRim | (0.12, 0.12, 0.08, 1) | (-15,-6), (-10,-9), (-6,-11), (0,-12), (6,-11), (10,-9), (15,-6), (15,6), (10,9), (6,11), (0,12), (-6,11), (-10,9), (-15,6) |
| InnerCrater | (0.08, 0.08, 0.05, 1) | (-10,-4), (-7,-7), (-4,-8), (0,-9), (4,-8), (7,-7), (10,-4), (10,4), (7,7), (4,8), (0,9), (-4,8), (-7,7), (-10,4) |
| Scorch1 | (0.05, 0.05, 0.03, 0.6) | (-25,-3), (-18,-8), (-12,-5), (-15,0) |
| Scorch2 | (0.05, 0.05, 0.03, 0.6) | (18,-8), (25,-3), (22,2), (15,-2) |
| Scorch3 | (0.05, 0.05, 0.03, 0.6) | (-8,18), (-3,25), (3,22), (0,15) |
| Debris1 | (0.3, 0.25, 0.2, 1) | (-30,5), (-28,3), (-26,5), (-28,7) |
| Debris2 | (0.3, 0.25, 0.2, 1) | (26,-6), (28,-8), (30,-6), (28,-4) |
| Debris3 | (0.3, 0.25, 0.2, 1) | (5,28), (7,26), (9,28), (7,30) |

---

## 13. Explosion / Mega Explosion

**Important:** The explosion scenes use CPUParticles2D nodes, NOT Polygon2D. These cannot be directly translated to polygon data. The visual rendering for explosions is handled entirely by `explosion.gd` using procedural `_draw()` calls (circles, arcs, lines, colored polygons for debris).

The `.tscn` particle systems serve as eye-candy layered on top. For the web version, the `explosion.gd` `_draw()` method is the source of truth. The key visual parameters from the .tscn files that inform the procedural replacement:

### Explosion (normal)

| Layer | Particle Count | Lifetime | Speed Range | Gravity | Color |
|-------|---------------|----------|-------------|---------|-------|
| Flash | 5 | 0.12s | 0-15 | 0 | (1, 1, 0.92) white flash |
| Core | 25 | 0.25s | 50-120 | 0 | (1, 0.85, 0.2) yellow |
| Fire | 35 | 0.4s | 30-70 | (0, 40) | (1, 0.5, 0.1) orange |
| SecondaryFire | 15 | 0.5s | 15-45 | (0, 20) | (1, 0.35, 0.08) deep orange |
| Sparks | 45 | 0.9s | 140-350 | (0, 280) | (1, 0.85, 0.3) bright yellow |
| Embers | 28 | 1.3s | 35-110 | (0, 45) | (1, 0.55, 0.12) orange |
| Smoke | 18 | 0.7s | 12-40 | (0, -20) | (0.28, 0.25, 0.22, 0.55) gray |
| RisingSmoke | 16 | 1.6s | 10-30 | (0, -40) | (0.2, 0.2, 0.2, 0.3) dark gray |
| Debris | 35 | 1.1s | 120-300 | (0, 380) | (0.55, 0.45, 0.3) brown |
| MetalDebris | 16 | 1.2s | 160-380 | (0, 500) | (0.7, 0.7, 0.7) silver |
| GroundDust | 12 | 0.6s | 30-80 | (0, 10) | (0.4, 0.35, 0.28, 0.4) dust |

### Mega Explosion

Roughly 1.5-2x all values. Additionally has:
- **FireballRing:** 20 particles, 0.4s, speed 150-250, color (1, 0.7, 0.15, 0.8) — expanding ring
- **Shockwave:** 3 particles, 0.35s, scale 25-35, color (1, 0.8, 0.5, 0.3) — visible shockwave ring

**For web implementation:** Use the procedural `_draw()` system from `explosion.gd` (see ARCHITECTURE.md section on explosion effects). The particle data above is reference for matching the visual density and feel.

---

## Quick Reference: Game Positions

| Entity | X | Y |
|--------|---|---|
| SAM Launcher | 400 | 1220 |
| Heat-Seeking Launcher | 900 | 1220 |
| Truck Launcher | 1400 | 1220 |
| Vulkan Cannon | 1900 | 1220 |
| Terrain | 0 | 1240 |

## Quick Reference: Collision Shapes

| Entity | Shape | Size |
|--------|-------|------|
| SAM Launcher | Rectangle | 80x100, offset (0,-10) |
| Truck Launcher | Rectangle | 115x75, offset (0,0) |
| Heat-Seeking Launcher | Rectangle | 90x100, offset (0,-18) |
| Vulkan Cannon | Rectangle | 70x80, offset (0,-10) |
| Player Missile | Capsule | radius=11, height=64 |
| Heat-Seeking Missile | Capsule | radius=11, height=64 |
| Enemy Missile | Capsule | radius=12, height=68 |
| Super Missile | Capsule | radius=18, height=96 |
| Drone | Rectangle | 80x18 |
| Suicide Drone | Circle | radius=24 |
| Vulkan Bullet | Circle | radius=6 |

**For collision in Canvas:** Use the largest dimension as a circle radius for simplicity. Capsules with radius 11-12 can use collisionRadius ~15. Rectangles use half-diagonal or largest half-dimension.
