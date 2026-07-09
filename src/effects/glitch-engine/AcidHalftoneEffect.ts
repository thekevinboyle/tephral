import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import { COLOR_UTILS_GLSL } from './glsl-utils'

// GPU port of src/components/overlays/acid/halftoneEffect.ts (CPU ground
// truth). The CPU version is procedural-by-construction: it walks a
// ROTATED grid of dot centers (spacing = dotSize, rotated by `angle`
// degrees about the canvas center) and, per center, samples the source
// pixel AT that center to derive a dot radius (brightness -> contrast
// curve -> radius), then fills a circle there. This shader inverts that:
// for each destination pixel, it re-derives which rotated-grid cell the
// pixel falls in, finds that cell's dot center (same round-to-nearest the
// CPU's `step` loop produces, modulo an irrelevant global phase offset —
// the CPU's grid walk starts at -diagonal rather than at a canvas-relative
// origin, but an infinite repeating dot lattice looks identical under any
// phase, so "nearest multiple of dotSize in grid-local space" reproduces
// the same spacing/orientation/density without hunting for the CPU's
// exact phase), samples the source AT that reconstructed center, and
// tests whether the current pixel falls inside the resulting dot radius.
//
// colorMode has three CPU paths, each with its own multi-pass compositing
// order that this shader reproduces in sequence rather than as a single
// pass:
// - mono: ONE rotated grid at `angle`, luma-driven radius, solid opaque
//   white fill (`ctx.fillStyle = '#fff'`, default source-over) — pixels
//   outside every dot's radius show whatever is already drawn (the
//   preserveVideo-controlled background), so this is a genuine coverage
//   mix, not a full-frame overwrite.
// - cmyk: FOUR independent rotated grids (one per C/M/Y/K channel, each at
//   its own traditional screen angle: c=15, m=75, y=0, k=45), composited
//   with `globalCompositeOperation = 'multiply'` at fixed per-channel
//   alphas (c/m/y=0.7, k=0.9) IN ORDER c -> m -> y -> k, each channel's
//   radius driven by that channel's own inverted-ink value (c = 1-R,
//   m = 1-G, y = 1-B, k = 1-max(R,G,B)) sampled at ITS OWN grid's dot
//   center (not the mono grid's).
// - rgb: THREE independent rotated grids (r=15, g=75, b=45), composited
//   with `globalCompositeOperation = 'screen'` at fixed alpha 0.8, radius
//   driven by the raw (non-inverted) channel value, in order r -> g -> b.
//
// COLORSPACE WARNING compliance: every brightness/channel value used to
// pick a dot radius, and every multiply/screen blend, must operate on the
// CPU's sRGB BYTE space, not this pipeline's linear light — sample ->
// linearToSRGB -> do all the CPU's math in sRGB -> mix -> sRGBToLinear
// right before outputColor.
const fragmentShader = COLOR_UTILS_GLSL + /* glsl */ `
uniform float dotSize;
uniform float angleDeg;
uniform float colorModeF; // 0 = mono, 1 = cmyk, 2 = rgb
uniform float contrast;
uniform vec2 resolution;
uniform float preserveVideo;
uniform float effectMix;

vec3 sampleSRGB(vec2 screenPx) {
  vec2 uvS = screenPx / resolution;
  return linearToSRGB(clamp(texture2D(inputBuffer, uvS).rgb, 0.0, 1.0));
}

// Finds the rotated-grid dot center nearest to pixelCoord (grid spacing =
// size, rotated by angleDeg about canvasCenter — same construction as the
// CPU's x = gx*cos - gy*sin + cx; y = gx*sin + gy*cos + cy walk), samples
// the source there, derives a value for channelSel, and returns the
// dot's coverage (1 inside its brightness-derived radius, 0 outside, with
// a ~1.5px soft edge for antialiasing in place of the CPU's unantialiased
// canvas arc fill).
// channelSel: 0=mono luma, 1=c, 2=m, 3=y, 4=k, 5=r, 6=g, 7=b
float dotCoverage(vec2 pixelCoord, vec2 canvasCenter, float angleD, float size, float channelSel) {
  float rad = radians(angleD);
  float cosA = cos(rad);
  float sinA = sin(rad);
  vec2 rel = pixelCoord - canvasCenter;
  // Inverse of the CPU's forward rotation (rotation matrices are
  // orthonormal, so the inverse is the transpose).
  vec2 gridLocal = vec2(rel.x * cosA + rel.y * sinA, -rel.x * sinA + rel.y * cosA);
  vec2 cellLocal = floor(gridLocal / size + 0.5) * size;
  vec2 dotScreen = canvasCenter + vec2(
    cellLocal.x * cosA - cellLocal.y * sinA,
    cellLocal.x * sinA + cellLocal.y * cosA
  );

  vec2 uvDot = dotScreen / resolution;
  float value = 0.0;
  if (uvDot.x >= 0.0 && uvDot.x < 1.0 && uvDot.y >= 0.0 && uvDot.y < 1.0) {
    vec3 s = sampleSRGB(dotScreen);
    if (channelSel < 0.5) value = luminance(s);
    else if (channelSel < 1.5) value = 1.0 - s.r;
    else if (channelSel < 2.5) value = 1.0 - s.g;
    else if (channelSel < 3.5) value = 1.0 - s.b;
    else if (channelSel < 4.5) value = 1.0 - max(max(s.r, s.g), s.b);
    else if (channelSel < 5.5) value = s.r;
    else if (channelSel < 6.5) value = s.g;
    else value = s.b;
  }

  float adjusted = pow(clamp(value, 0.0, 1.0), 1.0 / max(contrast, 0.05));
  float radius = adjusted * size * 0.5;
  float d = distance(pixelCoord, dotScreen);
  return 1.0 - smoothstep(max(radius - 0.75, 0.0), radius + 0.75, d);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 pixelCoord = uv * resolution;
  vec2 canvasCenter = resolution * 0.5;

  vec3 bg = preserveVideo > 0.5 ? linearToSRGB(clamp(inputColor.rgb, 0.0, 1.0)) : vec3(0.0);
  vec3 colorSRGB = bg;

  if (colorModeF < 0.5) {
    // mono: single rotated grid, solid opaque white fill (coverage acts as
    // a hard replace, matching the CPU's non-blended fillStyle draw).
    float cov = dotCoverage(pixelCoord, canvasCenter, angleDeg, dotSize, 0.0);
    colorSRGB = mix(colorSRGB, vec3(1.0), cov);
  } else if (colorModeF < 1.5) {
    // cmyk: four independent grids, multiply-composited in c -> m -> y -> k
    // order at fixed per-channel alphas.
    float covC = dotCoverage(pixelCoord, canvasCenter, 15.0, dotSize, 1.0);
    colorSRGB = mix(colorSRGB, colorSRGB * vec3(0.0, 1.0, 1.0), covC * 0.7);
    float covM = dotCoverage(pixelCoord, canvasCenter, 75.0, dotSize, 2.0);
    colorSRGB = mix(colorSRGB, colorSRGB * vec3(1.0, 0.0, 1.0), covM * 0.7);
    float covY = dotCoverage(pixelCoord, canvasCenter, 0.0, dotSize, 3.0);
    colorSRGB = mix(colorSRGB, colorSRGB * vec3(1.0, 1.0, 0.0), covY * 0.7);
    float covK = dotCoverage(pixelCoord, canvasCenter, 45.0, dotSize, 4.0);
    colorSRGB = mix(colorSRGB, colorSRGB * vec3(0.0, 0.0, 0.0), covK * 0.9);
  } else {
    // rgb: three independent grids, screen-composited in r -> g -> b order
    // at fixed alpha 0.8.
    float covR = dotCoverage(pixelCoord, canvasCenter, 15.0, dotSize, 5.0);
    colorSRGB = mix(colorSRGB, blendScreen(colorSRGB, vec3(1.0, 0.0, 0.0)), covR * 0.8);
    float covG = dotCoverage(pixelCoord, canvasCenter, 75.0, dotSize, 6.0);
    colorSRGB = mix(colorSRGB, blendScreen(colorSRGB, vec3(0.0, 1.0, 0.0)), covG * 0.8);
    float covB = dotCoverage(pixelCoord, canvasCenter, 45.0, dotSize, 7.0);
    colorSRGB = mix(colorSRGB, blendScreen(colorSRGB, vec3(0.0, 0.0, 1.0)), covB * 0.8);
  }

  vec3 result = sRGBToLinear(colorSRGB);
  outputColor = mix(inputColor, vec4(result, 1.0), effectMix);
}
`

export interface AcidHalftoneParams {
  dotSize: number
  angle: number
  colorMode: 'mono' | 'cmyk' | 'rgb'
  contrast: number
  preserveVideo: boolean
  mix: number
}

export const DEFAULT_ACID_HALFTONE_PARAMS: AcidHalftoneParams = {
  dotSize: 8,
  angle: 45,
  colorMode: 'mono',
  contrast: 1.0,
  preserveVideo: false,
  mix: 1,
}

function colorModeToFloat(mode: AcidHalftoneParams['colorMode']): number {
  if (mode === 'cmyk') return 1
  if (mode === 'rgb') return 2
  return 0
}

export class AcidHalftoneEffect extends Effect {
  constructor(params: Partial<AcidHalftoneParams> = {}) {
    const p = { ...DEFAULT_ACID_HALFTONE_PARAMS, ...params }

    super('AcidHalftoneEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['dotSize', new THREE.Uniform(p.dotSize)],
        ['angleDeg', new THREE.Uniform(p.angle)],
        ['colorModeF', new THREE.Uniform(colorModeToFloat(p.colorMode))],
        ['contrast', new THREE.Uniform(p.contrast)],
        ['resolution', new THREE.Uniform(new THREE.Vector2(1920, 1080))],
        ['preserveVideo', new THREE.Uniform(p.preserveVideo ? 1 : 0)],
        ['effectMix', new THREE.Uniform(p.mix)],
      ]),
    })
  }

  setResolution(width: number, height: number) {
    (this.uniforms.get('resolution')!.value as THREE.Vector2).set(width, height)
  }

  updateParams(params: Partial<AcidHalftoneParams>) {
    if (params.dotSize !== undefined) {
      this.uniforms.get('dotSize')!.value = params.dotSize
    }
    if (params.angle !== undefined) {
      this.uniforms.get('angleDeg')!.value = params.angle
    }
    if (params.colorMode !== undefined) {
      this.uniforms.get('colorModeF')!.value = colorModeToFloat(params.colorMode)
    }
    if (params.contrast !== undefined) {
      this.uniforms.get('contrast')!.value = params.contrast
    }
    if (params.preserveVideo !== undefined) {
      this.uniforms.get('preserveVideo')!.value = params.preserveVideo ? 1 : 0
    }
    if (params.mix !== undefined) {
      this.uniforms.get('effectMix')!.value = params.mix
    }
  }
}
