import { startLoop } from './engine/loop.js';
import { Renderer } from './engine/renderer.js';
import { Input } from './engine/input.js';
import { Audio } from './engine/audio.js';
import { EntityManager } from './entities/entity-manager.js';
import { CollisionSystem } from './collision.js';
import { WaveSystem } from './wave.js';
import { UI } from './ui.js';
import { Terrain } from './terrain.js';
import { SAMLauncher } from './entities/sam-launcher.js';
import { HeatSeekerLauncher } from './entities/heat-seeking-launcher.js';
import { TruckLauncher } from './entities/truck-launcher.js';
import { VulkanCannon } from './entities/vulkan-cannon.js';
import { Missile } from './entities/missile.js';
import { HeatSeekingMissile } from './entities/heat-seeking-missile.js';
import { VulkanBullet } from './entities/vulkan-bullet.js';
import { EnemyMissile } from './entities/enemy-missile.js';
import { SuperMissile } from './entities/super-missile.js';
import { Drone } from './entities/drone.js';
import { SuicideDrone } from './entities/suicide-drone.js';
import { Nuke } from './entities/nuke.js';
import { rgba, lerp, randf, dist } from './utils.js';

// Launcher spawn positions (from main.gd / SCENE_DATA)
const LAUNCHER_POSITIONS = [
  { x: 400,  y: 1220, Class: SAMLauncher },
  { x: 900,  y: 1220, Class: HeatSeekerLauncher },
  { x: 1400, y: 1220, Class: TruckLauncher },
  { x: 1900, y: 1220, Class: VulkanCannon },
];

const CROSSHAIR_RADIUS = 50;

/**
 * Game — top-level controller. Creates engine systems, runs the game loop,
 * manages state transitions. Translates main.gd.
 */
export class Game {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this.renderer = new Renderer(canvas);
    this.input = new Input(canvas, this.renderer);
    this.audio = new Audio();
    this.entities = new EntityManager();
    this.collision = new CollisionSystem();
    this.waves = new WaveSystem();
    this.ui = new UI(this.renderer);

    /** @type {'start' | 'playing' | 'gameover'} */
    this.state = 'start';
    this.score = 0;
    this.waveNumber = 0;

    /** @type {import('./entities/launcher.js').Launcher|null} */
    this.selectedLauncher = null;

    /** @type {import('./entities/launcher.js').Launcher[]} */
    this.launchers = [];

    /** @type {import('./terrain.js').Terrain|null} */
    this.terrain = null;

    /** @type {import('./entities/entity.js').Entity|null} */
    this.lockedTarget = null;

    // Screen shake
    this.shakeIntensity = 0;
    this.shakeDecay = 5.0;

    // Vulkan spool state
    this._vulkanSpoolLoop = null;
    this._vulkanWasFiring = false;

    // Delta time for UI banner rendering
    this._lastDt = 1 / 60;

    // Hide OS cursor
    canvas.style.cursor = 'none';

    // Preload cover image for start screen
    this._coverImage = new Image();
    this._coverImage.src = 'assets/coverfinal.png';

    // Wire wave system callbacks
    this.waves.onWaveStart = (wave) => {
      this.waveNumber = wave;
      this.ui.showWaveBanner(`WAVE ${wave}`, rgba(1, 0.85, 0.1));
      // Stop terrain recovery once the new wave begins — craters should stick
      // during active combat.
      if (this.terrain) this.terrain.recovering = false;
    };
    this.waves.onWaveComplete = (wave) => {
      this.ui.showWaveBanner(`WAVE ${wave} CLEAR`, rgba(0.2, 0.9, 0.3));
      // Begin gradual terrain healing during the inter-wave break.
      if (this.terrain) this.terrain.recovering = true;
    };

    // Start the loop
    this._loopHandle = startLoop(
      (dt) => this.update(dt),
      () => this.render()
    );
  }

  // ── State transitions ──────────────────────────────────────

  start() {
    this.state = 'playing';
    this.score = 0;
    this.waveNumber = 0;
    this.entities.clear();
    this.launchers = [];
    this.selectedLauncher = null;
    this.lockedTarget = null;
    this._vulkanSpoolLoop = null;
    this._vulkanWasFiring = false;

    // Create terrain
    this.terrain = new Terrain(1240, this.renderer);
    this.entities.add(this.terrain);

    // Spawn launchers
    for (const def of LAUNCHER_POSITIONS) {
      const launcher = new def.Class(def.x, def.y);
      this.entities.add(launcher);
      this.launchers.push(launcher);
    }

    // Wire vulkan fire callback
    const vulkan = this.launchers[3];
    if (vulkan && vulkan.type === 'vulkan') {
      vulkan.onFireBullet = (cannon) => this._onVulkanFire(cannon);
    }

    // Select SAM by default
    this._selectLauncher(0);

    // Start wave system
    this.waves.start();
  }

  // ── Per-frame ──────────────────────────────────────────────

  /** @param {number} dt */
  update(dt) {
    this.input.update();
    this._lastDt = dt;

    // Screen shake decay (always active)
    if (this.shakeIntensity > 0.01) {
      this.shakeIntensity = lerp(this.shakeIntensity, 0, this.shakeDecay * dt);
      this.renderer.cameraOffsetX = (Math.random() - 0.5) * 2 * this.shakeIntensity;
      this.renderer.cameraOffsetY = (Math.random() - 0.5) * 2 * this.shakeIntensity;
    } else {
      this.shakeIntensity = 0;
      this.renderer.cameraOffsetX = 0;
      this.renderer.cameraOffsetY = 0;
    }

    if (this.state === 'start') {
      if (this.input.mouseJustPressed) {
        this.audio.init();
        this.start();
      }
    } else if (this.state === 'playing') {
      this._updatePlaying(dt);
    } else if (this.state === 'gameover') {
      this.entities.update(dt);
      if (this.input.mouseJustPressed) {
        this.start();
      }
    }
  }

  /** @param {number} dt */
  _updatePlaying(dt) {
    // Feed mouse position to all launchers
    for (const launcher of this.launchers) {
      if (launcher.alive) {
        launcher.mouseX = this.input.mouseX;
        launcher.mouseY = this.input.mouseY;
      }
    }

    // Update entities
    this.entities.update(dt);

    // Collision
    this.collision.update(this.entities, this.terrain, this);

    // Wave system — pass a getter so count is checked AFTER spawns
    this.waves.update(dt, (type) => this._spawnEnemy(type),
      () => this.entities.getGroup('enemy_missiles').length);
    this.waveNumber = this.waves.getCurrentWave();

    // Keyboard launcher selection (1-4)
    for (let i = 0; i < 4; i++) {
      if (this.input.wasKeyPressed(String(i + 1))) {
        this._selectLauncher(i);
      }
    }

    // Validate selected launcher
    if (this.selectedLauncher && !this.selectedLauncher.alive) {
      this._autoSelectLauncher();
    }

    // Heat-seeker lock target
    this._updateLockedTarget();

    // Fire input
    this._handleFireInput();

    // Game over check
    this._checkGameOver();
  }

  // ── Rendering ──────────────────────────────────────────────

  render() {
    const r = this.renderer;
    const ctx = r.ctx;

    r.beginFrame();

    // Sky
    ctx.fillStyle = rgba(0.05, 0.05, 0.12);
    ctx.fillRect(0, 0, Renderer.LOGICAL_W, Renderer.LOGICAL_H);

    if (this.state === 'start') {
      r.beginUI();

      // Cover image — full-width marquee, centered on screen
      const img = this._coverImage;
      if (img.complete && img.naturalWidth > 0) {
        const imgW = 2200;
        const imgH = Math.round(imgW * img.naturalHeight / img.naturalWidth);
        const imgX = (Renderer.LOGICAL_W - imgW) / 2;
        const imgY = (Renderer.LOGICAL_H - imgH) / 2; // vertically centered
        ctx.drawImage(img, imgX, imgY, imgW, imgH);
      }

      r.drawText(
        'MISSILE ATTACK',
        Renderer.LOGICAL_W / 2, 1150,
        'bold 96px monospace',
        rgba(1, 0.4, 0.2),
        'center'
      );
      r.drawText(
        'Click to start',
        Renderer.LOGICAL_W / 2, 1300,
        '48px monospace',
        rgba(1, 1, 1, 0.6),
        'center'
      );
    } else if (this.state === 'playing' || this.state === 'gameover') {
      // Game world (with shake)
      this.entities.draw(ctx);

      // UI layer (no shake)
      r.beginUI();
      this.ui.drawHUD(ctx, this, this._lastDt);
      this.ui.drawWaveBanner(ctx, this._lastDt);
      this.ui.drawCrosshair(ctx, this);
    }

    r.endFrame();
  }

  // ── Launcher selection ─────────────────────────────────────

  /** @param {number} index */
  _selectLauncher(index) {
    if (index < 0 || index >= this.launchers.length) return;
    const launcher = this.launchers[index];
    if (!launcher.alive) return;

    // Deselect previous
    if (this.selectedLauncher) {
      this.selectedLauncher.setSelected(false);
      if (this.selectedLauncher.type === 'vulkan') {
        this.selectedLauncher.stopFiring();
        this._stopVulkanSpool();
      }
    }

    this.selectedLauncher = launcher;
    launcher.setSelected(true);
    this.lockedTarget = null;
  }

  _autoSelectLauncher() {
    if (this.selectedLauncher && this.selectedLauncher.type === 'vulkan') {
      this._stopVulkanSpool();
    }
    this.selectedLauncher = null;
    this.lockedTarget = null;

    for (let i = 0; i < this.launchers.length; i++) {
      if (this.launchers[i].alive) {
        this._selectLauncher(i);
        return;
      }
    }
  }

  // ── Fire input ─────────────────────────────────────────────

  _handleFireInput() {
    const sel = this.selectedLauncher;
    if (!sel || !sel.alive) return;

    if (sel.type === 'vulkan') {
      if (this.input.mouseDown) {
        if (!this._vulkanWasFiring) {
          sel.startFiring();
          this._startVulkanSpool();
          this._vulkanWasFiring = true;
        }
      } else {
        if (this._vulkanWasFiring) {
          sel.stopFiring();
          this._stopVulkanSpool();
          this._vulkanWasFiring = false;
        }
      }
    } else {
      if (this.input.mouseJustPressed) {
        this._fireMissile(sel);
      }
    }
  }

  _fireMissile(launcher) {
    const launchPos = launcher.getLaunchPosition();
    const targetX = this.input.mouseX;
    const targetY = this.input.mouseY;

    if (launcher.type === 'heatseeker') {
      const missile = new HeatSeekingMissile(launchPos.x, launchPos.y);
      missile.launchTo(targetX, targetY, this.lockedTarget);
      const motorLoop = this.audio.startMotorLoop(launchPos.x);
      if (motorLoop) missile.motorSound = motorLoop;
      this.entities.add(missile);
      this.audio.playLaunch(launchPos.x, 'heatseeker');
    } else {
      const missile = new Missile(launchPos.x, launchPos.y);
      missile.launchTo(targetX, targetY);
      this.entities.add(missile);
      this.audio.playLaunch(launchPos.x, 'sam');
    }
  }

  // ── Vulkan helpers ─────────────────────────────────────────

  _onVulkanFire(cannon) {
    const launchPos = cannon.getLaunchPosition();
    const bullet = new VulkanBullet(launchPos.x, launchPos.y);
    const dx = this.input.mouseX - launchPos.x;
    const dy = this.input.mouseY - launchPos.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    bullet.fire(len > 0 ? dx / len : 0, len > 0 ? dy / len : -1);
    this.entities.add(bullet);
    this.audio.playVulkanShot(launchPos.x);
  }

  _startVulkanSpool() {
    if (this._vulkanSpoolLoop) return;
    if (this.selectedLauncher) {
      this._vulkanSpoolLoop = this.audio.startSpoolLoop(this.selectedLauncher.x);
    }
  }

  _stopVulkanSpool() {
    if (this._vulkanSpoolLoop) {
      this.audio.stopLoop(this._vulkanSpoolLoop);
      this._vulkanSpoolLoop = null;
    }
    this._vulkanWasFiring = false;
  }

  // ── Heat-seeker lock-on ────────────────────────────────────

  _updateLockedTarget() {
    if (!this.selectedLauncher || !this.selectedLauncher.alive ||
        this.selectedLauncher.type !== 'heatseeker') {
      this.lockedTarget = null;
      return;
    }

    const mx = this.input.mouseX;
    const my = this.input.mouseY;
    const enemies = this.entities.getGroup('enemy_missiles');

    let closest = null;
    let closestDist = CROSSHAIR_RADIUS;

    for (const enemy of enemies) {
      const d = dist(mx, my, enemy.x, enemy.y);
      if (d < closestDist) {
        closestDist = d;
        closest = enemy;
      }
    }

    this.lockedTarget = closest;
  }

  // ── Enemy spawning ─────────────────────────────────────────

  /** @param {string} type */
  _spawnEnemy(type) {
    switch (type) {
      case 'missile': this._spawnEnemyMissile(); break;
      case 'super_missile': this._spawnSuperMissile(); break;
      case 'drone': this._spawnDrone(); break;
      case 'suicide_drone': this._spawnSuicideDrone(); break;
      case 'nuke': this._spawnNuke(); break;
    }
  }

  _spawnEnemyMissile() {
    const spawnX = randf(100, 2460);
    const spawnY = randf(-100, -50);
    const missile = new EnemyMissile(spawnX, spawnY);

    // 40% chance to target a launcher, otherwise random terrain
    let targetX;
    if (Math.random() < 0.4 && this.launchers.some(l => l.alive)) {
      const alive = this.launchers.filter(l => l.alive);
      const target = alive[Math.floor(Math.random() * alive.length)];
      targetX = target.x + randf(-80, 80);
    } else {
      targetX = randf(100, 2460);
    }
    const targetY = this.terrain ? this.terrain.getHeightAt(targetX) : 1240;
    missile.launchTo(targetX, targetY, randf(2.0, 3.5));
    this.entities.add(missile);
  }

  _spawnSuperMissile() {
    const missile = new SuperMissile(randf(200, 2360), -80);
    const targetX = randf(300, 2260);
    const targetY = this.terrain ? this.terrain.getHeightAt(targetX) : 1240;
    missile.launchTo(targetX, targetY, randf(6.0, 10.0));
    this.entities.add(missile);
  }

  _spawnDrone() {
    const fromLeft = Math.random() < 0.5;
    const drone = new Drone(fromLeft, randf(200, 600));
    drone.getLaunchers = () => this.launchers;
    drone.onDropBomb = (x, y) => this._onDroneBomb(x, y);
    this.entities.add(drone);
  }

  _spawnSuicideDrone() {
    const fromLeft = Math.random() < 0.5;
    const drone = new SuicideDrone(
      fromLeft ? -60 : 2620,
      randf(150, 500)
    );
    drone.getLaunchers = () => this.launchers;
    drone.init();
    this.entities.add(drone);
  }

  _spawnNuke() {
    const spawnX = randf(400, 2160);
    const spawnY = -300;
    const nuke = new Nuke(spawnX, spawnY);

    let targetX;
    if (this.launchers.some(l => l.alive)) {
      const alive = this.launchers.filter(l => l.alive);
      const target = alive[Math.floor(Math.random() * alive.length)];
      targetX = target.x + randf(-40, 40);
    } else {
      targetX = randf(600, 1960);
    }
    const targetY = this.terrain ? this.terrain.getHeightAt(targetX) : 1240;
    nuke.launchTo(targetX, targetY, randf(5.0, 7.0));
    this.entities.add(nuke);

    this.ui.showNukeWarning();
    this.audio.playNukeWarning(spawnX);
  }

  _onDroneBomb(x, y) {
    const bomb = new EnemyMissile(x, y);
    const targetX = x + randf(-30, 30);
    const targetY = this.terrain ? this.terrain.getHeightAt(targetX) : 1240;
    bomb.launchTo(targetX, targetY, randf(1.5, 2.5));
    this.entities.add(bomb);
  }

  // ── Game events ────────────────────────────────────────────

  onEnemyDestroyed(type = 'normal') {
    this.score += type === 'nuke' ? 5 : 1;
  }

  shakeScreen(intensity = 15.0) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  _checkGameOver() {
    if (!this.launchers.some(l => l.alive) && this.state === 'playing') {
      this.state = 'gameover';
      this._stopVulkanSpool();
    }
  }
}
