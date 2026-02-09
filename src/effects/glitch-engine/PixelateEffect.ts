import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

const fragmentShader = `
uniform float pixelSize;
uniform vec2 resolution;
uniform float effectMix;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 pixelUv = floor(uv * resolution / pixelSize) * pixelSize / resolution;
  vec4 effectColor = texture2D(inputBuffer, pixelUv);
  outputColor = mix(inputColor, effectColor, effectMix);
}
`

export interface PixelateParams {
  pixelSize: number
  mix: number
}

export const DEFAULT_PIXELATE_PARAMS: PixelateParams = {
  pixelSize: 8,
  mix: 1,
}

export class PixelateEffect extends Effect {
  constructor(params: Partial<PixelateParams> = {}) {
    const p = { ...DEFAULT_PIXELATE_PARAMS, ...params }

    super('PixelateEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['pixelSize', new THREE.Uniform(p.pixelSize)],
        ['resolution', new THREE.Uniform(new THREE.Vector2(1920, 1080))],
        ['effectMix', new THREE.Uniform(p.mix)],
      ]),
    })
  }

  setResolution(width: number, height: number) {
    const res = this.uniforms.get('resolution')!.value as THREE.Vector2
    res.set(width, height)
  }

  updateParams(params: Partial<PixelateParams>) {
    if (params.pixelSize !== undefined) {
      this.uniforms.get('pixelSize')!.value = params.pixelSize
    }
    if (params.mix !== undefined) {
      this.uniforms.get('effectMix')!.value = params.mix
    }
  }
}
