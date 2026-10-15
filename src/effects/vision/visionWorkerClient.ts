import type { VisionRequest, VisionResponse } from './visionWorker'

/**
 * The vision worker, shared by person/face detection and person segmentation. Starts on first use. If it
 * cannot start or a model fails to load in it, `visionMode()` turns to 'main' and the services fall back to
 * their main-thread path. `?vision=main` forces the main thread (to compare on a device).
 */
type Mode = 'worker' | 'main'

let worker: Worker | null = null
let mode: Mode = typeof location !== 'undefined' && new URLSearchParams(location.search).get('vision') === 'main' ? 'main' : 'worker'
let nextId = 1
let delegate = ''
const pending = new Map<number, { resolve: (r: VisionResponse) => void; reject: (e: Error) => void }>()

export const visionMode = (): Mode => mode
/** 'GPU' or 'CPU' once the worker has run a detection ('' before). */
export const visionDelegate = (): string => delegate

function fail(why: string) {
  if (mode === 'main') return
  console.warn('[VISION] worker unavailable, using the main thread:', why)
  mode = 'main'
  worker?.terminate()
  worker = null
  for (const p of pending.values()) p.reject(new Error(why))
  pending.clear()
}

function ensure(): Worker | null {
  if (mode === 'main') return null
  if (worker) return worker
  try {
    worker = new Worker(new URL('./visionWorker.ts', import.meta.url), { type: 'module' })
  } catch (e) {
    fail(String(e))
    return null
  }
  worker.onmessage = (e: MessageEvent<VisionResponse>) => {
    const r = e.data
    const p = pending.get(r.id)
    if (!p) return
    pending.delete(r.id)
    if (r.type === 'error') {
      // A model that cannot load in the worker (no WebGL there, a blocked fetch): fall back for good
      if (/load|fetch|wasm|WebGL|importScripts|Failed/i.test(r.message)) fail(r.message)
      p.reject(new Error(r.message))
      return
    }
    if (r.type === 'detect') delegate = r.delegate
    p.resolve(r)
  }
  worker.onerror = (e) => fail(e.message || 'worker error')
  return worker
}

/** Send a job (the frame is transferred, not copied). Rejects when the worker is unavailable. */
export function requestVision(msg: Omit<Extract<VisionRequest, { type: 'detect' }>, 'id'> | Omit<Extract<VisionRequest, { type: 'segment' }>, 'id'>): Promise<VisionResponse> {
  const w = ensure()
  if (!w) { msg.frame.close(); return Promise.reject(new Error('vision worker unavailable')) }
  const id = nextId++
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    w.postMessage({ ...msg, id }, [msg.frame])
  })
}

/** Close a kind of model in the worker (no consumer wants it any more). */
export function releaseVision(what: 'detect' | 'segment'): void {
  worker?.postMessage({ type: 'release', what } satisfies VisionRequest)
}
