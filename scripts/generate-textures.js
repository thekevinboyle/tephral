/**
 * Texture Generation Script
 *
 * Generates procedural texture images for the texture overlay system.
 * Uses Jimp v1 (pure JavaScript) to create PNG textures at 512x512 resolution.
 *
 * Usage: npm run generate-textures
 * Requires: npm install jimp --save-dev
 */

import { Jimp, JimpMime, intToRGBA, rgbaToInt } from 'jimp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OUTPUT_DIR = join(__dirname, '..', 'public', 'textures');
const SIZE = 512;

/**
 * Random number helper
 */
function random(min = 0, max = 1) {
  return Math.random() * (max - min) + min;
}

/**
 * Create RGBA color value for Jimp
 */
function rgba(r, g, b, a = 255) {
  return rgbaToInt(
    Math.max(0, Math.min(255, Math.round(r))),
    Math.max(0, Math.min(255, Math.round(g))),
    Math.max(0, Math.min(255, Math.round(b))),
    Math.max(0, Math.min(255, Math.round(a)))
  );
}

/**
 * Save image to file
 */
async function saveTexture(image, filename) {
  const filepath = join(OUTPUT_DIR, filename);
  await image.write(filepath);
  console.log(`Generated: ${filename}`);
}

/**
 * Generate fine grain noise texture
 * Subtle random noise for film grain effect
 */
async function generateGrainFine() {
  const image = new Jimp({ width: SIZE, height: SIZE, color: 0x808080FF });

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const noise = Math.floor(random(100, 156));
      image.setPixelColor(rgba(noise, noise, noise, 255), x, y);
    }
  }

  await saveTexture(image, 'grain_fine.png');
}

/**
 * Generate heavy grain noise texture
 * Stronger noise for more pronounced grain effect
 */
async function generateGrainHeavy() {
  const image = new Jimp({ width: SIZE, height: SIZE, color: 0x808080FF });

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const noise = Math.floor(random(0, 256));
      image.setPixelColor(rgba(noise, noise, noise, 255), x, y);
    }
  }

  await saveTexture(image, 'grain_heavy.png');
}

/**
 * Generate dust particle texture
 * Scattered white dots on transparent background
 */
async function generateDust() {
  const image = new Jimp({ width: SIZE, height: SIZE, color: 0x00000000 });

  // Add dust particles
  const particleCount = 200;
  for (let i = 0; i < particleCount; i++) {
    const x = Math.floor(random(0, SIZE));
    const y = Math.floor(random(0, SIZE));
    const opacity = Math.floor(random(77, 204)); // 0.3-0.8 * 255
    const radius = Math.floor(random(1, 3));

    // Draw a small circle
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy <= radius * radius) {
          const px = x + dx;
          const py = y + dy;
          if (px >= 0 && px < SIZE && py >= 0 && py < SIZE) {
            image.setPixelColor(rgba(255, 255, 255, opacity), px, py);
          }
        }
      }
    }
  }

  // Add a few larger dust specs
  for (let i = 0; i < 20; i++) {
    const x = Math.floor(random(0, SIZE));
    const y = Math.floor(random(0, SIZE));
    const opacity = Math.floor(random(51, 128)); // 0.2-0.5 * 255
    const radius = Math.floor(random(2, 5));

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy <= radius * radius) {
          const px = x + dx;
          const py = y + dy;
          if (px >= 0 && px < SIZE && py >= 0 && py < SIZE) {
            image.setPixelColor(rgba(255, 255, 255, opacity), px, py);
          }
        }
      }
    }
  }

  await saveTexture(image, 'dust.png');
}

/**
 * Generate scratches texture
 * Vertical lines simulating film scratches
 */
async function generateScratches() {
  const image = new Jimp({ width: SIZE, height: SIZE, color: 0x00000000 });

  // Add vertical scratches
  const scratchCount = 15;
  for (let i = 0; i < scratchCount; i++) {
    const x = Math.floor(random(0, SIZE));
    const opacity = Math.floor(random(26, 102)); // 0.1-0.4 * 255
    const heightStart = Math.floor(random(0, SIZE * 0.3));
    const heightEnd = Math.floor(random(SIZE * 0.7, SIZE));
    const xOffset = random(-10, 10);

    for (let y = heightStart; y < heightEnd; y++) {
      const currentX = Math.floor(x + (xOffset * (y - heightStart)) / (heightEnd - heightStart));
      if (currentX >= 0 && currentX < SIZE) {
        image.setPixelColor(rgba(255, 255, 255, opacity), currentX, y);
        // Slight width variation
        if (random() < 0.3 && currentX + 1 < SIZE) {
          image.setPixelColor(rgba(255, 255, 255, opacity * 0.5), currentX + 1, y);
        }
      }
    }
  }

  // Add some short horizontal scratches
  for (let i = 0; i < 8; i++) {
    const y = Math.floor(random(0, SIZE));
    const xStart = Math.floor(random(0, SIZE * 0.7));
    const length = Math.floor(random(20, 100));
    const opacity = Math.floor(random(26, 77)); // 0.1-0.3 * 255

    for (let x = xStart; x < xStart + length && x < SIZE; x++) {
      const currentY = Math.floor(y + random(-2, 2));
      if (currentY >= 0 && currentY < SIZE) {
        image.setPixelColor(rgba(255, 255, 255, opacity), x, currentY);
      }
    }
  }

  await saveTexture(image, 'scratches.png');
}

/**
 * Generate vignette texture
 * Radial gradient with dark edges
 */
async function generateVignette() {
  const image = new Jimp({ width: SIZE, height: SIZE, color: 0x000000FF });

  const centerX = SIZE / 2;
  const centerY = SIZE / 2;
  const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const normalizedDist = distance / maxRadius;

      // Create smooth gradient from center to edges
      let brightness;
      if (normalizedDist < 0.3) {
        brightness = 128; // Center: neutral gray
      } else if (normalizedDist < 0.6) {
        // Smooth transition
        const t = (normalizedDist - 0.3) / 0.3;
        brightness = 128 - (t * 40);
      } else {
        // Darker towards edges
        const t = (normalizedDist - 0.6) / 0.4;
        brightness = 88 - (t * 88);
      }

      brightness = Math.max(0, Math.min(255, Math.round(brightness)));
      image.setPixelColor(rgba(brightness, brightness, brightness, 255), x, y);
    }
  }

  await saveTexture(image, 'vignette.png');
}

/**
 * Generate paper texture
 * Subtle noise with warm tint
 */
async function generatePaper() {
  const image = new Jimp({ width: SIZE, height: SIZE, color: 0xE0D8D0FF });

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const baseNoise = random(200, 240);
      const variation = random(-10, 10);

      // Warm tint (slightly more red/yellow)
      const r = Math.min(255, Math.round(baseNoise + variation + 8));
      const g = Math.min(255, Math.round(baseNoise + variation + 4));
      const b = Math.max(0, Math.round(baseNoise + variation - 5));
      image.setPixelColor(rgba(r, g, b, 255), x, y);
    }
  }

  await saveTexture(image, 'paper.png');
}

/**
 * Generate canvas texture
 * Grid pattern simulating canvas weave
 */
async function generateCanvas() {
  const image = new Jimp({ width: SIZE, height: SIZE, color: 0x808080FF });

  const gridSize = 4;

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const gridX = Math.floor(x / gridSize);
      const gridY = Math.floor(y / gridSize);
      const isEven = (gridX + gridY) % 2 === 0;
      const brightness = isEven ? random(115, 135) : random(125, 145);
      const noise = random(-10, 10);

      const finalBrightness = Math.max(0, Math.min(255, Math.round(brightness + noise)));
      image.setPixelColor(rgba(finalBrightness, finalBrightness, finalBrightness, 255), x, y);
    }
  }

  await saveTexture(image, 'canvas.png');
}

/**
 * Generate concrete texture
 * Heavier noise with gray tint
 */
async function generateConcrete() {
  const image = new Jimp({ width: SIZE, height: SIZE, color: 0x808080FF });

  // First pass: base noise
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const noise = random(80, 160);
      const blueVariation = random(-5, 5);

      const r = Math.round(noise);
      const g = Math.round(noise);
      const b = Math.round(noise + blueVariation);
      image.setPixelColor(rgba(r, g, b, 255), x, y);
    }
  }

  // Second pass: add some larger patches
  for (let i = 0; i < 50; i++) {
    const cx = Math.floor(random(0, SIZE));
    const cy = Math.floor(random(0, SIZE));
    const radius = Math.floor(random(10, 40));
    const brightness = Math.floor(random(90, 150));

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy <= radius * radius) {
          const px = cx + dx;
          const py = cy + dy;
          if (px >= 0 && px < SIZE && py >= 0 && py < SIZE) {
            const currentColor = intToRGBA(image.getPixelColor(px, py));
            const blendFactor = 0.3;
            const r = Math.round(currentColor.r * (1 - blendFactor) + brightness * blendFactor);
            const g = Math.round(currentColor.g * (1 - blendFactor) + brightness * blendFactor);
            const b = Math.round(currentColor.b * (1 - blendFactor) + brightness * blendFactor);
            image.setPixelColor(rgba(r, g, b, 255), px, py);
          }
        }
      }
    }
  }

  await saveTexture(image, 'concrete.png');
}

/**
 * Generate watercolor texture
 * Soft noise with variation for watercolor effect
 */
async function generateWatercolor() {
  const image = new Jimp({ width: SIZE, height: SIZE, color: 0xB0B0B0FF });

  // Add soft blobs
  for (let i = 0; i < 100; i++) {
    const cx = Math.floor(random(0, SIZE));
    const cy = Math.floor(random(0, SIZE));
    const radius = Math.floor(random(20, 80));
    const brightness = Math.floor(random(100, 180));
    const maxOpacity = random(0.05, 0.2);

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= radius) {
          const px = cx + dx;
          const py = cy + dy;
          if (px >= 0 && px < SIZE && py >= 0 && py < SIZE) {
            // Radial falloff
            const falloff = 1 - (dist / radius);
            const opacity = maxOpacity * falloff;

            const currentColor = intToRGBA(image.getPixelColor(px, py));
            const r = Math.round(currentColor.r * (1 - opacity) + brightness * opacity);
            const g = Math.round(currentColor.g * (1 - opacity) + brightness * opacity);
            const b = Math.round(currentColor.b * (1 - opacity) + brightness * opacity);
            image.setPixelColor(rgba(r, g, b, 255), px, py);
          }
        }
      }
    }
  }

  // Add fine noise overlay
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const noise = random(-15, 15);
      const currentColor = intToRGBA(image.getPixelColor(x, y));
      const r = Math.max(0, Math.min(255, Math.round(currentColor.r + noise)));
      const g = Math.max(0, Math.min(255, Math.round(currentColor.g + noise)));
      const b = Math.max(0, Math.min(255, Math.round(currentColor.b + noise)));
      image.setPixelColor(rgba(r, g, b, 255), x, y);
    }
  }

  await saveTexture(image, 'watercolor.png');
}

/**
 * Generate VHS noise texture
 * Horizontal bands with noise for VHS/analog effect
 */
async function generateVHSNoise() {
  const image = new Jimp({ width: SIZE, height: SIZE, color: 0x808080FF });

  // Pre-calculate band noise for each row
  const bandNoises = [];
  for (let y = 0; y < SIZE; y++) {
    bandNoises[y] = random(-30, 30);
  }

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const bandNoise = bandNoises[y];
      const pixelNoise = random(-20, 20);
      const baseValue = 128 + bandNoise + pixelNoise;

      // Add occasional bright/dark lines
      const isGlitchLine = random() < 0.02;
      const glitchValue = isGlitchLine ? random(-80, 80) : 0;

      const value = Math.max(0, Math.min(255, Math.round(baseValue + glitchValue)));
      image.setPixelColor(rgba(value, value, value, 255), x, y);
    }
  }

  // Add some horizontal tracking lines
  for (let i = 0; i < 5; i++) {
    const lineY = Math.floor(random(0, SIZE));
    const lineOpacity = random(0.1, 0.3);
    const height = Math.floor(random(1, 4));

    for (let dy = 0; dy < height && lineY + dy < SIZE; dy++) {
      for (let x = 0; x < SIZE; x++) {
        const currentColor = intToRGBA(image.getPixelColor(x, lineY + dy));
        const r = Math.min(255, Math.round(currentColor.r + 255 * lineOpacity));
        const g = Math.min(255, Math.round(currentColor.g + 255 * lineOpacity));
        const b = Math.min(255, Math.round(currentColor.b + 255 * lineOpacity));
        image.setPixelColor(rgba(r, g, b, 255), x, lineY + dy);
      }
    }
  }

  await saveTexture(image, 'vhs_noise.png');
}

// Main execution
async function main() {
  console.log('Generating texture assets...\n');
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log(`Texture size: ${SIZE}x${SIZE}\n`);

  try {
    await generateGrainFine();
    await generateGrainHeavy();
    await generateDust();
    await generateScratches();
    await generateVignette();
    await generatePaper();
    await generateCanvas();
    await generateConcrete();
    await generateWatercolor();
    await generateVHSNoise();

    console.log('\nAll textures generated successfully!');
  } catch (error) {
    console.error('Error generating textures:', error);
    process.exit(1);
  }
}

main();
