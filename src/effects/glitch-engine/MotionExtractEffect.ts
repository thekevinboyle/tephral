import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

const fragmentShader = `
uniform sampler2D historyTexture0;
uniform sampler2D historyTexture1;
uniform sampler2D historyTexture2;
uniform sampler2D historyTexture3;
uniform float threshold;
uniform float amplify;
uniform int frameCount;
uniform bool showOriginal;
uniform float originalMix;
uniform bool hasHistory;

float luminance(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 current = inputColor.rgb;

  if (!hasHistory) {
    outputColor = inputColor;
    return;
  }

  // Sample history frames
  vec3 h0 = texture2D(historyTexture0, uv).rgb;
  vec3 h1 = texture2D(historyTexture1, uv).rgb;
  vec3 h2 = texture2D(historyTexture2, uv).rgb;
  vec3 h3 = texture2D(historyTexture3, uv).rgb;

  // Calculate average of history (the "static" reference)
  vec3 avgHistory;
  if (frameCount == 2) {
    avgHistory = h0;
  } else if (frameCount == 3) {
    avgHistory = (h0 + h1) / 2.0;
  } else if (frameCount == 4) {
    avgHistory = (h0 + h1 + h2) / 3.0;
  } else {
    avgHistory = (h0 + h1 + h2 + h3) / 4.0;
  }

  // Calculate difference from average
  vec3 diff = abs(current - avgHistory);
  float motion = max(max(diff.r, diff.g), diff.b);

  // Apply threshold and amplification
  motion = smoothstep(threshold * 0.5, threshold, motion);
  motion = pow(motion, 1.0 / amplify) * amplify;
  motion = clamp(motion, 0.0, 1.0);

  // Extract only the motion
  vec3 motionColor = diff * amplify;
  motionColor = clamp(motionColor, 0.0, 1.0);

  // Output
  vec3 result;
  if (showOriginal) {
    // Blend motion with original
    result = mix(motionColor, current, originalMix);
  } else {
    // Show only motion
    result = motionColor;
  }

  outputColor = vec4(result, inputColor.a);
}
`

export interface MotionExtractParams {
  threshold: number
  frameCount: number
  amplify: number
  showOriginal: boolean
  originalMix: number
}

export const DEFAULT_MOTION_EXTRACT_PARAMS: MotionExtractParams = {
  threshold: 0.05,
  frameCount: 3,
  amplify: 2,
  showOriginal: false,
  originalMix: 0,
}

export class MotionExtractEffect extends Effect {
  private historyTargets: THREE.WebGLRenderTarget[] = []
  private historyIndex = 0
  private copyMaterial: THREE.ShaderMaterial | null = null
  private copyScene: THREE.Scene | null = null
  private copyCamera: THREE.OrthographicCamera | null = null
  private framesSinceInit = 0

  constructor(params: Partial<MotionExtractParams> = {}) {
    const p = { ...DEFAULT_MOTION_EXTRACT_PARAMS, ...params }

    super('MotionExtractEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['historyTexture0', new THREE.Uniform(null)],
        ['historyTexture1', new THREE.Uniform(null)],
        ['historyTexture2', new THREE.Uniform(null)],
        ['historyTexture3', new THREE.Uniform(null)],
        ['threshold', new THREE.Uniform(p.threshold)],
        ['amplify', new THREE.Uniform(p.amplify)],
        ['frameCount', new THREE.Uniform(p.frameCount)],
        ['showOriginal', new THREE.Uniform(p.showOriginal)],
        ['originalMix', new THREE.Uniform(p.originalMix)],
        ['hasHistory', new THREE.Uniform(false)],
      ]),
    })
  }

  initialize(renderer: THREE.WebGLRenderer, alpha: boolean, frameBufferType: number) {
    super.initialize?.(renderer, alpha, frameBufferType)

    const size = renderer.getSize(new THREE.Vector2())

    // Create 4 history buffers
    for (let i = 0; i < 4; i++) {
      this.historyTargets.push(new THREE.WebGLRenderTarget(size.x, size.y, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
      }))
    }

    // Setup copy material
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
    // Update uniforms with history textures
    for (let i = 0; i < 4; i++) {
      const idx = (this.historyIndex - i - 1 + 4) % 4
      this.uniforms.get(`historyTexture${i}`)!.value = this.historyTargets[idx].texture
    }

    this.uniforms.get('hasHistory')!.value = this.framesSinceInit >= 4
  }

  captureFrame(renderer: THREE.WebGLRenderer, inputBuffer: THREE.WebGLRenderTarget) {
    if (!this.copyMaterial || !this.copyScene || !this.copyCamera) return

    // Copy current frame to next history slot
    this.copyMaterial.uniforms.tDiffuse.value = inputBuffer.texture
    renderer.setRenderTarget(this.historyTargets[this.historyIndex])
    renderer.render(this.copyScene, this.copyCamera)
    renderer.setRenderTarget(null)

    this.historyIndex = (this.historyIndex + 1) % 4
    this.framesSinceInit++
  }

  setSize(width: number, height: number) {
    super.setSize?.(width, height)
    for (const target of this.historyTargets) {
      target.setSize(width, height)
    }
  }

  updateParams(params: Partial<MotionExtractParams>) {
    if (params.threshold !== undefined) this.uniforms.get('threshold')!.value = params.threshold
    if (params.amplify !== undefined) this.uniforms.get('amplify')!.value = params.amplify
    if (params.frameCount !== undefined) this.uniforms.get('frameCount')!.value = params.frameCount
    if (params.showOriginal !== undefined) this.uniforms.get('showOriginal')!.value = params.showOriginal
    if (params.originalMix !== undefined) this.uniforms.get('originalMix')!.value = params.originalMix
  }

  dispose() {
    super.dispose()
    for (const target of this.historyTargets) {
      target.dispose()
    }
    this.copyMaterial?.dispose()
  }
}
