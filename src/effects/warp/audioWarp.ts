// Inserts the warp worklet between an audio source and its outputs, and takes it out again.
import { useWarpStore } from '../../stores/warpStore'
import { onWarpClockChange, warpClockSegments, type WarpClockSegment } from './warpClock'

export const WARP_WORKLET_URL = '/worklets/warp-processor.js'

const moduleLoads = new WeakMap<BaseAudioContext, Promise<void>>()
/** Warp nodes currently inserted in a graph (for checks and debugging). */
const live = new Set<AudioWorkletNode>()

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

  for (const o of outputs) { try { input.disconnect(o) } catch { /* was not connected */ } }
  input.connect(node)
  for (const o of outputs) node.connect(o)
  live.add(node)

  // Post on change only (never per frame).
  const unsubStore = useWarpStore.subscribe((s, prev) => {
    if (s.lut !== prev.lut) node.port.postMessage({ type: 'lut', lut: s.lut })
    if (!sameParams(s, prev)) node.port.postMessage(warpParamsMessage(s))
  })
  const unsubClock = onWarpClockChange((e) => {
    if (e.reset) e.segments.forEach((seg, i) => node.port.postMessage(clockMessage(seg, i === 0)))
    else node.port.postMessage(clockMessage(e.segment))
  })

  let restored = false
  // reconnect=false: the caller has already dropped the graph, so only take the warp out.
  return (reconnect = true) => {
    if (restored) return
    restored = true
    unsubStore()
    unsubClock()
    live.delete(node)
    try { input.disconnect(node) } catch { /* already gone */ }
    try { node.disconnect() } catch { /* already gone */ }
    node.port.close()
    if (reconnect && ctx.state !== 'closed') for (const o of outputs) { try { input.connect(o) } catch { /* context gone */ } }
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
  let restore: (() => void) | null = null
  let pending = 0 // id of the insert in flight, 0 = none
  let nextId = 1

  const remove = () => {
    pending = 0
    if (restore) { const r = restore; restore = null; r() }
  }
  const sync = () => {
    const s = useWarpStore.getState()
    const want = !!graph && s.enabled && s.appliesTo !== 'video'
    if (!want) { remove(); return }
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
      remove()
      graph = g
      sync()
    },
  }
}

/** The inserted warp nodes (tests). */
export function activeAudioWarpNodes(): AudioWorkletNode[] {
  return [...live]
}
