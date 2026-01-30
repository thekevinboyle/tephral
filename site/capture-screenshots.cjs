#!/usr/bin/env node
/**
 * Screenshot capture script for Tephral marketing site
 * Captures 5 screenshots from the running app at localhost:5177
 */

const puppeteer = require('puppeteer');
const path = require('path');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const SCREENSHOTS = [
  {
    name: 'hero.png',
    description: 'Full app with multiple effects active',
    setup: async (page) => {
      // Wait for app to load
      await page.waitForSelector('canvas', { timeout: 10000 });
      await delay(1000);
      // Full viewport screenshot
    },
    clip: null // Full page
  },
  {
    name: 'sequencer.png',
    description: 'Sequencer panel with tracks',
    setup: async (page) => {
      await delay(500);
    },
    selector: '.flex-1.min-h-0.flex.mx-3' // Bottom section
  },
  {
    name: 'params.png',
    description: 'Expanded parameter panel',
    setup: async (page) => {
      // Click an effect to show params
      const effectButtons = await page.$$('[class*="EffectButton"]');
      if (effectButtons.length > 0) {
        await effectButtons[0].click();
        await delay(500);
      }
    },
    selector: '[class*="ExpandedParameter"]'
  },
  {
    name: 'presets.png',
    description: 'Preset library panel',
    setup: async (page) => {
      await delay(300);
    },
    selector: '[class*="PresetLibrary"]'
  },
  {
    name: 'inspector.png',
    description: 'Inspector panel',
    setup: async (page) => {
      await delay(300);
    },
    selector: '[class*="InfoPanel"]'
  }
];

async function captureScreenshots() {
  console.log('Launching browser...');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Set viewport to 2x for retina quality
  await page.setViewport({
    width: 1920,
    height: 1080,
    deviceScaleFactor: 2
  });

  console.log('Navigating to app...');
  await page.goto('http://localhost:5177', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });

  // Wait for React to render
  await delay(2000);

  const outputDir = path.join(__dirname, 'assets', 'screenshots');

  // Capture hero screenshot (full page)
  console.log('Capturing hero.png...');
  await page.screenshot({
    path: path.join(outputDir, 'hero.png'),
    type: 'png'
  });
  console.log('  ✓ hero.png captured');

  // For the other screenshots, we'll capture the full page and crop specific areas
  // Since the selectors might not match exactly, let's capture specific regions

  // Sequencer - bottom portion of the screen
  console.log('Capturing sequencer.png...');
  await page.screenshot({
    path: path.join(outputDir, 'sequencer.png'),
    type: 'png',
    clip: {
      x: 0,
      y: 680,
      width: 1920,
      height: 400
    }
  });
  console.log('  ✓ sequencer.png captured');

  // Parameters - right side panel
  console.log('Capturing params.png...');
  await page.screenshot({
    path: path.join(outputDir, 'params.png'),
    type: 'png',
    clip: {
      x: 1580,
      y: 0,
      width: 340,
      height: 600
    }
  });
  console.log('  ✓ params.png captured');

  // Presets - left side panel
  console.log('Capturing presets.png...');
  await page.screenshot({
    path: path.join(outputDir, 'presets.png'),
    type: 'png',
    clip: {
      x: 0,
      y: 0,
      width: 280,
      height: 600
    }
  });
  console.log('  ✓ presets.png captured');

  // Inspector - part of left panel (lower section)
  console.log('Capturing inspector.png...');
  await page.screenshot({
    path: path.join(outputDir, 'inspector.png'),
    type: 'png',
    clip: {
      x: 0,
      y: 300,
      width: 280,
      height: 300
    }
  });
  console.log('  ✓ inspector.png captured');

  await browser.close();
  console.log('\nAll screenshots captured successfully!');
}

captureScreenshots().catch(err => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
