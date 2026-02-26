import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import { COLOR_UTILS_GLSL } from './glsl-utils'

const fragmentShader = COLOR_UTILS_GLSL + /* glsl */ `
uniform sampler2D trailTexture;
uniform float decay;
uniform float decayCurve;
uniform float offset;
uniform int blendMode;
uniform float trailZoom;
uniform float trailRotation;
uniform bool colorShift;
uniform float hueAmount;
uniform float saturationDecay;
uniform bool hasTrail;
uniform float effectMix;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 current = inputColor.rgb;

  if (!hasTrail) {
    outputColor = inputColor;
    return;
  }

  // ─── Transform UV for trail sampling (spatial feedback) ──────
  vec2 trailUV = uv;

  // Directional offset
  trailUV += vec2(offset, 0.0);

  // Zoom from center — creates tunnel/zoom trails
  if (trailZoom != 1.0) {
    trailUV = (trailUV - 0.5) / trailZoom + 0.5;
  }

  // Rotation — creates spiral trails
  if (trailRotation != 0.0) {
    trailUV = rotateUV(trailUV, trailRotation * 3.14159265 / 180.0);
  }

  // Soft edge fade
  vec2 edgeDist = min(trailUV, 1.0 - trailUV);
  float edgeFade = smoothstep(0.0, 0.02, edgeDist.x) * smoothstep(0.0, 0.02, edgeDist.y);

  vec3 trail = texture2D(trailTexture, clamp(trailUV, 0.001, 0.999)).rgb;
  trail *= edgeFade;

  // ─── Color evolution on trail ────────────────────────────────
  if (colorShift && (hueAmount > 0.0 || saturationDecay != 1.0)) {
    vec3 hsv = rgb2hsv(trail);
    hsv.x = fract(hsv.x + hueAmount / 360.0);
    hsv.y = clamp(hsv.y * saturationDecay, 0.0, 1.0);
    trail = hsv2rgb(hsv);
  }

  // ─── Exponential decay curve ─────────────────────────────────
  float decayAmount = pow(decay, decayCurve);
  trail *= decayAmount;

  // ─── Blend modes ─────────────────────────────────────────────
  vec3 result;
  if (blendMode == 0) {
    // Max (lighten) — clean trails, default
    result = max(current, trail);
  } else if (blendMode == 1) {
    // Additive — accumulates brightness, glowy
    result = current + trail;
    // Soft HDR clamp
    result = result / (1.0 + max(vec3(0.0), result - 1.0) * 0.5);
  } else {
    // Screen — softer than additive, no blowout
    result = blendScreen(current, trail);
  }

  vec4 effectColor = vec4(result, inputColor.a);
  outputColor = mix(inputColor, effectColor, effectMix);
}
`

export interface EchoTrailParams {
  trailCount: number
  decay: number           // 0.8-0.99
  decayCurve: number      // 0.5-3.0
  offset: number
  blendMode: number       // 0=max, 1=additive, 2=screen
  trailZoom: number       // 0.98-1.02
  trailRotation: number   // -5 to 5 degrees
  colorShift: boolean
  hueAmount: number       // 0-360
  saturationDecay: number // 0.9-1.1
  mix: number
}

export const DEFAULT_ECHO_TRAIL_PARAMS: EchoTrailParams = {
  trailCount: 6,
  decay: 0.9,
  decayCurve: 1.2,
  offset: 0,
  blendMode: 0,
  trailZoom: 1.0,
  trailRotation: 0,
  colorShift: false,
  hueAmount: 15,
  saturationDecay: 1.0,
  mix: 1,
}

export class EchoTrailEffect extends Effect {
  private trailTarget: THREE.WebGLRenderTarget | null = null
  private tempTarget: THREE.WebGLRenderTarget | null = null
  private copyMaterial: THREE.ShaderMaterial | null = null
  private copyScene: THREE.Scene | null = null
  private copyCamera: THREE.OrthographicCamera | null = null
  private hasInitialized = false

  constructor(params: Partial<EchoTrailParams> = {}) {
    const p = { ...DEFAULT_ECHO_TRAIL_PARAMS, ...params }

    super('EchoTrailEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['trailTexture', new THREE.Uniform(null)],
        ['decay', new THREE.Uniform(p.decay)],
        ['decayCurve', new THREE.Uniform(p.decayCurve)],
        ['offset', new THREE.Uniform(p.offset)],
        ['blendMode', new THREE.Uniform(p.blendMode)],
        ['trailZoom', new THREE.Uniform(p.trailZoom)],
        ['trailRotation', new THREE.Uniform(p.trailRotation)],
        ['colorShift', new THREE.Uniform(p.colorShift)],
        ['hueAmount', new THREE.Uniform(p.hueAmount)],
        ['saturationDecay', new THREE.Uniform(p.saturationDecay)],
        ['hasTrail', new THREE.Uniform(false)],
        ['effectMix', new THREE.Uniform(p.mix)],
      ]),
    })
  }

  initialize(renderer: THREE.WebGLRenderer, alpha: boolean, frameBufferType: number) {
    super.initialize?.(renderer, alpha, frameBufferType)

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
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.copyMaterial)
    this.copyScene.add(quad)
  }

  update(_renderer: THREE.WebGLRenderer, _inputBuffer: THREE.WebGLRenderTarget, _deltaTime?: number) {
    if (!this.trailTarget) return

    this.uniforms.get('trailTexture')!.value = this.trailTarget.texture
    this.uniforms.get('hasTrail')!.value = this.hasInitialized
  }

  captureFrame(renderer: THREE.WebGLRenderer, outputBuffer: THREE.WebGLRenderTarget) {
    if (!this.trailTarget || !this.copyMaterial || !this.copyScene || !this.copyCamera) return

    // Copy output to trail buffer (this becomes the trail for next frame)
    this.copyMaterial.uniforms.tDiffuse.value = outputBuffer.texture
    renderer.setRenderTarget(this.trailTarget)
    renderer.render(this.copyScene, this.copyCamera)
    renderer.setRenderTarget(null)

    this.hasInitialized = true
  }

  setSize(width: number, height: number) {
    super.setSize?.(width, height)
    this.trailTarget?.setSize(width, height)
    this.tempTarget?.setSize(width, height)
  }

  updateParams(params: Partial<EchoTrailParams>) {
    if (params.decay !== undefined) this.uniforms.get('decay')!.value = params.decay
    if (params.decayCurve !== undefined) this.uniforms.get('decayCurve')!.value = params.decayCurve
    if (params.offset !== undefined) this.uniforms.get('offset')!.value = params.offset
    if (params.blendMode !== undefined) this.uniforms.get('blendMode')!.value = params.blendMode
    if (params.trailZoom !== undefined) this.uniforms.get('trailZoom')!.value = params.trailZoom
    if (params.trailRotation !== undefined) this.uniforms.get('trailRotation')!.value = params.trailRotation
    if (params.colorShift !== undefined) this.uniforms.get('colorShift')!.value = params.colorShift
    if (params.hueAmount !== undefined) this.uniforms.get('hueAmount')!.value = params.hueAmount
    if (params.saturationDecay !== undefined) this.uniforms.get('saturationDecay')!.value = params.saturationDecay
    if (params.mix !== undefined) this.uniforms.get('effectMix')!.value = params.mix
  }

  clearTrail() {
    this.hasInitialized = false
  }

  dispose() {
    super.dispose()
    this.trailTarget?.dispose()
    this.tempTarget?.dispose()
    this.copyMaterial?.dispose()
  }
}
