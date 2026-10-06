import { EFFECT_PARAM_REGISTRY, type LockableParam } from '../config/effectParams'
import { useEffectSequencerStore } from '../stores/effectSequencerStore'
import { useAudioReactiveStore } from '../stores/audioReactiveStore'

// Per-track modulation target: the param we're driving, its user-set base,
// and the last value we wrote (to detect the user moving the knob).
interface Active { param: LockableParam; base: number; lastWritten: number }
const active = new Map<string, Active>() // keyed by effectId

const EPS = 1e-6

// Lookup misses (stale/unknown mod.param, or no registry entry), keyed by
// `${effectId}.${paramId}`, so getParams() isn't rebuilt every frame for them.
// A key only suppresses lookups while it equals the track's current param, and
// is dropped once the track stops wanting modulation.
const missed = new Set<string>()

function findParam(effectId: string, paramId: string): LockableParam | null {
  const entry = EFFECT_PARAM_REGISTRY[effectId]
  return entry?.getParams().find((p) => p.id === paramId) ?? null
}

function release(a: Active) {
  a.param.apply(a.base)
}

/**
 * Composition with other modulators: if another modulator (LFO, audio routing,
 * sequencer p-lock) writes the same param earlier in the frame, its value is
 * adopted as this frame's base, and the band offset is added on top, so the two
 * compose as "other + band offset" instead of fighting. On release, the last
 * adopted base is written back; the other modulator overwrites it next frame.
 *
 * One frame of band→param modulation. value = base + band × amount × (max − min),
 * clamped to the param range. If the param's current value isn't what we last
 * wrote, the user changed it — adopt it as the new base.
 */
export function stepTrackBandModulation(): void {
  const tracks = useEffectSequencerStore.getState().tracks
  const ar = useAudioReactiveStore.getState()
  const want = new Set<string>()

  for (const effectId in tracks) {
    const cfg = tracks[effectId].audioReactive
    const paramId = cfg.mod.param
    if (!cfg.enabled || !paramId || !ar.enabled) continue
    want.add(effectId)
    // Forget misses for this track that no longer match its current param
    for (const k of missed) if (k.startsWith(`${effectId}.`) && k !== `${effectId}.${paramId}`) missed.delete(k)

    let a = active.get(effectId)
    if (a && a.param.id !== paramId) { release(a); a = undefined }
    if (!a) {
      const key = `${effectId}.${paramId}`
      if (missed.has(key)) continue
      const param = findParam(effectId, paramId)
      if (!param) { missed.add(key); continue }
      const base = param.read()
      a = { param, base, lastWritten: base }
      active.set(effectId, a)
    }

    const current = a.param.read()
    if (Math.abs(current - a.lastWritten) > EPS) a.base = current // user moved it

    const band = ar.trackBands[effectId] ?? 0
    const span = a.param.max - a.param.min
    let v = a.base + band * cfg.mod.amount * span
    v = Math.min(a.param.max, Math.max(a.param.min, v))
    if (a.param.step >= 1) v = Math.round(v)
    if (Math.abs(v - current) > EPS) a.param.apply(v)
    a.lastWritten = a.param.read()
  }

  for (const k of missed) if (!want.has(k.slice(0, k.indexOf('.')))) missed.delete(k)

  for (const [effectId, a] of active) {
    if (!want.has(effectId)) { release(a); active.delete(effectId) }
  }
}

export function resetTrackBandModulation(): void {
  for (const a of active.values()) release(a)
  active.clear()
}
