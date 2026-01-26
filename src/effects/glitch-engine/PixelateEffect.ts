import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

const fragmentShader = `
uniform float pixelSize;
uniform vec2 resolution;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 pixelUv = floor(uv * resolution / pixelSize) * pixelSize / resolution;
  outputColor = texture2D(inputBuffer, pixelUv);
}
`

export interface PixelateParams {
  pixelSize: number
}

export const DEFAULT_PIXELATE_PARAMS: PixelateParams = {
  pixelSize: 8,
}

export class PixelateEffect extends Effect {
  constructor(params: Partial<PixelateParams> = {}) {
    const p = { ...DEFAULT_PIXELATE_PARAMS, ...params }

    super('PixelateEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['pixelSize', new THREE.Uniform(p.pixelSize)],
        ['resolution', new THREE.Uniform(new THREE.Vector2(1920, 1080))],
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
  }
}
