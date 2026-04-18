/**
 * SAM Launcher — translated from sam_launcher.tscn + launcher.gd.
 * Fixed emplacement with 4 missiles on a rotating arm.
 */

import { Launcher, drawPoly } from './launcher.js';
import { rgba } from '../utils.js';

// Base (non-rotating) polygons — drawn at entity position
const BASE_POLYS = [
  // BaseSlab
  { c: rgba(0.24, 0.26, 0.22), pts: [-54, 28, 54, 28, 48, 14, -48, 14] },
  // BaseSlabRim
  { c: rgba(0.14, 0.16, 0.12), pts: [-54, 30, 54, 30, 54, 28, -54, 28] },
  // BaseUpper
  { c: rgba(0.3, 0.32, 0.27), pts: [-48, 14, 48, 14, 40, 4, -40, 4] },
  // BaseUpperEdge
  { c: rgba(0.38, 0.4, 0.34), pts: [-48, 15, 48, 15, 48, 14, -48, 14] },
  // WarningBandL
  { c: rgba(0.78, 0.62, 0.08, 0.85), pts: [-54, 20, -50, 20, -38, 28, -42, 28] },
  // WarningBandR
  { c: rgba(0.78, 0.62, 0.08, 0.85), pts: [50, 20, 54, 20, 42, 28, 38, 28] },
  // PivotOuter
  { c: rgba(0.18, 0.2, 0.17), pts: [-32, 4, 32, 4, 32, -10, -32, -10] },
  // PivotEdgeTop
  { c: rgba(0.12, 0.14, 0.11), pts: [-32, -9, 32, -9, 32, -10, -32, -10] },
  // PivotEdgeBot
  { c: rgba(0.28, 0.3, 0.25), pts: [-32, 4, 32, 4, 32, 5, -32, 5] },
];

// Turret (rotating) polygons — drawn relative to turret origin
const TURRET_POLYS = [
  // ArmShoulder
  { c: rgba(0.22, 0.24, 0.2), pts: [-26, -8, 26, -8, 26, -22, -26, -22] },
  // ArmBody
  { c: rgba(0.17, 0.19, 0.16), pts: [-24, -22, 24, -22, 24, -56, -24, -56] },
  // ArmRibL
  { c: rgba(0.27, 0.3, 0.24), pts: [-24, -22, -19, -22, -19, -56, -24, -56] },
  // ArmRibR
  { c: rgba(0.27, 0.3, 0.24), pts: [19, -22, 24, -22, 24, -56, 19, -56] },
  // ArmBrace1
  { c: rgba(0.24, 0.26, 0.21), pts: [-24, -30, 24, -30, 24, -33, -24, -33] },
  // ArmBrace2
  { c: rgba(0.24, 0.26, 0.21), pts: [-24, -44, 24, -44, 24, -47, -24, -47] },
  // Missile1
  { c: rgba(0.58, 0.18, 0.12), pts: [-17, -20, -10, -20, -10, -57, -17, -57] },
  { c: rgba(0.92, 0.9, 0.86), pts: [-17, -57, -13.5, -64, -10, -57] },
  { c: rgba(0.9, 0.85, 0.12), pts: [-17, -38, -10, -38, -10, -34, -17, -34] },
  { c: rgba(0.38, 0.12, 0.09), pts: [-21, -21, -17, -21, -17, -30, -22, -28] },
  { c: rgba(0.38, 0.12, 0.09), pts: [-10, -21, -6, -21, -6, -28, -10, -30] },
  // Missile2
  { c: rgba(0.58, 0.18, 0.12), pts: [-8, -20, -1, -20, -1, -57, -8, -57] },
  { c: rgba(0.92, 0.9, 0.86), pts: [-8, -57, -4.5, -64, -1, -57] },
  { c: rgba(0.9, 0.85, 0.12), pts: [-8, -38, -1, -38, -1, -34, -8, -34] },
  { c: rgba(0.38, 0.12, 0.09), pts: [-12, -21, -8, -21, -8, -30, -13, -28] },
  { c: rgba(0.38, 0.12, 0.09), pts: [-1, -21, 3, -21, 3, -28, -1, -30] },
  // Missile3
  { c: rgba(0.58, 0.18, 0.12), pts: [1, -20, 8, -20, 8, -57, 1, -57] },
  { c: rgba(0.92, 0.9, 0.86), pts: [1, -57, 4.5, -64, 8, -57] },
  { c: rgba(0.9, 0.85, 0.12), pts: [1, -38, 8, -38, 8, -34, 1, -34] },
  { c: rgba(0.38, 0.12, 0.09), pts: [-3, -21, 1, -21, 1, -30, -4, -28] },
  { c: rgba(0.38, 0.12, 0.09), pts: [8, -21, 12, -21, 12, -28, 8, -30] },
  // Missile4
  { c: rgba(0.58, 0.18, 0.12), pts: [10, -20, 17, -20, 17, -57, 10, -57] },
  { c: rgba(0.92, 0.9, 0.86), pts: [10, -57, 13.5, -64, 17, -57] },
  { c: rgba(0.9, 0.85, 0.12), pts: [10, -38, 17, -38, 17, -34, 10, -34] },
  { c: rgba(0.38, 0.12, 0.09), pts: [6, -21, 10, -21, 10, -30, 5, -28] },
  { c: rgba(0.38, 0.12, 0.09), pts: [17, -21, 21, -21, 21, -28, 17, -30] },
  // SensorHousing
  { c: rgba(0.13, 0.17, 0.26), pts: [-9, -55, 9, -55, 9, -70, -9, -70] },
  // SensorFace
  { c: rgba(0.1, 0.45, 0.78), pts: [-6.5, -57, 6.5, -57, 6.5, -68, -6.5, -68] },
  // SensorGlow
  { c: rgba(0.2, 1.0, 0.45), pts: [-2, -62, 2, -62, 2, -64, -2, -64] },
  // SensorAntennaL
  { c: rgba(0.28, 0.32, 0.28), pts: [-12, -56, -9, -56, -9, -70, -12, -70] },
  // SensorAntennaR
  { c: rgba(0.28, 0.32, 0.28), pts: [9, -56, 12, -56, 12, -70, 9, -70] },
];

// Selection glow polygons
const GLOW1 = [-58, 22, -44, 34, 44, 34, 58, 22, 44, 42, -44, 42];
const GLOW2 = [-74, 24, -56, 46, 56, 46, 74, 24, 56, 52, -56, 52];

export class SAMLauncher extends Launcher {
  constructor(x, y) {
    super(x, y, 'sam');
    this.clickHalfW = 40;
    this.clickHalfH = 50;
    this.turretTipOffset = -62;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Selection glow (behind everything)
    if (this.isSelected) {
      drawPoly(ctx, GLOW2, `rgba(51,153,255,${(this._glowAlpha * 0.43).toFixed(3)})`);
      drawPoly(ctx, GLOW1, `rgba(51,153,255,${this._glowAlpha.toFixed(3)})`);
    }

    // Base polygons (static)
    for (const p of BASE_POLYS) {
      drawPoly(ctx, p.pts, p.c);
    }

    // Turret (rotated)
    ctx.save();
    ctx.rotate(this.turretRotation);
    for (const p of TURRET_POLYS) {
      drawPoly(ctx, p.pts, p.c);
    }
    ctx.restore();

    ctx.restore();
  }
}
