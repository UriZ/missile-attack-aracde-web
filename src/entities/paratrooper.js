/**
 * Paratrooper — enemy unit dropped by TransportPlane.
 *
 * State machine: FREEFALL → PARACHUTE → (terrain collision handled externally)
 *
 * Freefall for 0.3s, then parachute deploys and trooper drifts down at 80px/s.
 * Can be shot mid-air (collisionRadius 15, small target).
 * On terrain landing: destroys nearest launcher within 120px radius (handled in collision.js).
 */

import { Entity } from './entity.js';
import { randf, lerp } from '../utils.js';

const FREEFALL_GRAVITY = 200;
const PARACHUTE_GRAVITY = 15;
const PARACHUTE_SPEED = 80;
const FREEFALL_DURATION = 0.3;

// Canopy gore boundary X-coords (6 panels, 7 boundaries)
const GORE_X6 = [];
for (let i = 0; i <= 6; i++) {
  GORE_X6.push(30 * Math.sin((i / 6 - 0.5) * Math.PI));
}
// Pre-computed: [-30, -28.1, -21.2, -8.7, 8.7, 21.2, 28.1, 30] (approx)

const CANOPY_APEX_Y = -26; // apex of the smaller 30px radius canopy

export class Paratrooper extends Entity {
  /**
   * @param {number} x — spawn x (plane's x at drop time)
   * @param {number} y — spawn y (plane's y at drop time)
   */
  constructor(x, y) {
    super(x, y);
    this.vx = randf(-15, 15);
    this.vy = 0;
    this.collisionRadius = 15;
    this.groups.add('enemy_missiles');

    this.parachuteDeployed = false;
    this.freefallTimer = 0;

    // Parachute animation state — matches SuperMissile pattern
    this.swayTime = randf(0, 6.28); // random phase so troops don't sway in sync
    this.deployProgress = 0;
    this.deployTime = 0;
    this.parachuteRotation = 0;
    this.canopyLean = 0;

    /** @type {function|null} callback for terrain landing (set by collision system) */
    this.onImpact = null;
  }

  update(dt) {
    if (!this.parachuteDeployed) {
      // Freefall
      this.freefallTimer += dt;
      this.vy += FREEFALL_GRAVITY * dt;

      if (this.freefallTimer >= FREEFALL_DURATION) {
        this.parachuteDeployed = true;
        this.vy = Math.min(this.vy, PARACHUTE_SPEED);
        this.gravityForce = PARACHUTE_GRAVITY;
      }
    } else {
      // Parachute phase
      // Cap fall speed
      if (this.vy > PARACHUTE_SPEED) {
        this.vy = lerp(this.vy, PARACHUTE_SPEED, 3.0 * dt);
      }

      // Gentle horizontal sway (gentler than SuperMissile)
      this.swayTime += dt;
      this.vx += Math.sin(this.swayTime * 1.2) * 10 * dt;

      // Canopy oscillation
      this.parachuteRotation = Math.sin(this.swayTime * 2.0) * 0.10;

      // Wind lean from vx
      this.canopyLean = Math.max(-0.18, Math.min(0.18, this.vx * 0.003));

      // Deployment animation (0.3s with overshoot)
      this.deployTime += dt;
      const t = Math.min(this.deployTime / 0.3, 1.0);
      this.deployProgress = t < 0.8
        ? (t / 0.8) * 1.07
        : 1.07 - ((t - 0.8) / 0.2) * 0.07;

      // Apply parachute gravity drag
      this.vy += PARACHUTE_GRAVITY * dt;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Off-screen side cleanup
    if (this.x < -200 || this.x > 2760) {
      this.alive = false;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.parachuteDeployed) {
      // ── Parachute canopy (4-layer simplified version) ──
      ctx.save();
      ctx.translate(0, -55); // canopy above the soldier
      ctx.scale(this.deployProgress, this.deployProgress);
      ctx.rotate(this.parachuteRotation + this.canopyLean);

      this._drawCanopy(ctx);

      // Suspension lines from canopy skirt to soldier
      ctx.strokeStyle = 'rgba(180,165,140,0.8)';
      ctx.lineWidth = 1;
      for (let g = 0; g <= 6; g++) {
        const gx = GORE_X6[g];
        const riser = gx <= 0 ? -5 : 5;
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(riser, 26); // riser anchor at soldier shoulders
        ctx.stroke();
      }

      ctx.restore();
    } else {
      // Freefall — show soldier tumbling without chute
      this._drawSoldierBody(ctx, 0, 0, this.freefallTimer * 4.0);
      ctx.restore();
      return;
    }

    // ── Soldier body below canopy (origin is trooper position) ──
    this._drawSoldierBody(ctx, 0, 0, 0);

    ctx.restore();
  }

  /**
   * Draw the simplified 4-layer parachute canopy.
   * Canvas should be translated to canopy origin, scaled by deployProgress,
   * rotated by parachuteRotation.
   * @param {CanvasRenderingContext2D} ctx
   */
  _drawCanopy(ctx) {
    // ── Layer 1: Canopy base — green camo radial gradient dome ──
    {
      const grad = ctx.createRadialGradient(-6, -20, 0, 0, -13, 36);
      grad.addColorStop(0, '#8AAA6A');
      grad.addColorStop(0.5, '#5A7A4A');
      grad.addColorStop(1, '#3A5230');
      ctx.beginPath();
      ctx.ellipse(0, 0, 30, 25, 0, Math.PI, 0);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.globalAlpha = 0.95;
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }

    // ── Layer 2: 6 gore panels — alternating green shades ──
    for (let g = 0; g < 6; g++) {
      const x0 = GORE_X6[g];
      const x1 = GORE_X6[g + 1];
      const midX = (x0 + x1) * 0.5;
      const billow = Math.sin(this.swayTime * 3.0 + g * 1.05) * 2.5;

      const isEven = (g % 2 === 0);
      const skirtColor = isEven ? '#6A9050' : '#4A6838';
      const apexColor  = isEven ? '#3A5228' : '#283A1A';

      const grad = ctx.createLinearGradient(0, 0, 0, CANOPY_APEX_Y);
      grad.addColorStop(0, skirtColor);
      grad.addColorStop(1, apexColor);

      ctx.beginPath();
      ctx.moveTo(0, CANOPY_APEX_Y);
      ctx.lineTo(x0, 0);
      ctx.quadraticCurveTo(midX + billow * 0.5, 2, x1, 0);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // ── Layer 3: Gore rib lines ──
    {
      ctx.strokeStyle = 'rgba(30,50,20,0.55)';
      ctx.lineWidth = 1;
      for (let g = 1; g < 6; g++) {
        ctx.beginPath();
        ctx.moveTo(0, CANOPY_APEX_Y);
        ctx.lineTo(GORE_X6[g], 0);
        ctx.stroke();
      }
    }

    // ── Layer 4: Canopy outline ──
    {
      ctx.beginPath();
      ctx.ellipse(0, 0, 30, 25, 0, Math.PI, 0);
      ctx.closePath();
      ctx.strokeStyle = 'rgba(30,50,20,0.70)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  /**
   * Draw the soldier body at local offset.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} ox — x offset
   * @param {number} oy — y offset
   * @param {number} tumbleAngle — rotation for freefall tumbling
   */
  _drawSoldierBody(ctx, ox, oy, tumbleAngle) {
    ctx.save();
    ctx.translate(ox, oy);
    if (tumbleAngle !== 0) ctx.rotate(tumbleAngle);

    // Helmet — olive dome
    ctx.fillStyle = '#4A5A2A';
    ctx.beginPath();
    ctx.ellipse(0, -6, 5, 3, 0, Math.PI, 0);
    ctx.fill();

    // Head — skin tone
    ctx.fillStyle = '#C88848';
    ctx.fillRect(-3, -6, 6, 5);

    // Torso — olive drab
    ctx.fillStyle = '#4A5A2A';
    ctx.fillRect(-4, -1, 8, 9);

    // Left arm — slight angle
    ctx.strokeStyle = '#4A5A2A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4, 1);
    ctx.lineTo(-8, 6);
    ctx.stroke();

    // Right arm
    ctx.beginPath();
    ctx.moveTo(4, 1);
    ctx.lineTo(8, 6);
    ctx.stroke();

    // Legs — dangle with slight sway
    const legSway = this.parachuteDeployed
      ? Math.sin(this.swayTime * 1.8) * 3
      : 0;

    ctx.lineWidth = 2;
    // Left leg
    ctx.beginPath();
    ctx.moveTo(-2, 8);
    ctx.lineTo(-3 + legSway, 16);
    ctx.stroke();
    // Right leg
    ctx.beginPath();
    ctx.moveTo(2, 8);
    ctx.lineTo(3 + legSway, 16);
    ctx.stroke();

    ctx.restore();
  }
}
