import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

const fragmentShader = `
uniform sampler2D feedbackTexture;
uniform float decay;
uniform float offsetX;
uniform float offsetY;
uniform float zoom;
uniform float rotation;
uniform float hueShift;
uniform bool hasFeedback;

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

vec2 rotateUV(vec2 uv, float angle) {
  vec2 center = vec2(0.5);
  uv -= center;
  float s = sin(angle);
  float c = cos(angle);
  uv = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);
  return uv + center;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 current = inputColor.rgb;

  if (!hasFeedback) {
    outputColor = inputColor;
    return;
  }

  // Transform UV for feedback sampling
  vec2 feedbackUV = uv;

  // Offset
  feedbackUV += vec2(offsetX, offsetY);

  // Zoom from center
  feedbackUV = (feedbackUV - 0.5) / zoom + 0.5;

  // Rotation
  if (rotation != 0.0) {
    feedbackUV = rotateUV(feedbackUV, rotation * 3.14159 / 180.0);
  }

  // Sample previous frame if in bounds
  vec3 feedback = vec3(0.0);
  if (feedbackUV.x >= 0.0 && feedbackUV.x <= 1.0 && feedbackUV.y >= 0.0 && feedbackUV.y <= 1.0) {
    feedback = texture2D(feedbackTexture, feedbackUV).rgb;

    // Hue shift the feedback
    if (hueShift != 0.0) {
      vec3 hsv = rgb2hsv(feedback);
      hsv.x = fract(hsv.x + hueShift / 360.0);
      feedback = hsv2rgb(hsv);
    }
  }

  // Mix current with decayed feedback
  vec3 result = current + feedback * decay;

  outputColor = vec4(result, inputColor.a);
}
`

export interface FeedbackLoopParams {
  decay: number      // 0-1
  offsetX: number    // -0.1 to 0.1
  offsetY: number    // -0.1 to 0.1
  zoom: number       // 0.95-1.05
  rotation: number   // -5 to 5 degrees
  hueShift: number   // 0-30 degrees
}

export const DEFAULT_FEEDBACK_LOOP_PARAMS: FeedbackLoopParams = {
  decay: 0.9,
  offsetX: 0,
  offsetY: 0,
  zoom: 1.0,
  rotation: 0,
  hueShift: 0,
}

export class FeedbackLoopEffect extends Effect {
  private feedbackTarget: THREE.WebGLRenderTarget | null = null
  private tempTarget: THREE.WebGLRenderTarget | null = null
  private copyMaterial: THREE.ShaderMaterial | null = null
  private copyScene: THREE.Scene | null = null
  private copyCamera: THREE.OrthographicCamera | null = null

  constructor(params: Partial<FeedbackLoopParams> = {}) {
    const p = { ...DEFAULT_FEEDBACK_LOOP_PARAMS, ...params }

    super('FeedbackLoopEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['feedbackTexture', new THREE.Uniform(null)],
        ['decay', new THREE.Uniform(p.decay)],
        ['offsetX', new THREE.Uniform(p.offsetX)],
        ['offsetY', new THREE.Uniform(p.offsetY)],
        ['zoom', new THREE.Uniform(p.zoom)],
        ['rotation', new THREE.Uniform(p.rotation)],
        ['hueShift', new THREE.Uniform(p.hueShift)],
        ['hasFeedback', new THREE.Uniform(false)],
      ]),
    })
  }

  initialize(renderer: THREE.WebGLRenderer, alpha: boolean, frameBufferType: number) {
    super.initialize?.(renderer, alpha, frameBufferType)

    const size = renderer.getSize(new THREE.Vector2())

    this.feedbackTarget = new THREE.WebGLRenderTarget(size.x, size.y, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    })

    this.tempTarget = new THREE.WebGLRenderTarget(size.x, size.y, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    })

    // Setup copy material for ping-pong
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
    if (!this.feedbackTarget || !this.tempTarget || !this.copyMaterial || !this.copyScene || !this.copyCamera) {
      return
    }

    // Set feedback texture for next frame
    this.uniforms.get('feedbackTexture')!.value = this.feedbackTarget.texture
    this.uniforms.get('hasFeedback')!.value = true
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
  }

  setSize(width: number, height: number) {
    super.setSize?.(width, height)
    this.feedbackTarget?.setSize(width, height)
    this.tempTarget?.setSize(width, height)
  }

  updateParams(params: Partial<FeedbackLoopParams>) {
    if (params.decay !== undefined) this.uniforms.get('decay')!.value = params.decay
    if (params.offsetX !== undefined) this.uniforms.get('offsetX')!.value = params.offsetX
    if (params.offsetY !== undefined) this.uniforms.get('offsetY')!.value = params.offsetY
    if (params.zoom !== undefined) this.uniforms.get('zoom')!.value = params.zoom
    if (params.rotation !== undefined) this.uniforms.get('rotation')!.value = params.rotation
    if (params.hueShift !== undefined) this.uniforms.get('hueShift')!.value = params.hueShift
  }

  dispose() {
    super.dispose()
    this.feedbackTarget?.dispose()
    this.tempTarget?.dispose()
    this.copyMaterial?.dispose()
  }
}
