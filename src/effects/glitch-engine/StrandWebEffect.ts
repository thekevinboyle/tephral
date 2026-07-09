import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import { COLOR_UTILS_GLSL } from './glsl-utils'

// GPU port of src/components/overlays/strand/strandWebEffect.ts (CPU
// ground truth, effect id 'strand_web'). No persistent state on the CPU
// side — every frame is a pure function of (sourceCanvas, params, time).
//
// CPU pipeline: scan a 20px grid, find the single brightest pixel in each
// cell above `threshold`, then for every bright point sort ALL other
// bright points by distance and connect to the nearest `maxConnections` of
// them (capped at 200px), drawing a screen-blended gradient line with a
// traveling bright particle riding along it, plus a small filled circle at
// each bright point.
//
// This is the hardest of the three: "sort all points by distance and
// connect the globally-nearest N" has no bounded per-pixel formulation —
// it requires knowing the full point set. Per the task brief's explicit
// guidance, this port trades the CPU's fine 20px/global-nearest-N search
// for a coarse FIXED 24x14 cell grid (independent of canvas resolution)
// where each pixel only considers its own cell and its 8 immediate
// neighbors (bounded: 9 cells' worth of brightness estimate and up to 8
// candidate segments per pixel, never the full point set). This changes
// which points connect to which (immediate coarse-grid neighbors instead
// of true nearest-by-distance among a much finer point set) but preserves
// the CPU's actual visual character — sparse glowing filaments linking
// bright facial/image features — which is the stated parity bar ("density
// matters more than exact endpoints").
//
// Each cell's "brightest point" is estimated from a 3-tap probe (a base
// tap plus two hash-jittered offset taps within the cell, keeping the
// point position stable across frames since the hash is seeded by cell
// index only, not time) rather than the CPU's exhaustive per-pixel scan of
// the whole cell.
//
// `maxConnections` (CPU: caps the globally-sorted connection list) is
// reproduced as a per-cell running counter over the 8 fixed neighbor
// directions (raster order) — once a cell's neighbor loop has "spent" its
// budget, further neighbor directions draw nothing. Not distance-sorted
// (there is no meaningful distance ordering among 8 roughly-equidistant
// immediate neighbors), but it does correctly throttle a cell's
// connectivity fan-out as the CPU's cap does. maxConnections >= 8 has no
// effect (never enough neighbor directions to hit the cap), same as the
// CPU where a low local point density makes the cap rarely binding.
//
// The traveling light particle is reproduced as a moving highlight band
// along each segment's parametric `t` (`pulsePhase` seeded by the segment
// endpoints so different segments travel out of phase, matching the CPU's
// per-point `i * 0.5` phase offset in spirit).
//
// COLORSPACE WARNING compliance: every brightness sample goes through
// linearToSRGB before use; the composited result goes through
// sRGBToLinear immediately before outputColor.
//
// No preserveVideo uniform: same contract as every other STRAND port —
// effectMix is the only blend control.
const fragmentShader = COLOR_UTILS_GLSL + /* glsl */ `
uniform float threshold;
uniform float maxConnections;
uniform float glowIntensity;
uniform float time;
uniform vec2 resolution;
uniform float effectMix;

const float WEB_GRID_W = 24.0;
const float WEB_GRID_H = 14.0;

float webHash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
}

vec2 webHash2(vec2 p) {
  return vec2(webHash(p), webHash(p + vec2(31.7, 7.2)));
}

vec3 webSampleSRGB(vec2 px) {
  vec2 uv = clamp(px / resolution, 0.0, 1.0);
  return linearToSRGB(clamp(texture2D(inputBuffer, uv).rgb, 0.0, 1.0));
}

// Estimates a cell's brightest point via a 3-tap probe: a jittered base
// position plus two further hash-offset candidates, keeping whichever
// samples brightest — a cheap stand-in for the CPU's exhaustive per-pixel
// cell scan (see header comment).
bool webCellBright(vec2 cellIdx, vec2 cellSizePx, out vec2 pointPx, out float brightness) {
  vec2 j0 = webHash2(cellIdx + vec2(0.5, 0.5));
  vec2 base = (cellIdx + vec2(0.2, 0.2) + j0 * 0.6) * cellSizePx;
  vec3 cA = webSampleSRGB(base);
  float bA = (cA.r + cA.g + cA.b) / 3.0;

  vec2 j1 = webHash2(cellIdx + vec2(3.1, 1.7)) - 0.5;
  vec2 offB = base + j1 * cellSizePx * 0.5;
  vec3 cB = webSampleSRGB(offB);
  float bB = (cB.r + cB.g + cB.b) / 3.0;

  vec2 j2 = webHash2(cellIdx + vec2(9.3, 5.1)) - 0.5;
  vec2 offC = base + j2 * cellSizePx * 0.5;
  vec3 cC = webSampleSRGB(offC);
  float bC = (cC.r + cC.g + cC.b) / 3.0;

  pointPx = base;
  brightness = bA;
  if (bB > brightness) { brightness = bB; pointPx = offB; }
  if (bC > brightness) { brightness = bC; pointPx = offC; }

  return brightness > threshold;
}

float webSegDist(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-5), 0.0, 1.0);
  return length(pa - ba * h);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 pixelCoord = uv * resolution;
  vec2 cellSizePx = resolution / vec2(WEB_GRID_W, WEB_GRID_H);
  vec2 ownCell = floor(pixelCoord / cellSizePx);

  vec3 colorSRGB = linearToSRGB(clamp(inputColor.rgb, 0.0, 1.0));

  vec2 ownPoint;
  float ownBrightness;
  bool ownBright = webCellBright(ownCell, cellSizePx, ownPoint, ownBrightness);

  if (ownBright) {
    vec3 cyan = vec3(0.0, 212.0, 255.0) / 255.0;
    vec3 hot = vec3(200.0, 255.0, 255.0) / 255.0;

    float connCount = 0.0;
    for (float dy = -1.0; dy <= 1.0; dy += 1.0) {
      for (float dx = -1.0; dx <= 1.0; dx += 1.0) {
        if (dx == 0.0 && dy == 0.0) continue;
        if (connCount >= maxConnections) continue;

        vec2 nCell = ownCell + vec2(dx, dy);
        if (nCell.x < 0.0 || nCell.x >= WEB_GRID_W || nCell.y < 0.0 || nCell.y >= WEB_GRID_H) continue;

        vec2 nPoint;
        float nBrightness;
        bool nBright = webCellBright(nCell, cellSizePx, nPoint, nBrightness);
        if (!nBright) continue;
        connCount += 1.0;

        float segLen = distance(ownPoint, nPoint);
        if (segLen < 1.0 || segLen > 260.0) continue;

        float d = webSegDist(pixelCoord, ownPoint, nPoint);
        float lineHalfWidth = (1.0 + glowIntensity) * 0.5;
        float coverage = 1.0 - smoothstep(lineHalfWidth, lineHalfWidth + 1.25, d);
        if (coverage <= 0.0) continue;

        float t = clamp(dot(pixelCoord - ownPoint, nPoint - ownPoint) / (segLen * segLen), 0.0, 1.0);
        float phaseSeed = webHash(ownCell + nCell * 0.37);
        float pulsePhase = fract(time * 0.6 + phaseSeed);
        float travel = 1.0 - smoothstep(0.0, 0.15, abs(t - pulsePhase));

        vec3 lineColor = mix(cyan, hot, travel);
        float baseAlpha = glowIntensity * 0.3;
        float alpha = mix(baseAlpha, glowIntensity * 0.8, travel) * coverage;
        colorSRGB = mix(colorSRGB, blendScreen(colorSRGB, lineColor), alpha);
      }
    }

    float pointRadius = 3.0 + glowIntensity * 2.0;
    float pd = distance(pixelCoord, ownPoint);
    float pointCoverage = 1.0 - smoothstep(pointRadius - 1.0, pointRadius + 1.0, pd);
    if (pointCoverage > 0.0) {
      float a = glowIntensity * ownBrightness * pointCoverage;
      colorSRGB = mix(colorSRGB, blendScreen(colorSRGB, cyan), a);
    }
  }

  vec3 color = sRGBToLinear(colorSRGB);
  outputColor = mix(inputColor, vec4(color, 1.0), effectMix);
}
`

export interface StrandWebGpuParams {
  threshold: number
  maxConnections: number
  glowIntensity: number
  mix: number
}

export const DEFAULT_STRAND_WEB_GPU_PARAMS: StrandWebGpuParams = {
  threshold: 0.6,
  maxConnections: 5,
  glowIntensity: 0.8,
  mix: 1,
}

export class StrandWebEffect extends Effect {
  constructor(params: Partial<StrandWebGpuParams> = {}) {
    const p = { ...DEFAULT_STRAND_WEB_GPU_PARAMS, ...params }

    super('StrandWebEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['threshold', new THREE.Uniform(p.threshold)],
        ['maxConnections', new THREE.Uniform(p.maxConnections)],
        ['glowIntensity', new THREE.Uniform(p.glowIntensity)],
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

  updateParams(params: Partial<StrandWebGpuParams>) {
    if (params.threshold !== undefined) {
      this.uniforms.get('threshold')!.value = params.threshold
    }
    if (params.maxConnections !== undefined) {
      this.uniforms.get('maxConnections')!.value = params.maxConnections
    }
    if (params.glowIntensity !== undefined) {
      this.uniforms.get('glowIntensity')!.value = params.glowIntensity
    }
    if (params.mix !== undefined) {
      this.uniforms.get('effectMix')!.value = params.mix
    }
  }
}
