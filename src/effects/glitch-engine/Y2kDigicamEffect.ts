import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

const fragmentShader = `
uniform float flash;
uniform float vignette;
uniform float grain;
uniform float resDown;
uniform float time;
uniform float aspect;
uniform float effectMix;

float y2kHash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  // Quantize UV to a coarse grid BEFORE sampling so the resDown blockiness
  // affects everything downstream (flash, grain), like a genuinely low-res
  // sensor rather than a post-hoc pixelation filter.
  float cells = max(1.0, 480.0 / max(resDown, 1.0));
  vec2 qUv = floor(uv * cells) / cells;
  vec4 src = texture2D(inputBuffer, clamp(qUv, 0.001, 0.999));

  // Center-weighted exposure lift: a hard, camera-flash-style hot spot
  // concentrated near the middle of frame — falls off with distance^2 so
  // the blowout reads as a hotspot, not a blanket wash across the image.
  vec2 p = qUv - 0.5;
  p.x *= aspect;
  float distC = length(p);
  float falloff = 1.0 - smoothstep(0.0, 0.42, distC);
  float lift = flash * falloff * falloff * 1.3;
  vec3 col = src.rgb + vec3(lift);

  // Highlights clip hard and desaturate as they blow out — the classic
  // digicam-flash look where bright skin goes flat and white.
  float lumaHi = dot(col, vec3(0.299, 0.587, 0.114));
  float clipAmt = smoothstep(0.65, 1.05, lumaHi + lift * 0.3);
  vec3 desat = vec3(dot(col, vec3(0.299, 0.587, 0.114)));
  col = mix(col, mix(col, desat, 0.85), clipAmt);
  col = mix(col, vec3(1.0), clipAmt * 0.5);
  col = min(col, vec3(1.02));

  // Hard-edged vignette: hold the center bright, cut sharply near the rim.
  float vig = 1.0 - smoothstep(0.35, 0.98, distC) * vignette;
  vig = pow(vig, 1.0 + vignette * 2.0);
  col *= vig;

  // Heavy time-seeded grain on the quantized grid so the noise looks like
  // sensor noise from the low-res capture, not an overlay.
  float g = (y2kHash(qUv * vec2(1280.0, 720.0) + fract(time * 24.0) * 133.7) - 0.5);
  col += g * grain * 0.9;

  vec4 effectColor = vec4(clamp(col, 0.0, 1.0), inputColor.a);
  outputColor = mix(inputColor, effectColor, effectMix);
}
`

export interface Y2kParams {
  flash: number
  vignette: number
  grain: number
  resDown: number
  mix: number
}

export const DEFAULT_Y2K_PARAMS: Y2kParams = {
  flash: 0.7,
  vignette: 0.6,
  grain: 0.4,
  resDown: 2,
  mix: 1,
}

export class Y2kDigicamEffect extends Effect {
  constructor(params: Partial<Y2kParams> = {}) {
    const p = { ...DEFAULT_Y2K_PARAMS, ...params }

    super('Y2kDigicamEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['flash', new THREE.Uniform(p.flash)],
        ['vignette', new THREE.Uniform(p.vignette)],
        ['grain', new THREE.Uniform(p.grain)],
        ['resDown', new THREE.Uniform(p.resDown)],
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

  updateParams(params: Partial<Y2kParams>) {
    if (params.flash !== undefined) {
      this.uniforms.get('flash')!.value = params.flash
    }
    if (params.vignette !== undefined) {
      this.uniforms.get('vignette')!.value = params.vignette
    }
    if (params.grain !== undefined) {
      this.uniforms.get('grain')!.value = params.grain
    }
    if (params.resDown !== undefined) {
      this.uniforms.get('resDown')!.value = params.resDown
    }
    if (params.mix !== undefined) {
      this.uniforms.get('effectMix')!.value = params.mix
    }
  }
}
