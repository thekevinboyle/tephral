import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

const fragmentShader = `
uniform vec3 lift;
uniform vec3 gamma;
uniform vec3 gain;
uniform float saturation;
uniform float contrast;
uniform float brightness;
uniform vec3 tintColor;
uniform float tintAmount;
uniform int tintMode; // 0=overlay, 1=multiply, 2=screen
uniform float effectMix;

vec3 rgb2hsl(vec3 c) {
  float maxC = max(max(c.r, c.g), c.b);
  float minC = min(min(c.r, c.g), c.b);
  float l = (maxC + minC) / 2.0;
  if (maxC == minC) return vec3(0.0, 0.0, l);
  float d = maxC - minC;
  float s = l > 0.5 ? d / (2.0 - maxC - minC) : d / (maxC + minC);
  float h;
  if (maxC == c.r) h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0);
  else if (maxC == c.g) h = (c.b - c.r) / d + 2.0;
  else h = (c.r - c.g) / d + 4.0;
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
  if (c.y == 0.0) return vec3(c.z);
  float q = c.z < 0.5 ? c.z * (1.0 + c.y) : c.z + c.y - c.z * c.y;
  float p = 2.0 * c.z - q;
  return vec3(hue2rgb(p, q, c.x + 1.0/3.0), hue2rgb(p, q, c.x), hue2rgb(p, q, c.x - 1.0/3.0));
}

vec3 blendOverlay(vec3 base, vec3 blend) {
  return mix(2.0 * base * blend, 1.0 - 2.0 * (1.0 - base) * (1.0 - blend), step(0.5, base));
}

vec3 blendScreen(vec3 base, vec3 blend) {
  return 1.0 - (1.0 - base) * (1.0 - blend);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 color = inputColor.rgb;

  // Lift/Gamma/Gain
  // Lift affects shadows, Gain affects highlights, Gamma affects midtones
  color = pow(max(vec3(0.0), color * gain + lift), 1.0 / gamma);

  // Brightness
  color += brightness;

  // Contrast
  color = (color - 0.5) * contrast + 0.5;

  // Saturation
  vec3 hsl = rgb2hsl(color);
  hsl.y *= saturation;
  color = hsl2rgb(hsl);

  // Tint
  if (tintAmount > 0.0) {
    vec3 tinted;
    if (tintMode == 0) {
      tinted = blendOverlay(color, tintColor);
    } else if (tintMode == 1) {
      tinted = color * tintColor;
    } else {
      tinted = blendScreen(color, tintColor);
    }
    color = mix(color, tinted, tintAmount);
  }

  vec4 effectColor = vec4(clamp(color, 0.0, 1.0), inputColor.a);
  outputColor = mix(inputColor, effectColor, effectMix);
}
`

export type TintMode = 'overlay' | 'multiply' | 'screen'

export interface ColorGradeParams {
  liftR: number; liftG: number; liftB: number
  gammaR: number; gammaG: number; gammaB: number
  gainR: number; gainG: number; gainB: number
  saturation: number
  contrast: number
  brightness: number
  tintColor: string
  tintAmount: number
  tintMode: TintMode
  mix: number
}

export const DEFAULT_COLOR_GRADE_PARAMS: ColorGradeParams = {
  liftR: 0, liftG: 0, liftB: 0,
  gammaR: 1, gammaG: 1, gammaB: 1,
  gainR: 1, gainG: 1, gainB: 1,
  saturation: 1.2,
  contrast: 1.1,
  brightness: 0,
  tintColor: '#000000',
  tintAmount: 0,
  tintMode: 'overlay',
  mix: 1,
}

const TINT_MODE_MAP: Record<TintMode, number> = {
  'overlay': 0,
  'multiply': 1,
  'screen': 2,
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? [parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255]
    : [0, 0, 0]
}

export class ColorGradeEffect extends Effect {
  constructor(params: Partial<ColorGradeParams> = {}) {
    const p = { ...DEFAULT_COLOR_GRADE_PARAMS, ...params }
    const tintRgb = hexToRgb(p.tintColor)

    super('ColorGradeEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['lift', new THREE.Uniform(new THREE.Vector3(p.liftR, p.liftG, p.liftB))],
        ['gamma', new THREE.Uniform(new THREE.Vector3(p.gammaR, p.gammaG, p.gammaB))],
        ['gain', new THREE.Uniform(new THREE.Vector3(p.gainR, p.gainG, p.gainB))],
        ['saturation', new THREE.Uniform(p.saturation)],
        ['contrast', new THREE.Uniform(p.contrast)],
        ['brightness', new THREE.Uniform(p.brightness)],
        ['tintColor', new THREE.Uniform(new THREE.Vector3(...tintRgb))],
        ['tintAmount', new THREE.Uniform(p.tintAmount)],
        ['tintMode', new THREE.Uniform(TINT_MODE_MAP[p.tintMode])],
        ['effectMix', new THREE.Uniform(p.mix)],
      ]),
    })
  }

  updateParams(params: Partial<ColorGradeParams>) {
    const lift = this.uniforms.get('lift')!.value as THREE.Vector3
    const gamma = this.uniforms.get('gamma')!.value as THREE.Vector3
    const gain = this.uniforms.get('gain')!.value as THREE.Vector3

    if (params.liftR !== undefined) lift.x = params.liftR
    if (params.liftG !== undefined) lift.y = params.liftG
    if (params.liftB !== undefined) lift.z = params.liftB
    if (params.gammaR !== undefined) gamma.x = params.gammaR
    if (params.gammaG !== undefined) gamma.y = params.gammaG
    if (params.gammaB !== undefined) gamma.z = params.gammaB
    if (params.gainR !== undefined) gain.x = params.gainR
    if (params.gainG !== undefined) gain.y = params.gainG
    if (params.gainB !== undefined) gain.z = params.gainB
    if (params.saturation !== undefined) this.uniforms.get('saturation')!.value = params.saturation
    if (params.contrast !== undefined) this.uniforms.get('contrast')!.value = params.contrast
    if (params.brightness !== undefined) this.uniforms.get('brightness')!.value = params.brightness
    if (params.tintColor !== undefined) {
      const rgb = hexToRgb(params.tintColor)
      ;(this.uniforms.get('tintColor')!.value as THREE.Vector3).set(...rgb)
    }
    if (params.tintAmount !== undefined) this.uniforms.get('tintAmount')!.value = params.tintAmount
    if (params.tintMode !== undefined) this.uniforms.get('tintMode')!.value = TINT_MODE_MAP[params.tintMode]
    if (params.mix !== undefined) this.uniforms.get('effectMix')!.value = params.mix
  }
}
