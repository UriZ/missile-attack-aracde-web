/**
 * MushroomCloud — dramatic rising mushroom cloud effect spawned on nuke impact.
 * Purely visual (no collision). Multi-phase: stem rise, cap expansion, dissipation.
 */

import { Entity } from './entity.js';
import { TAU, clamp, randf } from '../utils.js';

const CLOUD_LIFETIME = 6.0;       // Total lifetime in seconds
const STEM_RISE_SPEED = 180;      // Pixels per second the stem grows upward
const CAP_MAX_RADIUS = 200;       // Maximum mushroom cap radius
const CAP_EXPAND_DURATION = 2.0;  // Seconds to reach full cap size
const STEM_WIDTH = 60;            // Width of the stem at base
const RING_COUNT = 5;             // Number of rolling smoke rings on the cap

export class MushroomCloud extends Entity {
  constructor(x, y) {
    super(x, y);
    this.groups.add('effects');

    this.elapsed = 0;

    // Stem state
    this.stemHeight = 0;
    this.maxStemHeight = 350;

    // Cap state
    this.capRadius = 0;
    this.capY = 0; // relative to base

    // Smoke ring particles on the cap edge
    this.rings = [];
    for (let i = 0; i < RING_COUNT; i++) {
      this.rings.push({
        angle: (TAU / RING_COUNT) * i + randf(-0.3, 0.3),
        speed: randf(0.8, 1.5),
        size: randf(0.7, 1.2),
        wobble: randf(0, TAU),
      });
    }

    // Billowing internal clouds
    this.billows = [];
    for (let i = 0; i < 8; i++) {
      this.billows.push({
        angle: randf(0, TAU),
        dist: randf(0.2, 0.8),
        size: randf(0.4, 0.9),
        phase: randf(0, TAU),
        speed: randf(1.5, 3.0),
      });
    }

    // Base fire/dust ring
    this.dustRingRadius = 0;
    this.dustRingMaxRadius = 280;
  }

  update(dt) {
    this.elapsed += dt;

    if (this.elapsed >= CLOUD_LIFETIME) {
      this.destroy();
      return;
    }

    const progress = this.elapsed / CLOUD_LIFETIME;

    // Stem rises quickly then decelerates
    const stemProgress = clamp(this.elapsed / 2.5, 0, 1);
    this.stemHeight = this.maxStemHeight * (1 - Math.pow(1 - stemProgress, 2.5));

    // Cap expands after a brief delay
    const capStart = 0.3;
    if (this.elapsed > capStart) {
      const capProgress = clamp((this.elapsed - capStart) / CAP_EXPAND_DURATION, 0, 1);
      this.capRadius = CAP_MAX_RADIUS * (1 - Math.pow(1 - capProgress, 2));
    }

    this.capY = -this.stemHeight;

    // Dust ring expands quickly then fades
    const dustProgress = clamp(this.elapsed / 1.5, 0, 1);
    this.dustRingRadius = this.dustRingMaxRadius * (1 - Math.pow(1 - dustProgress, 3));

    // Animate ring particles
    for (const ring of this.rings) {
      ring.angle += ring.speed * dt;
      ring.wobble += dt * 3;
    }
  }

  draw(ctx) {
    const progress = clamp(this.elapsed / CLOUD_LIFETIME, 0, 1);
    const fadeAlpha = progress < 0.6 ? 1.0 : clamp(1 - (progress - 0.6) / 0.4, 0, 1);

    if (fadeAlpha < 0.01) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    // === Ground dust ring ===
    if (this.dustRingRadius > 5 && progress < 0.5) {
      const dustAlpha = fadeAlpha * (1 - progress * 2) * 0.4;
      ctx.beginPath();
      ctx.arc(0, 0, this.dustRingRadius, 0, TAU);
      ctx.strokeStyle = `rgba(180, 140, 80, ${dustAlpha.toFixed(3)})`;
      ctx.lineWidth = 15;
      ctx.stroke();
      // Inner glow
      ctx.beginPath();
      ctx.arc(0, 0, this.dustRingRadius * 0.5, 0, TAU);
      ctx.fillStyle = `rgba(255, 120, 30, ${(dustAlpha * 0.3).toFixed(3)})`;
      ctx.fill();
    }

    // === Stem ===
    if (this.stemHeight > 5) {
      const stemAlpha = fadeAlpha * 0.85;
      // Stem narrows as it rises — trapezoidal shape
      const baseW = STEM_WIDTH;
      const topW = STEM_WIDTH * 0.4;
      const stemTop = this.capY;

      // Stem body gradient (dark grey-brown smoke)
      const grad = ctx.createLinearGradient(0, 0, 0, stemTop);
      grad.addColorStop(0, `rgba(90, 70, 50, ${stemAlpha.toFixed(3)})`);
      grad.addColorStop(0.4, `rgba(120, 100, 80, ${(stemAlpha * 0.9).toFixed(3)})`);
      grad.addColorStop(0.7, `rgba(160, 130, 100, ${(stemAlpha * 0.8).toFixed(3)})`);
      grad.addColorStop(1, `rgba(200, 160, 120, ${(stemAlpha * 0.7).toFixed(3)})`);

      ctx.beginPath();
      ctx.moveTo(-baseW / 2, 0);
      ctx.lineTo(-topW / 2, stemTop);
      ctx.lineTo(topW / 2, stemTop);
      ctx.lineTo(baseW / 2, 0);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Internal turbulence lines
      const turbAlpha = stemAlpha * 0.3;
      for (let i = 0; i < 4; i++) {
        const ty = stemTop * (0.2 + i * 0.2);
        const tw = baseW * 0.3 * (1 - Math.abs(ty / stemTop) * 0.5);
        const wobble = Math.sin(this.elapsed * 3 + i * 2) * tw * 0.3;
        ctx.beginPath();
        ctx.arc(wobble, ty, tw * 0.4, 0, TAU);
        ctx.fillStyle = `rgba(60, 50, 40, ${turbAlpha.toFixed(3)})`;
        ctx.fill();
      }

      // Base fire glow (early phase)
      if (progress < 0.3) {
        const fireAlpha = fadeAlpha * (1 - progress / 0.3) * 0.6;
        ctx.beginPath();
        ctx.arc(0, -10, baseW * 0.7, 0, TAU);
        ctx.fillStyle = `rgba(255, 100, 20, ${fireAlpha.toFixed(3)})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, -10, baseW * 0.4, 0, TAU);
        ctx.fillStyle = `rgba(255, 200, 50, ${(fireAlpha * 0.8).toFixed(3)})`;
        ctx.fill();
      }
    }

    // === Mushroom cap ===
    if (this.capRadius > 5) {
      const capAlpha = fadeAlpha * 0.8;
      const cx = 0;
      const cy = this.capY;

      // Main cap — slightly flattened ellipse
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, 0.6);

      // Outer cap layer (darker)
      ctx.beginPath();
      ctx.arc(0, 0, this.capRadius, 0, TAU);
      ctx.fillStyle = `rgba(140, 110, 80, ${capAlpha.toFixed(3)})`;
      ctx.fill();

      // Mid layer
      ctx.beginPath();
      ctx.arc(0, 0, this.capRadius * 0.75, 0, TAU);
      ctx.fillStyle = `rgba(180, 140, 100, ${(capAlpha * 0.9).toFixed(3)})`;
      ctx.fill();

      // Inner hot core
      ctx.beginPath();
      ctx.arc(0, 0, this.capRadius * 0.4, 0, TAU);
      const coreHeat = progress < 0.4 ? 1 : clamp(1 - (progress - 0.4) / 0.3, 0, 1);
      ctx.fillStyle = `rgba(255, ${(140 + coreHeat * 80) | 0}, ${(50 + coreHeat * 50) | 0}, ${(capAlpha * 0.7 * coreHeat).toFixed(3)})`;
      ctx.fill();

      // Billowing internal clouds
      for (const b of this.billows) {
        const bx = Math.cos(b.angle + this.elapsed * b.speed * 0.3) * this.capRadius * b.dist;
        const by = Math.sin(b.phase + this.elapsed * b.speed * 0.5) * this.capRadius * b.dist * 0.5;
        const bs = this.capRadius * b.size * 0.35;
        ctx.beginPath();
        ctx.arc(bx, by, bs, 0, TAU);
        ctx.fillStyle = `rgba(100, 80, 60, ${(capAlpha * 0.4).toFixed(3)})`;
        ctx.fill();
      }

      ctx.restore(); // undo scale

      // Rolling smoke rings around cap edge
      for (const ring of this.rings) {
        const rx = cx + Math.cos(ring.angle) * this.capRadius * 0.9;
        const ry = cy + Math.sin(ring.angle) * this.capRadius * 0.5 * 0.6;
        const rs = this.capRadius * 0.2 * ring.size;
        const wobbleAlpha = 0.5 + 0.3 * Math.sin(ring.wobble);
        ctx.beginPath();
        ctx.arc(rx, ry, rs, 0, TAU);
        ctx.fillStyle = `rgba(160, 130, 100, ${(capAlpha * 0.5 * wobbleAlpha).toFixed(3)})`;
        ctx.fill();
      }

      // Top crown of the cap (lighter smoke rising)
      if (progress < 0.7) {
        const crownAlpha = capAlpha * (1 - progress / 0.7) * 0.5;
        ctx.beginPath();
        ctx.arc(cx, cy - this.capRadius * 0.3, this.capRadius * 0.5, 0, TAU);
        ctx.fillStyle = `rgba(200, 170, 130, ${crownAlpha.toFixed(3)})`;
        ctx.fill();
      }
    }

    ctx.restore();
  }
}
