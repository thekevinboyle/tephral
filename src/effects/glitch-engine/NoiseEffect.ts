import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

const fragmentShader = `
uniform float amount;
uniform float time;
uniform float speed;
uniform float effectMix;

float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float noise = random(uv + fract(time * speed)) * 2.0 - 1.0;
  vec3 color = inputColor.rgb + vec3(noise) * amount;
  vec4 effectColor = vec4(color, inputColor.a);
  outputColor = mix(inputColor, effectColor, effectMix);
}
`

export interface NoiseParams {
  amount: number
  speed: number
  mix: number
}

export const DEFAULT_NOISE_PARAMS: NoiseParams = {
  amount: 0.1,
  speed: 10.0,
  mix: 1,
}

export class NoiseEffect extends Effect {
  constructor(params: Partial<NoiseParams> = {}) {
    const p = { ...DEFAULT_NOISE_PARAMS, ...params }

    super('NoiseEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['amount', new THREE.Uniform(p.amount)],
        ['speed', new THREE.Uniform(p.speed)],
        ['time', new THREE.Uniform(0)],
        ['effectMix', new THREE.Uniform(p.mix)],
      ]),
    })
  }

  update(_renderer: THREE.WebGLRenderer, _inputBuffer: THREE.WebGLRenderTarget, _deltaTime?: number) {
    this.uniforms.get('time')!.value = performance.now() / 1000
  }

  updateParams(params: Partial<NoiseParams>) {
    if (params.amount !== undefined) {
      this.uniforms.get('amount')!.value = params.amount
    }
    if (params.speed !== undefined) {
      this.uniforms.get('speed')!.value = params.speed
    }
    if (params.mix !== undefined) {
      this.uniforms.get('effectMix')!.value = params.mix
    }
  }
}
