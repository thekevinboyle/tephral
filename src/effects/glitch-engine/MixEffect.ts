import { Effect, BlendFunction } from 'postprocessing'
import * as THREE from 'three'

const fragmentShader = `
uniform float wetMix;
uniform sampler2D originalTexture;
uniform vec2 quadScale;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  // Transform UV to account for aspect ratio scaling
  // The quad is scaled, so we need to adjust UVs to sample the original texture correctly
  vec2 adjustedUv = (uv - 0.5) / quadScale + 0.5;

  // Check if UV is outside the valid range (letterbox/pillarbox area)
  if (adjustedUv.x < 0.0 || adjustedUv.x > 1.0 || adjustedUv.y < 0.0 || adjustedUv.y > 1.0) {
    // Outside video area - show black for dry, or the processed (which should also be black)
    outputColor = mix(vec4(0.0, 0.0, 0.0, 1.0), inputColor, wetMix);
  } else {
    vec4 dry = texture2D(originalTexture, adjustedUv);
    outputColor = mix(dry, inputColor, wetMix);
  }
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
        ['quadScale', new THREE.Uniform(new THREE.Vector2(1, 1))],
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

  setQuadScale(scaleX: number, scaleY: number) {
    const scale = this.uniforms.get('quadScale')!.value as THREE.Vector2
    scale.set(scaleX, scaleY)
  }

  getOriginalTexture(): THREE.Texture | null {
    return this.originalTexture
  }
}
