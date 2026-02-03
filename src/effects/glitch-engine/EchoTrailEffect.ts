import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

const fragmentShader = `
uniform sampler2D trailTexture;
uniform float decay;
uniform float offset;
uniform bool colorShift;
uniform float hueAmount;
uniform bool hasTrail;

vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 current = inputColor.rgb;

  if (!hasTrail) {
    outputColor = inputColor;
    return;
  }

  // Sample trail with slight offset
  vec2 trailUV = uv + vec2(offset, 0.0);
  vec3 trail = texture2D(trailTexture, trailUV).rgb;

  // Apply color shift to trail
  if (colorShift && hueAmount > 0.0) {
    vec3 hsv = rgb2hsv(trail);
    hsv.x = fract(hsv.x + hueAmount / 360.0);
    trail = hsv2rgb(hsv);
  }

  // Decay the trail
  trail *= decay;

  // Composite: current over decayed trail
  // Use max blend for additive ghosting effect
  vec3 result = max(current, trail);

  outputColor = vec4(result, inputColor.a);
}
`

export interface EchoTrailParams {
  trailCount: number
  decay: number
  offset: number
  colorShift: boolean
  hueAmount: number
}

export const DEFAULT_ECHO_TRAIL_PARAMS: EchoTrailParams = {
  trailCount: 6,
  decay: 0.85,
  offset: 0,
  colorShift: false,
  hueAmount: 15,
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
        ['offset', new THREE.Uniform(p.offset)],
        ['colorShift', new THREE.Uniform(p.colorShift)],
        ['hueAmount', new THREE.Uniform(p.hueAmount)],
        ['hasTrail', new THREE.Uniform(false)],
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
    })

    this.tempTarget = new THREE.WebGLRenderTarget(size.x, size.y, {
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
    if (params.offset !== undefined) this.uniforms.get('offset')!.value = params.offset
    if (params.colorShift !== undefined) this.uniforms.get('colorShift')!.value = params.colorShift
    if (params.hueAmount !== undefined) this.uniforms.get('hueAmount')!.value = params.hueAmount
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
