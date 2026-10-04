import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import type { SegmentationService } from '../vision/SegmentationService'
import { DEFAULT_SEG_ECHO_PARAMS, type SegEchoParams } from '../../stores/segStore'
import { SEG_MASK_GLSL } from './segShared'

const MAX_COPIES = 8

const fragmentShader = SEG_MASK_GLSL + /* glsl */ `
uniform sampler2D echo0; uniform sampler2D echo1; uniform sampler2D echo2; uniform sampler2D echo3;
uniform sampler2D echo4; uniform sampler2D echo5; uniform sampler2D echo6; uniform sampler2D echo7;
uniform int copies;
uniform int filled;
uniform float decay;
uniform vec2 offsetStep;
uniform float zoomStep;
uniform float effectMix;

vec4 echoAt(int i, vec2 p) {
  if (i == 0) return texture2D(echo0, p);
  if (i == 1) return texture2D(echo1, p);
  if (i == 2) return texture2D(echo2, p);
  if (i == 3) return texture2D(echo3, p);
  if (i == 4) return texture2D(echo4, p);
  if (i == 5) return texture2D(echo5, p);
  if (i == 6) return texture2D(echo6, p);
  return texture2D(echo7, p);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  int n = min(copies, filled);
  if (hasMask < 0.5 || n == 0) { outputColor = inputColor; return; }
  vec3 acc = inputColor.rgb;
  // Oldest first so newer copies sit on top; echo i=0 is newest.
  for (int j = ${MAX_COPIES - 1}; j >= 0; j--) {
    if (j >= n) continue;
    float k = float(j + 1);
    vec2 p = (uv - 0.5) / pow(zoomStep, k) + 0.5 - offsetStep * k;
    if (p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0) continue;
    vec4 e = echoAt(j, p);
    acc = mix(acc, e.rgb, e.a * pow(decay, k));
  }
  // The live person always stays on top
  float live = segSelected(segClass(uv), 0);
  vec3 result = mix(acc, inputColor.rgb, live);
  outputColor = vec4(mix(inputColor.rgb, result, effectMix), inputColor.a);
}
`

// Copies the input with alpha = person mask into a ring slot.
const captureFrag = SEG_MASK_GLSL + /* glsl */ `
uniform sampler2D tInput;
varying vec2 vUv;
void main() {
  vec4 c = texture2D(tInput, vUv);
  float m = hasMask > 0.5 ? segSelected(segClass(vUv), 0) : 0.0;
  gl_FragColor = vec4(c.rgb, m);
}
`
const quadVert = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`

export class SegEchoEffect extends Effect {
  private seg: SegmentationService | null = null
  private ring: THREE.WebGLRenderTarget[] = []
  private head = 0          // next slot to write
  private filled = 0
  private frame = 0
  private delay = DEFAULT_SEG_ECHO_PARAMS.delay
  private width = 1920
  private height = 1080
  private captureMat: THREE.ShaderMaterial | null = null
  private quad: THREE.Mesh | null = null
  private scene: THREE.Scene | null = null
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)

  constructor(params: Partial<SegEchoParams> = {}) {
    const p = { ...DEFAULT_SEG_ECHO_PARAMS, ...params }
    const uniforms = new Map<string, THREE.Uniform>([
      ['segMask', new THREE.Uniform(null)],
      ['hasMask', new THREE.Uniform(0)],
      ['copies', new THREE.Uniform(p.copies)],
      ['filled', new THREE.Uniform(0)],
      ['decay', new THREE.Uniform(p.decay)],
      ['offsetStep', new THREE.Uniform(new THREE.Vector2(p.offsetX, p.offsetY))],
      ['zoomStep', new THREE.Uniform(p.zoom)],
      ['effectMix', new THREE.Uniform(p.mix)],
    ])
    for (let i = 0; i < MAX_COPIES; i++) uniforms.set(`echo${i}`, new THREE.Uniform(null))
    super('SegEchoEffect', fragmentShader, { blendFunction: BlendFunction.NORMAL, uniforms })
    this.delay = p.delay
  }

  setSegmentation(s: SegmentationService) {
    this.seg = s
    this.uniforms.get('segMask')!.value = s.maskTexture
  }

  setResolution(w: number, h: number) {
    this.width = Math.max(1, w); this.height = Math.max(1, h)
    for (const t of this.ring) t.setSize(this.width, this.height)
  }

  private ensureTargets() {
    if (this.ring.length) return
    for (let i = 0; i < MAX_COPIES; i++) {
      this.ring.push(new THREE.WebGLRenderTarget(this.width, this.height, {
        minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat,
      }))
    }
    this.captureMat = new THREE.ShaderMaterial({
      vertexShader: quadVert, fragmentShader: captureFrag, depthTest: false, depthWrite: false,
      uniforms: { tInput: { value: null }, segMask: { value: this.seg?.maskTexture ?? null }, hasMask: { value: 0 } },
    })
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.captureMat)
    this.scene = new THREE.Scene()
    this.scene.add(this.quad)
  }

  update(renderer: THREE.WebGLRenderer, inputBuffer: THREE.WebGLRenderTarget) {
    const hasMask = this.seg?.hasMask ? 1 : 0
    this.uniforms.get('hasMask')!.value = hasMask
    if (!hasMask) return
    this.ensureTargets()
    this.frame++
    if (this.frame % Math.max(1, Math.round(this.delay)) === 0) {
      const mat = this.captureMat!
      mat.uniforms.tInput.value = inputBuffer.texture
      mat.uniforms.hasMask.value = hasMask
      const prev = renderer.getRenderTarget()
      renderer.setRenderTarget(this.ring[this.head])
      renderer.render(this.scene!, this.camera)
      renderer.setRenderTarget(prev)
      this.head = (this.head + 1) % MAX_COPIES
      this.filled = Math.min(MAX_COPIES, this.filled + 1)
    }
    // echo{i} = i-th newest capture
    for (let i = 0; i < MAX_COPIES; i++) {
      const slot = (this.head - 1 - i + MAX_COPIES * 2) % MAX_COPIES
      this.uniforms.get(`echo${i}`)!.value = this.ring[slot].texture
    }
    this.uniforms.get('filled')!.value = this.filled
  }

  updateParams(params: Partial<SegEchoParams>) {
    if (params.copies !== undefined) this.uniforms.get('copies')!.value = Math.round(params.copies)
    if (params.delay !== undefined) this.delay = params.delay
    if (params.decay !== undefined) this.uniforms.get('decay')!.value = params.decay
    const off = this.uniforms.get('offsetStep')!.value as THREE.Vector2
    if (params.offsetX !== undefined) off.x = params.offsetX
    if (params.offsetY !== undefined) off.y = params.offsetY
    if (params.zoom !== undefined) this.uniforms.get('zoomStep')!.value = params.zoom
    if (params.mix !== undefined) this.uniforms.get('effectMix')!.value = params.mix
  }

  releaseTargets() {
    for (const t of this.ring) t.dispose()
    this.ring = []
    this.captureMat?.dispose(); this.captureMat = null
    this.quad?.geometry.dispose(); this.quad = null
    this.scene = null
    this.head = 0; this.filled = 0; this.frame = 0
    for (let i = 0; i < MAX_COPIES; i++) this.uniforms.get(`echo${i}`)!.value = null
    this.uniforms.get('filled')!.value = 0
  }

  dispose() {
    this.releaseTargets()
    super.dispose()
  }
}
