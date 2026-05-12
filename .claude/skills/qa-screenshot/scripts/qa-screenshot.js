#!/usr/bin/env node
/**
 * QA Screenshot Tool — reusable Puppeteer script for visual QA.
 *
 * Usage:
 *   node scripts/qa-screenshot.js [options]
 *
 * Options:
 *   --url URL           Game URL (default: http://localhost:8000)
 *   --out DIR           Screenshot output directory (default: /tmp/qa-screenshots)
 *   --duration SECS     How long to play before stopping (default: 30)
 *   --wave-target N     Wait until wave N before stopping (default: 3)
 *   --launcher N        Select launcher N (1-4) at start (default: cycles through all)
 *   --no-start          Don't click to start — screenshot the start screen only
 *   --inject CODE       JS to evaluate in page after start (e.g., force-spawn entities)
 *   --headless BOOL     Run headless (default: true)
 *
 * Screenshots are saved as 001_<label>.png, 002_<label>.png, etc.
 * The script prints the paths of all screenshots to stdout (one per line)
 * so the QA agent can read them with the Read tool.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Parse CLI args
const args = process.argv.slice(2);
function getArg(name, fallback) {
  const idx = args.indexOf('--' + name);
  if (idx === -1) return fallback;
  return args[idx + 1] || fallback;
}
function hasFlag(name) {
  return args.includes('--' + name);
}

const URL = getArg('url', 'http://localhost:8000');
const OUT_DIR = getArg('out', '/tmp/qa-screenshots');
const DURATION = parseInt(getArg('duration', '30'), 10) * 1000;
const WAVE_TARGET = parseInt(getArg('wave-target', '3'), 10);
const LAUNCHER = getArg('launcher', null);
const NO_START = hasFlag('no-start');
const INJECT = getArg('inject', null);
const HEADLESS = getArg('headless', 'true') !== 'false';

// Ensure output directory exists
fs.mkdirSync(OUT_DIR, { recursive: true });
// Clean previous screenshots
for (const f of fs.readdirSync(OUT_DIR)) {
  if (f.endsWith('.png')) fs.unlinkSync(path.join(OUT_DIR, f));
}

let shotIndex = 0;

async function screenshot(page, label) {
  shotIndex++;
  const padded = String(shotIndex).padStart(3, '0');
  const filename = `${padded}_${label}.png`;
  const filepath = path.join(OUT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: false });
  console.log(filepath);
  return filepath;
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  const browser = await puppeteer.launch({
    headless: HEADLESS ? 'new' : false,
    args: ['--window-size=1280,720'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  // Collect console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push(err.message));

  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 10000 });
  await sleep(500);

  // Screenshot start screen
  await screenshot(page, 'start_screen');

  if (NO_START) {
    await browser.close();
    return;
  }

  // Click to start
  await page.mouse.click(640, 360);
  await sleep(1000);
  await screenshot(page, 'game_started');

  // Inject custom JS if provided
  if (INJECT) {
    await page.evaluate(INJECT);
    await sleep(500);
    await screenshot(page, 'after_inject');
  }

  // Cycle through launchers or select specific one
  if (LAUNCHER) {
    await page.keyboard.press(LAUNCHER);
    await sleep(300);
    await screenshot(page, `launcher_${LAUNCHER}`);
  } else {
    for (let i = 1; i <= 4; i++) {
      await page.keyboard.press(String(i));
      await sleep(800);
      await screenshot(page, `launcher_${i}`);
    }
  }

  // Fire some shots with each launcher
  for (let i = 1; i <= 4; i++) {
    await page.keyboard.press(String(i));
    await sleep(200);

    if (i === 4) {
      // Vulkan — hold mouse down for continuous fire
      await page.mouse.move(640, 300);
      await page.mouse.down();
      await sleep(2000);
      await screenshot(page, 'vulkan_firing');
      await page.mouse.up();
      await sleep(500);
      await screenshot(page, 'vulkan_after_fire');
    } else {
      // Click to fire
      for (let s = 0; s < 3; s++) {
        await page.mouse.click(400 + s * 200, 250 + s * 50);
        await sleep(400);
      }
      await screenshot(page, `launcher_${i}_fired`);
    }
  }

  // Let the game run and take periodic screenshots
  const startTime = Date.now();
  let lastWave = 0;

  while (Date.now() - startTime < DURATION) {
    // Check current wave
    const wave = await page.evaluate(() => {
      return window.game ? window.game.waveNumber : 0;
    });

    if (wave > lastWave) {
      lastWave = wave;
      await screenshot(page, `wave_${wave}_start`);
    }

    if (wave >= WAVE_TARGET) {
      await screenshot(page, 'wave_target_reached');
      break;
    }

    // Random launcher selection to exercise different views
    const randLauncher = Math.floor(Math.random() * 4) + 1;
    await page.keyboard.press(String(randLauncher));

    // Fire at random position
    const rx = 200 + Math.random() * 880;
    const ry = 100 + Math.random() * 400;
    await page.mouse.click(rx, ry);

    await sleep(2000);
    await screenshot(page, `gameplay_t${Math.round((Date.now() - startTime) / 1000)}s`);
  }

  // Final state
  await screenshot(page, 'final_state');

  // Get game state dump
  const state = await page.evaluate(() => {
    if (!window.game) return { error: 'no game object' };
    return {
      state: window.game.state,
      score: window.game.score,
      wave: window.game.waveNumber,
      launchersAlive: window.game.launchers
        ? window.game.launchers.filter(l => l.alive).length
        : 'unknown',
      enemyCount: window.game.entities
        ? window.game.entities.getGroup('enemy_missiles').length
        : 'unknown',
    };
  });
  console.log('\n=== GAME STATE ===');
  console.log(JSON.stringify(state, null, 2));

  if (errors.length > 0) {
    console.log('\n=== CONSOLE ERRORS ===');
    errors.forEach(e => console.log(e));
  } else {
    console.log('\n=== NO CONSOLE ERRORS ===');
  }

  console.log(`\n=== DONE: ${shotIndex} screenshot(s) saved to ${OUT_DIR} ===`);
  await browser.close();
}

run().catch(err => {
  console.error('QA script failed:', err.message);
  process.exit(1);
});
