import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import { COLOR_UTILS_GLSL } from './glsl-utils'

// GPU port of src/components/overlays/strand/seamEffect.ts (CPU ground
// truth). The CPU version has NO persistent module-level state (unlike
// StrandBeachEffect/StrandVoidoutEffect) — every frame is a pure function of
// (sourceCanvas, width, height, params, time), so this shader is a
// straight-line reproduction of the CPU's per-pixel decisions rather than a
// state-machine reconstruction.
//
// Rift geometry: the CPU clips two canvas paths (`drawSplitSide`) whose
// boundary curves are IDENTICAL in shape on both sides — the same
// `distort = sin(y*0.03 + time*2) * edgeDistort * 15` offset is added to
// both the left-clip curve and the right-clip curve, so the whole rift
// translates left-right as a unit with y rather than the two edges flexing
// independently. leftBoundary/rightBoundary below reproduce that exactly:
// centerX ± (gapWidth/2 + offset) + distort, where gapWidth = riftWidth *
// width * 0.2 and offset = ±(gapWidth/2 + parallaxAmount*20) — since both
// riftWidth and parallaxAmount are non-negative, rightBoundary >=
// leftBoundary always (the gap never inverts).
//
// Each clipped side samples the ENTIRE source canvas shifted by its offset
// (`ctx.drawImage(tempCanvas, offset, 0)`), so a pixel's color = source at
// (pixelX - offset, y). The CPU leaves any sampled coordinate outside
// [0, width) as fully transparent (drawImage draws nothing there, leaving
// the initial `fillRect('#000')` black) — reproduced with an explicit
// range check that falls through to black rather than clamping to the
// texture edge, since clamping would smear the border pixel across the gap
// instead of showing void.
//
// The void gap (between the two boundary curves) starts as opaque black,
// then gets ~50 Math.random()-seeded circular particles per frame
// (screen-blended, purple, size 1-2px, alpha 0.1-0.3) with no persistent
// seed — genuinely fresh random draws every frame, unlike Beach's
// hold-then-reroll cadence. Reproduced as a per-cell hash test re-rolled
// every frame (`floor(time*60.0)` bucket) with per-pixel-cell probability
// derived from the CPU's fixed particle COUNT (50) divided by the current
// gap area, so the expected number of flecks stays ~50 regardless of how
// wide riftWidth/parallaxAmount make the gap — not pixel-identical (CPU
// uses JS Math.random(), this uses a coordinate hash) but same sparse
// flickering character.
//
// The edge glow gradients (`leftGradient`/`rightGradient`) and the dashed
// energy jitter along the rift are BOTH deterministic sin() functions of y
// and time — no randomness at all, despite reading like a "decorative
// jitter" effect. The glow gradients are static 30px-wide vertical bands at
// leftEdgeX/rightEdgeX (NOT wavy — no `distort` term in their x position),
// screen-blended. The jitter rects are drawn every 10px of y (the CPU's
// `for (let y = 0; y < height; y += 10)` loop) with wave = sin(y*0.05 +
// time*3)*edgeDistort*10 and alpha = 0.3 + sin(y*0.1 + time*5)*0.2 — alpha
// animates independently of edgeDistort, so at edgeDistort=0 the jitter
// rects still pulse in place (don't vanish), only their sideways wave
// collapses to zero. Reproduced with the same 10px y-quantization
// (`floor(y/10)*10`) so the shader keeps the CPU's dashed/stepped look
// instead of a smooth continuous stripe.
//
// riftWidth=0 does NOT close the seam to nothing by itself: gapWidth
// becomes 0, but leftOffset/rightOffset still carry the parallaxAmount*20
// term, so a `2*parallaxAmount*20`-wide black slit remains whenever
// parallaxAmount>0 — this falls out of the shared formula automatically,
// no special-casing needed. Only riftWidth=0 AND parallaxAmount=0 together
// collapse leftBoundary==rightBoundary and reconstruct the untouched image
// (edge glow/jitter still render at that single seam line).
//
// No preserveVideo uniform: same contract as every other STRAND port — the
// CPU always writes an opaque frame (black void, or sampled source), never
// a "renders on black" mode; effectMix is the only blend control.
const fragmentShader = COLOR_UTILS_GLSL + /* glsl */ `
uniform float riftWidth;
uniform float parallaxAmount;
uniform float edgeDistort;
uniform float time;
uniform vec2 resolution;
uniform float effectMix;

float seamHash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 pixelCoord = uv * resolution;
  float width = resolution.x;
  float height = resolution.y;
  float centerX = width * 0.5;
  float gapWidth = riftWidth * width * 0.2;

  float leftOffset = -gapWidth * 0.5 - parallaxAmount * 20.0;
  float rightOffset = gapWidth * 0.5 + parallaxAmount * 20.0;

  float distort = sin(pixelCoord.y * 0.03 + time * 2.0) * edgeDistort * 15.0;
  float leftBoundary = centerX - gapWidth * 0.5 + leftOffset + distort;
  float rightBoundary = centerX + gapWidth * 0.5 + rightOffset + distort;

  vec3 color = vec3(0.0);

  if (pixelCoord.x < leftBoundary) {
    float srcX = pixelCoord.x - leftOffset;
    if (srcX >= 0.0 && srcX < width) {
      color = texture2D(inputBuffer, vec2(srcX, pixelCoord.y) / resolution).rgb;
    }
  } else if (pixelCoord.x > rightBoundary) {
    float srcX = pixelCoord.x - rightOffset;
    if (srcX >= 0.0 && srcX < width) {
      color = texture2D(inputBuffer, vec2(srcX, pixelCoord.y) / resolution).rgb;
    }
  }

  // color so far is either linear black (void) or a linear texel sampled
  // straight from inputBuffer. Canvas 2D's 'screen' composite operation
  // (used by every overlay below) is defined on sRGB BYTE values, not
  // scene-linear light — and this pipeline's Effect passes work in linear
  // (confirmed via in-browser probing: a flat 0.5 write reads back as byte
  // 188, the sRGB encode of linear 0.5). So convert once to sRGB here, do
  // all the screen-blend compositing in that space to match the CPU's
  // byte-space math, then convert back to linear immediately before
  // outputColor so the pipeline's own auto-encode reproduces the
  // intended sRGB pixel.
  vec3 colorSRGB = linearToSRGB(clamp(color, 0.0, 1.0));

  if (pixelCoord.x >= leftBoundary && pixelCoord.x <= rightBoundary) {
    // Void gap: sparse flickering particles. CPU seeds them with
    // 'x = centerX - gapWidth/2 + Math.random()*gapWidth', i.e. confined to
    // abs(x - centerX) < gapWidth*0.5 — a FIXED band that does not widen
    // with parallaxAmount, unlike the render region above (which does widen,
    // via leftOffset/rightOffset). Gate the hash test to that fixed band
    // rather than the full boundary-to-boundary span. CPU draws a fixed
    // COUNT (50) per frame at radius 1-2px regardless of band width, so
    // derive a per-cell hit probability from the band's own area
    // (gapWidth*height, not the parallax-widened gap) to keep the expected
    // fleck COUNT constant, then place a small randomly-jittered dot within
    // the hit cell (rather than filling the whole cell) so fleck SIZE also
    // matches the CPU's tiny circles.
    if (abs(pixelCoord.x - centerX) < gapWidth * 0.5) {
      float cellSize = 12.0;
      float prob = clamp(50.0 * cellSize * cellSize / (max(gapWidth, 0.001) * height), 0.0, 1.0);

      vec2 cell = floor(pixelCoord / cellSize);
      float frameBucket = floor(time * 60.0);
      float roll = seamHash(cell + vec2(frameBucket * 13.7, frameBucket * 7.3));
      if (roll < prob) {
        vec2 jitter = vec2(
          seamHash(cell + vec2(3.1, frameBucket)),
          seamHash(cell + vec2(7.9, frameBucket))
        );
        vec2 dotCenter = (cell + jitter) * cellSize;
        float dotRadius = 1.0 + seamHash(cell + vec2(5.3, frameBucket)) * 1.0;
        if (distance(pixelCoord, dotCenter) < dotRadius) {
          float a = 0.1 + seamHash(cell + vec2(1.7, frameBucket)) * 0.2;
          vec3 particleColor = vec3(100.0, 50.0, 150.0) / 255.0;
          colorSRGB = mix(colorSRGB, blendScreen(colorSRGB, particleColor), a);
        }
      }
    }
  }

  // Edge glow gradients: static 30px bands at leftEdgeX/rightEdgeX (no
  // distort term — unlike the split boundaries these do not wave with y).
  float leftEdgeX = centerX - gapWidth * 0.5 + leftOffset;
  float rightEdgeX = centerX + gapWidth * 0.5 + rightOffset;
  vec3 glowColor = vec3(150.0, 100.0, 200.0) / 255.0;

  if (pixelCoord.x > leftEdgeX - 30.0 && pixelCoord.x < leftEdgeX) {
    float t = (pixelCoord.x - (leftEdgeX - 30.0)) / 30.0;
    colorSRGB = mix(colorSRGB, blendScreen(colorSRGB, glowColor), t * 0.4);
  }
  if (pixelCoord.x > rightEdgeX && pixelCoord.x < rightEdgeX + 30.0) {
    float t = 1.0 - (pixelCoord.x - rightEdgeX) / 30.0;
    colorSRGB = mix(colorSRGB, blendScreen(colorSRGB, glowColor), t * 0.4);
  }

  // Animated energy jitter: deterministic sin() dashes every 10px of y,
  // matching the CPU's stepped for (y += 10) loop exactly.
  float yBand = floor(pixelCoord.y / 10.0) * 10.0;
  float wave = sin(yBand * 0.05 + time * 3.0) * edgeDistort * 10.0;
  float jitterAlpha = 0.3 + sin(yBand * 0.1 + time * 5.0) * 0.2;
  vec3 energyColor = vec3(200.0, 150.0, 255.0) / 255.0;

  bool inBand = pixelCoord.y >= yBand && pixelCoord.y < yBand + 5.0;
  float leftJitterX = leftEdgeX + wave - 2.0;
  if (inBand && pixelCoord.x >= leftJitterX && pixelCoord.x < leftJitterX + 4.0) {
    colorSRGB = mix(colorSRGB, blendScreen(colorSRGB, energyColor), jitterAlpha);
  }
  float rightJitterX = rightEdgeX - wave - 2.0;
  if (inBand && pixelCoord.x >= rightJitterX && pixelCoord.x < rightJitterX + 4.0) {
    colorSRGB = mix(colorSRGB, blendScreen(colorSRGB, energyColor), jitterAlpha);
  }

  color = sRGBToLinear(colorSRGB);

  outputColor = mix(inputColor, vec4(color, 1.0), effectMix);
}
`

export interface StrandSeamParams {
  riftWidth: number
  parallaxAmount: number
  edgeDistort: number
  mix: number
}

export const DEFAULT_STRAND_SEAM_PARAMS: StrandSeamParams = {
  riftWidth: 0.05,
  parallaxAmount: 0.1,
  edgeDistort: 0.5,
  mix: 1,
}

export class StrandSeamEffect extends Effect {
  constructor(params: Partial<StrandSeamParams> = {}) {
    const p = { ...DEFAULT_STRAND_SEAM_PARAMS, ...params }

    super('StrandSeamEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['riftWidth', new THREE.Uniform(p.riftWidth)],
        ['parallaxAmount', new THREE.Uniform(p.parallaxAmount)],
        ['edgeDistort', new THREE.Uniform(p.edgeDistort)],
        ['time', new THREE.Uniform(0)],
        ['resolution', new THREE.Uniform(new THREE.Vector2(1920, 1080))],
        ['effectMix', new THREE.Uniform(p.mix)],
      ]),
    })
  }

  update(_renderer: THREE.WebGLRenderer, _inputBuffer: THREE.WebGLRenderTarget, _deltaTime?: number) {
    this.uniforms.get('time')!.value = performance.now() / 1000
  }

  setResolution(width: number, height: number) {
    (this.uniforms.get('resolution')!.value as THREE.Vector2).set(width, height)
  }

  updateParams(params: Partial<StrandSeamParams>) {
    if (params.riftWidth !== undefined) {
      this.uniforms.get('riftWidth')!.value = params.riftWidth
    }
    if (params.parallaxAmount !== undefined) {
      this.uniforms.get('parallaxAmount')!.value = params.parallaxAmount
    }
    if (params.edgeDistort !== undefined) {
      this.uniforms.get('edgeDistort')!.value = params.edgeDistort
    }
    if (params.mix !== undefined) {
      this.uniforms.get('effectMix')!.value = params.mix
    }
  }
}
