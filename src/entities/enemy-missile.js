/**
 * Enemy missile — translated from enemy_missile.gd.
 * Ballistic arc from sky toward terrain/launchers.
 */

import { Entity } from './entity.js';
import { rgba, randf } from '../utils.js';
import { drawPoly } from './launcher.js';

const GRAVITY = 200;
const OFF_SCREEN = { bottom: 1600, left: -100, right: 2660 };

// Polygon data from SCENE_DATA §7
const BODY_GLOW = [-16,26, 16,26, 16,-18, -16,-18];
const BODY = [-12,22, 12,22, 12,-16, -12,-16];
const BODY_PANEL = [-12,8, 12,8, 12,2, -12,2];
const WARHEAD_BAND = [-12,-13, 12,-13, 12,-17, -12,-17];
const NOSECONE = [-12,-16, 0,-38, 12,-16];
const FIN_LEFT = [-12,14, -24,28, -12,22];
const FIN_RIGHT = [12,14, 24,28, 12,22];

// Orange/red flame gradient
const FIRE_COLORS = [
  rgba(1, 0.95, 0.7, 1),
  rgba(1, 0.72, 0.05, 1),
  rgba(1, 0.3, 0, 0.85),
  rgba(0.85, 0.08, 0, 0.4),
  rgba(0.3, 0.02, 0, 0),
];

export class EnemyMissile extends Entity {
  constructor(x, y) {
    super(x, y);
    this.vx = 0;
    this.vy = 0;
    this.collisionRadius = 15;
    this.groups.add('enemy_missiles');

    /** @type {function|null} Called on terrain/launcher impact */
    this.onImpact = null;
  }

  /**
   * Calculate ballistic arc to target.
   * @param {number} targetX
   * @param {number} targetY
   * @param {number} launchTime
   */
  launchTo(targetX, targetY, launchTime = 2.0) {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    this.vx = dx / launchTime;
    this.vy = (dy - 0.5 * GRAVITY * launchTime * launchTime) / launchTime;
  }

  update(dt) {
    this.vy += GRAVITY * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.rotation = Math.atan2(this.vy, this.vx) + Math.PI / 2;

    // Off-screen cleanup
    if (this.y > OFF_SCREEN.bottom || this.x < OFF_SCREEN.left || this.x > OFF_SCREEN.right) {
      this.alive = false;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    drawPoly(ctx, BODY_GLOW, rgba(1.0, 0.25, 0.05, 0.22));
    drawPoly(ctx, BODY, rgba(0.52, 0.52, 0.36));
    drawPoly(ctx, BODY_PANEL, rgba(0.44, 0.44, 0.3));
    drawPoly(ctx, WARHEAD_BAND, rgba(0.88, 0.75, 0.08));
    drawPoly(ctx, NOSECONE, rgba(0.92, 0.1, 0.06));
    drawPoly(ctx, FIN_LEFT, rgba(0.38, 0.38, 0.26));
    drawPoly(ctx, FIN_RIGHT, rgba(0.38, 0.38, 0.26));

    // Rocket fire
    const flicker = 0.8 + Math.random() * 0.4;
    for (let i = 0; i < 6; i++) {
      const t = i / 5;
      const cy = 22 + i * 6 * flicker;
      const r = (7 - i * 0.9) * flicker;
      const colorIdx = Math.min(Math.floor(t * (FIRE_COLORS.length - 1)), FIRE_COLORS.length - 1);
      ctx.beginPath();
      ctx.arc(randf(-2, 2), cy, r, 0, Math.PI * 2);
      ctx.fillStyle = FIRE_COLORS[colorIdx];
      ctx.fill();
    }

    ctx.restore();
  }
}
