---
name: qa-screenshot
description: Take screenshots of the live game for QA testing. Runs Puppeteer against the game, cycles through launchers, fires weapons, captures gameplay, and returns screenshot paths + game state. Use for visual QA, bug verification, and feature testing.
user-invocable: true
argument-hint: "[--launcher N] [--duration SECS] [--wave-target N] [--inject CODE] [--no-start]"
allowed-tools: Bash, Read
---

# QA Screenshot Skill

Take screenshots of the live game using the Puppeteer tool.

## Usage

```bash
node .claude/skills/qa-screenshot/scripts/qa-screenshot.js {{ options }}
```

If no options provided, runs a full QA session (30s, 3 waves, cycles all launchers).

## After Running

1. Script prints screenshot paths to stdout — one per line
2. Read each screenshot with the Read tool to visually inspect
3. Game state JSON printed at end (score, wave, launchers alive, enemy count)
4. Console errors listed if any

## Common Scenarios

```bash
# Full QA run
node .claude/skills/qa-screenshot/scripts/qa-screenshot.js

# Test specific launcher
node .claude/skills/qa-screenshot/scripts/qa-screenshot.js --launcher 4 --duration 15

# Force-spawn entities
node .claude/skills/qa-screenshot/scripts/qa-screenshot.js --inject "game._spawnTransportPlane()"
node .claude/skills/qa-screenshot/scripts/qa-screenshot.js --inject "game._spawnNuke()"
node .claude/skills/qa-screenshot/scripts/qa-screenshot.js --inject "game._spawnSuperMissile()"

# Start screen only
node .claude/skills/qa-screenshot/scripts/qa-screenshot.js --no-start

# Longer session
node .claude/skills/qa-screenshot/scripts/qa-screenshot.js --duration 60 --wave-target 5
```

## Launcher Numbering

`--launcher N` maps to: 1=SAM, 2=Heat-Seeker, 3=Truck, 4=Vulkan

Note: The flag pre-selects the launcher at the start of gameplay. During the test sequence, the script still cycles through all launchers and fires with each.

## Notes

- Game must be running on localhost (default port 8000)
- Viewport is 1280x720 (game scales from 2560x1440 logical)
- Screenshots saved to `/tmp/qa-screenshots/` (cleaned each run)
- `--inject` evaluates JS in page context — use `game.XXX` to access game state
