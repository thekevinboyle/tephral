import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import { DEFAULT_SEG_STALE_PARAMS, type SegStaleParams } from '../../stores/segStore'
import { NOISE_GLSL } from './glsl-utils'
import { beatsToSeconds } from './segShared'

// Output samples the freshly written held buffer.
const fragmentShader = /* glsl */ `
uniform sampler2D heldTex;
uniform float hasHeld;
uniform float effectMix;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  if (hasHeld < 0.5) { outputColor = inputColor; return; }
  vec3 h = texture2D(heldTex, uv).rgb;
  outputColor = vec4(mix(inputColor.rgb, h, effectMix), inputColor.a);
}
`

// held' = per ragged cell: refresh from input if changed enough (or by chance), else keep held
const stepFrag = NOISE_GLSL + /* glsl */ `
// three's ShaderMaterial prelude already declares luminance(const in vec3), so COLOR_UTILS_GLSL would clash.
float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
uniform sampler2D tInput;
uniform sampler2D tHeld;
uniform float first;
uniform vec2 resolution;
uniform float cellPx;
uniform float threshold;
uniform float refresh;
uniform float burst;
uniform float rag;
uniform float frameNo;
uniform float uTime;
varying vec2 vUv;

void main() {
  vec4 live = texture2D(tInput, vUv);
  if (first > 0.5) { gl_FragColor = live; return; }
  float size = cellPx * (1.0 + burst * 3.0);
  vec2 px = vUv * resolution;
  vec2 warp = (vec2(fbm(px / (size * 2.0) + uTime * 0.05), fbm(px / (size * 2.0) + 17.0)) - 0.5) * 2.0 * rag;
  vec2 cell = floor(px / size + warp);
  vec2 c0 = (cell + 0.5) * size / resolution;
  vec2 o = vec2(size * 0.3) / resolution;
  float d = 0.0;
  d += abs(lum(texture2D(tInput, c0).rgb) - lum(texture2D(tHeld, c0).rgb));
  d += abs(lum(texture2D(tInput, c0 + o).rgb) - lum(texture2D(tHeld, c0 + o).rgb));
  d += abs(lum(texture2D(tInput, c0 - o).rgb) - lum(texture2D(tHeld, c0 - o).rgb));
  d += abs(lum(texture2D(tInput, c0 + vec2(o.x, -o.y)).rgb) - lum(texture2D(tHeld, c0 + vec2(o.x, -o.y)).rgb));
  d *= 0.25;
  float thr = threshold * (1.0 + burst * 8.0);
  float chance = refresh * (1.0 - burst);
  bool doUpdate = d > thr || hash(cell + frameNo * 0.618) < chance;
  gl_FragColor = doUpdate ? live : texture2D(tHeld, vUv);
}
`
const quadVert = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`

const BURST_DECAY_S = 0.5

export class SegStaleEffect extends Effect {
  private a: THREE.WebGLRenderTarget | null = null
  private b: THREE.WebGLRenderTarget | null = null
  private stepMat: THREE.ShaderMaterial | null = null
  private quad: THREE.Mesh | null = null
  private scene: THREE.Scene | null = null
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private width = 1920
  private height = 1080
  private first = true
  private frame = 0
  private elapsed = 0
  private bpm = 120
  private params: SegStaleParams
  private sinceBurst = 0
  private autoPulse = 0

  constructor(params: Partial<SegStaleParams> = {}) {
    const p = { ...DEFAULT_SEG_STALE_PARAMS, ...params }
    super('SegStaleEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['heldTex', new THREE.Uniform(null)],
        ['hasHeld', new THREE.Uniform(0)],
        ['effectMix', new THREE.Uniform(p.mix)],
      ]),
    })
    this.params = p
  }

  setBpm(bpm: number) { this.bpm = bpm }
  burstInterval(): number { return beatsToSeconds(this.params.burstBeats, this.bpm) }

  setResolution(w: number, h: number) {
    this.width = Math.max(1, w); this.height = Math.max(1, h)
    this.a?.setSize(this.width, this.height)
    this.b?.setSize(this.width, this.height)
    this.first = true
  }

  private ensureTargets() {
    if (this.a) return
    const opts = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat }
    this.a = new THREE.WebGLRenderTarget(this.width, this.height, opts)
    this.b = new THREE.WebGLRenderTarget(this.width, this.height, opts)
    this.stepMat = new THREE.ShaderMaterial({
      vertexShader: quadVert, fragmentShader: stepFrag, depthTest: false, depthWrite: false,
      uniforms: {
        tInput: { value: null }, tHeld: { value: null }, first: { value: 1 },
        resolution: { value: new THREE.Vector2() }, cellPx: { value: 28 }, threshold: { value: 0.12 },
        refresh: { value: 0.04 }, burst: { value: 0 }, rag: { value: 0.5 }, frameNo: { value: 0 }, uTime: { value: 0 },
      },
    })
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.stepMat)
    this.scene = new THREE.Scene()
    this.scene.add(this.quad)
    this.first = true
  }

  update(renderer: THREE.WebGLRenderer, inputBuffer: THREE.WebGLRenderTarget, deltaTime = 1 / 60) {
    this.ensureTargets()
    this.elapsed += deltaTime
    this.frame++
    const p = this.params
    if (p.autoBurst) {
      this.sinceBurst += deltaTime
      const interval = this.burstInterval()
      if (this.sinceBurst >= interval - 1e-6) { // epsilon: summed 1/60 steps land a hair under the beat
        // keep the overshoot so the beat grid doesn't drift; % caps a long stall at one fire per frame
        this.sinceBurst = (this.sinceBurst - interval) % interval
        this.autoPulse = 1
      }
    }
    this.autoPulse = Math.max(0, this.autoPulse - deltaTime / BURST_DECAY_S)
    const burst = Math.min(1, Math.max(p.burst, this.autoPulse))

    const u = this.stepMat!.uniforms
    u.tInput.value = inputBuffer.texture
    u.tHeld.value = this.a!.texture
    u.first.value = this.first ? 1 : 0
    ;(u.resolution.value as THREE.Vector2).set(this.width, this.height)
    u.cellPx.value = p.cellSize
    u.threshold.value = p.threshold
    u.refresh.value = p.refresh
    u.burst.value = burst
    u.rag.value = p.raggedness
    u.frameNo.value = this.frame % 9973
    u.uTime.value = this.elapsed

    const prev = renderer.getRenderTarget()
    renderer.setRenderTarget(this.b)
    renderer.render(this.scene!, this.camera)
    renderer.setRenderTarget(prev)
    const tmp = this.a; this.a = this.b; this.b = tmp
    this.first = false
    this.uniforms.get('heldTex')!.value = this.a!.texture
    this.uniforms.get('hasHeld')!.value = 1
  }

  updateParams(params: Partial<SegStaleParams>) {
    this.params = { ...this.params, ...params }
    if (params.mix !== undefined) this.uniforms.get('effectMix')!.value = params.mix
  }

  releaseTargets() {
    this.a?.dispose(); this.a = null
    this.b?.dispose(); this.b = null
    this.stepMat?.dispose(); this.stepMat = null
    this.quad?.geometry.dispose(); this.quad = null
    this.scene = null
    this.first = true
    this.sinceBurst = 0; this.autoPulse = 0
    this.uniforms.get('heldTex')!.value = null
    this.uniforms.get('hasHeld')!.value = 0
  }

  dispose() {
    this.releaseTargets()
    super.dispose()
  }
}
