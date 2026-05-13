/**
 * HunterDrone — autonomous player-launched combat drone.
 * 5-state AI: LAUNCH → SEARCH → PURSUE → ATTACK → EXPIRE
 * Group: player_missiles (collision with enemies handled in collision.js)
 */

import { Entity } from './entity.js';
import { lerpAngle, randf, TAU } from '../utils.js';

// ── State constants ───────────────────────────────────────────────────────────
const STATE_LAUNCH  = 0;
const STATE_SEARCH  = 1;
const STATE_PURSUE  = 2;
const STATE_ATTACK  = 3;
const STATE_EXPIRE  = 4;

// ── Speed constants (px/s) ────────────────────────────────────────────────────
const SPEED_SEARCH  = 350;
const SPEED_PURSUE  = 500;
const SPEED_ATTACK  = 650;

// ── Config ────────────────────────────────────────────────────────────────────
const LAUNCH_DURATION  = 1.5;   // seconds ascending vertically
const MAX_LIFETIME     = 12.0;  // total lifetime before expiry
const MAX_KILLS        = 3;     // kills before expiry
const TURN_RATE        = 3.0;   // radians/s
const ATTACK_RANGE     = 400;   // px — switch PURSUE → ATTACK
const SEARCH_ORBIT_R   = 260;   // radius of patrol orbit in SEARCH
const EXPIRE_FADE      = 1.5;   // seconds to fade during EXPIRE

// ── Target priority weights ───────────────────────────────────────────────────
const PRIORITY = {
  Nuke:         10,
  SuicideDrone: 8,
  SuperMissile: 6,
  MissileFragment: 6,
  Drone:        5,
  EnemyMissile: 3,
};

function targetPriority(e) {
  return PRIORITY[e.constructor.name] || 3;
}

// ── Flying-wing silhouette polygons (local coords, nose pointing right = 0°) ──
// The visual is drawn with nose along +X; heading angle rotates the whole shape.

// Hull — wide swept-wing, 70px span, 28px chord
const HULL_PTS  = [-14, 0,  -35, -6, -35, 6,  // tail left/right
                   -8, -10, 14, -14, 35, -8,    // left wing leading edge
                   42, 0,                         // nose
                   35, 8,  14, 14,  -8, 10       // right wing
                  ];

// Wing underside shading (darker)
const WING_DARK = [-14, 0, -35, 6, -8, 10, 14, 14, 35, 8, 42, 0, 28, 2];

// Engine glow pods (twin) — placed at wing roots
const ENG_L = [-4, -13, 4, -13, 4, -9, -4, -9];
const ENG_R = [-4, 13,  4, 13,  4, 9,  -4, 9 ];

// Sensor dome — small circle at nose
const DOME_X = 38;
const DOME_R = 5;

// Kill counter LED positions (3 lights on left wing)
const LEDS = [[-10, -8], [0, -12], [10, -15]];

export class HunterDrone extends Entity {
  /**
   * @param {number} x  — launch x (pad center)
   * @param {number} y  — launch y (pad surface)
   */
  constructor(x, y) {
    super(x, y);
    this.collisionRadius = 12;
    this.groups.add('player_missiles');

    this.state = STATE_LAUNCH;
    this.stateTimer = 0;
    this.lifetime = 0;
    this.killsRemaining = MAX_KILLS;

    // Movement
    this.vx = 0;
    this.vy = -SPEED_SEARCH; // launch upward
    this.heading = -Math.PI / 2; // pointing up

    // Search orbit
    this._orbitAngle = Math.random() * TAU;
    this._orbitCx = x;
    this._orbitCy = y - 320; // patrol center above pad

    // Target
    /** @type {Entity|null} */
    this.target = null;

    /** @type {function|null} Returns array of enemy entities in 'enemy_missiles' group */
    this.getEnemies = null;

    /** @type {function|null} Called when drone enters EXPIRE state (1 kill cycle done) */
    this.onExpire = null;

    // Visual
    this._scanRotation = 0;
    this._expireAlpha  = 1.0;

    // Engine glow pulse
    this._glowPhase = Math.random() * TAU;
  }

  // ── Public ──────────────────────────────────────────────────────────────────

  /**
   * Called by collision.js when the drone hits a normal (non-lethal) enemy.
   * Drone survives and decrements its kill counter.
   */
  registerKill() {
    this.killsRemaining--;
    if (this.killsRemaining <= 0) {
      this._transitionTo(STATE_EXPIRE);
    } else {
      // Re-enter search to pick next target
      this.target = null;
      this._transitionTo(STATE_SEARCH);
    }
  }

  // ── Update ──────────────────────────────────────────────────────────────────

  update(dt) {
    this.lifetime += dt;
    this.stateTimer += dt;
    this._glowPhase += dt * 5.0;
    this._scanRotation += dt * 2.0;

    if (this.state !== STATE_EXPIRE && this.lifetime >= MAX_LIFETIME) {
      this._transitionTo(STATE_EXPIRE);
    }

    switch (this.state) {
      case STATE_LAUNCH:  this._updateLaunch(dt);  break;
      case STATE_SEARCH:  this._updateSearch(dt);  break;
      case STATE_PURSUE:  this._updatePursue(dt);  break;
      case STATE_ATTACK:  this._updateAttack(dt);  break;
      case STATE_EXPIRE:  this._updateExpire(dt);  break;
    }
  }

  _transitionTo(newState) {
    this.state = newState;
    this.stateTimer = 0;
    if (newState === STATE_EXPIRE && this.onExpire) {
      this.onExpire();
    }
  }

  _updateLaunch(dt) {
    // Ascend vertically
    this.vy = -SPEED_SEARCH;
    this.vx = 0;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.heading = -Math.PI / 2;

    if (this.stateTimer >= LAUNCH_DURATION) {
      this._orbitCx = this.x;
      this._orbitCy = this.y;
      this._transitionTo(STATE_SEARCH);
    }
  }

  _updateSearch(dt) {
    // Circular patrol orbit
    this._orbitAngle += (SPEED_SEARCH / SEARCH_ORBIT_R) * dt;
    const targetX = this._orbitCx + Math.cos(this._orbitAngle) * SEARCH_ORBIT_R;
    const targetY = this._orbitCy + Math.sin(this._orbitAngle) * SEARCH_ORBIT_R;

    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const desired = Math.atan2(dy, dx);
    this.heading = lerpAngle(this.heading, desired, TURN_RATE * dt);
    this.vx = Math.cos(this.heading) * SPEED_SEARCH;
    this.vy = Math.sin(this.heading) * SPEED_SEARCH;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Scan for target every 0.25s
    if (this.stateTimer >= 0.25) {
      this.stateTimer = 0;
      this.target = this._pickTarget();
      if (this.target) {
        this._transitionTo(STATE_PURSUE);
      }
    }
  }

  _updatePursue(dt) {
    if (!this.target || !this.target.alive) {
      this.target = this._pickTarget();
      if (!this.target) {
        this._transitionTo(STATE_SEARCH);
        return;
      }
    }

    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const d  = Math.sqrt(dx * dx + dy * dy);

    // Steer toward target
    const desired = Math.atan2(dy, dx);
    this.heading = lerpAngle(this.heading, desired, TURN_RATE * dt);
    this.vx = Math.cos(this.heading) * SPEED_PURSUE;
    this.vy = Math.sin(this.heading) * SPEED_PURSUE;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (d < ATTACK_RANGE) {
      this._transitionTo(STATE_ATTACK);
    }

    // Reacquire if target died
    if (!this.target.alive) {
      this.target = null;
    }
  }

  _updateAttack(dt) {
    if (!this.target || !this.target.alive) {
      this.target = this._pickTarget();
      if (!this.target) {
        this._transitionTo(STATE_SEARCH);
        return;
      }
      this._transitionTo(STATE_PURSUE);
      return;
    }

    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const desired = Math.atan2(dy, dx);
    this.heading = lerpAngle(this.heading, desired, TURN_RATE * 1.5 * dt);
    this.vx = Math.cos(this.heading) * SPEED_ATTACK;
    this.vy = Math.sin(this.heading) * SPEED_ATTACK;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  _updateExpire(dt) {
    // Decelerate and fade
    this.vx *= Math.pow(0.05, dt);
    this.vy *= Math.pow(0.05, dt);
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this._expireAlpha = Math.max(0, 1.0 - this.stateTimer / EXPIRE_FADE);
    if (this.stateTimer >= EXPIRE_FADE) {
      this.alive = false;
    }
  }

  _pickTarget() {
    if (!this.getEnemies) return null;
    const enemies = this.getEnemies();
    let best = null;
    let bestScore = -Infinity;

    for (const e of enemies) {
      if (!e.alive) continue;
      const dx = e.x - this.x;
      const dy = e.y - this.y;
      const d  = Math.sqrt(dx * dx + dy * dy);
      const priority = targetPriority(e);
      // Score = priority / (normalised distance) — prefer close + high-priority
      const score = priority * 1000 / (d + 1);
      if (score > bestScore) {
        bestScore = score;
        best = e;
      }
    }
    return best;
  }

  // ── Draw ────────────────────────────────────────────────────────────────────

  draw(ctx) {
    if (!this.alive) return;

    ctx.save();
    ctx.globalAlpha = this._expireAlpha;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.heading);

    // ── Hull ──────────────────────────────────────────────────────────────────
    const hullGrad = ctx.createLinearGradient(-35, -14, 42, 14);
    hullGrad.addColorStop(0, '#0D1F30');
    hullGrad.addColorStop(0.5, '#1A2E4A');
    hullGrad.addColorStop(1, '#0A1820');
    ctx.fillStyle = hullGrad;
    ctx.beginPath();
    ctx.moveTo(HULL_PTS[0], HULL_PTS[1]);
    for (let i = 2; i < HULL_PTS.length; i += 2) ctx.lineTo(HULL_PTS[i], HULL_PTS[i + 1]);
    ctx.closePath();
    ctx.fill();

    // Wing underside darker
    ctx.fillStyle = 'rgba(5,12,22,0.55)';
    ctx.beginPath();
    ctx.moveTo(WING_DARK[0], WING_DARK[1]);
    for (let i = 2; i < WING_DARK.length; i += 2) ctx.lineTo(WING_DARK[i], WING_DARK[i + 1]);
    ctx.closePath();
    ctx.fill();

    // Wing edge highlight — thin cyan trim
    ctx.strokeStyle = 'rgba(0,207,255,0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-35, -6);
    ctx.lineTo(14, -14);
    ctx.lineTo(42, 0);
    ctx.lineTo(14, 14);
    ctx.lineTo(-35, 6);
    ctx.stroke();

    // ── Engine glow pods ──────────────────────────────────────────────────────
    const glowPulse = 0.6 + Math.sin(this._glowPhase) * 0.4;
    const engineColor = `rgba(0,207,255,${(glowPulse * 0.9).toFixed(3)})`;

    for (const pod of [ENG_L, ENG_R]) {
      ctx.save();
      ctx.shadowColor = '#00CFFF';
      ctx.shadowBlur = 12;
      ctx.fillStyle = engineColor;
      ctx.beginPath();
      ctx.moveTo(pod[0], pod[1]);
      for (let i = 2; i < pod.length; i += 2) ctx.lineTo(pod[i], pod[i + 1]);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Engine exhaust trail
    const exhaustA = glowPulse * 0.6;
    for (let i = 0; i < 4; i++) {
      const ex = -14 - i * 9;
      const alpha = exhaustA * (1 - i / 4);
      ctx.beginPath();
      ctx.arc(ex, (Math.random() - 0.5) * 6, randf(1.5, 3.5), 0, TAU);
      ctx.fillStyle = `rgba(0,207,255,${alpha.toFixed(3)})`;
      ctx.fill();
    }

    // ── Sensor dome (nose) ─────────────────────────────────────────────────────
    ctx.save();
    ctx.shadowColor = '#00CFFF';
    ctx.shadowBlur = 10;
    const domeGrad = ctx.createRadialGradient(DOME_X, 0, 0, DOME_X, 0, DOME_R);
    domeGrad.addColorStop(0, 'rgba(0,220,255,1)');
    domeGrad.addColorStop(1, 'rgba(0,100,180,0.7)');
    ctx.fillStyle = domeGrad;
    ctx.beginPath();
    ctx.arc(DOME_X, 0, DOME_R, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // ── Kill counter LEDs ──────────────────────────────────────────────────────
    for (let i = 0; i < MAX_KILLS; i++) {
      const [lx, ly] = LEDS[i];
      const lit = i < this.killsRemaining;
      ctx.save();
      if (lit) {
        ctx.shadowColor = '#00FF88';
        ctx.shadowBlur = 6;
        ctx.fillStyle = '#00FF88';
      } else {
        ctx.fillStyle = '#1A3A2A';
      }
      ctx.beginPath();
      ctx.arc(lx, ly, 2.5, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // ── State-specific overlays ────────────────────────────────────────────────

    if (this.state === STATE_SEARCH) {
      // Scanning ring — rotates independently
      ctx.save();
      ctx.rotate(this._scanRotation); // additional rotation on top of heading
      ctx.strokeStyle = 'rgba(0,207,255,0.22)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 10]);
      ctx.beginPath();
      ctx.arc(0, 0, 60, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      // tick marks
      for (let t = 0; t < 6; t++) {
        const ta = (t / 6) * TAU;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ta) * 55, Math.sin(ta) * 55);
        ctx.lineTo(Math.cos(ta) * 64, Math.sin(ta) * 64);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (this.state === STATE_PURSUE && this.target) {
      // Lock-on brackets: unrotate back to world space and draw relative to target
      const tgt = this.target;
      // We're currently inside ctx.rotate(this.heading) and ctx.translate(this.x, this.y)
      // Use resetTransform to go back to a known state, then draw in canvas space.
      ctx.restore(); // pops translate+rotate
      // Draw brackets in plain canvas space
      this._drawLockBracketsWorld(ctx, tgt.x, tgt.y);
      return; // early out — no further ctx.restore() needed
    }

    ctx.restore(); // heading rotation + translation
  }

  /**
   * Draw lock-on brackets at a world canvas position.
   * Must be called with canvas in un-transformed (world) space.
   */
  _drawLockBracketsWorld(ctx, tx, ty) {
    const s = 28;
    const arm = 10;
    const pulse = 0.6 + 0.4 * Math.sin(performance.now() * 0.012);

    ctx.save();
    ctx.strokeStyle = `rgba(0,207,255,${pulse.toFixed(3)})`;
    ctx.lineWidth = 2;

    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const bx = tx + sx * s;
      const by = ty + sy * s;
      ctx.beginPath();
      ctx.moveTo(bx, by + sy * arm);
      ctx.lineTo(bx, by);
      ctx.lineTo(bx + sx * arm, by);
      ctx.stroke();
    }
    ctx.restore();
  }
}
