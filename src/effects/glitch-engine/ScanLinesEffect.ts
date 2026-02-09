import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

const fragmentShader = `
uniform float lineCount;
uniform float lineOpacity;
uniform float lineFlicker;
uniform float time;
uniform float effectMix;

float random(float x) {
  return fract(sin(x * 12.9898) * 43758.5453);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float linePos = mod(uv.y * lineCount, 1.0);
  float scanLine = step(0.5, linePos);
  float flicker = 1.0 - lineFlicker * random(floor(time * 30.0) + floor(uv.y * lineCount));
  float darkness = mix(1.0, 1.0 - lineOpacity, scanLine) * flicker;

  vec4 effectColor = vec4(inputColor.rgb * darkness, inputColor.a);
  outputColor = mix(inputColor, effectColor, effectMix);
}
`

export interface ScanLinesParams {
  lineCount: number
  lineOpacity: number
  lineFlicker: number
  mix: number
}

export const DEFAULT_SCAN_LINES_PARAMS: ScanLinesParams = {
  lineCount: 300,
  lineOpacity: 0.15,
  lineFlicker: 0.05,
  mix: 1,
}

export class ScanLinesEffect extends Effect {
  constructor(params: Partial<ScanLinesParams> = {}) {
    const p = { ...DEFAULT_SCAN_LINES_PARAMS, ...params }

    super('ScanLinesEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['lineCount', new THREE.Uniform(p.lineCount)],
        ['lineOpacity', new THREE.Uniform(p.lineOpacity)],
        ['lineFlicker', new THREE.Uniform(p.lineFlicker)],
        ['time', new THREE.Uniform(0)],
        ['effectMix', new THREE.Uniform(p.mix)],
      ]),
    })
  }

  update(_renderer: THREE.WebGLRenderer, _inputBuffer: THREE.WebGLRenderTarget, _deltaTime?: number) {
    this.uniforms.get('time')!.value = performance.now() / 1000
  }

  updateParams(params: Partial<ScanLinesParams>) {
    if (params.lineCount !== undefined) {
      this.uniforms.get('lineCount')!.value = params.lineCount
    }
    if (params.lineOpacity !== undefined) {
      this.uniforms.get('lineOpacity')!.value = params.lineOpacity
    }
    if (params.lineFlicker !== undefined) {
      this.uniforms.get('lineFlicker')!.value = params.lineFlicker
    }
    if (params.mix !== undefined) {
      this.uniforms.get('effectMix')!.value = params.mix
    }
  }
}
