/**
 * Heat-Seeking Launcher — translated from heat_seeking_launcher.tscn + launcher.gd.
 * Twin-tube launcher with spinning radar dish.
 */

import { Launcher, drawPoly } from './launcher.js';
import { TAU, rgba } from '../utils.js';

// Base (non-rotating) polygons
const BASE_POLYS = [
  // BaseSlab
  { c: rgba(0.18, 0.2, 0.24), pts: [-46, 28, 46, 28, 40, 14, -40, 14] },
  // BaseSlabRim
  { c: rgba(0.1, 0.12, 0.15), pts: [-46, 30, 46, 30, 46, 28, -46, 28] },
  // BaseUpper
  { c: rgba(0.22, 0.25, 0.3), pts: [-40, 14, 40, 14, 34, 4, -34, 4] },
  // BaseTrimLine
  { c: rgba(0.1, 0.55, 0.82, 0.9), pts: [-40, 15, 40, 15, 40, 14, -40, 14] },
  // PivotOuter
  { c: rgba(0.18, 0.2, 0.26), pts: [-30, 4, 30, 4, 30, -8, -30, -8] },
  // PivotTrimLine
  { c: rgba(0.1, 0.55, 0.82, 0.7), pts: [-30, 5, 30, 5, 30, 4, -30, 4] },
];

// Turret (rotating) polygons — excludes radar (drawn separately with its own rotation)
const TURRET_POLYS = [
  // MastBase
  { c: rgba(0.2, 0.24, 0.32), pts: [-7, -6, 7, -6, 7, -22, -7, -22] },
  // MastBody
  { c: rgba(0.17, 0.21, 0.28), pts: [-4, -22, 4, -22, 4, -46, -4, -46] },
  // MastSheen
  { c: rgba(0.3, 0.4, 0.55), pts: [-4, -22, -2, -22, -2, -46, -4, -46] },
  // StatusLight
  { c: rgba(0.1, 1.0, 0.4), pts: [-2, -20, 2, -20, 2, -18, -2, -18] },
  // TubeL
  { c: rgba(0.2, 0.24, 0.32), pts: [-40, -8, -28, -8, -28, -50, -40, -50] },
  // TubeLSheen
  { c: rgba(0.3, 0.38, 0.52), pts: [-40, -8, -38, -8, -38, -50, -40, -50] },
  // TubeLFlange
  { c: rgba(0.14, 0.16, 0.22), pts: [-43, -6, -25, -6, -25, -9, -43, -9] },
  // TubeLMissile
  { c: rgba(0.55, 0.18, 0.12), pts: [-37, -12, -31, -12, -31, -48, -37, -48] },
  // TubeLTip
  { c: rgba(0.92, 0.9, 0.86), pts: [-37, -48, -34, -54, -31, -48] },
  // TubeLBand
  { c: rgba(0.9, 0.85, 0.12), pts: [-37, -32, -31, -32, -31, -28, -37, -28] },
  // TubeR
  { c: rgba(0.2, 0.24, 0.32), pts: [28, -8, 40, -8, 40, -50, 28, -50] },
  // TubeRSheen
  { c: rgba(0.3, 0.38, 0.52), pts: [28, -8, 30, -8, 30, -50, 28, -50] },
  // TubeRFlange
  { c: rgba(0.14, 0.16, 0.22), pts: [25, -6, 43, -6, 43, -9, 25, -9] },
  // TubeRMissile
  { c: rgba(0.55, 0.18, 0.12), pts: [31, -12, 37, -12, 37, -48, 31, -48] },
  // TubeRTip
  { c: rgba(0.92, 0.9, 0.86), pts: [31, -48, 34, -54, 37, -48] },
  // TubeRBand
  { c: rgba(0.9, 0.85, 0.12), pts: [31, -32, 37, -32, 37, -28, 31, -28] },
];

// Radar dish polygons — drawn at RadarMast position (0, -46) with independent rotation
const RADAR_POLYS = [
  // RadarArm
  { c: rgba(0.22, 0.26, 0.34), pts: [-2, 0, 2, 0, 2, -8, -2, -8] },
  // DishBack
  { c: rgba(0.15, 0.19, 0.26), pts: [-30, -8, -22, -20, -10, -26, 0, -28, 10, -26, 22, -20, 30, -8] },
  // DishFace
  { c: rgba(0.12, 0.46, 0.72), pts: [-28, -9, -20, -20, -9, -26, 0, -27, 9, -26, 20, -20, 28, -9] },
  // DishInner
  { c: rgba(0.08, 0.65, 0.95, 0.85), pts: [-18, -11, -11, -21, 0, -24, 11, -21, 18, -11] },
  // DishGlow
  { c: rgba(0.15, 0.95, 1.0, 0.9), pts: [-6, -14, 6, -14, 4, -22, 0, -24, -4, -22] },
  // DishCore
  { c: rgba(0.4, 1.0, 1.0), pts: [-2, -17, 2, -17, 1, -21, 0, -22, -1, -21] },
];

const GLOW1 = [-50, 22, -38, 32, 38, 32, 50, 22, 38, 40, -38, 40];
const GLOW2 = [-64, 24, -48, 44, 48, 44, 64, 24, 48, 50, -48, 50];

export class HeatSeekerLauncher extends Launcher {
  constructor(x, y) {
    super(x, y, 'heatseeker');
    this.clickHalfW = 45;
    this.clickHalfH = 50;
    this.turretTipOffset = -62;

    // Independent radar rotation (from launcher.gd: $Turret/RadarMast.rotation += 1.8 * delta)
    this.radarRotation = 0;
  }

  update(dt) {
    super.update(dt);
    // Spin radar dish independently
    this.radarRotation += 1.8 * dt;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Selection glow
    if (this.isSelected) {
      drawPoly(ctx, GLOW2, `rgba(26,179,255,${(this._glowAlpha * 0.43).toFixed(3)})`);
      drawPoly(ctx, GLOW1, `rgba(26,179,255,${this._glowAlpha.toFixed(3)})`);
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

    // Radar dish — positioned at (0, -46), with independent rotation
    ctx.save();
    ctx.translate(0, -46);
    ctx.rotate(this.radarRotation);
    for (const p of RADAR_POLYS) {
      drawPoly(ctx, p.pts, p.c);
    }
    ctx.restore();

    ctx.restore(); // turret rotation

    ctx.restore(); // entity position
  }
}
