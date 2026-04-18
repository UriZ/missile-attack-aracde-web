/**
 * Drone — translated from drone.gd.
 * Horizontal patrol that drops bombs on launchers below.
 */

import { Entity } from './entity.js';
import { rgba, randf } from '../utils.js';
import { drawPoly } from './launcher.js';

const SPEED = 130;
const OFF_SCREEN = { left: -200, right: 2760 };

// Polygon data from SCENE_DATA §9
const BODY = [-45,0, -28,-5, -5,-7, 20,-5, 40,-2, 45,0, 40,2, 20,5, -5,7, -28,5];
const COCKPIT = [8,-5, 28,-4, 38,0, 28,4, 8,5, 15,0];
const UPPER_WING = [-8,-7, 12,-7, -2,-28, -22,-10];
const LOWER_FIN = [-8,7, 5,7, -5,22, -22,10];
const TAIL_FIN = [-35,0, -50,-14, -47,0, -50,5, -35,1];
const ENGINE_GLOW = [-48,0, -44,-4, -40,0, -44,4];

export class Drone extends Entity {
  /**
   * @param {boolean} fromLeft — true = enters from left, false = from right
   * @param {number} yPos — vertical position
   */
  constructor(fromLeft, yPos) {
    super(fromLeft ? -80 : 2640, yPos);
    this.direction = fromLeft ? 1 : -1;
    this.collisionRadius = 40;
    this.groups.add('enemy_missiles');
    this.bombCooldown = randf(1.5, 3.0);

    /** @type {function|null} Called to spawn a bomb at (x, y) */
    this.onDropBomb = null;

    /** @type {function|null} Called to get launchers for targeting */
    this.getLaunchers = null;
  }

  update(dt) {
    this.x += SPEED * this.direction * dt;

    // Bomb logic
    this.bombCooldown -= dt;
    if (this.bombCooldown <= 0) {
      this._tryDropBomb();
    }

    // Off-screen cleanup
    if (this.x < OFF_SCREEN.left || this.x > OFF_SCREEN.right) {
      this.alive = false;
    }
  }

  _tryDropBomb() {
    if (!this.getLaunchers) {
      this.bombCooldown = randf(0.4, 1.0);
      return;
    }

    const launchers = this.getLaunchers();
    for (const launcher of launchers) {
      if (launcher.alive && Math.abs(launcher.x - this.x) < 180) {
        if (this.onDropBomb) {
          this.onDropBomb(this.x, this.y);
        }
        this.bombCooldown = randf(3.5, 5.5);
        return;
      }
    }
    // No launcher below — check again soon
    this.bombCooldown = randf(0.4, 1.0);
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.direction, 1);

    drawPoly(ctx, BODY, rgba(0.30, 0.52, 0.75));
    drawPoly(ctx, COCKPIT, rgba(0.15, 0.70, 1.0));
    drawPoly(ctx, UPPER_WING, rgba(0.22, 0.42, 0.62, 0.95));
    drawPoly(ctx, LOWER_FIN, rgba(0.20, 0.38, 0.58, 0.95));
    drawPoly(ctx, TAIL_FIN, rgba(0.25, 0.45, 0.65));

    // Animated engine glow
    const glowAlpha = 0.55 + Math.sin(performance.now() * 0.01) * 0.4;
    drawPoly(ctx, ENGINE_GLOW, rgba(1.0, 0.7, 0.15, glowAlpha));

    ctx.restore();
  }
}
