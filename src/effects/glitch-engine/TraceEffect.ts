import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

// Base fragment shader for trace effects - outputs mask to red channel
const baseFragmentShader = `
uniform float effectMix;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  // Override in subclasses
  outputColor = inputColor;
}
`

export interface TraceParams {
  threshold: number      // 0-1: threshold for trace detection
  trailDecay: number     // 0-1: how quickly trails fade (1 = instant, 0 = never)
  trailEnabled: boolean  // whether trail persistence is enabled
  mix: number            // 0-1: wet/dry mix
}

export const DEFAULT_TRACE_PARAMS: TraceParams = {
  threshold: 0.5,
  trailDecay: 0.95,
  trailEnabled: true,
  mix: 0,  // Default to 0 - trace effects generate masks internally, don't display them
}

/**
 * Base class for trace effects that output mask textures.
 * Provides:
 * - traceMaskTarget: The current frame's trace mask (red channel = mask intensity)
 * - trailTarget: Accumulated trail buffer with decay (for persistence effects)
 * - captureTraceMask(): Call after render to update trail buffer
 * - getTraceMask(): Returns the final mask texture (with trails if enabled)
 *
 * Subclasses should:
 * 1. Override the fragment shader to compute the mask
 * 2. Call super methods for buffer management
 * 3. Use getTraceMask() to provide the mask to other effects
 */
export class TraceEffect extends Effect {
  // Render targets for mask output
  protected traceMaskTarget: THREE.WebGLRenderTarget | null = null
  protected trailTarget1: THREE.WebGLRenderTarget | null = null
  protected trailTarget2: THREE.WebGLRenderTarget | null = null
  protected trailSwap: boolean = false

  // Copy infrastructure
  protected copyMaterial: THREE.ShaderMaterial | null = null
  protected trailMaterial: THREE.ShaderMaterial | null = null
  protected copyScene: THREE.Scene | null = null
  protected copyCamera: THREE.OrthographicCamera | null = null

  protected trailEnabled: boolean = true
  protected trailDecay: number = 0.95

  constructor(
    name: string,
    fragmentShader: string = baseFragmentShader,
    params: Partial<TraceParams> = {}
  ) {
    const p = { ...DEFAULT_TRACE_PARAMS, ...params }

    super(name, fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['threshold', new THREE.Uniform(p.threshold)],
        ['trailTexture', new THREE.Uniform(null)],
        ['trailDecay', new THREE.Uniform(p.trailDecay)],
        ['trailEnabled', new THREE.Uniform(p.trailEnabled)],
        ['effectMix', new THREE.Uniform(p.mix)],
      ]),
    })

    this.trailEnabled = p.trailEnabled
    this.trailDecay = p.trailDecay
  }

  initialize(renderer: THREE.WebGLRenderer, alpha: boolean, frameBufferType: number) {
    super.initialize?.(renderer, alpha, frameBufferType)

    const size = renderer.getSize(new THREE.Vector2())
    const options = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    }

    // Current frame mask
    this.traceMaskTarget = new THREE.WebGLRenderTarget(size.x, size.y, options)

    // Double-buffered trail targets for persistence
    this.trailTarget1 = new THREE.WebGLRenderTarget(size.x, size.y, options)
    this.trailTarget2 = new THREE.WebGLRenderTarget(size.x, size.y, options)

    // Simple copy material
    this.copyMaterial = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null } },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv; void main() { gl_FragColor = texture2D(tDiffuse, vUv); }`,
    })

    // Trail accumulation material - blends current mask with decayed previous
    this.trailMaterial = new THREE.ShaderMaterial({
      uniforms: {
        currentMask: { value: null },
        prevTrail: { value: null },
        decay: { value: this.trailDecay },
      },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        uniform sampler2D currentMask;
        uniform sampler2D prevTrail;
        uniform float decay;
        varying vec2 vUv;

        void main() {
          float current = texture2D(currentMask, vUv).r;
          float trail = texture2D(prevTrail, vUv).r * decay;
          // Max of current detection and decayed trail
          float result = max(current, trail);
          gl_FragColor = vec4(result, result, result, 1.0);
        }
      `,
    })

    this.copyScene = new THREE.Scene()
    this.copyCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.copyMaterial)
    this.copyScene.add(quad)
  }

  update(_renderer: THREE.WebGLRenderer, _inputBuffer: THREE.WebGLRenderTarget, _deltaTime?: number) {
    // Set trail texture for shader to use
    const readTrail = this.trailSwap ? this.trailTarget2 : this.trailTarget1
    this.uniforms.get('trailTexture')!.value = readTrail?.texture
    this.uniforms.get('trailDecay')!.value = this.trailDecay
    this.uniforms.get('trailEnabled')!.value = this.trailEnabled
  }

  /**
   * Call after main render pass to update trail buffers.
   * This should be called with the output that contains this effect's mask.
   */
  captureTraceMask(renderer: THREE.WebGLRenderer, maskBuffer: THREE.WebGLRenderTarget) {
    if (!this.traceMaskTarget || !this.trailTarget1 || !this.trailTarget2 ||
        !this.trailMaterial || !this.copyScene || !this.copyCamera || !this.copyMaterial) {
      return
    }

    // Copy current mask to traceMaskTarget
    this.copyMaterial.uniforms.tDiffuse.value = maskBuffer.texture
    renderer.setRenderTarget(this.traceMaskTarget)
    renderer.render(this.copyScene, this.copyCamera)

    if (this.trailEnabled) {
      // Accumulate trail: blend current mask with decayed previous trail
      const readTrail = this.trailSwap ? this.trailTarget2 : this.trailTarget1
      const writeTrail = this.trailSwap ? this.trailTarget1 : this.trailTarget2

      // Swap to trail material
      const quad = this.copyScene.children[0] as THREE.Mesh
      quad.material = this.trailMaterial

      this.trailMaterial.uniforms.currentMask.value = this.traceMaskTarget.texture
      this.trailMaterial.uniforms.prevTrail.value = readTrail.texture
      this.trailMaterial.uniforms.decay.value = this.trailDecay

      renderer.setRenderTarget(writeTrail)
      renderer.render(this.copyScene, this.copyCamera)

      this.trailSwap = !this.trailSwap

      // Restore copy material
      quad.material = this.copyMaterial
    }

    renderer.setRenderTarget(null)
  }

  /**
   * Get the trace mask texture (with trails if enabled).
   * Other effects can sample this to apply masked effects.
   */
  getTraceMask(): THREE.Texture | null {
    if (this.trailEnabled) {
      // Return the trail buffer (includes accumulated trails)
      const readTrail = this.trailSwap ? this.trailTarget2 : this.trailTarget1
      return readTrail?.texture ?? null
    }
    // Return just the current frame mask
    return this.traceMaskTarget?.texture ?? null
  }

  setSize(width: number, height: number) {
    super.setSize?.(width, height)
    this.traceMaskTarget?.setSize(width, height)
    this.trailTarget1?.setSize(width, height)
    this.trailTarget2?.setSize(width, height)
  }

  updateParams(params: Partial<TraceParams>) {
    if (params.threshold !== undefined) {
      this.uniforms.get('threshold')!.value = params.threshold
    }
    if (params.trailDecay !== undefined) {
      this.trailDecay = params.trailDecay
      this.uniforms.get('trailDecay')!.value = params.trailDecay
    }
    if (params.trailEnabled !== undefined) {
      this.trailEnabled = params.trailEnabled
      this.uniforms.get('trailEnabled')!.value = params.trailEnabled
    }
    if (params.mix !== undefined) {
      this.uniforms.get('effectMix')!.value = params.mix
    }
  }

  dispose() {
    super.dispose()
    this.traceMaskTarget?.dispose()
    this.trailTarget1?.dispose()
    this.trailTarget2?.dispose()
    this.copyMaterial?.dispose()
    this.trailMaterial?.dispose()
  }
}
