import * as THREE from 'three'
import type { ImageSegmenter } from '@mediapipe/tasks-vision'
import { useUIStore } from '../../stores/uiStore'

const WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.33/wasm'
const MODEL_PATH =
  'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite'
const TICK_MS = 33 // ≤ 30 fps
const INPUT_WIDTH = 256 // downscale before inference; mask comes back at this size
const COVERAGE_SMOOTHING = 0.15

export type SegStatus = 'idle' | 'loading' | 'ready' | 'error'

/**
 * Person/part segmentation shared by the SEG effects. Runs MediaPipe's
 * multiclass selfie model on a downscaled copy of the source on its own
 * timer (never inside the render loop) and publishes a class-ID texture:
 * 0 background, 1 hair, 2 body-skin, 3 face-skin, 4 clothes, 5 others.
 * Row 0 of the texture is the TOP of the image — shaders flip v.
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
  private active = false
  private busy = false
  private timer: ReturnType<typeof setTimeout> | null = null
  private canvas = document.createElement('canvas')
  private ctx = this.canvas.getContext('2d', { willReadFrequently: false })!
  private lastTimestamp = 0
  private loadId = 0 // bumps on every load start and on deactivate; stale loads are ignored
  private generation = 0 // bumps on setSource/setActive(false) to drop stale callbacks

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
    this.generation++
    this.clearMask()
  }

  setActive(active: boolean) {
    if (active === this.active) return
    this.active = active
    if (active) {
      this.ensureLoaded()
      this.schedule()
    } else {
      this.generation++
      this.loadId++
      this.lastImage = null
      if (this.timer) clearTimeout(this.timer)
      this.timer = null
      this.segmenter?.close()
      this.segmenter = null
      this.loadPromise = null
      this.status = 'idle'
      useUIStore.getState().setStatusText(null)
      this.clearMask()
    }
  }

  dispose() {
    this.setActive(false)
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
        const seg = await ImageSegmenter.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_PATH, delegate: 'GPU' },
          runningMode: 'VIDEO',
          outputCategoryMask: true,
          outputConfidenceMasks: false,
        })
        if (id !== this.loadId) { seg.close(); return }
        this.segmenter = seg
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
    if (!this.active) return
    this.timer = setTimeout(() => { this.tick(); this.schedule() }, TICK_MS)
  }

  private tick() {
    const seg = this.segmenter
    const src = this.source
    if (!seg || !src || this.busy) return
    if (src instanceof HTMLVideoElement) {
      if (src.readyState < 2 || src.videoWidth === 0) return
    } else {
      if (!src.complete || src.naturalWidth === 0 || src === this.lastImage) return
    }
    const sw = src instanceof HTMLVideoElement ? src.videoWidth : src.naturalWidth
    const sh = src instanceof HTMLVideoElement ? src.videoHeight : src.naturalHeight
    const w = INPUT_WIDTH
    const h = Math.max(1, Math.round((INPUT_WIDTH * sh) / sw))
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h }
    this.ctx.drawImage(src, 0, 0, w, h)

    // VIDEO mode requires strictly increasing timestamps
    const ts = Math.max(performance.now(), this.lastTimestamp + 1)
    this.lastTimestamp = ts
    const gen = this.generation
    this.busy = true
    try {
      seg.segmentForVideo(this.canvas, ts, (result) => {
        const mask = result.categoryMask
        if (mask && gen === this.generation) this.publish(mask.getAsUint8Array(), mask.width, mask.height)
        result.close()
      })
      if (src instanceof HTMLImageElement) this.lastImage = src
    } catch (err) {
      console.warn('[SEG] segmentation failed:', err)
    } finally {
      this.busy = false
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
