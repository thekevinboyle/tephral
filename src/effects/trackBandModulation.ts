import { EFFECT_PARAM_REGISTRY, type LockableParam } from '../config/effectParams'
import { useEffectSequencerStore } from '../stores/effectSequencerStore'
import { useAudioReactiveStore } from '../stores/audioReactiveStore'

// Per-track modulation target: the param we're driving, its user-set base,
// and the last value we wrote (to detect the user moving the knob).
interface Active { effectId: string; param: LockableParam; base: number; lastWritten: number }
const active = new Map<string, Active>() // keyed by effectId

const EPS = 1e-6

function findParam(effectId: string, paramId: string): LockableParam | null {
  const entry = EFFECT_PARAM_REGISTRY[effectId]
  return entry?.getParams().find((p) => p.id === paramId) ?? null
}

function release(a: Active) {
  a.param.apply(a.base)
}

/**
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

    let a = active.get(effectId)
    if (a && a.param.id !== paramId) { release(a); a = undefined }
    if (!a) {
      const param = findParam(effectId, paramId)
      if (!param) continue
      const base = param.read()
      a = { effectId, param, base, lastWritten: base }
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

  for (const [effectId, a] of active) {
    if (!want.has(effectId)) { release(a); active.delete(effectId) }
  }
}

export function resetTrackBandModulation(): void {
  for (const a of active.values()) release(a)
  active.clear()
}
