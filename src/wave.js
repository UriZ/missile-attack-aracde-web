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
   * Generate sorted event list for a wave. Matches main.gd exactly.
   * @param {number} wave — 1-based
   * @returns {WaveEvent[]}
   */
  generateWaveEvents(wave) {
    const events = [];

    // Regular missiles: count = min(8 + (wave-1)*2, 24), interval = max(0.8, 2.0 - (wave-1)*0.15)
    const missileCount = Math.min(8 + (wave - 1) * 2, 24);
    const missileInterval = Math.max(0.8, 2.0 - (wave - 1) * 0.15);
    for (let i = 0; i < missileCount; i++) {
      events.push({ time: i * missileInterval, type: 'missile' });
    }

    // Super missiles: clamp(1 + floor((wave-1)/2), 1, 4), at 3.0 + i*7.0
    const superCount = clamp(1 + Math.floor((wave - 1) / 2), 1, 4);
    for (let i = 0; i < superCount; i++) {
      events.push({ time: 3.0 + i * 7.0, type: 'super_missile' });
    }

    // Drones: clamp(wave-1, 0, 4), at 4.0 + i*8.0
    const droneCount = clamp(wave - 1, 0, 4);
    for (let i = 0; i < droneCount; i++) {
      events.push({ time: 4.0 + i * 8.0, type: 'drone' });
    }

    // Suicide drones: clamp(wave-2, 0, 3), at 6.0 + i*10.0
    const suicideCount = clamp(wave - 2, 0, 3);
    for (let i = 0; i < suicideCount; i++) {
      events.push({ time: 6.0 + i * 10.0, type: 'suicide_drone' });
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
