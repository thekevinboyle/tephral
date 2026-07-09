import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

const fragmentShader = `
uniform float frequency;
uniform float rippleSpeed;
uniform float amplitude;
uniform float decay;
uniform float time;
uniform float aspect;
uniform float effectMix;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 c = vec2(0.5);
  vec2 p = uv - c;
  p.x *= aspect;

  float dist = length(p);
  vec2 dir = dist > 0.0001 ? p / dist : vec2(0.0);

  // Concentric wave radiating from center, attenuated with distance so
  // ripples fade toward the edges instead of distorting the full frame.
  float wave = sin(dist * frequency - time * rippleSpeed) * amplitude * 0.15 * exp(-dist * decay * 6.0);
  vec2 offset = dir * wave;
  offset.x /= aspect;

  vec2 uv2 = clamp(uv + offset, 0.001, 0.999);

  vec4 warped = texture2D(inputBuffer, uv2);
  outputColor = mix(inputColor, warped, effectMix);
}
`

export interface RippleWarpParams {
  frequency: number
  speed: number
  amplitude: number
  decay: number
  mix: number
}

export const DEFAULT_RIPPLE_WARP_PARAMS: RippleWarpParams = {
  frequency: 12,
  speed: 1.5,
  amplitude: 0.3,
  decay: 0.6,
  mix: 1,
}

export class RippleWarpEffect extends Effect {
  constructor(params: Partial<RippleWarpParams> = {}) {
    const p = { ...DEFAULT_RIPPLE_WARP_PARAMS, ...params }

    super('RippleWarpEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['frequency', new THREE.Uniform(p.frequency)],
        ['rippleSpeed', new THREE.Uniform(p.speed)],
        ['amplitude', new THREE.Uniform(p.amplitude)],
        ['decay', new THREE.Uniform(p.decay)],
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

  updateParams(params: Partial<RippleWarpParams>) {
    if (params.frequency !== undefined) {
      this.uniforms.get('frequency')!.value = params.frequency
    }
    if (params.speed !== undefined) {
      this.uniforms.get('rippleSpeed')!.value = params.speed
    }
    if (params.amplitude !== undefined) {
      this.uniforms.get('amplitude')!.value = params.amplitude
    }
    if (params.decay !== undefined) {
      this.uniforms.get('decay')!.value = params.decay
    }
    if (params.mix !== undefined) {
      this.uniforms.get('effectMix')!.value = params.mix
    }
  }
}
