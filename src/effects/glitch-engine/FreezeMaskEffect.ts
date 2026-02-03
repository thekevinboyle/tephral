import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'

const fragmentShader = `
uniform sampler2D freezeTexture;
uniform float freezeThreshold;
uniform float updateSpeed;
uniform bool showFreeze;
uniform bool invertMask;
uniform bool hasFreeze;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 current = inputColor.rgb;

  if (!hasFreeze) {
    outputColor = inputColor;
    return;
  }

  vec3 frozen = texture2D(freezeTexture, uv).rgb;

  // Calculate difference between current and frozen reference
  vec3 diff = abs(current - frozen);
  float motion = max(max(diff.r, diff.g), diff.b);

  // Create mask: 1.0 = motion, 0.0 = static
  float mask = smoothstep(freezeThreshold * 0.5, freezeThreshold, motion);

  // Invert if requested (show static instead of motion)
  if (invertMask) {
    mask = 1.0 - mask;
  }

  vec3 result;
  if (showFreeze) {
    // Blend: motion areas show current, static areas show frozen
    result = mix(frozen, current, mask);
  } else {
    // Only show motion areas, static becomes black
    result = current * mask;
  }

  outputColor = vec4(result, inputColor.a);
}
`

// Shader for updating freeze reference with slow blend
const updateShader = `
uniform sampler2D currentTexture;
uniform sampler2D freezeTexture;
uniform float updateSpeed;
uniform bool firstFrame;

varying vec2 vUv;

void main() {
  vec3 current = texture2D(currentTexture, vUv).rgb;
  vec3 frozen = texture2D(freezeTexture, vUv).rgb;

  // Slowly blend towards current (static areas converge)
  vec3 result = firstFrame ? current : mix(frozen, current, updateSpeed);

  gl_FragColor = vec4(result, 1.0);
}
`

export interface FreezeMaskParams {
  freezeThreshold: number
  updateSpeed: number
  showFreeze: boolean
  invertMask: boolean
}

export const DEFAULT_FREEZE_MASK_PARAMS: FreezeMaskParams = {
  freezeThreshold: 0.03,
  updateSpeed: 0.01,
  showFreeze: true,
  invertMask: false,
}

export class FreezeMaskEffect extends Effect {
  private freezeTarget: THREE.WebGLRenderTarget | null = null
  private tempTarget: THREE.WebGLRenderTarget | null = null
  private updateMaterial: THREE.ShaderMaterial | null = null
  private updateScene: THREE.Scene | null = null
  private updateCamera: THREE.OrthographicCamera | null = null
  private hasInitialized = false
  private currentUpdateSpeed: number

  constructor(params: Partial<FreezeMaskParams> = {}) {
    const p = { ...DEFAULT_FREEZE_MASK_PARAMS, ...params }

    super('FreezeMaskEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['freezeTexture', new THREE.Uniform(null)],
        ['freezeThreshold', new THREE.Uniform(p.freezeThreshold)],
        ['updateSpeed', new THREE.Uniform(p.updateSpeed)],
        ['showFreeze', new THREE.Uniform(p.showFreeze)],
        ['invertMask', new THREE.Uniform(p.invertMask)],
        ['hasFreeze', new THREE.Uniform(false)],
      ]),
    })

    this.currentUpdateSpeed = p.updateSpeed
  }

  initialize(renderer: THREE.WebGLRenderer, alpha: boolean, frameBufferType: number) {
    super.initialize?.(renderer, alpha, frameBufferType)

    const size = renderer.getSize(new THREE.Vector2())

    this.freezeTarget = new THREE.WebGLRenderTarget(size.x, size.y, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    })

    this.tempTarget = new THREE.WebGLRenderTarget(size.x, size.y, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    })

    this.updateMaterial = new THREE.ShaderMaterial({
      uniforms: {
        currentTexture: { value: null },
        freezeTexture: { value: null },
        updateSpeed: { value: this.currentUpdateSpeed },
        firstFrame: { value: true },
      },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: updateShader,
    })

    this.updateScene = new THREE.Scene()
    this.updateCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.updateMaterial)
    this.updateScene.add(quad)
  }

  update(_renderer: THREE.WebGLRenderer, _inputBuffer: THREE.WebGLRenderTarget, _deltaTime?: number) {
    if (!this.freezeTarget) return

    this.uniforms.get('freezeTexture')!.value = this.freezeTarget.texture
    this.uniforms.get('hasFreeze')!.value = this.hasInitialized
  }

  captureFrame(renderer: THREE.WebGLRenderer, inputBuffer: THREE.WebGLRenderTarget) {
    if (!this.freezeTarget || !this.tempTarget || !this.updateMaterial || !this.updateScene || !this.updateCamera) return

    // Update freeze reference with slow blend
    this.updateMaterial.uniforms.currentTexture.value = inputBuffer.texture
    this.updateMaterial.uniforms.freezeTexture.value = this.freezeTarget.texture
    this.updateMaterial.uniforms.updateSpeed.value = this.currentUpdateSpeed
    this.updateMaterial.uniforms.firstFrame.value = !this.hasInitialized

    // Render to temp target
    renderer.setRenderTarget(this.tempTarget)
    renderer.render(this.updateScene, this.updateCamera)

    // Swap targets
    const temp = this.freezeTarget
    this.freezeTarget = this.tempTarget
    this.tempTarget = temp

    renderer.setRenderTarget(null)

    this.hasInitialized = true
  }

  setSize(width: number, height: number) {
    super.setSize?.(width, height)
    this.freezeTarget?.setSize(width, height)
    this.tempTarget?.setSize(width, height)
  }

  updateParams(params: Partial<FreezeMaskParams>) {
    if (params.freezeThreshold !== undefined) this.uniforms.get('freezeThreshold')!.value = params.freezeThreshold
    if (params.updateSpeed !== undefined) {
      this.uniforms.get('updateSpeed')!.value = params.updateSpeed
      this.currentUpdateSpeed = params.updateSpeed
    }
    if (params.showFreeze !== undefined) this.uniforms.get('showFreeze')!.value = params.showFreeze
    if (params.invertMask !== undefined) this.uniforms.get('invertMask')!.value = params.invertMask
  }

  resetFreeze() {
    this.hasInitialized = false
  }

  dispose() {
    super.dispose()
    this.freezeTarget?.dispose()
    this.tempTarget?.dispose()
    this.updateMaterial?.dispose()
  }
}
