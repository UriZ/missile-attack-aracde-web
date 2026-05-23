/**
 * ShopUI — inter-wave upgrade shop overlay.
 *
 * Rendered entirely on Canvas 2D (no HTML elements).
 * Covers the frozen gameplay with a dark overlay, shows weapon tabs,
 * upgrade cards, stats panel, cash display, and READY button.
 *
 * Usage:
 *   const shop = new ShopUI();
 *   shop.open(game);          // called when entering 'shop' state
 *   shop.update(dt, game);    // called each frame while in 'shop' state
 *   shop.draw(ctx, game);     // called from render() while in 'shop' state
 *   shop.close();             // called when READY is pressed
 *
 * The shop fires game.onShopClose() when the player is ready,
 * which game.js wires to transition back to 'playing'.
 */

import { UPGRADE_CONFIG } from '../upgrades/upgrade-config.js';

// ── Layout constants (logical 2560×1440) ──────────────────────────────────

const W = 2560;
const H = 1440;

// Header bar
const HEADER_H = 120;
const HEADER_Y = 0;

// Tab geometry
const TAB_COUNT = 7;
const TAB_W = 260;
const TAB_H = HEADER_H;
const TAB_GAP = 0;
const TABS_TOTAL_W = TAB_COUNT * TAB_W;
const TABS_START_X = (W - TABS_TOTAL_W) / 2;

// Content area
const CONTENT_Y = HEADER_H + 20;
const CONTENT_H = H - HEADER_H - 20 - 160; // 160px bottom bar

// Left column: upgrade card grid
const GRID_X = 80;
const GRID_Y = CONTENT_Y + 20;
const CARD_W = 740;
const CARD_H = 240;
const CARD_GAP_X = 30;
const CARD_GAP_Y = 24;
const GRID_COLS = 2;

// Right column: stats panel
const STATS_X = 1760;
const STATS_Y = CONTENT_Y + 20;
const STATS_W = 720;
const STATS_H = 900;

// Bottom bar
const BOTTOM_Y = H - 140;
const BOTTOM_H = 120;

// READY button
const READY_W = 1040;
const READY_H = 120;
const READY_X = (W - READY_W) / 2;
const READY_Y = BOTTOM_Y + (BOTTOM_H - READY_H) / 2;

// Cash display
const CASH_X = 80;
const CASH_Y = BOTTOM_Y + BOTTOM_H / 2;

// ── Colors ─────────────────────────────────────────────────────────────────

const COLOR = {
  bg:         'rgba(2,6,16,0.82)',
  panel:      'rgba(8,14,28,0.94)',
  cyan:       '#00EEFF',
  green:      '#00FF88',
  orange:     '#FF6622',
  amber:      '#FFCC44',
  red:        '#FF3333',
  dimText:    '#556677',
  bodyText:   '#AABBCC',
  white:      '#FFFFFF',
  tabActive:  'rgba(0,180,220,0.18)',
  tabHover:   'rgba(0,120,160,0.10)',
  tabBorder:  'rgba(0,238,255,0.55)',
  cardBg:     'rgba(10,16,32,0.92)',
  cardAvail:  'rgba(0,238,255,0.55)',
  cardDone:   'rgba(0,200,100,0.45)',
  cardExpens: 'rgba(160,80,20,0.50)',
  cardLocked: 'rgba(30,30,50,0.50)',
  cardMaxed:  'rgba(80,80,120,0.50)',
};

// ── Weapon tabs (match upgrade-config keys + shield) ──────────────────────

const WEAPON_TABS = [
  { key: 'sam',       label: 'SAM',       configKey: 'sam'       },
  { key: 'heatseeker',label: 'HEAT-SK',   configKey: 'heatseeker'},
  { key: 'truck',     label: 'TRUCK',     configKey: 'truck'     },
  { key: 'vulkan',    label: 'VULKAN',    configKey: 'vulkan'    },
  { key: 'drone_pad', label: 'DRONE',     configKey: 'drone_pad' },
  { key: 'laser',     label: 'LASER',     configKey: 'laser'     },
  { key: 'shield',    label: 'SHIELD',    configKey: 'shield'    },
];

// ── Icon rendering helpers ─────────────────────────────────────────────────

const ICON_RENDERERS = {
  speed(ctx, cx, cy, r) {
    // Arrow pointing right (fast)
    ctx.beginPath();
    ctx.moveTo(cx - r, cy);
    ctx.lineTo(cx + r * 0.3, cy);
    ctx.strokeStyle = COLOR.cyan;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.0, cy - r * 0.5);
    ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx + r * 0.0, cy + r * 0.5);
    ctx.closePath();
    ctx.fillStyle = COLOR.cyan;
    ctx.fill();
  },
  damage(ctx, cx, cy, r) {
    // Starburst / explosion
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const ir = r * (i % 2 === 0 ? 1.0 : 0.5);
      if (i === 0) ctx.beginPath(), ctx.moveTo(cx + Math.cos(a) * ir, cy + Math.sin(a) * ir);
      else ctx.lineTo(cx + Math.cos(a) * ir, cy + Math.sin(a) * ir);
    }
    ctx.closePath();
    ctx.fillStyle = COLOR.orange;
    ctx.fill();
  },
  split(ctx, cx, cy, r) {
    // Three arrows diverging
    ctx.strokeStyle = COLOR.cyan;
    ctx.lineWidth = 2.5;
    const dirs = [[-0.4, -1], [0, -1.1], [0.4, -1]];
    for (const [dx, dy] of dirs) {
      const len = Math.sqrt(dx * dx + dy * dy);
      const ex = cx + (dx / len) * r;
      const ey = cy + (dy / len) * r;
      ctx.beginPath();
      ctx.moveTo(cx, cy + r * 0.3);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      // Arrowhead
      const nx = -(dy / len) * r * 0.25;
      const ny = (dx / len) * r * 0.25;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - (dx / len) * r * 0.3 + nx, ey - (dy / len) * r * 0.3 + ny);
      ctx.lineTo(ex - (dx / len) * r * 0.3 - nx, ey - (dy / len) * r * 0.3 - ny);
      ctx.closePath();
      ctx.fillStyle = COLOR.cyan;
      ctx.fill();
    }
  },
  range(ctx, cx, cy, r) {
    // Concentric arcs
    ctx.strokeStyle = COLOR.cyan;
    for (let i = 1; i <= 3; i++) {
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.4 + i * 0.2;
      ctx.beginPath();
      ctx.arc(cx, cy + r * 0.3, r * 0.3 * i, -Math.PI * 0.75, -Math.PI * 0.25);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },
  cooldown(ctx, cx, cy, r) {
    // Snowflake-ish
    ctx.strokeStyle = '#88AAFF';
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = '#88AAFF';
    ctx.fill();
  },
  ammo(ctx, cx, cy, r) {
    // Stack of bullets
    ctx.fillStyle = COLOR.amber;
    for (let i = 0; i < 3; i++) {
      const bx = cx - r * 0.5 + i * r * 0.5;
      const bh = r * 1.2;
      const bw = r * 0.3;
      _roundRect(ctx, bx - bw / 2, cy - bh / 2, bw, bh, bw * 0.4);
      ctx.fill();
    }
  },
  energy(ctx, cx, cy, r) {
    // Lightning bolt
    ctx.fillStyle = '#AAAAFF';
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.2, cy - r);
    ctx.lineTo(cx - r * 0.2, cy);
    ctx.lineTo(cx + r * 0.1, cy);
    ctx.lineTo(cx - r * 0.2, cy + r);
    ctx.lineTo(cx + r * 0.2, cy);
    ctx.lineTo(cx - r * 0.1, cy);
    ctx.closePath();
    ctx.fill();
  },
  targeting(ctx, cx, cy, r) {
    // Crosshair circle
    ctx.strokeStyle = COLOR.green;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - r, cy); ctx.lineTo(cx - r * 0.7, cy);
    ctx.moveTo(cx + r * 0.7, cy); ctx.lineTo(cx + r, cy);
    ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy - r * 0.7);
    ctx.moveTo(cx, cy + r * 0.7); ctx.lineTo(cx, cy + r);
    ctx.stroke();
  },
  duration(ctx, cx, cy, r) {
    // Clock face
    ctx.strokeStyle = COLOR.cyan;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, cy - r * 0.65);
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + r * 0.45, cy + r * 0.15);
    ctx.stroke();
  },
};

// ── ShopUI class ───────────────────────────────────────────────────────────

export class ShopUI {
  constructor() {
    /** @type {number} currently selected weapon tab index */
    this._activeTab = 0;

    /** @type {number} animation timer 0→1 for open/close */
    this._animT = 0;
    /** @type {'opening'|'open'|'closing'|'closed'} */
    this._animState = 'closed';

    /** @type {number} tab cross-fade timer 0→1 */
    this._tabFadeT = 1;

    /** @type {number} index of hovered card (-1 = none) */
    this._hoveredCard = -1;

    /** @type {boolean} whether READY button is hovered */
    this._readyHovered = false;

    /** callback when shop closes (set by game.js) */
    this.onClose = null;

    /** @type {Array<{x:number,y:number,w:number,h:number,upgradeIndex:number}>} */
    this._cardHitAreas = [];

    /** @type {{x:number,y:number,w:number,h:number}} READY button hit area */
    this._readyHitArea = { x: READY_X, y: READY_Y, w: READY_W, h: READY_H };

    /** @type {{x:number,y:number,w:number,h:number}[]} tab hit areas */
    this._tabHitAreas = [];

    // Pre-compute tab hit areas (in logical coords)
    for (let i = 0; i < TAB_COUNT; i++) {
      this._tabHitAreas.push({
        x: TABS_START_X + i * TAB_W,
        y: HEADER_Y,
        w: TAB_W,
        h: TAB_H,
      });
    }

    /** notification flash text + timer */
    this._flashText = '';
    this._flashTimer = 0;

    /** Scanline offset for animation */
    this._scanOffset = 0;
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /** Open the shop screen. Call when transitioning to 'shop' state. */
  open(game) {
    this._animState = 'opening';
    this._animT = 0;
    this._activeTab = 0;
    this._tabFadeT = 1;
    this._hoveredCard = -1;
    this._readyHovered = false;
    this._flashText = '';
    this._flashTimer = 0;
    this._scanOffset = 0;

    // Show canvas cursor during shop
    if (game && game.renderer && game.renderer.canvas) {
      game.renderer.canvas.style.cursor = 'default';
    }
  }

  /** Close animation. Call this, then wait for animState===closed to actually close. */
  close(game) {
    this._animState = 'closing';
    if (game && game.renderer && game.renderer.canvas) {
      game.renderer.canvas.style.cursor = 'none';
    }
  }

  /** @returns {boolean} true when close animation is done */
  isClosed() {
    return this._animState === 'closed';
  }

  // ── Per-frame update (handles input + animation) ───────────────────────

  /**
   * @param {number} dt
   * @param {object} game
   * @param {import('../engine/input.js').Input} input
   */
  update(dt, game, input) {
    // Advance animations
    if (this._animState === 'opening') {
      this._animT = Math.min(1, this._animT + dt / 0.25);
      if (this._animT >= 1) this._animState = 'open';
    } else if (this._animState === 'closing') {
      this._animT = Math.max(0, this._animT - dt / 0.20);
      if (this._animT <= 0) {
        this._animState = 'closed';
        if (this.onClose) this.onClose();
        return;
      }
    }

    if (this._animState !== 'open') return;

    // Tab cross-fade
    this._tabFadeT = Math.min(1, this._tabFadeT + dt / 0.1);

    // Flash notification
    if (this._flashTimer > 0) this._flashTimer -= dt;

    // Scanlines scroll
    this._scanOffset = (this._scanOffset + dt * 30) % 8;

    // Input — convert screen mouse to logical coords
    const lx = input.mouseX;
    const ly = input.mouseY;

    // Keyboard: 1-7 switch tabs
    for (let i = 0; i < TAB_COUNT; i++) {
      if (input.wasKeyPressed(String(i + 1))) {
        this._switchTab(i);
      }
    }

    // Enter / Space = READY
    if (input.wasKeyPressed('Enter') || input.wasKeyPressed(' ')) {
      this._pressReady(game);
      return;
    }

    // Rebuild card hit areas for the current tab (deterministic from layout constants)
    const currentTab = WEAPON_TABS[this._activeTab];
    const currentWeaponConfig = UPGRADE_CONFIG[currentTab.configKey];
    const currentUpgrades = currentWeaponConfig ? currentWeaponConfig.upgrades : [];
    this._cardHitAreas = [];
    for (let i = 0; i < currentUpgrades.length; i++) {
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);
      this._cardHitAreas.push({
        x: GRID_X + col * (CARD_W + CARD_GAP_X),
        y: GRID_Y + row * (CARD_H + CARD_GAP_Y),
        w: CARD_W,
        h: CARD_H,
        upgradeIndex: i,
      });
    }

    // Update hover states
    this._hoveredCard = -1;
    for (let i = 0; i < this._cardHitAreas.length; i++) {
      const a = this._cardHitAreas[i];
      if (lx >= a.x && lx <= a.x + a.w && ly >= a.y && ly <= a.y + a.h) {
        this._hoveredCard = i;
        break;
      }
    }

    this._readyHovered = (
      lx >= this._readyHitArea.x &&
      lx <= this._readyHitArea.x + this._readyHitArea.w &&
      ly >= this._readyHitArea.y &&
      ly <= this._readyHitArea.y + this._readyHitArea.h
    );

    // Tab hover + click
    for (let i = 0; i < this._tabHitAreas.length; i++) {
      const a = this._tabHitAreas[i];
      if (lx >= a.x && lx <= a.x + a.w && ly >= a.y && ly <= a.y + a.h) {
        if (input.mouseJustPressed && i !== this._activeTab) {
          this._switchTab(i);
        }
        break;
      }
    }

    // Card click
    if (input.mouseJustPressed && this._hoveredCard >= 0) {
      this._handleCardClick(this._hoveredCard, game);
    }

    // READY button click
    if (input.mouseJustPressed && this._readyHovered) {
      this._pressReady(game);
    }
  }

  // ── Drawing ─────────────────────────────────────────────────────────────

  /**
   * Draw the full shop overlay.
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} game
   */
  draw(ctx, game) {
    if (this._animState === 'closed') return;

    const t = _easeOutBack(this._animT);
    const fadeAlpha = Math.min(this._animT / 0.3, 1); // fade in faster than slide

    ctx.save();

    // ── Background overlay + vignette ──────────────────────────────────
    ctx.globalAlpha = fadeAlpha * 0.82;
    ctx.fillStyle = 'rgba(2,6,16,1)';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = fadeAlpha;

    // Radial vignette
    const vig = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.65);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(0.7, 'rgba(0,0,0,0.15)');
    vig.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    // Scanlines
    ctx.save();
    ctx.globalAlpha = fadeAlpha * 0.06;
    ctx.fillStyle = 'rgba(0,0,0,1)';
    for (let sy = Math.floor(-this._scanOffset) % 8; sy < H; sy += 8) {
      ctx.fillRect(0, sy, W, 4);
    }
    ctx.restore();

    ctx.globalAlpha = fadeAlpha;

    // ── Content slide: entire UI slides up from bottom ──────────────────
    const slideOffY = (1 - t) * 120;
    ctx.save();
    ctx.translate(0, slideOffY);

    // ── Header bar ──────────────────────────────────────────────────────
    this._drawHeader(ctx, game);

    // ── Upgrade card grid ────────────────────────────────────────────────
    this._drawCardGrid(ctx, game);

    // ── Stats panel ──────────────────────────────────────────────────────
    this._drawStatsPanel(ctx, game);

    // ── Bottom bar ───────────────────────────────────────────────────────
    this._drawBottomBar(ctx, game);

    ctx.restore(); // end slide translate

    // ── Flash notification (drawn at fixed position, no slide) ──────────
    if (this._flashTimer > 0) {
      const fa = Math.min(this._flashTimer / 0.3, 1);
      ctx.save();
      ctx.globalAlpha = fa;
      ctx.font = 'bold 42px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = this._flashText.startsWith('!') ? COLOR.orange : COLOR.green;
      ctx.fillText(this._flashText, W / 2, H / 2 + 300);
      ctx.restore();
    }

    ctx.restore();
  }

  // ── Private draw helpers ────────────────────────────────────────────────

  _drawHeader(ctx, game) {
    // Header background
    ctx.save();
    const hbg = ctx.createLinearGradient(0, HEADER_Y, 0, HEADER_Y + HEADER_H);
    hbg.addColorStop(0, 'rgba(8,20,44,0.98)');
    hbg.addColorStop(1, 'rgba(4,12,28,0.98)');
    ctx.fillStyle = hbg;
    ctx.fillRect(0, HEADER_Y, W, HEADER_H);

    // Bottom edge line
    ctx.strokeStyle = 'rgba(0,238,255,0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, HEADER_Y + HEADER_H);
    ctx.lineTo(W, HEADER_Y + HEADER_H);
    ctx.stroke();

    // "ARMORY" title — left side
    ctx.font = 'bold 64px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = COLOR.cyan;
    ctx.shadowBlur = 18;
    ctx.fillStyle = COLOR.cyan;
    ctx.fillText('ARMORY', 50, HEADER_Y + HEADER_H / 2);
    ctx.shadowBlur = 0;

    ctx.restore();

    // Weapon tabs
    for (let i = 0; i < TAB_COUNT; i++) {
      this._drawTab(ctx, i, game);
    }
  }

  _drawTab(ctx, i, game) {
    const tx = TABS_START_X + i * TAB_W;
    const ty = HEADER_Y;
    const tab = WEAPON_TABS[i];
    const isActive = i === this._activeTab;

    const weaponConfig = UPGRADE_CONFIG[tab.configKey];
    const upgrades = weaponConfig ? weaponConfig.upgrades : [];
    // Count purchased upgrades for this weapon
    const purchasedCount = upgrades.filter(u => game.upgradeState.hasPurchased(u.id)).length;
    const totalCount = upgrades.length;

    ctx.save();

    // Tab background
    ctx.fillStyle = isActive ? COLOR.tabActive : 'rgba(4,10,22,0.8)';
    ctx.fillRect(tx, ty, TAB_W - 1, TAB_H);

    // Active tab: bottom border glow
    if (isActive) {
      ctx.save();
      ctx.shadowColor = COLOR.cyan;
      ctx.shadowBlur = 14;
      ctx.strokeStyle = COLOR.tabBorder;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(tx, ty + TAB_H - 1);
      ctx.lineTo(tx + TAB_W - 1, ty + TAB_H - 1);
      ctx.stroke();
      ctx.restore();
    }

    // Vertical separator
    ctx.strokeStyle = 'rgba(0,238,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tx + TAB_W - 1, ty + 10);
    ctx.lineTo(tx + TAB_W - 1, ty + TAB_H - 10);
    ctx.stroke();

    // Key number badge [i+1]
    const keyBadgeX = tx + 12;
    const keyBadgeY = ty + 12;
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = isActive ? COLOR.cyan : COLOR.dimText;
    ctx.fillText(`[${i + 1}]`, keyBadgeX, keyBadgeY);

    // Weapon label
    ctx.font = `bold ${isActive ? 34 : 30}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isActive ? COLOR.white : COLOR.bodyText;
    ctx.fillText(tab.label, tx + TAB_W / 2, ty + TAB_H / 2 + 4);

    // Upgrade count badge (e.g. "2/3")
    if (totalCount > 0) {
      const badgeText = `${purchasedCount}/${totalCount}`;
      ctx.font = '18px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = purchasedCount === totalCount ? COLOR.green : COLOR.dimText;
      ctx.fillText(badgeText, tx + TAB_W / 2, ty + TAB_H - 8);
    }

    ctx.restore();
  }

  _drawCardGrid(ctx, game) {
    const tab = WEAPON_TABS[this._activeTab];
    const weaponConfig = UPGRADE_CONFIG[tab.configKey];
    const upgrades = weaponConfig ? weaponConfig.upgrades : [];

    ctx.save();
    ctx.globalAlpha = this._tabFadeT;

    for (let i = 0; i < upgrades.length; i++) {
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);
      const cx = GRID_X + col * (CARD_W + CARD_GAP_X);
      const cy = GRID_Y + row * (CARD_H + CARD_GAP_Y);

      this._drawCard(ctx, cx, cy, upgrades[i], i, game);
    }

    // If no upgrades
    if (upgrades.length === 0) {
      ctx.font = '36px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = COLOR.dimText;
      ctx.fillText('No upgrades available', GRID_X + CARD_W, GRID_Y + 120);
    }

    ctx.restore();
  }

  /**
   * Determine card state for an upgrade.
   * Returns one of: 'available' | 'purchased' | 'too_expensive' | 'locked' | 'maxed'
   */
  _getCardState(upgradeDef, game) {
    const us = game.upgradeState;

    // Purchased (non-repeatable)
    if (!upgradeDef.repeatable && us.hasPurchased(upgradeDef.id)) return 'purchased';

    // Check prereqs
    if (upgradeDef.prereqs && upgradeDef.prereqs.length > 0) {
      for (const prereq of upgradeDef.prereqs) {
        if (!us.hasPurchased(prereq)) return 'locked';
      }
    }

    // Too expensive
    if (game.cash < upgradeDef.cost) return 'too_expensive';

    return 'available';
  }

  _drawCard(ctx, x, y, upgradeDef, cardIndex, game) {
    const state = this._getCardState(upgradeDef, game);
    const isHovered = this._hoveredCard === cardIndex && state === 'available';

    ctx.save();

    // Card background
    const bg = ctx.createLinearGradient(x, y, x, y + CARD_H);
    switch (state) {
      case 'available':
        bg.addColorStop(0, isHovered ? 'rgba(0,30,52,0.98)' : 'rgba(10,18,36,0.94)');
        bg.addColorStop(1, isHovered ? 'rgba(0,20,40,0.98)' : 'rgba(6,12,26,0.94)');
        break;
      case 'purchased':
        bg.addColorStop(0, 'rgba(0,28,16,0.80)');
        bg.addColorStop(1, 'rgba(0,16,10,0.80)');
        break;
      case 'too_expensive':
        bg.addColorStop(0, 'rgba(24,12,4,0.92)');
        bg.addColorStop(1, 'rgba(16,8,2,0.92)');
        break;
      case 'locked':
        bg.addColorStop(0, 'rgba(8,8,16,0.75)');
        bg.addColorStop(1, 'rgba(4,4,10,0.75)');
        break;
      case 'maxed':
        bg.addColorStop(0, 'rgba(14,12,28,0.80)');
        bg.addColorStop(1, 'rgba(8,8,20,0.80)');
        break;
    }
    ctx.fillStyle = bg;
    _roundRect(ctx, x, y, CARD_W, CARD_H, 10);
    ctx.fill();

    // Card border
    ctx.save();
    switch (state) {
      case 'available':
        if (isHovered) {
          ctx.shadowColor = COLOR.cyan;
          ctx.shadowBlur = 20;
        }
        ctx.strokeStyle = isHovered ? COLOR.cyan : 'rgba(0,180,220,0.45)';
        ctx.lineWidth = isHovered ? 2.5 : 1.5;
        break;
      case 'purchased':
        ctx.strokeStyle = 'rgba(0,180,100,0.50)';
        ctx.lineWidth = 1.5;
        break;
      case 'too_expensive':
        ctx.strokeStyle = 'rgba(140,60,10,0.50)';
        ctx.lineWidth = 1;
        break;
      case 'locked':
        ctx.strokeStyle = 'rgba(40,40,70,0.40)';
        ctx.lineWidth = 1;
        break;
      case 'maxed':
        ctx.strokeStyle = 'rgba(80,70,120,0.45)';
        ctx.lineWidth = 1;
        break;
    }
    _roundRect(ctx, x, y, CARD_W, CARD_H, 10);
    ctx.stroke();
    ctx.restore();

    // Alpha for locked/purchased states
    if (state === 'purchased') ctx.globalAlpha = 0.75;
    else if (state === 'locked') ctx.globalAlpha = 0.55;

    // Icon area (left side)
    const iconX = x + 50;
    const iconY = y + CARD_H / 2;
    const iconR = 28;
    ctx.save();
    // Icon circle bg
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.arc(iconX, iconY, iconR + 8, 0, Math.PI * 2);
    ctx.fill();
    // Draw icon
    const iconRenderer = ICON_RENDERERS[upgradeDef.icon] || ICON_RENDERERS.speed;
    ctx.globalAlpha = state === 'locked' ? 0.3 : 0.9;
    iconRenderer(ctx, iconX, iconY, iconR);
    ctx.globalAlpha = state === 'purchased' ? 0.75 : state === 'locked' ? 0.55 : 1;
    ctx.restore();

    // Tier badge (top-left)
    const tierColors = ['', '#00EEFF', '#FFCC44', '#FF6622'];
    const tierColor = tierColors[upgradeDef.tier] || '#888';
    ctx.save();
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = tierColor;
    ctx.fillText(`T${upgradeDef.tier}`, x + 14, y + 12);
    ctx.restore();

    // Upgrade name
    ctx.save();
    ctx.font = `bold 36px monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = state === 'locked' ? COLOR.dimText : COLOR.white;
    ctx.fillText(upgradeDef.name, x + 110, y + 28);
    ctx.restore();

    // Description
    ctx.save();
    ctx.font = '26px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = state === 'locked' ? 'rgba(50,60,80,0.8)' : COLOR.bodyText;
    // Wrap text to fit card width
    const descMaxW = CARD_W - 120 - 20;
    _drawWrappedText(ctx, upgradeDef.description, x + 110, y + 78, descMaxW, 30, 2);
    ctx.restore();

    // Bottom row: cost + action text
    const bottomY = y + CARD_H - 50;

    switch (state) {
      case 'available': {
        // Cost in green
        ctx.save();
        ctx.font = 'bold 32px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = COLOR.green;
        ctx.fillText(`$${upgradeDef.cost}`, x + 110, bottomY);
        ctx.restore();

        // "[CLICK TO BUY]" — blinking when hovered
        ctx.save();
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        const blinkA = isHovered ? (0.6 + 0.4 * Math.sin(Date.now() * 0.008)) : 0.55;
        ctx.fillStyle = `rgba(0,238,255,${blinkA.toFixed(2)})`;
        ctx.fillText('[CLICK TO BUY]', x + CARD_W - 18, bottomY);
        ctx.restore();
        break;
      }

      case 'purchased': {
        // "DONE" badge — green pill
        ctx.save();
        ctx.fillStyle = 'rgba(0,180,80,0.30)';
        _roundRect(ctx, x + 110, bottomY - 18, 140, 36, 8);
        ctx.fill();
        ctx.font = 'bold 26px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = COLOR.green;
        ctx.fillText('DONE  ✓', x + 110 + 70, bottomY);
        ctx.restore();
        break;
      }

      case 'too_expensive': {
        // Cost in orange
        ctx.save();
        ctx.font = 'bold 32px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = COLOR.orange;
        ctx.fillText(`$${upgradeDef.cost}`, x + 110, bottomY);
        ctx.restore();

        // "NEED $X MORE"
        const need = upgradeDef.cost - game.cash;
        ctx.save();
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(255,102,34,0.75)';
        ctx.fillText(`NEED $${need} MORE`, x + CARD_W - 18, bottomY);
        ctx.restore();
        break;
      }

      case 'locked': {
        // Lock icon + prereq name
        const prereqId = upgradeDef.prereqs && upgradeDef.prereqs[0];
        let prereqName = prereqId ? prereqId.replace(/_/g, ' ').toUpperCase() : 'UNKNOWN';
        // Try to find the display name from any config weapon
        if (prereqId) {
          outer: for (const wc of Object.values(UPGRADE_CONFIG)) {
            for (const u of wc.upgrades) {
              if (u.id === prereqId) { prereqName = u.name.toUpperCase(); break outer; }
            }
          }
        }

        ctx.save();
        ctx.font = 'bold 26px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(80,80,120,0.8)';
        ctx.fillText(`LOCKED`, x + 110, bottomY - 6);
        ctx.font = '22px monospace';
        ctx.fillStyle = 'rgba(60,60,100,0.8)';
        ctx.fillText(`Requires: ${prereqName}`, x + 110, bottomY + 20);
        ctx.restore();
        break;
      }

      case 'maxed': {
        ctx.save();
        ctx.font = 'bold 28px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(140,120,200,0.8)';
        ctx.fillText('FULLY UPGRADED', x + CARD_W / 2, bottomY);
        ctx.restore();
        break;
      }
    }

    ctx.restore();
  }

  _drawStatsPanel(ctx, game) {
    const tab = WEAPON_TABS[this._activeTab];
    const weaponConfig = UPGRADE_CONFIG[tab.configKey];

    ctx.save();

    // Panel background
    ctx.fillStyle = COLOR.panel;
    _roundRect(ctx, STATS_X, STATS_Y, STATS_W, STATS_H, 12);
    ctx.fill();

    // Panel border
    ctx.strokeStyle = 'rgba(0,180,220,0.30)';
    ctx.lineWidth = 1.5;
    _roundRect(ctx, STATS_X, STATS_Y, STATS_W, STATS_H, 12);
    ctx.stroke();

    // Left accent bar
    ctx.shadowColor = COLOR.cyan;
    ctx.shadowBlur = 8;
    ctx.fillStyle = COLOR.cyan;
    ctx.fillRect(STATS_X, STATS_Y + 12, 3, STATS_H - 24);
    ctx.shadowBlur = 0;

    // "WEAPON STATS" header
    ctx.font = 'bold 30px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = COLOR.cyan;
    ctx.fillText('WEAPON STATS', STATS_X + 22, STATS_Y + 22);

    // Weapon name
    ctx.font = 'bold 44px monospace';
    ctx.fillStyle = COLOR.white;
    ctx.fillText(weaponConfig ? weaponConfig.label : tab.label, STATS_X + 22, STATS_Y + 70);

    // Divider
    ctx.strokeStyle = 'rgba(0,238,255,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(STATS_X + 18, STATS_Y + 126);
    ctx.lineTo(STATS_X + STATS_W - 18, STATS_Y + 126);
    ctx.stroke();

    // Find the launcher entity for this weapon type
    const launcher = game.launchers ? game.launchers.find(l => l.type === tab.key) : null;

    if (launcher && launcher._baseStats) {
      const stats = launcher._baseStats;
      const statLabels = {
        missileSpeed:    { label: 'Missile Speed', fmt: v => `${Math.round(v)} px/s` },
        explosionRadius: { label: 'Blast Radius',  fmt: v => `${Math.round(v)} px` },
        fireRate:        { label: 'Fire Rate',      fmt: v => `${(1 / v).toFixed(1)}/s` },
        splitEnabled:    { label: 'Split',          fmt: v => v ? 'ON' : 'OFF' },
        splitCount:      { label: 'Split Count',    fmt: v => `${v}` },
        trackingSpeed:   { label: 'Track Speed',    fmt: v => `${Math.round(v)} px/s²` },
        lockRadius:      { label: 'Lock Radius',    fmt: v => `${Math.round(v)} px` },
        moveSpeed:       { label: 'Move Speed',     fmt: v => `${Math.round(v)} px/s` },
        coolRate:        { label: 'Cool Rate',      fmt: v => `${v.toFixed(2)}/s` },
        bulletsPerShot:  { label: 'Bullets/Shot',   fmt: v => `${v}` },
        autoAim:         { label: 'Auto-Aim',       fmt: v => v ? 'ON' : 'OFF' },
        maxStock:        { label: 'Drone Stock',    fmt: v => `${v}` },
        deployCooldown:  { label: 'Deploy CD',      fmt: v => `${v.toFixed(1)}s` },
        armedDrone:      { label: 'Armed',          fmt: v => v ? 'YES' : 'NO' },
        maxEnergy:       { label: 'Max Energy',     fmt: v => `${v.toFixed(2)}` },
        rechargeRate:    { label: 'Recharge',       fmt: v => `${v.toFixed(2)}/s` },
        warmUpTime:      { label: 'Warm-Up',        fmt: v => `${v.toFixed(2)}s` },
        chainEnabled:    { label: 'Chain',          fmt: v => v ? 'ON' : 'OFF' },
        chainCount:      { label: 'Chain Count',    fmt: v => `${v}` },
      };

      let rowY = STATS_Y + 148;
      const ROW_H = 56;

      for (const [statKey, meta] of Object.entries(statLabels)) {
        const baseVal = stats[statKey];
        const curVal = launcher[statKey];
        if (baseVal === undefined) continue;

        const isUpgraded = JSON.stringify(curVal) !== JSON.stringify(baseVal);

        ctx.save();
        // Row background (alternate shading)
        const rowIdx = Math.round((rowY - STATS_Y - 148) / ROW_H);
        if (rowIdx % 2 === 0) {
          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          ctx.fillRect(STATS_X + 8, rowY - 4, STATS_W - 16, ROW_H - 4);
        }

        // Label
        ctx.font = '26px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = COLOR.dimText;
        ctx.fillText(meta.label, STATS_X + 22, rowY + ROW_H / 2 - 4);

        // Value
        const displayVal = meta.fmt(curVal !== undefined ? curVal : baseVal);
        ctx.font = `bold 28px monospace`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = isUpgraded ? COLOR.green : COLOR.bodyText;
        if (isUpgraded) {
          ctx.shadowColor = COLOR.green;
          ctx.shadowBlur = 6;
        }
        ctx.fillText(displayVal, STATS_X + STATS_W - 22, rowY + ROW_H / 2 - 4);
        ctx.shadowBlur = 0;

        // Upgraded indicator arrow
        if (isUpgraded) {
          ctx.font = 'bold 20px monospace';
          ctx.fillStyle = COLOR.green;
          ctx.fillText('▲', STATS_X + STATS_W - 70, rowY + ROW_H / 2 - 4);
        }

        ctx.restore();

        rowY += ROW_H;
        if (rowY > STATS_Y + STATS_H - 60) break; // Don't overflow panel
      }
    } else if (tab.key === 'shield') {
      // Shield stats
      let rowY = STATS_Y + 148;
      const rows = [
        ['Charges', `${game.shieldCharges || 99}`],
        ['Duration', '~5s'],
        ['Cooldown', '15s'],
      ];
      for (const [label, val] of rows) {
        ctx.font = '26px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = COLOR.dimText;
        ctx.fillText(label, STATS_X + 22, rowY + 20);
        ctx.font = 'bold 28px monospace';
        ctx.textAlign = 'right';
        ctx.fillStyle = COLOR.bodyText;
        ctx.fillText(val, STATS_X + STATS_W - 22, rowY + 20);
        rowY += 56;
      }
    } else {
      ctx.font = '28px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = COLOR.dimText;
      ctx.fillText('No stats available', STATS_X + STATS_W / 2, STATS_Y + STATS_H / 2);
    }

    ctx.restore();
  }

  _drawBottomBar(ctx, game) {
    // Bottom bar background
    ctx.save();
    const bbg = ctx.createLinearGradient(0, BOTTOM_Y, 0, BOTTOM_Y + BOTTOM_H);
    bbg.addColorStop(0, 'rgba(4,10,22,0.98)');
    bbg.addColorStop(1, 'rgba(2,6,14,0.98)');
    ctx.fillStyle = bbg;
    ctx.fillRect(0, BOTTOM_Y, W, BOTTOM_H);

    // Top edge line
    ctx.strokeStyle = 'rgba(0,238,255,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, BOTTOM_Y);
    ctx.lineTo(W, BOTTOM_Y);
    ctx.stroke();

    // ── Cash display (bottom-left) ──
    ctx.font = 'bold 30px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLOR.dimText;
    ctx.fillText('FUNDS', CASH_X, CASH_Y - 24);

    ctx.font = 'bold 64px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = COLOR.green;
    ctx.shadowBlur = 12;
    ctx.fillStyle = COLOR.green;
    ctx.fillText(`$${game.cash || 0}`, CASH_X, CASH_Y + 16);
    ctx.shadowBlur = 0;

    ctx.restore();

    // ── READY button ──────────────────────────────────────────────────────
    const isHovered = this._readyHovered;
    ctx.save();

    // Button background
    const rbg = ctx.createLinearGradient(READY_X, READY_Y, READY_X, READY_Y + READY_H);
    if (isHovered) {
      rbg.addColorStop(0, 'rgba(0,60,80,0.98)');
      rbg.addColorStop(1, 'rgba(0,40,60,0.98)');
    } else {
      rbg.addColorStop(0, 'rgba(0,36,52,0.94)');
      rbg.addColorStop(1, 'rgba(0,22,36,0.94)');
    }
    ctx.fillStyle = rbg;
    _roundRect(ctx, READY_X, READY_Y, READY_W, READY_H, 12);
    ctx.fill();

    // Button border with glow
    ctx.save();
    if (isHovered) {
      ctx.shadowColor = COLOR.cyan;
      ctx.shadowBlur = 28;
    }
    ctx.strokeStyle = isHovered ? COLOR.cyan : 'rgba(0,180,220,0.60)';
    ctx.lineWidth = isHovered ? 3 : 2;
    _roundRect(ctx, READY_X, READY_Y, READY_W, READY_H, 12);
    ctx.stroke();
    ctx.restore();

    // Button text
    const readyPulse = 0.85 + 0.15 * Math.sin(Date.now() * 0.004);
    ctx.font = 'bold 56px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isHovered ? COLOR.white : `rgba(0,238,255,${readyPulse.toFixed(2)})`;
    ctx.shadowColor = COLOR.cyan;
    ctx.shadowBlur = isHovered ? 20 : 8;
    ctx.fillText('READY — NEXT WAVE', READY_X + READY_W / 2, READY_Y + READY_H / 2);
    ctx.shadowBlur = 0;

    // Key hint below button
    ctx.font = '22px monospace';
    ctx.fillStyle = COLOR.dimText;
    ctx.fillText('[ENTER] or [SPACE] to deploy', READY_X + READY_W / 2, READY_Y + READY_H + 24);

    ctx.restore();

    // ── Wave info (bottom-right) ────────────────────────────────────────
    ctx.save();
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLOR.dimText;
    ctx.fillText('NEXT:', W - 60, CASH_Y - 24);
    ctx.font = 'bold 52px monospace';
    ctx.fillStyle = '#88CCFF';
    ctx.fillText(`WAVE ${(game.waveNumber || 0) + 1}`, W - 60, CASH_Y + 16);
    ctx.restore();
  }

  // ── Input handlers ──────────────────────────────────────────────────────

  _switchTab(index) {
    if (index === this._activeTab) return;
    this._activeTab = index;
    this._tabFadeT = 0;
    this._hoveredCard = -1;
    this._cardHitAreas = [];
  }

  _handleCardClick(cardIndex, game) {
    const tab = WEAPON_TABS[this._activeTab];
    const weaponConfig = UPGRADE_CONFIG[tab.configKey];
    if (!weaponConfig) return;
    const upgrades = weaponConfig.upgrades;
    if (cardIndex < 0 || cardIndex >= upgrades.length) return;

    const upgradeDef = upgrades[cardIndex];
    const state = this._getCardState(upgradeDef, game);

    if (state !== 'available') return;

    const ok = game.upgradeState.purchase(upgradeDef, game);
    if (ok) {
      this._flashText = `${upgradeDef.name} purchased!`;
      this._flashTimer = 1.5;

      // Immediately apply effects to the matching launcher (live preview)
      if (game.launchers) {
        const launcher = game.launchers.find(l => l.type === tab.key);
        if (launcher) {
          // Build a combined upgradeConfig for this weapon only
          const weaponTypeConfig = { upgrades: weaponConfig.upgrades };
          game.upgradeState.applyToWeapon(launcher, weaponTypeConfig);
        }
      }

      // Shield upgrades: apply bonusCharges directly
      if (tab.key === 'shield') {
        const effects = upgradeDef.effects || [];
        for (const effect of effects) {
          if (effect.stat === 'bonusCharges' && effect.op === 'add') {
            game.shieldCharges = (game.shieldCharges || 0) + effect.value;
          }
        }
      }
    } else {
      this._flashText = `! Not enough funds`;
      this._flashTimer = 1.2;
    }
  }

  _pressReady(game) {
    // Apply all upgrades to all launchers before closing
    if (game.launchers) {
      for (const launcher of game.launchers) {
        const weaponConfigEntry = Object.values(UPGRADE_CONFIG).find(wc => wc.id === launcher.type);
        if (weaponConfigEntry) {
          game.upgradeState.applyToWeapon(launcher, weaponConfigEntry);
        }
      }
    }
    this.close(game);
  }
}

// ── Module-private canvas helpers ─────────────────────────────────────────

/**
 * Trace a rounded rectangle path.
 */
function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/**
 * Draw wrapped text up to maxLines lines.
 */
function _drawWrappedText(ctx, text, x, y, maxW, lineH, maxLines) {
  const words = text.split(' ');
  let line = '';
  let lineCount = 0;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y + lineCount * lineH);
      line = word;
      lineCount++;
      if (lineCount >= maxLines) break;
    } else {
      line = test;
    }
  }
  if (lineCount < maxLines && line) {
    ctx.fillText(line, x, y + lineCount * lineH);
  }
}

/**
 * easeOutBack — slight overshoot for panel slide-in feel.
 * https://easings.net/#easeOutBack
 */
function _easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
