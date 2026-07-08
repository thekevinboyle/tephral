import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import { NOISE_GLSL, COLOR_UTILS_GLSL } from './glsl-utils'

const fragmentShader = NOISE_GLSL + COLOR_UTILS_GLSL + /* glsl */ `
uniform sampler2D feedbackTexture;
uniform float decay;
uniform float decayCurve;
uniform float offsetX;
uniform float offsetY;
uniform float zoom;
uniform float rotation;
uniform float hueShift;
uniform float satBoost;
uniform int blendMode;
uniform float warpAmount;
uniform float edgeGlow;
uniform bool hasFeedback;
uniform float effectMix;
uniform vec2 resolution;
uniform float time;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 current = inputColor.rgb;

  if (!hasFeedback) {
    outputColor = inputColor;
    return;
  }

  // ─── Transform UV for feedback sampling ────────────────────────
  vec2 feedbackUV = uv;

  // Offset
  feedbackUV += vec2(offsetX, offsetY);

  // Zoom from center
  feedbackUV = (feedbackUV - 0.5) / zoom + 0.5;

  // Rotation
  if (rotation != 0.0) {
    feedbackUV = rotateUV(feedbackUV, rotation * 3.14159265 / 180.0);
  }

  // ─── Organic warp distortion on feedback UV ────────────────────
  if (warpAmount > 0.0) {
    vec2 warp = curlNoise(feedbackUV * 3.0 + time * 0.2) * warpAmount;
    feedbackUV += warp;
  }

  // ─── Sample feedback with edge-aware soft clamp ────────────────
  // Soft fade at edges instead of hard cutoff — prevents harsh border artifacts
  vec3 feedback = vec3(0.0);
  float edgeFade = 1.0;

  vec2 edgeDist = min(feedbackUV, 1.0 - feedbackUV);
  edgeFade = smoothstep(0.0, 0.03, edgeDist.x) * smoothstep(0.0, 0.03, edgeDist.y);

  if (edgeFade > 0.0) {
    feedback = texture2D(feedbackTexture, clamp(feedbackUV, 0.001, 0.999)).rgb;
    feedback *= edgeFade;

    // ─── Edge glow: enhance edges in feedback signal ───────────
    if (edgeGlow > 0.0) {
      vec2 texel = 1.0 / resolution;
      // Fast Sobel on feedback
      float tl = luminance(texture2D(feedbackTexture, feedbackUV + vec2(-texel.x, texel.y)).rgb);
      float tr = luminance(texture2D(feedbackTexture, feedbackUV + vec2(texel.x, texel.y)).rgb);
      float bl = luminance(texture2D(feedbackTexture, feedbackUV + vec2(-texel.x, -texel.y)).rgb);
      float br = luminance(texture2D(feedbackTexture, feedbackUV + vec2(texel.x, -texel.y)).rgb);
      float edge = abs(tl - br) + abs(tr - bl);
      edge = smoothstep(0.02, 0.2, edge);
      // Boost feedback where edges are detected
      feedback += feedback * edge * edgeGlow * 2.0;
    }

    // ─── Hue shift + saturation boost on feedback ──────────────
    if (hueShift != 0.0 || satBoost != 0.0) {
      vec3 hsv = rgb2hsv(feedback);
      hsv.x = fract(hsv.x + hueShift / 360.0);
      hsv.y = min(1.0, hsv.y * (1.0 + satBoost)); // boost saturation
      feedback = hsv2rgb(hsv);
    }

    // ─── Exponential decay curve ───────────────────────────────
    // decayCurve < 1: slow start, fast fade (organic)
    // decayCurve = 1: linear (classic)
    // decayCurve > 1: fast start, slow fade (persistent trails)
    float decayAmount = pow(decay, decayCurve);
    feedback *= decayAmount;
  }

  // ─── Blend modes ─────────────────────────────────────────────
  vec3 result;
  if (blendMode == 0) {
    // Additive — classic feedback, accumulates brightness
    result = current + feedback;
  } else if (blendMode == 1) {
    // Screen — softer than additive, prevents blowout
    result = blendScreen(current, feedback);
  } else if (blendMode == 2) {
    // Max (lighten) — clean trails, no accumulation
    result = max(current, feedback);
  } else {
    // Overlay — adds contrast to feedback
    result = blendOverlay(current, feedback);
  }

  // Prevent HDR blowout — soft clamp with knee
  result = result / (1.0 + max(vec3(0.0), result - 1.0) * 0.5);

  vec4 effectColor = vec4(result, inputColor.a);
  outputColor = mix(inputColor, effectColor, effectMix);
}
`

export interface FeedbackLoopParams {
  decay: number        // 0-0.99
  decayCurve: number   // 0.5-3.0 — exponential curve shape
  offsetX: number      // -0.1 to 0.1
  offsetY: number      // -0.1 to 0.1
  zoom: number         // 0.9-1.1
  rotation: number     // -15 to 15 degrees
  hueShift: number     // 0-360 degrees
  satBoost: number     // 0-0.5 — saturation boost per iteration
  blendMode: number    // 0=additive, 1=screen, 2=max, 3=overlay
  warpAmount: number   // 0-0.05 — organic UV distortion
  edgeGlow: number     // 0-1 — edge enhancement on feedback
  mix: number
}

export const DEFAULT_FEEDBACK_LOOP_PARAMS: FeedbackLoopParams = {
  decay: 0.92,
  decayCurve: 1.5,
  offsetX: 0,
  offsetY: 0,
  zoom: 1.02,
  rotation: 0.5,
  hueShift: 5,
  satBoost: 0.1,
  blendMode: 0,
  warpAmount: 0.005,
  edgeGlow: 0.0,
  mix: 1,
}

export class FeedbackLoopEffect extends Effect {
  private feedbackTarget: THREE.WebGLRenderTarget | null = null
  private tempTarget: THREE.WebGLRenderTarget | null = null
  private copyMaterial: THREE.ShaderMaterial | null = null
  private copyGeometry: THREE.PlaneGeometry | null = null
  private copyScene: THREE.Scene | null = null
  private copyCamera: THREE.OrthographicCamera | null = null
  private time: number = 0
  // True once captureFrame() has actually populated feedbackTarget with real
  // content. Gates hasFeedback so the shader never samples a freshly
  // (re-)initialized target before it has data — matters most after
  // releaseTargets() + re-enable (mirrors DatamoshEffect.hasCapturedFrame).
  private hasCapturedFrame: boolean = false

  constructor(params: Partial<FeedbackLoopParams> = {}) {
    const p = { ...DEFAULT_FEEDBACK_LOOP_PARAMS, ...params }

    super('FeedbackLoopEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['feedbackTexture', new THREE.Uniform(null)],
        ['decay', new THREE.Uniform(p.decay)],
        ['decayCurve', new THREE.Uniform(p.decayCurve)],
        ['offsetX', new THREE.Uniform(p.offsetX)],
        ['offsetY', new THREE.Uniform(p.offsetY)],
        ['zoom', new THREE.Uniform(p.zoom)],
        ['rotation', new THREE.Uniform(p.rotation)],
        ['hueShift', new THREE.Uniform(p.hueShift)],
        ['satBoost', new THREE.Uniform(p.satBoost)],
        ['blendMode', new THREE.Uniform(p.blendMode)],
        ['warpAmount', new THREE.Uniform(p.warpAmount)],
        ['edgeGlow', new THREE.Uniform(p.edgeGlow)],
        ['hasFeedback', new THREE.Uniform(false)],
        ['effectMix', new THREE.Uniform(p.mix)],
        ['resolution', new THREE.Uniform(new THREE.Vector2(1920, 1080))],
        ['time', new THREE.Uniform(0)],
      ]),
    })
  }

  initialize(renderer: THREE.WebGLRenderer, alpha: boolean, frameBufferType: number) {
    super.initialize?.(renderer, alpha, frameBufferType)
    if (this.feedbackTarget) return

    const size = renderer.getSize(new THREE.Vector2())

    this.feedbackTarget = new THREE.WebGLRenderTarget(size.x, size.y, {
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

    this.uniforms.get('resolution')!.value.set(size.x, size.y)

    // Setup copy material for ping-pong
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

  update(_renderer: THREE.WebGLRenderer, _inputBuffer: THREE.WebGLRenderTarget, deltaTime?: number) {
    if (!this.feedbackTarget || !this.tempTarget || !this.copyMaterial || !this.copyScene || !this.copyCamera) {
      return
    }

    this.time += deltaTime || 0.016
    this.uniforms.get('time')!.value = this.time

    // Set feedback texture for next frame
    this.uniforms.get('feedbackTexture')!.value = this.feedbackTarget.texture
    this.uniforms.get('hasFeedback')!.value = this.hasCapturedFrame
  }

  // Call this after the main render pass
  captureFrame(renderer: THREE.WebGLRenderer, outputBuffer: THREE.WebGLRenderTarget) {
    if (!this.feedbackTarget || !this.tempTarget || !this.copyMaterial || !this.copyScene || !this.copyCamera) {
      return
    }

    // Copy current output to feedback buffer
    this.copyMaterial.uniforms.tDiffuse.value = outputBuffer.texture
    renderer.setRenderTarget(this.feedbackTarget)
    renderer.render(this.copyScene, this.copyCamera)
    renderer.setRenderTarget(null)

    this.hasCapturedFrame = true
  }

  setSize(width: number, height: number) {
    super.setSize?.(width, height)
    this.feedbackTarget?.setSize(width, height)
    this.tempTarget?.setSize(width, height)
    this.uniforms.get('resolution')!.value.set(width, height)
  }

  updateParams(params: Partial<FeedbackLoopParams>) {
    if (params.decay !== undefined) this.uniforms.get('decay')!.value = params.decay
    if (params.decayCurve !== undefined) this.uniforms.get('decayCurve')!.value = params.decayCurve
    if (params.offsetX !== undefined) this.uniforms.get('offsetX')!.value = params.offsetX
    if (params.offsetY !== undefined) this.uniforms.get('offsetY')!.value = params.offsetY
    if (params.zoom !== undefined) this.uniforms.get('zoom')!.value = params.zoom
    if (params.rotation !== undefined) this.uniforms.get('rotation')!.value = params.rotation
    if (params.hueShift !== undefined) this.uniforms.get('hueShift')!.value = params.hueShift
    if (params.satBoost !== undefined) this.uniforms.get('satBoost')!.value = params.satBoost
    if (params.blendMode !== undefined) this.uniforms.get('blendMode')!.value = params.blendMode
    if (params.warpAmount !== undefined) this.uniforms.get('warpAmount')!.value = params.warpAmount
    if (params.edgeGlow !== undefined) this.uniforms.get('edgeGlow')!.value = params.edgeGlow
    if (params.mix !== undefined) this.uniforms.get('effectMix')!.value = params.mix
  }

  // Release ALL GPU resources allocated in initialize() when the effect is
  // disabled — targets, materials, and geometry. three.js only frees
  // compiled programs/VBOs via .dispose(), never via GC, so leaving any of
  // these orphaned while a guarded initialize() re-runs (and unconditionally
  // recreates them) leaks GPU resources on every disable/enable cycle.
  releaseTargets() {
    this.feedbackTarget?.dispose(); this.feedbackTarget = null
    this.tempTarget?.dispose(); this.tempTarget = null
    this.copyMaterial?.dispose(); this.copyMaterial = null
    this.copyGeometry?.dispose(); this.copyGeometry = null
    this.copyScene = null
    this.copyCamera = null
    this.hasCapturedFrame = false
    this.uniforms.get('hasFeedback')!.value = false
  }

  dispose() {
    super.dispose()
    this.feedbackTarget?.dispose()
    this.tempTarget?.dispose()
    this.copyMaterial?.dispose()
    this.copyGeometry?.dispose()
  }
}
