#!/usr/bin/env node
/**
 * Screenshot capture script for seg_f4ult marketing site
 * Captures screenshots from the running app at localhost:5173
 * Uses headed mode for WebGL rendering
 */

const puppeteer = require('puppeteer');
const path = require('path');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const PORT = process.env.PORT || 5173;
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

  // 1. HERO — Full interface screenshot
  console.log('Capturing hero.png...');
  await page.screenshot({
    path: path.join(outputDir, 'hero.png'),
    type: 'png'
  });
  console.log('  + hero.png');

  // 2. EFFECT GRID — Left column
  console.log('Capturing effect-grid.png...');
  await page.screenshot({
    path: path.join(outputDir, 'effect-grid.png'),
    type: 'png',
    clip: { x: 0, y: 0, width: 480, height: 700 }
  });
  console.log('  + effect-grid.png');

  // 3. PARAMETER PANEL — Right column
  console.log('Capturing params.png...');
  await page.screenshot({
    path: path.join(outputDir, 'params.png'),
    type: 'png',
    clip: { x: 1560, y: 0, width: 360, height: 700 }
  });
  console.log('  + params.png');

  // 4. SEQUENCER — Bottom area
  console.log('Capturing sequencer.png...');
  await page.screenshot({
    path: path.join(outputDir, 'sequencer.png'),
    type: 'png',
    clip: { x: 0, y: 700, width: 1920, height: 380 }
  });
  console.log('  + sequencer.png');

  // 5. CANVAS — Center viewport
  console.log('Capturing canvas.png...');
  await page.screenshot({
    path: path.join(outputDir, 'canvas.png'),
    type: 'png',
    clip: { x: 480, y: 0, width: 1080, height: 700 }
  });
  console.log('  + canvas.png');

  await browser.close();
  console.log('\nAll screenshots captured!');
  console.log(`Output: ${outputDir}/`);
}

captureScreenshots().catch(err => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
