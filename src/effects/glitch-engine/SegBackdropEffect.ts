import * as THREE from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import type { SegmentationService } from '../vision/SegmentationService'
import { MAX_PEOPLE, type PersonDetectionService } from '../vision/PersonDetectionService'
import { DEFAULT_SEG_BACKDROP_PARAMS, type SegBackdropParams } from '../../stores/segStore'
import { COLOR_UTILS_GLSL } from './glsl-utils'
import { SEG_MASK_GLSL, beatsToSeconds } from './segShared'

const fragmentShader = COLOR_UTILS_GLSL + SEG_MASK_GLSL + /* glsl */ `
uniform float look;      // 0 normal, 1 oil slick, 2 zebra, 3 edges
uniform float keep;      // 0 off, 1 person mask, 2 person boxes
uniform vec4 boxes[${MAX_PEOPLE}];
uniform int count;
uniform float bands;
uniform float stripe;
uniform float warp;
uniform vec2 resolution;
uniform float uTime;
uniform float effectMix;

bool kept(vec2 uv) {
  if (keep > 1.5) {
    for (int i = 0; i < ${MAX_PEOPLE}; i++) {
      if (i >= count) break;
      vec4 b = boxes[i];
      if (uv.x >= b.x && uv.x <= b.z && uv.y >= b.y && uv.y <= b.w) return true;
    }
    return false;
  }
  return keep > 0.5 && hasMask > 0.5 && segClass(uv) > 0.5;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  if (look < 0.5 || kept(uv)) { outputColor = inputColor; return; }
  float l = luminance(inputColor.rgb);
  // Slightly smoothed brightness, so stripes and bands follow shapes rather than grain
  vec2 px = 1.5 / resolution;
  float ls = (l + luminance(texture2D(inputBuffer, uv + vec2(px.x, 0.0)).rgb) + luminance(texture2D(inputBuffer, uv - vec2(px.x, 0.0)).rgb)
    + luminance(texture2D(inputBuffer, uv + vec2(0.0, px.y)).rgb) + luminance(texture2D(inputBuffer, uv - vec2(0.0, px.y)).rgb)) / 5.0;
  vec3 col;
  if (look < 1.5) {
    // Oil slick: brightness wrapped through the hue circle many times
    float h = fract(ls * bands + uTime * 0.05);
    col = hsv2rgb(vec3(h, 0.85, 0.7 + 0.3 * l));
  } else if (look < 2.5) {
    // Zebra: fine horizontal stripes whose phase follows brightness, so they bend round shapes
    float y = uv.y * resolution.y / stripe;
    col = vec3(step(0.5, fract(y + ls * warp)));
  } else {
    // Edges: thin white outlines on black
    vec2 e = 1.0 / resolution;
    float gx = luminance(texture2D(inputBuffer, uv + vec2(e.x, 0.0)).rgb) - luminance(texture2D(inputBuffer, uv - vec2(e.x, 0.0)).rgb);
    float gy = luminance(texture2D(inputBuffer, uv + vec2(0.0, e.y)).rgb) - luminance(texture2D(inputBuffer, uv - vec2(0.0, e.y)).rgb);
    col = vec3(smoothstep(0.05, 0.16, length(vec2(gx, gy))));
  }
  outputColor = vec4(mix(inputColor.rgb, col, effectMix), inputColor.a);
}
`

const LOOKS = 4

/**
 * Backdrop: the whole frame takes one look (normal, oil slick, zebra or edges), a new one on the beat
 * by weight, and the people can stay as they are (by the person mask or their detected boxes).
 */
export class SegBackdropEffect extends Effect {
  private detect: PersonDetectionService | null = null
  private seg: SegmentationService | null = null
  private p: SegBackdropParams = { ...DEFAULT_SEG_BACKDROP_PARAMS }
  private bpm = 120
  private since = 0
  private elapsed = 0
  private beat = 0
  private readonly boxes = Array.from({ length: MAX_PEOPLE }, () => new THREE.Vector4())

  constructor(params: Partial<SegBackdropParams> = {}) {
    super('SegBackdropEffect', fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ['segMask', new THREE.Uniform(null)],
        ['hasMask', new THREE.Uniform(0)],
        ['look', new THREE.Uniform(1)],
        ['keep', new THREE.Uniform(0)],
        ['boxes', new THREE.Uniform([] as THREE.Vector4[])],
        ['count', new THREE.Uniform(0)],
        ['bands', new THREE.Uniform(9)],
        ['stripe', new THREE.Uniform(4)],
        ['warp', new THREE.Uniform(9)],
        ['resolution', new THREE.Uniform(new THREE.Vector2(1920, 1080))],
        ['uTime', new THREE.Uniform(0)],
        ['effectMix', new THREE.Uniform(1)],
      ]),
    })
    this.uniforms.get('boxes')!.value = this.boxes
    this.updateParams(params)
  }

  setSegmentation(s: SegmentationService) {
    this.seg = s
    this.uniforms.get('segMask')!.value = s.maskTexture
  }
  setDetection(d: PersonDetectionService) { this.detect = d }
  setBpm(bpm: number) { this.bpm = bpm }
  setResolution(w: number, h: number) {
    ;(this.uniforms.get('resolution')!.value as THREE.Vector2).set(Math.max(1, w), Math.max(1, h))
  }

  /** The look for this beat: weighted random when switching, else the heaviest weight. */
  private pick(): number {
    const w = [this.p.wNormal, this.p.wSlick, this.p.wZebra, this.p.wEdges]
    const total = w.reduce((a, b) => a + b, 0)
    if (total <= 0) return 0
    if (!this.p.auto) return w.indexOf(Math.max(...w))
    let r = rand(this.beat) * total
    for (let i = 0; i < LOOKS; i++) { r -= w[i]; if (r < 0) return i }
    return LOOKS - 1
  }

  update(_renderer: THREE.WebGLRenderer, _input: THREE.WebGLRenderTarget, deltaTime = 1 / 60) {
    this.elapsed += deltaTime
    this.since += deltaTime
    const interval = beatsToSeconds(this.p.beats, this.bpm)
    if (this.since >= interval - 1e-6) { this.since = (this.since - interval) % interval; this.beat++ }
    this.uniforms.get('look')!.value = this.pick()
    this.uniforms.get('uTime')!.value = this.elapsed
    this.uniforms.get('hasMask')!.value = this.seg?.hasMask ? 1 : 0
    const tracks = this.detect?.people.tracks ?? []
    const n = Math.min(MAX_PEOPLE, tracks.length)
    for (let i = 0; i < n; i++) {
      const t = tracks[i]
      this.boxes[i].set(t.x, 1 - (t.y + t.h), t.x + t.w, 1 - t.y)
    }
    this.uniforms.get('count')!.value = n
  }

  updateParams(params: Partial<SegBackdropParams>) {
    this.p = { ...this.p, ...params }
    const u = this.uniforms
    u.get('keep')!.value = this.p.keep
    u.get('bands')!.value = this.p.bands
    u.get('stripe')!.value = this.p.stripe
    u.get('warp')!.value = this.p.warp
    u.get('effectMix')!.value = this.p.mix
  }
}

function rand(n: number) {
  let h = Math.imul(n ^ 0x2545f491, 0x9e3779b1)
  h = Math.imul(h ^ (h >>> 15), 0x85ebca77)
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296
}
