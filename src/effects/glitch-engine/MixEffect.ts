import { Effect, BlendFunction } from 'postprocessing'
import * as THREE from 'three'

const fragmentShader = `
uniform float wetMix;
uniform sampler2D originalTexture;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec4 dry = texture2D(originalTexture, uv);
  outputColor = mix(dry, inputColor, wetMix);
}
`

export interface MixEffectParams {
  wetMix: number
}

export const DEFAULT_MIX_PARAMS: MixEffectParams = {
  wetMix: 1.0,
}

export class MixEffect extends Effect {
  private originalTexture: THREE.Texture | null = null

  constructor(params: Partial<MixEffectParams> = {}) {
    const p = { ...DEFAULT_MIX_PARAMS, ...params }

    super('MixEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['wetMix', new THREE.Uniform(p.wetMix)],
        ['originalTexture', new THREE.Uniform(null)],
      ]),
    })
  }

  updateParams(params: Partial<MixEffectParams>) {
    if (params.wetMix !== undefined) {
      this.uniforms.get('wetMix')!.value = params.wetMix
    }
  }

  setOriginalTexture(texture: THREE.Texture | null) {
    this.originalTexture = texture
    this.uniforms.get('originalTexture')!.value = texture
  }

  getOriginalTexture(): THREE.Texture | null {
    return this.originalTexture
  }
}
