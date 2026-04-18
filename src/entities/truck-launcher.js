/**
 * Truck Launcher — translated from truck_launcher.tscn + launcher.gd.
 * Mobile launch platform with cab, chassis, wheels, and rocket pod turret.
 */

import { Launcher, drawPoly } from './launcher.js';
import { rgba } from '../utils.js';

// Base (non-rotating) polygons
const BASE_POLYS = [
  // Chassis
  { c: rgba(0.28, 0.35, 0.24), pts: [-55, 22, 55, 22, 55, -6, -55, -6] },
  // ChassisRim
  { c: rgba(0.16, 0.2, 0.13), pts: [-55, 22, 55, 22, 55, 24, -55, 24] },
  // ChassisPanel
  { c: rgba(0.24, 0.3, 0.2), pts: [-16, 20, 55, 20, 55, 16, -16, 16] },
  // Cab
  { c: rgba(0.32, 0.4, 0.27), pts: [-55, -6, -16, -6, -16, -32, -48, -32, -55, -24] },
  // CabRoof
  { c: rgba(0.4, 0.48, 0.33), pts: [-48, -32, -16, -32, -16, -36, -44, -36] },
  // CabWindow
  { c: rgba(0.22, 0.36, 0.52, 0.92), pts: [-46, -9, -20, -9, -20, -28, -44, -28] },
  // WindowGlare
  { c: rgba(0.7, 0.82, 0.95, 0.28), pts: [-46, -9, -38, -9, -38, -28, -46, -22] },
  // GrilleFace
  { c: rgba(0.16, 0.18, 0.14), pts: [-55, -8, -49, -8, -49, -22, -55, -22] },
  // GrilleSlat1
  { c: rgba(0.26, 0.28, 0.22), pts: [-55, -10, -49, -10, -49, -11, -55, -11] },
  // GrilleSlat2
  { c: rgba(0.26, 0.28, 0.22), pts: [-55, -14, -49, -14, -49, -15, -55, -15] },
  // GrilleSlat3
  { c: rgba(0.26, 0.28, 0.22), pts: [-55, -18, -49, -18, -49, -19, -55, -19] },
  // Headlight
  { c: rgba(0.88, 0.85, 0.5, 0.95), pts: [-55, -22, -50, -22, -50, -26, -55, -26] },
  // ExhaustPipe
  { c: rgba(0.18, 0.2, 0.16), pts: [-20, -32, -16, -32, -16, -44, -20, -44] },
  // ExhaustCap
  { c: rgba(0.12, 0.14, 0.11), pts: [-22, -42, -14, -42, -14, -44, -22, -44] },
  // WheelA
  { c: rgba(0.1, 0.1, 0.1), pts: [-34, 22, -28, 14, -20, 12, -12, 14, -6, 22, -12, 30, -20, 32, -28, 30] },
  { c: rgba(0.35, 0.35, 0.35), pts: [-28, 22, -25, 17, -20, 15, -15, 17, -12, 22, -15, 27, -20, 29, -25, 27] },
  { c: rgba(0.5, 0.5, 0.5), pts: [-22, 22, -20, 20, -18, 22, -20, 24] },
  // WheelB
  { c: rgba(0.1, 0.1, 0.1), pts: [-6, 22, 0, 14, 8, 12, 16, 14, 22, 22, 16, 30, 8, 32, 0, 30] },
  { c: rgba(0.35, 0.35, 0.35), pts: [0, 22, 3, 17, 8, 15, 13, 17, 16, 22, 13, 27, 8, 29, 3, 27] },
  { c: rgba(0.5, 0.5, 0.5), pts: [6, 22, 8, 20, 10, 22, 8, 24] },
  // WheelC
  { c: rgba(0.1, 0.1, 0.1), pts: [26, 22, 32, 14, 40, 12, 48, 14, 54, 22, 48, 30, 40, 32, 32, 30] },
  { c: rgba(0.35, 0.35, 0.35), pts: [32, 22, 35, 17, 40, 15, 45, 17, 48, 22, 45, 27, 40, 29, 35, 27] },
  { c: rgba(0.5, 0.5, 0.5), pts: [38, 22, 40, 20, 42, 22, 40, 24] },
];

// Turret (rotating) polygons
const TURRET_POLYS = [
  // PodShell
  { c: rgba(0.38, 0.4, 0.35), pts: [-14, -4, 52, -4, 52, -16, -14, -16] },
  // PodSideL
  { c: rgba(0.3, 0.32, 0.27), pts: [-14, -4, -11, -4, -11, -54, -14, -54] },
  // PodSideR
  { c: rgba(0.3, 0.32, 0.27), pts: [49, -4, 52, -4, 52, -54, 49, -54] },
  // PodTop
  { c: rgba(0.34, 0.36, 0.31), pts: [-14, -52, 52, -52, 52, -54, -14, -54] },
  // PodRibA
  { c: rgba(0.28, 0.3, 0.25), pts: [10, -4, 12, -4, 12, -54, 10, -54] },
  // PodRibB
  { c: rgba(0.28, 0.3, 0.25), pts: [33, -4, 35, -4, 35, -54, 33, -54] },
  // Rocket1
  { c: rgba(0.58, 0.18, 0.12), pts: [-4, -16, 4, -16, 4, -52, -4, -52] },
  { c: rgba(0.92, 0.9, 0.86), pts: [-4, -52, 0, -58, 4, -52] },
  { c: rgba(0.9, 0.85, 0.12), pts: [-4, -34, 4, -34, 4, -30, -4, -30] },
  // Rocket2
  { c: rgba(0.58, 0.18, 0.12), pts: [8, -16, 16, -16, 16, -52, 8, -52] },
  { c: rgba(0.92, 0.9, 0.86), pts: [8, -52, 12, -58, 16, -52] },
  { c: rgba(0.9, 0.85, 0.12), pts: [8, -34, 16, -34, 16, -30, 8, -30] },
  // Rocket3
  { c: rgba(0.58, 0.18, 0.12), pts: [20, -16, 28, -16, 28, -52, 20, -52] },
  { c: rgba(0.92, 0.9, 0.86), pts: [20, -52, 24, -58, 28, -52] },
  { c: rgba(0.9, 0.85, 0.12), pts: [20, -34, 28, -34, 28, -30, 20, -30] },
  // Rocket4
  { c: rgba(0.58, 0.18, 0.12), pts: [32, -16, 40, -16, 40, -52, 32, -52] },
  { c: rgba(0.92, 0.9, 0.86), pts: [32, -52, 36, -58, 40, -52] },
  { c: rgba(0.9, 0.85, 0.12), pts: [32, -34, 40, -34, 40, -30, 32, -30] },
];

const GLOW1 = [-60, 20, -48, 32, 48, 32, 60, 20, 48, 40, -48, 40];
const GLOW2 = [-76, 22, -58, 44, 58, 44, 76, 22, 58, 50, -58, 50];

export class TruckLauncher extends Launcher {
  constructor(x, y) {
    super(x, y, 'truck');
    this.clickHalfW = 57;
    this.clickHalfH = 38;
    this.turretTipOffset = -62;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Selection glow
    if (this.isSelected) {
      drawPoly(ctx, GLOW2, `rgba(51,153,255,${(this._glowAlpha * 0.43).toFixed(3)})`);
      drawPoly(ctx, GLOW1, `rgba(51,153,255,${this._glowAlpha.toFixed(3)})`);
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
    ctx.restore();

    ctx.restore();
  }
}
