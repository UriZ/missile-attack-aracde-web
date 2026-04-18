/**
 * Vulkan Cannon — translated from vulkan_cannon.gd + vulkan_cannon.tscn.
 * Rapid-fire gatling gun with overheat mechanic, spinning barrels, heat glow visuals.
 */

import { Launcher, drawPoly } from './launcher.js';
import { TAU, rgba, lerp, clamp } from '../utils.js';

// Base (non-rotating) polygons
const BASE_POLYS = [
  // BaseOuter
  { c: rgba(0.28, 0.28, 0.33), pts: [-30, 18, -26, 22, -18, 24, 0, 25, 18, 24, 26, 22, 30, 18, 30, 8, -30, 8] },
  // BaseInner
  { c: rgba(0.33, 0.33, 0.38), pts: [-24, 14, -20, 18, -12, 20, 0, 21, 12, 20, 20, 18, 24, 14, 24, 6, -24, 6] },
  // BaseRing
  { c: rgba(0.22, 0.22, 0.27), pts: [-26, 10, -22, 13, -14, 15, 0, 16, 14, 15, 22, 13, 26, 10, 26, 8, -26, 8] },
  // AmmoFeedL
  { c: rgba(0.35, 0.3, 0.2), pts: [-24, 8, -14, 8, -12, 2, -10, -4, -22, -4, -24, 2] },
  // AmmoBeltL
  { c: rgba(0.55, 0.45, 0.1), pts: [-22, 4, -12, 4, -12, 2, -22, 2] },
  // AmmoFeedR
  { c: rgba(0.35, 0.3, 0.2), pts: [14, 8, 24, 8, 24, 2, 22, -4, 10, -4, 12, 2] },
  // AmmoBeltR
  { c: rgba(0.55, 0.45, 0.1), pts: [12, 4, 22, 4, 22, 2, 12, 2] },
];

// Turret (rotating) polygons — drawn relative to origin
const TURRET_POLYS = [
  // TurretBase
  { c: rgba(0.35, 0.35, 0.4), pts: [-14, 2, -16, 0, -16, -6, -14, -10, 14, -10, 16, -6, 16, 0, 14, 2] },
  // HousingHighlight
  { c: rgba(0.4, 0.4, 0.45), pts: [-3, -10, 3, -10, 3, -40, -3, -40] },
  // HousingBand1
  { c: rgba(0.26, 0.26, 0.3), pts: [-10, -16, 10, -16, 10, -19, -10, -19] },
  // HousingBand2
  { c: rgba(0.26, 0.26, 0.3), pts: [-10, -30, 10, -30, 10, -33, -10, -33] },
];

// BarrelGroup polygons — drawn at (0, -44) with barrel spin rotation
// Each tip has a position offset
const BARREL_TIPS = [
  // Tip1 (center-top, no offset)
  { ox: 0, oy: 0, pts: [-2, 2, 2, 2, 2, -12, -2, -12], flash: [-2.5, -10, 2.5, -10, 2.5, -14, -2.5, -14] },
  // Tip2 (left)
  { ox: -7, oy: 0, pts: [-2, 2, 2, 2, 2, -10, -2, -10], flash: [-2.5, -8, 2.5, -8, 2.5, -12, -2.5, -12] },
  // Tip3 (right)
  { ox: 7, oy: 0, pts: [-2, 2, 2, 2, 2, -10, -2, -10], flash: [-2.5, -8, 2.5, -8, 2.5, -12, -2.5, -12] },
  // Tip4 (left-low)
  { ox: -4, oy: 5, pts: [-2, 2, 2, 2, 2, -9, -2, -9], flash: null },
  // Tip5 (right-low)
  { ox: 4, oy: 5, pts: [-2, 2, 2, 2, 2, -9, -2, -9], flash: null },
  // Tip6 (center-bottom)
  { ox: 0, oy: 6, pts: [-2, 2, 2, 2, 2, -8, -2, -8], flash: null },
];

// SpinHub polygon
const SPIN_HUB = [-6, 5, -3, 7, 3, 7, 6, 5, 6, -3, 3, -5, -3, -5, -6, -3];

// Default (cool) tip colors from tscn
const TIP_COLORS_DEFAULT = [
  rgba(0.5, 0.5, 0.55),   // Tip1
  rgba(0.45, 0.45, 0.5),  // Tip2
  rgba(0.45, 0.45, 0.5),  // Tip3
  rgba(0.42, 0.42, 0.47), // Tip4
  rgba(0.42, 0.42, 0.47), // Tip5
  rgba(0.4, 0.4, 0.45),   // Tip6
];
const TIP_FLASH_COLORS_DEFAULT = [
  rgba(0.65, 0.6, 0.55),
  rgba(0.6, 0.55, 0.5),
  rgba(0.6, 0.55, 0.5),
];

const GLOW1 = [-40, 25, 40, 25, 35, 20, -35, 20];
const GLOW2 = [-45, 28, 45, 28, 38, 22, -38, 22];

export class VulkanCannon extends Launcher {
  constructor(x, y) {
    super(x, y, 'vulkan');
    this.clickHalfW = 35;
    this.clickHalfH = 40;
    this.turretTipOffset = -58; // from vulkan_cannon.gd get_launch_position

    // Overheat system (from vulkan_cannon.gd)
    this.heat = 0;
    this.heatPerShot = 0.018;
    this.coolRate = 0.32;
    this.overheatCoolRate = 0.18;
    this.overheated = false;
    this.overheatThreshold = 1.0;
    this.overheatRecover = 0.3;

    // Firing
    this.fireRate = 0.07;
    this.fireTimer = 0;
    this.isFiring = false;

    // Barrel spin
    this.barrelSpin = 0;   // degrees
    this.barrelSpeed = 0;  // degrees/sec

    // Elapsed time for heat pulse animation
    this._elapsed = 0;

    /** @type {function|null} Called when a bullet should be spawned */
    this.onFireBullet = null;
  }

  setSelected(selected) {
    super.setSelected(selected);
    if (!selected) {
      this.stopFiring();
    }
  }

  startFiring() {
    if (!this.overheated) {
      this.isFiring = true;
      this.fireTimer = 0;
    }
  }

  stopFiring() {
    this.isFiring = false;
  }

  update(dt) {
    super.update(dt);
    this._elapsed += dt;

    // Turret tracking uses faster lerp (12.0 in vulkan_cannon.gd vs 10.0 in launcher.gd)
    // Already handled: we use 10.0 in base, could override but difference is negligible

    // Firing logic
    if (this.isSelected && this.isFiring && !this.overheated) {
      this.fireTimer -= dt;
      if (this.fireTimer <= 0) {
        this.fireTimer = this.fireRate;
        this._fireBullet();
        this.heat = Math.min(this.heat + this.heatPerShot, 1.0);
        if (this.heat >= this.overheatThreshold) {
          this.overheated = true;
          this.isFiring = false;
        }
      }
    }

    // Cooling
    if (this.overheated) {
      this.heat = Math.max(this.heat - this.overheatCoolRate * dt, 0);
      if (this.heat <= this.overheatRecover) {
        this.overheated = false;
      }
    } else if (!this.isFiring) {
      this.heat = Math.max(this.heat - this.coolRate * dt, 0);
    }

    // Barrel spin
    if (this.isFiring && !this.overheated) {
      this.barrelSpeed = lerp(this.barrelSpeed, 1200, 5.0 * dt);
    } else {
      this.barrelSpeed = lerp(this.barrelSpeed, 0, 3.0 * dt);
    }
    this.barrelSpin += this.barrelSpeed * dt;
    if (this.barrelSpin > 360) this.barrelSpin -= 360;
  }

  _fireBullet() {
    if (this.onFireBullet) {
      this.onFireBullet(this);
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Selection glow
    if (this.isSelected) {
      drawPoly(ctx, GLOW2, `rgba(102,153,255,${(this._glowAlpha * 0.43).toFixed(3)})`);
      drawPoly(ctx, GLOW1, `rgba(77,128,255,${this._glowAlpha.toFixed(3)})`);
    }

    // Base polygons
    for (const p of BASE_POLYS) {
      drawPoly(ctx, p.pts, p.c);
    }

    // Turret (rotated)
    ctx.save();
    ctx.rotate(this.turretRotation);

    for (const p of TURRET_POLYS) {
      drawPoly(ctx, p.pts, p.c);
    }

    // BarrelHousing — color changes with heat
    const housingColor = this._getHousingColor();
    drawPoly(ctx, [-9, -8, -10, -10, -10, -40, -9, -42, 9, -42, 10, -40, 10, -10, 9, -8], housingColor);

    // MuzzleRing — color changes with heat
    const muzzleColor = this._getMuzzleColor();
    drawPoly(ctx, [-11, -40, 11, -40, 11, -43, -11, -43], muzzleColor);

    // BarrelGroup — positioned at (0, -44), rotates with barrel spin
    ctx.save();
    ctx.translate(0, -44);
    ctx.rotate(this.barrelSpin * Math.PI / 180);

    // Draw barrel tips with heat-dependent color
    const tipColor = this._getTipColor();
    for (let i = 0; i < BARREL_TIPS.length; i++) {
      const tip = BARREL_TIPS[i];
      ctx.save();
      ctx.translate(tip.ox, tip.oy);
      drawPoly(ctx, tip.pts, tipColor);
      if (tip.flash) {
        drawPoly(ctx, tip.flash, TIP_FLASH_COLORS_DEFAULT[i] || tipColor);
      }
      ctx.restore();
    }

    // SpinHub
    drawPoly(ctx, SPIN_HUB, rgba(0.38, 0.38, 0.42));

    ctx.restore(); // barrel group

    ctx.restore(); // turret rotation

    ctx.restore(); // entity position
  }

  // -- Heat visual color calculations (from vulkan_cannon.gd update_heat_visual) --

  _getTipColor() {
    if (this.overheated) {
      const pulse = 0.7 + Math.sin(this._elapsed * 12) * 0.3;
      return rgba(1.0, 0.15 * pulse, 0.05);
    }
    return rgba(0.5 + this.heat * 0.5, 0.5 - this.heat * 0.35, 0.55 - this.heat * 0.5);
  }

  _getHousingColor() {
    if (this.overheated) {
      const pulse = 0.5 + Math.sin(this._elapsed * 8) * 0.2;
      return rgba(0.6 + pulse * 0.2, 0.18, 0.1);
    }
    if (this.heat > 0.4) {
      const t = (this.heat - 0.4) / 0.6;
      return rgba(0.32 + t * 0.35, 0.32 - t * 0.18, 0.37 - t * 0.28);
    }
    return rgba(0.32, 0.32, 0.37);
  }

  _getMuzzleColor() {
    if (this.overheated) {
      const pulse = 0.5 + Math.sin(this._elapsed * 10) * 0.3;
      return rgba(0.7 + pulse * 0.15, 0.15, 0.08);
    }
    if (this.heat > 0.5) {
      const t = (this.heat - 0.5) / 0.5;
      return rgba(0.28 + t * 0.4, 0.28 - t * 0.15, 0.33 - t * 0.25);
    }
    return rgba(0.28, 0.28, 0.33);
  }
}
