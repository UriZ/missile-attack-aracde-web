/**
 * Super missile (parachute bomb) — translated from super_missile.gd.
 * Falls fast initially, deploys parachute, drifts slowly with sway.
 */

import { Entity } from './entity.js';
import { rgba, randf, lerp, lerpAngle } from '../utils.js';
import { drawPoly } from './launcher.js';

const INITIAL_GRAVITY = 80;
const PARACHUTE_GRAVITY = 15;
const PARACHUTE_SPEED = 35; // terminal velocity
const OFF_SCREEN = { bottom: 1600, left: -200, right: 2760 };

// Body polygons from SCENE_DATA §8
const BODY_GLOW = [-22,38, 22,38, 22,-24, -22,-24];
const BODY = [-18,32, 18,32, 18,-20, -18,-20];
const BODY_STRIPE1 = [-18,12, 18,12, 18,6, -18,6];
const BODY_STRIPE2 = [-18,0, 18,0, 18,-6, -18,-6];
const BODY_DETAIL = [-18,-8, 18,-8, 18,-12, -18,-12];
const WARHEAD_BAND = [-19,-18, 19,-18, 19,-22, -19,-22];
const NOSECONE = [-18,-20, 0,-48, 18,-20];
const FIN_LEFT = [-18,24, -30,38, -18,32];
const FIN_RIGHT = [18,24, 30,38, 18,32];
const FIN_CENTER = [-5,28, 5,28, 5,38, -5,38];

// Parachute canopy
const CANOPY = [-45,0, -40,-20, -25,-32, 0,-38, 25,-32, 40,-20, 45,0, 30,4, 15,6, 0,7, -15,6, -30,4];
const CANOPY_STRIPE1 = [-15,1, -10,-30, 0,-35, 10,-30, 15,1, 5,4, 0,5, -5,4];
const CANOPY_STRIPE2 = [-40,-10, -35,-22, -25,-28, -20,-18, -30,-5];
const CANOPY_STRIPE3 = [40,-10, 35,-22, 25,-28, 20,-18, 30,-5];

// Parachute lines
const LINES = [
  { x1: -42, y1: 0, x2: -10, y2: -35 },
  { x1: 42, y1: 0, x2: 10, y2: -35 },
  { x1: -20, y1: -3, x2: -5, y2: -35 },
  { x1: 20, y1: -3, x2: 5, y2: -35 },
];

// Flame gradient
const FIRE_COLORS = [
  rgba(1, 0.95, 0.7, 1),
  rgba(1, 0.72, 0.05, 1),
  rgba(1, 0.3, 0, 0.85),
  rgba(0.85, 0.08, 0, 0.4),
  rgba(0.3, 0.02, 0, 0),
];

export class SuperMissile extends Entity {
  constructor(x, y) {
    super(x, y);
    this.vx = 0;
    this.vy = 0;
    this.gravityForce = INITIAL_GRAVITY;
    this.parachuteDeployed = false;
    this.swayTime = 0;
    this.parachuteRotation = 0;
    this.collisionRadius = 18;
    this.groups.add('enemy_missiles');

    /** @type {function|null} */
    this.onImpact = null;
  }

  /**
   * @param {number} targetX
   * @param {number} targetY
   * @param {number} launchTime
   */
  launchTo(targetX, targetY, launchTime = 8.0) {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    this.vx = dx / launchTime;
    this.vy = (dy - 0.5 * this.gravityForce * launchTime * launchTime) / launchTime;
  }

  update(dt) {
    // Deploy parachute when falling
    if (this.vy > 15.0 && !this.parachuteDeployed) {
      this.parachuteDeployed = true;
      this.vx *= 0.3;
      this.gravityForce = PARACHUTE_GRAVITY;
    }

    if (this.parachuteDeployed) {
      // Limit fall speed
      if (this.vy > PARACHUTE_SPEED) {
        this.vy = lerp(this.vy, PARACHUTE_SPEED, 3.0 * dt);
      }

      // Gentle sway
      this.swayTime += dt;
      this.vx += Math.sin(this.swayTime * 1.5) * 15.0 * dt;

      // Parachute billowing
      this.parachuteRotation = Math.sin(this.swayTime * 2.0) * 0.08;

      // Keep pointing mostly down
      this.rotation = lerpAngle(this.rotation, Math.PI, 2.0 * dt);
    } else {
      this.vy += this.gravityForce * dt;
      this.rotation = Math.atan2(this.vy, this.vx) + Math.PI / 2;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Off-screen cleanup
    if (this.y > OFF_SCREEN.bottom || this.x < OFF_SCREEN.left || this.x > OFF_SCREEN.right) {
      this.alive = false;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    // Body
    drawPoly(ctx, BODY_GLOW, rgba(1.0, 0.3, 0.05, 0.25));
    drawPoly(ctx, BODY, rgba(0.28, 0.22, 0.22));
    drawPoly(ctx, BODY_STRIPE1, rgba(0.85, 0.65, 0.0));
    drawPoly(ctx, BODY_STRIPE2, rgba(0.85, 0.65, 0.0));
    drawPoly(ctx, BODY_DETAIL, rgba(0.22, 0.17, 0.17));
    drawPoly(ctx, WARHEAD_BAND, rgba(0.75, 0.72, 0.1));
    drawPoly(ctx, NOSECONE, rgba(0.92, 0.1, 0.05));
    drawPoly(ctx, FIN_LEFT, rgba(0.22, 0.17, 0.17));
    drawPoly(ctx, FIN_RIGHT, rgba(0.22, 0.17, 0.17));
    drawPoly(ctx, FIN_CENTER, rgba(0.22, 0.17, 0.17));

    // Parachute
    if (this.parachuteDeployed) {
      ctx.save();
      ctx.translate(0, 34);
      ctx.rotate(this.parachuteRotation);

      // Lines
      const lineColor = rgba(0.4, 0.4, 0.35, 0.8);
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1;
      for (const line of LINES) {
        ctx.beginPath();
        ctx.moveTo(line.x1, line.y1);
        ctx.lineTo(line.x2, line.y2);
        ctx.stroke();
      }

      // Canopy
      drawPoly(ctx, CANOPY, rgba(0.85, 0.85, 0.8, 0.9));
      drawPoly(ctx, CANOPY_STRIPE1, rgba(0.9, 0.3, 0.1, 0.7));
      drawPoly(ctx, CANOPY_STRIPE2, rgba(0.9, 0.3, 0.1, 0.7));
      drawPoly(ctx, CANOPY_STRIPE3, rgba(0.9, 0.3, 0.1, 0.7));

      ctx.restore();
    }

    // Rocket fire (only before parachute)
    if (!this.parachuteDeployed) {
      const flicker = 0.8 + Math.random() * 0.4;
      for (let i = 0; i < 8; i++) {
        const t = i / 7;
        const cy = 32 + i * 7 * flicker;
        const r = (8 - i) * flicker;
        const colorIdx = Math.min(Math.floor(t * (FIRE_COLORS.length - 1)), FIRE_COLORS.length - 1);
        ctx.beginPath();
        ctx.arc(randf(-3, 3), cy, r, 0, Math.PI * 2);
        ctx.fillStyle = FIRE_COLORS[colorIdx];
        ctx.fill();
      }
    }

    ctx.restore();
  }
}
