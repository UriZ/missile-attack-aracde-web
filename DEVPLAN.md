# Missile Attack Arcade — Development Plan

Legend: ~~Strikethrough~~ = Done | **Bold** = In Progress/QA | Normal = Planned

---

### ~~1. Launcher Legend / HUD Overhaul~~ ✅
> Part of UI overhaul (#19). Score panel, launcher cards with key badges, heat bar, per-launcher crosshair colors — all implemented.

---

### ~~3. Enemy Missile & Heat-Seeker Tuning~~ ✅
> Done (#12, #17). Speed tuning, heat-seeker tracking, dramatic cursor on lock, target-acquired sound (procedural synth), radio chatter.

---

### ~~4. Enemy Drones~~ ✅
> Horizontal-flying drones with bomb drops. Suicide drone variant also implemented.

---

### ~~5. Enemy Nukes~~ ✅
> Done (#1, #2, #21). Fat Man bezier body, radiation-green palette, rotating trefoil, mushroom cloud (7-layer), nuke warning UI + siren. Visual redesign in QA (#21).

---

### ~~6. Vulkan Cannon~~ ✅
> Done (#11, #19). Redesigned as M134 rotary cannon — 6 spinning barrels in octagonal shroud, pedestal mount, ammo feed box, 3-stage heat glow, shell casings. In QA (#19).

---

### ~~7. UI Fixes — Launchers and Missiles~~ ✅
> Part of UI overhaul (#19). Launcher gradients, metallic missile bodies, crosshair changes per weapon, mega explosions (5-layer fireball, double shockwave). In QA.

---

### ~~8. Terrain Improvements~~ ✅
> Done. Ground/grass gradients, mountains with snow caps, atmospheric haze, building windows with lit/unlit variation.

---

### 8.1 Terrain Improvements Advanced
**Status:** Planned | **GitHub:** #16 (architect)

- Bigger mountains, canyons, valleys, rivers — more dramatic landscape
- Weather/scenery — snow, desert, day/night cycle
- Dynamic scenery/daytime system

---

### ~~9. Waves~~ ✅
> Done (#10). Randomized wave composition with budget system, difficulty scaling.

---

### ~~10. Outgoing Missile Sounds~~ ✅
> Done. Procedural launch sounds for all launcher types.

---

### ~~11. Super Missile Split~~ ✅
> Done (#20). Super missile splits into 4 tumbling MissileFragment entities on intercept. Parachute redesigned with 9-layer canopy. In QA (#20).

---

### **12. UI Overhaul** 🔄
**Status:** In QA | **GitHub:** #19

- Score panel, launcher cards, heat bar, wave banner, nuke warning banner
- Per-launcher crosshair colors (SAM steel blue, Truck amber, etc.)
- Explosion 5-layer fireball with blue-white core, double shockwave
- Terrain gradients, building windows
- Vulkan cannon M134 redesign
- All entity visuals upgraded (drone, enemy missile, launchers, missiles)
- **Awaiting user approval** — user was not satisfied with first pass

---

### 13. Startup Screen
**Status:** Partially done | **GitHub:** None

- ~~Start screen: vertical gradient, scanline overlay, glowing title, pulsing CTA~~ ✅
- ~~Game over: radial gradient 1overlay, triple-pass text~~ ✅
- Music: **Not started**

---

### **14. Paratroopers** 🔄
**Status:** In QA | **GitHub:** #24

- Transport plane flies horizontally, drops paratrooper soldiers
- Paratroopers freefall 0.3s then deploy green camo parachute
- Landing near a launcher (120px) destroys it
- Can be intercepted mid-air (2 points)
- Transport plane shootable (3 points, mega explosion)
- Spawns from wave 4+, costs 5 budget

---

### 15. Soldiers
**Status:** Planned | **GitHub:** None

- Soldiers come out of military barracks and operate turrets and use rpg
- Not yet designed or implemented

---

### 16. Upgrade Weapons
**Status:** Planned | **GitHub:** None

- Points → cash conversion system
- Spend cash to upgrade: better scopes, better missiles, longer Vulkan duration, etc.
- Shop/upgrade UI needed
- Not yet designed or implemented
- upgrade ideas
    - missile that split into multiple missiles (for the sam and truck) mid air
    - drones that fire missile, not just sucide drones (for the drone weapon)
    - vulkan with auto aim
    - double vulkan
    - sound blaster - an upgrde to the laser beam that shoots wide sound beams that kill multiple enemies


---

### 17 hunter drone
- have a weapon that sends out a hunter drone, that hunts for targets and kills them
---

### 18 mega shield
create a force field shield to temporarily protect all my assets... have limited access of those21
## Open Bugs

| # | Title | Status |
|---|-------|--------|
| #22 | Wave number duplicates during banner | Fixed, in QA |
| #23 | Heat-seeker lock circle too small | Fixed, in QA |

---
### 19 nuke interceptor 
create a nuker interceptor - whihch allows you to shoot nukes at eney missiles1


### 20 lazer interceptor
- implement an intereceptor that shoots lazer beams... it takes a second to worm up...

### 21 switch vision mode
- support two modes: night vision and thermal 
## GitHub Issue Tracker1

| # | Title | State | Labels |
|---|-------|-------|--------|
| #24 | Paratroopers | open | qa |
| #23 | Lock circle too small | open | bug, qa |
| #22 | Wave number duplicate | open | bug, qa |
| #21 | Nuke visual redesign | open | qa |
| #20 | Super missile split + parachute | open | qa |
| #19 | UI Overhaul | open | qa |
| #17 | Target acquired sound + cursor | open | enhancement |
| #16 | Dynamic scenery/daytime | open | architect |
| #14 | Radio chatter | open | qa |
| #12 | Heat-seeker tuning | open | qa |
