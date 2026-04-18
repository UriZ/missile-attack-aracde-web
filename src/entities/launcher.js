/**
 * Base Launcher class — translated from launcher.gd.
 * Handles turret tracking, selection glow pulse, click detection, launch position.
 * Subclasses provide polygon data and override draw().
 */

import { Entity } from './entity.js';
import { TAU, lerpAngle, clamp } from '../utils.js';

/**
 * Draw a polygon from a flat coordinate array [x0,y0, x1,y1, ...].
 * @param {CanvasRenderingContext2D} ctx
 * @param {number[]} coords — flat [x,y,...] pairs
 * @param {string} color — CSS fill color
 */
export function drawPoly(ctx, coords, color) {
  ctx.beginPath();
  for (let i = 0; i < coords.length; i += 2) {
    if (i === 0) ctx.moveTo(coords[i], coords[i + 1]);
    else ctx.lineTo(coords[i], coords[i + 1]);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

export class Launcher extends Entity {
  /**
   * @param {number} x
   * @param {number} y
   * @param {'sam'|'truck'|'heatseeker'|'vulkan'} type
   */
  constructor(x, y, type) {
    super(x, y);
    this.type = type;
    this.isSelected = false;
    this.turretRotation = 0;
    this.groups.add('launchers');

    // Selection glow animation
    this._glowAlpha = 0.35;
    this._glowDir = -1; // pulsing direction
    this._glowTime = 0;

    // Click detection bounds (half-width, half-height from center)
    this.clickHalfW = 40;
    this.clickHalfH = 50;

    // Turret tip offset for launch position (distance from origin along turret axis)
    this.turretTipOffset = -62;

    // Mouse position — set by game each frame
    this.mouseX = 0;
    this.mouseY = 0;

    /** @type {function|null} Called when launcher is clicked */
    this.onClick = null;
  }

  /**
   * @param {number} dt
   */
  update(dt) {
    // Turret tracking toward mouse
    const dx = this.mouseX - this.x;
    const dy = this.mouseY - this.y;
    let targetAngle = Math.atan2(dy, dx) + Math.PI / 2;
    // Clamp to ±80 degrees from vertical
    const limit = 80 * Math.PI / 180;
    targetAngle = clamp(targetAngle, -limit, limit);
    this.turretRotation = lerpAngle(this.turretRotation, targetAngle, 10.0 * dt);

    // Selection glow pulse (0.25 ↔ 0.5 over 0.6s each way)
    if (this.isSelected) {
      this._glowTime += dt;
      // Sine-based pulse between 0.25 and 0.5
      this._glowAlpha = 0.375 + 0.125 * Math.sin(this._glowTime * Math.PI / 0.6);
    }
  }

  /**
   * @param {boolean} selected
   */
  setSelected(selected) {
    this.isSelected = selected;
    this._glowTime = 0;
    this._glowAlpha = 0.35;
  }

  /**
   * Get the tip position of the turret for spawning projectiles.
   * @returns {{ x: number, y: number }}
   */
  getLaunchPosition() {
    // Godot: Vector2(0, turretTipOffset).rotated(turretRotation)
    // Standard 2D rotation of (0, offset):
    //   x' = -offset * sin(r)
    //   y' =  offset * cos(r)
    const r = this.turretRotation;
    const offset = this.turretTipOffset; // negative value (e.g. -62)
    return {
      x: this.x - offset * Math.sin(r),
      y: this.y + offset * Math.cos(r),
    };
  }

  /**
   * Check if a point (logical coordinates) is within click bounds.
   * @param {number} px
   * @param {number} py
   * @returns {boolean}
   */
  containsPoint(px, py) {
    return Math.abs(px - this.x) < this.clickHalfW &&
           Math.abs(py - this.y) < this.clickHalfH;
  }

  /**
   * Draw selection glow polygons. Call from subclass draw() when selected.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number[]} glow1 — inner glow polygon coords
   * @param {string} glow1Color — base color without alpha
   * @param {number[]} glow2 — outer glow polygon coords
   * @param {string} glow2Color — base color without alpha
   */
  _drawSelectionGlow(ctx, glow1, glow1Color, glow2, glow2Color) {
    if (!this.isSelected) return;
    // Outer glow (behind, lower alpha)
    drawPoly(ctx, glow2, glow2Color.replace(/[\d.]+\)$/, `${(this._glowAlpha * 0.43).toFixed(3)})`));
    // Inner glow
    drawPoly(ctx, glow1, glow1Color.replace(/[\d.]+\)$/, `${this._glowAlpha.toFixed(3)})`));
  }
}
