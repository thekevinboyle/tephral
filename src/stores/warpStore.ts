import { create } from 'zustand'
import { buildLut, normalizePoints, PRESETS, randomLine, type WarpPoint } from '../effects/warp/warpMath'

export type WarpProfile = 'clean' | 'smear' | 'degrade'
export type WarpApplies = 'both' | 'video' | 'audio'

export interface WarpSnapshot {
  enabled: boolean
  points: WarpPoint[]
  amount: number
  lengthBeats: 1 | 2 | 4 | 8 | 16
  snap: number
  skew: number
  profile: WarpProfile
  params: { smooth: number; grain: number; blend: number; rate: number; crunch: number }
  appliesTo: WarpApplies
  mix: number
  presetName: string | null
}

const copyPoints = (p: WarpPoint[]): WarpPoint[] => p.map((pt) => ({ ...pt }))

export const WARP_DEFAULTS: WarpSnapshot = {
  enabled: false,
  points: copyPoints(PRESETS.Straight),
  amount: 1,
  lengthBeats: 4,
  snap: 1 / 16,
  skew: 0,
  profile: 'clean',
  params: { smooth: 0.3, grain: 0.4, blend: 0.5, rate: 0.5, crunch: 0.3 },
  appliesTo: 'both',
  mix: 1,
  presetName: 'Straight',
}

interface WarpState extends WarpSnapshot {
  lut: Float32Array // derived, rebuilt on every points change
  setEnabled: (v: boolean) => void
  setPoints: (p: WarpPoint[]) => void
  patch: (p: Partial<WarpSnapshot>) => void
  loadPreset: (name: string) => void
  randomize: () => void
  applySnapshot: (s: WarpSnapshot | undefined) => void
  getSnapshot: () => WarpSnapshot
}

const LENGTHS = [1, 2, 4, 8, 16] as const
const SNAPS = [1 / 4, 1 / 8, 1 / 16, 1 / 32, 1 / 64]
const PROFILES: WarpProfile[] = ['clean', 'smear', 'degrade']
const APPLIES: WarpApplies[] = ['both', 'video', 'audio']

const num = (v: unknown, fallback: number, lo: number, hi: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback
const nearest = <T extends number>(v: unknown, set: readonly T[], fallback: T): T => {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback
  let best = set[0]
  for (const c of set) if (Math.abs(c - v) <= Math.abs(best - v)) best = c // ties go to the larger value
  return best
}

/** Validate untrusted input (bank, preset, patch). Never yields NaN, Infinity, undefined or caller references. */
export function sanitize(s: Partial<WarpSnapshot> | undefined, base: WarpSnapshot = WARP_DEFAULTS): WarpSnapshot {
  const i = s ?? {}
  const pr: Partial<WarpSnapshot['params']> = i.params && typeof i.params === 'object' ? i.params : {}
  const rawPts = Array.isArray(i.points) ? i.points.filter((q) => q && typeof q.x === 'number' && typeof q.y === 'number' && Number.isFinite(q.x) && Number.isFinite(q.y)) : []
  const points = normalizePoints(copyPoints(rawPts.length >= 2 ? rawPts : base.points))
  return {
    enabled: typeof i.enabled === 'boolean' ? i.enabled : base.enabled,
    points,
    amount: num(i.amount, base.amount, 0, 1),
    lengthBeats: nearest(i.lengthBeats, LENGTHS, base.lengthBeats),
    snap: nearest(i.snap, SNAPS, base.snap),
    skew: num(i.skew, base.skew, -1, 1),
    profile: PROFILES.includes(i.profile as WarpProfile) ? (i.profile as WarpProfile) : base.profile,
    params: {
      smooth: num(pr.smooth, base.params.smooth, 0, 1),
      grain: num(pr.grain, base.params.grain, 0, 1),
      blend: num(pr.blend, base.params.blend, 0, 1),
      rate: num(pr.rate, base.params.rate, 0, 1),
      crunch: num(pr.crunch, base.params.crunch, 0, 1),
    },
    appliesTo: APPLIES.includes(i.appliesTo as WarpApplies) ? (i.appliesTo as WarpApplies) : base.appliesTo,
    mix: num(i.mix, base.mix, 0, 1),
    presetName: typeof i.presetName === 'string' ? i.presetName : i.presetName === null ? null : base.presetName,
  }
}

const fresh = (src: WarpSnapshot): WarpSnapshot => sanitize(src, WARP_DEFAULTS)

export const useWarpStore = create<WarpState>((set, get) => {
  const init = fresh(WARP_DEFAULTS)
  return {
    ...init,
    lut: buildLut(init.points),
    setEnabled: (enabled) => set({ enabled }),
    setPoints: (p) => {
      const points = normalizePoints(p)
      set({ points, lut: buildLut(points), presetName: null })
    },
    patch: (p) => {
      const defined = Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined)) as Partial<WarpSnapshot>
      const cur = get().getSnapshot()
      const merged: Partial<WarpSnapshot> = { ...cur, ...defined }
      if (defined.points) merged.presetName = p.presetName ?? null
      const next = sanitize(merged, cur)
      set({ ...next, lut: buildLut(next.points) })
    },
    loadPreset: (name) => {
      if (!Object.hasOwn(PRESETS, name)) return
      const src = PRESETS[name]
      const points = normalizePoints(copyPoints(src))
      set({ points, lut: buildLut(points), presetName: name })
    },
    randomize: () => {
      const points = normalizePoints(randomLine(get().snap))
      set({ points, lut: buildLut(points), presetName: null })
    },
    applySnapshot: (s) => {
      const next = sanitize(s, WARP_DEFAULTS)
      set({ ...next, lut: buildLut(next.points) })
    },
    getSnapshot: () => {
      const s = get()
      return fresh({
        enabled: s.enabled, points: s.points, amount: s.amount, lengthBeats: s.lengthBeats, snap: s.snap, skew: s.skew,
        profile: s.profile, params: s.params, appliesTo: s.appliesTo, mix: s.mix, presetName: s.presetName,
      })
    },
  }
})
