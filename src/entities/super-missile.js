/**
 * Super missile (parachute bomb) — translated from super_missile.gd.
 * Falls fast initially, deploys parachute, drifts slowly with sway.
 *
 * Parachute has a redesigned 9-layer rendering:
 *   1. Threat glow halo
 *   2. Drop shadow
 *   3. Canopy base (radial gradient dome)
 *   4. 8 gore panels (alternating ivory/red)
 *   5. Gore rib lines
 *   6. Canopy outline
 *   7. Rim highlight arc
 *   8. Skirt hem
 *   9. 8 suspension lines to 2 risers
 *
 * Deployment animation: 0.4 s with overshoot scale.
 */

import { Entity } from './entity.js';
import { rgba, randf, lerp, lerpAngle } from '../utils.js';
import { drawPoly } from './launcher.js';

const INITIAL_GRAVITY = 80;
const FRAGMENT_COUNT         = 4;
const FRAGMENT_SCATTER_SPEED = 180;     // px/s base outward velocity
const FRAGMENT_SCATTER_ARC   = Math.PI; // spread across 180 degrees (upward half)
const PARACHUTE_GRAVITY = 15;
// Terminal velocity with parachute. The original Godot value was 35 px/s on a
// ~720 px tall viewport. This implementation uses a 1440 px tall logical space
// (terrain at y=1240, spawn at y=-80), so the missile travels ~2x as far and
// must be proportionally faster to avoid blocking wave completion for 40+ seconds.
const PARACHUTE_SPEED = 120;
const OFF_SCREEN = { bottom: 1600, left: -200, right: 2760 };

// Body polygons from SCENE_DATA §8
const BODY_GLOW    = [-22,38, 22,38, 22,-24, -22,-24];
const BODY         = [-18,32, 18,32, 18,-20, -18,-20];
const BODY_STRIPE1 = [-18,12, 18,12, 18,6, -18,6];
const BODY_STRIPE2 = [-18,0, 18,0, 18,-6, -18,-6];
const BODY_DETAIL  = [-18,-8, 18,-8, 18,-12, -18,-12];
const WARHEAD_BAND = [-19,-18, 19,-18, 19,-22, -19,-22];
const NOSECONE     = [-18,-20, 0,-48, 18,-20];
const FIN_LEFT     = [-18,24, -30,38, -18,32];
const FIN_RIGHT    = [18,24, 30,38, 18,32];
const FIN_CENTER   = [-5,28, 5,28, 5,38, -5,38];

// Canopy gore X-coordinates at skirt (y=0), 9 boundary points for 8 panels
// GORE_X[i] = 45 * sin((i/8 - 0.5) * PI) for i = 0..8
const GORE_X = [];
for (let i = 0; i <= 8; i++) {
  GORE_X.push(45 * Math.sin((i / 8 - 0.5) * Math.PI));
}
// Pre-computed GORE_X ≈ [-45, -41.6, -31.8, -17.2, 0, +17.2, +31.8, +41.6, +45]

// Canopy apex (top of dome)
const APEX_Y = -38;

// Flame gradient
const FIRE_COLORS = [
  rgba(1, 0.95, 0.7, 1),
  rgba(1, 0.72, 0.05, 1),
  rgba(1, 0.3, 0, 0.85),
  rgba(0.85, 0.08, 0, 0.4),
  rgba(0.3, 0.02, 0, 0),
];

// Full canopy outline polygon (same shape as before — used for outline + shadow)
const CANOPY_OUTLINE = [-45,0, -40,-20, -25,-32, 0,-38, 25,-32, 40,-20, 45,0];

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

    // Parachute deployment animation state
    this.deployProgress = 0;  // 0 → 1 deployment scale
    this.deployTime = 0;
    this.canopyLean = 0;      // wind lean derived from vx

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

      // Gentle sway — increased amplitude from 0.08 to 0.14
      this.swayTime += dt;
      this.vx += Math.sin(this.swayTime * 1.5) * 15.0 * dt;

      // Parachute billowing — increased amplitude from 0.08 to 0.14
      this.parachuteRotation = Math.sin(this.swayTime * 2.0) * 0.14;

      // Wind lean from horizontal velocity
      this.canopyLean = Math.max(-0.22, Math.min(0.22, this.vx * 0.0035));

      // Deployment animation (0.4 s with overshoot)
      this.deployTime += dt;
      const t = Math.min(this.deployTime / 0.4, 1.0);
      this.deployProgress = t < 0.8
        ? (t / 0.8) * 1.07
        : 1.07 - ((t - 0.8) / 0.2) * 0.07;

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

  /**
   * Generate fragment spawn data. Called by the collision system when this
   * SuperMissile is hit by a player projectile.
   * @returns {Array<{x: number, y: number, vx: number, vy: number}>}
   */
  getFragments() {
    const frags = [];
    const baseAngle = -Math.PI / 2;
    for (let i = 0; i < FRAGMENT_COUNT; i++) {
      const t = FRAGMENT_COUNT > 1 ? (i / (FRAGMENT_COUNT - 1) - 0.5) : 0;
      const angle = baseAngle + t * FRAGMENT_SCATTER_ARC + randf(-0.15, 0.15);
      const speed = FRAGMENT_SCATTER_SPEED * randf(0.8, 1.2);
      frags.push({
        x:  this.x,
        y:  this.y,
        vx: Math.cos(angle) * speed + this.vx * 0.3,
        vy: Math.sin(angle) * speed + this.vy * 0.3,
      });
    }
    return frags;
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

    // Parachute — 9-layer rendering
    if (this.parachuteDeployed) {
      ctx.save();
      ctx.translate(0, 34);
      ctx.scale(this.deployProgress, this.deployProgress);
      ctx.rotate(this.parachuteRotation + this.canopyLean);

      this._drawParachute(ctx);

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

  /**
   * Draw the 9-layer parachute canopy.
   * Called with canvas already translated to canopy origin (0,34 from body center),
   * scaled by deployProgress, and rotated by parachuteRotation + canopyLean.
   * @param {CanvasRenderingContext2D} ctx
   */
  _drawParachute(ctx) {
    // ── Layer 1: Threat Glow Halo ─────────────────────────────────────
    {
      const grad = ctx.createRadialGradient(0, -20, 0, 0, -20, 58);
      grad.addColorStop(0, 'rgba(255,80,20,0.22)');
      grad.addColorStop(1, 'rgba(255,0,0,0)');
      ctx.beginPath();
      // Upper half-ellipse: PI → 0 clockwise = top arc (left to right through apex)
      ctx.ellipse(0, -20, 58, 52, 0, Math.PI, 0);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // ── Layer 2: Drop Shadow ──────────────────────────────────────────
    {
      ctx.beginPath();
      // Upper half-ellipse (+5, +5 offset) for shadow — PI → 0 clockwise = top arc
      ctx.ellipse(5, -15, 58, 52, 0, Math.PI, 0);
      ctx.closePath();
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fill();
    }

    // ── Layer 3: Canopy Base (Radial Gradient Dome) ───────────────────
    {
      const grad = ctx.createRadialGradient(-8, -32, 0, 0, -19, 52);
      grad.addColorStop(0,    '#FFFFFF');
      grad.addColorStop(0.28, '#EAE6D2');
      grad.addColorStop(0.56, '#C4C0AC');
      grad.addColorStop(0.78, '#9A9688');
      grad.addColorStop(1,    '#6A6860');
      ctx.beginPath();
      // Upper half-ellipse: PI → 0 clockwise = top arc (left through apex to right)
      ctx.ellipse(0, 0, 45, 38, 0, Math.PI, 0);
      ctx.closePath();
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }

    // ── Layer 4: 8 Gore Panels ────────────────────────────────────────
    for (let g = 0; g < 8; g++) {
      const x0 = GORE_X[g];
      const x1 = GORE_X[g + 1];
      const midX = (x0 + x1) * 0.5;

      // Per-gore billowing: slight bulge applied to the panel midpoint at skirt
      const billow = Math.sin(this.swayTime * 3.0 + g * 0.785) * 4.0;

      const isEven = (g % 2 === 0);
      // Gradient from skirt color to apex color
      const skirtColor = isEven ? '#F0ECD8' : '#EE3311';
      const apexColor  = isEven ? '#B4B0A0' : '#7A1100';

      const grad = ctx.createLinearGradient(0, 0, 0, APEX_Y);
      grad.addColorStop(0, skirtColor);
      grad.addColorStop(1, apexColor);

      ctx.beginPath();
      ctx.moveTo(0, APEX_Y);        // apex
      ctx.lineTo(x0, 0);            // left boundary at skirt
      ctx.quadraticCurveTo(midX + billow * 0.5, 2, x1, 0); // skirt with billow
      ctx.closePath();

      ctx.fillStyle = grad;
      ctx.fill();
    }

    // ── Layer 5: Gore Rib Lines ───────────────────────────────────────
    {
      ctx.strokeStyle = 'rgba(70,52,42,0.55)';
      ctx.lineWidth = 1.5;
      // 7 seams between 8 panels — seams at GORE_X[1..7]
      for (let g = 1; g < 8; g++) {
        ctx.beginPath();
        ctx.moveTo(0, APEX_Y);
        ctx.lineTo(GORE_X[g], 0);
        ctx.stroke();
      }
    }

    // ── Layer 6: Canopy Outline ───────────────────────────────────────
    {
      ctx.beginPath();
      ctx.moveTo(CANOPY_OUTLINE[0], CANOPY_OUTLINE[1]);
      for (let i = 2; i < CANOPY_OUTLINE.length; i += 2) {
        ctx.lineTo(CANOPY_OUTLINE[i], CANOPY_OUTLINE[i + 1]);
      }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(55,45,35,0.72)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // ── Layer 7: Rim Highlight Arc (upper-left crescent) ─────────────
    {
      ctx.beginPath();
      ctx.arc(-12, -26, 36, Math.PI * 1.1, Math.PI * 1.7);
      ctx.strokeStyle = 'rgba(255,255,240,0.70)';
      ctx.lineWidth = 3;
      ctx.shadowBlur = 7;
      ctx.shadowColor = 'rgba(255,255,255,0.5)';
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // ── Layer 8: Skirt Hem (dark strip at bottom) ─────────────────────
    {
      ctx.beginPath();
      ctx.moveTo(GORE_X[0], 0);
      ctx.quadraticCurveTo(0, 6, GORE_X[8], 0);
      ctx.lineTo(GORE_X[8], 3);
      ctx.quadraticCurveTo(0, 9, GORE_X[0], 3);
      ctx.closePath();
      ctx.fillStyle = 'rgba(65,50,40,0.45)';
      ctx.fill();
    }

    // ── Layer 9: 8 Suspension Lines to 2 Risers ──────────────────────
    {
      ctx.strokeStyle = 'rgba(200,188,158,0.87)';
      ctx.lineWidth = 1.5;
      const riserL = { x: -7, y: 34 };
      const riserR = { x:  7, y: 34 };
      for (let g = 0; g <= 8; g++) {
        const gx = GORE_X[g];
        const riser = gx <= 0 ? riserL : riserR;
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(riser.x, riser.y);
        ctx.stroke();
      }
    }
  }
}
