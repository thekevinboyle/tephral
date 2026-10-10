import * as THREE from 'three'
import { isOutputOpen, isProfileNeutral, type Knobs, type ProfileId, type WarpOutput } from '../../stores/warpStore'
import { delayAtX, LUT_SIZE, MAX_DELAY_SECONDS } from './warpMath'
import { playPosition, type PlayParams } from '../playhead'
import { onWarpClockChange } from './warpClock'
import { QuadPass, WarpFrameBuffer, WARP_CAPTURE_FPS, WARP_MAX_FRAMES, makeTarget } from './WarpFrameBuffer'
import {
  bandLuma, WARP_CLEAN_FRAG, WARP_COPY_FRAG, WARP_DEGRADE_FRAG, WARP_FAUXCODER_FRAG, WARP_FILTERSPAM_FRAG, WARP_FLANGE_FRAG,
  WARP_HARMONICER_FRAG, WARP_LOFIZZLY_FRAG, WARP_VERTEX,
} from './warpShaders'

export interface WarpVideoOptions {
  profile: ProfileId
  /** The active profile's 4 knobs, 0..1 (the store's profileParams[profile]; read, never kept). */
  knobs: Readonly<Knobs>
  /** Output section: wet luminance band (Hz, mapped by bandLuma) and wet level in dB. */
  output: Readonly<WarpOutput>
  mix: number
  /** Current loop length; sizes the ring (frames needed for the longest possible delay). */
  loopSeconds: number
  /** The line, as used for the delay (jump detection walks it between ticks). Null: drift-only fallback. */
  lut: Float32Array | null
  amount: number
  skew: number
  /** The playhead (playback spec §2): skew, direction, region, scatter. Read, never kept. */
  play: PlayParams
}

const FRAME = 1 / WARP_CAPTURE_FPS
/** Read when there is no line yet (all live). */
const NO_LINE = new Float32Array(LUT_SIZE)
/** Delay change not explained by the line's continuous part that counts as a jump. */
const JUMP_MARGIN = 0.5 * FRAME
/** Ticks covering more than this much phase are treated as a jump outright (stall, re-anchor). */
const MAX_WALK_PHASE = 0.5
/** Output target long side cap (the pipeline resamples it to the canvas anyway). */
const OUTPUT_MAX_LONG_SIDE = 1920
const THUMB_WIDTH = 96
const FLANGE_SLOTS = ['tF0', 'tF1', 'tF2', 'tF3', 'tF4', 'tF5'] as const
const TAU = Math.PI * 2

/** Deterministic 0..1 from two numbers (CPU side of the per-slice / per-tick randomness). */
const rnd = (a: number, b: number) => { const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return x - Math.floor(x) }

/** Uniforms every profile shader shares (warpShaders COMMON). Fresh objects per material. */
const common = (): Record<string, THREE.IUniform> => ({
  tLive: { value: null }, tA: { value: null }, uMix: { value: 1 }, uBand: { value: new THREE.Vector2(-1, 2) },
  uGain: { value: 1 }, uFrameSize: { value: new THREE.Vector2(1, 1) }, uSeed: { value: 0 },
})

const material = (frag: string, uniforms: Record<string, THREE.IUniform>) => new THREE.ShaderMaterial({
  uniforms, vertexShader: WARP_VERTEX, fragmentShader: frag, depthTest: false, depthWrite: false,
})

/**
 * Video side of the time warp. Owns the frame ring and renders the frame(s) at `now - delay`
 * through the active profile's shader (spec §3 "Picture") and the Output stage (spec §4) into one
 * output target, mixed against the live texture.
 *
 * Per animation frame: capture(live, t, aspect) then render(pos, delay) (pos = absolute loop position). render returns `live`
 * itself (full resolution, no pass) when nothing would change it: Mix 0, or delay 0 with the
 * profile at its neutral knobs and Output open. Otherwise it renders, even at delay 0, so the look applies.
 *
 * Render targets are allocated lazily. release() frees them (warp turned off) and keeps the
 * compiled programs, so re-enabling costs no shader compile; dispose() is the full teardown
 * (targets, materials, geometry) for unmount. Every profile's program is compiled once, at construction
 * (warmPrograms), so a first profile switch never compiles on the frame it happens.
 * Clean's echo feedback target exists only while Clean has Echo > 0.
 *
 * Jumps (degrade re-hold) are discontinuities in the delay: the line is walked one LUT cell at a
 * time between the previous and current phase, and a cell whose delay change exceeds max(1.5
 * frames, 8 cells of loop time) is a step or the loop boundary. Delay change the walk does not
 * explain (line edited, re-anchor) is a jump too. Continuous slopes, however steep the drift per
 * tick (reverse = 2x), are not.
 */
export class WarpCompositor {
  private readonly geometry = new THREE.PlaneGeometry(2, 2)
  private readonly quad = new QuadPass(this.geometry)
  private readonly buffer = new WarpFrameBuffer(this.quad)
  private output: THREE.WebGLRenderTarget | null = null
  private thumbTarget: THREE.WebGLRenderTarget | null = null
  private echoTarget: THREE.WebGLRenderTarget | null = null
  private echoValid = false
  private readonly size = new THREE.Vector2()

  private readonly opts: WarpVideoOptions = {
    profile: 'clean', knobs: [0, 0, 0, 0], output: { low: 20, high: 20000, levelDb: 0 }, mix: 1, loopSeconds: 2,
    lut: null, amount: 1, skew: 0,
    play: { direction: 'fwd', start: 0, end: 1, scatter: 0, skew: 0, slices: 16, seed: 0 },
  }
  private readonly flangeW = [0, 0, 0, 0, 0, 0]
  private readonly flangeOff = Array.from({ length: 6 }, () => new THREE.Vector2())
  /** Extra history the editor's thumbnail strip asks for (seconds; 0 = ring sized for the loop only). */
  private thumbHistory = 0
  private thumbPx: Uint8Array<ArrayBuffer> | null = null
  private thumbImg: ImageData | null = null
  private _jumpCount = 0
  private live: THREE.Texture | null = null
  private now = 0
  private _readTime = NaN

  // jump detection
  private prevNow = NaN
  private prevPos = NaN
  private prevDelay = NaN
  // degrade: frame hold
  private holdTick = NaN
  private holdRead = NaN
  // free-running oscillators (integrated so a rate change never jumps the phase)
  private wobPhase = 0 // clean vibrato
  private lfoPhase = 0 // lo-fizzly rate
  private arpPhase = 0 // harmo-nicer speed
  private sqPhase = 0 // fauxcoder squelch

  private readonly clean = material(WARP_CLEAN_FRAG, {
    ...common(), tN1: { value: null }, tN2: { value: null }, tEcho: { value: null }, uWobble: { value: 0 }, uWobPhase: { value: 0 },
    uBend: { value: 0 }, uBlock: { value: 32 }, uEcho: { value: 0 },
  })
  private readonly flange = material(WARP_FLANGE_FRAG, {
    ...common(), tF0: { value: null }, tF1: { value: null }, tF2: { value: null }, tF3: { value: null }, tF4: { value: null },
    tF5: { value: null }, uW: { value: this.flangeW }, uOff: { value: this.flangeOff }, uPhys: { value: 1 },
    tR: { value: null }, tB: { value: null }, uWidth: { value: 0 },
  })
  private readonly degrade = material(WARP_DEGRADE_FRAG, {
    ...common(), uPixel: { value: 1 }, uLevels: { value: 256 }, uBlur: { value: 0 }, uJit: { value: new THREE.Vector2() },
  })
  private readonly filterspam = material(WARP_FILTERSPAM_FRAG, {
    ...common(), uBlur: { value: 0 }, uTint: { value: new THREE.Vector3(1, 1, 1) }, uTintAmt: { value: 0 }, uRes: { value: 0 },
  })
  private readonly harmonicer = material(WARP_HARMONICER_FRAG, {
    ...common(), uA: { value: 0 }, uB: { value: 0 }, uRot: { value: 0 }, uShift: { value: 0 }, uMirror: { value: new THREE.Vector2() },
  })
  private readonly fauxcoder = material(WARP_FAUXCODER_FRAG, {
    ...common(), uAmt: { value: 0 }, uCentre: { value: 0.5 }, uWidth: { value: 0.18 }, uRing: { value: 0 },
  })
  private readonly lofizzly = material(WARP_LOFIZZLY_FRAG, {
    ...common(), uCols: { value: 0 }, uDirt: { value: 0 }, uRadio: { value: 0 }, uLevel: { value: 1 },
  })
  private readonly materials: Record<ProfileId, THREE.ShaderMaterial> = {
    clean: this.clean, flange: this.flange, degrade: this.degrade, filterspam: this.filterspam,
    harmonicer: this.harmonicer, fauxcoder: this.fauxcoder, lofizzly: this.lofizzly,
  }
  private readonly thumbCopy = material(WARP_COPY_FRAG, { tSrc: { value: null } })

  private readonly renderer: THREE.WebGLRenderer

  private readonly unsubClock: () => void

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer
    this.warmPrograms()
    // An audio-source switch moves the clock's time base: shift the stored history with it instead of losing it
    this.unsubClock = onWarpClockChange((e) => { if (e.reset) this.shiftTime(e.delta) })
  }

  /**
   * Compile every profile's program (and the copy program) now, into a render target like the one they draw
   * into, so the program keys match.
   */
  private warmPrograms() {
    const r = this.renderer
    const scene = new THREE.Scene()
    for (const m of [...Object.values(this.materials), this.thumbCopy]) {
      const mesh = new THREE.Mesh(this.geometry, m)
      mesh.frustumCulled = false
      scene.add(mesh)
    }
    const rt = makeTarget(1, 1)
    const prev = r.getRenderTarget()
    r.setRenderTarget(rt)
    try {
      // compile() issues the compile and link without waiting on their status (that is checked on first use), so
      // with KHR_parallel_shader_compile the driver finishes them in the background. Not compileAsync: its
      // readiness polling throws if the compositor is disposed before the programs are ready.
      r.compile(scene, this.quad.camera)
    } finally {
      r.setRenderTarget(prev)
      rt.dispose()
    }
  }

  /** The clock moved by `delta` s: shift the ring and every stored time so history and hold state survive. */
  private shiftTime(delta: number) {
    if (!Number.isFinite(delta) || delta === 0) return
    this.buffer.shiftTime(delta)
    this.now += delta
    this.prevNow += delta
    this.holdRead += delta
    this._readTime += delta
  }

  /** Frames currently stored. */
  get frameCount() { return this.buffer.size }
  /** Ring render targets currently allocated (the output, thumbnail and echo targets are not counted; see extraTargetCount). */
  get targetCount() { return this.buffer.targetCount }
  /** Output + thumbnail + echo targets currently allocated (0 to 3). */
  get extraTargetCount() { return (this.output ? 1 : 0) + (this.thumbTarget ? 1 : 0) + (this.echoTarget ? 1 : 0) }
  /** Jumps detected since construction (for tests). */
  get jumpCount() { return this._jumpCount }
  /** Clock time of the main frame the last render read (after hold, chaos and octave changes; for tests). */
  get readTime() { return this._readTime }
  /** The output render target (for tests: readRenderTargetPixels). */
  get outputTarget() { return this.output }
  /** Approximate GPU bytes held by all targets (RGBA8). */
  get gpuBytes() {
    const px = (rt: THREE.WebGLRenderTarget | null) => (rt ? rt.width * rt.height * 4 : 0)
    const ring = this.buffer.targetCount * this.buffer.frameWidth * this.buffer.frameHeight * 4
    return ring + px(this.output) + px(this.thumbTarget) + px(this.echoTarget)
  }

  /** Copies the given fields in (no allocation; callers can reuse one options object). */
  setOptions(o: Partial<WarpVideoOptions>) { Object.assign(this.opts, o) }

  /**
   * Keep at least `seconds` of history (capped at MAX_DELAY_SECONDS) so the editor strip can show
   * the frames the last completed pass played, which can lie up to 3 loops back. 0 returns to the
   * loop-sized ring; the extra targets are freed on the next capture.
   */
  setThumbnailHistory(seconds: number): void {
    this.thumbHistory = Number.isFinite(seconds) ? Math.max(0, seconds) : 0
  }

  private capacity() {
    const L = Math.max(0, this.opts.loopSeconds)
    // Reads past the loop: Filter Spam's Octaves start up to a slice (L/16) further back, Degrade's Chaos up to 0.3 s
    const p = this.opts.profile
    const margin = p === 'filterspam' ? L / 16 : p === 'degrade' ? 0.3 : 0
    const longest = Math.min(MAX_DELAY_SECONDS, Math.max(L + margin, this.thumbHistory))
    return Math.min(WARP_MAX_FRAMES, Math.ceil(longest * WARP_CAPTURE_FPS) + 2)
  }

  /** Remember `live` and the time; store a downscaled copy if 1/30 s has elapsed since the last one. */
  capture(live: THREE.Texture, t: number, aspect: number): void {
    if (live !== this.live && this.live) this.clear() // a different source: never show its old frames
    this.live = live
    this.now = t
    this.buffer.capture(this.renderer, live, t, aspect, this.capacity())
  }

  /** The delay at absolute loop position `pos`, through the playhead (playback spec §2). */
  private delayAt(pos: number): number {
    const o = this.opts
    return delayAtX(o.lut ?? NO_LINE, playPosition(pos, o.play), o.amount, o.loopSeconds)
  }

  /**
   * Was there a discontinuity in the delay between the previous tick and this one? Walks the absolute position
   * (so a slice jump from Scatter or Random, or Rev's seam, counts as a jump), one LUT cell at a time.
   */
  private detectJump(pos: number, delay: number, now: number): boolean {
    if (!Number.isFinite(this.prevPos) || !Number.isFinite(this.prevDelay)) return false
    const o = this.opts
    if (!o.lut) return Math.abs(delay - this.prevDelay) > 2 * Math.max(0, now - this.prevNow) + JUMP_MARGIN // reverse drift allowed
    const dpos = pos - this.prevPos
    if (!(dpos >= 0) || dpos > MAX_WALK_PHASE) return true
    const cells = Math.max(1, Math.ceil(dpos * LUT_SIZE))
    const cellLimit = Math.max(1.5 * FRAME, (8 * o.loopSeconds) / LUT_SIZE)
    let d0 = this.delayAt(this.prevPos), explained = 0
    for (let i = 1; i <= cells; i++) {
      const d = this.delayAt(this.prevPos + (dpos * i) / cells)
      if (Math.abs(d - d0) > cellLimit) return true
      explained += d - d0
      d0 = d
    }
    return Math.abs(delay - this.prevDelay - explained) > JUMP_MARGIN
  }

  private frameAt(t: number, live: THREE.Texture): THREE.Texture {
    if (t >= this.now - 1e-3) return live
    return this.buffer.closest(t)?.rt.texture ?? live
  }

  /**
   * The texture to feed the pipeline. `phase` is the loop phase the delay was computed for (used
   * with the line for jump detection and by Filter Spam's slices); the read time is `now - delaySec`.
   */
  render(pos: number, delaySec: number): THREE.Texture {
    const live = this.live
    if (!live) throw new Error('WarpCompositor.render before capture')
    const now = this.now
    const delay = Number.isFinite(delaySec) ? Math.max(0, Math.min(MAX_DELAY_SECONDS, delaySec)) : 0
    const p = Number.isFinite(pos) ? pos : 0
    const ph = p - Math.floor(p)
    let read = now - delay
    const { profile, knobs: k, output, mix } = this.opts

    // Jump tracking runs for every profile so switching profile mid-run behaves.
    const jumped = this.detectJump(p, delay, now)
    if (jumped) this._jumpCount++
    const dt = Number.isFinite(this.prevNow) ? Math.min(0.1, Math.max(0, now - this.prevNow)) : 0
    this.prevNow = now
    this.prevPos = p
    this.prevDelay = delay
    if (profile !== 'degrade') this.holdTick = NaN
    if ((profile !== 'clean' || !(k[2] > 0)) && this.echoTarget) this.freeEcho()

    if (mix <= 0 || this.buffer.size === 0 || (delay <= 0 && isOutputOpen(output) && isProfileNeutral(profile, k))) {
      this._readTime = now
      this.echoValid = false // the echo target was not updated this frame: never fade a stale one back in
      return live
    }

    const out = this.ensureOutput()
    const mat = this.materials[profile]
    const u = mat.uniforms
    const fw = this.buffer.frameWidth, fh = this.buffer.frameHeight
    const seedTick = Math.floor(now * WARP_CAPTURE_FPS)
    u.tLive.value = live
    u.uMix.value = mix
    ;(u.uBand.value as THREE.Vector2).set(output.low <= 20 ? -1 : bandLuma(output.low), output.high >= 20000 ? 2 : bandLuma(output.high))
    u.uGain.value = Math.pow(10, output.levelDb / 20)
    ;(u.uFrameSize.value as THREE.Vector2).set(fw, fh)
    u.uSeed.value = seedTick % 997

    switch (profile) {
      case 'clean': {
        // Vibrato: up to 4% of the width; Vib speed 0.5..12 Hz
        this.wobPhase = (this.wobPhase + TAU * 0.5 * Math.pow(24, k[1]) * dt) % TAU
        u.uWobble.value = k[0] * 0.04
        u.uWobPhase.value = this.wobPhase
        // Circuit-bend: up to 40% of blocks, 16..64 px blocks re-rolled ~10 times a second
        const bendTick = Math.floor(now * 10)
        u.uBend.value = k[3] * 0.4
        u.uBlock.value = 16 + Math.floor(rnd(bendTick, 3) * 49)
        u.uSeed.value = bendTick % 997
        u.tN1.value = this.frameAt(read - 4 * FRAME, live)
        u.tN2.value = this.frameAt(read - 10 * FRAME, live)
        // Echo: feedback 0..0.9 of the previous output
        const echo = k[2] > 0 ? 0.9 * Math.sqrt(k[2]) : 0
        u.uEcho.value = echo > 0 && this.echoValid ? echo : 0
        u.tEcho.value = this.echoTarget?.texture ?? live
        break
      }
      case 'flange': {
        // Grain size: 2..6 taps, 2 frames apart; Modulation jitters each tap up to ±3 frames and ±0.6% in space
        const n = 2 + Math.round(k[2] * 4)
        const pos = this.buffer.indexOf(read)
        const last = this.buffer.size - 1
        const w = this.flangeW
        for (let i = 0; i < 6; i++) {
          const off = (i - (n - 1) / 2) * 2 + (rnd(seedTick, i) - 0.5) * 6 * k[0]
          const idx = Math.min(last, Math.max(0, Math.round(pos + off)))
          u[FLANGE_SLOTS[i]].value = this.buffer.at(idx).rt.texture
          w[i] = i < n ? 1 / n : 0
          this.flangeOff[i].set((rnd(seedTick, i + 10) - 0.5) * 0.012 * k[0], (rnd(seedTick, i + 20) - 0.5) * 0.012 * k[0])
        }
        u.uPhys.value = k[1]
        // Width: R from 2..8 frames back, B from twice that
        const wf = (2 + k[3] * 6) * FRAME
        u.tR.value = this.frameAt(read - wf, live)
        u.tB.value = this.frameAt(read - 2 * wf, live)
        u.uWidth.value = k[3]
        break
      }
      case 'degrade': {
        // Degrade: hold at 30 down to 4 fps and posterize; Grain size: blocks up to 16 px (scaled in
        // by Degrade, since Grain size is "any" at neutral); Cutoff: blur up to 8 px; Chaos: jitter
        const deg = k[0]
        const tick = Math.floor(now * (deg > 0 ? 30 - 26 * deg : WARP_CAPTURE_FPS))
        if (deg <= 0) { this.holdTick = tick; this.holdRead = read }
        else if (tick !== this.holdTick || jumped || !Number.isFinite(this.holdRead)) { this.holdTick = tick; this.holdRead = read }
        const chaos = k[3]
        read = Math.min(now, this.holdRead + (chaos > 0 ? (rnd(tick, 1) - 0.5) * 0.6 * chaos : 0))
        ;(u.uJit.value as THREE.Vector2).set(chaos > 0 ? (rnd(tick, 2) - 0.5) * 0.04 * chaos : 0, chaos > 0 ? (rnd(tick, 3) - 0.5) * 0.04 * chaos : 0)
        u.uPixel.value = 1 + Math.floor(k[2] * 15 * Math.min(1, deg * 3))
        u.uLevels.value = deg > 0 ? Math.max(3, Math.round(256 * Math.pow(3 / 256, Math.sqrt(deg)))) : 256
        u.uBlur.value = (1 - k[1]) * 8
        break
      }
      case 'filterspam': {
        // One seed per 1/16 slice of the loop: blur, tint and the octave chance
        const slice = Math.floor(ph * 16)
        const r1 = rnd(slice, 1), r2 = rnd(slice, 2)
        u.uBlur.value = (1 - k[0]) * 6 + k[1] * r1 * 10
        u.uTintAmt.value = k[1] * (0.3 + 0.7 * r2) * 0.85
        const h = rnd(slice, 5)
        ;(u.uTint.value as THREE.Vector3).set(0.6 + 0.9 * Math.max(0, Math.cos(TAU * h)), 0.6 + 0.9 * Math.max(0, Math.cos(TAU * (h - 1 / 3))), 0.6 + 0.9 * Math.max(0, Math.cos(TAU * (h - 2 / 3))))
        u.uRes.value = k[2] * 3
        // Octaves: this slice plays at double speed (starts a slice further back and catches up)
        if (rnd(slice, 4) < k[3]) read -= (1 - (ph * 16 - slice)) * (this.opts.loopSeconds / 16)
        break
      }
      case 'harmonicer': {
        // Harmonize: copy opacity up to .9; Speed: emphasis cycles at 0.5..8 Hz; Detune: ±20° and ±4%
        this.arpPhase = (this.arpPhase + TAU * 0.5 * Math.pow(16, k[2]) * dt) % TAU
        const e = 0.5 + 0.5 * Math.sin(this.arpPhase)
        u.uA.value = k[0] * 0.9 * (0.35 + 0.65 * e)
        u.uB.value = k[0] * 0.9 * (0.35 + 0.65 * (1 - e))
        u.uRot.value = k[1] * 0.35
        u.uShift.value = k[1] * 0.04
        // Reverse: each copy mirrored with that probability, re-rolled every half second
        const slot = Math.floor(now * 2)
        ;(u.uMirror.value as THREE.Vector2).set(rnd(slot, 7) < k[3] ? 1 : 0, rnd(slot, 8) < k[3] ? 1 : 0)
        break
      }
      case 'fauxcoder': {
        // Cutoff: band centre 0.1..0.9; Squelch: flicker at 4..40 Hz; Magic: random jumps of centre and strength
        this.sqPhase = (this.sqPhase + TAU * 4 * Math.pow(10, k[1]) * dt) % TAU
        const s = Math.sin(this.sqPhase), r = rnd(seedTick, 9) - 0.5
        u.uCentre.value = 0.1 + 0.8 * k[2] + 0.15 * k[1] * s + 0.3 * k[3] * r
        u.uAmt.value = Math.min(1, Math.pow(k[0], 0.7) * (1 - 0.5 * k[1] * (0.5 + 0.5 * s)) * (1 - 0.5 * k[3] * (r + 0.5)))
        u.uRing.value = 0.25 * k[1] * s + k[3] * r
        break
      }
      case 'lofizzly': {
        // Degrade: down to fw / 24 columns, wobbled by the Rate LFO (0.2..30 Hz)
        this.lfoPhase = (this.lfoPhase + TAU * 0.2 * Math.pow(150, k[3]) * dt) % TAU
        u.uCols.value = k[0] > 0 ? fw / (1 + k[0] * 23 * (0.6 + 0.4 * Math.sin(this.lfoPhase))) : 0
        u.uDirt.value = k[1]
        u.uLevel.value = 1 - 0.35 * k[1] * rnd(seedTick, 11)
        u.uRadio.value = k[2]
        break
      }
    }

    u.tA.value = this.frameAt(read, live)
    this._readTime = Math.min(now, read)
    this.quad.draw(this.renderer, mat, out)

    if (profile === 'clean' && k[2] > 0) {
      // Echo: keep this output for the next frame (frame-sized; the target exists only while Echo > 0)
      const et = this.ensureEcho(fw, fh)
      this.thumbCopy.uniforms.tSrc.value = out.texture
      this.quad.draw(this.renderer, this.thumbCopy, et)
      this.thumbCopy.uniforms.tSrc.value = null
      this.echoValid = true
    }
    return out.texture
  }

  private ensureOutput(): THREE.WebGLRenderTarget {
    this.renderer.getDrawingBufferSize(this.size)
    let w = Math.max(1, this.size.x), h = Math.max(1, this.size.y)
    const k = OUTPUT_MAX_LONG_SIDE / Math.max(w, h)
    if (k < 1) { w = Math.max(1, Math.round(w * k)); h = Math.max(1, Math.round(h * k)) }
    if (!this.output) this.output = makeTarget(w, h)
    else if (this.output.width !== w || this.output.height !== h) this.output.setSize(w, h)
    return this.output
  }

  private ensureEcho(w: number, h: number): THREE.WebGLRenderTarget {
    w = Math.max(1, w); h = Math.max(1, h)
    if (!this.echoTarget) { this.echoTarget = makeTarget(w, h); this.echoValid = false }
    else if (this.echoTarget.width !== w || this.echoTarget.height !== h) { this.echoTarget.setSize(w, h); this.echoValid = false }
    return this.echoTarget
  }

  private freeEcho() {
    this.echoTarget?.dispose()
    this.echoTarget = null
    this.echoValid = false
    this.clean.uniforms.tEcho.value = null
  }

  /**
   * The last loop of history (or what is stored, if less) split into `count` equal parts, index 0
   * oldest. A new 96 px wide canvas, or null with no frames. The editor strip uses getThumbnailAt
   * (the frame each column plays); this rolling view is kept for tests and diagnostics.
   */
  getThumbnail(index: number, count: number): HTMLCanvasElement | null {
    const s = this.buffer.size
    if (!s || !(count >= 1) || !(index >= 0 && index < count)) return null
    const newest = this.buffer.newestTime
    const span = Math.min(Math.max(0, this.opts.loopSeconds), newest - this.buffer.oldestTime)
    const canvas = document.createElement('canvas')
    return Number.isNaN(this.getThumbnailAt(newest - span + ((index + 0.5) / count) * span, canvas)) ? null : canvas
  }

  /** Capture time of the stored frame closest to `t` (no GPU work), or NaN with no frames. */
  frameTimeAt(t: number): number {
    return this.buffer.size ? (this.buffer.closest(t)?.t ?? NaN) : NaN
  }

  /**
   * Draw the stored frame captured closest to clock time `t` (the renderer's nearest-timestamp
   * lookup) into `out`, resized to 96 px wide. Returns that frame's capture time, or NaN with no
   * frames. Reuses one pixel buffer. Synchronous GPU readback: refresh sparingly, never per frame.
   */
  getThumbnailAt(t: number, out: HTMLCanvasElement): number {
    const slot = this.buffer.size ? this.buffer.closest(t) : null
    if (!slot) return NaN
    const fw = this.buffer.frameWidth, fh = this.buffer.frameHeight
    const w = THUMB_WIDTH, h = Math.max(1, Math.round((THUMB_WIDTH * fh) / fw))
    if (!this.thumbTarget) this.thumbTarget = makeTarget(w, h)
    else if (this.thumbTarget.width !== w || this.thumbTarget.height !== h) this.thumbTarget.setSize(w, h)
    this.thumbCopy.uniforms.tSrc.value = slot.rt.texture
    this.quad.draw(this.renderer, this.thumbCopy, this.thumbTarget)
    this.thumbCopy.uniforms.tSrc.value = null
    if (!this.thumbPx || this.thumbPx.length !== w * h * 4) { this.thumbPx = new Uint8Array(w * h * 4); this.thumbImg = new ImageData(w, h) }
    const px = this.thumbPx, img = this.thumbImg!
    this.renderer.readRenderTargetPixels(this.thumbTarget, 0, 0, w, h, px)
    if (out.width !== w) out.width = w
    if (out.height !== h) out.height = h
    const ctx = out.getContext('2d')
    if (!ctx) return NaN
    const row = w * 4
    for (let y = 0; y < h; y++) img.data.set(px.subarray((h - 1 - y) * row, (h - y) * row), y * row) // GL rows are bottom-up
    ctx.putImageData(img, 0, 0)
    return slot.t
  }

  /** Forget every stored frame (on source change) and any hold / echo state. */
  clear(): void {
    this.buffer.clear()
    this.prevNow = this.prevPos = this.prevDelay = NaN
    this.holdTick = this.holdRead = NaN
    this._readTime = NaN
    this.echoValid = false // the echo target holds the old source's picture: never fade it in
  }

  /**
   * Free every render target (warp turned off). Materials and their programs are kept, so turning
   * the warp back on does not recompile; the instance reallocates targets lazily.
   */
  release(): void {
    this.buffer.release()
    this.output?.dispose()
    this.output = null
    this.thumbTarget?.dispose()
    this.thumbTarget = null
    this.freeEcho()
    this.live = null
    this.clear()
  }

  /** Full teardown (unmount): render targets, materials, programs and geometry. Do not use afterwards. */
  dispose(): void {
    this.unsubClock()
    this.release()
    this.buffer.dispose()
    for (const m of Object.values(this.materials)) m.dispose()
    this.thumbCopy.dispose()
    this.geometry.dispose()
  }
}
