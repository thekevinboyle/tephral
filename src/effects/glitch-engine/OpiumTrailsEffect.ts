import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import { COLOR_UTILS_GLSL } from './glsl-utils'

const fragmentShader = COLOR_UTILS_GLSL + /* glsl */ `
uniform sampler2D trailTexture;
uniform float decay;
uniform float crush;
uniform float desat;
uniform bool hasTrail;
uniform float effectMix;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 current = inputColor.rgb;

  if (!hasTrail) {
    outputColor = inputColor;
    return;
  }

  // ─── No spatial transform ──────────────────────────────────────────
  // Unlike TUNNEL, the trail is sampled at the same UV every frame — it
  // just pools and decays in place instead of receding, giving hazy,
  // grounded ghost trails rather than a zooming tunnel.
  vec3 trail = texture2D(trailTexture, uv).rgb * decay;

  vec3 result = max(current, trail);

  // ─── Grade: crush blacks with an S-curve, then desaturate ─────────
  // smoothstep gives a baseline ease-in/out S-curve; raising it to a
  // higher power as crush increases pulls shadows down hard while
  // leaving highlights comparatively intact. mix(result, ...) keeps
  // crush=0 a no-op.
  vec3 sCurved = smoothstep(vec3(0.0), vec3(1.0), result);
  vec3 heavy = pow(sCurved, vec3(1.0 + crush * 3.0));
  vec3 graded = mix(result, heavy, crush);

  float luma = luminance(graded);
  vec3 desaturated = mix(graded, vec3(luma), desat);

  vec4 effectColor = vec4(desaturated, inputColor.a);
  outputColor = mix(inputColor, effectColor, effectMix);
}
`

export interface OpiumTrailsParams {
  decay: number  // 0-1
  crush: number    // 0-1
  desat: number     // 0-1
  mix: number
}

export const DEFAULT_OPIUM_TRAILS_PARAMS: OpiumTrailsParams = {
  decay: 0.9,
  crush: 0.5,
  desat: 0.4,
  mix: 1,
}

export class OpiumTrailsEffect extends Effect {
  private trailTarget: THREE.WebGLRenderTarget | null = null
  private tempTarget: THREE.WebGLRenderTarget | null = null
  private copyMaterial: THREE.ShaderMaterial | null = null
  private copyGeometry: THREE.PlaneGeometry | null = null
  private copyScene: THREE.Scene | null = null
  private copyCamera: THREE.OrthographicCamera | null = null
  // True once captureFrame() has actually populated trailTarget with real
  // content. Gates hasTrail so the shader never samples a freshly
  // (re-)initialized target before it has data — matters most after
  // releaseTargets() + re-enable (mirrors FeedbackLoopEffect.hasCapturedFrame).
  private hasCapturedFrame: boolean = false

  constructor(params: Partial<OpiumTrailsParams> = {}) {
    const p = { ...DEFAULT_OPIUM_TRAILS_PARAMS, ...params }

    super('OpiumTrailsEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['trailTexture', new THREE.Uniform(null)],
        ['decay', new THREE.Uniform(p.decay)],
        ['crush', new THREE.Uniform(p.crush)],
        ['desat', new THREE.Uniform(p.desat)],
        ['hasTrail', new THREE.Uniform(false)],
        ['effectMix', new THREE.Uniform(p.mix)],
      ]),
    })
  }

  initialize(renderer: THREE.WebGLRenderer, alpha: boolean, frameBufferType: number) {
    super.initialize?.(renderer, alpha, frameBufferType)
    if (this.trailTarget) return

    const size = renderer.getSize(new THREE.Vector2())

    this.trailTarget = new THREE.WebGLRenderTarget(size.x, size.y, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
    })

    this.tempTarget = new THREE.WebGLRenderTarget(size.x, size.y, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
    })

    this.copyMaterial = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null } },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv; void main() { gl_FragColor = texture2D(tDiffuse, vUv); }`,
    })

    this.copyScene = new THREE.Scene()
    this.copyCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    this.copyGeometry = new THREE.PlaneGeometry(2, 2)
    const quad = new THREE.Mesh(this.copyGeometry, this.copyMaterial)
    this.copyScene.add(quad)
  }

  update(_renderer: THREE.WebGLRenderer, _inputBuffer: THREE.WebGLRenderTarget, _deltaTime?: number) {
    if (!this.trailTarget) return

    this.uniforms.get('trailTexture')!.value = this.trailTarget.texture
    this.uniforms.get('hasTrail')!.value = this.hasCapturedFrame
  }

  // Call this after the main render pass
  captureFrame(renderer: THREE.WebGLRenderer, outputBuffer: THREE.WebGLRenderTarget) {
    if (!this.trailTarget || !this.copyMaterial || !this.copyScene || !this.copyCamera) return

    // Copy current output to the trail buffer (this becomes next frame's
    // decayed ghost trail).
    this.copyMaterial.uniforms.tDiffuse.value = outputBuffer.texture
    renderer.setRenderTarget(this.trailTarget)
    renderer.render(this.copyScene, this.copyCamera)
    renderer.setRenderTarget(null)

    this.hasCapturedFrame = true
  }

  setSize(width: number, height: number) {
    super.setSize?.(width, height)
    this.trailTarget?.setSize(width, height)
    this.tempTarget?.setSize(width, height)
  }

  updateParams(params: Partial<OpiumTrailsParams>) {
    if (params.decay !== undefined) this.uniforms.get('decay')!.value = params.decay
    if (params.crush !== undefined) this.uniforms.get('crush')!.value = params.crush
    if (params.desat !== undefined) this.uniforms.get('desat')!.value = params.desat
    if (params.mix !== undefined) this.uniforms.get('effectMix')!.value = params.mix
  }

  // Release ALL GPU resources allocated in initialize() when the effect is
  // disabled — targets, materials, and geometry. three.js only frees
  // compiled programs/VBOs via .dispose(), never via GC, so leaving any of
  // these orphaned while a guarded initialize() re-runs (and unconditionally
  // recreates them) leaks GPU resources on every disable/enable cycle.
  releaseTargets() {
    this.trailTarget?.dispose(); this.trailTarget = null
    this.tempTarget?.dispose(); this.tempTarget = null
    this.copyMaterial?.dispose(); this.copyMaterial = null
    this.copyGeometry?.dispose(); this.copyGeometry = null
    this.copyScene = null
    this.copyCamera = null
    this.hasCapturedFrame = false
    this.uniforms.get('hasTrail')!.value = false
  }

  dispose() {
    super.dispose()
    this.trailTarget?.dispose()
    this.tempTarget?.dispose()
    this.copyMaterial?.dispose()
    this.copyGeometry?.dispose()
  }
}
