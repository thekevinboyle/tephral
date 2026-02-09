import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

const fragmentShader = `
uniform vec2 redOffset;
uniform vec2 greenOffset;
uniform vec2 blueOffset;
uniform float amount;
uniform float effectMix;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 rUv = uv + redOffset * amount;
  vec2 gUv = uv + greenOffset * amount;
  vec2 bUv = uv + blueOffset * amount;

  float r = texture2D(inputBuffer, rUv).r;
  float g = texture2D(inputBuffer, gUv).g;
  float b = texture2D(inputBuffer, bUv).b;

  vec4 effectColor = vec4(r, g, b, inputColor.a);
  outputColor = mix(inputColor, effectColor, effectMix);
}
`

export interface RGBSplitParams {
  redOffsetX: number
  redOffsetY: number
  greenOffsetX: number
  greenOffsetY: number
  blueOffsetX: number
  blueOffsetY: number
  amount: number
  mix: number
}

export const DEFAULT_RGB_SPLIT_PARAMS: RGBSplitParams = {
  redOffsetX: 0.01,
  redOffsetY: 0,
  greenOffsetX: 0,
  greenOffsetY: 0,
  blueOffsetX: -0.01,
  blueOffsetY: 0,
  amount: 1,
  mix: 1,
}

export class RGBSplitEffect extends Effect {
  constructor(params: Partial<RGBSplitParams> = {}) {
    const p = { ...DEFAULT_RGB_SPLIT_PARAMS, ...params }

    super('RGBSplitEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['redOffset', new THREE.Uniform(new THREE.Vector2(p.redOffsetX, p.redOffsetY))],
        ['greenOffset', new THREE.Uniform(new THREE.Vector2(p.greenOffsetX, p.greenOffsetY))],
        ['blueOffset', new THREE.Uniform(new THREE.Vector2(p.blueOffsetX, p.blueOffsetY))],
        ['amount', new THREE.Uniform(p.amount)],
        ['effectMix', new THREE.Uniform(p.mix)],
      ]),
    })
  }

  updateParams(params: Partial<RGBSplitParams>) {
    if (params.redOffsetX !== undefined || params.redOffsetY !== undefined) {
      const offset = this.uniforms.get('redOffset')!.value as THREE.Vector2
      if (params.redOffsetX !== undefined) offset.x = params.redOffsetX
      if (params.redOffsetY !== undefined) offset.y = params.redOffsetY
    }
    if (params.greenOffsetX !== undefined || params.greenOffsetY !== undefined) {
      const offset = this.uniforms.get('greenOffset')!.value as THREE.Vector2
      if (params.greenOffsetX !== undefined) offset.x = params.greenOffsetX
      if (params.greenOffsetY !== undefined) offset.y = params.greenOffsetY
    }
    if (params.blueOffsetX !== undefined || params.blueOffsetY !== undefined) {
      const offset = this.uniforms.get('blueOffset')!.value as THREE.Vector2
      if (params.blueOffsetX !== undefined) offset.x = params.blueOffsetX
      if (params.blueOffsetY !== undefined) offset.y = params.blueOffsetY
    }
    if (params.amount !== undefined) {
      this.uniforms.get('amount')!.value = params.amount
    }
    if (params.mix !== undefined) {
      this.uniforms.get('effectMix')!.value = params.mix
    }
  }
}
