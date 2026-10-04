import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import type { SegmentationService } from '../vision/SegmentationService'
import { DEFAULT_SEG_MATTER_PARAMS, type SegMatterParams } from '../../stores/segStore'
import { NOISE_GLSL, COLOR_UTILS_GLSL } from './glsl-utils'
import { SEG_MASK_GLSL, beatsToSeconds } from './segShared'

const BLUR_DIV = 8 // blur target = 1/8 canvas resolution

const fragmentShader = NOISE_GLSL + COLOR_UTILS_GLSL + SEG_MASK_GLSL + /* glsl */ `
uniform sampler2D blurTex;
uniform float hasBlur;
uniform vec2 resolution;
uniform float seed;
uniform float coverage;
uniform float w[6]; // black, solid, gradient, zebra, rainbow, mosaic
uniform float uTime;
uniform float effectMix;

float regionId(vec2 uv, vec3 blurred) {
  float c = segClass(uv);
  if (hasMask > 0.5 && c > 0.5) return 100.0 + c;          // person parts
  vec3 hsv = rgb2hsv(blurred);
  float hueBin = hsv.y < 0.15 ? 8.0 : floor(hsv.x * 8.0);   // greys get their own bin
  float lumBin = floor(clamp(hsv.z, 0.0, 0.999) * 4.0);
  return hueBin * 4.0 + lumBin;
}

int pickMaterial(float id) {
  if (hash(vec2(id, seed)) > coverage) return -1;
  float total = w[0] + w[1] + w[2] + w[3] + w[4] + w[5];
  if (total <= 0.0) return -1;
  float r = hash(vec2(seed * 1.37, id + 11.0)) * total;
  float a = 0.0;
  for (int i = 0; i < 6; i++) { a += w[i]; if (r < a) return i; }
  return 5;
}

vec3 material(int m, vec2 uv, vec3 src, vec3 blurred, float id) {
  float lum = luminance(src);
  float blum = luminance(blurred);
  if (m == 0) return vec3(0.0);
  if (m == 1) { vec3 h = rgb2hsv(blurred); return hsv2rgb(vec3(h.x, clamp(h.y * 1.8 + 0.3, 0.0, 1.0), clamp(h.z * 1.2, 0.35, 1.0))); }
  if (m == 2) {
    vec3 a = vec3(0.75, 0.08, 0.05), b = vec3(1.0, 0.5, 0.1), c = vec3(1.0, 0.93, 0.7);
    return mix(mix(a, b, smoothstep(0.0, 0.5, blum)), c, smoothstep(0.5, 1.0, blum));
  }
  if (m == 3) return vec3(step(0.5, fract(lum * 24.0 + uv.y * 6.0)));
  if (m == 4) return hsv2rgb(vec3(fract(lum * 6.0 + uTime * 0.3 + hash(vec2(id, 3.0))), 0.9, 1.0));
  vec2 blk = vec2(20.0) / resolution;
  float g = luminance(texture2D(inputBuffer, (floor(uv / blk) + 0.5) * blk).rgb);
  return vec3(g * 0.9 + 0.05);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  if (hasBlur < 0.5) { outputColor = inputColor; return; }
  vec3 blurred = texture2D(blurTex, uv).rgb;
  float id = regionId(uv, blurred);
  int m = pickMaterial(id);
  if (m < 0) { outputColor = inputColor; return; }
  vec3 result = material(m, uv, inputColor.rgb, blurred, id);
  outputColor = vec4(mix(inputColor.rgb, result, effectMix), inputColor.a);
}
`

// 9-tap box blur while downsampling, so region bins follow objects, not texture
const blurFrag = /* glsl */ `
uniform sampler2D tInput;
uniform vec2 srcTexel;
varying vec2 vUv;
void main() {
  vec3 s = vec3(0.0);
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++)
    s += texture2D(tInput, vUv + vec2(float(x), float(y)) * srcTexel * ${BLUR_DIV.toFixed(1)}).rgb;
  gl_FragColor = vec4(s / 9.0, 1.0);
}
`
const quadVert = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`

export class SegMatterEffect extends Effect {
  private seg: SegmentationService | null = null
  private blurTarget: THREE.WebGLRenderTarget | null = null
  private blurMat: THREE.ShaderMaterial | null = null
  private blurScene: THREE.Scene | null = null
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private width = 1920
  private height = 1080
  private bpm = 120
  private baseSeed = DEFAULT_SEG_MATTER_PARAMS.seed
  private autoSeed = 0
  private auto = DEFAULT_SEG_MATTER_PARAMS.autoReshuffle
  private beats = DEFAULT_SEG_MATTER_PARAMS.reshuffleBeats
  private sinceShuffle = 0
  private elapsed = 0

  constructor(params: Partial<SegMatterParams> = {}) {
    const p = { ...DEFAULT_SEG_MATTER_PARAMS, ...params }
    super('SegMatterEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['segMask', new THREE.Uniform(null)],
        ['hasMask', new THREE.Uniform(0)],
        ['blurTex', new THREE.Uniform(null)],
        ['hasBlur', new THREE.Uniform(0)],
        ['resolution', new THREE.Uniform(new THREE.Vector2(1920, 1080))],
        ['seed', new THREE.Uniform(p.seed)],
        ['coverage', new THREE.Uniform(p.coverage)],
        ['w', new THREE.Uniform([p.wBlack, p.wSolid, p.wGradient, p.wZebra, p.wRainbow, p.wMosaic])],
        ['uTime', new THREE.Uniform(0)],
        ['effectMix', new THREE.Uniform(p.mix)],
      ]),
    })
    this.baseSeed = p.seed
    this.auto = p.autoReshuffle
    this.beats = p.reshuffleBeats
  }

  setSegmentation(s: SegmentationService) {
    this.seg = s
    this.uniforms.get('segMask')!.value = s.maskTexture
  }

  setBpm(bpm: number) { this.bpm = bpm }

  /** Seconds between automatic reshuffles at the current BPM (≥ 0.2 s). */
  reshuffleInterval(): number { return beatsToSeconds(this.beats, this.bpm) }

  setResolution(w: number, h: number) {
    this.width = Math.max(1, w); this.height = Math.max(1, h)
    ;(this.uniforms.get('resolution')!.value as THREE.Vector2).set(this.width, this.height)
    this.blurTarget?.setSize(Math.max(1, Math.round(this.width / BLUR_DIV)), Math.max(1, Math.round(this.height / BLUR_DIV)))
  }

  private ensureTargets() {
    if (this.blurTarget) return
    this.blurTarget = new THREE.WebGLRenderTarget(
      Math.max(1, Math.round(this.width / BLUR_DIV)), Math.max(1, Math.round(this.height / BLUR_DIV)),
      { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat },
    )
    this.blurMat = new THREE.ShaderMaterial({
      vertexShader: quadVert, fragmentShader: blurFrag, depthTest: false, depthWrite: false,
      uniforms: { tInput: { value: null }, srcTexel: { value: new THREE.Vector2(1 / this.width, 1 / this.height) } },
    })
    this.blurScene = new THREE.Scene()
    this.blurScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.blurMat))
    this.uniforms.get('blurTex')!.value = this.blurTarget.texture
  }

  update(renderer: THREE.WebGLRenderer, inputBuffer: THREE.WebGLRenderTarget, deltaTime = 1 / 60) {
    this.ensureTargets()
    this.elapsed += deltaTime
    this.uniforms.get('uTime')!.value = this.elapsed
    this.uniforms.get('hasMask')!.value = this.seg?.hasMask ? 1 : 0

    if (this.auto) {
      this.sinceShuffle += deltaTime
      const interval = this.reshuffleInterval()
      if (this.sinceShuffle >= interval - 1e-6) { // epsilon: summed 1/60 steps land a hair under the beat
        // keep the overshoot so the beat grid doesn't drift; % caps a long stall at one fire per frame
        this.sinceShuffle = (this.sinceShuffle - interval) % interval
        this.autoSeed = (this.autoSeed + 1) % 1000
      }
    }
    this.uniforms.get('seed')!.value = (this.baseSeed + this.autoSeed * 17) % 1000

    const mat = this.blurMat!
    mat.uniforms.tInput.value = inputBuffer.texture
    ;(mat.uniforms.srcTexel.value as THREE.Vector2).set(1 / this.width, 1 / this.height)
    const prev = renderer.getRenderTarget()
    renderer.setRenderTarget(this.blurTarget)
    renderer.render(this.blurScene!, this.camera)
    renderer.setRenderTarget(prev)
    this.uniforms.get('hasBlur')!.value = 1
  }

  updateParams(params: Partial<SegMatterParams>) {
    if (params.seed !== undefined) this.baseSeed = params.seed
    if (params.coverage !== undefined) this.uniforms.get('coverage')!.value = params.coverage
    if (params.autoReshuffle !== undefined) this.auto = params.autoReshuffle
    if (params.reshuffleBeats !== undefined) this.beats = params.reshuffleBeats
    const w = this.uniforms.get('w')!.value as number[]
    if (params.wBlack !== undefined) w[0] = params.wBlack
    if (params.wSolid !== undefined) w[1] = params.wSolid
    if (params.wGradient !== undefined) w[2] = params.wGradient
    if (params.wZebra !== undefined) w[3] = params.wZebra
    if (params.wRainbow !== undefined) w[4] = params.wRainbow
    if (params.wMosaic !== undefined) w[5] = params.wMosaic
    if (params.mix !== undefined) this.uniforms.get('effectMix')!.value = params.mix
  }

  dispose() {
    this.blurTarget?.dispose()
    this.blurMat?.dispose()
    super.dispose()
  }
}
