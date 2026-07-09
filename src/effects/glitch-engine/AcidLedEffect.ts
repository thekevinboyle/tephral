import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import { COLOR_UTILS_GLSL } from './glsl-utils'

// GPU port of src/components/overlays/acid/ledEffect.ts (CPU ground
// truth). The CPU version walks an AXIS-ALIGNED grid of cell centers
// starting at (gridSize/2, gridSize/2) and stepping by gridSize — i.e.
// centers sit at (n+0.5)*gridSize, which is exactly `(floor(p/gridSize) +
// 0.5) * gridSize` for any p in that cell, so (unlike Halftone/Hex, which
// are rotated/staggered) this shader's per-pixel "which cell am I in"
// lookup reproduces the CPU's exact cell phase, not just the same
// spacing.
//
// Per cell the CPU samples the source ONCE at the cell center (no
// averaging), derives brightness -> opacity, and — if opacity clears the
// 0.02 cutoff — draws, in order (later draws paint OVER earlier ones,
// standard canvas source-over alpha compositing):
//   1. an optional glow/bleed: a radial gradient from r0=dotRadius*0.5
//      (alpha = opacity*0.3) out to r1=dotRadius*(1+bleed) (alpha = 0),
//      gated on `bleed > 0 && opacity > 0.1`;
//   2. the main dot: solid white circle of radius `dotRadius`, alpha =
//      opacity;
//   3. an optional center highlight (opacity > 0.5 only): a small white
//      circle offset by (-dotRadius*0.2, -dotRadius*0.2), radius
//      dotRadius*0.3, alpha = (opacity-0.5)*0.3.
// All three are plain alpha-over blends (no multiply/screen), so this
// shader reproduces them as sequential `mix()` calls in the same order.
//
// COLORSPACE WARNING compliance: the source sample feeding the luma
// calculation is converted sRGB-byte-equivalent via linearToSRGB before
// use, and the composited result is converted back via sRGBToLinear right
// before outputColor, matching the CPU's byte-space brightness math.
const fragmentShader = COLOR_UTILS_GLSL + /* glsl */ `
uniform float gridSize;
uniform float dotSizeRatio;
uniform float brightnessMult;
uniform float bleed;
uniform vec2 resolution;
uniform float preserveVideo;
uniform float effectMix;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 pixelCoord = uv * resolution;

  vec2 cell = floor(pixelCoord / gridSize);
  vec2 cellCenter = (cell + 0.5) * gridSize;
  vec2 uvCenter = clamp(cellCenter / resolution, vec2(0.0), vec2(0.9999));
  vec3 srcSRGB = linearToSRGB(clamp(texture2D(inputBuffer, uvCenter).rgb, 0.0, 1.0));
  float brightness = luminance(srcSRGB);
  float opacity = min(1.0, brightness * brightnessMult);

  vec3 bg = preserveVideo > 0.5 ? linearToSRGB(clamp(inputColor.rgb, 0.0, 1.0)) : vec3(0.0);
  vec3 colorSRGB = bg;

  if (opacity >= 0.02) {
    float dotRadius = (gridSize * dotSizeRatio) * 0.5;
    float dist = distance(pixelCoord, cellCenter);

    if (bleed > 0.0 && opacity > 0.1) {
      float r0 = dotRadius * 0.5;
      float r1 = dotRadius * (1.0 + bleed);
      if (dist <= r1) {
        float t = clamp((dist - r0) / max(r1 - r0, 0.0001), 0.0, 1.0);
        float glowAlpha = mix(opacity * 0.3, 0.0, t);
        colorSRGB = mix(colorSRGB, vec3(1.0), glowAlpha);
      }
    }

    if (dist < dotRadius) {
      colorSRGB = mix(colorSRGB, vec3(1.0), opacity);
    }

    if (opacity > 0.5) {
      vec2 hCenter = cellCenter - vec2(dotRadius * 0.2, dotRadius * 0.2);
      float distH = distance(pixelCoord, hCenter);
      if (distH < dotRadius * 0.3) {
        colorSRGB = mix(colorSRGB, vec3(1.0), (opacity - 0.5) * 0.3);
      }
    }
  }

  vec3 result = sRGBToLinear(colorSRGB);
  outputColor = mix(inputColor, vec4(result, 1.0), effectMix);
}
`

export interface AcidLedParams {
  gridSize: number
  dotSize: number
  brightness: number
  bleed: number
  preserveVideo: boolean
  mix: number
}

export const DEFAULT_ACID_LED_PARAMS: AcidLedParams = {
  gridSize: 8,
  dotSize: 0.7,
  brightness: 1.0,
  bleed: 0.2,
  preserveVideo: false,
  mix: 1,
}

export class AcidLedEffect extends Effect {
  constructor(params: Partial<AcidLedParams> = {}) {
    const p = { ...DEFAULT_ACID_LED_PARAMS, ...params }

    super('AcidLedEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['gridSize', new THREE.Uniform(p.gridSize)],
        ['dotSizeRatio', new THREE.Uniform(p.dotSize)],
        ['brightnessMult', new THREE.Uniform(p.brightness)],
        ['bleed', new THREE.Uniform(p.bleed)],
        ['resolution', new THREE.Uniform(new THREE.Vector2(1920, 1080))],
        ['preserveVideo', new THREE.Uniform(p.preserveVideo ? 1 : 0)],
        ['effectMix', new THREE.Uniform(p.mix)],
      ]),
    })
  }

  setResolution(width: number, height: number) {
    (this.uniforms.get('resolution')!.value as THREE.Vector2).set(width, height)
  }

  updateParams(params: Partial<AcidLedParams>) {
    if (params.gridSize !== undefined) {
      this.uniforms.get('gridSize')!.value = params.gridSize
    }
    if (params.dotSize !== undefined) {
      this.uniforms.get('dotSizeRatio')!.value = params.dotSize
    }
    if (params.brightness !== undefined) {
      this.uniforms.get('brightnessMult')!.value = params.brightness
    }
    if (params.bleed !== undefined) {
      this.uniforms.get('bleed')!.value = params.bleed
    }
    if (params.preserveVideo !== undefined) {
      this.uniforms.get('preserveVideo')!.value = params.preserveVideo ? 1 : 0
    }
    if (params.mix !== undefined) {
      this.uniforms.get('effectMix')!.value = params.mix
    }
  }
}
