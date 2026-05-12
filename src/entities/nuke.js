/**
 * Nuke — heavily armoured ballistic warhead.
 *
 * Takes multiple hits to destroy (MAX_HP = 3). Heat-seeking missiles kill it
 * instantly. On impact with terrain or launchers it triggers a catastrophic
 * multi-explosion spread much larger than a SuperMissile.
 *
 * Visual redesign v2: Fat Man silhouette via bezier cubic curves,
 * radiation-green palette, rotating trefoil, descent targeting reticle,
 * multi-layer radiation aura.
 */

import { Entity } from './entity.js';
import { TAU, randf } from '../utils.js';

const GRAVITY = 60;          // Slower, more deliberate descent
const MAX_HP = 3;
const FLASH_DURATION = 0.25; // Seconds the hit-flash overlay stays visible

const OFF_SCREEN = { bottom: 1600, left: -200, right: 2760 };

// ── Color constants ────────────────────────────────────────────────────────
const C_BODY         = '#1A1F0F';   // Military green-black hull
const C_WARHEAD      = '#0E110A';   // Darkest section
const C_WARHEAD_BAND = '#FF6B00';   // Warning orange band
const C_FIN          = '#141A09';   // Near-black fins
const C_TOXIC_YELLOW = '#D4FF00';   // Hazard stripes
const C_TRAIL_CORE   = '#E0FFE0';   // Trail white-hot core
const C_TRAIL_GREEN  = '#7FFF00';   // Trail green fire

// ── Fat Man bezier body drawing helpers ───────────────────────────────────

/**
 * Trace the Fat Man silhouette (6px outset glow version) as a closed path.
 * Nose tip at y=-96, tail bottom at y=+68.
 */
function traceNukeGlow(ctx) {
  ctx.beginPath();
  ctx.moveTo(0, -96);
  ctx.bezierCurveTo(10, -80, 22, -68, 22, -58);
  ctx.bezierCurveTo(36, -38, 56, -18, 56, 0);
  ctx.bezierCurveTo(56, 22, 38, 42, 32, 52);
  ctx.lineTo(32, 68);
  ctx.lineTo(-32, 68);
  ctx.lineTo(-32, 52);
  ctx.bezierCurveTo(-38, 42, -56, 22, -56, 0);
  ctx.bezierCurveTo(-56, -18, -36, -38, -22, -58);
  ctx.bezierCurveTo(-22, -68, -10, -80, 0, -96);
  ctx.closePath();
}

/**
 * Trace the Fat Man body silhouette as a closed path.
 * Nose tip at y=-90, tail bottom at y=+62.
 */
function traceNukeBody(ctx) {
  ctx.beginPath();
  ctx.moveTo(0, -90);                             // nose tip
  ctx.bezierCurveTo(8, -75, 16, -65, 16, -58);   // nose cone right edge
  ctx.bezierCurveTo(28, -40, 50, -20, 50, 0);     // upper belly swell right
  ctx.bezierCurveTo(50, 20, 34, 38, 28, 48);      // lower belly taper right
  ctx.lineTo(28, 62);                              // tail cylinder right
  ctx.lineTo(-28, 62);                             // tail bottom
  ctx.lineTo(-28, 48);                             // tail cylinder left
  ctx.bezierCurveTo(-34, 38, -50, 20, -50, 0);    // lower belly taper left
  ctx.bezierCurveTo(-50, -20, -28, -40, -16, -58); // upper belly swell left
  ctx.bezierCurveTo(-16, -65, -8, -75, 0, -90);   // nose cone left edge
  ctx.closePath();
}

export class Nuke extends Entity {
  /**
   * @param {number} x
   * @param {number} y
   */
  constructor(x, y) {
    super(x, y);
    this.vx = 0;
    this.vy = 0;
    this.hp = MAX_HP;
    this.collisionRadius = 28;
    this.groups.add('enemy_missiles');
    this.groups.add('nukes');

    this.elapsed            = 0;   // total alive time — drives glow pulse
    this.flashTimer         = 0;   // counts down from FLASH_DURATION on hit
    this.damageShake        = 0;   // position jitter magnitude, decays each frame
    this.trefoilAngle       = 0;   // rotating radiation trefoil
    this.descentReticleAngle = 0;  // rotating descent targeting rings
    this.trail              = [];  // contrail positions [{x,y}]
  }

  /**
   * Calculate ballistic arc to target.
   * @param {number} targetX
   * @param {number} targetY
   * @param {number} launchTime  default 5.0s — slower arc than standard missiles
   */
  launchTo(targetX, targetY, launchTime = 5.0) {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    this.vx = dx / launchTime;
    this.vy = (dy - 0.5 * GRAVITY * launchTime * launchTime) / launchTime;
  }

  /**
   * Apply damage. Heat-seekers kill instantly.
   * @param {number}  amount      Damage points (default 1)
   * @param {boolean} isHeatSeeker Whether the projectile is a heat-seeker
   * @returns {boolean} true when the nuke is destroyed
   */
  takeDamage(amount = 1, isHeatSeeker = false) {
    if (isHeatSeeker) {
      this.hp = 0;
    } else {
      this.hp -= amount;
    }

    this.flashTimer  = FLASH_DURATION;
    this.damageShake = 10;

    if (this.hp <= 0) {
      this.hp = 0;
      this.destroy();
    }

    return this.hp <= 0;
  }

  update(dt) {
    this.elapsed += dt;

    // Ballistic gravity
    this.vy += GRAVITY * dt;
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;

    // Rotation follows velocity vector (nose points in travel direction)
    this.rotation = Math.atan2(this.vy, this.vx) + Math.PI / 2;

    // Trefoil and reticle rotation
    this.trefoilAngle        += dt * 0.4;
    this.descentReticleAngle += dt * (-0.5);

    // Contrail — record world position, keep last 60 points
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 60) this.trail.shift();

    // Flash and shake decay
    if (this.flashTimer > 0) {
      this.flashTimer = Math.max(0, this.flashTimer - dt);
    }
    if (this.damageShake > 0) {
      this.damageShake = Math.max(0, this.damageShake - 40 * dt);
    }

    // Off-screen cleanup
    if (
      this.y > OFF_SCREEN.bottom ||
      this.x < OFF_SCREEN.left   ||
      this.x > OFF_SCREEN.right
    ) {
      this.alive = false;
    }
  }

  draw(ctx) {
    const hpFrac     = this.hp / MAX_HP;            // 1.0 → undamaged
    const damageFrac = Math.pow(1 - hpFrac, 0.6);   // 0 → full health, 1 → critical
    const pulse      = 0.5 + 0.5 * Math.sin(this.elapsed * 3.0);
    const fastPulse  = 0.5 + 0.5 * Math.sin(this.elapsed * 8.0 * (1 + damageFrac));
    const glowAlpha  = (0.12 + 0.28 * damageFrac) * pulse;

    // Jitter from recent hit
    const jx = this.damageShake > 0 ? randf(-this.damageShake, this.damageShake) : 0;
    const jy = this.damageShake > 0 ? randf(-this.damageShake, this.damageShake) : 0;

    ctx.save();
    ctx.translate(this.x + jx, this.y + jy);

    // ── World-space effects (no body rotation) ────────────────────────────
    // Wide halo — radial gradient, always screen-aligned
    {
      const grad = ctx.createRadialGradient(0, 0, 40, 0, 0, 150);
      grad.addColorStop(0,    `rgba(0,255,65,0)`);
      grad.addColorStop(0.65, `rgba(0,255,65,${(0.03 * pulse).toFixed(4)})`);
      grad.addColorStop(1,    `rgba(0,255,65,0)`);
      ctx.beginPath();
      ctx.arc(0, 0, 150, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // Descent targeting reticle (when moving downward fast enough)
    if (this.vy > 30) {
      ctx.save();
      ctx.rotate(this.descentReticleAngle);

      // Inner dashed circle r=80
      ctx.beginPath();
      ctx.arc(0, 0, 80, 0, Math.PI * 2);
      ctx.setLineDash([12, 8]);
      ctx.strokeStyle = `rgba(57,255,20,0.35)`;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Outer dashed circle r=160
      ctx.beginPath();
      ctx.arc(0, 0, 160, 0, Math.PI * 2);
      ctx.setLineDash([20, 14]);
      ctx.strokeStyle = `rgba(57,255,20,0.20)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.restore();

      // ── Spec 4: Ground-zero marker (world-space, no reticle rotation) ───
      // Dashed drop line
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 2000);
      ctx.setLineDash([8, 12]);
      ctx.strokeStyle = `rgba(57,255,20,0.10)`;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);

      // Impact ring at ground (approximate: large y value below)
      // We draw it relative to the nuke position but targeting the floor indicator
      // Use a fixed large-distance marker anchored at the drop-line bottom visually
      const impactY = 2000;  // where the line terminates
      // Impact ring
      ctx.beginPath();
      ctx.arc(0, impactY, 22, 0, TAU);
      ctx.strokeStyle = `rgba(57,255,20,0.30)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Center dot
      ctx.beginPath();
      ctx.arc(0, impactY, 4, 0, TAU);
      ctx.fillStyle = `rgba(57,255,20,0.45)`;
      ctx.fill();
      // Crosshair arms (12px each direction)
      ctx.strokeStyle = `rgba(57,255,20,0.30)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-12, impactY); ctx.lineTo(12, impactY);
      ctx.moveTo(0, impactY - 12); ctx.lineTo(0, impactY + 12);
      ctx.stroke();
      // "IMPACT" label above the ring
      ctx.save();
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = `rgba(57,255,20,0.35)`;
      ctx.fillText('IMPACT', 0, impactY - 26);
      ctx.restore();
    }

    // Warning chevrons (when high up — y < 480 in world space)
    if (this.y < 480) {
      const chevAlpha = (0.6 * fastPulse).toFixed(4);
      ctx.strokeStyle = `rgba(57,255,20,${chevAlpha})`;
      ctx.lineWidth = 3;
      ctx.lineJoin = 'miter';
      for (let c = 0; c < 2; c++) {
        const cy = 140 + c * 28;
        ctx.beginPath();
        ctx.moveTo(-14, cy - 14);
        ctx.lineTo(0,   cy);
        ctx.lineTo(14,  cy - 14);
        ctx.stroke();
      }
    }

    // ── Spec 3: Contrail — fading green trail segments (world-space) ─────
    if (this.trail.length > 1) {
      for (let i = 1; i < this.trail.length; i++) {
        const t = i / this.trail.length;         // 0 (oldest) → 1 (newest)
        const alpha = t * 0.22;
        const lw = 1 + t * 2.5;
        const prev = this.trail[i - 1];
        const cur  = this.trail[i];
        ctx.save();
        ctx.strokeStyle = `rgba(80,220,80,${alpha.toFixed(3)})`;
        ctx.lineWidth = lw;
        ctx.beginPath();
        // Positions are in world space; ctx is already translated to this.x,this.y
        ctx.moveTo(prev.x - this.x, prev.y - this.y);
        ctx.lineTo(cur.x  - this.x, cur.y  - this.y);
        ctx.stroke();
        ctx.restore();
      }
    }

    // ── Apply body rotation for all remaining draw operations ─────────────
    ctx.rotate(this.rotation);

    // ── Layer A: tight radiation aura ────────────────────────────────────
    {
      const r = 56 + 6 * damageFrac;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,255,65,${((0.12 + 0.28 * damageFrac) * pulse).toFixed(4)})`;
      ctx.fill();
    }

    // ── Layer B: wide radiation aura ─────────────────────────────────────
    {
      const r = 90 + 20 * pulse;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,255,65,${(0.04 + 0.03 * damageFrac).toFixed(4)})`;
      ctx.fill();
    }

    // ── Layer C: damage rage (orange bleed when critically damaged) ───────
    if (damageFrac > 0.5) {
      const orangeAlpha = 0.45 * (damageFrac - 0.5) * 2 * pulse;
      const r = 65 + 12 * pulse;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,100,0,${orangeAlpha.toFixed(4)})`;
      ctx.fill();
    }

    // ── Body glow silhouette (bezier, 6px outset) ─────────────────────────
    traceNukeGlow(ctx);
    ctx.fillStyle = `rgba(0,255,65,${glowAlpha.toFixed(4)})`;
    ctx.fill();

    // ── Main hull (bezier Fat Man shape) ─────────────────────────────────
    traceNukeBody(ctx);
    ctx.fillStyle = C_BODY;
    ctx.fill();

    // ── Spec 1a: Body roundness gradient (left-to-right) — clipped to body ──
    ctx.save();
    traceNukeBody(ctx);
    ctx.clip();
    const roundGrad = ctx.createLinearGradient(-50, 0, 50, 0);
    roundGrad.addColorStop(0.00, 'rgba(8,10,5,1.0)');
    roundGrad.addColorStop(0.15, 'rgba(18,22,12,1.0)');
    roundGrad.addColorStop(0.38, 'rgba(38,48,24,0.85)');
    roundGrad.addColorStop(0.50, 'rgba(52,66,32,0.70)');
    roundGrad.addColorStop(0.62, 'rgba(38,48,24,0.85)');
    roundGrad.addColorStop(0.85, 'rgba(18,22,12,1.0)');
    roundGrad.addColorStop(1.00, 'rgba(8,10,5,1.0)');
    ctx.fillStyle = roundGrad;
    ctx.fillRect(-55, -95, 110, 160);
    ctx.restore();

    // ── Spec 1b: Panel lines — clipped to body ────────────────────────────
    ctx.save();
    traceNukeBody(ctx);
    ctx.clip();
    ctx.strokeStyle = 'rgba(0,30,0,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-49, -20); ctx.lineTo(49, -20); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,30,0,0.45)';
    ctx.beginPath(); ctx.moveTo(-28, 28); ctx.lineTo(28, 28); ctx.stroke();
    ctx.restore();

    // ── Hazard stripe band at equator (y=-8 to y=+8) — clipped to body ───
    ctx.save();
    traceNukeBody(ctx);
    ctx.clip();
    // Base toxic yellow
    ctx.fillStyle = C_TOXIC_YELLOW;
    ctx.fillRect(-55, -8, 110, 16);
    // Dark diagonal hatching
    ctx.strokeStyle = 'rgba(8,10,4,0.85)';
    ctx.lineWidth = 4;
    for (let sx = -68; sx <= 70; sx += 10) {
      ctx.beginPath();
      ctx.moveTo(sx,      -8);
      ctx.lineTo(sx + 16,  8);
      ctx.stroke();
    }
    ctx.restore();

    // ── Equator seam line ─────────────────────────────────────────────────
    ctx.save();
    traceNukeBody(ctx);
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(-55, 0);
    ctx.lineTo( 55, 0);
    ctx.strokeStyle = 'rgba(255,200,0,0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // ── Warning orange band ring at y=-52 to y=-46 ───────────────────────
    ctx.save();
    traceNukeBody(ctx);
    ctx.clip();
    ctx.fillStyle = C_WARHEAD_BAND;
    ctx.fillRect(-20, -52, 40, 6);
    // Inner highlight stroke
    ctx.beginPath();
    ctx.moveTo(-20, -49);
    ctx.lineTo( 20, -49);
    ctx.strokeStyle = 'rgba(255,200,80,0.9)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // ── Spec 1c: Rivets on warhead band ───────────────────────────────────
    ctx.save();
    traceNukeBody(ctx);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,220,100,0.8)';
    [-16, -8, 0, 8, 16].forEach(rx => {
      ctx.beginPath();
      ctx.arc(rx, -49, 2, 0, TAU);
      ctx.fill();
    });
    ctx.restore();

    // ── Nosecone section ──────────────────────────────────────────────────
    {
      const grad = ctx.createLinearGradient(-16, -58, 16, -90);
      grad.addColorStop(0.0, '#121408');
      grad.addColorStop(0.7, '#0D0D0D');
      grad.addColorStop(1.0, '#3DFF20');
      ctx.beginPath();
      ctx.moveTo(0, -90);
      ctx.bezierCurveTo(8, -75, 16, -65, 16, -58);
      ctx.lineTo(-16, -58);
      ctx.bezierCurveTo(-16, -65, -8, -75, 0, -90);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // Tip glow
    ctx.beginPath();
    ctx.arc(0, -90, 5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(61,255,32,${(0.9 * pulse).toFixed(4)})`;
    ctx.fill();
    // Tip bloom
    ctx.beginPath();
    ctx.arc(0, -90, 10, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0,255,65,${(0.3 * pulse).toFixed(4)})`;
    ctx.fill();

    // ── Four fins (drawn after body so they layer on top at tail) ─────────
    // Outer swept fins
    ctx.beginPath();
    ctx.moveTo(-28, 52);
    ctx.lineTo(-72, 78);
    ctx.lineTo(-28, 68);
    ctx.closePath();
    ctx.fillStyle = C_FIN;
    ctx.fill();
    // Edge highlight on swept outer edge
    ctx.beginPath();
    ctx.moveTo(-28, 52);
    ctx.lineTo(-72, 78);
    ctx.strokeStyle = 'rgba(80,100,60,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(28, 52);
    ctx.lineTo(72, 78);
    ctx.lineTo(28, 68);
    ctx.closePath();
    ctx.fillStyle = C_FIN;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(28, 52);
    ctx.lineTo(72, 78);
    ctx.strokeStyle = 'rgba(80,100,60,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Inner box fins
    ctx.fillStyle = '#1A2010';
    ctx.fillRect(-14, 54, 10, 24);
    ctx.fillRect(  4, 54, 10, 24);

    // ── Spec 1g: Fin depth strips — perspective face strips ───────────────
    // Left outer fin perspective strip (bright edge on top face)
    ctx.fillStyle = 'rgba(40,55,25,0.7)';
    ctx.beginPath();
    ctx.moveTo(-28, 52);
    ctx.lineTo(-72, 78);
    ctx.lineTo(-68, 78);
    ctx.lineTo(-24, 54);
    ctx.closePath();
    ctx.fill();
    // Right outer fin perspective strip
    ctx.beginPath();
    ctx.moveTo(28, 52);
    ctx.lineTo(72, 78);
    ctx.lineTo(68, 78);
    ctx.lineTo(24, 54);
    ctx.closePath();
    ctx.fill();
    // Inner box fin highlight strips
    ctx.fillStyle = 'rgba(50,65,30,0.6)';
    ctx.fillRect(-14, 54, 10, 3);
    ctx.fillRect(  4, 54, 10, 3);

    // ── Spec 1d: Radiation trefoil (rotating) — repositioned to y=-14 ────
    ctx.save();
    ctx.translate(0, -14);
    ctx.rotate(this.trefoilAngle);

    // Outer halo (r: 24→20)
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, TAU);
    ctx.fillStyle = `rgba(57,255,20,${(0.15 * pulse).toFixed(4)})`;
    ctx.fill();

    // Outer ring stroke (r: 22→18)
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, TAU);
    ctx.strokeStyle = 'rgba(57,255,20,0.95)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Hub filled circle (r: 7→5)
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, TAU);
    ctx.fillStyle = 'rgba(57,255,20,0.92)';
    ctx.fill();

    // Three trefoil blades (inner r: 9→7, outer r: 21→17)
    for (let s = 0; s < 3; s++) {
      const baseAngle = (s / 3) * TAU - Math.PI / 2;
      ctx.beginPath();
      ctx.arc(0, 0, 17, baseAngle + 0.25, baseAngle + Math.PI / 3 - 0.25);
      ctx.arc(0, 0,  7, baseAngle + Math.PI / 3 - 0.25, baseAngle + 0.25, true);
      ctx.closePath();
      ctx.fillStyle = 'rgba(57,255,20,0.92)';
      ctx.fill();
    }

    ctx.restore(); // end trefoil

    // ── Spec 1e: "DANGER" text — moved below trefoil, smaller, lower alpha ──
    ctx.save();
    ctx.shadowColor = 'rgba(0,255,65,0.5)';
    ctx.shadowBlur = 4;
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = 'rgba(57,255,20,0.75)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DANGER', 0, 38);
    ctx.restore();

    // ── Rocket fire trail — emanates from y=+62 (tail bottom) ────────────
    // White-hot core layers
    const trailCoreColors = [C_TRAIL_CORE, '#BEFFBE', C_TRAIL_GREEN];
    const coreY = [62, 70, 78];
    for (let i = 0; i < 3; i++) {
      const r = (10 - i * 1.5) * (0.75 + Math.random() * 0.5);
      ctx.beginPath();
      ctx.arc(randf(-3, 3), coreY[i], Math.max(r, 1), 0, Math.PI * 2);
      ctx.fillStyle = trailCoreColors[i];
      ctx.fill();
    }

    // Green fire layers
    const greenFireColors = [
      '#7FFF00', '#57D400', '#39FF14', '#28BB0F', '#14880A', 'rgba(8,60,4,0.4)'
    ];
    const flicker = 0.75 + Math.random() * 0.5;
    for (let i = 0; i < 6; i++) {
      const cy = 78 + i * 10 * flicker;
      const r  = (9 - i * 1.2) * flicker;
      ctx.beginPath();
      ctx.arc(randf(-5, 5), cy, Math.max(r, 1), 0, Math.PI * 2);
      ctx.fillStyle = greenFireColors[i];
      ctx.fill();
    }

    // ── Spec 2: Nozzle shock ring + turbulent exhaust puffs ──────────────
    // Nozzle shock diamond ring at tail exit
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 68, 14 + 4 * Math.sin(this.elapsed * 18), 0, TAU);
    ctx.strokeStyle = `rgba(180,255,180,${(0.55 + 0.2 * Math.sin(this.elapsed * 18)).toFixed(3)})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // 6 turbulent exhaust puffs (larger, more spread than old smoke)
    const puffOffsets = [
      { dx: randf(-6,6),  dy: 78  + randf(0, 8),  r: randf(10, 16) },
      { dx: randf(-8,8),  dy: 96  + randf(0, 10), r: randf(8,  13) },
      { dx: randf(-10,10),dy: 115 + randf(0, 10), r: randf(7,  12) },
      { dx: randf(-10,10),dy: 134 + randf(0, 12), r: randf(5,  10) },
      { dx: randf(-12,12),dy: 152 + randf(0, 12), r: randf(4,   9) },
      { dx: randf(-14,14),dy: 170 + randf(0, 14), r: randf(3,   8) },
    ];
    for (const p of puffOffsets) {
      ctx.beginPath();
      ctx.arc(p.dx, p.dy, Math.max(p.r, 1), 0, TAU);
      ctx.fillStyle = 'rgba(0,50,0,0.08)';
      ctx.fill();
    }

    // ── HP pips (screen-aligned, above the nose) ──────────────────────────
    ctx.save();
    // Undo body rotation so pips stay upright
    ctx.rotate(-this.rotation);
    const pipSpacing = 18;
    const totalPipW  = (MAX_HP - 1) * pipSpacing;
    for (let i = 0; i < MAX_HP; i++) {
      const px = i * pipSpacing - totalPipW / 2;
      const py = -116; // above the missile nose (nose tip at y=-90, 26px gap)

      if (i < this.hp) {
        // Filled pip: glow + inner fill + outer ring
        ctx.beginPath();
        ctx.arc(px, py, 10, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(57,255,20,${(0.15 * fastPulse).toFixed(4)})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(57,255,20,0.7)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(px, py, 7, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(57,255,20,0.9)';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        // Ghost pip for lost HP
        ctx.beginPath();
        ctx.arc(px, py, 7, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(57,255,20,0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    ctx.restore();

    // ── Hit flash overlay ─────────────────────────────────────────────────
    if (this.flashTimer > 0) {
      const t = this.flashTimer / FLASH_DURATION;
      const flashAlpha = t * 0.8;

      // Clip to body shape for the flash
      ctx.save();
      traceNukeBody(ctx);
      ctx.fillStyle = `rgba(200,255,200,${flashAlpha.toFixed(4)})`;
      ctx.fill();
      ctx.restore();

      // Expanding ring
      const ringR = 40 + 80 * (1 - t);
      ctx.beginPath();
      ctx.arc(0, 0, ringR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(57,255,20,${Math.min(flashAlpha * 1.5, 1).toFixed(4)})`;
      ctx.lineWidth = 4;
      ctx.stroke();
    }

    ctx.restore(); // end main save (translate + rotate)
  }
}
