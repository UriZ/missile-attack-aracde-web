/**
 * Vulkan Cannon — GE M134 Minigun style (T2: Judgment Day aesthetic).
 * Heavy chrome gatling gun with 6 rotating barrels, brass ammo belt,
 * muzzle flash, ejecting shells, heat glow, and smoke effects.
 */

import { Launcher, drawPoly } from './launcher.js';
import { TAU, rgba, lerp, clamp, randf } from '../utils.js';

// ══════════════════════════════════════════════════════════════════
// Geometry data — heavy industrial minigun proportions
// ══════════════════════════════════════════════════════════════════

// Base mount — heavy tripod/pedestal with ammo box
const BASE_POLYS = [
  // Heavy mount platform
  { c: rgba(0.18, 0.18, 0.22), pts: [-38, 20, -34, 26, -20, 28, 0, 29, 20, 28, 34, 26, 38, 20, 38, 10, -38, 10] },
  // Mount body — brushed steel
  { c: rgba(0.3, 0.3, 0.35), pts: [-32, 16, -28, 20, -16, 22, 0, 23, 16, 22, 28, 20, 32, 16, 32, 8, -32, 8] },
  // Pivot ring — chrome
  { c: rgba(0.5, 0.5, 0.55), pts: [-20, 12, -16, 14, -8, 15, 0, 15, 8, 15, 16, 14, 20, 12, 20, 9, -20, 9] },
  // Ammo box left — OD green
  { c: rgba(0.2, 0.28, 0.15), pts: [-36, 10, -22, 10, -20, 0, -18, -10, -36, -10, -38, 0] },
  // Ammo box lid hinge
  { c: rgba(0.15, 0.15, 0.18), pts: [-36, 0, -22, 0, -22, -2, -36, -2] },
  // Ammo belt feed (brass links)
  { c: rgba(0.7, 0.55, 0.15), pts: [-20, 6, -14, 6, -12, 2, -14, -2, -20, -2, -22, 2] },
  // Belt links detail
  { c: rgba(0.8, 0.65, 0.2), pts: [-19, 5, -15, 5, -15, 3, -19, 3] },
  // Ammo box right
  { c: rgba(0.2, 0.28, 0.15), pts: [22, 10, 36, 10, 38, 0, 36, -10, 18, -10, 20, 0] },
  // Ammo box lid hinge right
  { c: rgba(0.15, 0.15, 0.18), pts: [22, 0, 36, 0, 36, -2, 22, -2] },
];

// Turret housing — rotating cylinder
const TURRET_POLYS = [
  // Main housing — dark steel cylinder
  { c: rgba(0.25, 0.25, 0.3), pts: [-14, 4, -16, 0, -16, -8, -14, -12, 14, -12, 16, -8, 16, 0, 14, 4] },
  // Motor housing bulge — where the electric motor sits
  { c: rgba(0.22, 0.22, 0.28), pts: [-12, -4, -13, -8, -13, -14, -11, -16, 11, -16, 13, -14, 13, -8, 12, -4] },
  // Rear bearing cap
  { c: rgba(0.4, 0.4, 0.45), pts: [-10, 4, 10, 4, 10, 6, -10, 6] },
];

// Barrel cluster — 6 barrels arranged in a circle
const NUM_BARRELS = 6;
const BARREL_CIRCLE_RADIUS = 8;  // distance from center to each barrel
const BARREL_LENGTH = 32;        // how long each barrel extends
const BARREL_WIDTH = 2.5;        // half-width of each barrel

// Barrel clamp rings (decorative) — positions along barrel length
const CLAMP_POSITIONS = [0.25, 0.55, 0.85];

// SpinHub — front bearing
const SPIN_HUB_OUTER = [-8, 5, -5, 8, 5, 8, 8, 5, 8, -3, 5, -6, -5, -6, -8, -3];
const SPIN_HUB_INNER = [-5, 3, -3, 5, 3, 5, 5, 3, 5, -1, 3, -3, -3, -3, -5, -1];

// Selection glow polys
const GLOW1 = [-44, 28, 44, 28, 38, 22, -38, 22];
const GLOW2 = [-48, 32, 48, 32, 42, 25, -42, 25];

// Shell casing particle pool
const MAX_SHELLS = 12;

export class VulkanCannon extends Launcher {
  constructor(x, y) {
    super(x, y, 'vulkan');
    this.clickHalfW = 40;
    this.clickHalfH = 45;
    this.turretTipOffset = -62;

    // Overheat system
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
    this.barrelSpin = 0;
    this.barrelSpeed = 0;

    // Muzzle flash state
    this._muzzleFlashTimer = 0;
    this._muzzleFlashIntensity = 0;

    // Ejecting shell casings
    this._shells = [];

    // Smoke wisps
    this._smokeParticles = [];

    // Elapsed time
    this._elapsed = 0;

    /** @type {function|null} */
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

    // Firing logic
    if (this.isSelected && this.isFiring && !this.overheated) {
      this.fireTimer -= dt;
      if (this.fireTimer <= 0) {
        this.fireTimer = this.fireRate;
        this._fireBullet();
        this.heat = Math.min(this.heat + this.heatPerShot, 1.0);
        this._muzzleFlashTimer = 0.04;
        this._muzzleFlashIntensity = 0.8 + Math.random() * 0.2;
        this._ejectShell();
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

    // Barrel spin — spins up fast, coasts down slowly
    if (this.isFiring && !this.overheated) {
      this.barrelSpeed = lerp(this.barrelSpeed, 1800, 6.0 * dt);
    } else {
      this.barrelSpeed = lerp(this.barrelSpeed, 0, 2.0 * dt);
    }
    this.barrelSpin += this.barrelSpeed * dt;
    if (this.barrelSpin > 360) this.barrelSpin -= 360;

    // Muzzle flash decay
    this._muzzleFlashTimer = Math.max(0, this._muzzleFlashTimer - dt);

    // Update shell casings
    for (let i = this._shells.length - 1; i >= 0; i--) {
      const s = this._shells[i];
      s.age += dt;
      s.vy += 600 * dt; // gravity
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.rot += s.spin * dt;
      if (s.age > 0.6) this._shells.splice(i, 1);
    }

    // Emit smoke when hot
    if (this.heat > 0.3 && Math.random() < this.heat * 2 * dt) {
      this._smokeParticles.push({
        x: randf(-6, 6),
        y: randf(-50, -55),
        vx: randf(-15, 15),
        vy: randf(-40, -80),
        size: randf(3, 8),
        alpha: randf(0.15, 0.3),
        age: 0,
        lifetime: randf(0.4, 0.8),
      });
    }

    // Update smoke
    for (let i = this._smokeParticles.length - 1; i >= 0; i--) {
      const p = this._smokeParticles[i];
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.size += dt * 8;
      if (p.age > p.lifetime) this._smokeParticles.splice(i, 1);
    }
  }

  _fireBullet() {
    if (this.onFireBullet) {
      this.onFireBullet(this);
    }
  }

  _ejectShell() {
    if (this._shells.length >= MAX_SHELLS) return;
    // Shell ejects to the right side
    this._shells.push({
      x: this.x + 12,
      y: this.y - 20,
      vx: randf(60, 140),
      vy: randf(-120, -60),
      rot: 0,
      spin: randf(-20, 20),
      age: 0,
    });
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

    // Main barrel housing — long cylinder, changes color with heat
    const housingColor = this._getHousingColor();
    ctx.beginPath();
    ctx.moveTo(-10, -10);
    ctx.lineTo(-11, -14);
    ctx.lineTo(-11, -46);
    ctx.lineTo(-10, -48);
    ctx.lineTo(10, -48);
    ctx.lineTo(11, -46);
    ctx.lineTo(11, -14);
    ctx.lineTo(10, -10);
    ctx.closePath();
    ctx.fillStyle = housingColor;
    ctx.fill();

    // Housing highlight stripe (chrome reflection)
    ctx.beginPath();
    ctx.rect(-2, -14, 4, -34);
    ctx.fillStyle = `rgba(255, 255, 255, ${(0.08 + this.heat * 0.04).toFixed(3)})`;
    ctx.fill();

    // Clamp rings on housing
    for (const pos of CLAMP_POSITIONS) {
      const cy = -14 + (-34 * pos);
      ctx.beginPath();
      ctx.rect(-12, cy - 1.5, 24, 3);
      ctx.fillStyle = rgba(0.2, 0.2, 0.25);
      ctx.fill();
      // Chrome edge
      ctx.beginPath();
      ctx.rect(-12, cy - 1.5, 24, 1);
      ctx.fillStyle = `rgba(180, 180, 200, 0.3)`;
      ctx.fill();
    }

    // Muzzle brake / flash hider
    const muzzleColor = this._getMuzzleColor();
    ctx.beginPath();
    ctx.moveTo(-13, -46);
    ctx.lineTo(-14, -48);
    ctx.lineTo(-14, -52);
    ctx.lineTo(-12, -54);
    ctx.lineTo(12, -54);
    ctx.lineTo(14, -52);
    ctx.lineTo(14, -48);
    ctx.lineTo(13, -46);
    ctx.closePath();
    ctx.fillStyle = muzzleColor;
    ctx.fill();

    // Flash hider slots
    ctx.fillStyle = rgba(0.1, 0.1, 0.12);
    for (let i = -2; i <= 2; i++) {
      ctx.fillRect(i * 5 - 1, -48, 2, -5);
    }

    // BarrelGroup — positioned at muzzle, rotates with barrel spin
    ctx.save();
    ctx.translate(0, -50);
    ctx.rotate(this.barrelSpin * Math.PI / 180);

    // Draw 6 barrels in a circle
    const tipColor = this._getTipColor();
    for (let i = 0; i < NUM_BARRELS; i++) {
      const angle = (TAU / NUM_BARRELS) * i;
      const bx = Math.cos(angle) * BARREL_CIRCLE_RADIUS;
      const by = Math.sin(angle) * BARREL_CIRCLE_RADIUS;

      ctx.save();
      ctx.translate(bx, by);

      // Barrel body
      ctx.beginPath();
      ctx.rect(-BARREL_WIDTH, -BARREL_LENGTH, BARREL_WIDTH * 2, BARREL_LENGTH);
      ctx.fillStyle = tipColor;
      ctx.fill();

      // Barrel bore (dark center)
      ctx.beginPath();
      ctx.arc(0, -BARREL_LENGTH, BARREL_WIDTH * 0.6, 0, TAU);
      ctx.fillStyle = rgba(0.05, 0.05, 0.05);
      ctx.fill();

      // Chrome edge highlight
      ctx.beginPath();
      ctx.rect(-BARREL_WIDTH, -BARREL_LENGTH, 1, BARREL_LENGTH);
      ctx.fillStyle = `rgba(200, 200, 220, 0.15)`;
      ctx.fill();

      ctx.restore();
    }

    // Front spin hub (bearing plate)
    drawPoly(ctx, SPIN_HUB_OUTER, rgba(0.3, 0.3, 0.35));
    drawPoly(ctx, SPIN_HUB_INNER, rgba(0.45, 0.45, 0.5));
    // Center bolt
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, TAU);
    ctx.fillStyle = rgba(0.55, 0.55, 0.6);
    ctx.fill();

    ctx.restore(); // barrel group

    // === Muzzle flash === (drawn after barrels, before restore)
    if (this._muzzleFlashTimer > 0) {
      const flashAlpha = (this._muzzleFlashTimer / 0.04) * this._muzzleFlashIntensity;
      const flashLen = 20 + Math.random() * 15;
      const flashW = 8 + Math.random() * 4;

      // Main flash cone
      ctx.beginPath();
      ctx.moveTo(-flashW, -54);
      ctx.lineTo(0, -54 - flashLen);
      ctx.lineTo(flashW, -54);
      ctx.closePath();
      ctx.fillStyle = `rgba(255, 240, 150, ${(flashAlpha * 0.9).toFixed(3)})`;
      ctx.fill();

      // Inner white core
      ctx.beginPath();
      ctx.moveTo(-flashW * 0.4, -54);
      ctx.lineTo(0, -54 - flashLen * 0.7);
      ctx.lineTo(flashW * 0.4, -54);
      ctx.closePath();
      ctx.fillStyle = `rgba(255, 255, 255, ${(flashAlpha * 0.7).toFixed(3)})`;
      ctx.fill();

      // Side sparks
      for (let i = 0; i < 3; i++) {
        const sx = randf(-flashW * 1.5, flashW * 1.5);
        const sy = -54 - randf(3, flashLen * 0.5);
        ctx.beginPath();
        ctx.arc(sx, sy, randf(1, 2.5), 0, TAU);
        ctx.fillStyle = `rgba(255, 200, 50, ${(flashAlpha * 0.6).toFixed(3)})`;
        ctx.fill();
      }

      // Glow circle around muzzle
      ctx.beginPath();
      ctx.arc(0, -52, 14, 0, TAU);
      ctx.fillStyle = `rgba(255, 180, 50, ${(flashAlpha * 0.25).toFixed(3)})`;
      ctx.fill();
    }

    // === Smoke wisps ===
    for (const p of this._smokeParticles) {
      const smokeAlpha = p.alpha * (1 - p.age / p.lifetime);
      if (smokeAlpha < 0.01) continue;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, TAU);
      ctx.fillStyle = `rgba(80, 80, 90, ${smokeAlpha.toFixed(3)})`;
      ctx.fill();
    }

    // === Overheat glow ===
    if (this.overheated) {
      const pulse = 0.5 + Math.sin(this._elapsed * 8) * 0.3;
      ctx.beginPath();
      ctx.arc(0, -30, 18, 0, TAU);
      ctx.fillStyle = `rgba(255, 50, 10, ${(pulse * 0.2).toFixed(3)})`;
      ctx.fill();
      // Warning pulse on barrels
      ctx.beginPath();
      ctx.arc(0, -50, 12, 0, TAU);
      ctx.fillStyle = `rgba(255, 30, 5, ${(pulse * 0.15).toFixed(3)})`;
      ctx.fill();
    } else if (this.heat > 0.5) {
      // Subtle heat glow
      const heatGlow = (this.heat - 0.5) * 2;
      ctx.beginPath();
      ctx.arc(0, -30, 14, 0, TAU);
      ctx.fillStyle = `rgba(255, 80, 20, ${(heatGlow * 0.1).toFixed(3)})`;
      ctx.fill();
    }

    ctx.restore(); // turret rotation

    ctx.restore(); // entity position

    // === Shell casings (drawn in world space) ===
    for (const s of this._shells) {
      const shellAlpha = clamp(1 - s.age / 0.6, 0, 1);
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      // Brass shell body
      ctx.beginPath();
      ctx.rect(-1.5, -4, 3, 8);
      ctx.fillStyle = `rgba(200, 165, 50, ${shellAlpha.toFixed(3)})`;
      ctx.fill();
      // Primer (base)
      ctx.beginPath();
      ctx.arc(0, 4, 1.5, 0, TAU);
      ctx.fillStyle = `rgba(180, 140, 40, ${shellAlpha.toFixed(3)})`;
      ctx.fill();
      // Highlight
      ctx.beginPath();
      ctx.rect(-0.5, -3, 1, 6);
      ctx.fillStyle = `rgba(255, 220, 100, ${(shellAlpha * 0.4).toFixed(3)})`;
      ctx.fill();
      ctx.restore();
    }
  }

  // ── Heat visual color calculations ──

  _getTipColor() {
    if (this.overheated) {
      const pulse = 0.7 + Math.sin(this._elapsed * 12) * 0.3;
      return rgba(0.9, 0.15 * pulse, 0.05);
    }
    // Cool steel → orange-red as heat increases
    const h = this.heat;
    return rgba(
      0.4 + h * 0.5,
      0.4 + h * 0.1 - h * h * 0.35,
      0.45 - h * 0.4
    );
  }

  _getHousingColor() {
    if (this.overheated) {
      const pulse = 0.5 + Math.sin(this._elapsed * 8) * 0.2;
      return rgba(0.5 + pulse * 0.25, 0.12, 0.06);
    }
    if (this.heat > 0.4) {
      const t = (this.heat - 0.4) / 0.6;
      return rgba(0.25 + t * 0.3, 0.25 - t * 0.12, 0.3 - t * 0.22);
    }
    return rgba(0.25, 0.25, 0.3);
  }

  _getMuzzleColor() {
    if (this.overheated) {
      const pulse = 0.5 + Math.sin(this._elapsed * 10) * 0.3;
      return rgba(0.6 + pulse * 0.2, 0.12, 0.06);
    }
    if (this.heat > 0.5) {
      const t = (this.heat - 0.5) / 0.5;
      return rgba(0.22 + t * 0.35, 0.22 - t * 0.1, 0.27 - t * 0.2);
    }
    return rgba(0.22, 0.22, 0.27);
  }
}
