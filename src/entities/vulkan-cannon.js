/**
 * Vulkan Cannon — GE M134 Rotary Cannon (M134 Minigun aesthetic).
 * Heavy industrial mount with 6 rotating barrels inside an octagonal shroud,
 * OD green ammo feed box, brass belt chute, muzzle brake crown,
 * 3-stage heat glow, and procedural muzzle flash / shell casings / smoke.
 */

import { Launcher, drawPoly } from './launcher.js';
import { TAU, rgba, lerp, clamp, randf } from '../utils.js';

// ══════════════════════════════════════════════════════════════════
// Geometry data — M134 heavy pedestal proportions
// ══════════════════════════════════════════════════════════════════

// Barrel cluster constants
const NUM_BARRELS = 6;
const BARREL_CIRCLE_RADIUS = 8;   // radius from spin axis to each barrel center
const BARREL_HALF_W = 3;          // half-width of each barrel tube
const BARREL_LENGTH = 22;         // half-length from cluster center to muzzle


// Selection glow polys
const GLOW1 = [-44, 34, 44, 34, 38, 26, -38, 26];
const GLOW2 = [-48, 38, 48, 38, 42, 29, -42, 29];

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

    // ── 1. Selection glow ────────────────────────────────────────
    if (this.isSelected) {
      ctx.save();
      ctx.shadowColor = '#5060FF';
      ctx.shadowBlur = 18;
      drawPoly(ctx, GLOW2, `rgba(80,110,255,${(this._glowAlpha * 0.28).toFixed(3)})`);
      drawPoly(ctx, GLOW1, `rgba(80,110,255,${(this._glowAlpha * 0.55).toFixed(3)})`);
      ctx.restore();
    }

    // ── 2. Base pedestal (non-rotating) ─────────────────────────
    // Foot plate
    drawPoly(ctx, [-42, 32, 42, 32, 36, 24, -36, 24], '#1A1C1E');

    // Body column — gradient
    const colGrad = ctx.createLinearGradient(-22, 0, 22, 0);
    colGrad.addColorStop(0, '#3A3C42');
    colGrad.addColorStop(1, '#22242A');
    ctx.beginPath();
    ctx.moveTo(-22, 24); ctx.lineTo(22, 24);
    ctx.lineTo(18, 2);   ctx.lineTo(-18, 2);
    ctx.closePath();
    ctx.fillStyle = colGrad;
    ctx.fill();

    // Trunnion crossbar
    const trGrad = ctx.createLinearGradient(0, -2, 0, 6);
    trGrad.addColorStop(0, '#4A4C54');
    trGrad.addColorStop(0.4, '#5A5C64');
    trGrad.addColorStop(1, '#32343C');
    ctx.beginPath();
    ctx.rect(-32, -2, 64, 8);
    ctx.fillStyle = trGrad;
    ctx.fill();

    // Trunnion arms extending up to gun housing (y = -18)
    ctx.fillStyle = '#2C2E36';
    ctx.fillRect(-30, -18, 8, 16);
    ctx.fillRect(22, -18, 8, 16);

    // Mounting bolts on foot plate (4 bolts)
    for (const bx of [-30, -18, 18, 30]) {
      ctx.beginPath();
      ctx.arc(bx, 28, 2.5, 0, TAU);
      ctx.fillStyle = '#5A5C64';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(bx, 28, 1.2, 0, TAU);
      ctx.fillStyle = '#222428';
      ctx.fill();
    }

    // ── 3. Ammo feed box (non-rotating, left side) ───────────────
    drawPoly(ctx, [-54, 2, -28, 2, -26, -14, -46, -18, -54, -10], '#2E3A1E');
    // Box highlight edge
    drawPoly(ctx, [-54, 2, -28, 2, -28, 0, -54, 0], 'rgba(255,255,255,0.06)');
    // Shadow edge
    drawPoly(ctx, [-46, -18, -54, -10, -54, -8, -47, -16], 'rgba(0,0,0,0.22)');

    // Belt chute — 3 brass hex segments
    for (let seg = 0; seg < 3; seg++) {
      const bcy = -2 + seg * -5;
      const bcx = -28 + seg * 3;
      drawPoly(ctx, [
        bcx - 4, bcy,
        bcx,     bcy - 2,
        bcx + 4, bcy,
        bcx + 4, bcy - 4,
        bcx,     bcy - 6,
        bcx - 4, bcy - 4,
      ], seg % 2 === 0 ? '#C8A030' : '#B89028');
    }

    // ── 4. Gun body (rotates with turret) ────────────────────────
    ctx.save();
    ctx.rotate(this.turretRotation);

    // 4a. Receiver block (y = 0 to y = -8)
    ctx.fillStyle = '#2A2C32';
    ctx.fillRect(-16, -8, 34, 8);
    // Belt feed port (left)
    ctx.fillStyle = '#141618';
    ctx.fillRect(-18, -3, 5, 5);
    // Ejection port (right) — glows with heat
    const ejectR = Math.min(1, this.heat * 2.5);
    ctx.fillStyle = `rgb(${Math.round(20 + ejectR * 60)},${Math.round(20 + ejectR * 10)},20)`;
    ctx.fillRect(13, -4, 6, 5);

    // 4b. Motor housing (y = -8 to y = -20) — wider bulge with cooling fins
    const motorGrad = ctx.createLinearGradient(-14, 0, 14, 0);
    motorGrad.addColorStop(0, '#222428');
    motorGrad.addColorStop(1, '#2E3036');
    ctx.beginPath();
    ctx.moveTo(-14, -8); ctx.lineTo(-16, -12);
    ctx.lineTo(-16, -20); ctx.lineTo(16, -20);
    ctx.lineTo(16, -12); ctx.lineTo(14, -8);
    ctx.closePath();
    ctx.fillStyle = motorGrad;
    ctx.fill();

    // Cooling fins
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    for (const fy of [-11, -14, -17]) {
      ctx.fillRect(-15, fy - 0.5, 30, 1.5);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (const fy of [-11, -14, -17]) {
      ctx.fillRect(-15, fy - 0.5, 30, 0.7);
    }

    // Motor access panel
    ctx.fillStyle = '#1E2028';
    ctx.fillRect(4, -18, 10, 7);
    for (const sx of [6, 12]) {
      ctx.beginPath();
      ctx.arc(sx, -15, 1.2, 0, TAU);
      ctx.fillStyle = '#3A3C44';
      ctx.fill();
    }

    // 4c. Dark interior cavity — visible background behind spinning barrels
    {
      const cavityGrad = ctx.createRadialGradient(0, -40, 0, 0, -40, 14);
      cavityGrad.addColorStop(0, '#0D0E11');
      cavityGrad.addColorStop(1, '#16181D');
      ctx.beginPath();
      ctx.moveTo(-13, -21);
      ctx.lineTo(13, -21);
      ctx.lineTo(13, -59);
      ctx.lineTo(-13, -59);
      ctx.closePath();
      ctx.fillStyle = cavityGrad;
      ctx.fill();
    }

    // 4d. Spinning barrel cluster (center at y = -40) — drawn BEFORE shroud walls
    ctx.save();
    ctx.translate(0, -40);
    ctx.rotate(this.barrelSpin * Math.PI / 180);

    for (let i = 0; i < NUM_BARRELS; i++) {
      const angle = (TAU / NUM_BARRELS) * i;
      const bx = Math.cos(angle) * BARREL_CIRCLE_RADIUS;
      const by = Math.sin(angle) * BARREL_CIRCLE_RADIUS;

      ctx.save();
      ctx.translate(bx, by);

      // High-contrast L-R gradient for roundness illusion
      const barrelGrad = ctx.createLinearGradient(-BARREL_HALF_W, 0, BARREL_HALF_W, 0);
      barrelGrad.addColorStop(0,    '#B0B4BE');
      barrelGrad.addColorStop(0.35, '#8A8E98');
      barrelGrad.addColorStop(0.7,  '#5A5E68');
      barrelGrad.addColorStop(1,    '#303238');
      ctx.fillStyle = barrelGrad;
      ctx.fillRect(-BARREL_HALF_W, -BARREL_LENGTH, BARREL_HALF_W * 2, BARREL_LENGTH * 2);

      // Bore hole at muzzle end
      ctx.beginPath();
      ctx.arc(0, -BARREL_LENGTH, 2, 0, TAU);
      ctx.fillStyle = '#050507';
      ctx.fill();

      ctx.restore();
    }

    // Center hub (spins with barrels)
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, TAU);
    ctx.fillStyle = '#1A1C22';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, TAU);
    ctx.fillStyle = '#2A2C36';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, TAU);
    ctx.fillStyle = '#6070A0';
    ctx.fill();

    ctx.restore(); // barrel spin

    // 4e. Shroud walls — LEFT and RIGHT strips only (not solid fill, so barrels show)
    // Left wall
    {
      const lwGrad = ctx.createLinearGradient(-16, 0, -13, 0);
      lwGrad.addColorStop(0, '#3A3C44');
      lwGrad.addColorStop(0.5, '#2A2C32');
      lwGrad.addColorStop(1, '#1E2028');
      ctx.fillStyle = lwGrad;
      ctx.beginPath();
      ctx.moveTo(-14, -20);
      ctx.lineTo(-16, -24);
      ctx.lineTo(-16, -56);
      ctx.lineTo(-14, -60);
      ctx.lineTo(-13, -60);
      ctx.lineTo(-13, -20);
      ctx.closePath();
      ctx.fill();
    }
    // Right wall
    {
      const rwGrad = ctx.createLinearGradient(13, 0, 16, 0);
      rwGrad.addColorStop(0, '#1E2028');
      rwGrad.addColorStop(0.5, '#2A2C32');
      rwGrad.addColorStop(1, '#252830');
      ctx.fillStyle = rwGrad;
      ctx.beginPath();
      ctx.moveTo(13, -20);
      ctx.lineTo(13, -60);
      ctx.lineTo(14, -60);
      ctx.lineTo(16, -56);
      ctx.lineTo(16, -24);
      ctx.lineTo(14, -20);
      ctx.closePath();
      ctx.fill();
    }
    // Top cap
    ctx.fillStyle = '#2A2C32';
    ctx.fillRect(-13, -59, 26, 3);
    // Bottom cap
    ctx.fillRect(-13, -20, 26, 3);

    // 4f. Clamp rings over everything — y = -30, -42, -54
    for (const cy of [-30, -42, -54]) {
      ctx.fillStyle = '#1E2028';
      ctx.fillRect(-17, cy - 2, 34, 4);
      ctx.fillStyle = 'rgba(180,180,200,0.25)';
      ctx.fillRect(-17, cy - 2, 34, 1);
      // 4 bolts per ring
      for (const bx of [-13, -5, 5, 13]) {
        ctx.beginPath();
        ctx.arc(bx, cy, 1.8, 0, TAU);
        ctx.fillStyle = '#3C3E48';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(bx, cy, 0.9, 0, TAU);
        ctx.fillStyle = '#14161A';
        ctx.fill();
      }
    }

    // 4g. Muzzle brake — outer crown shape + open rotating barrel face
    const muzzleColor = this._getMuzzleColor();
    // Outer octagonal crown
    ctx.beginPath();
    ctx.moveTo(-13, -60);
    ctx.lineTo(-15, -62);
    ctx.lineTo(-15, -68);
    ctx.lineTo(-13, -70);
    ctx.lineTo(13, -70);
    ctx.lineTo(15, -68);
    ctx.lineTo(15, -62);
    ctx.lineTo(13, -60);
    ctx.closePath();
    ctx.fillStyle = muzzleColor;
    ctx.fill();

    // Muzzle crown rim highlight
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(-14, -62, 28, 1);

    // Dark muzzle face — open cavity showing rotating barrel ends
    {
      const muzzleFaceGrad = ctx.createRadialGradient(0, -65, 0, 0, -65, 11);
      muzzleFaceGrad.addColorStop(0, '#0A0B0E');
      muzzleFaceGrad.addColorStop(1, '#1E2028');
      ctx.beginPath();
      ctx.arc(0, -65, 11, 0, TAU);
      ctx.fillStyle = muzzleFaceGrad;
      ctx.fill();
      // Rim ring
      ctx.beginPath();
      ctx.arc(0, -65, 11, 0, TAU);
      ctx.strokeStyle = '#3A3C48';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Rotating barrel tip circles inside the muzzle face
    ctx.save();
    ctx.translate(0, -65);
    ctx.rotate(this.barrelSpin * Math.PI / 180);
    for (let i = 0; i < NUM_BARRELS; i++) {
      const angle = (TAU / NUM_BARRELS) * i;
      const tx = Math.cos(angle) * BARREL_CIRCLE_RADIUS;
      const ty = Math.sin(angle) * BARREL_CIRCLE_RADIUS;
      ctx.save();
      ctx.translate(tx, ty);
      // Tip face with radial gradient
      const tipGrad = ctx.createRadialGradient(-0.8, -0.8, 0, 0, 0, 3);
      tipGrad.addColorStop(0, '#C0C4CC');
      tipGrad.addColorStop(1, '#3A3C44');
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, TAU);
      ctx.fillStyle = tipGrad;
      ctx.fill();
      // Bore hole
      ctx.beginPath();
      ctx.arc(0, 0, 1.8, 0, TAU);
      ctx.fillStyle = '#050507';
      ctx.fill();
      // Bore glint
      ctx.beginPath();
      ctx.arc(-0.6, -0.6, 0.6, 0, TAU);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fill();
      ctx.restore();
    }
    // Center hub on muzzle face
    {
      const hubGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 3);
      hubGrad.addColorStop(0, '#4050A0');
      hubGrad.addColorStop(1, '#20253A');
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, TAU);
      ctx.fillStyle = hubGrad;
      ctx.fill();
    }
    ctx.restore(); // muzzle barrel spin

    // ── 5. Heat glow overlay ──────────────────────────────────────
    if (this.overheated) {
      // Stage 3: pulsing red inferno
      const pulse = 0.5 + Math.sin(this._elapsed * 8) * 0.3;
      ctx.save();
      ctx.shadowColor = '#FF2200';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(0, -40, 20, 0, TAU);
      ctx.fillStyle = `rgba(255, 34, 0, ${(pulse * 0.22).toFixed(3)})`;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
      // Warning shimmer lines
      ctx.save();
      ctx.strokeStyle = `rgba(255,50,0,${(pulse * 0.35).toFixed(3)})`;
      ctx.lineWidth = 1;
      for (let li = 0; li < 3; li++) {
        const lx = randf(-14, 14);
        ctx.beginPath();
        ctx.moveTo(lx, -24); ctx.lineTo(lx + randf(-4, 4), -58);
        ctx.stroke();
      }
      ctx.restore();
    } else if (this.heat > 0.9) {
      const t = (this.heat - 0.9) / 0.1;
      const pulse = 0.5 + Math.sin(this._elapsed * 10) * 0.3;
      ctx.save();
      ctx.shadowColor = '#FF2200';
      ctx.shadowBlur = 14 + t * 8;
      ctx.beginPath();
      ctx.arc(0, -40, 16, 0, TAU);
      ctx.fillStyle = `rgba(255, 34, 0, ${(t * pulse * 0.18).toFixed(3)})`;
      ctx.fill();
      ctx.restore();
    } else if (this.heat > 0.7) {
      // Stage 2: orange glow
      const t = (this.heat - 0.7) / 0.2;
      ctx.save();
      ctx.shadowColor = '#FF6600';
      ctx.shadowBlur = 14 + t * 8;
      ctx.beginPath();
      ctx.arc(0, -40, 14, 0, TAU);
      ctx.fillStyle = `rgba(255, 102, 0, ${(t * 0.16).toFixed(3)})`;
      ctx.fill();
      ctx.restore();
    } else if (this.heat > 0.5) {
      // Stage 1: subtle warm shimmer
      const t = (this.heat - 0.5) / 0.2;
      ctx.beginPath();
      ctx.arc(0, -40, 12, 0, TAU);
      ctx.fillStyle = `rgba(255, 176, 64, ${(t * 0.1).toFixed(3)})`;
      ctx.fill();
    }

    // ── 6. Muzzle flash ──────────────────────────────────────────
    if (this._muzzleFlashTimer > 0) {
      const flashAlpha = (this._muzzleFlashTimer / 0.04) * this._muzzleFlashIntensity;
      const flashLen = 22 + Math.random() * 14;
      const flashW = 9 + Math.random() * 4;
      const muzzleY = -72;

      // Main cone
      ctx.beginPath();
      ctx.moveTo(-flashW, muzzleY);
      ctx.lineTo(0, muzzleY - flashLen);
      ctx.lineTo(flashW, muzzleY);
      ctx.closePath();
      ctx.fillStyle = `rgba(255, 240, 150, ${(flashAlpha * 0.9).toFixed(3)})`;
      ctx.fill();

      // Inner white core
      ctx.beginPath();
      ctx.moveTo(-flashW * 0.4, muzzleY);
      ctx.lineTo(0, muzzleY - flashLen * 0.7);
      ctx.lineTo(flashW * 0.4, muzzleY);
      ctx.closePath();
      ctx.fillStyle = `rgba(255, 255, 255, ${(flashAlpha * 0.7).toFixed(3)})`;
      ctx.fill();

      // Side coronas
      for (const sx of [-flashW * 1.4, flashW * 1.4]) {
        ctx.beginPath();
        ctx.arc(sx, muzzleY - flashLen * 0.2, flashW * 0.55, 0, TAU);
        ctx.fillStyle = `rgba(255, 200, 50, ${(flashAlpha * 0.45).toFixed(3)})`;
        ctx.fill();
      }

      // Bloom
      ctx.beginPath();
      ctx.arc(0, muzzleY, 30, 0, TAU);
      ctx.fillStyle = `rgba(255, 220, 100, ${(flashAlpha * 0.15).toFixed(3)})`;
      ctx.fill();

      // Sparks
      for (let i = 0; i < 5; i++) {
        const sx = randf(-flashW * 1.5, flashW * 1.5);
        const sy = muzzleY - randf(3, flashLen * 0.5);
        ctx.beginPath();
        ctx.arc(sx, sy, randf(1, 2.5), 0, TAU);
        ctx.fillStyle = `rgba(255, 200, 50, ${(flashAlpha * 0.6).toFixed(3)})`;
        ctx.fill();
      }
    }

    // ── Smoke wisps ───────────────────────────────────────────────
    for (const p of this._smokeParticles) {
      const smokeAlpha = p.alpha * (1 - p.age / p.lifetime);
      if (smokeAlpha < 0.01) continue;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, TAU);
      ctx.fillStyle = `rgba(80, 80, 90, ${smokeAlpha.toFixed(3)})`;
      ctx.fill();
    }

    ctx.restore(); // turret rotation

    ctx.restore(); // entity position

    // ── Shell casings (world space) ───────────────────────────────
    for (const s of this._shells) {
      const shellAlpha = clamp(1 - s.age / 0.6, 0, 1);
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.beginPath();
      ctx.rect(-1.5, -4, 3, 8);
      ctx.fillStyle = `rgba(214, 178, 54, ${shellAlpha.toFixed(3)})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(0,0,0,${(shellAlpha * 0.4).toFixed(3)})`;
      ctx.lineWidth = 0.8;
      ctx.strokeRect(-1.5, -4, 3, 8);
      ctx.beginPath();
      ctx.arc(0, 4, 1.5, 0, TAU);
      ctx.fillStyle = `rgba(180, 140, 40, ${shellAlpha.toFixed(3)})`;
      ctx.fill();
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
