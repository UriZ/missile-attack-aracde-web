// Procedural Audio Engine — Web Audio API
// Translates Godot PCM generation math to Float32 AudioBuffers

const TAU = 2 * Math.PI;
const LOOP_FADE_SAMPLES = 256;

/** @param {number} a @param {number} b */
function randf(a, b) {
  return a + Math.random() * (b - a);
}

/**
 * Apply linear fade at loop boundaries to prevent noise clicks.
 * @param {Float32Array} data
 * @param {number} n — ramp length in samples
 */
function applyLoopCrossfade(data, n) {
  const len = data.length;
  for (let i = 0; i < n; i++) {
    const ramp = i / n;
    data[i] *= ramp;
    data[len - 1 - i] *= ramp;
  }
}

/** Compute stereo pan from world x position (viewport width 2560) */
function panFromX(x) {
  return Math.max(-1, Math.min(1, (x / 1280) - 1));
}

// ---------------------------------------------------------------------------
// SoundLoop — wraps a looping AudioBufferSourceNode with dynamic controls
// ---------------------------------------------------------------------------
class SoundLoop {
  /**
   * @param {AudioContext} audioCtx
   * @param {AudioBuffer} buffer
   * @param {number} volume  — linear gain (default 1.0)
   * @param {number} pitch   — playback rate (default 1.0)
   * @param {number} pan     — stereo pan -1..1 (default 0)
   */
  constructor(audioCtx, buffer, volume = 1.0, pitch = 1.0, pan = 0) {
    this.audioCtx = audioCtx;
    this.source = audioCtx.createBufferSource();
    this.gain = audioCtx.createGain();
    this.panner = audioCtx.createStereoPanner();

    this.source.buffer = buffer;
    this.source.loop = true;
    this.source.playbackRate.value = pitch;
    this.gain.gain.value = volume;
    this.panner.pan.value = pan;

    this.source.connect(this.gain);
    this.gain.connect(this.panner);
    this.panner.connect(audioCtx.destination);

    this.source.start();
    this.stopped = false;
  }

  stop() {
    if (!this.stopped) {
      this.stopped = true;
      try { this.source.stop(); } catch (_) { /* already stopped */ }
    }
  }

  /** @param {number} rate */
  setPitch(rate) {
    if (!this.stopped) this.source.playbackRate.value = rate;
  }

  /** @param {number} vol — linear gain */
  setVolume(vol) {
    if (!this.stopped) this.gain.gain.value = vol;
  }

  /** @param {number} pan — -1..1 */
  setPan(pan) {
    if (!this.stopped) this.panner.pan.value = Math.max(-1, Math.min(1, pan));
  }

  /** @param {{ pitch?: number, volume?: number, pan?: number }} opts */
  update(opts) {
    if (this.stopped) return;
    if (opts.pitch !== undefined) this.source.playbackRate.value = opts.pitch;
    if (opts.volume !== undefined) this.gain.gain.value = opts.volume;
    if (opts.pan !== undefined) this.panner.pan.value = Math.max(-1, Math.min(1, opts.pan));
  }
}

// ---------------------------------------------------------------------------
// Audio — main public class
// ---------------------------------------------------------------------------
export class Audio {
  constructor() {
    /** @type {AudioContext|null} */
    this.audioCtx = null;

    // Pre-generated buffers
    this.explosionBuffer = null;
    this.megaExplosionBuffer = null;
    this.launchBuffer = null;
    this.heatSeekerLaunchBuffer = null;
    this.motorLoopBuffer = null;
    this.spoolLoopBuffer = null;
    this.vulkanShotBuffer = null;
    this.nukeWarningBuffer = null;

    this._initialized = false;
  }

  // -----------------------------------------------------------------------
  // Initialization — call on first user click to satisfy autoplay policy
  // -----------------------------------------------------------------------
  init() {
    if (this._initialized) return;
    this._initialized = true;

    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    // Resume in case the browser started the context suspended
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    this.explosionBuffer = this._generateExplosionBuffer(false);
    this.megaExplosionBuffer = this._generateExplosionBuffer(true);
    this.launchBuffer = this._generateLaunchBuffer();
    this.heatSeekerLaunchBuffer = this._generateHeatSeekerLaunchBuffer();
    this.motorLoopBuffer = this._generateMotorBuffer();
    this.spoolLoopBuffer = this._generateSpoolBuffer();
    this.vulkanShotBuffer = this._generateVulkanShotBuffer();
    this.nukeWarningBuffer = this._generateNukeWarningBuffer();
  }

  // -----------------------------------------------------------------------
  // Playback API
  // -----------------------------------------------------------------------

  /**
   * One-shot explosion, panned by x position.
   * @param {number} x — world x (0..2560)
   * @param {boolean} isMega
   */
  playExplosion(x, isMega = false) {
    if (!this.audioCtx) return;
    const buffer = isMega ? this.megaExplosionBuffer : this.explosionBuffer;
    // Godot: volume_db = 6 (normal) or 10 (mega), pitch 0.75..1.05
    const volumeDb = isMega ? 10.0 : 6.0;
    const pitch = randf(0.75, 1.05);
    this._playBuffer(buffer, volumeDb, pitch, panFromX(x));
  }

  /**
   * One-shot launch sound.
   * @param {number} x — world x
   * @param {'missile'|'heatseeker'} type
   */
  playLaunch(x, type = 'sam') {
    if (!this.audioCtx) return;
    if (type === 'heatseeker') {
      // Godot: volume_db = 3, pitch 0.94..1.06
      this._playBuffer(this.heatSeekerLaunchBuffer, 3.0, randf(0.94, 1.06), panFromX(x));
    } else {
      // Godot: volume_db = 2, pitch 0.90..1.10
      this._playBuffer(this.launchBuffer, 2.0, randf(0.90, 1.10), panFromX(x));
    }
  }

  /**
   * One-shot vulkan shot crack.
   * @param {number} x — world x
   */
  playVulkanShot(x) {
    if (!this.audioCtx) return;
    // Godot: volume_db = randf(-3,0), pitch = randf(0.85,1.15)
    this._playBuffer(this.vulkanShotBuffer, randf(-3.0, 0.0), randf(0.85, 1.15), panFromX(x));
  }

  /**
   * One-shot nuke incoming warning siren.
   * @param {number} x — world x (spawn position)
   */
  playNukeWarning(x) {
    if (!this.audioCtx) return;
    this._playBuffer(this.nukeWarningBuffer, 8.0, 1.0, panFromX(x));
  }

  /**
   * Start heat-seeker motor loop. Returns a SoundLoop handle.
   * @param {number} x — world x
   * @returns {SoundLoop}
   */
  startMotorLoop(x) {
    if (!this.audioCtx) return null;
    // Godot: volume_db = -4, pitch = randf(0.95,1.05)
    const volume = Math.pow(10, -4.0 / 20);
    const pitch = randf(0.95, 1.05);
    return new SoundLoop(this.audioCtx, this.motorLoopBuffer, volume, pitch, panFromX(x));
  }

  /**
   * Start vulkan spool loop. Returns a SoundLoop handle.
   * @param {number} x — world x
   * @returns {SoundLoop}
   */
  startSpoolLoop(x) {
    if (!this.audioCtx) return null;
    // Godot: starts at volume_db = -20
    const volume = Math.pow(10, -20.0 / 20);
    return new SoundLoop(this.audioCtx, this.spoolLoopBuffer, volume, 0.5, panFromX(x));
  }

  /**
   * Stop a continuous loop.
   * @param {SoundLoop|null} handle
   */
  stopLoop(handle) {
    if (handle) handle.stop();
  }

  /**
   * Update a loop's dynamic parameters.
   * @param {SoundLoop|null} handle
   * @param {{ pitch?: number, volume?: number, pan?: number }} opts
   */
  updateLoop(handle, opts) {
    if (handle) handle.update(opts);
  }

  // -----------------------------------------------------------------------
  // Internal: play a one-shot buffer
  // -----------------------------------------------------------------------

  /**
   * @param {AudioBuffer} buffer
   * @param {number} volumeDb — decibels
   * @param {number} pitch — playback rate
   * @param {number} pan — -1..1
   */
  _playBuffer(buffer, volumeDb, pitch, pan) {
    if (!buffer || !this.audioCtx) return;
    const ctx = this.audioCtx;
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    const panner = ctx.createStereoPanner();

    source.buffer = buffer;
    source.playbackRate.value = pitch;
    gain.gain.value = Math.pow(10, volumeDb / 20);
    panner.pan.value = Math.max(-1, Math.min(1, pan));

    source.connect(gain);
    gain.connect(panner);
    panner.connect(ctx.destination);
    source.start();
  }

  // -----------------------------------------------------------------------
  // Buffer generation — exact translations from Godot source
  // -----------------------------------------------------------------------

  /**
   * Create an AudioBuffer from Float32 sample data.
   * @param {Float32Array} samples
   * @param {number} sampleRate
   * @returns {AudioBuffer}
   */
  _createBuffer(samples, sampleRate) {
    const buffer = this.audioCtx.createBuffer(1, samples.length, sampleRate);
    buffer.getChannelData(0).set(samples);
    return buffer;
  }

  // -- Explosion (from explosion.gd play_explosion_sound) ------------------
  _generateExplosionBuffer(isMega) {
    const sampleRate = 22050;
    const duration = isMega ? 1.1 : 0.7;
    const numSamples = Math.floor(sampleRate * duration);
    const samples = new Float32Array(numSamples);

    const bassFreq = isMega ? 22.0 : 35.0;
    const subFreq = isMega ? 12.0 : 18.0;
    const midFreq = isMega ? 55.0 : 80.0;

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const progress = i / numSamples;

      // Envelope: sharp attack, slower decay with bass tail
      let envelope;
      if (t < 0.008) {
        envelope = t / 0.008;
      } else if (progress < 0.15) {
        envelope = 1.0;
      } else {
        const decayProgress = (progress - 0.15) / 0.85;
        envelope = Math.pow(1.0 - decayProgress, 1.5);
      }

      // Sub-bass thump
      const subBass = Math.sin(TAU * subFreq * t) * 0.35;

      // Main bass boom with pitch drop
      const pitchDrop = 1.0 - progress * 0.5;
      const bass = Math.sin(TAU * bassFreq * t * pitchDrop) * 0.3;

      // Mid rumble layer
      const mid = Math.sin(TAU * midFreq * t * pitchDrop) * 0.15;

      // Filtered noise
      const noise = randf(-1.0, 1.0) * randf(0.3, 1.0);
      const noiseWeight = 0.2 * (1.0 - progress * 0.5);

      // Crackle in the initial blast
      let crackle = 0.0;
      if (t < 0.05) {
        crackle = randf(-1.0, 1.0) * (1.0 - t / 0.05) * 0.25;
      }

      // Mix
      let val = (subBass + bass + mid + noise * noiseWeight + crackle) * envelope;
      // Soft clipping — clamp to ±1.5 before tanh for consistent drive range
      val = Math.tanh(Math.max(-1.5, Math.min(1.5, val)) * 1.5) / Math.tanh(1.5);

      samples[i] = val;
    }

    return this._createBuffer(samples, sampleRate);
  }

  // -- Missile launch (from missile.gd play_launch_sound) ------------------
  _generateLaunchBuffer() {
    const sampleRate = 22050;
    const duration = 0.55;
    const numSamples = Math.floor(sampleRate * duration);
    const samples = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const progress = t / duration;

      // Sharp attack, exponential decay envelope
      let envelope;
      if (t < 0.005) {
        envelope = t / 0.005;
      } else {
        envelope = Math.exp(-5.0 * (t - 0.005));
      }

      // Heavy ignition crack — broadband noise burst
      const crack = randf(-1.0, 1.0) * Math.max(0.0, 1.0 - t / 0.016) * 0.70;

      // Sub-bass thump on ignition
      const sub = Math.sin(TAU * 50.0 * t) * Math.max(0.0, 1.0 - t / 0.06) * 0.30;

      // Rocket motor rush — whooshing filtered noise
      const rushEnv = Math.min(t / 0.02, 1.0) * Math.exp(-3.0 * Math.max(0.0, t - 0.04));
      const rush = randf(-1.0, 1.0) * randf(0.3, 1.0) * rushEnv * 0.30;

      // Low resonant rumble
      const rumble = Math.sin(TAU * 85.0 * t * (1.0 - progress * 0.2)) * 0.20 * (1.0 - progress * 0.8);

      // Metallic ping — tube resonance on launch
      const ping = Math.sin(TAU * 680.0 * t) * Math.max(0.0, 1.0 - t / 0.03) * 0.15;

      // Receding hiss
      const hiss = randf(-1.0, 1.0) * 0.15 * Math.max(0.0, 1.0 - progress * 1.2);

      let val = (crack + sub + rush + rumble + ping + hiss) * envelope;
      val = Math.tanh(Math.max(-1.5, Math.min(1.5, val)) * 1.3) / Math.tanh(1.3);

      samples[i] = val;
    }

    return this._createBuffer(samples, sampleRate);
  }

  // -- Heat-seeker launch (from heat_seeking_missile.gd play_launch_sound) --
  _generateHeatSeekerLaunchBuffer() {
    const sampleRate = 22050;
    const duration = 0.65;
    const numSamples = Math.floor(sampleRate * duration);
    const samples = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const progress = t / duration;

      // Sharp attack, exponential decay envelope
      let envelope;
      if (t < 0.006) {
        envelope = t / 0.006;
      } else {
        envelope = Math.exp(-4.5 * (t - 0.006));
      }

      // Ignition crack — sharp broadband pop
      const crack = randf(-1.0, 1.0) * Math.max(0.0, 1.0 - t / 0.018) * 0.65;

      // Rocket motor rush — whooshing noise with low-pass character
      const rushEnv = Math.min(t / 0.03, 1.0) * Math.exp(-2.5 * Math.max(0.0, t - 0.05));
      const rush = randf(-1.0, 1.0) * randf(0.4, 1.0) * rushEnv * 0.35;

      // Low sub-thump on ignition
      const sub = Math.sin(TAU * 55.0 * t) * Math.max(0.0, 1.0 - t / 0.08) * 0.25;

      // Mid-tone rocket body resonance
      const mid = Math.sin(TAU * 280.0 * t * (1.0 - progress * 0.3)) * 0.12 * Math.max(0.0, 1.0 - t / 0.2);

      // Electronic seeker acquisition — descending chirp
      const chirpFreq = 3200.0 * Math.exp(-12.0 * t);
      const chirpEnv = Math.max(0.0, 1.0 - t / 0.06) * 0.3;
      const chirp = Math.sin(TAU * chirpFreq * t) * chirpEnv;

      // Seeker lock ping — short tonal blip at ~1800Hz
      const pingStart = 0.04;
      const pingDur = 0.035;
      let ping = 0.0;
      if (t > pingStart && t < pingStart + pingDur) {
        const pingT = t - pingStart;
        const pingEnv = Math.sin(Math.PI * pingT / pingDur);
        ping = Math.sin(TAU * 1800.0 * pingT) * pingEnv * 0.2;
      }

      // Doppler rising whoosh (distant receding)
      const whooshEnv = Math.max(0, Math.min(1, (t - 0.08) / 0.15)) * Math.exp(-3.0 * Math.max(0.0, t - 0.25));
      const whoosh = randf(-1.0, 1.0) * whooshEnv * 0.18;

      // Mix
      let val = (crack + rush + sub + mid + chirp + ping + whoosh) * envelope;
      val = Math.tanh(Math.max(-1.5, Math.min(1.5, val)) * 1.4) / Math.tanh(1.4);

      samples[i] = val;
    }

    return this._createBuffer(samples, sampleRate);
  }

  // -- Heat-seeker motor loop (from heat_seeking_missile.gd _start_motor_loop) --
  _generateMotorBuffer() {
    const sampleRate = 22050;
    const duration = 0.3;
    const numSamples = Math.floor(sampleRate * duration);
    const samples = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;

      // Jet hiss — filtered noise
      const hiss = randf(-1.0, 1.0) * randf(0.3, 1.0) * 0.15;

      // Low motor rumble
      let rumble = Math.sin(TAU * 72.0 * t) * 0.12;
      rumble += Math.sin(TAU * 144.0 * t) * 0.06; // harmonic

      // Mid whine (seeker electronics)
      let whine = Math.sin(TAU * 520.0 * t) * 0.04;
      whine += Math.sin(TAU * 780.0 * t) * 0.02; // harmonic shimmer

      // Slight flutter modulation
      const flutter = 1.0 + Math.sin(TAU * 18.0 * t) * 0.08;

      let val = (hiss + rumble + whine) * flutter;
      val = Math.tanh(val * 1.2) / Math.tanh(1.2);

      samples[i] = val;
    }

    // Crossfade loop boundaries to prevent noise click
    applyLoopCrossfade(samples, LOOP_FADE_SAMPLES);

    return this._createBuffer(samples, sampleRate);
  }

  // -- Vulkan shot (from vulkan_cannon.gd _create_fire_sound) ---------------
  _generateVulkanShotBuffer() {
    const sampleRate = 22050;
    const duration = 0.06;
    const numSamples = Math.floor(sampleRate * duration);
    const samples = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;

      // Ultra-sharp attack, fast decay
      const envelope = Math.min(t / 0.001, 1.0) * Math.exp(-60.0 * t);

      // Sharp metallic crack
      const crack = randf(-1.0, 1.0) * 0.8;

      // Brief metallic ring
      const ring = Math.sin(TAU * 1200.0 * t) * 0.3 * Math.max(0.0, 1.0 - t / 0.02);

      // Tiny bass punch
      const punch = Math.sin(TAU * 120.0 * t) * 0.25 * Math.max(0.0, 1.0 - t / 0.015);

      let val = (crack + ring + punch) * envelope;
      val = Math.tanh(val * 1.5) / Math.tanh(1.5);

      samples[i] = val;
    }

    return this._createBuffer(samples, sampleRate);
  }

  // -- Nuke warning siren ---------------------------------------------------
  _generateNukeWarningBuffer() {
    const sampleRate = 22050;
    const duration = 1.2;
    const numSamples = Math.floor(sampleRate * duration);
    const samples = new Float32Array(numSamples);

    const toneA = 420.0; // low tone Hz
    const toneB = 620.0; // high tone Hz
    const toggleInterval = 0.3; // seconds per tone

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;

      // Alternate between toneA and toneB every toggleInterval seconds
      const tonePhase = Math.floor(t / toggleInterval);
      const freq = (tonePhase % 2 === 0) ? toneA : toneB;

      // Pseudo-square wave: hard-clip a sine for harshness
      const sineVal = Math.sin(TAU * freq * t);
      const squareWave = sineVal > 0.3 ? 1.0 : (sineVal < -0.3 ? -1.0 : sineVal / 0.3);

      // Softer sine undertone at half frequency
      const undertone = Math.sin(TAU * (freq * 0.5) * t) * 0.25;

      // Brief noise click on tone transitions (within 0.004s of each toggle boundary)
      const timeInSlot = t - tonePhase * toggleInterval;
      const clickWindow = 0.004;
      const isTransition = timeInSlot < clickWindow;
      const click = isTransition ? randf(-1.0, 1.0) * (1.0 - timeInSlot / clickWindow) * 0.4 : 0.0;

      // Mix primary tones
      let val = squareWave * 0.55 + undertone + click;

      // Fade in (first 0.05s) and fade out (last 0.1s) envelope
      const fadeIn = Math.min(t / 0.05, 1.0);
      const fadeOut = Math.min((duration - t) / 0.1, 1.0);
      val *= fadeIn * fadeOut;

      // Soft clip with tanh for final saturation
      val = Math.tanh(val * 1.4) / Math.tanh(1.4);

      samples[i] = val;
    }

    return this._createBuffer(samples, sampleRate);
  }

  // -- Vulkan spool loop (from vulkan_cannon.gd _create_spool_sound) --------
  _generateSpoolBuffer() {
    const sampleRate = 22050;
    const duration = 0.2;
    const numSamples = Math.floor(sampleRate * duration);
    const samples = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;

      // Mechanical whir — layered sine tones
      let whir = Math.sin(TAU * 180.0 * t) * 0.15;
      whir += Math.sin(TAU * 360.0 * t) * 0.08; // 2nd harmonic
      whir += Math.sin(TAU * 540.0 * t) * 0.04; // 3rd harmonic

      // Bearing rattle
      const rattle = randf(-1.0, 1.0) * 0.05;

      // Motor hum
      const hum = Math.sin(TAU * 90.0 * t) * 0.08;

      let val = whir + rattle + hum;
      val = Math.tanh(val * 1.3) / Math.tanh(1.3);

      samples[i] = val;
    }

    // Crossfade loop boundaries to prevent noise click
    applyLoopCrossfade(samples, LOOP_FADE_SAMPLES);

    return this._createBuffer(samples, sampleRate);
  }
}
