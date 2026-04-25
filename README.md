# Missile Attack Arcade

**TLDR:** Missile defense arcade game in the browser. Intercept incoming threats, defend your base, survive the waves. Zero dependencies — just serve and play.

## Quick Start

```bash
git clone https://github.com/UriZ/missile-attack-aracde-web.git
cd missile-attack-aracde-web
npx serve .
```

Open [http://localhost:3000](http://localhost:3000) and click **Play**.

That's it. No `npm install`, no build step, no dependencies required.


## Controls

| Input | Action |
|-------|--------|
| **Click** | Fire interceptor at cursor |
| **1 / 2 / 3 / 4** | Select launcher (SAM, Truck, Heat-Seeker, Vulkan) |
| **Hold click** (Vulkan) | Sustained minigun fire |

## Tech Stack

- HTML5 Canvas 2D — all visuals are procedural polygon drawing
- Web Audio API — procedural sound synthesis + ambient radio chatter MP3s
- Vanilla JavaScript (ES modules)
- No build step, no framework, no dependencies
