import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

const fragmentShader = `
uniform float threshold;
uniform vec2 resolution;
uniform vec3 edgeColor;
uniform float mixAmount;

float luminance(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 texel = 1.0 / resolution;

  // Sobel operator
  float tl = luminance(texture2D(inputBuffer, uv + vec2(-texel.x, texel.y)).rgb);
  float t  = luminance(texture2D(inputBuffer, uv + vec2(0.0, texel.y)).rgb);
  float tr = luminance(texture2D(inputBuffer, uv + vec2(texel.x, texel.y)).rgb);
  float l  = luminance(texture2D(inputBuffer, uv + vec2(-texel.x, 0.0)).rgb);
  float r  = luminance(texture2D(inputBuffer, uv + vec2(texel.x, 0.0)).rgb);
  float bl = luminance(texture2D(inputBuffer, uv + vec2(-texel.x, -texel.y)).rgb);
  float b  = luminance(texture2D(inputBuffer, uv + vec2(0.0, -texel.y)).rgb);
  float br = luminance(texture2D(inputBuffer, uv + vec2(texel.x, -texel.y)).rgb);

  float gx = -tl - 2.0*l - bl + tr + 2.0*r + br;
  float gy = -tl - 2.0*t - tr + bl + 2.0*b + br;

  float edge = sqrt(gx*gx + gy*gy);
  edge = step(threshold, edge);

  vec3 result = mix(inputColor.rgb, edgeColor * edge, mixAmount);
  outputColor = vec4(result, inputColor.a);
}
`

export interface EdgeDetectionParams {
  threshold: number
  edgeColor: string
  mixAmount: number
}

export const DEFAULT_EDGE_DETECTION_PARAMS: EdgeDetectionParams = {
  threshold: 0.1,
  edgeColor: '#00ff00',
  mixAmount: 1.0,
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? [parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255]
    : [0, 1, 0]
}

export class EdgeDetectionEffect extends Effect {
  constructor(params: Partial<EdgeDetectionParams> = {}) {
    const p = { ...DEFAULT_EDGE_DETECTION_PARAMS, ...params }
    const [r, g, b] = hexToRgb(p.edgeColor)

    super('EdgeDetectionEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['threshold', new THREE.Uniform(p.threshold)],
        ['resolution', new THREE.Uniform(new THREE.Vector2(1920, 1080))],
        ['edgeColor', new THREE.Uniform(new THREE.Vector3(r, g, b))],
        ['mixAmount', new THREE.Uniform(p.mixAmount)],
      ]),
    })
  }

  setResolution(width: number, height: number) {
    const res = this.uniforms.get('resolution')!.value as THREE.Vector2
    res.set(width, height)
  }

  updateParams(params: Partial<EdgeDetectionParams>) {
    if (params.threshold !== undefined) {
      this.uniforms.get('threshold')!.value = params.threshold
    }
    if (params.edgeColor !== undefined) {
      const [r, g, b] = hexToRgb(params.edgeColor)
      const color = this.uniforms.get('edgeColor')!.value as THREE.Vector3
      color.set(r, g, b)
    }
    if (params.mixAmount !== undefined) {
      this.uniforms.get('mixAmount')!.value = params.mixAmount
    }
  }
}
