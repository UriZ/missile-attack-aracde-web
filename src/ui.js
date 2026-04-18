/**
 * UI — HUD, wave banner, crosshair, and overlay screens.
 *
 * All rendering uses Canvas 2D (no HTML elements).
 * Call drawHUD / drawCrosshair / drawWaveBanner from game.render() after
 * renderer.beginUI() has been called so the shake offset is excluded.
 */

import { Renderer } from './engine/renderer.js';
import { rgba, clamp, lerp } from './utils.js';

// ── Layout constants (logical coords, 2560×1440) ──────────────────────────

const LOGICAL_W = Renderer.LOGICAL_W; // 2560
const LOGICAL_H = Renderer.LOGICAL_H; // 1440

// Launcher HUD panel — bottom-left corner
const LAUNCHER_PANEL_X = 30;
const LAUNCHER_PANEL_Y = LOGICAL_H - 30;
const LAUNCHER_CARD_W = 220;
const LAUNCHER_CARD_H = 90;
const LAUNCHER_CARD_GAP = 14;

// Known launcher slots (match Godot positions in SCENE_DATA.md)
// Order corresponds to key 1–4.
const LAUNCHER_SLOTS = [
  { key: '1', type: 'sam',        label: 'SAM'     },
  { key: '2', type: 'heatseeker', label: 'HEAT-SK' },
  { key: '3', type: 'truck',      label: 'TRUCK'   },
  { key: '4', type: 'vulkan',     label: 'VULKAN'  },
];

// Wave banner animation phases
const BANNER_FADE_IN  = 0.35; // seconds
const BANNER_HOLD     = 1.80; // seconds
const BANNER_FADE_OUT = 0.45; // seconds
// Crosshair geometry
const CROSSHAIR_GAP       = 14;  // gap around center (px)
const CROSSHAIR_LINE_LEN  = 32;  // length of each crosshair arm
const CROSSHAIR_BRACKET   = 10;  // corner bracket leg length
const CROSSHAIR_BRACKET_D = 18;  // distance from centre to bracket corner
const HEAT_LOCK_RADIUS    = 50;  // lock-circle radius for heat-seeker mode
const TARGET_RING_RADIUS  = 22;  // ring drawn around locked target

// Heat bar
const HEAT_BAR_X      = LAUNCHER_PANEL_X;
const HEAT_BAR_BOTTOM = LAUNCHER_PANEL_Y - LAUNCHER_CARD_H - 20;
const HEAT_BAR_W      = 200;
const HEAT_BAR_H      = 22;

// ── Color helpers ─────────────────────────────────────────────────────────

/** Interpolate between two CSS rgba strings using a linear t in [0,1]. */
function lerpColor(r1, g1, b1, r2, g2, b2, t) {
  return rgba(
    lerp(r1, r2, t),
    lerp(g1, g2, t),
    lerp(b1, b2, t),
  );
}

/** Derive heat-bar fill color from heat 0..1. */
function heatBarColor(heat) {
  if (heat < 0.5) {
    // green → yellow
    return lerpColor(0.2, 0.85, 0.3, 0.9, 0.85, 0.1, heat * 2);
  }
  if (heat < 0.8) {
    // yellow → orange
    return lerpColor(0.9, 0.85, 0.1, 1.0, 0.5, 0.05, (heat - 0.5) / 0.3);
  }
  // orange → red
  return lerpColor(1.0, 0.5, 0.05, 1.0, 0.1, 0.05, (heat - 0.8) / 0.2);
}

// ── UI class ──────────────────────────────────────────────────────────────

export class UI {
  /**
   * @param {Renderer} renderer
   */
  constructor(renderer) {
    this._renderer = renderer;

    // Wave banner state
    this._bannerText  = '';
    this._bannerColor = rgba(1, 0.85, 0.1);
    this._bannerTimer = 0;
    this._bannerPhase = 'idle'; // 'idle' | 'fadein' | 'hold' | 'fadeout'
  }

  // ── Public API ────────────────────────────────────────────────────────

  /**
   * Trigger a wave banner animation.
   * @param {string} text   — e.g. "WAVE 3" or "WAVE 3 CLEAR"
   * @param {string} [color] — CSS color string (default: gold)
   */
  showWaveBanner(text, color = rgba(1, 0.85, 0.1)) {
    this._bannerText  = text;
    this._bannerColor = color;
    this._bannerTimer = 0;
    this._bannerPhase = 'fadein';
  }

  // ── Per-frame draw methods ─────────────────────────────────────────────

  /**
   * Main HUD — score, wave number, contextual info text, launcher panel, heat bar.
   * Must be called after renderer.beginUI().
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} game — Game instance
   */
  drawHUD(ctx, game) {
    if (game.state === 'start') return; // start screen handled by game.js

    // ── Score + wave (top-left) ──
    const scoreText = `Score: ${game.score}`;
    this._renderer.drawText(scoreText, 40, 36, 'bold 40px monospace', rgba(1, 1, 1), 'left');
    if (game.waveNumber > 0) {
      const waveText = `Wave ${game.waveNumber}`;
      this._renderer.drawText(waveText, 40, 84, '32px monospace', rgba(0.7, 0.85, 1), 'left');
    }

    // ── Contextual info (top-center) ──
    const infoMsg = this._getInfoText(game);
    if (infoMsg) {
      this._renderer.drawText(
        infoMsg,
        LOGICAL_W / 2, 36,
        '30px monospace',
        rgba(0.85, 0.85, 0.85, 0.85),
        'center',
      );
    }

    // ── Launcher panel (bottom-left) ──
    this._drawLauncherPanel(ctx, game);

    // ── Heat bar (only when vulkan selected and has accumulated heat) ──
    const sel = game.selectedLauncher;
    if (sel && sel.type === 'vulkan' && sel.alive && sel.heat > 0.01) {
      this._drawHeatBar(ctx, sel.heat, sel.overheated);
    }

    // ── Game Over overlay ──
    if (game.state === 'gameover') {
      this._drawGameOverOverlay(ctx, game.score);
    }
  }

  /**
   * Animated wave banner centred on screen.
   * Must be called after renderer.beginUI().
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} dt — delta time in seconds
   */
  drawWaveBanner(ctx, dt) {
    if (this._bannerPhase === 'idle') return;

    this._bannerTimer += dt;
    let alpha = 1;

    if (this._bannerPhase === 'fadein') {
      alpha = clamp(this._bannerTimer / BANNER_FADE_IN, 0, 1);
      if (this._bannerTimer >= BANNER_FADE_IN) {
        this._bannerPhase = 'hold';
        this._bannerTimer = 0;
      }
    } else if (this._bannerPhase === 'hold') {
      alpha = 1;
      if (this._bannerTimer >= BANNER_HOLD) {
        this._bannerPhase = 'fadeout';
        this._bannerTimer = 0;
      }
    } else if (this._bannerPhase === 'fadeout') {
      alpha = clamp(1 - this._bannerTimer / BANNER_FADE_OUT, 0, 1);
      if (this._bannerTimer >= BANNER_FADE_OUT) {
        this._bannerPhase = 'idle';
        this._bannerTimer = 0;
        return;
      }
    }

    const cx = LOGICAL_W / 2;
    const cy = LOGICAL_H / 2;

    // Subtle dark semi-transparent backdrop strip
    ctx.save();
    ctx.globalAlpha = alpha * 0.45;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(cx - 520, cy - 70, 1040, 130);
    ctx.restore();

    // Main banner text
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 96px monospace';
    ctx.fillStyle = this._bannerColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Drop shadow
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 18;
    ctx.fillText(this._bannerText, cx, cy);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  /**
   * Crosshair drawn at the logical mouse position.
   * Mode depends on selected launcher type and lock state.
   * Must be called after renderer.beginUI().
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} game — Game instance
   */
  drawCrosshair(ctx, game) {
    if (game.state === 'start') return;

    // Clamp cursor so crosshair arms never clip outside the canvas edges.
    const _margin = CROSSHAIR_GAP + CROSSHAIR_LINE_LEN;
    const mx = clamp(game.input.mouseX, _margin, LOGICAL_W - _margin);
    const my = clamp(game.input.mouseY, _margin, LOGICAL_H - _margin);
    const sel = game.selectedLauncher;

    const isHeat   = sel && sel.type === 'heatseeker' && sel.alive;
    // game.lockedTarget may be set by game.js when heat-seeker launcher has a lock
    const locked   = isHeat && game.lockedTarget && game.lockedTarget.alive;

    if (locked) {
      // Apply camera shake offset so the target ring follows the entity visually
      const shakeX = game.renderer ? game.renderer.cameraOffsetX : 0;
      const shakeY = game.renderer ? game.renderer.cameraOffsetY : 0;
      this._drawLockedCrosshair(ctx, mx, my, game.lockedTarget, shakeX, shakeY);
    } else if (isHeat) {
      this._drawHeatCrosshair(ctx, mx, my);
    } else {
      this._drawDefaultCrosshair(ctx, mx, my);
    }
  }

  // ── Private draw helpers ───────────────────────────────────────────────

  /**
   * Build contextual info string for the selected launcher.
   * @param {object} game
   * @returns {string}
   */
  _getInfoText(game) {
    const sel = game.selectedLauncher;
    if (!sel) return 'Click a launcher to select   [1-4] select launcher';
    if (!sel.alive) return 'LAUNCHER DESTROYED — select another';
    switch (sel.type) {
      case 'sam':
        return 'SAM — Click to fire missile';
      case 'heatseeker':
        return 'HEAT-SEEKER — Hold near target to lock, click to fire';
      case 'truck':
        return 'TRUCK — Click to fire rocket';
      case 'vulkan':
        return 'VULKAN — Hold click to fire   (watch heat!)';
      default:
        return '';
    }
  }

  /**
   * Draw the launcher status panel (bottom-left).
   * Shows up to 4 cards, one per launcher slot, with key number, type label,
   * selected highlight, and destroyed state.
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} game
   */
  _drawLauncherPanel(ctx, game) {
    const launchers = game.entities ? game.entities.getGroup('launchers') : [];

    // Build a lookup: type → launcher entity (take first match per type)
    /** @type {Map<string, object>} */
    const byType = new Map();
    for (const l of launchers) {
      if (!byType.has(l.type)) byType.set(l.type, l);
    }

    for (let i = 0; i < LAUNCHER_SLOTS.length; i++) {
      const slot     = LAUNCHER_SLOTS[i];
      const launcher = byType.get(slot.type) || null;
      const isAlive  = launcher && launcher.alive;
      // Check selected: compare by reference OR by type (if selectedLauncher not in group yet)
      const isSel    = launcher && game.selectedLauncher === launcher;

      const cardX = LAUNCHER_PANEL_X + i * (LAUNCHER_CARD_W + LAUNCHER_CARD_GAP);
      const cardY = LAUNCHER_PANEL_Y - LAUNCHER_CARD_H;

      this._drawLauncherCard(ctx, cardX, cardY, slot, isAlive, isSel, launcher);
    }
  }

  /**
   * Draw a single launcher card.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x — top-left x
   * @param {number} y — top-left y
   * @param {{ key: string, type: string, label: string }} slot
   * @param {boolean} isAlive
   * @param {boolean} isSelected
   * @param {object|null} launcher
   */
  _drawLauncherCard(ctx, x, y, slot, isAlive, isSelected, launcher) {
    const w = LAUNCHER_CARD_W;
    const h = LAUNCHER_CARD_H;

    ctx.save();

    // Card background
    if (isSelected) {
      // Highlighted background
      ctx.fillStyle = 'rgba(40,90,160,0.72)';
    } else if (!isAlive) {
      // Destroyed — very dark
      ctx.fillStyle = 'rgba(20,12,12,0.80)';
    } else {
      ctx.fillStyle = 'rgba(10,14,22,0.72)';
    }
    _roundRect(ctx, x, y, w, h, 8);
    ctx.fill();

    // Border
    if (isSelected) {
      ctx.strokeStyle = rgba(0.4, 0.7, 1.0, 0.9);
      ctx.lineWidth = 2.5;
    } else if (!isAlive) {
      ctx.strokeStyle = rgba(0.35, 0.2, 0.2, 0.5);
      ctx.lineWidth = 1.5;
    } else {
      ctx.strokeStyle = rgba(0.35, 0.45, 0.55, 0.5);
      ctx.lineWidth = 1.5;
    }
    _roundRect(ctx, x, y, w, h, 8);
    ctx.stroke();

    // Key number (top-left inside card)
    ctx.font = 'bold 26px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = isSelected ? rgba(0.6, 0.85, 1) : rgba(0.5, 0.55, 0.6, 0.8);
    ctx.fillText(`[${slot.key}]`, x + 10, y + 10);

    // Type label (centre-left)
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    if (!isAlive) {
      ctx.fillStyle = rgba(0.55, 0.25, 0.25, 0.7);
    } else if (isSelected) {
      ctx.fillStyle = rgba(1, 1, 1);
    } else {
      ctx.fillStyle = rgba(0.75, 0.82, 0.88);
    }
    ctx.fillText(slot.label, x + 10, y + h / 2 + 6);

    // "DESTROYED" label if dead
    if (!isAlive) {
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = rgba(0.85, 0.25, 0.2, 0.9);
      ctx.fillText('DESTROYED', x + w - 10, y + h - 8);
    }

    // READY indicator (small dot) when alive and not selected
    if (isAlive && !isSelected) {
      ctx.beginPath();
      ctx.arc(x + w - 16, y + 16, 5, 0, Math.PI * 2);
      ctx.fillStyle = rgba(0.2, 0.85, 0.4, 0.8);
      ctx.fill();
    }

    // Selected indicator (bright dot)
    if (isSelected) {
      ctx.beginPath();
      ctx.arc(x + w - 16, y + 16, 5, 0, Math.PI * 2);
      ctx.fillStyle = rgba(0.4, 0.9, 1.0);
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Draw the heat bar for the Vulkan Cannon.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} heat — 0..1
   * @param {boolean} overheated
   */
  _drawHeatBar(ctx, heat, overheated) {
    const x = HEAT_BAR_X;
    const y = HEAT_BAR_BOTTOM - HEAT_BAR_H;
    const w = HEAT_BAR_W;
    const h = HEAT_BAR_H;

    ctx.save();

    // Label
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = rgba(0.7, 0.75, 0.8, 0.9);
    ctx.fillText('HEAT', x, y - 4);

    // Track (background)
    ctx.fillStyle = 'rgba(8,6,6,0.75)';
    _roundRect(ctx, x, y, w, h, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(80,60,60,0.6)';
    ctx.lineWidth = 1.5;
    _roundRect(ctx, x, y, w, h, 4);
    ctx.stroke();

    // Fill
    const fillW = clamp(heat, 0, 1) * (w - 4);
    if (fillW > 0) {
      ctx.fillStyle = overheated
        ? rgba(1, 0.1 + 0.2 * Math.sin(Date.now() * 0.012), 0.05)
        : heatBarColor(heat);
      _roundRect(ctx, x + 2, y + 2, fillW, h - 4, 3);
      ctx.fill();
    }

    // OVERHEATED warning text
    if (overheated) {
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Blink at ~3 Hz
      const blink = Math.sin(Date.now() * 0.019) > 0;
      if (blink) {
        ctx.fillStyle = rgba(1, 0.9, 0.9);
        ctx.fillText('OVERHEATED', x + w / 2, y + h / 2);
      }
    }

    ctx.restore();
  }

  /**
   * Default crosshair: light-gray lines + gap + corner brackets + center dot.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} mx
   * @param {number} my
   */
  _drawDefaultCrosshair(ctx, mx, my) {
    const color = rgba(0.75, 0.8, 0.8, 0.85);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;

    // Horizontal arms
    _hline(ctx, mx - CROSSHAIR_GAP - CROSSHAIR_LINE_LEN, my, mx - CROSSHAIR_GAP, my);
    _hline(ctx, mx + CROSSHAIR_GAP, my, mx + CROSSHAIR_GAP + CROSSHAIR_LINE_LEN, my);
    // Vertical arms
    _vline(ctx, mx, my - CROSSHAIR_GAP - CROSSHAIR_LINE_LEN, mx, my - CROSSHAIR_GAP);
    _vline(ctx, mx, my + CROSSHAIR_GAP, mx, my + CROSSHAIR_GAP + CROSSHAIR_LINE_LEN);

    // Corner brackets (four corners, each is an L-shape)
    const d = CROSSHAIR_BRACKET_D;
    const b = CROSSHAIR_BRACKET;
    _bracket(ctx, mx - d, my - d,  b,  b); // top-left
    _bracket(ctx, mx + d, my - d, -b,  b); // top-right
    _bracket(ctx, mx - d, my + d,  b, -b); // bottom-left
    _bracket(ctx, mx + d, my + d, -b, -b); // bottom-right

    // Center dot
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(mx, my, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Heat-seeker crosshair: red + lock circle around cursor.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} mx
   * @param {number} my
   */
  _drawHeatCrosshair(ctx, mx, my) {
    const color = rgba(0.95, 0.2, 0.15, 0.9);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;

    // Arms (same shape as default)
    _hline(ctx, mx - CROSSHAIR_GAP - CROSSHAIR_LINE_LEN, my, mx - CROSSHAIR_GAP, my);
    _hline(ctx, mx + CROSSHAIR_GAP, my, mx + CROSSHAIR_GAP + CROSSHAIR_LINE_LEN, my);
    _vline(ctx, mx, my - CROSSHAIR_GAP - CROSSHAIR_LINE_LEN, mx, my - CROSSHAIR_GAP);
    _vline(ctx, mx, my + CROSSHAIR_GAP, mx, my + CROSSHAIR_GAP + CROSSHAIR_LINE_LEN);

    // Lock circle
    ctx.beginPath();
    ctx.arc(mx, my, HEAT_LOCK_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    // Center dot
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(mx, my, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Locked-on crosshair: bright red crosshair + lock circle + ring around target +
   * dashed line from cursor to target.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} mx
   * @param {number} my
   * @param {object} target — enemy entity with x,y properties
   * @param {number} [shakeX=0] — camera shake X offset to keep ring on entity
   * @param {number} [shakeY=0] — camera shake Y offset to keep ring on entity
   */
  _drawLockedCrosshair(ctx, mx, my, target, shakeX = 0, shakeY = 0) {
    // Adjust target draw position by shake so the ring stays on the entity visually
    const tx = target.x + shakeX;
    const ty = target.y + shakeY;

    const brightRed = rgba(1, 0.08, 0.06, 1);
    ctx.save();
    ctx.strokeStyle = brightRed;
    ctx.lineWidth = 2;

    // Crosshair arms
    _hline(ctx, mx - CROSSHAIR_GAP - CROSSHAIR_LINE_LEN, my, mx - CROSSHAIR_GAP, my);
    _hline(ctx, mx + CROSSHAIR_GAP, my, mx + CROSSHAIR_GAP + CROSSHAIR_LINE_LEN, my);
    _vline(ctx, mx, my - CROSSHAIR_GAP - CROSSHAIR_LINE_LEN, mx, my - CROSSHAIR_GAP);
    _vline(ctx, mx, my + CROSSHAIR_GAP, mx, my + CROSSHAIR_GAP + CROSSHAIR_LINE_LEN);

    // Lock circle at cursor
    ctx.beginPath();
    ctx.arc(mx, my, HEAT_LOCK_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    // Ring around the locked target (shifted by shake so it follows the entity)
    ctx.strokeStyle = rgba(1, 0.15, 0.1, 0.85);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(tx, ty, TARGET_RING_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    // Dashed line from cursor to target
    ctx.strokeStyle = rgba(1, 0.15, 0.1, 0.5);
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.setLineDash([]);

    // Center dot
    ctx.fillStyle = brightRed;
    ctx.beginPath();
    ctx.arc(mx, my, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Game Over overlay — dim background, GAME OVER text, score.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} score
   */
  _drawGameOverOverlay(ctx, score) {
    ctx.save();

    // Semi-transparent dark overlay
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

    // "GAME OVER"
    ctx.font = 'bold 120px monospace';
    ctx.fillStyle = rgba(1, 0.15, 0.12);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 24;
    ctx.fillText('GAME OVER', LOGICAL_W / 2, LOGICAL_H / 2 - 80);
    ctx.shadowBlur = 0;

    // Final score
    ctx.font = 'bold 56px monospace';
    ctx.fillStyle = rgba(1, 0.9, 0.7);
    ctx.fillText(`Final Score: ${score}`, LOGICAL_W / 2, LOGICAL_H / 2 + 50);

    // Play again hint
    ctx.font = '34px monospace';
    ctx.fillStyle = rgba(0.7, 0.75, 0.8, 0.7);
    ctx.fillText('Click to play again', LOGICAL_W / 2, LOGICAL_H / 2 + 150);

    ctx.restore();
  }
}

// ── Module-private canvas helpers ─────────────────────────────────────────

/**
 * Draw a horizontal line segment.
 * @param {CanvasRenderingContext2D} ctx
 */
function _hline(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

/**
 * Draw a vertical line segment (alias for _hline — both are just line segments).
 * @param {CanvasRenderingContext2D} ctx
 */
function _vline(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

/**
 * Draw an L-shaped corner bracket at (cx, cy).
 * dx/dy are the signed lengths along each axis.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} dx — horizontal arm direction (+right / -left)
 * @param {number} dy — vertical arm direction (+down / -up)
 */
function _bracket(ctx, cx, cy, dx, dy) {
  ctx.beginPath();
  ctx.moveTo(cx + dx, cy);  // horizontal end
  ctx.lineTo(cx, cy);        // corner
  ctx.lineTo(cx, cy + dy);  // vertical end
  ctx.stroke();
}

/**
 * Trace a rounded rectangle path. Does NOT stroke/fill — caller does that.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {number} r — corner radius
 */
function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}
