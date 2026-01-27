import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

const fragmentShader = `
uniform float levels;
uniform int mode; // 0=rgb, 1=hsl
uniform float saturationBoost;
uniform float edgeContrast;

vec3 rgb2hsl(vec3 c) {
  float maxC = max(max(c.r, c.g), c.b);
  float minC = min(min(c.r, c.g), c.b);
  float l = (maxC + minC) / 2.0;

  if (maxC == minC) {
    return vec3(0.0, 0.0, l);
  }

  float d = maxC - minC;
  float s = l > 0.5 ? d / (2.0 - maxC - minC) : d / (maxC + minC);

  float h;
  if (maxC == c.r) {
    h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0);
  } else if (maxC == c.g) {
    h = (c.b - c.r) / d + 2.0;
  } else {
    h = (c.r - c.g) / d + 4.0;
  }
  h /= 6.0;

  return vec3(h, s, l);
}

float hue2rgb(float p, float q, float t) {
  if (t < 0.0) t += 1.0;
  if (t > 1.0) t -= 1.0;
  if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
  if (t < 1.0/2.0) return q;
  if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
  return p;
}

vec3 hsl2rgb(vec3 c) {
  if (c.y == 0.0) {
    return vec3(c.z);
  }

  float q = c.z < 0.5 ? c.z * (1.0 + c.y) : c.z + c.y - c.z * c.y;
  float p = 2.0 * c.z - q;

  return vec3(
    hue2rgb(p, q, c.x + 1.0/3.0),
    hue2rgb(p, q, c.x),
    hue2rgb(p, q, c.x - 1.0/3.0)
  );
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 color = inputColor.rgb;

  if (mode == 0) {
    // RGB posterize
    color = floor(color * levels) / levels;
  } else {
    // HSL posterize
    vec3 hsl = rgb2hsl(color);
    hsl.z = floor(hsl.z * levels) / levels;
    hsl.y = floor(hsl.y * levels) / levels;
    color = hsl2rgb(hsl);
  }

  // Saturation boost
  vec3 hsl = rgb2hsl(color);
  hsl.y = clamp(hsl.y * saturationBoost, 0.0, 1.0);
  color = hsl2rgb(hsl);

  // Edge contrast (sharpen boundaries)
  if (edgeContrast > 0.0) {
    vec2 texel = 1.0 / vec2(textureSize(inputBuffer, 0));
    vec3 left = texture2D(inputBuffer, uv - vec2(texel.x, 0.0)).rgb;
    vec3 right = texture2D(inputBuffer, uv + vec2(texel.x, 0.0)).rgb;
    vec3 up = texture2D(inputBuffer, uv - vec2(0.0, texel.y)).rgb;
    vec3 down = texture2D(inputBuffer, uv + vec2(0.0, texel.y)).rgb;

    vec3 edge = abs(left - right) + abs(up - down);
    float edgeMag = dot(edge, vec3(0.333));
    color = mix(color, color * (1.0 + edgeMag * 2.0), edgeContrast);
  }

  outputColor = vec4(color, inputColor.a);
}
`

export type PosterizeMode = 'rgb' | 'hsl'

export interface PosterizeParams {
  levels: number           // 2-16
  mode: PosterizeMode
  saturationBoost: number  // 0-2
  edgeContrast: number     // 0-1
}

export const DEFAULT_POSTERIZE_PARAMS: PosterizeParams = {
  levels: 4,
  mode: 'rgb',
  saturationBoost: 1.2,
  edgeContrast: 0,
}

const MODE_MAP: Record<PosterizeMode, number> = {
  'rgb': 0,
  'hsl': 1,
}

export class PosterizeEffect extends Effect {
  constructor(params: Partial<PosterizeParams> = {}) {
    const p = { ...DEFAULT_POSTERIZE_PARAMS, ...params }

    super('PosterizeEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['levels', new THREE.Uniform(p.levels)],
        ['mode', new THREE.Uniform(MODE_MAP[p.mode])],
        ['saturationBoost', new THREE.Uniform(p.saturationBoost)],
        ['edgeContrast', new THREE.Uniform(p.edgeContrast)],
      ]),
    })
  }

  updateParams(params: Partial<PosterizeParams>) {
    if (params.levels !== undefined) this.uniforms.get('levels')!.value = params.levels
    if (params.mode !== undefined) this.uniforms.get('mode')!.value = MODE_MAP[params.mode]
    if (params.saturationBoost !== undefined) this.uniforms.get('saturationBoost')!.value = params.saturationBoost
    if (params.edgeContrast !== undefined) this.uniforms.get('edgeContrast')!.value = params.edgeContrast
  }
}
