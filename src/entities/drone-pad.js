/**
 * DronePad — 5th launcher type. Extends Launcher base class.
 * Deploys HunterDrone entities. No turret rotation — drones self-guide.
 *
 * Key '5', position x=2200.
 * Max 2 active drones, 3s cooldown between deploys.
 */

import { Launcher, drawPoly } from './launcher.js';
import { TAU } from '../utils.js';

const MAX_ACTIVE_DRONES = 2;
const DEPLOY_COOLDOWN   = 3.0; // seconds

// ── Visual geometry (local coords, all y is negative = upward) ───────────────

// Base slab — dark charcoal with cyan trim
// Wider than SAM to suggest heavy gear underneath
const BASE_W = 60;
const BASE_H_TOP = 14;
const BASE_H_BOT = 30;

// Launch arm — single rail tilting back on deploy
const ARM_W = 8;
const ARM_H = 54;
const ARM_X = -4;   // arm center x offset

// Arm tip guide rail cap
const RAIL_CAP_W = 20;
const RAIL_CAP_H = 6;

// Selection glow outlines
const GLOW1 = [-64, 22, -50, 36, 50, 36, 64, 22, 50, 44, -50, 44];
const GLOW2 = [-80, 24, -62, 48, 62, 48, 80, 24, 62, 54, -62, 54];

export class DronePad extends Launcher {
  /**
   * @param {number} x
   * @param {number} y
   */
  constructor(x, y) {
    super(x, y, 'drone_pad');
    this.clickHalfW = 45;
    this.clickHalfH = 55;

    // No turret-tracking needed — drones self-guide
    this.turretTipOffset = -70; // used for drone spawn height offset

    // Cooldown / active count tracking
    this.deployCooldown = 0;
    this.activeDroneCount = 0;

    // Launch arm tilt animation
    this._armTilt = 0;       // 0 = upright, positive = tilted back
    this._armTiltTarget = 0;

    // Rail glow pulse
    this._railGlowPhase = 0;
  }

  /** @param {number} dt */
  update(dt) {
    // Skip turret tracking from parent (no turret rotation here)
    // Only animate the selection glow via parent logic
    if (this.isSelected) {
      this._glowTime += dt;
      this._glowAlpha = 0.375 + 0.125 * Math.sin(this._glowTime * Math.PI / 0.6);
    }

    // Cooldown tick
    if (this.deployCooldown > 0) {
      this.deployCooldown -= dt;
    }

    // Arm tilt animation — lerp toward target, auto-reset after reaching it
    this._railGlowPhase += dt * 3.5;
    this._armTilt += (this._armTiltTarget - this._armTilt) * Math.min(1, 8 * dt);

    // Once arm has settled at the deploy tilt, begin returning to upright
    if (this._armTiltTarget > 0 && Math.abs(this._armTilt - this._armTiltTarget) < 0.01) {
      this._armTiltTarget = 0; // let it spring back to 0
    }
  }

  /**
   * Returns true if a drone can currently be deployed.
   * @returns {boolean}
   */
  canDeploy() {
    return this.alive &&
           this.activeDroneCount < MAX_ACTIVE_DRONES &&
           this.deployCooldown <= 0;
  }

  /**
   * Called by game.js when a drone is successfully launched.
   */
  onDroneDeployed() {
    this.activeDroneCount++;
    this.deployCooldown = DEPLOY_COOLDOWN;
    // Kick the arm animation
    this._armTiltTarget = 0.28; // ~16 degrees
  }

  /**
   * Called by game.js when an active drone expires/dies.
   */
  onDroneExpired() {
    this.activeDroneCount = Math.max(0, this.activeDroneCount - 1);
  }

  // ── Rendering ───────────────────────────────────────────────────────────────

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // ── Selection glow ─────────────────────────────────────────────────────────
    if (this.isSelected) {
      ctx.shadowColor = '#00CFFF';
      ctx.shadowBlur = 22;
      drawPoly(ctx, GLOW2, `rgba(0,180,255,${(this._glowAlpha * 0.28).toFixed(3)})`);
      drawPoly(ctx, GLOW1, `rgba(0,180,255,${(this._glowAlpha * 0.55).toFixed(3)})`);
      ctx.shadowBlur = 0;
    }

    // ── Base slab ──────────────────────────────────────────────────────────────
    const baseGrad = ctx.createLinearGradient(0, BASE_H_TOP, 0, BASE_H_BOT);
    baseGrad.addColorStop(0, '#2A2E34');
    baseGrad.addColorStop(1, '#16191E');
    ctx.fillStyle = baseGrad;
    ctx.beginPath();
    ctx.moveTo(-BASE_W, BASE_H_BOT);
    ctx.lineTo( BASE_W, BASE_H_BOT);
    ctx.lineTo( BASE_W - 8, BASE_H_TOP);
    ctx.lineTo(-BASE_W + 8, BASE_H_TOP);
    ctx.closePath();
    ctx.fill();

    // Rim
    ctx.fillStyle = '#0A0D10';
    ctx.fillRect(-BASE_W, BASE_H_BOT, BASE_W * 2, 2);

    // Cyan trim line
    ctx.fillStyle = 'rgba(0,207,255,0.85)';
    ctx.fillRect(-BASE_W + 8, BASE_H_TOP, (BASE_W - 8) * 2, 2);

    // ── Upper pedestal ────────────────────────────────────────────────────────
    const pedGrad = ctx.createLinearGradient(0, 0, 0, BASE_H_TOP);
    pedGrad.addColorStop(0, '#303840');
    pedGrad.addColorStop(1, '#202830');
    ctx.fillStyle = pedGrad;
    ctx.fillRect(-36, 0, 72, BASE_H_TOP);

    // Side accent ribs
    ctx.fillStyle = 'rgba(0,150,200,0.4)';
    ctx.fillRect(-36, 2, 3, 10);
    ctx.fillRect( 33, 2, 3, 10);

    // ── Launch arm (tilts back on deploy) ──────────────────────────────────────
    ctx.save();
    ctx.rotate(-this._armTilt); // arm tilts backward (negative x direction)

    // Arm body gradient
    const armGrad = ctx.createLinearGradient(ARM_X - ARM_W / 2, 0, ARM_X + ARM_W / 2, 0);
    armGrad.addColorStop(0, '#404850');
    armGrad.addColorStop(0.5, '#283040');
    armGrad.addColorStop(1, '#181E28');
    ctx.fillStyle = armGrad;
    ctx.fillRect(ARM_X - ARM_W / 2, -ARM_H, ARM_W, ARM_H);

    // Arm edge highlight (left-edge cyan sheen)
    ctx.fillStyle = 'rgba(0,160,220,0.3)';
    ctx.fillRect(ARM_X - ARM_W / 2, -ARM_H, 2, ARM_H);

    // Arm brace struts
    ctx.fillStyle = 'rgba(40,55,70,0.9)';
    ctx.fillRect(ARM_X - ARM_W / 2 - 4, -ARM_H * 0.6, ARM_W + 8, 3);
    ctx.fillRect(ARM_X - ARM_W / 2 - 4, -ARM_H * 0.35, ARM_W + 8, 3);

    // ── Rail guide cap (at top of arm) ────────────────────────────────────────
    ctx.fillStyle = '#1E2A36';
    ctx.fillRect(ARM_X - RAIL_CAP_W / 2, -ARM_H - RAIL_CAP_H, RAIL_CAP_W, RAIL_CAP_H);

    // Rail glow — pulses cyan when ready
    const isReady = this.canDeploy();
    const railGlow = isReady
      ? 0.5 + 0.5 * Math.sin(this._railGlowPhase)
      : 0.08;
    ctx.save();
    ctx.shadowColor = '#00CFFF';
    ctx.shadowBlur = isReady ? 14 : 4;
    ctx.fillStyle = `rgba(0,207,255,${railGlow.toFixed(3)})`;
    ctx.fillRect(ARM_X - RAIL_CAP_W / 2 + 2, -ARM_H - RAIL_CAP_H + 1, RAIL_CAP_W - 4, 3);
    ctx.shadowBlur = 0;
    ctx.restore();

    ctx.restore(); // arm tilt

    // ── Active drone counter (3 indicator dots, right side of base) ───────────
    const available = MAX_ACTIVE_DRONES - this.activeDroneCount;
    for (let i = 0; i < MAX_ACTIVE_DRONES; i++) {
      const dotX = 42;
      const dotY = BASE_H_TOP - 5 - i * 11;
      const active = i < available;
      ctx.save();
      if (active) {
        ctx.shadowColor = '#00FF88';
        ctx.shadowBlur = 6;
        ctx.fillStyle = '#00FF88';
      } else {
        ctx.fillStyle = '#1A3A2A';
      }
      ctx.beginPath();
      ctx.arc(dotX, dotY, 4, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // ── Cooldown arc (when on cooldown) ───────────────────────────────────────
    if (this.deployCooldown > 0) {
      const fraction = this.deployCooldown / DEPLOY_COOLDOWN;
      ctx.save();
      ctx.strokeStyle = 'rgba(0,207,255,0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, -ARM_H / 2, 22, -Math.PI / 2, -Math.PI / 2 + fraction * TAU);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore(); // entity position
  }
}
