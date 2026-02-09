import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

const fragmentShader = `
uniform float intensity;
uniform float radialAmount;
uniform float direction;
uniform float redOffset;
uniform float blueOffset;
uniform float effectMix;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 center = vec2(0.5);
  vec2 toCenter = uv - center;
  float dist = length(toCenter);

  // Radial falloff - more aberration at edges
  float radialFactor = mix(1.0, dist * 2.0, radialAmount);
  float aberration = intensity * radialFactor * 0.1;

  // Direction-based offset
  float angle = direction * 3.14159 / 180.0;
  vec2 dir = vec2(cos(angle), sin(angle));

  // Sample each channel with offset
  vec2 redUV = uv + dir * (redOffset + aberration);
  vec2 greenUV = uv;
  vec2 blueUV = uv + dir * (blueOffset - aberration);

  float r = texture2D(inputBuffer, redUV).r;
  float g = texture2D(inputBuffer, greenUV).g;
  float b = texture2D(inputBuffer, blueUV).b;

  vec4 effectColor = vec4(r, g, b, inputColor.a);
  outputColor = mix(inputColor, effectColor, effectMix);
}
`

export interface ChromaticAberrationParams {
  intensity: number      // 0-1
  radialAmount: number   // 0-1
  direction: number      // 0-360
  redOffset: number      // -0.05 to 0.05
  blueOffset: number     // -0.05 to 0.05
  mix: number            // 0-1
}

export const DEFAULT_CHROMATIC_ABERRATION_PARAMS: ChromaticAberrationParams = {
  intensity: 0.5,
  radialAmount: 0.8,
  direction: 0,
  redOffset: 0.01,
  blueOffset: -0.01,
  mix: 1,
}

export class ChromaticAberrationEffect extends Effect {
  constructor(params: Partial<ChromaticAberrationParams> = {}) {
    const p = { ...DEFAULT_CHROMATIC_ABERRATION_PARAMS, ...params }

    super('ChromaticAberrationEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['intensity', new THREE.Uniform(p.intensity)],
        ['radialAmount', new THREE.Uniform(p.radialAmount)],
        ['direction', new THREE.Uniform(p.direction)],
        ['redOffset', new THREE.Uniform(p.redOffset)],
        ['blueOffset', new THREE.Uniform(p.blueOffset)],
        ['effectMix', new THREE.Uniform(p.mix)],
      ]),
    })
  }

  updateParams(params: Partial<ChromaticAberrationParams>) {
    if (params.intensity !== undefined) this.uniforms.get('intensity')!.value = params.intensity
    if (params.radialAmount !== undefined) this.uniforms.get('radialAmount')!.value = params.radialAmount
    if (params.direction !== undefined) this.uniforms.get('direction')!.value = params.direction
    if (params.redOffset !== undefined) this.uniforms.get('redOffset')!.value = params.redOffset
    if (params.blueOffset !== undefined) this.uniforms.get('blueOffset')!.value = params.blueOffset
    if (params.mix !== undefined) this.uniforms.get('effectMix')!.value = params.mix
  }
}
