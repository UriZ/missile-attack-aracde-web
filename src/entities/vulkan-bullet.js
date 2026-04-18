/**
 * Vulkan bullet — translated from vulkan_bullet.gd.
 * Very fast tracer round, no gravity, short lifetime, fades near end.
 */

import { Entity } from './entity.js';
import { rgba, randf } from '../utils.js';
import { drawPoly } from './launcher.js';

const SPEED = 1800;
const LIFETIME = 1.2;
const SPREAD = 0.04; // ±radians (~2.3°)
const OFF_SCREEN = { top: -100, bottom: 1540, left: -100, right: 2660 };

// Polygon data from SCENE_DATA §11
const TRACER_GLOW = [-4,8, 4,8, 4,-4, -4,-4];
const TRACER_CORE = [-2,6, 2,6, 2,-3, -2,-3];
const TRACER_TIP = [-2,-3, 0,-7, 2,-3];

export class VulkanBullet extends Entity {
  constructor(x, y) {
    super(x, y);
    this.vx = 0;
    this.vy = 0;
    this._elapsed = 0;
    this.collisionRadius = 6;
    this.groups.add('player_missiles');

    /** @type {function|null} */
    this.onEnemyDestroyed = null;
  }

  /**
   * Fire bullet in a direction with random spread.
   * @param {number} dirX — normalized direction x
   * @param {number} dirY — normalized direction y
   */
  fire(dirX, dirY) {
    const angle = Math.atan2(dirY, dirX) + randf(-SPREAD, SPREAD);
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.rotation = angle + Math.PI / 2;
  }

  update(dt) {
    this._elapsed += dt;

    if (this._elapsed > LIFETIME) {
      this.alive = false;
      return;
    }

    // No gravity — straight line
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Off-screen
    if (this.y > OFF_SCREEN.bottom || this.y < OFF_SCREEN.top ||
        this.x < OFF_SCREEN.left || this.x > OFF_SCREEN.right) {
      this.alive = false;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    // Fade after 70% lifetime
    const fadeStart = LIFETIME * 0.7;
    if (this._elapsed > fadeStart) {
      ctx.globalAlpha = 1.0 - (this._elapsed - fadeStart) / (LIFETIME * 0.3);
    }

    drawPoly(ctx, TRACER_GLOW, rgba(1, 0.9, 0.3, 0.4));
    drawPoly(ctx, TRACER_CORE, rgba(1, 1, 0.7, 0.9));
    drawPoly(ctx, TRACER_TIP, rgba(1, 0.5, 0.1, 1));

    ctx.restore();
  }
}
