import * as THREE from 'three'
import type { ImageSegmenter, ImageSegmenterResult } from '@mediapipe/tasks-vision'
import { useUIStore } from '../../stores/uiStore'

const WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.33/wasm'
const MODEL_PATH =
  'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite'
const TICK_MS = 33 // ≤ 30 fps
const SLOW_TICK_MS = 66 // back-off interval while ticks run long
const SLOW_TICK_WORK_MS = 8 // a tick's main-thread work above this triggers the back-off
const RECOVER_TICKS = 30 // consecutive fast ticks before returning to TICK_MS
const INPUT_WIDTH = 256 // downscale before inference; mask comes back at this size
const COVERAGE_SMOOTHING = 0.15

export type SegStatus = 'idle' | 'loading' | 'ready' | 'error'

/**
 * Person/part segmentation shared by the SEG effects. Runs MediaPipe's
 * multiclass selfie model on a downscaled copy of the source on its own
 * timer and publishes a class-ID texture:
 * 0 background, 1 hair, 2 body-skin, 3 face-skin, 4 clothes, 5 others.
 * Row 0 of the texture is the TOP of the image — shaders flip v.
 *
 * Inference runs on the main thread between frames; it does not block a
 * render in progress, but a slow tick delays the next one. To keep ticks
 * short, each tick submits a frame and flushes MediaPipe's GL context, and
 * the mask is read back on the NEXT tick (by then the GPU is done, so the
 * readback doesn't stall) — the mask trails the video by one tick. Unchanged
 * video frames are skipped, and the interval backs off to SLOW_TICK_MS while
 * ticks run long. (A Worker + OffscreenCanvas port is a follow-up.)
 */
export class SegmentationService {
  readonly maskTexture: THREE.DataTexture
  personCoverage = 0
  hasMask = false
  status: SegStatus = 'idle'

  private segmenter: ImageSegmenter | null = null
  private loadPromise: Promise<void> | null = null
  private source: HTMLVideoElement | HTMLImageElement | null = null
  private lastImage: HTMLImageElement | null = null
  private wanted = false // a SEG consumer is enabled: keep the model loaded
  private paused = false // every consumer is bypassed/soloed out/killed: stop ticking, keep the mask
  private pending: { result: ImageSegmenterResult; gen: number } | null = null // submitted, not yet read back
  private lastVideoTime = -1 // currentTime of the last submitted video frame
  private interval = TICK_MS
  private fastStreak = 0
  private mpGl: WebGL2RenderingContext | null = null // MediaPipe's own context, flushed after submit
  private timer: ReturnType<typeof setTimeout> | null = null
  private canvas = document.createElement('canvas')
  private ctx = this.canvas.getContext('2d', { willReadFrequently: false })!
  private lastTimestamp = 0
  private loadId = 0 // bumps on every load start and on deactivate; stale loads are ignored
  private generation = 0 // bumps on setSource/setWanted(false) to drop stale callbacks

  constructor() {
    this.maskTexture = new THREE.DataTexture(new Uint8Array(1), 1, 1, THREE.RedFormat, THREE.UnsignedByteType)
    this.maskTexture.minFilter = THREE.NearestFilter
    this.maskTexture.magFilter = THREE.NearestFilter
    this.maskTexture.flipY = false
    this.maskTexture.needsUpdate = true
  }

  setSource(el: HTMLVideoElement | HTMLImageElement | null) {
    if (el === this.source) return
    this.source = el
    this.lastImage = null
    this.lastVideoTime = -1
    this.generation++
    this.clearMask()
  }

  /** Load and keep the model while true; close it and clear the mask when false. */
  setWanted(wanted: boolean) {
    if (wanted === this.wanted) return
    this.wanted = wanted
    if (wanted) {
      this.ensureLoaded()
      this.schedule()
    } else {
      this.generation++
      this.loadId++
      this.lastImage = null
      this.lastVideoTime = -1
      this.stopTimer()
      this.dropPending()
      this.segmenter?.close()
      this.segmenter = null
      this.mpGl = null
      this.loadPromise = null
      this.status = 'idle'
      useUIStore.getState().setStatusText(null)
      this.clearMask()
    }
  }

  /** Stop ticking while true; the model, last mask and hasMask are kept. */
  setPaused(paused: boolean) {
    if (paused === this.paused) return
    this.paused = paused
    if (paused) this.stopTimer()
    else this.schedule()
  }

  dispose() {
    this.setWanted(false)
    this.maskTexture.dispose()
  }

  private clearMask() {
    this.hasMask = false
    this.personCoverage = 0
    const img = this.maskTexture.image as { data: Uint8Array; width: number; height: number }
    img.data.fill(0)
    this.maskTexture.needsUpdate = true
  }

  private ensureLoaded() {
    if (this.loadPromise) return
    const id = ++this.loadId
    this.status = 'loading'
    useUIStore.getState().setStatusText('SEG: loading person model…')
    this.loadPromise = (async () => {
      try {
        const { ImageSegmenter, FilesetResolver } = await import('@mediapipe/tasks-vision')
        const vision = await FilesetResolver.forVisionTasks(WASM_PATH)
        const canvas = document.createElement('canvas') // fresh per load; close() may release its context
        const seg = await ImageSegmenter.createFromOptions(vision, {
          canvas,
          baseOptions: { modelAssetPath: MODEL_PATH, delegate: 'GPU' },
          runningMode: 'VIDEO',
          outputCategoryMask: true,
          outputConfidenceMasks: false,
        })
        if (id !== this.loadId) { seg.close(); return }
        this.segmenter = seg
        this.mpGl = canvas.getContext('webgl2') // same context MediaPipe created (null if it chose webgl1)
        this.interval = TICK_MS
        this.fastStreak = 0
        this.status = 'ready'
        useUIStore.getState().setStatusText(null)
      } catch (err) {
        if (id !== this.loadId) return
        console.warn('[SEG] person model failed to load:', err)
        this.status = 'error'
        this.loadPromise = null
        useUIStore.getState().setStatusText('SEG: person mask unavailable')
      }
    })()
  }

  private schedule() {
    if (!this.wanted || this.paused || this.timer) return
    this.timer = setTimeout(() => { this.timer = null; this.tick(); this.schedule() }, this.interval)
  }

  private stopTimer() {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
  }

  private dropPending() {
    this.pending?.result.close()
    this.pending = null
  }

  private tick() {
    const seg = this.segmenter
    if (!seg) return
    const t0 = performance.now()
    const collected = this.collect()
    const submitted = this.submit(seg)
    if (collected || submitted) this.adapt(performance.now() - t0)
  }

  /** Read back the previous tick's mask (its GPU work has finished by now). */
  private collect(): boolean {
    const p = this.pending
    if (!p) return false
    this.pending = null
    try {
      const mask = p.result.categoryMask
      if (mask && p.gen === this.generation) this.publish(mask.getAsUint8Array(), mask.width, mask.height)
    } catch (err) {
      console.warn('[SEG] segmentation failed:', err)
    } finally {
      p.result.close()
    }
    return true
  }

  /** Downscale the current source frame and queue it for inference. */
  private submit(seg: ImageSegmenter): boolean {
    const src = this.source
    if (!src) return false
    if (src instanceof HTMLVideoElement) {
      if (src.readyState < 2 || src.videoWidth === 0 || src.currentTime === this.lastVideoTime) return false
    } else {
      if (!src.complete || src.naturalWidth === 0 || src === this.lastImage) return false
    }
    const sw = src instanceof HTMLVideoElement ? src.videoWidth : src.naturalWidth
    const sh = src instanceof HTMLVideoElement ? src.videoHeight : src.naturalHeight
    const w = INPUT_WIDTH
    const h = Math.max(1, Math.round((INPUT_WIDTH * sh) / sw))
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h }
    const frameTime = src instanceof HTMLVideoElement ? src.currentTime : -1
    this.ctx.drawImage(src, 0, 0, w, h)

    // VIDEO mode requires strictly increasing timestamps
    const ts = Math.max(performance.now(), this.lastTimestamp + 1)
    this.lastTimestamp = ts
    try {
      // No-callback form: the result's masks are copies we own until close()
      this.pending = { result: seg.segmentForVideo(this.canvas, ts), gen: this.generation }
      this.mpGl?.flush() // start the GPU work now so next tick's readback doesn't wait on it
      if (src instanceof HTMLImageElement) this.lastImage = src
      else this.lastVideoTime = frameTime
    } catch (err) {
      console.warn('[SEG] segmentation failed:', err)
    }
    return true
  }

  /** Back off to SLOW_TICK_MS while ticks run long; recover after a run of fast ones. */
  private adapt(ms: number) {
    if (ms > SLOW_TICK_WORK_MS) {
      this.interval = SLOW_TICK_MS
      this.fastStreak = 0
    } else if (this.interval !== TICK_MS && ++this.fastStreak >= RECOVER_TICKS) {
      this.interval = TICK_MS
      this.fastStreak = 0
    }
  }

  private publish(data: Uint8Array, w: number, h: number) {
    const img = this.maskTexture.image as { data: Uint8Array; width: number; height: number }
    if (img.width !== w || img.height !== h) {
      this.maskTexture.dispose() // free the GL texture so the next upload re-allocates at the new size
      img.data = new Uint8Array(w * h)
      img.width = w
      img.height = h
    }
    img.data.set(data)
    let person = 0
    for (let i = 0; i < data.length; i++) if (data[i] !== 0) person++
    const cov = person / data.length
    this.personCoverage = this.hasMask ? this.personCoverage + (cov - this.personCoverage) * COVERAGE_SMOOTHING : cov
    this.hasMask = true
    this.maskTexture.needsUpdate = true
  }
}
