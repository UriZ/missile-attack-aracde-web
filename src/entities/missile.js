/**
 * Player interceptor missile — translated from missile.gd.
 * Ballistic arc with gravity, smoke trail, rocket fire visual.
 */

import { Entity } from './entity.js';
import { rgba, randf } from '../utils.js';
import { drawPoly } from './launcher.js';

const GRAVITY = 200; // px/s²
const TRAIL_INTERVAL = 0.04; // seconds between trail samples
const TRAIL_LENGTH = 18;
const OFF_SCREEN = { top: -100, bottom: 1540, left: -100, right: 2660 };
const MAX_LIFETIME = 8.0;

// Body polygon data from SCENE_DATA §5 (drawn in rotated context)
const BODY_GLOW = [-14,26, 14,26, 14,-18, -14,-18];
const BODY = [-11,22, 11,22, 11,-16, -11,-16];
const BODY_STRIPE = [-11,4, 11,4, 11,-2, -11,-2];
const NOSECONE = [-11,-16, 0,-36, 11,-16];
const NOSE_BAND = [-11,-14, 11,-14, 11,-17, -11,-17];
const FIN_LEFT = [-11,14, -22,26, -11,22];
const FIN_RIGHT = [11,14, 22,26, 11,22];

// Rocket fire gradient (white → yellow → orange → red)
const FIRE_COLORS = [
  rgba(1, 1, 0.85, 1),
  rgba(1, 0.82, 0.1, 1),
  rgba(1, 0.42, 0, 0.85),
  rgba(0.9, 0.12, 0, 0.45),
  rgba(0.35, 0.04, 0, 0),
];

export class Missile extends Entity {
  constructor(x, y) {
    super(x, y);
    this.vx = 0;
    this.vy = 0;
    this.elapsed = 0;
    this.collisionRadius = 15;
    this.groups.add('player_missiles');

    // Smoke trail ring buffer
    this._trail = []; // {x, y, age}
    this._trailTimer = 0;

    /** @type {function|null} Called when missile hits an enemy */
    this.onEnemyDestroyed = null;
    /** @type {function|null} Called when missile needs to create an explosion */
    this.onExplode = null;
  }

  /**
   * Calculate initial velocity for ballistic arc to target.
   * @param {number} targetX
   * @param {number} targetY
   * @param {number} launchTime — seconds to reach target
   */
  launchTo(targetX, targetY, launchTime = 1.5) {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    this.vx = dx / launchTime;
    this.vy = (dy - 0.5 * GRAVITY * launchTime * launchTime) / launchTime;
  }

  update(dt) {
    this.elapsed += dt;

    // Gravity
    this.vy += GRAVITY * dt;

    // Integrate position
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Rotation follows velocity
    this.rotation = Math.atan2(this.vy, this.vx) + Math.PI / 2;

    // Smoke trail sampling
    this._trailTimer += dt;
    if (this._trailTimer >= TRAIL_INTERVAL) {
      this._trailTimer -= TRAIL_INTERVAL;
      this._trail.push({ x: this.x, y: this.y, age: 0 });
      if (this._trail.length > TRAIL_LENGTH) {
        this._trail.shift();
      }
    }
    // Age trail particles
    for (const p of this._trail) {
      p.age += dt;
    }

    // Lifetime / off-screen check
    if (this.elapsed > MAX_LIFETIME ||
        this.y > OFF_SCREEN.bottom || this.y < OFF_SCREEN.top ||
        this.x < OFF_SCREEN.left || this.x > OFF_SCREEN.right) {
      this.alive = false;
    }
  }

  draw(ctx) {
    // Smoke trail (world space)
    for (let i = 0; i < this._trail.length; i++) {
      const p = this._trail[i];
      const t = i / this._trail.length; // 0 = oldest, 1 = newest
      const radius = 3 + (1 - t) * 4;
      const alpha = t * 0.35;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180,180,180,${alpha})`;
      ctx.fill();
    }

    // Missile body (rotated context)
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    drawPoly(ctx, BODY_GLOW, rgba(0.4, 0.6, 1.0, 0.18));
    drawPoly(ctx, BODY, rgba(0.78, 0.78, 0.82));
    drawPoly(ctx, BODY_STRIPE, rgba(0.3, 0.45, 0.75));
    drawPoly(ctx, NOSECONE, rgba(0.95, 0.15, 0.1));
    drawPoly(ctx, NOSE_BAND, rgba(0.55, 0.55, 0.58));
    drawPoly(ctx, FIN_LEFT, rgba(0.55, 0.55, 0.58));
    drawPoly(ctx, FIN_RIGHT, rgba(0.55, 0.55, 0.58));

    // Rocket fire (local space, emits from tail at (0, 22))
    const flicker = 0.8 + Math.random() * 0.4;
    for (let i = 0; i < 6; i++) {
      const t = i / 5;
      const cy = 22 + i * 6 * flicker;
      const r = (6 - i * 0.8) * flicker;
      const colorIdx = Math.min(Math.floor(t * (FIRE_COLORS.length - 1)), FIRE_COLORS.length - 1);
      ctx.beginPath();
      ctx.arc(randf(-2, 2), cy, r, 0, Math.PI * 2);
      ctx.fillStyle = FIRE_COLORS[colorIdx];
      ctx.fill();
    }

    ctx.restore();
  }
}
