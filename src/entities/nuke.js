/**
 * Nuke — heavily armoured ballistic warhead.
 *
 * Takes multiple hits to destroy (MAX_HP = 3). Heat-seeking missiles kill it
 * instantly. On impact with terrain or launchers it triggers a catastrophic
 * multi-explosion spread much larger than a SuperMissile.
 */

import { Entity } from './entity.js';
import { rgba, randf } from '../utils.js';
import { drawPoly } from './launcher.js';

const GRAVITY = 60;          // Slower, more deliberate descent
const MAX_HP = 3;
const PULSE_SPEED = 4.0;     // Glow pulse speed (rad/s)
const FLASH_DURATION = 0.25; // Seconds the hit-flash overlay stays visible

const OFF_SCREEN = { bottom: 1600, left: -200, right: 2760 };

// ── Body geometry — wider/taller than SuperMissile (~52px wide, ~110px tall) ──

// Outer glow
const BODY_GLOW    = [-30, 55,  30, 55,  30,-35, -30,-35];
// Gunmetal body
const BODY         = [-26, 50,  26, 50,  26,-30, -26,-30];
// Yellow/black hazard stripe band 1
const STRIPE1_A    = [-26, 20,  26, 20,  26, 10, -26, 10];
const STRIPE1_B    = [-26,  4,  26,  4,  26, -6, -26, -6];
// Yellow/black hazard stripe band 2 (narrower, near tail)
const STRIPE2_A    = [-26, 40,  26, 40,  26, 32, -26, 32];
// Warhead band
const WARHEAD_BAND = [-27,-24,  27,-24,  27,-30, -27,-30];
// Pointed red nosecone
const NOSECONE     = [-26,-30,   0,-62,  26,-30];
// Body detail seam
const BODY_DETAIL  = [-26,-14,  26,-14,  26,-20, -26,-20];
// Fins — three fins at tail
const FIN_LEFT     = [-26, 38,  -42, 55, -26, 50];
const FIN_RIGHT    = [ 26, 38,   42, 55,  26, 50];
const FIN_CENTER   = [  -8, 44,   8, 44,   8, 56,  -8, 56];

// Radiation symbol circle (drawn as arc, not polygon)
// We'll render it procedurally in draw().

// Rocket fire gradient (same palette, larger)
const FIRE_COLORS = [
  rgba(1, 0.95, 0.7, 1),
  rgba(1, 0.72, 0.05, 1),
  rgba(1, 0.3,  0,   0.85),
  rgba(0.85, 0.08, 0, 0.4),
  rgba(0.3,  0.02, 0, 0),
];

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

    this.elapsed     = 0;   // total alive time — drives glow pulse
    this.flashTimer  = 0;   // counts down from FLASH_DURATION on hit
    this.damageShake = 0;   // position jitter magnitude, decays each frame
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
    this.damageShake = 10;  // was 6, increased for BUG-007

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
    // HP fraction drives glow intensity (more menacing as damage is taken)
    const hpFrac    = this.hp / MAX_HP;           // 1.0 → undamaged, 0.33 → one hit left
    const damageFrac = Math.pow(1 - hpFrac, 0.6); // 0 → full health, 1 → critical (nonlinear)
    const pulse     = 0.55 + 0.45 * Math.sin(this.elapsed * PULSE_SPEED);
    const glowAlpha = (0.25 + 0.45 * damageFrac) * pulse;

    // Jitter from recent hit
    const jx = this.damageShake > 0 ? randf(-this.damageShake, this.damageShake) : 0;
    const jy = this.damageShake > 0 ? randf(-this.damageShake, this.damageShake) : 0;

    ctx.save();
    ctx.translate(this.x + jx, this.y + jy);
    ctx.rotate(this.rotation);

    // ── Pulsing aura glow ────────────────────────────────────────────────
    // Colour shifts from orange toward red as HP drops
    const glowR = 1.0;
    const glowG = 0.35 * hpFrac;  // loses green → becomes deeper red
    ctx.beginPath();
    ctx.arc(0, 0, 38 + 10 * damageFrac, 0, Math.PI * 2);
    ctx.fillStyle = rgba(glowR, glowG, 0.0, glowAlpha);
    ctx.fill();

    // ── Main body ────────────────────────────────────────────────────────
    drawPoly(ctx, BODY_GLOW, rgba(1.0, 0.3, 0.05, 0.22));
    // Gunmetal dark grey body
    drawPoly(ctx, BODY, rgba(0.20, 0.22, 0.24));

    // ── Yellow/black hazard stripes ──────────────────────────────────────
    // We alternate yellow and dark-grey bands manually using sub-rects
    drawPoly(ctx, STRIPE1_A, rgba(0.88, 0.80, 0.0));   // yellow band
    drawPoly(ctx, STRIPE1_B, rgba(0.88, 0.80, 0.0));   // yellow band
    drawPoly(ctx, STRIPE2_A, rgba(0.88, 0.80, 0.0));   // yellow band
    // Dark diagonal hatching overlaid on stripe bands — drawn as thin lines
    ctx.save();
    ctx.strokeStyle = rgba(0.08, 0.08, 0.08, 0.7);
    ctx.lineWidth = 3;
    for (let sx = -26; sx <= 26; sx += 8) {
      // Stripe 1 (y 10..20)
      ctx.beginPath(); ctx.moveTo(sx, 10); ctx.lineTo(sx + 10, 20); ctx.stroke();
      // Stripe 1b (y -6..4)
      ctx.beginPath(); ctx.moveTo(sx, -6); ctx.lineTo(sx + 10,  4); ctx.stroke();
      // Stripe 2 (y 32..40)
      ctx.beginPath(); ctx.moveTo(sx, 32); ctx.lineTo(sx + 8, 40); ctx.stroke();
    }
    ctx.restore();

    // ── Body detail seam ─────────────────────────────────────────────────
    drawPoly(ctx, BODY_DETAIL, rgba(0.14, 0.15, 0.16));

    // ── Warhead band ─────────────────────────────────────────────────────
    drawPoly(ctx, WARHEAD_BAND, rgba(0.80, 0.12, 0.05));

    // ── Nosecone ──────────────────────────────────────────────────────────
    drawPoly(ctx, NOSECONE, rgba(0.90, 0.08, 0.04));

    // ── Fins ──────────────────────────────────────────────────────────────
    drawPoly(ctx, FIN_LEFT,   rgba(0.18, 0.20, 0.22));
    drawPoly(ctx, FIN_RIGHT,  rgba(0.18, 0.20, 0.22));
    drawPoly(ctx, FIN_CENTER, rgba(0.18, 0.20, 0.22));

    // ── Radiation/hazard circle on body ──────────────────────────────────
    // Drawn in local space centered on the mid-body area (y = 0)
    ctx.save();
    ctx.translate(0, -2);
    // Outer ring
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.strokeStyle = rgba(0.88, 0.80, 0.0, 0.9);
    ctx.lineWidth = 2;
    ctx.stroke();
    // Inner filled circle
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fillStyle = rgba(0.88, 0.80, 0.0, 0.9);
    ctx.fill();
    // Three sector wedges of the trefoil
    for (let s = 0; s < 3; s++) {
      const angle = (s / 3) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 10, angle + 0.2, angle + Math.PI / 3 - 0.2);
      ctx.closePath();
      ctx.fillStyle = rgba(0.88, 0.80, 0.0, 0.85);
      ctx.fill();
    }
    ctx.restore();

    // ── Rocket fire trail ─────────────────────────────────────────────────
    // Larger than enemy missile — 10 layers, more spread
    const flicker = 0.75 + Math.random() * 0.5;
    for (let i = 0; i < 10; i++) {
      const t        = i / 9;
      const cy       = 50 + i * 9 * flicker;
      const r        = (12 - i * 0.8) * flicker;
      const colorIdx = Math.min(
        Math.floor(t * (FIRE_COLORS.length - 1)),
        FIRE_COLORS.length - 1
      );
      ctx.beginPath();
      ctx.arc(randf(-4, 4), cy, r, 0, Math.PI * 2);
      ctx.fillStyle = FIRE_COLORS[colorIdx];
      ctx.fill();
    }

    // ── HP pips (above nuke, in rotated local space) ──────────────────────
    // Draw in screen-aligned space so they're always readable
    ctx.save();
    // Undo the missile rotation so pips stay upright
    ctx.rotate(-this.rotation);
    const pipSpacing = 14;
    const totalPipW  = (MAX_HP - 1) * pipSpacing;
    for (let i = 0; i < this.hp; i++) {
      const px = (i * pipSpacing) - totalPipW / 2;
      const py = -75; // above the missile nose
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fillStyle = rgba(0.098, 0.902, 0.157, 0.95);
      ctx.fill();
      ctx.strokeStyle = rgba(1, 1, 1, 0.9);
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();

    // ── White flash overlay when recently hit ────────────────────────────
    if (this.flashTimer > 0) {
      const flashAlpha = (this.flashTimer / FLASH_DURATION) * 0.75;
      ctx.beginPath();
      // Cover the full body silhouette
      ctx.rect(-28, -65, 56, 125);
      ctx.fillStyle = rgba(1, 1, 1, flashAlpha);
      ctx.fill();
    }

    ctx.restore();
  }
}
