import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

const fragmentShader = `
uniform float intensity;
uniform float scale;
uniform float colorDepth;
uniform float angle;
uniform int mode; // 0=ordered, 1=halftone, 2=newsprint

// 4x4 Bayer matrix
const mat4 bayerMatrix = mat4(
  0.0/16.0, 8.0/16.0, 2.0/16.0, 10.0/16.0,
  12.0/16.0, 4.0/16.0, 14.0/16.0, 6.0/16.0,
  3.0/16.0, 11.0/16.0, 1.0/16.0, 9.0/16.0,
  15.0/16.0, 7.0/16.0, 13.0/16.0, 5.0/16.0
);

float getBayer(vec2 coord) {
  int x = int(mod(coord.x, 4.0));
  int y = int(mod(coord.y, 4.0));
  return bayerMatrix[y][x];
}

vec2 rotateUV(vec2 uv, float a) {
  float s = sin(a);
  float c = cos(a);
  return vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);
}

float halftone(vec2 coord, float ang, float sc) {
  vec2 rotated = rotateUV(coord, ang * 3.14159 / 180.0);
  vec2 nearest = floor(rotated / sc) * sc + sc * 0.5;
  float dist = length(rotated - nearest) / (sc * 0.5);
  return dist;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 resolution = vec2(textureSize(inputBuffer, 0));
  vec2 coord = uv * resolution / scale;

  vec3 color = inputColor.rgb;
  float levels = colorDepth;

  if (mode == 0) {
    // Ordered dithering (Bayer)
    float threshold = getBayer(coord) - 0.5;
    color = floor(color * levels + threshold) / levels;
  } else if (mode == 1) {
    // Halftone
    float luma = dot(color, vec3(0.299, 0.587, 0.114));
    float ht = halftone(coord, angle, 4.0);
    float threshold = step(ht, luma);
    color = vec3(threshold);
  } else if (mode == 2) {
    // Newsprint (CMYK-style)
    float c = 1.0 - color.r;
    float m = 1.0 - color.g;
    float y = 1.0 - color.b;
    float k = min(min(c, m), y);

    c = halftone(coord, angle + 15.0, 4.0) < (c - k) ? 1.0 : 0.0;
    m = halftone(coord, angle + 75.0, 4.0) < (m - k) ? 1.0 : 0.0;
    y = halftone(coord, angle, 4.0) < (y - k) ? 1.0 : 0.0;
    k = halftone(coord, angle + 45.0, 4.0) < k ? 1.0 : 0.0;

    color = vec3(1.0) - vec3(c + k, m + k, y + k);
  }

  color = mix(inputColor.rgb, color, intensity);
  outputColor = vec4(color, inputColor.a);
}
`

export type DitherMode = 'ordered' | 'halftone' | 'newsprint'

export interface DitherParams {
  mode: DitherMode
  intensity: number  // 0-1
  scale: number      // 1-8
  colorDepth: number // 2-16
  angle: number      // 0-180
}

export const DEFAULT_DITHER_PARAMS: DitherParams = {
  mode: 'ordered',
  intensity: 1.0,
  scale: 1,
  colorDepth: 4,
  angle: 45,
}

const MODE_MAP: Record<DitherMode, number> = {
  'ordered': 0,
  'halftone': 1,
  'newsprint': 2,
}

export class DitherEffect extends Effect {
  constructor(params: Partial<DitherParams> = {}) {
    const p = { ...DEFAULT_DITHER_PARAMS, ...params }

    super('DitherEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['intensity', new THREE.Uniform(p.intensity)],
        ['scale', new THREE.Uniform(p.scale)],
        ['colorDepth', new THREE.Uniform(p.colorDepth)],
        ['angle', new THREE.Uniform(p.angle)],
        ['mode', new THREE.Uniform(MODE_MAP[p.mode])],
      ]),
    })
  }

  updateParams(params: Partial<DitherParams>) {
    if (params.intensity !== undefined) this.uniforms.get('intensity')!.value = params.intensity
    if (params.scale !== undefined) this.uniforms.get('scale')!.value = params.scale
    if (params.colorDepth !== undefined) this.uniforms.get('colorDepth')!.value = params.colorDepth
    if (params.angle !== undefined) this.uniforms.get('angle')!.value = params.angle
    if (params.mode !== undefined) this.uniforms.get('mode')!.value = MODE_MAP[params.mode]
  }
}
