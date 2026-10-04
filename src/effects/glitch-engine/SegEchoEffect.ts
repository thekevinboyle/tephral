import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import type { SegmentationService } from '../vision/SegmentationService'
import { DEFAULT_SEG_ECHO_PARAMS, type SegEchoParams } from '../../stores/segStore'

const fragmentShader = /* glsl */ `
uniform float effectMix;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  outputColor = inputColor;
}
`

export class SegEchoEffect extends Effect {
  private seg: SegmentationService | null = null

  constructor(params: Partial<SegEchoParams> = {}) {
    const p = { ...DEFAULT_SEG_ECHO_PARAMS, ...params }
    super('SegEchoEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['effectMix', new THREE.Uniform(p.mix)],
      ]),
    })
  }

  setSegmentation(s: SegmentationService) { this.seg = s }
  /** True once the pipeline has handed over the shared segmentation service. */
  get hasSegmentation() { return this.seg !== null }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setResolution(_w: number, _h: number) {}
  releaseTargets() {}

  updateParams(params: Partial<SegEchoParams>) {
    if (params.mix !== undefined) this.uniforms.get('effectMix')!.value = params.mix
  }
}
