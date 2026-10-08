import * as THREE from 'three'
import type { V1Engine, V1EngineParams } from '../../stores/warpStore'
import { delaySeconds, LUT_SIZE, MAX_DELAY_SECONDS } from './warpMath'
import { QuadPass, WarpFrameBuffer, WARP_CAPTURE_FPS, WARP_MAX_FRAMES, makeTarget } from './WarpFrameBuffer'
import { WARP_CLEAN_FRAG, WARP_COPY_FRAG, WARP_DEGRADE_FRAG, WARP_SMEAR_FRAG, WARP_VERTEX } from './warpShaders'

/**
 * profile/params are the v1 engine (clean / smear / degrade). The caller maps the 7 store profiles onto
 * them with v1EngineFor until Task 4 replaces the shaders.
 */
export interface WarpVideoOptions {
  profile: V1Engine
  params: V1EngineParams
  mix: number
  /** Current loop length; sizes the ring (frames needed for the longest possible delay). */
  loopSeconds: number
  /** The line, as used for the delay (jump detection walks it between ticks). Null: drift-only fallback. */
  lut: Float32Array | null
  amount: number
  skew: number
}

const FRAME = 1 / WARP_CAPTURE_FPS
/** Delay change not explained by the line's continuous part that counts as a jump. */
const JUMP_MARGIN = 0.5 * FRAME
/** Ticks covering more than this much phase are treated as a jump outright (stall, re-anchor). */
const MAX_WALK_PHASE = 0.5
/** Output target long side cap (the pipeline resamples it to the canvas anyway). */
const OUTPUT_MAX_LONG_SIDE = 1920
const THUMB_WIDTH = 96
const SMEAR_SLOTS = ['tF0', 'tF1', 'tF2', 'tF3', 'tF4', 'tF5'] as const

const material = (frag: string, uniforms: Record<string, THREE.IUniform>) => new THREE.ShaderMaterial({
  uniforms, vertexShader: WARP_VERTEX, fragmentShader: frag, depthTest: false, depthWrite: false,
})

/**
 * Video side of the time warp. Owns the frame ring and renders the frame(s) at `now - delay`
 * through the active profile into one output target, mixed against the live texture.
 *
 * Per animation frame: capture(live, t, aspect) then render(phase, delay). At delay 0 render
 * returns `live` itself (full resolution, no extra pass), except while a clean-profile crossfade
 * out of a delayed read is still running (at most smooth*4 frames).
 *
 * Render targets are allocated lazily. release() frees them (warp turned off) and keeps the
 * compiled programs, so re-enabling costs no shader compile; dispose() is the full teardown
 * (targets, materials, geometry) for unmount.
 *
 * Jumps (clean crossfade start, degrade re-hold) are discontinuities in the delay: the line is
 * walked one LUT cell at a time between the previous and current phase, and a cell whose delay
 * change exceeds max(1.5 frames, 8 cells of loop time) is a step or the loop boundary. Delay change
 * the walk does not explain (line edited, re-anchor) is a jump too. Continuous slopes, however
 * steep the drift per tick (reverse = 2x), are not.
 */
export class WarpCompositor {
  private readonly geometry = new THREE.PlaneGeometry(2, 2)
  private readonly quad = new QuadPass(this.geometry)
  private readonly buffer = new WarpFrameBuffer(this.quad)
  private output: THREE.WebGLRenderTarget | null = null
  private thumbTarget: THREE.WebGLRenderTarget | null = null
  private readonly size = new THREE.Vector2()

  private readonly opts: WarpVideoOptions = {
    profile: 'clean', params: { smooth: 0.3, grain: 0.4, blend: 0.5, rate: 0.5, crunch: 0.3 }, mix: 1, loopSeconds: 2,
    lut: null, amount: 1, skew: 0,
  }
  private readonly delayArgs: { phase: number; lut: Float32Array; amount: number; skew: number; loopSeconds: number } = { phase: 0, lut: new Float32Array(LUT_SIZE), amount: 1, skew: 0, loopSeconds: 2 }
  private readonly smearW = [0, 0, 0, 0, 0, 0]
  /** Extra history the editor's thumbnail strip asks for (seconds; 0 = ring sized for the loop only). */
  private thumbHistory = 0
  private thumbPx: Uint8Array<ArrayBuffer> | null = null
  private thumbImg: ImageData | null = null
  private _jumpCount = 0
  private live: THREE.Texture | null = null
  private now = 0

  // jump detection; clean crossfade from the previous read
  private prevRead = NaN
  private prevNow = NaN
  private prevPhase = NaN
  private prevDelay = NaN
  private fadeFrom = NaN // read time of the old path when the fade started
  private fadeStart = NaN
  private fadeDur = 0
  // degrade: frame hold
  private holdTick = NaN
  private holdRead = NaN

  private readonly clean = material(WARP_CLEAN_FRAG, {
    tLive: { value: null }, tA: { value: null }, tB: { value: null }, uFade: { value: 0 }, uMix: { value: 1 },
  })
  private readonly smear = material(WARP_SMEAR_FRAG, {
    tLive: { value: null }, tF0: { value: null }, tF1: { value: null }, tF2: { value: null }, tF3: { value: null },
    tF4: { value: null }, tF5: { value: null }, uW: { value: null }, uMix: { value: 1 },
  })
  private readonly degrade = material(WARP_DEGRADE_FRAG, {
    tLive: { value: null }, tA: { value: null }, uFrameSize: { value: new THREE.Vector2(1, 1) },
    uPixel: { value: 1 }, uLevels: { value: 256 }, uMix: { value: 1 },
  })
  private readonly thumbCopy = material(WARP_COPY_FRAG, { tSrc: { value: null } })

  private readonly renderer: THREE.WebGLRenderer

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer
    this.smear.uniforms.uW.value = this.smearW
  }

  /** Frames currently stored. */
  get frameCount() { return this.buffer.size }
  /** Ring render targets currently allocated (the output and thumbnail targets are not counted; see extraTargetCount). */
  get targetCount() { return this.buffer.targetCount }
  /** Output + thumbnail targets currently allocated (0 to 2). */
  get extraTargetCount() { return (this.output ? 1 : 0) + (this.thumbTarget ? 1 : 0) }
  /** Jumps detected since construction (for tests). */
  get jumpCount() { return this._jumpCount }
  /** The output render target (for tests: readRenderTargetPixels). */
  get outputTarget() { return this.output }
  /** Approximate GPU bytes held by all targets (RGBA8). */
  get gpuBytes() {
    const ring = this.buffer.targetCount * this.buffer.frameWidth * this.buffer.frameHeight * 4
    const out = this.output ? this.output.width * this.output.height * 4 : 0
    const th = this.thumbTarget ? this.thumbTarget.width * this.thumbTarget.height * 4 : 0
    return ring + out + th
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
    const longest = Math.min(MAX_DELAY_SECONDS, Math.max(0, this.opts.loopSeconds, this.thumbHistory))
    return Math.min(WARP_MAX_FRAMES, Math.ceil(longest * WARP_CAPTURE_FPS) + 2)
  }

  /** Remember `live` and the time; store a downscaled copy if 1/30 s has elapsed since the last one. */
  capture(live: THREE.Texture, t: number, aspect: number): void {
    if (live !== this.live && this.live) this.clear() // a different source: never show its old frames
    this.live = live
    this.now = t
    this.buffer.capture(this.renderer, live, t, aspect, this.capacity())
  }

  private delayAt(phase: number): number {
    const a = this.delayArgs
    a.phase = phase - Math.floor(phase)
    return delaySeconds(a)
  }

  /** Was there a discontinuity in the delay between the previous tick and this one? */
  private detectJump(phase: number, delay: number, now: number): boolean {
    if (!Number.isFinite(this.prevPhase) || !Number.isFinite(this.prevDelay)) return false
    const o = this.opts
    if (!o.lut) return Math.abs(delay - this.prevDelay) > 2 * Math.max(0, now - this.prevNow) + JUMP_MARGIN // reverse drift allowed
    const a = this.delayArgs
    a.lut = o.lut; a.amount = o.amount; a.skew = o.skew; a.loopSeconds = o.loopSeconds
    let dphi = phase - this.prevPhase
    if (dphi < 0) dphi += 1
    if (dphi > MAX_WALK_PHASE) return true
    const cells = Math.ceil(dphi * LUT_SIZE)
    const cellLimit = Math.max(1.5 * FRAME, (8 * o.loopSeconds) / LUT_SIZE)
    let d0 = this.delayAt(this.prevPhase), explained = 0
    for (let i = 1; i <= cells; i++) {
      const d = this.delayAt(this.prevPhase + (dphi * i) / cells)
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
   * with the line for jump detection); the read time is `now - delaySec`.
   */
  render(phase: number, delaySec: number): THREE.Texture {
    const live = this.live
    if (!live) throw new Error('WarpCompositor.render before capture')
    const now = this.now
    const delay = Number.isFinite(delaySec) ? Math.max(0, Math.min(MAX_DELAY_SECONDS, delaySec)) : 0
    const read = now - delay
    const { profile, params, mix } = this.opts

    // Jump tracking runs for every profile so switching profile mid-run behaves.
    const jumped = this.detectJump(phase, delay, now)
    if (jumped) {
      this._jumpCount++
      if (profile === 'clean' && params.smooth > 0) {
        this.fadeFrom = this.prevRead + (now - this.prevNow) // the old path, continuing
        this.fadeStart = now
        this.fadeDur = params.smooth * 4 * FRAME
      }
    }
    this.prevRead = read
    this.prevNow = now
    this.prevPhase = phase
    this.prevDelay = delay
    let fade = 0
    if (profile === 'clean' && this.fadeDur > 0 && now - this.fadeStart < this.fadeDur) fade = 1 - (now - this.fadeStart) / this.fadeDur
    else this.fadeDur = 0

    if (profile !== 'degrade') this.holdTick = NaN

    if ((delay <= 0 && fade <= 0) || mix <= 0 || this.buffer.size === 0) return live

    const out = this.ensureOutput()

    if (profile === 'clean') {
      const u = this.clean.uniforms
      u.tLive.value = live
      u.tA.value = delay <= 0 ? live : this.frameAt(read, live)
      u.tB.value = fade > 0 ? this.frameAt(this.fadeFrom + (now - this.fadeStart), live) : u.tA.value
      u.uFade.value = fade
      u.uMix.value = mix
      this.quad.draw(this.renderer, this.clean, out)
    } else if (profile === 'smear') {
      const n = 2 + Math.round(params.grain * 4) // 2..6 frames
      const sigma = 0.5 + params.blend * 2.5 // frames: blend 0 = centre-heavy, 1 = near-even
      const pos = this.buffer.indexOf(read)
      const first = Math.round(pos - (n - 1) / 2)
      const w = this.smearW
      let sum = 0, lastK = -1
      const u = this.smear.uniforms
      for (let i = 0; i < 6; i++) {
        const k = Math.min(this.buffer.size - 1, Math.max(0, first + i))
        u[SMEAR_SLOTS[i]].value = this.buffer.at(k).rt.texture
        w[i] = 0
        // Near the ring edges several slots clamp to the same frame: weight it once, at its real distance.
        if (i < n && k !== lastK) { const d = k - pos; w[i] = Math.exp(-(d * d) / (2 * sigma * sigma)); sum += w[i] }
        lastK = k
      }
      for (let i = 0; i < 6; i++) w[i] /= sum
      u.tLive.value = live
      u.uMix.value = mix
      this.quad.draw(this.renderer, this.smear, out)
    } else {
      // Hold: the read position only updates 4 + (1 - rate) * 26 times a second.
      const fps = 4 + (1 - params.rate) * 26
      const tick = Math.floor(now * fps)
      if (tick !== this.holdTick || jumped) { this.holdTick = tick; this.holdRead = read }
      const u = this.degrade.uniforms
      u.tLive.value = live
      u.tA.value = this.frameAt(this.holdRead, live)
      ;(u.uFrameSize.value as THREE.Vector2).set(this.buffer.frameWidth, this.buffer.frameHeight)
      u.uPixel.value = 1 + Math.floor(params.crunch * 15)
      u.uLevels.value = Math.max(3, Math.round(256 * Math.pow(3 / 256, params.crunch)))
      u.uMix.value = mix
      this.quad.draw(this.renderer, this.degrade, out)
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

  /** Forget every stored frame (on source change) and any fade/hold state. */
  clear(): void {
    this.buffer.clear()
    this.prevRead = this.prevNow = this.prevPhase = this.prevDelay = NaN
    this.fadeFrom = this.fadeStart = this.holdTick = this.holdRead = NaN
    this.fadeDur = 0
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
    this.live = null
    this.clear()
  }

  /** Full teardown (unmount): render targets, materials, programs and geometry. Do not use afterwards. */
  dispose(): void {
    this.release()
    this.buffer.dispose()
    this.clean.dispose()
    this.smear.dispose()
    this.degrade.dispose()
    this.thumbCopy.dispose()
    this.geometry.dispose()
  }
}
