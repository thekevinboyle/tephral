/// <reference lib="webworker" />
// Runs MediaPipe's person/face detectors and the person segmenter off the main thread, so a slow inference
// never holds up a rendered frame (on an iPhone it did: 17 fps with constant stalls). Frames arrive as
// ImageBitmaps; boxes and masks go back. Loaded as a module worker; MediaPipe loads its runtime with
// importScripts, which module workers lack, so a synchronous stand-in is installed first.
import type { ObjectDetector, FaceDetector, ImageSegmenter } from '@mediapipe/tasks-vision'

const scope = self as unknown as DedicatedWorkerGlobalScope & { importScripts?: (...urls: string[]) => void }
try { scope.importScripts?.() } catch {
  // A module worker: emulate importScripts with a synchronous fetch evaluated in global scope
  scope.importScripts = (...urls: string[]) => {
    for (const u of urls) {
      const x = new XMLHttpRequest()
      x.open('GET', u, false)
      x.send()
      ;(0, eval)(x.responseText)
    }
  }
}

const WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.33/wasm'
const PERSON_MODEL = 'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite'
const FACE_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite'
const SEG_MODEL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite'
const DETECT_SIDE = 512
const HEAD_SIZE = 256
const HEAD_MIN_SCORE = 0.65

export type Raw = { x: number; y: number; w: number; h: number; score: number }
export type VisionRequest =
  | { type: 'detect'; id: number; frame: ImageBitmap; people: boolean; faces: boolean; headPasses: number; side: number; ts: number }
  | { type: 'segment'; id: number; frame: ImageBitmap; ts: number }
  | { type: 'release'; what: 'detect' | 'segment' }
export type VisionResponse =
  | { type: 'detect'; id: number; people: Raw[]; faces: Raw[]; delegate: string }
  | { type: 'segment'; id: number; mask: Uint8Array; width: number; height: number }
  | { type: 'error'; id: number; message: string }

let lib: typeof import('@mediapipe/tasks-vision') | null = null
let fileset: Awaited<ReturnType<typeof import('@mediapipe/tasks-vision')['FilesetResolver']['forVisionTasks']>> | null = null
let person: ObjectDetector | null = null
let face: FaceDetector | null = null
let seg: ImageSegmenter | null = null
let delegate = 'GPU'
let lastTs = 0

async function vision() {
  if (!lib) lib = await import('@mediapipe/tasks-vision')
  if (!fileset) fileset = await lib.FilesetResolver.forVisionTasks(WASM_PATH)
  return { lib, fileset }
}

/** Create a task on the GPU (an OffscreenCanvas of its own), falling back to the CPU where WebGL in a worker fails. */
async function create<T>(make: (d: 'GPU' | 'CPU', canvas?: OffscreenCanvas) => Promise<T>): Promise<T> {
  try {
    const t = await make('GPU', new OffscreenCanvas(1, 1))
    return t
  } catch {
    delegate = 'CPU'
    return make('CPU')
  }
}

async function detectors() {
  const { lib, fileset } = await vision()
  if (!person) person = await create((d, canvas) => lib.ObjectDetector.createFromOptions(fileset, {
    canvas, baseOptions: { modelAssetPath: PERSON_MODEL, delegate: d }, runningMode: 'VIDEO',
    categoryAllowlist: ['person'], scoreThreshold: 0.3, maxResults: 12,
  }))
  if (!face) face = await create((d, canvas) => lib.FaceDetector.createFromOptions(fileset, {
    canvas, baseOptions: { modelAssetPath: FACE_MODEL, delegate: d }, runningMode: 'VIDEO', minDetectionConfidence: 0.45,
  }))
  return { person, face }
}

async function segmenter() {
  const { lib, fileset } = await vision()
  if (!seg) seg = await create((d, canvas) => lib.ImageSegmenter.createFromOptions(fileset, {
    canvas, baseOptions: { modelAssetPath: SEG_MODEL, delegate: d }, runningMode: 'VIDEO',
    outputCategoryMask: true, outputConfidenceMasks: false,
  }))
  return seg
}

const nextTs = (ts: number) => (lastTs = Math.max(ts, lastTs + 1))
const small = new OffscreenCanvas(1, 1)
const smallCtx = small.getContext('2d')!
const head = new OffscreenCanvas(HEAD_SIZE, HEAD_SIZE)
const headCtx = head.getContext('2d')!

type Box = { originX: number; originY: number; width: number; height: number }
const toRaw = (b: Box | undefined, score: number, w: number, h: number): Raw =>
  b ? { x: b.originX / w, y: b.originY / h, w: b.width / w, h: b.height / h, score } : { x: 0, y: 0, w: 0, h: 0, score: 0 }

async function detect(m: Extract<VisionRequest, { type: 'detect' }>): Promise<VisionResponse> {
  const { person, face } = await detectors()
  const f = m.frame
  // Detectors take a 512 px copy (the tier's detectSide); head crops come from the full frame sent (sharper on small faces)
  const k = (m.side || DETECT_SIDE) / Math.max(f.width, f.height)
  const w = Math.max(1, Math.round(f.width * k)), h = Math.max(1, Math.round(f.height * k))
  if (small.width !== w || small.height !== h) { small.width = w; small.height = h }
  smallCtx.drawImage(f, 0, 0, w, h)
  let people: Raw[] = [], faces: Raw[] = []
  if (m.people || m.faces) {
    people = person.detectForVideo(small, nextTs(m.ts)).detections.map((d) => toRaw(d.boundingBox, d.categories[0]?.score ?? 0, w, h))
  }
  if (m.faces) {
    faces = face.detectForVideo(small, nextTs(m.ts)).detections.map((d) => toRaw(d.boundingBox, d.categories[0]?.score ?? 0, w, h))
    if (!faces.length) {
      const sorted = [...people].sort((a, b) => b.w * b.h - a.w * a.h).slice(0, m.headPasses)
      for (const t of sorted) {
        const side = Math.max(t.w * f.width * 0.9, Math.min(t.h * f.height * 0.4, t.w * f.width * 1.4))
        if (side < 16) continue
        const sx = (t.x + t.w / 2) * f.width - side / 2, sy = t.y * f.height - side * 0.05
        headCtx.fillStyle = '#000'
        headCtx.fillRect(0, 0, HEAD_SIZE, HEAD_SIZE)
        headCtx.drawImage(f, sx, sy, side, side, 0, 0, HEAD_SIZE, HEAD_SIZE)
        const best = face.detectForVideo(head, nextTs(m.ts)).detections.sort((a, b) => (b.categories[0]?.score ?? 0) - (a.categories[0]?.score ?? 0))[0]
        const b = best?.boundingBox, score = best?.categories[0]?.score ?? 0
        if (!b || score < HEAD_MIN_SCORE) continue
        const s = side / HEAD_SIZE
        faces.push({ x: (sx + b.originX * s) / f.width, y: (sy + b.originY * s) / f.height, w: (b.width * s) / f.width, h: (b.height * s) / f.height, score })
      }
    }
  }
  f.close()
  return { type: 'detect', id: m.id, people: m.people ? people : [], faces, delegate }
}

async function segment(m: Extract<VisionRequest, { type: 'segment' }>): Promise<VisionResponse> {
  const s = await segmenter()
  const r = s.segmentForVideo(m.frame, nextTs(m.ts))
  m.frame.close()
  const mask = r.categoryMask
  if (!mask) { r.close(); return { type: 'error', id: m.id, message: 'no mask' } }
  const out = { type: 'segment' as const, id: m.id, mask: mask.getAsUint8Array().slice(), width: mask.width, height: mask.height }
  r.close()
  return out
}

scope.onmessage = async (e: MessageEvent<VisionRequest>) => {
  const m = e.data
  if (m.type === 'release') {
    if (m.what === 'detect') { person?.close(); face?.close(); person = face = null }
    else { seg?.close(); seg = null }
    return
  }
  try {
    const res = m.type === 'detect' ? await detect(m) : await segment(m)
    if (res.type === 'segment') scope.postMessage(res, [res.mask.buffer])
    else scope.postMessage(res)
  } catch (err) {
    try { m.frame.close() } catch { /* already closed */ }
    scope.postMessage({ type: 'error', id: m.id, message: String((err as Error)?.message ?? err) } satisfies VisionResponse)
  }
}
