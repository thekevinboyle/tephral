import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import { DEFAULT_SEG_TORN_PARAMS, type SegTornParams } from '../../stores/segStore'

const fragmentShader = /* glsl */ `
uniform float effectMix;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  outputColor = inputColor;
}
`

export class SegTornEffect extends Effect {
  constructor(params: Partial<SegTornParams> = {}) {
    const p = { ...DEFAULT_SEG_TORN_PARAMS, ...params }
    super('SegTornEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['effectMix', new THREE.Uniform(p.mix)],
      ]),
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setResolution(_w: number, _h: number) {}

  updateParams(params: Partial<SegTornParams>) {
    if (params.mix !== undefined) this.uniforms.get('effectMix')!.value = params.mix
  }
}
