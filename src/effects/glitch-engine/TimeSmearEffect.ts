import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

const fragmentShader = `
uniform sampler2D accumulationTexture;
uniform float accumulation;
uniform int direction; // 0 = both, 1 = forward, 2 = backward
uniform bool motionOnly;
uniform float threshold;
uniform bool hasAccumulation;
uniform float effectMix;

float luminance(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 current = inputColor.rgb;

  if (!hasAccumulation) {
    outputColor = inputColor;
    return;
  }

  vec3 accumulated = texture2D(accumulationTexture, uv).rgb;

  // Calculate motion mask if needed
  float motionMask = 1.0;
  if (motionOnly) {
    vec3 diff = abs(current - accumulated);
    float motion = max(max(diff.r, diff.g), diff.b);
    motionMask = smoothstep(threshold * 0.5, threshold, motion);
  }

  // Blend based on direction
  vec3 result;
  if (direction == 1) {
    // Forward: new pixels smear into old
    result = mix(accumulated, current, 1.0 - accumulation * motionMask);
  } else if (direction == 2) {
    // Backward: old pixels persist
    result = mix(current, accumulated, accumulation * motionMask);
  } else {
    // Both: bidirectional blend
    result = mix(current, accumulated, accumulation * 0.5 * motionMask);
    result = mix(result, current, 0.3); // Keep some current frame clarity
  }

  vec4 effectColor = vec4(result, inputColor.a);
  outputColor = mix(inputColor, effectColor, effectMix);
}
`

export interface TimeSmearParams {
  accumulation: number
  direction: 'forward' | 'backward' | 'both'
  motionOnly: boolean
  threshold: number
  mix: number
}

export const DEFAULT_TIME_SMEAR_PARAMS: TimeSmearParams = {
  accumulation: 0.9,
  direction: 'both',
  motionOnly: false,
  threshold: 0.1,
  mix: 1,
}

export class TimeSmearEffect extends Effect {
  private accumulationTarget: THREE.WebGLRenderTarget | null = null
  private copyMaterial: THREE.ShaderMaterial | null = null
  private copyScene: THREE.Scene | null = null
  private copyCamera: THREE.OrthographicCamera | null = null
  private hasInitialized = false

  constructor(params: Partial<TimeSmearParams> = {}) {
    const p = { ...DEFAULT_TIME_SMEAR_PARAMS, ...params }

    const directionValue = p.direction === 'forward' ? 1 : p.direction === 'backward' ? 2 : 0

    super('TimeSmearEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['accumulationTexture', new THREE.Uniform(null)],
        ['accumulation', new THREE.Uniform(p.accumulation)],
        ['direction', new THREE.Uniform(directionValue)],
        ['motionOnly', new THREE.Uniform(p.motionOnly)],
        ['threshold', new THREE.Uniform(p.threshold)],
        ['hasAccumulation', new THREE.Uniform(false)],
        ['effectMix', new THREE.Uniform(p.mix)],
      ]),
    })
  }

  initialize(renderer: THREE.WebGLRenderer, alpha: boolean, frameBufferType: number) {
    super.initialize?.(renderer, alpha, frameBufferType)

    const size = renderer.getSize(new THREE.Vector2())

    this.accumulationTarget = new THREE.WebGLRenderTarget(size.x, size.y, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    })

    this.copyMaterial = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null } },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv; void main() { gl_FragColor = texture2D(tDiffuse, vUv); }`,
    })

    this.copyScene = new THREE.Scene()
    this.copyCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.copyMaterial)
    this.copyScene.add(quad)
  }

  update(_renderer: THREE.WebGLRenderer, _inputBuffer: THREE.WebGLRenderTarget, _deltaTime?: number) {
    if (!this.accumulationTarget) return

    this.uniforms.get('accumulationTexture')!.value = this.accumulationTarget.texture
    this.uniforms.get('hasAccumulation')!.value = this.hasInitialized
  }

  captureFrame(renderer: THREE.WebGLRenderer, outputBuffer: THREE.WebGLRenderTarget) {
    if (!this.accumulationTarget || !this.copyMaterial || !this.copyScene || !this.copyCamera) return

    this.copyMaterial.uniforms.tDiffuse.value = outputBuffer.texture
    renderer.setRenderTarget(this.accumulationTarget)
    renderer.render(this.copyScene, this.copyCamera)
    renderer.setRenderTarget(null)

    this.hasInitialized = true
  }

  setSize(width: number, height: number) {
    super.setSize?.(width, height)
    this.accumulationTarget?.setSize(width, height)
  }

  updateParams(params: Partial<TimeSmearParams>) {
    if (params.accumulation !== undefined) this.uniforms.get('accumulation')!.value = params.accumulation
    if (params.direction !== undefined) {
      const directionValue = params.direction === 'forward' ? 1 : params.direction === 'backward' ? 2 : 0
      this.uniforms.get('direction')!.value = directionValue
    }
    if (params.motionOnly !== undefined) this.uniforms.get('motionOnly')!.value = params.motionOnly
    if (params.threshold !== undefined) this.uniforms.get('threshold')!.value = params.threshold
    if (params.mix !== undefined) this.uniforms.get('effectMix')!.value = params.mix
  }

  clearAccumulation() {
    this.hasInitialized = false
  }

  dispose() {
    super.dispose()
    this.accumulationTarget?.dispose()
    this.copyMaterial?.dispose()
  }
}
