#!/usr/bin/env node
/**
 * Screenshot capture script for seg_f4ult marketing site
 * Captures screenshots from the running app at localhost:5177
 */

const puppeteer = require('puppeteer');
const path = require('path');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

  // Sequencer - bottom center portion
  console.log('Capturing sequencer.png...');
  await page.screenshot({
    path: path.join(outputDir, 'sequencer.png'),
    type: 'png',
    clip: {
      x: 350,
      y: 720,
      width: 900,
      height: 350
    }
  });
  console.log('  ✓ sequencer.png captured');

  // Inspector - left sidebar (now wider at 220px)
  console.log('Capturing inspector.png...');
  await page.screenshot({
    path: path.join(outputDir, 'inspector.png'),
    type: 'png',
    clip: {
      x: 12,
      y: 12,
      width: 220,
      height: 580
    }
  });
  console.log('  ✓ inspector.png captured');

  // Slicer panel - need to click the slicer tab first
  console.log('Opening slicer panel...');
  try {
    // Look for the SLICER button/tab in the sequencer area
    const slicerTab = await page.$('button:has-text("SLICER")');
    if (slicerTab) {
      await slicerTab.click();
      await delay(500);
    }
  } catch (e) {
    console.log('  (Slicer tab not found, capturing current state)');
  }

  console.log('Capturing slicer.png...');
  await page.screenshot({
    path: path.join(outputDir, 'slicer.png'),
    type: 'png',
    clip: {
      x: 350,
      y: 720,
      width: 900,
      height: 350
    }
  });
  console.log('  ✓ slicer.png captured');

  // Clip bin - bottom left corner of canvas area
  console.log('Capturing clipbin.png...');
  await page.screenshot({
    path: path.join(outputDir, 'clipbin.png'),
    type: 'png',
    clip: {
      x: 232,
      y: 400,
      width: 300,
      height: 200
    }
  });
  console.log('  ✓ clipbin.png captured');

  // Presets dropdown - click to open it first
  console.log('Opening presets dropdown...');
  try {
    const presetsBtn = await page.$('button:has-text("Presets")');
    if (presetsBtn) {
      await presetsBtn.click();
      await delay(500);
    }
  } catch (e) {
    console.log('  (Presets button not found)');
  }

  console.log('Capturing presets.png...');
  await page.screenshot({
    path: path.join(outputDir, 'presets.png'),
    type: 'png',
    clip: {
      x: 12,
      y: 50,
      width: 310,
      height: 420
    }
  });
  console.log('  ✓ presets.png captured');

  // Parameters - right side panel
  console.log('Capturing params.png...');
  await page.screenshot({
    path: path.join(outputDir, 'params.png'),
    type: 'png',
    clip: {
      x: 1568,
      y: 12,
      width: 340,
      height: 580
    }
  });
  console.log('  ✓ params.png captured');

  await browser.close();
  console.log('\nAll screenshots captured successfully!');
}

captureScreenshots().catch(err => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
