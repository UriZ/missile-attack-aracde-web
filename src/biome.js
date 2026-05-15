/**
 * BiomeSystem — 5 biomes that change the game's visual feel.
 * One biome is picked randomly per game via pickRandom().
 *
 * Biomes apply:
 *  - Color tints via BiomeDayNightProxy (wraps DayNightCycle)
 *  - Terrain shape modifiers (amplitude / frequency scaling)
 *  - Particle effects (snow, rain, lightning, heat shimmer, lens flare)
 *  - Optional ctx.filter string on the terrain blit
 */

import { clamp, randf, randi } from './utils.js';

const LOGICAL_W = 2560;
const LOGICAL_H = 1440;

// ── Biome definitions ─────────────────────────────────────────────────────────

const BIOMES = {
  snow: {
    id: 'snow',
    groundTint:   [0.90, 0.92, 0.96],
    grassTint:    [0.88, 0.90, 0.95],
    skyTint:      [0.82, 0.88, 1.0],
    hazeTint:     [0.88, 0.92, 1.0],
    filter:       'saturate(0.25) brightness(1.35)',
    heightAmp:    0.7,
    heightFreq:   0.9,
    cloudDarkness: 0,
  },
  desert: {
    id: 'desert',
    groundTint:   [1.05, 0.82, 0.50],
    grassTint:    [0.90, 0.72, 0.38],
    skyTint:      [1.0, 0.88, 0.72],
    hazeTint:     [1.0, 0.85, 0.60],
    filter:       'saturate(1.6) brightness(0.95)',
    heightAmp:    1.3,
    heightFreq:   0.55,
    cloudDarkness: 0,
  },
  riverside: {
    id: 'riverside',
    groundTint:   [0.78, 0.85, 0.60],
    grassTint:    [0.60, 1.0, 0.55],
    skyTint:      [0.88, 0.96, 1.0],
    hazeTint:     [0.80, 0.92, 1.0],
    filter:       'saturate(1.5) brightness(1.05)',
    heightAmp:    0.85,
    heightFreq:   1.1,
    cloudDarkness: 0,
  },
  sunrise: {
    id: 'sunrise',
    groundTint:   [1.02, 0.88, 0.70],
    grassTint:    [0.95, 0.85, 0.55],
    skyTint:      [1.0, 0.82, 0.60],
    hazeTint:     [1.0, 0.80, 0.55],
    filter:       'sepia(0.25) saturate(1.4) brightness(1.1)',
    heightAmp:    1.0,
    heightFreq:   1.0,
    cloudDarkness: 0,
  },
  stormy: {
    id: 'stormy',
    groundTint:   [0.65, 0.68, 0.60],
    grassTint:    [0.55, 0.70, 0.45],
    skyTint:      [0.55, 0.58, 0.65],
    hazeTint:     [0.58, 0.60, 0.65],
    filter:       'saturate(0.7) brightness(0.78)',
    heightAmp:    1.0,
    heightFreq:   1.0,
    cloudDarkness: 0.40,
  },
};

const BIOME_IDS = Object.keys(BIOMES);

// ── BiomeDayNightProxy ────────────────────────────────────────────────────────

/**
 * Wraps a DayNightCycle and applies per-channel tints to all color getters.
 * All other methods delegate to the real dayNight unchanged.
 */
export class BiomeDayNightProxy {
  /**
   * @param {import('./day-night.js').DayNightCycle} dayNight
   * @param {object} biomeDef — biome definition object
   */
  constructor(dayNight, biomeDef) {
    this._dn = dayNight;
    this._def = biomeDef;
  }

  // ── Tinted color getters ─────────────────────────────────────────────────

  getSkyColors() {
    const raw = this._dn.getSkyColors();
    const t = this._def.skyTint;
    return {
      top:    this._tint(raw.top, t),
      mid:    this._tint(raw.mid, t),
      bottom: this._tint(raw.bottom, t),
    };
  }

  getGroundColors() {
    const raw = this._dn.getGroundColors();
    const t = this._def.groundTint;
    return {
      top:    this._tint(raw.top, t),
      bottom: this._tint(raw.bottom, t),
    };
  }

  getGrassColors() {
    const raw = this._dn.getGrassColors();
    const t = this._def.grassTint;
    return {
      top:    this._tint(raw.top, t),
      bottom: this._tint(raw.bottom, t),
    };
  }

  getHazeColor() {
    const raw = this._dn.getHazeColor();
    return this._tint(raw, this._def.hazeTint);
  }

  // ── Pass-through methods ─────────────────────────────────────────────────

  get tod() { return this._dn.tod; }
  get _weatherType() { return this._dn._weatherType; }
  set _weatherType(v) { this._dn._weatherType = v; }
  get _time() { return this._dn._time; }
  get _targetTod() { return this._dn._targetTod; }

  getAmbientColor()       { return this._dn.getAmbientColor(); }
  getStarsAlpha()         { return this._dn.getStarsAlpha(); }
  getWindowLightFactor()  { return this._dn.getWindowLightFactor(); }
  setWave(wave)           { return this._dn.setWave(wave); }
  update(dt, wp)          { return this._dn.update(dt, wp); }
  consumeTerrainDirty()   { return this._dn.consumeTerrainDirty(); }
  drawStars(ctx)          { return this._dn.drawStars(ctx); }
  drawCelestialBody(ctx)  { return this._dn.drawCelestialBody(ctx); }
  drawClouds(ctx, dt)     { return this._dn.drawClouds(ctx, dt); }
  drawWeather(ctx, dt)    { return this._dn.drawWeather(ctx, dt); }

  /** Sun position helper — needed for lens-flare biome. */
  getSunPosition() {
    if (typeof this._dn.getSunPosition === 'function') {
      return this._dn.getSunPosition();
    }
    // Fallback if method doesn't exist yet
    const tod = this._dn.tod;
    if (tod < 0.12 || tod > 0.80) return null;
    const t = (tod - 0.12) / (0.80 - 0.12);
    return {
      x: 2560 * t,
      y: 900 - Math.sin(t * Math.PI) * 780,
      alpha: Math.min(Math.min((tod - 0.12) / 0.08, 1), Math.min((0.80 - tod) / 0.08, 1)),
    };
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  /**
   * Multiply each channel by the tint, clamp to [0, 1].
   * @param {number[]} color [r, g, b]
   * @param {number[]} tint  [r, g, b]
   * @returns {number[]}
   */
  _tint(color, tint) {
    return [
      clamp(color[0] * tint[0], 0, 1),
      clamp(color[1] * tint[1], 0, 1),
      clamp(color[2] * tint[2], 0, 1),
    ];
  }
}

// ── BiomeSystem ───────────────────────────────────────────────────────────────

export class BiomeSystem {
  constructor() {
    /** @type {object|null} Currently active biome definition */
    this._def = null;

    /** @type {BiomeDayNightProxy|null} */
    this._proxy = null;

    // Snow particles
    this._snowParticles = _makeSnowParticles();

    // Rain particles (stormy biome)
    this._rainParticles = _makeRainParticles();

    // Heat shimmer bands (desert biome)
    this._shimmerBands = _makeShimmerBands();

    // Lightning state machine
    this._lightningState = 'idle';   // 'idle' | 'flash' | 'afterglow' | 'thunder_delay'
    this._lightningTimer = 0;
    this._lightningInterval = randf(8, 15);
    this._lightningBolt = null;      // Array of {x, y, branches: [{pts}]} when active
    this._lightningFlashAlpha = 0;
    this._thunderDelay = 0;          // seconds after flash before thunder plays
    this._thunderPending = false;

    // Wind state for rain
    this._windX = randf(-5, -1.5);   // negative = leftward wind
    this._windChangeTimer = 0;

    // Elapsed time for animations
    this._time = 0;
  }

  // ── Biome selection ───────────────────────────────────────────────────────

  /** Pick a random biome for the current game. */
  pickRandom() {
    const id = BIOME_IDS[Math.floor(Math.random() * BIOME_IDS.length)];
    this.pick(id);
  }

  /**
   * Force a specific biome (useful for testing from the console).
   * @param {string} id — 'snow' | 'desert' | 'riverside' | 'sunrise' | 'stormy'
   */
  pick(id) {
    const def = BIOMES[id];
    if (!def) {
      console.warn(`BiomeSystem.pick: unknown biome "${id}"`);
      return;
    }
    this._def = def;
    // Re-wrap proxy if we already have a dayNight
    if (this._proxy) {
      this._proxy = new BiomeDayNightProxy(this._proxy._dn, def);
    }
  }

  /**
   * Wrap the provided DayNightCycle and return a BiomeDayNightProxy.
   * Call this on game start, after pick()/pickRandom().
   * @param {import('./day-night.js').DayNightCycle} dayNight
   * @returns {BiomeDayNightProxy}
   */
  wrapDayNight(dayNight) {
    if (!this._def) this.pickRandom();
    this._proxy = new BiomeDayNightProxy(dayNight, this._def);
    return this._proxy;
  }

  // ── Per-frame update ──────────────────────────────────────────────────────

  /**
   * @param {number} dt
   * @param {import('../engine/audio.js').Audio|null} [audio] — optional for thunder
   */
  update(dt, audio = null) {
    if (!this._def) return;
    this._time += dt;

    const id = this._def.id;

    if (id === 'snow') {
      _updateSnow(this._snowParticles, dt);
    }

    if (id === 'stormy') {
      // Slowly vary wind direction/strength
      this._windChangeTimer += dt;
      if (this._windChangeTimer > randf(8, 15)) {
        this._windX = randf(-6, -1);
        this._windChangeTimer = 0;
      }
      _updateRain(this._rainParticles, dt, this._windX);
      this._updateLightning(dt, audio);
    }

    if (id === 'desert') {
      _updateShimmer(this._shimmerBands, dt);
    }
  }

  // ── Draw calls ────────────────────────────────────────────────────────────

  /**
   * Draw effects that must appear BEHIND the terrain (e.g. water band).
   * @param {CanvasRenderingContext2D} ctx
   * @param {import('./terrain.js').Terrain} terrain
   */
  drawBehindTerrain(ctx, terrain) {
    if (!this._def) return;
    if (this._def.id === 'riverside') {
      this._drawWater(ctx, terrain);
    }
  }

  /**
   * Draw effects in FRONT of entities, before UI.
   * @param {CanvasRenderingContext2D} ctx
   */
  drawFrontOfTerrain(ctx) {
    if (!this._def) return;

    const id = this._def.id;

    if (id === 'snow') {
      this._drawSnow(ctx);
    } else if (id === 'stormy') {
      this._drawHeavyRain(ctx);
      this._drawLightning(ctx);
    } else if (id === 'desert') {
      this._drawHeatShimmer(ctx);
    } else if (id === 'sunrise') {
      this._drawLensFlare(ctx);
    }
  }

  // ── Terrain modifiers ─────────────────────────────────────────────────────

  /**
   * Returns the ctx.filter string to apply when blitting the terrain offscreen.
   * Returns null if no filter is active for the current biome.
   * @returns {string|null}
   */
  getTerrainFilter() {
    if (!this._def) return null;
    return this._def.filter || null;
  }

  /**
   * Returns heightmap modifiers for this biome.
   * @returns {{ amplitudeScale: number, frequencyScale: number }}
   */
  getHeightmapModifiers() {
    if (!this._def) return { amplitudeScale: 1, frequencyScale: 1 };
    return {
      amplitudeScale: this._def.heightAmp,
      frequencyScale: this._def.heightFreq,
    };
  }

  // ── Lightning (stormy) ────────────────────────────────────────────────────

  _updateLightning(dt, audio = null) {
    this._lightningTimer += dt;

    // Thunder delay — plays thunder sound after calculated delay from flash
    if (this._thunderPending) {
      this._thunderDelay -= dt;
      if (this._thunderDelay <= 0) {
        this._thunderPending = false;
        if (audio && typeof audio.playThunder === 'function') {
          audio.playThunder();
        }
      }
    }

    if (this._lightningState === 'idle') {
      if (this._lightningTimer >= this._lightningInterval) {
        this._lightningState = 'flash';
        this._lightningTimer = 0;
        this._lightningBolt = _generateLightningBolt();
        this._lightningFlashAlpha = 1.0;

        // Calculate thunder delay: approx 1s per 340m of distance
        // bolt is 200-2360px range; use bolt x distance from center
        const boltX = this._lightningBolt[0].x;
        const distFrac = Math.abs(boltX - LOGICAL_W * 0.5) / (LOGICAL_W * 0.5);
        this._thunderDelay  = randf(0.4, 1.2) + distFrac * randf(0.8, 2.0);
        this._thunderPending = true;
      }
    } else if (this._lightningState === 'flash') {
      const FLASH_DUR = 0.12;
      if (this._lightningTimer >= FLASH_DUR) {
        this._lightningState = 'afterglow';
        this._lightningTimer = 0;
        this._lightningFlashAlpha = 0.0;
      }
    } else if (this._lightningState === 'afterglow') {
      const AFTERGLOW_DUR = 0.30;
      if (this._lightningTimer >= AFTERGLOW_DUR) {
        this._lightningState = 'idle';
        this._lightningTimer = 0;
        this._lightningInterval = randf(8, 15);
        this._lightningBolt = null;
      }
    }
  }

  // ── Draw helpers ──────────────────────────────────────────────────────────

  _drawSnow(ctx) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (const p of this._snowParticles) {
      ctx.globalAlpha = 0.6 + 0.4 * Math.abs(Math.sin(p.wobble));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  _drawHeavyRain(ctx) {
    ctx.save();
    ctx.strokeStyle = 'rgba(160,180,230,1)';
    ctx.lineWidth = 1.5;
    // Wind angle: horizontal drift per vertical unit
    const windAngle = this._windX * 0.012;
    for (const d of this._rainParticles) {
      ctx.globalAlpha = d.alpha;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      // Apply wind angle to the streak direction
      ctx.lineTo(d.x + windAngle * d.len * d.speed * 0.001, d.y + d.len);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  _drawLightning(ctx) {
    if (this._lightningState === 'idle' || !this._lightningBolt) return;

    ctx.save();

    // Screen flash overlay
    const flashA = this._lightningState === 'flash' ? 0.18 : 0;
    if (flashA > 0) {
      ctx.fillStyle = `rgba(200,210,255,${flashA})`;
      ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
    }

    const bolt     = this._lightningBolt;
    const branches = bolt._branches || [];

    // Helper: draw a bolt path
    const drawBoltPath = (pts, glowWidth, coreWidth, glowAlpha, coreAlpha) => {
      if (pts.length < 2) return;
      // Glow pass
      ctx.strokeStyle = `rgba(180,200,255,${glowAlpha})`;
      ctx.lineWidth   = glowWidth;
      ctx.lineJoin    = 'round';
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
      // Core
      ctx.strokeStyle = `rgba(220,230,255,${coreAlpha})`;
      ctx.lineWidth   = coreWidth;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    };

    if (bolt.length > 1) {
      // Main bolt — thick and bright
      drawBoltPath(bolt, 10, 3.0, 0.55, 0.95);

      // Branches — thinner, more transparent
      for (const branch of branches) {
        drawBoltPath(branch, 5, 1.5, 0.30, 0.70);
      }
    }

    ctx.restore();
  }

  _drawHeatShimmer(ctx) {
    ctx.save();
    // Terrain base is around y=1240. Shimmer bands drift upward from there.
    const baseY = 1200;
    for (const band of this._shimmerBands) {
      const y = baseY - band.yOffset;
      const alpha = 0.04 + 0.03 * Math.sin(this._time * 1.5 + band.phase);

      const grad = ctx.createLinearGradient(0, y - 10, 0, y + 10);
      grad.addColorStop(0,   `rgba(255,220,150,0)`);
      grad.addColorStop(0.5, `rgba(255,220,150,${alpha.toFixed(3)})`);
      grad.addColorStop(1,   `rgba(255,220,150,0)`);

      ctx.fillStyle = grad;
      // Scroll horizontally
      const scrollX = (band.scrollX % LOGICAL_W);
      ctx.fillRect(scrollX, y - 10, LOGICAL_W, 20);
      // Wrap-around
      if (scrollX > 0) ctx.fillRect(scrollX - LOGICAL_W, y - 10, LOGICAL_W, 20);
    }
    ctx.restore();
  }

  _drawWater(ctx, terrain) {
    if (!terrain) return;
    ctx.save();

    // Draw a water band at the base of the terrain (behind terrain)
    const waterY = terrain.baseY + 30;
    const waterH = 60;

    const grad = ctx.createLinearGradient(0, waterY, 0, waterY + waterH);
    grad.addColorStop(0,   'rgba(60,130,200,0.55)');
    grad.addColorStop(1,   'rgba(40,90,160,0.80)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, waterY, LOGICAL_W, waterH);

    // Ripple highlights
    const t = this._time;
    ctx.strokeStyle = 'rgba(200,230,255,0.3)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      const rippleX = ((i * 340 + t * 40) % LOGICAL_W);
      const rippleY = waterY + 10 + i * 6;
      ctx.beginPath();
      ctx.moveTo(rippleX, rippleY);
      ctx.quadraticCurveTo(rippleX + 40, rippleY - 4, rippleX + 80, rippleY);
      ctx.stroke();
    }

    ctx.restore();
  }

  _drawLensFlare(ctx) {
    if (!this._proxy) return;
    const sunPos = this._proxy.getSunPosition();
    if (!sunPos || sunPos.alpha < 0.05) return;

    ctx.save();

    const sx = sunPos.x;
    const sy = sunPos.y;
    const cx = LOGICAL_W / 2;
    const cy = LOGICAL_H / 2;

    // Direction vector from sun to screen center
    const dx = cx - sx;
    const dy = cy - sy;

    // Draw 5-7 orbs along the sun-to-center line
    const numOrbs = randi(5, 7);
    const orbs = [
      { t: 0.15, r: 28, a: 0.18, rgb: '255,200,100' },
      { t: 0.30, r: 18, a: 0.14, rgb: '200,180,255' },
      { t: 0.45, r: 40, a: 0.10, rgb: '255,240,200' },
      { t: 0.60, r: 12, a: 0.20, rgb: '180,220,255' },
      { t: 0.70, r: 22, a: 0.12, rgb: '255,200,150' },
      { t: 0.82, r: 16, a: 0.16, rgb: '200,255,200' },
      { t: 0.95, r: 30, a: 0.09, rgb: '255,180,200' },
    ].slice(0, numOrbs);

    for (const orb of orbs) {
      const ox = sx + dx * orb.t;
      const oy = sy + dy * orb.t;
      const alpha = orb.a * sunPos.alpha;

      const grad = ctx.createRadialGradient(ox, oy, 0, ox, oy, orb.r);
      grad.addColorStop(0,   `rgba(${orb.rgb},${alpha.toFixed(3)})`);
      grad.addColorStop(1,   `rgba(${orb.rgb},0)`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(ox, oy, orb.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

// ── Particle factories ────────────────────────────────────────────────────────

function _makeSnowParticles() {
  const particles = [];
  for (let i = 0; i < 220; i++) {
    particles.push({
      x:      Math.random() * LOGICAL_W,
      y:      Math.random() * LOGICAL_H,
      r:      1.5 + Math.random() * 2.5,
      speedY: 40 + Math.random() * 60,
      speedX: (Math.random() - 0.5) * 30,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpd: 0.5 + Math.random() * 1.0,
    });
  }
  return particles;
}

function _updateSnow(particles, dt) {
  for (const p of particles) {
    p.wobble += p.wobbleSpd * dt;
    p.x += p.speedX * dt + Math.sin(p.wobble) * 15 * dt;
    p.y += p.speedY * dt;
    if (p.y > LOGICAL_H + p.r) {
      p.y = -p.r;
      p.x = Math.random() * LOGICAL_W;
    }
    if (p.x > LOGICAL_W + p.r) p.x -= LOGICAL_W + p.r * 2;
    if (p.x < -p.r) p.x += LOGICAL_W + p.r * 2;
  }
}

function _makeRainParticles() {
  const particles = [];
  for (let i = 0; i < 400; i++) {
    particles.push({
      x:     Math.random() * LOGICAL_W,
      y:     Math.random() * LOGICAL_H,
      len:   18 + Math.random() * 22,
      speed: 800 + Math.random() * 400,
      alpha: 0.35 + Math.random() * 0.30,
    });
  }
  return particles;
}

function _updateRain(particles, dt, windX = -3) {
  for (const d of particles) {
    d.y += d.speed * dt;
    d.x += windX * d.speed * dt * 0.012; // wind drift proportional to fall speed
    if (d.y > LOGICAL_H + d.len) {
      d.y = -d.len;
      d.x = Math.random() * LOGICAL_W;
    }
    if (d.x < -d.len * 2) d.x += LOGICAL_W + d.len * 4;
    if (d.x > LOGICAL_W + d.len * 2) d.x -= LOGICAL_W + d.len * 4;
  }
}

function _makeShimmerBands() {
  const bands = [];
  for (let i = 0; i < 4; i++) {
    bands.push({
      yOffset: 20 + i * 30,     // distance above terrain
      scrollX: Math.random() * LOGICAL_W,
      speed:   15 + Math.random() * 20,
      phase:   Math.random() * Math.PI * 2,
    });
  }
  return bands;
}

function _updateShimmer(bands, dt) {
  for (const b of bands) {
    b.scrollX += b.speed * dt;
  }
}

/**
 * Generate a branching lightning bolt.
 * Returns { main: [{x,y}], branches: [[{x,y}]] }
 */
function _generateLightningBolt() {
  const startX = randf(200, 2360);
  const startY = randf(50, 200);
  const endX   = startX + randf(-300, 300);
  const endY   = randf(900, 1200);

  const numSegments = randi(10, 16);
  const main = [{ x: startX, y: startY }];

  for (let i = 1; i <= numSegments; i++) {
    const t  = i / numSegments;
    const bx = startX + (endX - startX) * t + randf(-80, 80);
    const by = startY + (endY - startY) * t;
    main.push({ x: bx, y: by });
  }

  // Generate 1-3 fork branches from random points along the main bolt
  const branches = [];
  const numBranches = randi(1, 3);
  for (let bi = 0; bi < numBranches; bi++) {
    // Pick a branch point somewhere in the upper-mid section
    const branchFromIdx = randi(Math.floor(numSegments * 0.25), Math.floor(numSegments * 0.65));
    const branchStart   = main[branchFromIdx];
    const branchLen     = randi(4, 8);
    const branchDir     = Math.random() < 0.5 ? 1 : -1;
    const branch        = [{ x: branchStart.x, y: branchStart.y }];

    for (let si = 1; si <= branchLen; si++) {
      const t      = si / branchLen;
      const prevPt = branch[branch.length - 1];
      const bx     = prevPt.x + branchDir * randf(15, 35) + randf(-20, 20);
      const by     = branchStart.y + (endY - branchStart.y) * t * 0.6;
      branch.push({ x: bx, y: by });
    }
    branches.push(branch);
  }

  // Attach branches to the main bolt object for the draw function
  main._branches = branches;
  return main;
}
