import * as THREE from 'three'
import { QuadPass, WarpFrameBuffer, makeTarget } from '../warp/WarpFrameBuffer'
import { WARP_VERTEX } from '../warp/warpShaders'
import { GrainScheduler, MAX_VOICES, type GrainSettings } from './slicerGrains'
import { slicerCommands, slicerReadout, slicerViewers } from './slicerRuntime'
import type { BlendMode, CaptureState, OutputMode } from '../../stores/slicerStore'

/** Long side of a stored frame, in pixels. 4 s at 16:9 is about 160 MB of GPU memory. */
export const SLICER_FRAME_LONG_SIDE = 768
export const SLICER_FPS = 30
/** 10 s, the longest buffer. */
export const SLICER_MAX_FRAMES = 300
/** Mix and Layer draw at the live picture's size, up to this long side. */
const MIX_LONG_SIDE = 1920
/** One texture slot per voice plus the hold frame. */
const SLOTS = MAX_VOICES + 1
/** A held slice loops once every 500 ms at speed 1. */
const LOOP_MS = 500

/** What the engine reads from the slicer store each frame. */
export interface SlicerTickState extends GrainSettings {
  enabled: boolean
  /** The slice to play next, when set from outside (sequencer, modulation). */
  currentSlice: number
  captureState: CaptureState
  bufferSize: number
  scanPosition: number
  autoScan: boolean
  scanSpeed: number
  scanMode: 'loop' | 'pendulum'
  outputMode: OutputMode
  wet: number
  blendMode: BlendMode
  opacity: number
}

const BLEND_INDEX: Record<BlendMode, number> = { normal: 0, multiply: 1, screen: 2, difference: 3, overlay: 4 }
const MODE_INDEX: Record<OutputMode, number> = { replace: 0, mix: 1, layer: 2 }

const range = (n: number) => Array.from({ length: n }, (_, i) => i)
const BLEND_FRAG = /* glsl */ `
${range(SLOTS).map((i) => `uniform sampler2D tF${i};`).join('\n')}
uniform float uW[${SLOTS}];
uniform sampler2D tLive;
uniform int uMode;
uniform int uBlend;
uniform float uWet;
uniform float uOpacity;
varying vec2 vUv;
vec3 blendOp(vec3 s, vec3 o) {
  if (uBlend == 1) return s * o;
  if (uBlend == 2) return 1.0 - (1.0 - s) * (1.0 - o);
  if (uBlend == 3) return abs(s - o);
  if (uBlend == 4) return mix(2.0 * s * o, 1.0 - 2.0 * (1.0 - s) * (1.0 - o), step(0.5, o));
  return s;
}
void main() {
  vec3 s = ${range(SLOTS).map((i) => `texture2D(tF${i}, vUv).rgb * uW[${i}]`).join('\n    + ')};
  if (uMode == 0) { gl_FragColor = vec4(s, 1.0); return; }
  vec3 o = texture2D(tLive, vUv).rgb;
  vec3 b = blendOp(s, o);
  if (uMode == 2) b = mix(o, b, uOpacity);
  gl_FragColor = vec4(mix(o, b, uWet), 1.0);
}
`

const frac = (v: number) => v - Math.floor(v)

/**
 * The video slicer on the GPU: a ring of frames (oldest to newest, so a sweep never jumps at the
 * write head), the grain scheduler, and one blend pass that mixes up to 8 grains and the live
 * picture into a single target, which Canvas feeds to the effect chain.
 * Off (and no slicer panel open) means no captures and no targets.
 */
export class SlicerEngine {
  private readonly geometry = new THREE.PlaneGeometry(2, 2)
  private readonly quad = new QuadPass(this.geometry)
  readonly ring = new WarpFrameBuffer(this.quad, { longSide: SLICER_FRAME_LONG_SIDE, maxFrames: SLICER_MAX_FRAMES })
  readonly grains = new GrainScheduler()
  private readonly material: THREE.ShaderMaterial
  private out: THREE.WebGLRenderTarget | null = null
  private lastNow = NaN
  private scan = 0.5
  private scanDir: 1 | -1 = 1
  private loopPhase = 0
  private looping = false
  private storeSlice = -1

  constructor() {
    const uniforms: Record<string, THREE.IUniform> = {
      uW: { value: new Array(SLOTS).fill(0) },
      tLive: { value: null }, uMode: { value: 0 }, uBlend: { value: 0 }, uWet: { value: 1 }, uOpacity: { value: 1 },
    }
    for (let i = 0; i < SLOTS; i++) uniforms[`tF${i}`] = { value: null }
    this.material = new THREE.ShaderMaterial({
      uniforms, vertexShader: WARP_VERTEX, fragmentShader: BLEND_FRAG, depthTest: false, depthWrite: false,
    })
  }

  /** Width / height of the slicer's picture (NaN before the first frame). */
  get aspect() {
    return this.ring.frameHeight ? this.ring.frameWidth / this.ring.frameHeight : NaN
  }

  /** Width and height of the output target (0 when none). */
  get outputSize(): [number, number] {
    return this.out ? [this.out.width, this.out.height] : [0, 0]
  }

  /**
   * One frame: run commands, capture `live` (30 fps), advance the grains and draw. Returns the
   * slicer's picture, or null when it should not replace the input (off, or nothing stored yet).
   * `now` is in ms; `beats` is the transport's beat count while it plays, else null; `playing` is the master
   * transport (stopped, the slicer shows its current slice at the scan position).
   */
  tick(
    renderer: THREE.WebGLRenderer, live: THREE.Texture | null, liveAspect: number, liveSize: [number, number] | null,
    now: number, st: SlicerTickState, bpm: number, beats: number | null, playing: boolean,
  ): THREE.Texture | null {
    const dt = Number.isFinite(this.lastNow) ? Math.max(0, Math.min(250, now - this.lastNow)) : 0
    this.lastNow = now
    const cmd = slicerCommands

    if (cmd.clear) { cmd.clear = false; this.ring.clear(); this.grains.reset() }
    let loaded = false
    if (cmd.importFrames) { const f = cmd.importFrames; cmd.importFrames = null; this.load(renderer, f); loaded = true }

    // Right after an import the store may not say 'imported' yet; never let a live frame wipe the clip
    const liveMode = st.captureState === 'live' && !loaded
    const wanted = st.enabled || slicerViewers() > 0
    if (liveMode && live && wanted) {
      this.ring.capture(renderer, live, now / 1000, liveAspect, Math.round(st.bufferSize * SLICER_FPS))
    } else if (liveMode && !wanted && this.ring.targetCount) {
      this.ring.release() // nothing to keep: a frozen or imported buffer stays until it is released
    }
    const size = this.ring.size
    slicerReadout.frames = size
    slicerReadout.capacity = liveMode ? Math.min(this.ring.maxFrames, Math.round(st.bufferSize * SLICER_FPS)) : size

    if (!st.enabled || size === 0) {
      slicerReadout.active = false
      slicerReadout.voices = 0
      if (!st.enabled) this.releaseOutput()
      return null
    }

    // Scan position: the knob, or swept through the slice while auto-scan plays
    if (st.autoScan && playing) {
      const d = (dt / 1000) * st.scanSpeed
      if (st.scanMode === 'loop') this.scan = frac(this.scan + d)
      else {
        this.scan += d * this.scanDir
        if (this.scan >= 1) { this.scan = 1; this.scanDir = -1 } else if (this.scan <= 0) { this.scan = 0; this.scanDir = 1 }
      }
    } else {
      this.scan = st.scanPosition
    }

    const n = Math.max(1, st.sliceCount)
    const g = this.grains
    if (st.currentSlice !== this.storeSlice) { this.storeSlice = st.currentSlice; g.slice = st.currentSlice % n }
    if (cmd.loop) {
      if (!this.looping) { this.looping = true; this.loopPhase = 0 }
      this.loopPhase = frac(this.loopPhase + (dt / LOOP_MS) * cmd.loop.speed)
      g.show((cmd.loop.slice + this.loopPhase) / n)
      g.slice = cmd.loop.slice
    } else {
      this.looping = false
      if (cmd.scrub !== null) g.show(cmd.scrub)
      else if (!playing) g.show((g.slice + this.scan) / n)
      else {
        if (cmd.retrigger !== null) { g.retrigger(cmd.retrigger); cmd.retrigger = null }
        g.step(now, st, this.scan, bpm, size / SLICER_FPS, beats)
      }
    }

    slicerReadout.active = true
    slicerReadout.playhead = g.playhead
    slicerReadout.slice = Math.min(n - 1, Math.floor(g.playhead * n))
    slicerReadout.voices = g.voiceCount
    return this.draw(renderer, live, liveSize, st)
  }

  private frameAt(pos: number): THREE.Texture {
    const size = this.ring.size
    return this.ring.at(Math.min(size - 1, Math.max(0, Math.round(frac(pos) * (size - 1))))).rt.texture
  }

  private draw(renderer: THREE.WebGLRenderer, live: THREE.Texture | null, liveSize: [number, number] | null, st: SlicerTickState) {
    const g = this.grains
    const u = this.material.uniforms
    const weights = u.uW.value as number[]
    const fallback = this.frameAt(g.holdPos)
    for (let i = 0; i < MAX_VOICES; i++) {
      const on = i < g.voiceCount
      u[`tF${i}`].value = on ? this.frameAt(g.voices[i].pos) : fallback
      weights[i] = on ? g.voices[i].weight : 0
    }
    u[`tF${MAX_VOICES}`].value = fallback
    weights[MAX_VOICES] = g.voiceCount ? g.holdWeight : 1

    const mixing = st.outputMode !== 'replace' && !!live
    u.uMode.value = mixing ? MODE_INDEX[st.outputMode] : 0
    u.uBlend.value = BLEND_INDEX[st.blendMode] ?? 0
    u.uWet.value = st.wet
    u.uOpacity.value = st.opacity
    u.tLive.value = mixing ? live : fallback

    let w = this.ring.frameWidth, h = this.ring.frameHeight
    if (mixing && liveSize && liveSize[0] > 0 && liveSize[1] > 0) {
      const k = Math.min(1, MIX_LONG_SIDE / Math.max(liveSize[0], liveSize[1]))
      w = Math.max(1, Math.round(liveSize[0] * k)); h = Math.max(1, Math.round(liveSize[1] * k))
    }
    if (!this.out || this.out.width !== w || this.out.height !== h) {
      this.out?.dispose()
      this.out = makeTarget(w, h)
    }
    this.quad.draw(renderer, this.material, this.out)
    for (let i = 0; i < SLOTS; i++) u[`tF${i}`].value = null
    u.tLive.value = null
    return this.out.texture
  }

  /** Replace the buffer with `frames` (oldest first), stored at the ring's frame size. */
  private load(renderer: THREE.WebGLRenderer, frames: ImageData[]) {
    this.ring.release()
    this.grains.reset()
    if (!frames.length) return
    const { width, height } = frames[0]
    const tex = new THREE.DataTexture(new Uint8Array(width * height * 4), width, height, THREE.RGBAFormat)
    tex.flipY = true // ImageData rows run top to bottom, like a video texture
    tex.minFilter = THREE.LinearFilter
    tex.magFilter = THREE.LinearFilter
    const data = tex.image.data as Uint8Array
    let t = 0
    for (const f of frames) {
      if (f.width !== width || f.height !== height) continue
      data.set(f.data)
      tex.needsUpdate = true
      this.ring.capture(renderer, tex, t, width / height, frames.length)
      t += 1 / SLICER_FPS
    }
    tex.dispose()
  }

  private releaseOutput() {
    this.out?.dispose()
    this.out = null
  }

  /** Free every target (programs are kept). */
  release() {
    this.ring.release()
    this.releaseOutput()
  }

  dispose() {
    this.release()
    this.ring.dispose()
    this.material.dispose()
    this.geometry.dispose()
  }
}
