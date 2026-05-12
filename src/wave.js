import { clamp } from './utils.js';

/**
 * @typedef {{ time: number, type: string }} WaveEvent
 */

/**
 * WaveSystem — manages wave timing, event scheduling, and enemy spawning.
 * Translated from main.gd wave logic.
 */
export class WaveSystem {
  constructor() {
    this.waveNumber = 0;
    this.waveTimer = 0;
    /** @type {WaveEvent[]} */
    this.waveEvents = [];
    this.inBetweenWave = true;
    this.betweenWaveTimer = 0;

    /** @type {((wave: number) => void) | null} */
    this.onWaveStart = null;
    /** @type {((wave: number) => void) | null} */
    this.onWaveComplete = null;

    /** Duration (seconds) of the most recently generated wave. */
    this._waveDuration = 10;
  }

  /** Begin with 2.5s grace period before wave 1. */
  start() {
    this.waveNumber = 0;
    this.waveTimer = 0;
    this.waveEvents = [];
    this.inBetweenWave = true;
    this.betweenWaveTimer = 2.5;
  }

  /**
   * @param {number} dt
   * @param {(type: string) => void} spawnFn
   * @param {() => number} getEnemyCount — returns living enemy count (called after spawns)
   */
  update(dt, spawnFn, getEnemyCount) {
    if (this.inBetweenWave) {
      this.betweenWaveTimer -= dt;
      if (this.betweenWaveTimer <= 0) {
        this._startWave(this.waveNumber + 1);
      }
    } else {
      this.waveTimer += dt;

      // Fire all events whose time has been reached
      while (this.waveEvents.length > 0 && this.waveEvents[0].time <= this.waveTimer) {
        const event = this.waveEvents.shift();
        spawnFn(event.type);
      }

      // Wave complete when all events fired and no enemies remain
      // Count is fetched AFTER spawns so newly-spawned enemies are included
      if (this.waveEvents.length === 0 && getEnemyCount() === 0) {
        this._onWaveComplete();
      }
    }
  }

  getCurrentWave() {
    return this.waveNumber;
  }

  /**
   * Generate randomized event list for a wave. Difficulty scales with wave
   * number but specific enemy counts, types, and timing are randomized.
   * @param {number} wave — 1-based
   * @returns {WaveEvent[]}
   */
  generateWaveEvents(wave) {
    const events = [];
    const rng = () => Math.random();

    // ── Difficulty budget: increases with wave ──
    // Each enemy type costs a certain amount of budget.
    // Budget grows per wave, forcing more/harder enemies over time.
    const budget = 6 + wave * 4;

    const costs = {
      missile:         1,
      super_missile:   3,
      drone:           2,
      suicide_drone:   3,
      transport_plane: 5,
      nuke:            6,
    };

    // ── Determine enemy pool for this wave ──
    const pool = ['missile'];
    if (wave >= 2) pool.push('super_missile');
    if (wave >= 2) pool.push('drone');
    if (wave >= 3) pool.push('suicide_drone');
    if (wave >= 1) pool.push('transport_plane');
    if (wave >= 3) pool.push('nuke');

    // ── Spend the budget randomly ──
    let remaining = budget;

    // Guarantee minimums: at least a few missiles every wave
    const minMissiles = Math.min(3 + wave, 10);
    for (let i = 0; i < minMissiles; i++) {
      events.push({ time: 0, type: 'missile' });
      remaining -= costs.missile;
    }

    // Guarantee at least 1 nuke from wave 3+
    if (wave >= 3) {
      events.push({ time: 0, type: 'nuke' });
      remaining -= costs.nuke;
      if (wave >= 8 && rng() < 0.5) {
        events.push({ time: 0, type: 'nuke' });
        remaining -= costs.nuke;
      }
    }

    // Fill remaining budget with random picks from pool
    let safety = 100;
    while (remaining > 0 && safety-- > 0) {
      const type = pool[Math.floor(rng() * pool.length)];
      const cost = costs[type];
      if (cost > remaining) {
        // Can't afford this, try missile (cheapest)
        if (remaining >= costs.missile) {
          events.push({ time: 0, type: 'missile' });
          remaining -= costs.missile;
        } else {
          break;
        }
      } else {
        events.push({ time: 0, type: type });
        remaining -= cost;
      }
    }

    // ── Assign random timing ──
    // Wave duration scales with enemy count but has bounds
    const waveDuration = Math.max(10, Math.min(events.length * 1.5, 40));
    this._waveDuration = waveDuration;

    for (const event of events) {
      event.time = rng() * waveDuration;
    }

    // Spread nukes to the back half of the wave (more dramatic)
    for (const event of events) {
      if (event.type === 'nuke') {
        event.time = waveDuration * 0.4 + rng() * waveDuration * 0.5;
      }
      // Transport planes can come any time — slight bias toward middle of wave
      if (event.type === 'transport_plane') {
        event.time = waveDuration * 0.2 + rng() * waveDuration * 0.6;
      }
    }

    events.sort((a, b) => a.time - b.time);
    return events;
  }

  _startWave(wave) {
    this.waveNumber = wave;
    this.waveTimer = 0;
    this.waveEvents = this.generateWaveEvents(wave);
    this.inBetweenWave = false;
    if (this.onWaveStart) this.onWaveStart(this.waveNumber);
  }

  _onWaveComplete() {
    this.inBetweenWave = true;
    this.betweenWaveTimer = 3.0;
    if (this.onWaveComplete) this.onWaveComplete(this.waveNumber);
  }
}
