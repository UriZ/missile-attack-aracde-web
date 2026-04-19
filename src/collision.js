/**
 * CollisionSystem — per-frame collision detection between entity groups.
 *
 * Translates main.gd's Area2D overlap handling into explicit group-vs-group
 * circle tests and heightmap checks. Check order matches the original:
 *
 *   1. player_missiles vs enemy_missiles  — circle/circle
 *   2. enemy_missiles  vs terrain         — heightmap Y check
 *   3. enemy_missiles  vs launchers       — circle/circle
 *   4. player_missiles vs terrain         — heightmap Y check
 *
 * Each entity is marked "hit" before any side-effects are applied so that
 * a single entity cannot trigger more than one collision response per frame.
 */

import { Explosion } from './explosion.js';
import { Crater } from './crater.js';

// ------------------------------------------------------------------
// Type guards — checked by constructor name so no import cycles are
// needed for instanceof. The strings match the class names exactly.
// ------------------------------------------------------------------

/** @param {import('./entities/entity.js').Entity} e */
function isSuperMissile(e) { return e.constructor.name === 'SuperMissile'; }

/** @param {import('./entities/entity.js').Entity} e */
function isSuicideDrone(e) { return e.constructor.name === 'SuicideDrone'; }

/** @param {import('./entities/entity.js').Entity} e */
function isVulkanBullet(e) { return e.constructor.name === 'VulkanBullet'; }

// ------------------------------------------------------------------
// Geometry helpers
// ------------------------------------------------------------------

/**
 * Returns true when two circle-bounded entities overlap.
 * @param {import('./entities/entity.js').Entity} a
 * @param {import('./entities/entity.js').Entity} b
 */
function circlesOverlap(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  // Avoid sqrt when possible by comparing squared distances.
  const sumR = a.collisionRadius + b.collisionRadius;
  return dx * dx + dy * dy < sumR * sumR;
}

/**
 * Returns true when an entity's position is at or below the terrain surface.
 * @param {import('./entities/entity.js').Entity} entity
 * @param {import('./terrain.js').Terrain} terrain
 */
function collidesWithTerrain(entity, terrain) {
  return entity.y >= terrain.getHeightAt(entity.x);
}

// ------------------------------------------------------------------
// Effect helpers — spawn into the entity manager
// ------------------------------------------------------------------

/**
 * @param {import('./entities/entity-manager.js').EntityManager} em
 * @param {object} game
 * @param {number} x
 * @param {number} y
 * @param {boolean} isMega
 */
function spawnExplosion(em, game, x, y, isMega = false) {
  em.add(new Explosion(x, y, isMega));
  game.audio.playExplosion(x, isMega);
}

const CRATER_MERGE_RADIUS = 60;

/**
 * @param {import('./entities/entity-manager.js').EntityManager} em
 * @param {number} x
 * @param {number} y
 * @param {number} scale
 */
function spawnCrater(em, x, y, scale) {
  const craters = em.getGroup('craters');
  for (const existing of craters) {
    const dx = existing.x - x;
    const dy = existing.y - y;
    if (dx * dx + dy * dy < CRATER_MERGE_RADIUS * CRATER_MERGE_RADIUS) {
      existing.elapsed = 0;
      if (scale > existing.scale) {
        existing.scale = scale;
      }
      return;
    }
  }
  em.add(new Crater(x, y, scale));
}

// ------------------------------------------------------------------
// CollisionSystem
// ------------------------------------------------------------------

export class CollisionSystem {
  /**
   * Run all collision checks for one frame.
   *
   * The `game` object is expected to implement:
   *   game.onEnemyDestroyed()
   *   game.shakeScreen(intensity: number)
   *
   * @param {import('./entities/entity-manager.js').EntityManager} entityManager
   * @param {import('./terrain.js').Terrain} terrain
   * @param {object} game
   */
  update(entityManager, terrain, game) {
    const playerProjectiles = entityManager.getGroup('player_missiles');
    const enemies           = entityManager.getGroup('enemy_missiles');
    const launchers         = entityManager.getGroup('launchers');

    // Collect entities that have already resolved a collision this frame.
    // Using a Set of object references avoids any id management overhead.
    /** @type {Set<import('./entities/entity.js').Entity>} */
    const hit = new Set();

    // ── 1. Player projectiles vs enemy projectiles ────────────────────
    for (const proj of playerProjectiles) {
      if (hit.has(proj)) continue;

      for (const enemy of enemies) {
        if (hit.has(enemy)) continue;
        if (!circlesOverlap(proj, enemy)) continue;

        // Both entities are consumed by the intercept.
        hit.add(proj);
        hit.add(enemy);
        proj.destroy();
        enemy.destroy();

        // Spawn explosion at midpoint — visually cleaner than snapping to
        // either entity's exact center when the circles only just touched.
        const mx = (proj.x + enemy.x) * 0.5;
        const my = (proj.y + enemy.y) * 0.5;
        spawnExplosion(entityManager, game, mx, my, false);

        game.onEnemyDestroyed();
        break; // proj is consumed; skip remaining enemies for this proj
      }
    }

    // ── 2. Enemy projectiles vs terrain ──────────────────────────────
    for (const enemy of enemies) {
      if (hit.has(enemy)) continue;
      if (!collidesWithTerrain(enemy, terrain)) continue;

      hit.add(enemy);
      enemy.destroy();

      const ex = enemy.x;
      // Snap the effect to the actual surface rather than the entity's Y,
      // which may have already passed below the surface by up to one frame.
      const ey = terrain.getHeightAt(ex);

      if (isSuperMissile(enemy)) {
        // Triple mega explosion spread across the impact zone.
        spawnExplosion(entityManager, game, ex,      ey, true);
        spawnExplosion(entityManager, game, ex - 60, ey, true);
        spawnExplosion(entityManager, game, ex + 60, ey, true);

        terrain.damage(ex,      ey, 120, 45);
        terrain.damage(ex - 60, ey, 120, 45);
        terrain.damage(ex + 60, ey, 120, 45);

        spawnCrater(entityManager, ex, ey, 5);

        game.shakeScreen(30);
      } else {
        // Standard enemy missile / drone hits ground.
        spawnExplosion(entityManager, game, ex, ey, false);

        terrain.damage(ex, ey, 60, 22);

        spawnCrater(entityManager, ex, ey, 1.5);

        game.shakeScreen(8);
      }
    }

    // ── 3. Enemy projectiles vs launchers ────────────────────────────
    for (const enemy of enemies) {
      if (hit.has(enemy)) continue;

      for (const launcher of launchers) {
        if (hit.has(launcher)) continue;

        // Launchers do not set collisionRadius in their constructor (they rely
        // on click-rect detection for selection). Fall back to a fixed radius
        // that covers the visual footprint defined in the Godot tscn data.
        const launcherRadius = launcher.collisionRadius > 0
          ? launcher.collisionRadius
          : 50;

        const dx = enemy.x - launcher.x;
        const dy = enemy.y - launcher.y;
        const sumR = enemy.collisionRadius + launcherRadius;
        if (dx * dx + dy * dy >= sumR * sumR) continue;

        hit.add(enemy);
        hit.add(launcher);
        enemy.destroy();
        launcher.destroy();

        const ix = launcher.x;
        const iy = launcher.y;
        const craterY = terrain.getHeightAt(launcher.x);

        if (isSuperMissile(enemy)) {
          // Catastrophic hit — three mega explosions, enormous crater.
          spawnExplosion(entityManager, game, ix,      iy, true);
          spawnExplosion(entityManager, game, ix - 40, iy, true);
          spawnExplosion(entityManager, game, ix + 40, iy, true);

          terrain.damage(ix, iy, 120, 45);

          spawnCrater(entityManager, ix, craterY, 7);

          game.shakeScreen(45);
        } else if (isSuicideDrone(enemy)) {
          // Suicide drone — mega explosion, same crater/shake as a standard hit.
          spawnExplosion(entityManager, game, ix, iy, true);

          terrain.damage(ix, iy, 80, 35);

          spawnCrater(entityManager, ix, craterY, 3);

          game.shakeScreen(28);
        } else {
          // Standard enemy missile or drone.
          spawnExplosion(entityManager, game, ix, iy, true);

          terrain.damage(ix, iy, 80, 35);

          spawnCrater(entityManager, ix, craterY, 3);

          game.shakeScreen(25);
        }

        break; // enemy is consumed; skip remaining launchers for this enemy
      }
    }

    // ── 4. Player projectiles vs terrain ─────────────────────────────
    for (const proj of playerProjectiles) {
      if (hit.has(proj)) continue;
      if (!collidesWithTerrain(proj, terrain)) continue;

      hit.add(proj);
      proj.destroy();

      const px = proj.x;
      const py = terrain.getHeightAt(px);

      if (isVulkanBullet(proj)) {
        // Vulkan bullets vanish silently — no crater, no explosion.
        // At their fire rate, causing terrain damage would shred the landscape.
      } else {
        // SAM or heat-seeker missing everything and hitting the ground.
        spawnExplosion(entityManager, game, px, py, false);

        terrain.damage(px, py, 35, 15);

        spawnCrater(entityManager, px, py, 1);
      }
    }
  }
}
