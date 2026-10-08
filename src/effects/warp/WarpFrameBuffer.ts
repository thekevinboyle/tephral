import * as THREE from 'three'
import { WARP_COPY_FRAG, WARP_VERTEX } from './warpShaders'

/** Frames are captured at this rate. */
export const WARP_CAPTURE_FPS = 30
/** Long side of a stored frame, in pixels. */
export const WARP_FRAME_LONG_SIDE = 512
/** 8 s at 30 fps. */
export const WARP_MAX_FRAMES = 240

/** Small slack so rAF jitter at 60 Hz still captures every second frame. */
const CAPTURE_TOLERANCE = 0.004
/** A clock jump larger than this (or going backwards) empties the ring: the old timestamps are meaningless. */
const MAX_GAP_SECONDS = 1

interface Slot { rt: THREE.WebGLRenderTarget; t: number }

/** One full-screen quad pass, drawing `material` into `target` and restoring the renderer's target. */
export class QuadPass {
  readonly scene = new THREE.Scene()
  readonly camera = new THREE.Camera()
  readonly mesh: THREE.Mesh
  constructor(geometry: THREE.BufferGeometry) {
    this.mesh = new THREE.Mesh(geometry)
    this.mesh.frustumCulled = false
    this.scene.add(this.mesh)
  }
  draw(renderer: THREE.WebGLRenderer, material: THREE.Material, target: THREE.WebGLRenderTarget) {
    const prev = renderer.getRenderTarget()
    this.mesh.material = material
    renderer.setRenderTarget(target)
    renderer.render(this.scene, this.camera)
    renderer.setRenderTarget(prev)
  }
}

export const makeTarget = (w: number, h: number) => new THREE.WebGLRenderTarget(w, h, {
  type: THREE.UnsignedByteType, format: THREE.RGBAFormat,
  minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
  depthBuffer: false, stencilBuffer: false, generateMipmaps: false,
})

export function frameSizeFor(aspect: number): [number, number] {
  const a = Number.isFinite(aspect) && aspect > 0 ? aspect : 16 / 9
  return a >= 1
    ? [WARP_FRAME_LONG_SIDE, Math.max(1, Math.round(WARP_FRAME_LONG_SIDE / a))]
    : [Math.max(1, Math.round(WARP_FRAME_LONG_SIDE * a)), WARP_FRAME_LONG_SIDE]
}

/**
 * GPU ring of downscaled frames with capture timestamps (seconds on the warp clock).
 *
 * Layout: `slots` is a circular array; `head` is the next write index; the `size` valid frames are
 * the ones just before head, so the k-th oldest is slots[(head - size + k) mod n]. Render targets
 * are allocated lazily, one per capture, up to `capacity`; growing inserts the new slot at head (it
 * becomes the newest) so the order stays intact, shrinking removes the oldest.
 */
export class WarpFrameBuffer {
  private slots: Slot[] = []
  private head = 0
  private _size = 0
  private width = 0
  private height = 0
  private nextDue = -Infinity
  private lastT = -Infinity
  private readonly copy: THREE.ShaderMaterial
  private readonly quad: QuadPass

  constructor(quad: QuadPass) {
    this.quad = quad
    this.copy = new THREE.ShaderMaterial({
      uniforms: { tSrc: { value: null } }, vertexShader: WARP_VERTEX, fragmentShader: WARP_COPY_FRAG,
      depthTest: false, depthWrite: false,
    })
  }

  get size() { return this._size }
  get targetCount() { return this.slots.length }
  get frameWidth() { return this.width }
  get frameHeight() { return this.height }

  /** Time of the oldest / newest stored frame (NaN when empty). */
  get oldestTime() { return this._size ? this.at(0).t : NaN }
  get newestTime() { return this._size ? this.at(this._size - 1).t : NaN }

  /** k-th oldest stored frame, 0 <= k < size. */
  at(k: number): Slot {
    const n = this.slots.length
    return this.slots[(((this.head - this._size + k) % n) + n) % n]
  }

  /**
   * Store `live` if a capture is due (30 fps). Returns true when a frame was written.
   * `capacity` caps the ring (frames); a smaller value than before frees the oldest targets.
   */
  capture(renderer: THREE.WebGLRenderer, live: THREE.Texture, t: number, aspect: number, capacity: number): boolean {
    const cap = Math.max(1, Math.min(WARP_MAX_FRAMES, Math.floor(capacity)))
    const [w, h] = frameSizeFor(aspect)
    if (w !== this.width || h !== this.height) { this.release(); this.width = w; this.height = h }
    if (t < this.lastT || t - this.lastT > MAX_GAP_SECONDS) this.clear()
    this.shrinkTo(cap)

    if (t + CAPTURE_TOLERANCE < this.nextDue) return false
    const period = 1 / WARP_CAPTURE_FPS
    this.nextDue = t - this.nextDue > period ? t + period : this.nextDue + period
    this.lastT = t

    let slot: Slot
    const n = this.slots.length
    if (this._size < n) {
      slot = this.slots[this.head] // a free (cleared) slot
      this.head = (this.head + 1) % n
      this._size++
    } else if (n < cap) {
      slot = { rt: makeTarget(w, h), t }
      this.slots.splice(this.head, 0, slot)
      this.head = (this.head + 1) % (n + 1)
      this._size++
    } else {
      slot = this.slots[this.head] // overwrite the oldest
      this.head = (this.head + 1) % n
    }
    slot.t = t
    this.copy.uniforms.tSrc.value = live
    this.quad.draw(renderer, this.copy, slot.rt)
    this.copy.uniforms.tSrc.value = null
    return true
  }

  private shrinkTo(cap: number) {
    while (this.slots.length > cap) {
      const n = this.slots.length
      const i = this.head % n // either a free slot (size < n) or the oldest frame (size == n)
      if (this._size === n) this._size--
      this.slots[i].rt.dispose()
      this.slots.splice(i, 1)
      this.head = this.slots.length ? i % this.slots.length : 0
    }
  }

  /** Fractional index (0 = oldest) of time `t`, clamped to the stored range. NaN when empty. */
  indexOf(t: number): number {
    const s = this._size
    if (!s) return NaN
    if (t <= this.at(0).t) return 0
    if (t >= this.at(s - 1).t) return s - 1
    let lo = 0, hi = s - 1 // at(lo).t <= t < at(hi).t
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (this.at(mid).t <= t) lo = mid; else hi = mid
    }
    const a = this.at(lo).t, b = this.at(hi).t
    return lo + (b > a ? (t - a) / (b - a) : 0)
  }

  /** Stored frame closest in time to `t`, or null when empty. */
  closest(t: number): Slot | null {
    const f = this.indexOf(t)
    return Number.isNaN(f) ? null : this.at(Math.round(f))
  }

  /** Forget every stored frame (targets are kept for reuse). Nothing captured before this is returned again. */
  clear() {
    this._size = 0
    this.head = 0
    this.nextDue = -Infinity
    this.lastT = -Infinity
  }

  /** Free all render targets. */
  release() {
    for (const s of this.slots) s.rt.dispose()
    this.slots = []
    this.clear()
  }

  dispose() {
    this.release()
    this.copy.dispose()
  }
}
