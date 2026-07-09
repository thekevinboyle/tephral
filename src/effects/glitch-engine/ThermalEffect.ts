import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

const fragmentShader = `
uniform float palette;
uniform float gain;
uniform float grain;
uniform float vignette;
uniform float time;
uniform float aspect;
uniform float effectMix;

float thermalHash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
}

// Classic FLIR-style thermal ramp: black -> deep purple -> magenta/red ->
// orange -> yellow -> white, built from hard-ish smoothstep bands so it
// reads as a false-color heat camera rather than a smooth rainbow gradient.
vec3 thermalRamp(float t) {
  const vec3 c0 = vec3(0.0, 0.0, 0.02);    // near-black, faint blue-black
  const vec3 c1 = vec3(0.20, 0.0, 0.35);   // deep purple
  const vec3 c2 = vec3(0.55, 0.0, 0.45);   // magenta
  const vec3 c3 = vec3(0.85, 0.05, 0.05);  // red
  const vec3 c4 = vec3(1.0, 0.45, 0.0);    // orange
  const vec3 c5 = vec3(1.0, 0.9, 0.15);    // yellow
  const vec3 c6 = vec3(1.0, 1.0, 0.95);    // hot white

  vec3 col = c0;
  col = mix(col, c1, smoothstep(0.0, 0.18, t));
  col = mix(col, c2, smoothstep(0.16, 0.34, t));
  col = mix(col, c3, smoothstep(0.32, 0.50, t));
  col = mix(col, c4, smoothstep(0.48, 0.68, t));
  col = mix(col, c5, smoothstep(0.66, 0.85, t));
  col = mix(col, c6, smoothstep(0.83, 1.0, t));
  return col;
}

vec3 nightVisionRamp(float t, vec3 tint) {
  // Phosphor-style single-hue ramp: crushed blacks, most of the range
  // sits in the mid-green band, blooms toward tint-white at the top.
  float shaped = pow(clamp(t, 0.0, 1.0), 0.7);
  vec3 base = tint * shaped;
  vec3 bloom = mix(base, vec3(1.0), smoothstep(0.75, 1.05, shaped) * 0.6);
  return bloom;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float lum = dot(inputColor.rgb, vec3(0.299, 0.587, 0.114));
  float t = clamp(lum * gain, 0.0, 1.0);

  vec3 col;
  int p = int(palette + 0.5);
  if (p == 1) {
    col = nightVisionRamp(t, vec3(0.15, 1.0, 0.2));
  } else if (p == 2) {
    col = nightVisionRamp(t, vec3(1.0, 0.65, 0.15));
  } else {
    col = thermalRamp(t);
  }

  // Circular vignette, darkens toward the corners.
  vec2 p2 = uv - 0.5;
  p2.x *= aspect;
  float dist = length(p2);
  float vig = 1.0 - smoothstep(0.25, 0.75, dist) * vignette;
  col *= vig;

  // Time-reseeded hash grain — heavier for the night-vision-style palettes,
  // where sensor noise is part of the read.
  float grainAmt = grain * (p == 0 ? 0.6 : 1.0);
  float g = (thermalHash(uv * vec2(1920.0, 1080.0) + fract(time) * 97.13) - 0.5) * grainAmt;
  col += g;

  vec4 effectColor = vec4(clamp(col, 0.0, 1.0), inputColor.a);
  outputColor = mix(inputColor, effectColor, effectMix);
}
`

export interface ThermalParams {
  palette: number
  gain: number
  grain: number
  vignette: number
  mix: number
}

export const DEFAULT_THERMAL_PARAMS: ThermalParams = {
  palette: 0,
  gain: 1,
  grain: 0.3,
  vignette: 0.5,
  mix: 1,
}

export class ThermalEffect extends Effect {
  constructor(params: Partial<ThermalParams> = {}) {
    const p = { ...DEFAULT_THERMAL_PARAMS, ...params }

    super('ThermalEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['palette', new THREE.Uniform(p.palette)],
        ['gain', new THREE.Uniform(p.gain)],
        ['grain', new THREE.Uniform(p.grain)],
        ['vignette', new THREE.Uniform(p.vignette)],
        ['time', new THREE.Uniform(0)],
        ['aspect', new THREE.Uniform(1)],
        ['effectMix', new THREE.Uniform(p.mix)],
      ]),
    })
  }

  update(_renderer: THREE.WebGLRenderer, _inputBuffer: THREE.WebGLRenderTarget, _deltaTime?: number) {
    this.uniforms.get('time')!.value = performance.now() / 1000
  }

  setAspect(aspect: number) {
    this.uniforms.get('aspect')!.value = aspect > 0 ? aspect : 1
  }

  updateParams(params: Partial<ThermalParams>) {
    if (params.palette !== undefined) {
      this.uniforms.get('palette')!.value = params.palette
    }
    if (params.gain !== undefined) {
      this.uniforms.get('gain')!.value = params.gain
    }
    if (params.grain !== undefined) {
      this.uniforms.get('grain')!.value = params.grain
    }
    if (params.vignette !== undefined) {
      this.uniforms.get('vignette')!.value = params.vignette
    }
    if (params.mix !== undefined) {
      this.uniforms.get('effectMix')!.value = params.mix
    }
  }
}
