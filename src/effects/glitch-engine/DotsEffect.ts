import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

const fragmentShader = `
uniform float gridSize;
uniform float dotScale;
uniform float threshold;
uniform int shape;
uniform vec2 resolution;
uniform float effectMix;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 pixelCoord = uv * resolution;
  vec2 cellIndex = floor(pixelCoord / gridSize);
  vec2 cellCenter = (cellIndex + 0.5) * gridSize;
  vec2 cellCenterUV = cellCenter / resolution;

  vec4 cellColor = texture2D(inputBuffer, cellCenterUV);
  float brightness = dot(cellColor.rgb, vec3(0.299, 0.587, 0.114));

  vec4 effectColor;
  if (brightness < threshold) {
    effectColor = vec4(0.0, 0.0, 0.0, 1.0);
  } else {
    float maxRadius = gridSize * 0.5 * dotScale;
    float radius = brightness * maxRadius;
    vec2 delta = pixelCoord - cellCenter;
    float dist;

    // shape: 0 = circle, 1 = square, 2 = diamond
    if (shape == 0) {
      dist = length(delta);
    } else if (shape == 1) {
      dist = max(abs(delta.x), abs(delta.y));
    } else {
      dist = abs(delta.x) + abs(delta.y);
    }

    effectColor = dist <= radius ? vec4(1.0) : vec4(0.0, 0.0, 0.0, 1.0);
  }

  outputColor = mix(inputColor, effectColor, effectMix);
}
`

export interface DotsEffectParams {
  gridSize: number
  dotScale: number
  threshold: number
  shape: 'circle' | 'square' | 'diamond'
  mix: number
}

export const DEFAULT_DOTS_EFFECT_PARAMS: DotsEffectParams = {
  gridSize: 8,
  dotScale: 0.8,
  threshold: 0.1,
  shape: 'circle',
  mix: 1,
}

export class DotsEffect extends Effect {
  constructor(params: Partial<DotsEffectParams> = {}) {
    const p = { ...DEFAULT_DOTS_EFFECT_PARAMS, ...params }
    const shapeMap: Record<string, number> = { circle: 0, square: 1, diamond: 2 }

    super('DotsEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['gridSize', new THREE.Uniform(p.gridSize)],
        ['dotScale', new THREE.Uniform(p.dotScale)],
        ['threshold', new THREE.Uniform(p.threshold)],
        ['shape', new THREE.Uniform(shapeMap[p.shape])],
        ['resolution', new THREE.Uniform(new THREE.Vector2(1920, 1080))],
        ['effectMix', new THREE.Uniform(p.mix)],
      ]),
    })
  }

  setResolution(width: number, height: number) {
    (this.uniforms.get('resolution')!.value as THREE.Vector2).set(width, height)
  }

  updateParams(params: Partial<DotsEffectParams>) {
    const shapeMap: Record<string, number> = { circle: 0, square: 1, diamond: 2 }
    if (params.gridSize !== undefined) this.uniforms.get('gridSize')!.value = params.gridSize
    if (params.dotScale !== undefined) this.uniforms.get('dotScale')!.value = params.dotScale
    if (params.threshold !== undefined) this.uniforms.get('threshold')!.value = params.threshold
    if (params.shape !== undefined) this.uniforms.get('shape')!.value = shapeMap[params.shape]
    if (params.mix !== undefined) this.uniforms.get('effectMix')!.value = params.mix
  }
}
