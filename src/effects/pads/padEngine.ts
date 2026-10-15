// X/Y pads: a recorded finger (or mouse) path per pad, replayed in time with the transport, driving two
// targets each. Runs inside the modulation loop (useContinuousModulation), outside React.
import { usePadStore, type PadSettings } from '../../stores/padStore'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { useEffectSequencerStore } from '../../stores/effectSequencerStore'
import { useRoutingStore } from '../../stores/routingStore'
import { useWarpStore } from '../../stores/warpStore'
import { EFFECT_PARAM_REGISTRY } from '../../config/effectParams'
import { isEffectActive } from '../../hooks/useEffectToggle'
import { getTransportBeats } from '../lines/linePhase'
import { getUserMix, noteModulatedMix } from '../mixModulation'

/** Recorded positions per loop. */
export const PAD_SLOTS = 256

interface PadPath { xs: Float32Array; ys: Float32Array }
const paths = new Map<string, PadPath>()

/** The pad's path (values 0..1, y up; NaN = nothing recorded at that point of the loop). */
export function getPadPath(id: string): PadPath {
  let p = paths.get(id)
  if (!p) { p = { xs: new Float32Array(PAD_SLOTS).fill(NaN), ys: new Float32Array(PAD_SLOTS).fill(NaN) }; paths.set(id, p) }
  return p
}
export const hasPadPath = (id: string): boolean => { const p = paths.get(id); return !!p && p.xs.some((v) => !Number.isNaN(v)) }

export function clearPadPath(id: string): void {
  const p = paths.get(id)
  if (p) { p.xs.fill(NaN); p.ys.fill(NaN) }
  usePadStore.getState().bump(id)
}

/** A random looping path: a couple of whole-number sine cycles per axis, so the end meets the start. */
export function dicePadPath(id: string, rand: () => number = Math.random): void {
  const p = getPadPath(id)
  const cyc = () => 1 + Math.floor(rand() * 3)
  const [a, b, c, d] = [cyc(), cyc() + 1, cyc(), cyc() + 1]
  const [p1, p2, p3, p4] = [rand(), rand(), rand(), rand()].map((v) => v * Math.PI * 2)
  for (let i = 0; i < PAD_SLOTS; i++) {
    const t = (i / PAD_SLOTS) * Math.PI * 2
    p.xs[i] = clamp01(0.5 + 0.32 * Math.sin(a * t + p1) + 0.12 * Math.sin(b * t + p2))
    p.ys[i] = clamp01(0.5 + 0.32 * Math.sin(c * t + p3) + 0.12 * Math.sin(d * t + p4))
  }
  usePadStore.getState().bump(id)
}

/* ─── Touch (written by the view) ─────────────────────────────────────── */

const touch = { id: null as string | null, x: 0, y: 0, fresh: false, lastSlot: -1, lastX: 0, lastY: 0 }
export function padDown(id: string, x: number, y: number): void {
  Object.assign(touch, { id, x: clamp01(x), y: clamp01(y), fresh: true, lastSlot: -1 })
}
export function padMove(x: number, y: number): void { touch.x = clamp01(x); touch.y = clamp01(y) }
export function padUp(): void {
  const id = touch.id
  touch.id = null
  if (id) usePadStore.getState().bump(id)
}

/** Where each pad is this frame (null = idle), for the view's dot and crosshair; `phase` is NaN while stopped. */
export const padHeads = new Map<string, { x: number; y: number; phase: number } | null>()

/* ─── Targets ──────────────────────────────────────────────────────────── */

interface Sink { key: string; read: () => number; write01: (v: number) => void; restore: (base: number) => void }

function mixSink(id: string): Sink {
  return {
    key: `${id}.effectMix`,
    // The user's own Dry/wet (never a gated or modulated one), so giving it back never leaves an effect shut
    read: () => getUserMix(id) ?? useGlitchEngineStore.getState().effectMix[id] ?? 1,
    write01: (v) => {
      // Audio and MIDI gates own the mix; a playing step gate takes this as its open level (mixModulation.ts)
      const t = useEffectSequencerStore.getState().tracks[id]
      if (t && (t.audioGate || t.midiGate)) return
      const ge = useGlitchEngineStore.getState()
      const cur = ge.effectMix[id] ?? 1
      const out = noteModulatedMix(id, v, cur, !!t?.audioReactive?.enabled)
      if (out !== null && cur !== out) ge.setEffectMix(id, out)
    },
    restore: (base) => useGlitchEngineStore.getState().setEffectMix(id, base),
  }
}

/** The targets an axis value goes to (master.allMix fans out to every effect in the chain). */
function sinksFor(target: string): Sink[] {
  if (target === 'master.allMix') {
    return useRoutingStore.getState().effectOrder.filter((id) => isEffectActive(id)).map(mixSink)
  }
  if (target === 'warp.amount' || target === 'warp.skew') {
    const field = target === 'warp.amount' ? 'amount' : 'skew'
    return [{
      key: target,
      read: () => useWarpStore.getState()[field],
      write01: (v) => useWarpStore.getState().patch({ [field]: field === 'skew' ? v * 2 - 1 : v }),
      restore: (base) => useWarpStore.getState().patch({ [field]: base }),
    }]
  }
  const dot = target.indexOf('.')
  const effectId = target.slice(0, dot), paramId = target.slice(dot + 1)
  if (paramId === 'effectMix') return [mixSink(effectId)]
  const param = EFFECT_PARAM_REGISTRY[effectId]?.getParams().find((p) => p.id === paramId)
  if (!param) return []
  return [{
    key: target,
    read: param.read,
    write01: (v) => {
      let n = param.min + v * (param.max - param.min)
      if (param.step > 0) n = Math.round(n / param.step) * param.step
      if (param.read() !== n) param.apply(n)
    },
    restore: (base) => param.apply(base),
  }]
}

/** Each target's own value from before a pad first wrote it; given back once no pad writes it. */
const bases = new Map<string, { base: number; restore: (b: number) => void }>()

/* ─── Frame ────────────────────────────────────────────────────────────── */

const frac = (v: number) => v - Math.floor(v)
function clamp01(v: number) { return v < 0 ? 0 : v > 1 ? 1 : v }

/** The recorded value at a slot, holding the last recorded one before it (NaN when the path is empty). */
function sample(arr: Float32Array, slot: number): number {
  for (let k = 0; k < PAD_SLOTS; k++) {
    const v = arr[(slot - k + PAD_SLOTS) % PAD_SLOTS]
    if (!Number.isNaN(v)) return v
  }
  return NaN
}

function record(id: string, s: PadSettings, slot: number) {
  const p = getPadPath(id)
  if (touch.fresh && s.mode === 'replace') { p.xs.fill(NaN); p.ys.fill(NaN) }
  touch.fresh = false
  // Fill every slot passed since the last frame, easing from the last position, so a fast loop leaves no holes
  const from = touch.lastSlot < 0 ? slot : touch.lastSlot
  const span = (slot - from + PAD_SLOTS) % PAD_SLOTS
  const steps = span > PAD_SLOTS / 2 ? 0 : span // a wrap backwards (re-sync) writes only this slot
  for (let k = 1; k <= steps; k++) {
    const t = k / steps, i = (from + k) % PAD_SLOTS
    p.xs[i] = touch.lastSlot < 0 ? touch.x : touch.lastX + (touch.x - touch.lastX) * t
    p.ys[i] = touch.lastSlot < 0 ? touch.y : touch.lastY + (touch.y - touch.lastY) * t
  }
  p.xs[slot] = touch.x; p.ys[slot] = touch.y
  touch.lastSlot = slot; touch.lastX = touch.x; touch.lastY = touch.y
}

const written = new Set<string>()

/**
 * One frame for every pad: while the transport plays, a touched pad records (Replace clears the loop on touch,
 * Overdub writes over it) and an untouched one replays its path; a pad touched while stopped plays live.
 * Targets nobody writes this frame get their own value back.
 */
export function stepPads(): void {
  const pads = usePadStore.getState().pads
  const beats = getTransportBeats()
  written.clear()
  for (const id in pads) {
    const s = pads[id]
    const phase = beats === null ? NaN : frac(beats / s.beats)
    const slot = Number.isNaN(phase) ? -1 : Math.min(PAD_SLOTS - 1, Math.floor(phase * PAD_SLOTS))
    let x = NaN, y = NaN
    if (touch.id === id) {
      x = touch.x; y = touch.y
      if (slot >= 0) record(id, s, slot)
    } else if (slot >= 0 && paths.has(id)) {
      const p = paths.get(id)!
      x = sample(p.xs, slot); y = sample(p.ys, slot)
    }
    padHeads.set(id, Number.isNaN(x) ? null : { x, y, phase })
    if (Number.isNaN(x)) continue
    for (const [target, v] of [[s.x, x], [s.y, y]] as const) {
      if (!target) continue
      for (const sink of sinksFor(target)) {
        if (!bases.has(sink.key)) bases.set(sink.key, { base: sink.read(), restore: sink.restore })
        sink.write01(v)
        written.add(sink.key)
      }
    }
  }
  for (const [key, b] of bases) {
    if (written.has(key)) continue
    b.restore(b.base)
    bases.delete(key)
  }
}
