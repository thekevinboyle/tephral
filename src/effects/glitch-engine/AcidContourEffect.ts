import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import { COLOR_UTILS_GLSL } from './glsl-utils'

// GPU port of src/components/overlays/acid/contourEffect.ts (CPU ground
// truth). The CPU version rasterizes marching-squares iso-lines: it builds a
// coarse `brightnessGrid` at `cellSize = max(4, floor(smooth*2+2))` px
// spacing (note: the UI/XYPad/effectParams range for `smooth` is [0,1], so
// `smooth*2+2` never exceeds 4 and `cellSize` is therefore always exactly 4px
// in practice — reproduced via the same formula rather than a hardcoded 4 so
// it stays correct if the range ever widens), optionally box-blurs interior
// grid points (`for (pass = 0; pass < smooth; pass++)`, one weighted 5-point
// stencil pass per iteration — since `smooth` is a fraction in [0,1], this
// loop can only ever execute 0 or 1 times through the real UI, so this port
// implements exactly one optional pass, gated by `smooth > 0`; values of
// `smooth` above 1 are unreachable through the store's clamped controls and
// would under-blur here relative to the CPU's multi-pass loop), then for each
// of `levels-1` thresholds `(level + animOffset) / levels` (level = 1..
// levels-1, animOffset = animate ? (Date.now()*0.001)%1 : 0) walks every grid
// cell's 4 corners and draws marching-squares line segments through fixed
// cell-midpoint edge points (t=0.5, no interpolation — a real CPU
// simplification, not reproduced exactly; see below).
//
// This shader reproduces the same coarse-grid brightness field (bilinearly
// interpolated between the same 4 grid-corner samples used above, instead of
// the CPU's fixed-midpoint edge segments — a closer-to-textbook marching
// squares that still keys off the identical per-cell corner values and
// cellSize, matching "same look" contour density/placement without the CPU's
// midpoint-only wobble) and finds iso-lines via fwidth-based edge detection:
// bandF = brightness*levels - animOffset is a continuous "band coordinate"
// whose integer crossings are exactly the CPU's threshold levels; drawing a
// constant-lineWidthPx-wide antialiased band around each crossing (scaling
// the crossing tolerance by fwidth(bandF) so the screen-space line width
// stays constant regardless of local gradient) reproduces marching-squares
// line rendering at full pixel resolution. Only crossings with nearest
// integer band index in [1, levels-1] are drawn, matching the CPU's `for
// (level = 1; level < levels; level++)` range (the field's own min/max
// boundaries at band index 0 and `levels` are never stroked, on both sides).
//
// COLORSPACE WARNING compliance: every corner brightness sample goes through
// linearToSRGB before use (matching the CPU's byte-space luminance math on
// the composited canvas read), and the final composited result goes through
// sRGBToLinear immediately before outputColor.
const fragmentShader = COLOR_UTILS_GLSL + /* glsl */ `
uniform vec2 resolution;
uniform float levels;
uniform float lineWidthPx;
uniform float cellSize;
uniform float blurEnabled;
uniform float animate;
uniform float time;
uniform float preserveVideo;
uniform float effectMix;

float cornerBrightness(vec2 gridIdx) {
  vec2 px = clamp(gridIdx * cellSize, vec2(0.0), resolution - 1.0);
  vec2 uvS = px / resolution;
  vec3 srgb = linearToSRGB(clamp(texture2D(inputBuffer, uvS).rgb, 0.0, 1.0));
  return luminance(srgb);
}

// Single weighted 5-point stencil pass (self*4 + 4 neighbors)/8, matching
// the CPU's one reachable blur iteration. Applied uniformly including edge
// corners (the CPU skips blur at the outermost grid row/col) — a minor,
// accepted edge-of-canvas deviation within the "same look" parity bar.
float cornerBrightnessBlurred(vec2 gridIdx) {
  float c = cornerBrightness(gridIdx);
  if (blurEnabled < 0.5) return c;
  float up = cornerBrightness(gridIdx + vec2(0.0, -1.0));
  float down = cornerBrightness(gridIdx + vec2(0.0, 1.0));
  float left = cornerBrightness(gridIdx + vec2(-1.0, 0.0));
  float right = cornerBrightness(gridIdx + vec2(1.0, 0.0));
  return (up + down + left + right + c * 4.0) / 8.0;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 pixelCoord = uv * resolution;
  vec2 cellIdx = floor(pixelCoord / cellSize);
  vec2 t = fract(pixelCoord / cellSize);

  float tl = cornerBrightnessBlurred(cellIdx);
  float tr = cornerBrightnessBlurred(cellIdx + vec2(1.0, 0.0));
  float bl = cornerBrightnessBlurred(cellIdx + vec2(0.0, 1.0));
  float br = cornerBrightnessBlurred(cellIdx + vec2(1.0, 1.0));

  float top = mix(tl, tr, t.x);
  float bottom = mix(bl, br, t.x);
  float brightness = mix(top, bottom, t.y);

  float animOffset = animate > 0.5 ? mod(time, 1.0) : 0.0;
  float bandF = brightness * levels - animOffset;
  float nearest = floor(bandF + 0.5);
  float d = abs(bandF - nearest);

  float w = max(fwidth(bandF), 1.0e-5);
  float halfWidthBand = 0.5 * lineWidthPx * w;
  float coverage = 1.0 - smoothstep(halfWidthBand - w * 0.5, halfWidthBand + w * 0.5, d);
  if (nearest < 1.0 || nearest > levels - 1.0) coverage = 0.0;

  vec3 bg = preserveVideo > 0.5 ? linearToSRGB(clamp(inputColor.rgb, 0.0, 1.0)) : vec3(0.0);
  vec3 colorSRGB = mix(bg, vec3(1.0), coverage);

  vec3 result = sRGBToLinear(colorSRGB);
  outputColor = mix(inputColor, vec4(result, 1.0), effectMix);
}
`

export interface AcidContourParams {
  levels: number
  lineWidth: number
  smooth: number
  animate: boolean
  preserveVideo: boolean
  mix: number
}

export const DEFAULT_ACID_CONTOUR_PARAMS: AcidContourParams = {
  levels: 8,
  lineWidth: 1,
  smooth: 0.5,
  animate: false,
  preserveVideo: false,
  mix: 1,
}

// Matches contourEffect.ts's `Math.max(4, Math.floor(smooth * 2 + 2))`
// exactly.
function computeCellSize(smooth: number): number {
  return Math.max(4, Math.floor(smooth * 2 + 2))
}

export class AcidContourEffect extends Effect {
  constructor(params: Partial<AcidContourParams> = {}) {
    const p = { ...DEFAULT_ACID_CONTOUR_PARAMS, ...params }

    super('AcidContourEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['resolution', new THREE.Uniform(new THREE.Vector2(1920, 1080))],
        ['levels', new THREE.Uniform(p.levels)],
        ['lineWidthPx', new THREE.Uniform(p.lineWidth)],
        ['cellSize', new THREE.Uniform(computeCellSize(p.smooth))],
        ['blurEnabled', new THREE.Uniform(p.smooth > 0 ? 1 : 0)],
        ['animate', new THREE.Uniform(p.animate ? 1 : 0)],
        ['time', new THREE.Uniform(0)],
        ['preserveVideo', new THREE.Uniform(p.preserveVideo ? 1 : 0)],
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

  updateParams(params: Partial<AcidContourParams>) {
    if (params.levels !== undefined) {
      this.uniforms.get('levels')!.value = params.levels
    }
    if (params.lineWidth !== undefined) {
      this.uniforms.get('lineWidthPx')!.value = params.lineWidth
    }
    if (params.smooth !== undefined) {
      this.uniforms.get('cellSize')!.value = computeCellSize(params.smooth)
      this.uniforms.get('blurEnabled')!.value = params.smooth > 0 ? 1 : 0
    }
    if (params.animate !== undefined) {
      this.uniforms.get('animate')!.value = params.animate ? 1 : 0
    }
    if (params.preserveVideo !== undefined) {
      this.uniforms.get('preserveVideo')!.value = params.preserveVideo ? 1 : 0
    }
    if (params.mix !== undefined) {
      this.uniforms.get('effectMix')!.value = params.mix
    }
  }
}
