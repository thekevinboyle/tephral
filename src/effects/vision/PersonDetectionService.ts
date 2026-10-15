import type { ObjectDetector, FaceDetector } from '@mediapipe/tasks-vision'
import { tierLimits } from '../../stores/perfTierStore'
import { requestVision, releaseVision, visionMode } from './visionWorkerClient'

/** Frames sent to the vision worker are at most this long side (its detectors take a 512 px copy, head crops the full one). */
const WORKER_FRAME_SIDE = 1024

const WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.33/wasm'
const PERSON_MODEL =
  'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite'
const FACE_MODEL =
  'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite'
const INPUT_LONG_SIDE = 512
/** Most people / faces tracked (the shaders have this many slots). */
export const MAX_PEOPLE = 12
export const MAX_FACES = 4
const MATCH_IOU = 0.25
const HEAD_SIZE = 256
/** A head-pass hit needs more confidence than a full-frame one: signs and patterns get picked up in close crops. */
const HEAD_MIN_SCORE = 0.65
const SMOOTH = 0.55 // share of the new detection taken per update

/** A tracked box in normalized image coordinates, origin top-left. */
export interface TrackedBox {
  id: number
  x: number
  y: number
  w: number
  h: number
  score: number
  /** performance.now() of the last matching detection. */
  seen: number
}

type Raw = { x: number; y: number; w: number; h: number; score: number }

const iou = (a: Raw, b: Raw) => {
  const x0 = Math.max(a.x, b.x), y0 = Math.max(a.y, b.y)
  const x1 = Math.min(a.x + a.w, b.x + b.w), y1 = Math.min(a.y + a.h, b.y + b.h)
  const inter = Math.max(0, x1 - x0) * Math.max(0, y1 - y0)
  return inter / Math.max(1e-6, a.w * a.h + b.w * b.h - inter)
}

/**
 * Keeps ids stable across detections: each new box takes the best-overlapping track (greedy, by IoU),
 * which moves part of the way towards it; unmatched tracks stay for `linger` ms (so a treatment can
 * outlive its person for a moment), then go.
 */
export class BoxTracker {
  tracks: TrackedBox[] = []
  private nextId = 1

  update(dets: Raw[], now: number, linger: number, max: number) {
    const free = new Set(this.tracks)
    const pairs: { t: TrackedBox; d: Raw; s: number }[] = []
    for (const t of this.tracks) for (const d of dets) { const s = iou(t, d); if (s >= MATCH_IOU) pairs.push({ t, d, s }) }
    pairs.sort((a, b) => b.s - a.s)
    const used = new Set<Raw>()
    for (const { t, d } of pairs) {
      if (!free.has(t) || used.has(d)) continue
      free.delete(t); used.add(d)
      t.x += (d.x - t.x) * SMOOTH; t.y += (d.y - t.y) * SMOOTH
      t.w += (d.w - t.w) * SMOOTH; t.h += (d.h - t.h) * SMOOTH
      t.score = d.score; t.seen = now
    }
    for (const d of dets) if (!used.has(d)) this.tracks.push({ id: this.nextId++, ...d, seen: now })
    this.tracks = this.tracks.filter((t) => now - t.seen <= linger)
    // Largest first, capped
    this.tracks.sort((a, b) => b.w * b.h - a.w * a.h)
    if (this.tracks.length > max) this.tracks.length = max
  }

  clear() { this.tracks = [] }
}

/**
 * People and faces in the source, for the per-person effects (Redact, Face lock). Runs MediaPipe's
 * object detector (COCO "person") and face detector on a downscaled copy on its own timer, only while
 * an effect wants it, and tracks the boxes so each person keeps an id.
 */
export class PersonDetectionService {
  readonly people = new BoxTracker()
  readonly faces = new BoxTracker()
  /** Ms an undetected person or face is kept. */
  linger = 400
  status: 'idle' | 'loading' | 'ready' | 'error' = 'idle'

  private wantPeople = false
  private wantFaces = false
  private person: ObjectDetector | null = null
  private face: FaceDetector | null = null
  private loading: Promise<void> | null = null
  private loadId = 0
  private source: HTMLVideoElement | HTMLImageElement | null = null
  private lastVideoTime = -1
  private lastImage: HTMLImageElement | null = null
  private lastTs = 0
  private timer: ReturnType<typeof setTimeout> | null = null
  private canvas = document.createElement('canvas')
  private ctx = this.canvas.getContext('2d')!
  private head = Object.assign(document.createElement('canvas'), { width: HEAD_SIZE, height: HEAD_SIZE })
  private headCtx = this.head.getContext('2d')!

  setSource(el: HTMLVideoElement | HTMLImageElement | null) {
    if (el === this.source) return
    this.gen++ // a result for the previous source is dropped
    this.source = el
    this.lastVideoTime = -1
    this.lastImage = null
    this.people.clear()
    this.faces.clear()
  }

  /** Load and run the detectors while an effect needs them; release them when nothing does. */
  setWanted(people: boolean, faces: boolean) {
    this.wantPeople = people
    this.wantFaces = faces
    if (people || faces) {
      this.ensureLoaded()
      this.schedule()
    } else {
      this.loadId++
      this.gen++
      if (this.timer) clearTimeout(this.timer)
      this.timer = null
      if (visionMode() === 'worker') releaseVision('detect')
      this.person?.close(); this.person = null
      this.face?.close(); this.face = null
      this.loading = null
      this.status = 'idle'
      this.people.clear()
      this.faces.clear()
    }
  }

  dispose() { this.setWanted(false, false) }

  private ensureLoaded() {
    // In the worker the models load on its first job; 'ready' comes with the first result
    if (visionMode() === 'worker') { if (this.status === 'idle') this.status = 'loading'; return }
    if (this.loading) return
    const id = ++this.loadId
    this.status = 'loading'
    this.loading = (async () => {
      try {
        const { ObjectDetector, FaceDetector, FilesetResolver } = await import('@mediapipe/tasks-vision')
        const vision = await FilesetResolver.forVisionTasks(WASM_PATH)
        const [person, face] = await Promise.all([
          ObjectDetector.createFromOptions(vision, {
            baseOptions: { modelAssetPath: PERSON_MODEL, delegate: 'GPU' },
            runningMode: 'VIDEO', categoryAllowlist: ['person'], scoreThreshold: 0.3, maxResults: MAX_PEOPLE,
          }),
          FaceDetector.createFromOptions(vision, {
            baseOptions: { modelAssetPath: FACE_MODEL, delegate: 'GPU' },
            runningMode: 'VIDEO', minDetectionConfidence: 0.45,
          }),
        ])
        if (id !== this.loadId) { person.close(); face.close(); return }
        this.person = person
        this.face = face
        this.status = 'ready'
      } catch (err) {
        if (id !== this.loadId) return
        console.warn('[DETECT] person/face models failed to load:', err)
        this.status = 'error'
        this.loading = null
      }
    })()
  }

  private schedule() {
    if (!(this.wantPeople || this.wantFaces) || this.timer) return
    // ≈ 15 detections a second (5 in the Mobile tier); boxes are smoothed in between
    this.timer = setTimeout(() => { this.timer = null; this.tick(); this.schedule() }, tierLimits().detectMs)
  }

  private tick() {
    if (visionMode() === 'worker') { this.workerTick(); return }
    const src = this.source
    const now = performance.now()
    if (!src || !this.person || !this.face) return
    let sw: number, sh: number
    if (src instanceof HTMLVideoElement) {
      if (src.readyState < 2 || !src.videoWidth) return
      if (src.currentTime === this.lastVideoTime) return // paused: keep the boxes as they are
      sw = src.videoWidth; sh = src.videoHeight
    } else {
      if (!src.complete || !src.naturalWidth) return
      if (src === this.lastImage) return // a still: detect once, keep the boxes
      sw = src.naturalWidth; sh = src.naturalHeight
    }
    const k = INPUT_LONG_SIDE / Math.max(sw, sh)
    const w = Math.max(1, Math.round(sw * k)), h = Math.max(1, Math.round(sh * k))
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h }
    this.ctx.drawImage(src, 0, 0, w, h)
    const ts = Math.max(now, this.lastTs + 1)
    this.lastTs = ts
    // A still keeps its boxes until the source changes
    const linger = src instanceof HTMLImageElement ? Infinity : this.linger
    try {
      if (this.wantPeople) {
        const r = this.person.detectForVideo(this.canvas, ts)
        this.people.update(r.detections.map((d) => toRaw(d.boundingBox, d.categories[0]?.score ?? 0, w, h)), now, linger, MAX_PEOPLE)
      }
      if (this.wantFaces) {
        const r = this.face.detectForVideo(this.canvas, ts)
        let faces = r.detections.map((d) => toRaw(d.boundingBox, d.categories[0]?.score ?? 0, w, h))
        if (!faces.length) faces = this.facesInHeads(src, sw, sh)
        this.faces.update(faces, now, linger, MAX_FACES)
      }
      if (src instanceof HTMLVideoElement) this.lastVideoTime = src.currentTime
      else this.lastImage = src
    } catch (err) {
      console.warn('[DETECT] detection failed:', err)
    }
  }

  private inFlight = false
  private gen = 0
  private big = document.createElement('canvas')
  private bigCtx = this.big.getContext('2d')!

  /**
   * Off the main thread: send the frame (up to 1024 px) to the vision worker and take its boxes when they come
   * back. One job at a time, so a slow phone simply detects less often instead of queueing. If the worker turns
   * out to be unavailable, the main-thread models load and the next tick uses them.
   */
  private workerTick() {
    const src = this.source
    if (!src || this.inFlight) return
    let sw: number, sh: number
    if (src instanceof HTMLVideoElement) {
      if (src.readyState < 2 || !src.videoWidth) return
      if (src.currentTime === this.lastVideoTime) return // paused: keep the boxes as they are
      sw = src.videoWidth; sh = src.videoHeight
    } else {
      if (!src.complete || !src.naturalWidth) return
      if (src === this.lastImage) return // a still: detect once, keep the boxes
      sw = src.naturalWidth; sh = src.naturalHeight
    }
    const k = Math.min(1, WORKER_FRAME_SIDE / Math.max(sw, sh))
    const w = Math.max(1, Math.round(sw * k)), h = Math.max(1, Math.round(sh * k))
    if (this.big.width !== w || this.big.height !== h) { this.big.width = w; this.big.height = h }
    this.bigCtx.drawImage(src, 0, 0, w, h)
    const gen = this.gen
    const video = src instanceof HTMLVideoElement ? src : null
    const frameTime = video?.currentTime ?? 0
    const linger = video ? this.linger : Infinity // a still keeps its boxes until the source changes
    this.inFlight = true
    createImageBitmap(this.big)
      .then((frame) => requestVision({ type: 'detect', frame, people: this.wantPeople, faces: this.wantFaces, headPasses: tierLimits().headPasses, ts: performance.now() }))
      .then((r) => {
        if (gen !== this.gen || r.type !== 'detect') return
        const now = performance.now()
        if (this.wantPeople) this.people.update(r.people, now, linger, MAX_PEOPLE)
        if (this.wantFaces) this.faces.update(r.faces, now, linger, MAX_FACES)
        this.status = 'ready'
        if (video) this.lastVideoTime = frameTime
        else this.lastImage = src as HTMLImageElement
      })
      .catch((err) => {
        if (visionMode() === 'main') this.ensureLoaded() // fell back: load the models here
        else console.warn('[DETECT] detection failed:', err)
      })
      .finally(() => { this.inFlight = false })
  }

  /**
   * The face model is made for faces that fill much of the frame; in a crowd they are tiny. Look again
   * in a square around the top of each of the largest people, enlarged, and map the hits back.
   */
  private facesInHeads(src: HTMLVideoElement | HTMLImageElement, sw: number, sh: number): Raw[] {
    const out: Raw[] = []
    // Faces too small for the full frame are looked for again in the heads of the largest people (3, or 1 on Mobile)
    for (const t of this.people.tracks.slice(0, tierLimits().headPasses)) {
      const side = Math.max(t.w * sw * 0.9, Math.min(t.h * sh * 0.4, t.w * sw * 1.4))
      if (side < 16) continue
      const sx = (t.x + t.w / 2) * sw - side / 2
      const sy = t.y * sh - side * 0.05
      this.headCtx.fillStyle = '#000'
      this.headCtx.fillRect(0, 0, HEAD_SIZE, HEAD_SIZE)
      this.headCtx.drawImage(src, sx, sy, side, side, 0, 0, HEAD_SIZE, HEAD_SIZE)
      const ts = (this.lastTs = this.lastTs + 1)
      const r = this.face!.detectForVideo(this.head, ts)
      const best = r.detections.sort((a, b) => (b.categories[0]?.score ?? 0) - (a.categories[0]?.score ?? 0))[0]
      const b = best?.boundingBox
      if (!b || (best.categories[0]?.score ?? 0) < HEAD_MIN_SCORE) continue
      const k = side / HEAD_SIZE
      out.push({ x: (sx + b.originX * k) / sw, y: (sy + b.originY * k) / sh, w: (b.width * k) / sw, h: (b.height * k) / sh, score: best.categories[0]?.score ?? 0 })
    }
    return out
  }
}

function toRaw(b: { originX: number; originY: number; width: number; height: number } | undefined, score: number, w: number, h: number): Raw {
  if (!b) return { x: 0, y: 0, w: 0, h: 0, score: 0 }
  return { x: b.originX / w, y: b.originY / h, w: b.width / w, h: b.height / h, score }
}
