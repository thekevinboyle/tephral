// Inserts the warp worklet between an audio source and its outputs, and takes it out again.
import { useWarpStore } from '../../stores/warpStore'
import { onWarpClockChange, warpClockSegments, type WarpClockSegment } from './warpClock'

export const WARP_WORKLET_URL = '/worklets/warp-processor.js'

const moduleLoads = new WeakMap<BaseAudioContext, Promise<void>>()
/** Warp nodes currently inserted in a graph (for checks and debugging). */
const live = new Set<AudioWorkletNode>()
/** Processors that reported 'alive' and have not yet reported 'disposed' (context not closed). */
const procs = new Set<{ ctx: BaseAudioContext; alive: boolean; disposed: boolean }>()
/** A warp fading out on an input: calling it finishes the removal at once. */
const fading = new WeakMap<AudioNode, () => void>()
const REMOVE_FADE_MS = 20

/** Load the worklet module once per context. */
export function loadWarpModule(ctx: BaseAudioContext): Promise<void> {
  let p = moduleLoads.get(ctx)
  if (!p) {
    p = ctx.audioWorklet.addModule(WARP_WORKLET_URL)
    p.catch(() => moduleLoads.delete(ctx))
    moduleLoads.set(ctx, p)
  }
  return p
}

type WarpState = ReturnType<typeof useWarpStore.getState>

export function warpParamsMessage(s: WarpState = useWarpStore.getState()) {
  return {
    type: 'params' as const,
    amount: s.amount, skew: s.skew, profile: s.profile,
    smooth: s.params.smooth, grain: s.params.grain, blend: s.params.blend, rate: s.params.rate, crunch: s.params.crunch,
    mix: s.mix, active: true,
  }
}

const clockMessage = (seg: WarpClockSegment, reset = false) => ({ type: 'clock' as const, ...seg, reset })

/** Everything the processor needs to start: LUT, clock segments, params. */
export function warpInitMessages() {
  const segs = warpClockSegments()
  return [
    { type: 'lut' as const, lut: useWarpStore.getState().lut },
    ...segs.map((seg, i) => clockMessage(seg, i === 0)),
    warpParamsMessage(),
  ]
}

const sameParams = (a: WarpState, b: WarpState) =>
  a.amount === b.amount && a.skew === b.skew && a.profile === b.profile && a.params === b.params && a.mix === b.mix

/**
 * input -> outputs becomes input -> warp -> outputs. Resolves to restore(), which puts the original
 * input -> outputs connections back. If the worklet cannot be created the graph is left untouched
 * and restore() is a no-op.
 */
export async function insertAudioWarp(
  ctx: AudioContext, input: AudioNode, outputs: AudioNode[],
  stillWanted: () => boolean = () => true,
): Promise<(reconnect?: boolean) => void> {
  try {
    await loadWarpModule(ctx)
  } catch (err) {
    console.warn('[audioWarp] worklet module failed to load', err)
    return () => {}
  }
  // The graph may have been torn down while the module loaded: leave it alone then.
  if (ctx.state === 'closed' || !stillWanted()) return () => {}
  let node: AudioWorkletNode
  try {
    node = new AudioWorkletNode(ctx, 'warp-processor', {
      numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2],
      channelCount: 2, channelCountMode: 'explicit', channelInterpretation: 'speakers',
      processorOptions: { messages: warpInitMessages() },
    })
  } catch (err) {
    console.warn('[audioWarp] could not create warp node', err)
    return () => {}
  }

  // A warp still fading out on this input is finished now (no reconnect: this one takes over).
  fading.get(input)?.()

  for (const o of outputs) { try { input.disconnect(o) } catch { /* was not connected */ } }
  input.connect(node)
  for (const o of outputs) node.connect(o)
  live.add(node)
  const rec = { ctx, alive: false, disposed: false }
  procs.add(rec)
  node.port.onmessage = (e) => {
    if (e.data === 'alive') rec.alive = true
    else if (e.data === 'disposed') { rec.disposed = true; procs.delete(rec); node.port.close() }
  }

  // Post on change only (never per frame).
  const unsubStore = useWarpStore.subscribe((s, prev) => {
    if (s.lut !== prev.lut) node.port.postMessage({ type: 'lut', lut: s.lut })
    if (!sameParams(s, prev)) node.port.postMessage(warpParamsMessage(s))
  })
  const unsubClock = onWarpClockChange((e) => {
    if (e.reset) e.segments.forEach((seg, i) => node.port.postMessage(clockMessage(seg, i === 0)))
    else node.port.postMessage(clockMessage(e.segment))
  })

  let finished = false
  const finish = (reconnect: boolean) => {
    if (finished) return
    finished = true
    if (fading.get(input) === finishNow) fading.delete(input)
    clearTimeout(timer)
    try { input.disconnect(node) } catch { /* already gone */ }
    try { node.disconnect() } catch { /* already gone */ }
    if (ctx.state === 'closed') { procs.delete(rec); node.port.close() }
    else node.port.postMessage({ type: 'dispose' }) // the processor replies 'disposed'; the port closes then
    // Same task as the disconnect, so the swap lands on one render quantum.
    if (reconnect && ctx.state !== 'closed') for (const o of outputs) { try { input.connect(o) } catch { /* context gone */ } }
  }
  const finishNow = () => finish(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  let restored = false
  // reconnect=true (warp switched off on a live graph): fade the wet signal out, then swap back to
  // the direct connections ~20 ms later. reconnect=false: the caller is dropping the graph, so the
  // warp is taken out at once and nothing is reconnected.
  return (reconnect = true) => {
    if (restored) return
    restored = true
    unsubStore()
    unsubClock()
    live.delete(node)
    if (!reconnect || ctx.state !== 'running') { finish(reconnect); return }
    node.port.postMessage({ type: 'params', active: false })
    fading.set(input, finishNow)
    timer = setTimeout(() => finish(true), REMOVE_FADE_MS)
  }
}

/** Number of warp nodes currently inserted (tests). */
export function activeAudioWarpCount(): number {
  return live.size
}

export interface AudioWarpGraph { ctx: AudioContext; input: AudioNode; outputs: AudioNode[] }

/**
 * Holds at most one warp for the current audible graph. sync() inserts it when the warp is on
 * (enabled and not video-only) and removes it otherwise; setGraph(null) removes it before the
 * graph is torn down. Handles inserts that are still loading when the graph changes.
 */
export function createAudioWarpSlot() {
  let graph: AudioWarpGraph | null = null
  let restore: ((reconnect?: boolean) => void) | null = null
  let pending = 0 // id of the insert in flight, 0 = none
  let nextId = 1

  // reconnect=true: warp switched off on a live graph (fade out, restore direct connections).
  // reconnect=false: the graph is being dropped; just take the warp out.
  const remove = (reconnect: boolean) => {
    pending = 0
    if (restore) { const r = restore; restore = null; r(reconnect) }
  }
  const sync = () => {
    const s = useWarpStore.getState()
    const want = !!graph && s.enabled && s.appliesTo !== 'video'
    if (!want) { remove(true); return }
    if (restore || pending) return
    const id = nextId++
    pending = id
    const g = graph!
    insertAudioWarp(g.ctx, g.input, g.outputs, () => pending === id && graph === g).then((r) => {
      if (pending !== id || graph !== g) { r(graph === g); return }
      pending = 0
      restore = r
    })
  }
  return {
    sync,
    setGraph(g: AudioWarpGraph | null) {
      if (g === graph) return
      remove(false)
      graph = g
      sync()
    },
  }
}

/** Live warp processors (alive, not disposed, context open) - tests. */
export function liveWarpProcessorCount(): number {
  let n = 0
  for (const r of procs) {
    if (r.ctx.state === 'closed') procs.delete(r)
    else if (r.alive) n++
  }
  return n
}

/** The inserted warp nodes (tests). */
export function activeAudioWarpNodes(): AudioWorkletNode[] {
  return [...live]
}
