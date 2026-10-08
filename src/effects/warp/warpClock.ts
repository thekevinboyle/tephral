// One warp clock for video and audio.
//
// Time base: the active AudioContext's currentTime when one exists (so the audio worklet,
// which computes phase from its own currentTime, agrees exactly), otherwise
// performance.now()/1000 + offset. Switching between the two keeps the phase continuous.
//
// The clock is a short list of segments. Each segment says "from time `at`, phase is
// frac((t - t0) / loopSeconds(lengthBeats, bpm))". A tempo or length change adds a segment
// a little in the future (LOOKAHEAD) whose t0 is chosen so the phase is identical on both
// sides of `at`. The worklet gets the same segment and switches on the exact same sample,
// so the phase never steps, however late the message arrives (within LOOKAHEAD).
import { loopSeconds } from './warpMath'
import { useWarpStore } from '../../stores/warpStore'
import { useEffectSequencerStore } from '../../stores/effectSequencerStore'
import { useAudioSourceStore } from '../../stores/audioSourceStore'

export interface WarpClockSegment { at: number; t0: number; bpm: number; lengthBeats: number }
/** Sent to listeners. `reset` replaces the whole list (time base changed); otherwise it is one new segment. */
export type WarpClockEvent = { reset: true; segments: WarpClockSegment[] } | { reset: false; segment: WarpClockSegment }

/** Tempo/length changes take effect this far ahead so the worklet can switch on the same sample. */
export const WARP_CLOCK_LOOKAHEAD = 0.05

let timeBase: BaseAudioContext | null = null
let perfOffset = 0
let segs: WarpClockSegment[] = [{
  at: -Infinity, t0: 0,
  bpm: useEffectSequencerStore.getState().bpm,
  lengthBeats: useWarpStore.getState().lengthBeats,
}]
const listeners = new Set<(e: WarpClockEvent) => void>()

const frac = (v: number) => v - Math.floor(v)

/** Current value of the shared time base, in seconds. */
export function warpNow(): number {
  return timeBase ? timeBase.currentTime : performance.now() / 1000 + perfOffset
}

function segAt(time: number): WarpClockSegment {
  let s = segs[0]
  for (let i = 1; i < segs.length; i++) if (segs[i].at <= time) s = segs[i]; else break
  return s
}

/** 0..1 loop phase at `ctxTime` (a time on the shared base, normally warpNow()). */
export function getWarpPhase(ctxTime: number): number {
  const s = segAt(ctxTime)
  return frac((ctxTime - s.t0) / loopSeconds(s.lengthBeats, s.bpm))
}

function emit(e: WarpClockEvent) { listeners.forEach((fn) => fn(e)) }

/**
 * Anchor the loop so the phase at `ctxTime` is `phase` (default 0), using the current BPM and length.
 * Passing the phase the clock already has at `ctxTime` keeps x continuous (tempo/length changes).
 */
export function setWarpAnchor(ctxTime: number, phase = 0): void {
  const bpm = useEffectSequencerStore.getState().bpm
  const lengthBeats = useWarpStore.getState().lengthBeats
  const seg: WarpClockSegment = { at: ctxTime, t0: ctxTime - phase * loopSeconds(lengthBeats, bpm), bpm, lengthBeats }
  // Later segments are superseded; segments wholly in the past (a newer one has started) are dropped.
  segs = segs.filter((s) => s.at < ctxTime)
  segs.push(seg)
  const now = warpNow()
  while (segs.length > 1 && segs[1].at <= now) segs.shift()
  emit({ reset: false, segment: { ...seg } })
}

/** The segment in force latest (posted to the worklet). */
export function warpClockSnapshot(): { t0: number; bpm: number; lengthBeats: number; at: number } {
  return { ...segs[segs.length - 1] }
}

export function warpClockSegments(): WarpClockSegment[] {
  return segs.map((s) => ({ ...s }))
}

/** Listen for clock changes. */
export function onWarpClockChange(fn: (e: WarpClockEvent) => void): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

/** Switch the time base (an AudioContext, or null for the performance.now fallback) keeping the phase continuous. */
export function setWarpTimeBase(ctx: BaseAudioContext | null): void {
  if (ctx === timeBase) return
  const before = warpNow()
  timeBase = ctx
  if (!ctx) {
    // Fallback continues from where the context left off: no shift needed.
    perfOffset = before - performance.now() / 1000
    return
  }
  const delta = ctx.currentTime - before
  segs = segs.map((s) => ({ ...s, at: s.at + delta, t0: s.t0 + delta }))
  emit({ reset: true, segments: warpClockSegments() })
}

/** Re-anchor on BPM/length changes (x preserved) and on sequencer play (x = 0 at step 0). */
function reanchorKeepingPhase() {
  const at = warpNow() + WARP_CLOCK_LOOKAHEAD
  setWarpAnchor(at, getWarpPhase(at))
}

let wired = false
function wire() {
  if (wired) return
  wired = true
  useEffectSequencerStore.subscribe((s, prev) => {
    if (s.isPlaying && !prev.isPlaying) setWarpAnchor(warpNow(), 0)
    else if (s.bpm !== prev.bpm) reanchorKeepingPhase()
  })
  useWarpStore.subscribe((s, prev) => {
    if (s.lengthBeats !== prev.lengthBeats) reanchorKeepingPhase()
  })
  useAudioSourceStore.subscribe((s, prev) => {
    if (s.audioContext !== prev.audioContext) setWarpTimeBase(s.audioContext)
  })
  setWarpTimeBase(useAudioSourceStore.getState().audioContext)
}
wire()
