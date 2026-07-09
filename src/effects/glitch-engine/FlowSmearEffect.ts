import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import { COLOR_UTILS_GLSL } from './glsl-utils'

// ═══════════════════════════════════════════════════════════════════════════
// FLOW SMEAR - TouchDesigner-style painterly optical-flow smear.
// Moving regions drag decaying paint along the luminance-gradient direction;
// flat/static regions stay crisp because the blend factor is ~0 wherever
// there's neither temporal motion nor spatial contrast to push against.
// ═══════════════════════════════════════════════════════════════════════════
const fragmentShader = COLOR_UTILS_GLSL + /* glsl */ `
uniform sampler2D prevFrameTexture;
uniform sampler2D accumTexture;
uniform float strength;
uniform float decay;
uniform float blur;
uniform float structure;
uniform vec2 resolution;
uniform bool hasCapturedFrame;
uniform float effectMix;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  if (!hasCapturedFrame) {
    outputColor = inputColor;
    return;
  }

  vec3 current = inputColor.rgb;
  vec2 texel = 1.0 / resolution;

  // ─── Temporal motion: 4-tap luminance diff vs prevFrame ─────────────
  // Averaging the diff over 4 neighboring taps (rather than the single
  // center pixel) rejects single-texel sensor/dither noise so the smear
  // doesn't flicker on a static frame.
  vec2 tapOffsets[4] = vec2[4](
    vec2(texel.x, 0.0), vec2(-texel.x, 0.0),
    vec2(0.0, texel.y), vec2(0.0, -texel.y)
  );
  float temporalMotion = 0.0;
  for (int i = 0; i < 4; i++) {
    float lumCur = luminance(texture2D(inputBuffer, uv + tapOffsets[i]).rgb);
    float lumPrev = luminance(texture2D(prevFrameTexture, uv + tapOffsets[i]).rgb);
    temporalMotion += abs(lumCur - lumPrev);
  }
  temporalMotion *= 0.25;

  // ─── Direction: luminance gradient of the current frame ─────────────
  float lumL = luminance(texture2D(inputBuffer, uv - vec2(texel.x, 0.0)).rgb);
  float lumR = luminance(texture2D(inputBuffer, uv + vec2(texel.x, 0.0)).rgb);
  float lumD = luminance(texture2D(inputBuffer, uv - vec2(0.0, texel.y)).rgb);
  float lumU = luminance(texture2D(inputBuffer, uv + vec2(0.0, texel.y)).rgb);
  vec2 gradient = vec2(lumR - lumL, lumU - lumD);
  float gradMag = length(gradient);
  vec2 direction = gradMag > 0.0001 ? gradient / gradMag : vec2(0.0);

  // Structural component: contours carry a small resting "wet paint" push
  // along their own gradient even with zero temporal motion — a real flow
  // field has nothing to push against on a frozen frame, so real optical
  // flow effects fake the at-rest look by riding image contrast instead.
  // Actual inter-frame motion (temporalMotion) dominates this by roughly an
  // order of magnitude whenever the source is genuinely moving.
  float motionMagnitude = temporalMotion + gradMag * structure;

  // ─── Sample the accumulation buffer displaced along the flow ────────
  vec2 displacedUV = clamp(uv + direction * motionMagnitude * strength * texel, 0.001, 0.999);

  vec3 accumSample;
  if (blur > 0.0) {
    vec2 blurTexel = texel * blur * 2.0;
    vec3 center = texture2D(accumTexture, displacedUV).rgb;
    vec3 s1 = texture2D(accumTexture, clamp(displacedUV + vec2(blurTexel.x, 0.0), 0.001, 0.999)).rgb;
    vec3 s2 = texture2D(accumTexture, clamp(displacedUV - vec2(blurTexel.x, 0.0), 0.001, 0.999)).rgb;
    vec3 s3 = texture2D(accumTexture, clamp(displacedUV + vec2(0.0, blurTexel.y), 0.001, 0.999)).rgb;
    vec3 s4 = texture2D(accumTexture, clamp(displacedUV - vec2(0.0, blurTexel.y), 0.001, 0.999)).rgb;
    accumSample = (center * 2.0 + s1 + s2 + s3 + s4) / 6.0;
  } else {
    accumSample = texture2D(accumTexture, displacedUV).rgb;
  }

  vec3 displaced = accumSample * decay;

  // ─── Composite: max-blend keeps painted streaks visible over the sharp
  // frame; the blend factor rides motionMagnitude so flat/still regions
  // (motionMagnitude ~ 0) resolve to the crisp current frame.
  float blendAmt = smoothstep(0.0, 0.05, motionMagnitude);
  vec3 painterly = max(current, displaced);
  vec3 result = mix(current, painterly, blendAmt);

  vec4 effectColor = vec4(result, inputColor.a);
  outputColor = mix(inputColor, effectColor, effectMix);
}
`

export interface FlowSmearParams {
  strength: number  // 0-100
  decay: number      // 0-1
  blur: number        // 0-1
  structure: number    // 0-1, resting painterly push from image contrast
  mix: number          // 0-1, dry/wet
}

export const DEFAULT_FLOW_SMEAR_PARAMS: FlowSmearParams = {
  strength: 40,
  decay: 0.9,
  blur: 0.3,
  structure: 0.15,
  mix: 1,
}

export class FlowSmearEffect extends Effect {
  // Two live targets: last frame (motion reference) and the smear
  // accumulation buffer. No dead `tempTarget` — this effect never needs a
  // ping-pong swap target, only these two.
  private prevFrameTarget: THREE.WebGLRenderTarget | null = null
  private accumTarget: THREE.WebGLRenderTarget | null = null
  private copyMaterial: THREE.ShaderMaterial | null = null
  private copyGeometry: THREE.PlaneGeometry | null = null
  private copyScene: THREE.Scene | null = null
  private copyCamera: THREE.OrthographicCamera | null = null
  // True once captureFrame() has actually populated the targets with real
  // content. Gates hasCapturedFrame so the shader never samples a freshly
  // (re-)initialized target before it has data — matters most after
  // releaseTargets() + re-enable.
  private hasCapturedFrame: boolean = false

  constructor(params: Partial<FlowSmearParams> = {}) {
    const p = { ...DEFAULT_FLOW_SMEAR_PARAMS, ...params }

    super('FlowSmearEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['prevFrameTexture', new THREE.Uniform(null)],
        ['accumTexture', new THREE.Uniform(null)],
        ['strength', new THREE.Uniform(p.strength)],
        ['decay', new THREE.Uniform(p.decay)],
        ['blur', new THREE.Uniform(p.blur)],
        ['structure', new THREE.Uniform(p.structure)],
        ['resolution', new THREE.Uniform(new THREE.Vector2(1, 1))],
        ['hasCapturedFrame', new THREE.Uniform(false)],
        ['effectMix', new THREE.Uniform(p.mix)],
      ]),
    })
  }

  initialize(renderer: THREE.WebGLRenderer, alpha: boolean, frameBufferType: number) {
    super.initialize?.(renderer, alpha, frameBufferType)
    if (this.prevFrameTarget) return

    const size = renderer.getSize(new THREE.Vector2())
    const options = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
    }

    this.prevFrameTarget = new THREE.WebGLRenderTarget(size.x, size.y, options)
    this.accumTarget = new THREE.WebGLRenderTarget(size.x, size.y, options)

    this.uniforms.get('resolution')!.value.set(size.x, size.y)

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
    if (!this.prevFrameTarget || !this.accumTarget) return

    this.uniforms.get('prevFrameTexture')!.value = this.prevFrameTarget.texture
    this.uniforms.get('accumTexture')!.value = this.accumTarget.texture
    this.uniforms.get('hasCapturedFrame')!.value = this.hasCapturedFrame
  }

  // Call this after the main render pass. Two copy passes: the composited
  // output becomes both next frame's motion reference (prevFrameTarget) and
  // the new accumulation state (accumTarget) — since this frame's output
  // already carries the displaced+decayed paint blended in, capturing it
  // into accumTarget is what makes the smear recurse/decay across frames.
  captureFrame(renderer: THREE.WebGLRenderer, outputBuffer: THREE.WebGLRenderTarget) {
    if (!this.prevFrameTarget || !this.accumTarget || !this.copyMaterial || !this.copyScene || !this.copyCamera) return

    this.copyMaterial.uniforms.tDiffuse.value = outputBuffer.texture

    renderer.setRenderTarget(this.prevFrameTarget)
    renderer.render(this.copyScene, this.copyCamera)

    renderer.setRenderTarget(this.accumTarget)
    renderer.render(this.copyScene, this.copyCamera)

    renderer.setRenderTarget(null)

    this.hasCapturedFrame = true
  }

  setSize(width: number, height: number) {
    super.setSize?.(width, height)
    this.prevFrameTarget?.setSize(width, height)
    this.accumTarget?.setSize(width, height)
    this.uniforms.get('resolution')!.value.set(width, height)
  }

  updateParams(params: Partial<FlowSmearParams>) {
    if (params.strength !== undefined) this.uniforms.get('strength')!.value = params.strength
    if (params.decay !== undefined) this.uniforms.get('decay')!.value = params.decay
    if (params.blur !== undefined) this.uniforms.get('blur')!.value = params.blur
    if (params.structure !== undefined) this.uniforms.get('structure')!.value = params.structure
    if (params.mix !== undefined) this.uniforms.get('effectMix')!.value = params.mix
  }

  // Release ALL GPU resources allocated in initialize() when the effect is
  // disabled — targets, materials, and geometry. three.js only frees
  // compiled programs/VBOs via .dispose(), never via GC, so leaving any of
  // these orphaned while a guarded initialize() re-runs (and unconditionally
  // recreates them) leaks GPU resources on every disable/enable cycle.
  releaseTargets() {
    this.prevFrameTarget?.dispose(); this.prevFrameTarget = null
    this.accumTarget?.dispose(); this.accumTarget = null
    this.copyMaterial?.dispose(); this.copyMaterial = null
    this.copyGeometry?.dispose(); this.copyGeometry = null
    this.copyScene = null
    this.copyCamera = null
    this.hasCapturedFrame = false
    this.uniforms.get('hasCapturedFrame')!.value = false
  }

  dispose() {
    super.dispose()
    this.prevFrameTarget?.dispose()
    this.accumTarget?.dispose()
    this.copyMaterial?.dispose()
    this.copyGeometry?.dispose()
  }
}
