#!/usr/bin/env node
/**
 * Screenshot capture script for seg_f4ult marketing site
 * Captures screenshots from the running app
 * Uses headed mode for WebGL rendering
 * Activates effects via simulated pointer events
 */

const puppeteer = require('puppeteer');
const path = require('path');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const PORT = process.env.PORT || 5174;
const BASE_URL = `http://localhost:${PORT}`;

async function captureScreenshots() {
  console.log('Launching browser (headed for WebGL)...');

  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--enable-webgl',
      '--window-size=1920,1080',
    ]
  });

  const page = await browser.newPage();

  await page.setViewport({
    width: 1920,
    height: 1080,
    deviceScaleFactor: 2
  });

  console.log(`Navigating to ${BASE_URL}...`);
  await page.goto(BASE_URL, {
    waitUntil: 'networkidle2',
    timeout: 30000
  });

  // Wait for React to render + WebGL init
  await delay(4000);

  const outputDir = path.join(__dirname, 'assets', 'screenshots');
  const gridRoot = '.grid-substrate';

  // --- Activate effects via pointer events on grid cells ---
  // EffectButton uses onPointerDown/onPointerUp (quick tap < 200ms = toggle)
  async function tapEffect(effectName) {
    const tapped = await page.evaluate((name) => {
      // Find text spans inside the grid that match the effect name
      const spans = document.querySelectorAll('span');
      for (const span of spans) {
        if (span.textContent?.trim() === name && span.closest('.grid-cols-4')) {
          // Get the root div of the EffectButton (the pointer event target)
          const button = span.closest('[class*="rounded-sm"][class*="select-none"]');
          if (!button) continue;

          const rect = button.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;

          // Simulate pointerdown
          button.dispatchEvent(new PointerEvent('pointerdown', {
            bubbles: true, clientX: cx, clientY: cy, pointerId: 1, pointerType: 'mouse',
          }));

          // Simulate pointerup after short delay (must be < 200ms for tap)
          setTimeout(() => {
            button.dispatchEvent(new PointerEvent('pointerup', {
              bubbles: true, clientX: cx, clientY: cy, pointerId: 1, pointerType: 'mouse',
            }));
          }, 50);

          return true;
        }
      }
      return false;
    }, effectName);

    if (tapped) {
      await delay(200);
      console.log(`  Tapped: ${effectName}`);
    }
    return tapped;
  }

  // Switch effect page by tapping a tab
  async function switchPage(pageName) {
    const switched = await page.evaluate((name) => {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent?.trim() === name) {
          btn.click();
          return true;
        }
      }
      return false;
    }, pageName);
    if (switched) {
      await delay(300);
      console.log(`  Switched to: ${pageName}`);
    }
    return switched;
  }

  console.log('Activating ACID effects...');
  for (const name of ['DOTS', 'GLYPH', 'CONTOUR', 'MIRROR', 'SLIT', 'VORONOI', 'SCAN']) {
    await tapEffect(name);
  }
  await delay(500);

  // Helper: capture a grid child element
  async function captureGridArea(name, selector) {
    console.log(`Capturing ${name}...`);
    const el = await page.$(selector);
    if (el) {
      await el.screenshot({ path: path.join(outputDir, name), type: 'png' });
      console.log(`  + ${name}`);
      return true;
    }
    console.log(`  ! ${name} — selector not found: ${selector}`);
    return false;
  }

  // 1. HERO — Full interface screenshot with effects active
  console.log('Capturing hero.png...');
  await page.screenshot({
    path: path.join(outputDir, 'hero.png'),
    type: 'png'
  });
  console.log('  + hero.png');

  // Col 2: Effect card stack + perf grid
  await captureGridArea('effect-grid.png', `${gridRoot} > div:nth-child(3)`);

  // Col 3: Sequencer
  await captureGridArea('sequencer.png', `${gridRoot} > div:nth-child(4)`);

  // Col 4: Canvas area
  await captureGridArea('canvas.png', `${gridRoot} > div:nth-child(6)`);

  // Bottom panel
  await captureGridArea('bottom-panel.png', `${gridRoot} > div:nth-child(5)`);

  // --- GLITCH page ---
  console.log('\nSwitching to GLITCH...');
  await switchPage('GLITCH');
  for (const name of ['RGB', 'BLOCK', 'VHS', 'FEEDBACK', 'ASCII']) {
    await tapEffect(name);
  }
  await delay(500);

  console.log('Capturing hero-glitch.png...');
  await page.screenshot({
    path: path.join(outputDir, 'hero-glitch.png'),
    type: 'png'
  });
  console.log('  + hero-glitch.png');

  // --- STRAND page ---
  console.log('\nSwitching to STRAND...');
  await switchPage('STRAND');
  for (const name of ['HANDS', 'VOID OUT', 'WEB', 'CHIRAL']) {
    await tapEffect(name);
  }
  await delay(500);

  console.log('Capturing hero-strand.png...');
  await page.screenshot({
    path: path.join(outputDir, 'hero-strand.png'),
    type: 'png'
  });
  console.log('  + hero-strand.png');

  await browser.close();
  console.log('\nAll screenshots captured!');
  console.log(`Output: ${outputDir}/`);
}

captureScreenshots().catch(err => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
