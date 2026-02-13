import * as THREE from 'three'
import { TraceEffect, DEFAULT_TRACE_PARAMS } from './TraceEffect'
import type { TraceParams } from './TraceEffect'

const fragmentShader = `
uniform float threshold;
uniform sampler2D trailTexture;
uniform float trailDecay;
uniform bool trailEnabled;
uniform float effectMix;
uniform vec2 resolution;

float luminance(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 texel = 1.0 / resolution;

  // Sobel operator - sample 3x3 neighborhood
  float tl = luminance(texture2D(inputBuffer, uv + vec2(-texel.x, texel.y)).rgb);
  float t  = luminance(texture2D(inputBuffer, uv + vec2(0.0, texel.y)).rgb);
  float tr = luminance(texture2D(inputBuffer, uv + vec2(texel.x, texel.y)).rgb);
  float l  = luminance(texture2D(inputBuffer, uv + vec2(-texel.x, 0.0)).rgb);
  float r  = luminance(texture2D(inputBuffer, uv + vec2(texel.x, 0.0)).rgb);
  float bl = luminance(texture2D(inputBuffer, uv + vec2(-texel.x, -texel.y)).rgb);
  float b  = luminance(texture2D(inputBuffer, uv + vec2(0.0, -texel.y)).rgb);
  float br = luminance(texture2D(inputBuffer, uv + vec2(texel.x, -texel.y)).rgb);

  // Sobel kernels
  float gx = -tl - 2.0*l - bl + tr + 2.0*r + br;
  float gy = -tl - 2.0*t - tr + bl + 2.0*b + br;

  // Edge magnitude
  float edge = sqrt(gx*gx + gy*gy);

  // Smooth threshold
  float mask = smoothstep(threshold - 0.02, threshold + 0.02, edge);

  // Blend with trail if enabled
  if (trailEnabled) {
    float trail = texture2D(trailTexture, uv).r * trailDecay;
    mask = max(mask, trail);
  }

  // Output mask
  vec4 effectColor = vec4(mask, mask, mask, 1.0);
  outputColor = mix(inputColor, effectColor, effectMix);
}
`

export interface EdgeTraceParams extends TraceParams {
  // threshold inherited - controls edge sensitivity
}

export const DEFAULT_EDGE_TRACE_PARAMS: EdgeTraceParams = {
  ...DEFAULT_TRACE_PARAMS,
  threshold: 0.15,  // Edge detection sensitivity
}

/**
 * Edge Trace Effect
 *
 * Creates a mask based on edge detection using Sobel operator.
 * High-contrast edges become white in the mask, flat areas become black.
 *
 * Trail persistence allows edge traces to linger and create
 * interesting trailing effects on moving edges.
 */
export class EdgeTraceEffect extends TraceEffect {
  constructor(params: Partial<EdgeTraceParams> = {}) {
    const p = { ...DEFAULT_EDGE_TRACE_PARAMS, ...params }
    super('EdgeTraceEffect', fragmentShader, p)

    // Add resolution uniform
    this.uniforms.set('resolution', new THREE.Uniform(new THREE.Vector2(1920, 1080)))
  }

  setSize(width: number, height: number) {
    super.setSize(width, height)
    const res = this.uniforms.get('resolution')?.value as THREE.Vector2
    res?.set(width, height)
  }

  setResolution(width: number, height: number) {
    const res = this.uniforms.get('resolution')?.value as THREE.Vector2
    res?.set(width, height)
  }

  updateParams(params: Partial<EdgeTraceParams>) {
    super.updateParams(params)
  }
}
