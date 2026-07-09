import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import { COLOR_UTILS_GLSL } from './glsl-utils'

const fragmentShader = COLOR_UTILS_GLSL + /* glsl */ `
uniform sampler2D trailTexture;
uniform float zoom;
uniform float rotate;
uniform float decay;
uniform float hueShift;
uniform bool hasTrail;
uniform float effectMix;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 current = inputColor.rgb;

  if (!hasTrail) {
    outputColor = inputColor;
    return;
  }

  // ─── Inverse zoom/rotate about center ─────────────────────────────
  // EchoTrail/FeedbackLoop divide by zoom (forward transform) to make
  // trails rush toward the viewer. TUNNEL applies the inverse — multiply
  // by zoom and negate the rotation — so each successive trail sample is
  // pulled from further out and spun the other way, making the trail
  // stack appear to recede away from the viewer into a spinning tunnel.
  vec2 trailUV = uv;
  trailUV = (trailUV - 0.5) * zoom + 0.5;
  if (rotate != 0.0) {
    trailUV = rotateUV(trailUV, -rotate * 3.14159265 / 180.0);
  }

  // Soft edge fade so the tunnel doesn't hard-cut at the frame border
  vec2 edgeDist = min(trailUV, 1.0 - trailUV);
  float edgeFade = smoothstep(0.0, 0.02, edgeDist.x) * smoothstep(0.0, 0.02, edgeDist.y);

  vec3 trail = texture2D(trailTexture, clamp(trailUV, 0.001, 0.999)).rgb;
  trail *= edgeFade;

  // ─── Hue-rotate the trail each frame ──────────────────────────────
  // Accumulates through the feedback loop into a spinning color spiral.
  if (hueShift > 0.0) {
    vec3 hsv = rgb2hsv(trail);
    hsv.x = fract(hsv.x + hueShift / 360.0);
    trail = hsv2rgb(hsv);
  }

  trail *= decay;

  // Additive composite with a soft HDR knee — classic TD feedback glow
  // without hard clipping.
  vec3 result = current + trail;
  result = result / (1.0 + max(vec3(0.0), result - 1.0) * 0.5);

  vec4 effectColor = vec4(result, inputColor.a);
  outputColor = mix(inputColor, effectColor, effectMix);
}
`

export interface FeedbackTunnelParams {
  zoom: number       // 0.9-1.1
  rotate: number      // -5 to 5 degrees/frame
  decay: number        // 0-1
  hueShift: number     // 0-30 degrees/frame
  mix: number
}

export const DEFAULT_FEEDBACK_TUNNEL_PARAMS: FeedbackTunnelParams = {
  zoom: 1.02,
  rotate: 0.8,
  decay: 0.92,
  hueShift: 6,
  mix: 1,
}

export class FeedbackTunnelEffect extends Effect {
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

  constructor(params: Partial<FeedbackTunnelParams> = {}) {
    const p = { ...DEFAULT_FEEDBACK_TUNNEL_PARAMS, ...params }

    super('FeedbackTunnelEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['trailTexture', new THREE.Uniform(null)],
        ['zoom', new THREE.Uniform(p.zoom)],
        ['rotate', new THREE.Uniform(p.rotate)],
        ['decay', new THREE.Uniform(p.decay)],
        ['hueShift', new THREE.Uniform(p.hueShift)],
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

    // Copy current output to the trail buffer (this becomes the trail source
    // for next frame's inverse zoom/rotate sample).
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

  updateParams(params: Partial<FeedbackTunnelParams>) {
    if (params.zoom !== undefined) this.uniforms.get('zoom')!.value = params.zoom
    if (params.rotate !== undefined) this.uniforms.get('rotate')!.value = params.rotate
    if (params.decay !== undefined) this.uniforms.get('decay')!.value = params.decay
    if (params.hueShift !== undefined) this.uniforms.get('hueShift')!.value = params.hueShift
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
