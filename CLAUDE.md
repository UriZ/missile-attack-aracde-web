# Missile Attack Arcade — HTML5/JS Reimplementation

## Overview
Browser-based reimplementation of a Godot 4.6 missile defense arcade game.
Original source: `/Users/urizonens/dev/multiagent/missile-attack-arcade/`

## Tech Stack
- **Rendering**: HTML5 Canvas 2D API (all visuals are procedural polygon drawing)
- **Audio**: Web Audio API (procedural sound synthesis — no audio files)
- **Language**: Vanilla JavaScript (ES modules)
- **Build**: None required — static files served directly
- **Viewport**: 2560x1440 logical, scaled to fit browser window

## Project Structure
```
index.html          — Entry point, canvas element
src/
  game.js           — Main game loop, state management
  renderer.js       — Canvas rendering pipeline
  input.js          — Mouse/keyboard input handling
  audio.js          — Web Audio procedural sound engine
  collision.js      — Collision detection system
  entities/
    launcher.js     — Base launcher class (turret tracking, selection)
    sam-launcher.js
    truck-launcher.js
    heat-seeking-launcher.js
    vulkan-cannon.js
    missile.js      — Player interceptor
    heat-seeking-missile.js
    vulkan-bullet.js
    enemy-missile.js
    super-missile.js
    drone.js
    suicide-drone.js
  terrain.js        — Deformable heightmap terrain + decorations
  explosion.js      — Procedural explosion effects
  ui.js             — HUD, score, wave banners, menus
  wave.js           — Wave generation and scheduling
```

## Key Design Decisions
- All entities are plain JS classes with `update(dt)` and `draw(ctx)` methods
- Game loop uses `requestAnimationFrame` with delta time
- Collision is checked each frame between relevant entity groups
- Terrain is a heightmap array rendered as canvas paths
- Audio uses Web Audio API oscillators and noise buffers to match Godot's procedural sounds

## Original Game Reference
See `/Users/urizonens/dev/multiagent/missile-attack-arcade/CLAUDE.md` for full architecture of the Godot version.

## Task Tracking via GitHub Issues (MANDATORY)

All tasks MUST be tracked as GitHub issues on `UriZ/missile-attack-aracde-web`. This provides an audit trail the user can review on GitHub. Do NOT use internal-only task tracking — GitHub issues are the source of truth.

### GitHub repo: `UriZ/missile-attack-aracde-web`

### Labels:
- `enhancement` — new feature or feature request
- `bug` — something broken found by QA
- `architect` — needs architect design before implementation
- `developer` — ready for developer implementation
- `qa` — needs QA verification
- `in-progress` — currently being worked on
- `won't fix` — decided not to fix (with reasoning in comment)

### Issue lifecycle:
1. **Feature request**: Create issue with `enhancement` + `architect` labels
2. **Architect designs**: Add design spec as a comment, relabel to `developer`
3. **Developer implements**: Add implementation notes as a comment, relabel to `qa`
4. **QA verifies**: If bugs found → create new `bug` issues. If clean → close the issue with a comment.
5. **Bug fix**: Developer fixes, relabels to `qa` for re-verification.

### How to create issues:
```bash
gh issue create --title "Title" --body "Description" --label "enhancement,architect"
```

### How to update issues:
```bash
gh issue comment NUMBER --body "Update text"
gh issue edit NUMBER --add-label "developer" --remove-label "architect"
gh issue close NUMBER --comment "Verified by QA"
```

### Agents and issues:
- When spawning an agent, tell it which issue number(s) it's working on
- Agents should reference issue numbers in their output
- Team lead updates the issues with agent TLDRs after completion
- The session log snapshots should reference issue numbers, not internal task IDs

## Session Logging (MANDATORY)

All multi-agent work MUST also be logged to `SESSION_LOG.md` in the project root. This complements GitHub issues with detailed inter-agent communication.

### What to log for every agent interaction:
1. **Agent spawn**: agent type, name, task summary, GitHub issue number(s)
2. **Agent result**: completion status, duration/tokens if available
3. **Agent TLDR**: A summary BY THE AGENT of what it did — which tools it used, what it read, what decisions it made, and why. This must come from the agent's own output, not be fabricated.
4. **Task list snapshot**: After each phase, include a markdown table linking to GitHub issues with their statuses.

### When to log:
- BEFORE spawning agents: note the spawn in the log
- AFTER agents complete: add their results and TLDR
- After each phase completes: add task list snapshot with issue links
- After direct implementation by team lead: log what was done, files changed, and reasoning

### Log format:
```markdown
## Iteration N: [Title]

### Phase N: [Phase Name]

**[Sender → Receiver agent]**
- **Agent type**: `type`
- **Task**: description
- **GitHub issues**: #N, #M
- **Duration**: Xs, N tool uses, Nk tokens

**[Agent → Team Lead] — COMPLETED/FAILED**
- **Agent TLDR**: [agent's own summary of what it did and why]

### Task List Snapshot
| Issue | Title | Status | Owner |
|-------|-------|--------|-------|
| #1 | ... | open/closed | ... |
```

### Multi-agent workflow:
The standard flow is: **Architect designs → Developers implement → QA finds bugs → Developers fix → QA validates**. Do NOT trust developer fixes blindly — always have QA verify.
