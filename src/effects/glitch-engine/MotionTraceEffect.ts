import * as THREE from 'three'
import { TraceEffect, DEFAULT_TRACE_PARAMS } from './TraceEffect'
import type { TraceParams } from './TraceEffect'

const fragmentShader = `
uniform float threshold;
uniform sampler2D trailTexture;
uniform sampler2D historyTexture;
uniform float trailDecay;
uniform bool trailEnabled;
uniform bool hasHistory;
uniform float effectMix;
uniform float sensitivity;

float luminance(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  if (!hasHistory) {
    outputColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  vec3 current = inputColor.rgb;
  vec3 previous = texture2D(historyTexture, uv).rgb;

  // Calculate motion as absolute difference
  vec3 diff = abs(current - previous);
  float motion = max(max(diff.r, diff.g), diff.b);

  // Apply sensitivity amplification
  motion *= sensitivity;

  // Smooth threshold
  float mask = smoothstep(threshold * 0.5, threshold, motion);

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

export interface MotionTraceParams extends TraceParams {
  sensitivity: number  // 1-10: motion amplification
}

export const DEFAULT_MOTION_TRACE_PARAMS: MotionTraceParams = {
  ...DEFAULT_TRACE_PARAMS,
  threshold: 0.1,     // Lower threshold for motion detection
  sensitivity: 3.0,   // Motion amplification
}

/**
 * Motion Trace Effect
 *
 * Creates a mask based on frame-to-frame motion (temporal differencing).
 * Moving areas become white in the mask, static areas become black.
 *
 * Uses a history buffer to compare current frame with previous frame.
 * Trail persistence allows motion trails to linger and fade over time.
 */
export class MotionTraceEffect extends TraceEffect {
  private historyTarget: THREE.WebGLRenderTarget | null = null
  private historyMaterial: THREE.ShaderMaterial | null = null
  private hasHistory: boolean = false

  constructor(params: Partial<MotionTraceParams> = {}) {
    const p = { ...DEFAULT_MOTION_TRACE_PARAMS, ...params }
    super('MotionTraceEffect', fragmentShader, p)

    // Add motion-specific uniforms
    this.uniforms.set('historyTexture', new THREE.Uniform(null))
    this.uniforms.set('hasHistory', new THREE.Uniform(false))
    this.uniforms.set('sensitivity', new THREE.Uniform(p.sensitivity))
  }

  initialize(renderer: THREE.WebGLRenderer, alpha: boolean, frameBufferType: number) {
    super.initialize(renderer, alpha, frameBufferType)

    const size = renderer.getSize(new THREE.Vector2())

    // History buffer for previous frame
    this.historyTarget = new THREE.WebGLRenderTarget(size.x, size.y, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    })

    // Material for copying to history
    this.historyMaterial = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null } },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv; void main() { gl_FragColor = texture2D(tDiffuse, vUv); }`,
    })
  }

  update(renderer: THREE.WebGLRenderer, inputBuffer: THREE.WebGLRenderTarget, deltaTime?: number) {
    super.update(renderer, inputBuffer, deltaTime)

    // Set history texture for shader
    this.uniforms.get('historyTexture')!.value = this.historyTarget?.texture
    this.uniforms.get('hasHistory')!.value = this.hasHistory
  }

  /**
   * Capture the current frame to history buffer.
   * Call this with the INPUT frame (before effects) for proper motion detection.
   */
  captureFrame(renderer: THREE.WebGLRenderer, inputBuffer: THREE.WebGLRenderTarget) {
    if (!this.historyTarget || !this.historyMaterial || !this.copyScene || !this.copyCamera) {
      return
    }

    // Copy current input to history for next frame comparison
    const quad = this.copyScene.children[0] as THREE.Mesh
    const originalMaterial = quad.material
    quad.material = this.historyMaterial

    this.historyMaterial.uniforms.tDiffuse.value = inputBuffer.texture
    renderer.setRenderTarget(this.historyTarget)
    renderer.render(this.copyScene, this.copyCamera)
    renderer.setRenderTarget(null)

    quad.material = originalMaterial
    this.hasHistory = true
  }

  setSize(width: number, height: number) {
    super.setSize(width, height)
    this.historyTarget?.setSize(width, height)
  }

  updateParams(params: Partial<MotionTraceParams>) {
    super.updateParams(params)
    if (params.sensitivity !== undefined) {
      this.uniforms.get('sensitivity')!.value = params.sensitivity
    }
  }

  dispose() {
    super.dispose()
    this.historyTarget?.dispose()
    this.historyMaterial?.dispose()
  }
}
