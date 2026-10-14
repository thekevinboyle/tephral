import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import type { SegmentationService } from '../vision/SegmentationService'
import { MAX_PEOPLE, type PersonDetectionService } from '../vision/PersonDetectionService'
import { DEFAULT_SEG_REDACT_PARAMS, type SegRedactParams } from '../../stores/segStore'
import { NOISE_GLSL, COLOR_UTILS_GLSL } from './glsl-utils'
import { SEG_MASK_GLSL, beatsToSeconds } from './segShared'

/** Treatments, in the order of the weights. */
const MODES = 5 // pixel, gradient, dots, slick, black

const fragmentShader = NOISE_GLSL + COLOR_UTILS_GLSL + SEG_MASK_GLSL + /* glsl */ `
uniform vec4 boxes[${MAX_PEOPLE}];   // x0, y0, x1, y1 in uv (origin bottom left)
uniform vec3 looks[${MAX_PEOPLE}];   // mode (-1 = none), body shape (0/1), per-person seed
uniform int count;
uniform float cell;
uniform vec2 resolution;
uniform float uTime;
uniform float effectMix;

// Thin-film colours: a cosine palette cycled by brightness, so contours turn into rainbow bands
vec3 slick(float l, float t) {
  return 0.5 + 0.5 * cos(6.28318 * (vec3(0.0, 0.33, 0.67) + l * 4.0 + t));
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float mode = -1.0, body = 0.0, sd = 0.0;
  vec4 b = vec4(0.0);
  // Boxes come largest first, so a smaller (nearer, inside) one is drawn on top
  for (int i = 0; i < ${MAX_PEOPLE}; i++) {
    if (i >= count) break;
    vec4 bb = boxes[i];
    vec3 lk = looks[i];
    if (lk.x >= 0.0 && uv.x >= bb.x && uv.x <= bb.z && uv.y >= bb.y && uv.y <= bb.w) { mode = lk.x; body = lk.y; sd = lk.z; b = bb; }
  }
  if (mode < 0.0 || (body > 0.5 && hasMask > 0.5 && segClass(uv) < 0.5)) { outputColor = inputColor; return; }

  vec2 px = uv * resolution;
  vec2 o = b.xy * resolution;
  vec3 col;
  if (mode < 0.5) {
    // Mosaic, its grid anchored to the box
    vec2 c = (floor((px - o) / cell) + 0.5) * cell + o;
    col = texture2D(inputBuffer, c / resolution).rgb;
  } else if (mode < 1.5) {
    // Orange at the top to deep red at the bottom; some boxes run darker
    float t = clamp((uv.y - b.y) / max(1e-4, b.w - b.y), 0.0, 1.0);
    vec3 top = mix(vec3(1.0, 0.62, 0.12), vec3(0.62, 0.08, 0.06), step(0.75, sd));
    vec3 bottom = mix(vec3(0.55, 0.02, 0.03), vec3(0.18, 0.0, 0.01), step(0.75, sd));
    col = mix(bottom, top, smoothstep(0.0, 1.0, t));
  } else if (mode < 2.5) {
    // White dots sized by brightness on black
    float c = max(3.0, cell * 0.4);
    vec2 g = floor((px - o) / c);
    float l = luminance(texture2D(inputBuffer, ((g + 0.5) * c + o) / resolution).rgb);
    vec2 q = fract((px - o) / c) - 0.5;
    col = vec3(step(length(q), 0.15 + l * 0.42));
  } else if (mode < 3.5) {
    col = slick(luminance(inputColor.rgb), uTime * 0.15 + sd);
  } else {
    col = vec3(0.0);
  }
  outputColor = vec4(mix(inputColor.rgb, col, effectMix), inputColor.a);
}
`

/** Small integer hash in 0..1 (stable per person id and seed). */
const hash01 = (a: number, b: number) => {
  let h = (a * 374761393 + b * 668265263) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/**
 * Redact: every detected person (box from the person detector) gets a treatment: mosaic, an orange to
 * red gradient block, a dot screen, thin-film rainbow or black, as a box or cut to the body (person
 * mask). Who gets what reshuffles on the beat; a box can linger after its person has gone.
 */
export class SegRedactEffect extends Effect {
  private detect: PersonDetectionService | null = null
  private width = 1920
  private height = 1080
  private bpm = 120
  private p: SegRedactParams = { ...DEFAULT_SEG_REDACT_PARAMS }
  private autoSeed = 0
  private sinceShuffle = 0
  private elapsed = 0
  private readonly boxes = Array.from({ length: MAX_PEOPLE }, () => new THREE.Vector4())
  private readonly looks = Array.from({ length: MAX_PEOPLE }, () => new THREE.Vector3())

  constructor(params: Partial<SegRedactParams> = {}) {
    super('SegRedactEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['segMask', new THREE.Uniform(null)],
        ['hasMask', new THREE.Uniform(0)],
        ['boxes', new THREE.Uniform([] as THREE.Vector4[])],
        ['looks', new THREE.Uniform([] as THREE.Vector3[])],
        ['count', new THREE.Uniform(0)],
        ['cell', new THREE.Uniform(16)],
        ['resolution', new THREE.Uniform(new THREE.Vector2(1920, 1080))],
        ['uTime', new THREE.Uniform(0)],
        ['effectMix', new THREE.Uniform(1)],
      ]),
    })
    this.uniforms.get('boxes')!.value = this.boxes
    this.uniforms.get('looks')!.value = this.looks
    this.updateParams(params)
  }

  private seg: SegmentationService | null = null
  setSegmentation(s: SegmentationService) {
    this.seg = s
    this.uniforms.get('segMask')!.value = s.maskTexture
  }

  setDetection(d: PersonDetectionService) { this.detect = d }

  setBpm(bpm: number) { this.bpm = bpm }

  setResolution(w: number, h: number) {
    this.width = Math.max(1, w); this.height = Math.max(1, h)
    ;(this.uniforms.get('resolution')!.value as THREE.Vector2).set(this.width, this.height)
  }

  /** Pick a treatment for person `id` under the current seed (-1 = left alone). */
  private lookFor(id: number, seed: number): [number, number, number] {
    const p = this.p
    if (hash01(id, seed) > p.coverage) return [-1, 0, 0]
    const w = [p.wPixel, p.wGradient, p.wDots, p.wSlick, p.wBlack]
    const total = w.reduce((a, b) => a + b, 0)
    if (total <= 0) return [-1, 0, 0]
    let r = hash01(id * 7 + 3, seed * 13 + 5) * total, mode = MODES - 1
    for (let i = 0; i < MODES; i++) { r -= w[i]; if (r < 0) { mode = i; break } }
    const body = p.shape === 2 ? (hash01(id * 11 + 1, seed + 99) < 0.5 ? 1 : 0) : p.shape
    return [mode, body, hash01(id * 5 + 2, seed * 3 + 1)]
  }

  update(_renderer: THREE.WebGLRenderer, _inputBuffer: THREE.WebGLRenderTarget, deltaTime = 1 / 60) {
    this.elapsed += deltaTime
    this.uniforms.get('uTime')!.value = this.elapsed
    this.uniforms.get('hasMask')!.value = this.seg?.hasMask ? 1 : 0
    if (this.p.autoReshuffle) {
      this.sinceShuffle += deltaTime
      const interval = beatsToSeconds(this.p.reshuffleBeats, this.bpm)
      if (this.sinceShuffle >= interval - 1e-6) {
        this.sinceShuffle = (this.sinceShuffle - interval) % interval
        this.autoSeed = (this.autoSeed + 1) % 1000
      }
    }
    const seed = (this.p.seed + this.autoSeed * 17) % 1000
    const tracks = this.detect?.people.tracks ?? []
    if (this.detect) this.detect.linger = this.p.linger * 1000
    const n = Math.min(MAX_PEOPLE, tracks.length)
    const pad = this.p.pad
    for (let i = 0; i < n; i++) {
      const t = tracks[i]
      const x0 = t.x - t.w * pad, x1 = t.x + t.w * (1 + pad)
      const yTop = t.y - t.h * pad, yBottom = t.y + t.h * (1 + pad)
      this.boxes[i].set(x0, 1 - yBottom, x1, 1 - yTop)
      const [m, body, sd] = this.lookFor(t.id, seed)
      this.looks[i].set(m, body, sd)
    }
    this.uniforms.get('count')!.value = n
  }

  updateParams(params: Partial<SegRedactParams>) {
    this.p = { ...this.p, ...params }
    this.uniforms.get('cell')!.value = this.p.cell
    this.uniforms.get('effectMix')!.value = this.p.mix
  }
}
