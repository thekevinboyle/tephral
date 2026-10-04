import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import { DEFAULT_SEG_STALE_PARAMS, type SegStaleParams } from '../../stores/segStore'

const fragmentShader = /* glsl */ `
uniform float effectMix;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  outputColor = inputColor;
}
`

export class SegStaleEffect extends Effect {
  constructor(params: Partial<SegStaleParams> = {}) {
    const p = { ...DEFAULT_SEG_STALE_PARAMS, ...params }
    super('SegStaleEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['effectMix', new THREE.Uniform(p.mix)],
      ]),
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setResolution(_w: number, _h: number) {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setBpm(_bpm: number) {}
  releaseTargets() {}

  updateParams(params: Partial<SegStaleParams>) {
    if (params.mix !== undefined) this.uniforms.get('effectMix')!.value = params.mix
  }
}
