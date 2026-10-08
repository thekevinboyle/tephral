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

const fresh = (src: WarpSnapshot): WarpSnapshot => ({ ...src, points: normalizePoints(copyPoints(src.points)), params: { ...src.params } })

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
      if (p.points) {
        const points = normalizePoints(p.points)
        set({ ...p, points, lut: buildLut(points) })
      } else set(p)
    },
    loadPreset: (name) => {
      const src = PRESETS[name]
      if (!src) return
      const points = normalizePoints(copyPoints(src))
      set({ points, lut: buildLut(points), presetName: name })
    },
    randomize: () => {
      const points = normalizePoints(randomLine(get().snap))
      set({ points, lut: buildLut(points), presetName: null })
    },
    applySnapshot: (s) => {
      const next = fresh(s ? { ...WARP_DEFAULTS, ...s, params: { ...WARP_DEFAULTS.params, ...s.params } } : WARP_DEFAULTS)
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
