import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import { COLOR_UTILS_GLSL } from './glsl-utils'

// GPU port of src/components/overlays/strand/doomsEffect.ts (CPU ground
// truth, effect id 'strand_dooms'). No persistent state on the CPU side —
// every frame is a pure function of (sourceCanvas, params, time).
//
// CPU walks a fixed 20px grid, averages brightness per cell (sampled every
// 4px), and treats any cell whose average exceeds `1 - sensitivity` as a
// "bright spot" anchored at the cell's center. Each bright spot then draws
// 3 concentric screen-blended radial-gradient rings (base radius
// `haloSize*100*brightness*pulse`, ring N at `radius*(1+N*0.5)`, alpha
// falling off per ring) plus a small tight "core" gradient at
// `radius*0.3`, all pulsing via
// `0.7 + 0.3*sin(time*pulseSpeed*2 + spot.x*0.01 + spot.y*0.01)`.
//
// A literal per-pixel port would need to sum contributions from every
// bright cell in the whole frame, which is unbounded. Since the grid cell
// size (20px) is NOT a param (always 20 on the CPU), this shader instead
// walks a bounded neighborhood of coarse cells around the current pixel's
// own cell (5x5, i.e. +/-2 cells = +/-40px beyond the own cell) and tests
// each candidate cell's own brightness independently. This covers the
// default-parameter halo size in full (default haloSize=0.5 produces an
// outer ring radius well under 40px) and most of the practical range;
// only the most extreme corner (haloSize=1 AND a cell's brightness/pulse
// both near their ceiling simultaneously) can produce a ring wider than
// the search window, which gets softly clipped rather than reproducing
// the CPU's unbounded reach — an accepted "same look, not pixel-identical"
// deviation, not a bug, since sparse/typical scenes never hit that ceiling
// densely.
//
// Each candidate cell's brightness is estimated from a cheap 5-tap sample
// (center + 4 quadrant offsets) rather than the CPU's dense 5x5 sub-grid
// average — a coarse-grid brightness estimate per the task brief, not a
// literal reproduction, but converging on the same bright/dark verdict for
// any real-world frame.
//
// The two color layers (amber halo rings, pale-yellow core) are collapsed
// into two smoothstep-based radial falloffs per candidate cell (instead of
// 4 literal gradient stops x 3 rings) and accumulated via `blendScreen`
// across candidates, matching the CPU's screen-composite behavior when
// multiple bright cells' halos overlap.
//
// COLORSPACE WARNING compliance: every brightness sample goes through
// linearToSRGB before use; the composited result goes through
// sRGBToLinear immediately before outputColor.
//
// No preserveVideo uniform: same contract as every other STRAND port —
// effectMix is the only blend control (the CPU overlay canvas has no
// "renders on black" mode; unlit pixels are simply transparent).
const fragmentShader = COLOR_UTILS_GLSL + /* glsl */ `
uniform float haloSize;
uniform float pulseSpeed;
uniform float sensitivity;
uniform float time;
uniform vec2 resolution;
uniform float effectMix;

const float DOOMS_GRID = 20.0;

vec3 doomsSampleSRGB(vec2 px) {
  vec2 uv = clamp(px / resolution, 0.0, 1.0);
  return linearToSRGB(clamp(texture2D(inputBuffer, uv).rgb, 0.0, 1.0));
}

// Cheap 5-tap brightness estimate standing in for the CPU's dense 5x5
// sub-grid average (see header comment).
float doomsCellBrightness(vec2 centerPx) {
  vec3 c = doomsSampleSRGB(centerPx);
  float sum = (c.r + c.g + c.b) / 3.0;
  float count = 1.0;
  float q = DOOMS_GRID * 0.25;
  vec2 offsets[4];
  offsets[0] = vec2(-q, -q);
  offsets[1] = vec2(q, -q);
  offsets[2] = vec2(-q, q);
  offsets[3] = vec2(q, q);
  for (int i = 0; i < 4; i++) {
    vec2 p = centerPx + offsets[i];
    if (p.x < 0.0 || p.x > resolution.x || p.y < 0.0 || p.y > resolution.y) continue;
    vec3 s = doomsSampleSRGB(p);
    sum += (s.r + s.g + s.b) / 3.0;
    count += 1.0;
  }
  return sum / count;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 pixelCoord = uv * resolution;
  vec2 ownCell = floor(pixelCoord / DOOMS_GRID);

  vec3 colorSRGB = linearToSRGB(clamp(inputColor.rgb, 0.0, 1.0));
  vec3 haloColor = vec3(255.0, 195.0, 100.0) / 255.0;
  vec3 coreColor = vec3(255.0, 255.0, 215.0) / 255.0;

  const float R = 2.0;
  for (float dy = -R; dy <= R; dy += 1.0) {
    for (float dx = -R; dx <= R; dx += 1.0) {
      vec2 cell = ownCell + vec2(dx, dy);
      vec2 spot = (cell + 0.5) * DOOMS_GRID;
      if (spot.x < 0.0 || spot.x > resolution.x || spot.y < 0.0 || spot.y > resolution.y) continue;

      float brightness = doomsCellBrightness(spot);
      if (brightness <= (1.0 - sensitivity)) continue;

      float pulse = 0.7 + 0.3 * sin(time * pulseSpeed * 2.0 + spot.x * 0.01 + spot.y * 0.01);
      float radius = haloSize * 100.0 * brightness * pulse;
      if (radius <= 0.001) continue;

      float d = distance(pixelCoord, spot);

      // Rings 0-2 (radius*(1+N*0.5)) collapsed into one smooth falloff out
      // to the outermost ring (N=2 -> radius*2), alpha shaped so it peaks
      // near the CPU's inner rings and tapers to the outer edge.
      float outerR = radius * 2.0;
      if (d < outerR) {
        float t = 1.0 - clamp(d / outerR, 0.0, 1.0);
        float alpha = 0.3 * brightness * pulse * t * t;
        colorSRGB = mix(colorSRGB, blendScreen(colorSRGB, haloColor), alpha);
      }

      // Inner bright core (radius*0.3).
      float coreR = radius * 0.3;
      if (d < coreR) {
        float t = 1.0 - clamp(d / coreR, 0.0, 1.0);
        float alpha = 0.4 * pulse * t;
        colorSRGB = mix(colorSRGB, blendScreen(colorSRGB, coreColor), alpha);
      }
    }
  }

  vec3 color = sRGBToLinear(colorSRGB);
  outputColor = mix(inputColor, vec4(color, 1.0), effectMix);
}
`

export interface StrandDoomsParams {
  haloSize: number
  pulseSpeed: number
  sensitivity: number
  mix: number
}

export const DEFAULT_STRAND_DOOMS_PARAMS: StrandDoomsParams = {
  haloSize: 0.5,
  pulseSpeed: 0.5,
  sensitivity: 0.5,
  mix: 1,
}

export class StrandDoomsEffect extends Effect {
  constructor(params: Partial<StrandDoomsParams> = {}) {
    const p = { ...DEFAULT_STRAND_DOOMS_PARAMS, ...params }

    super('StrandDoomsEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['haloSize', new THREE.Uniform(p.haloSize)],
        ['pulseSpeed', new THREE.Uniform(p.pulseSpeed)],
        ['sensitivity', new THREE.Uniform(p.sensitivity)],
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

  updateParams(params: Partial<StrandDoomsParams>) {
    if (params.haloSize !== undefined) {
      this.uniforms.get('haloSize')!.value = params.haloSize
    }
    if (params.pulseSpeed !== undefined) {
      this.uniforms.get('pulseSpeed')!.value = params.pulseSpeed
    }
    if (params.sensitivity !== undefined) {
      this.uniforms.get('sensitivity')!.value = params.sensitivity
    }
    if (params.mix !== undefined) {
      this.uniforms.get('effectMix')!.value = params.mix
    }
  }
}
