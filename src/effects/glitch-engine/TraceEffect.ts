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
 * Base class for trace effects (bright / motion / edge / colour / face / hands).
 *
 * A trace effect is never a pass in the chain. The pipeline's TraceMaskPass
 * calls renderMask() with the source frame (right after the input is drawn)
 * only while some effect's Mask dropdown uses it. renderMask() runs the
 * subclass's mainImage() into a half-resolution mask, then (if trails are on)
 * folds it into a decaying trail. getTraceMask() returns the result
 * (red channel = mask intensity); the pass hands it to RGB Split, Block
 * Displace and Datamosh every frame.
 */
export class TraceEffect extends Effect {
  // Render targets for mask output
  protected traceMaskTarget: THREE.WebGLRenderTarget | null = null
  protected trailTarget1: THREE.WebGLRenderTarget | null = null
  protected trailTarget2: THREE.WebGLRenderTarget | null = null
  protected trailSwap: boolean = false

  // Mask / trail / copy infrastructure
  protected maskMaterial: THREE.ShaderMaterial | null = null
  protected copyMaterial: THREE.ShaderMaterial | null = null
  protected trailMaterial: THREE.ShaderMaterial | null = null
  protected copyGeometry: THREE.PlaneGeometry | null = null
  protected copyScene: THREE.Scene | null = null
  protected copyCamera: THREE.OrthographicCamera | null = null

  protected trailEnabled: boolean = true
  protected trailDecay: number = 0.95

  private readonly maskShader: string

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

    this.maskShader = fragmentShader
    this.trailEnabled = p.trailEnabled
    this.trailDecay = p.trailDecay
  }

  /** Mask size for a drawing-buffer size: half resolution (the mask only scales an effect's strength). */
  protected static maskSize(width: number, height: number): [number, number] {
    return [Math.max(1, Math.ceil(width / 2)), Math.max(1, Math.ceil(height / 2))]
  }

  protected static maskTarget(width: number, height: number): THREE.WebGLRenderTarget {
    const [w, h] = TraceEffect.maskSize(width, height)
    return new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: false,
    })
  }

  initialize(renderer: THREE.WebGLRenderer, alpha: boolean, frameBufferType: number) {
    super.initialize?.(renderer, alpha, frameBufferType)
    if (this.traceMaskTarget) return

    const size = renderer.getDrawingBufferSize(new THREE.Vector2())

    // Current frame mask, plus double-buffered trail targets for persistence
    this.traceMaskTarget = TraceEffect.maskTarget(size.x, size.y)
    this.trailTarget1 = TraceEffect.maskTarget(size.x, size.y)
    this.trailTarget2 = TraceEffect.maskTarget(size.x, size.y)

    const vertexShader = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`

    // The subclass's mainImage() run standalone on the source frame. Its
    // uniforms are the effect's own Uniform objects, so updateParams() reaches
    // it; effectMix is pinned to 1 (output the mask) and trailEnabled to false
    // (the trail material below does the persistence).
    const uniforms: Record<string, THREE.IUniform> = {}
    for (const [key, uniform] of this.uniforms) uniforms[key] = uniform
    uniforms.effectMix = { value: 1 }
    uniforms.trailEnabled = { value: false }
    uniforms.inputBuffer = { value: null }
    this.maskMaterial = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      // three.js's prelude already declares luminance(); the trace shaders bring their own
      fragmentShader: `#define luminance traceLuminance
uniform sampler2D inputBuffer;
varying vec2 vUv;
${this.maskShader}
void main() {
  vec4 maskColor;
  mainImage(texture2D(inputBuffer, vUv), vUv, maskColor);
  gl_FragColor = vec4(maskColor.rrr, 1.0);
}`,
      depthTest: false,
      depthWrite: false,
    })

    // Simple copy material
    this.copyMaterial = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null } },
      vertexShader,
      fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv; void main() { gl_FragColor = texture2D(tDiffuse, vUv); }`,
      depthTest: false,
      depthWrite: false,
    })

    // Trail accumulation material - blends current mask with decayed previous
    this.trailMaterial = new THREE.ShaderMaterial({
      uniforms: {
        currentMask: { value: null },
        prevTrail: { value: null },
        decay: { value: this.trailDecay },
      },
      vertexShader,
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
      depthTest: false,
      depthWrite: false,
    })

    this.copyScene = new THREE.Scene()
    this.copyCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    this.copyGeometry = new THREE.PlaneGeometry(2, 2)
    const quad = new THREE.Mesh(this.copyGeometry, this.copyMaterial)
    this.copyScene.add(quad)
  }

  /** Draw `material` over the whole of `target` with the copy quad. */
  protected drawQuad(renderer: THREE.WebGLRenderer, material: THREE.Material, target: THREE.WebGLRenderTarget) {
    if (!this.copyScene || !this.copyCamera) return
    const quad = this.copyScene.children[0] as THREE.Mesh
    quad.material = material
    renderer.setRenderTarget(target)
    renderer.render(this.copyScene, this.copyCamera)
  }

  /**
   * Compute this frame's mask from `inputBuffer` (the source frame) and fold
   * it into the trail. Called by TraceMaskPass; a no-op until initialize().
   */
  renderMask(renderer: THREE.WebGLRenderer, inputBuffer: THREE.WebGLRenderTarget, deltaTime?: number) {
    if (!this.traceMaskTarget || !this.trailTarget1 || !this.trailTarget2 ||
        !this.maskMaterial || !this.trailMaterial) {
      return
    }

    // Subclasses prepare their inputs in update() (face/hand geometry, motion history)
    this.update(renderer, inputBuffer, deltaTime)

    this.maskMaterial.uniforms.inputBuffer.value = inputBuffer.texture
    this.drawQuad(renderer, this.maskMaterial, this.traceMaskTarget)

    if (this.trailEnabled) {
      // Accumulate trail: blend current mask with decayed previous trail
      const readTrail = this.trailSwap ? this.trailTarget2 : this.trailTarget1
      const writeTrail = this.trailSwap ? this.trailTarget1 : this.trailTarget2
      this.trailMaterial.uniforms.currentMask.value = this.traceMaskTarget.texture
      this.trailMaterial.uniforms.prevTrail.value = readTrail.texture
      this.trailMaterial.uniforms.decay.value = this.trailDecay
      this.drawQuad(renderer, this.trailMaterial, writeTrail)
      this.trailSwap = !this.trailSwap
    }

    this.afterMask?.(renderer, inputBuffer)
  }

  /** Hook after the mask is drawn (motion trace stores the frame as next frame's history). */
  protected afterMask?(renderer: THREE.WebGLRenderer, inputBuffer: THREE.WebGLRenderTarget): void

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
    const [w, h] = TraceEffect.maskSize(width, height)
    this.traceMaskTarget?.setSize(w, h)
    this.trailTarget1?.setSize(w, h)
    this.trailTarget2?.setSize(w, h)
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

  // Release ALL GPU resources allocated in initialize() when the effect is
  // disabled — targets, materials, and geometry. three.js only frees
  // compiled programs/VBOs via .dispose(), never via GC, so leaving any of
  // these orphaned while a guarded initialize() re-runs (and unconditionally
  // recreates them) leaks GPU resources on every disable/enable cycle.
  // Subclasses that own additional targets/materials (e.g. MotionTraceEffect)
  // should call `super.releaseTargets()` and release their own on top.
  releaseTargets() {
    this.traceMaskTarget?.dispose(); this.traceMaskTarget = null
    this.trailTarget1?.dispose(); this.trailTarget1 = null
    this.trailTarget2?.dispose(); this.trailTarget2 = null
    this.trailSwap = false
    this.maskMaterial?.dispose(); this.maskMaterial = null
    this.copyMaterial?.dispose(); this.copyMaterial = null
    this.trailMaterial?.dispose(); this.trailMaterial = null
    this.copyGeometry?.dispose(); this.copyGeometry = null
    this.copyScene = null
    this.copyCamera = null
  }

  dispose() {
    super.dispose()
    this.traceMaskTarget?.dispose()
    this.trailTarget1?.dispose()
    this.trailTarget2?.dispose()
    this.maskMaterial?.dispose()
    this.copyMaterial?.dispose()
    this.trailMaterial?.dispose()
    this.copyGeometry?.dispose()
  }
}
