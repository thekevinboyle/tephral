import { create } from 'zustand'
import { buildLut, normalizePoints, PRESETS, randomCurves, randomSteps, type WarpPoint } from '../effects/warp/warpMath'

export type ProfileId = 'clean' | 'flange' | 'degrade' | 'filterspam' | 'harmonicer' | 'fauxcoder' | 'lofizzly'
export type WarpApplies = 'both' | 'video' | 'audio'
export type Knobs = [number, number, number, number]
export type LengthBeats = 0.5 | 1 | 2 | 4 | 8 | 16

export const PROFILE_IDS: readonly ProfileId[] = ['clean', 'flange', 'degrade', 'filterspam', 'harmonicer', 'fauxcoder', 'lofizzly']

export const PROFILE_NAMES: Record<ProfileId, string> = {
  clean: 'Clean', flange: 'Flange', degrade: 'Degrade', filterspam: 'Filter Spam',
  harmonicer: 'Harmo-nicer', fauxcoder: 'Fauxcoder', lofizzly: 'Lo-fizzly',
}

export const KNOB_NAMES: Record<ProfileId, [string, string, string, string]> = {
  clean: ['Vibrato', 'Vib speed', 'Echo', 'Circuit-bend'],
  flange: ['Modulation', 'Physics', 'Grain size', 'Width'],
  degrade: ['Degrade', 'Cutoff', 'Grain size', 'Chaos'],
  filterspam: ['Cutoff', 'Randomness', 'Resonance', 'Octaves'],
  harmonicer: ['Harmonize', 'Detune', 'Speed', 'Reverse'],
  fauxcoder: ['Amount', 'Squelch', 'Cutoff', 'Magic'],
  lofizzly: ['Degrade', 'Dirt', 'Radio', 'Rate'],
}

/** Knob settings that leave the signal untouched (spec §3). null = any value. */
export const PROFILE_NEUTRAL: Record<ProfileId, (number | null)[]> = {
  clean: [0, 0, 0, 0],
  flange: [0, 1, null, 0],
  degrade: [0, 1, null, 0],
  filterspam: [1, 0, 0, 0],
  harmonicer: [0, 0, null, 0],
  fauxcoder: [0, 0, null, 0],
  lofizzly: [0, 0, 0, null],
}

/**
 * Default knobs: away from neutral so each profile is audible. Clean is the default profile and is
 * neutral (Vib speed does nothing while Vibrato is 0), so turning the warp on changes nothing until you draw.
 */
export const PROFILE_DEFAULTS: Record<ProfileId, Knobs> = {
  clean: [0, 0.4, 0, 0],
  flange: [0.4, 0.3, 0.4, 0.5],
  degrade: [0.5, 0.7, 0.4, 0.2],
  filterspam: [0.5, 0.5, 0.4, 0.2],
  harmonicer: [0.5, 0.15, 0.4, 0.1],
  fauxcoder: [0.6, 0.3, 0.4, 0.3],
  lofizzly: [0.5, 0.3, 0.5, 0.4],
}

/** Output section: low/high cut in Hz on the wet signal, wet level in dB. */
export interface WarpOutput { low: number; high: number; levelDb: number }
export const OUTPUT_DEFAULTS: WarpOutput = { low: 20, high: 20000, levelDb: 0 }

export interface WarpSnapshot {
  enabled: boolean
  points: WarpPoint[]
  amount: number
  lengthBeats: LengthBeats
  /** Quantize: 1/4 .. 1/64 of the loop, or 0 = Off. */
  snap: number
  skew: number
  profile: ProfileId
  profileParams: Record<ProfileId, Knobs>
  output: WarpOutput
  appliesTo: WarpApplies
  mix: number
  presetName: string | null
}

const copyPoints = (p: WarpPoint[]): WarpPoint[] => p.map((pt) => ({ ...pt }))
const copyProfileParams = (pp: Record<ProfileId, Knobs>) =>
  Object.fromEntries(PROFILE_IDS.map((id) => [id, [...pp[id]] as Knobs])) as Record<ProfileId, Knobs>

export const WARP_DEFAULTS: WarpSnapshot = {
  enabled: false,
  points: copyPoints(PRESETS.Straight),
  amount: 1,
  lengthBeats: 4,
  snap: 1 / 16,
  skew: 0,
  profile: 'clean',
  profileParams: copyProfileParams(PROFILE_DEFAULTS),
  output: { ...OUTPUT_DEFAULTS },
  appliesTo: 'both',
  mix: 1,
  presetName: 'Straight',
}

/**
 * The v1 three-engine model the worklet and the video compositor still run (Tasks 3 and 4 replace them).
 * clean -> clean, flange -> smear, every other profile -> degrade. Knobs come from profileParams.
 */
export type V1Engine = 'clean' | 'smear' | 'degrade'
export interface V1EngineParams { smooth: number; grain: number; blend: number; rate: number; crunch: number }
let v1Cache: { profile: ProfileId; pp: Record<ProfileId, Knobs>; out: { engine: V1Engine; params: V1EngineParams } } | null = null
/** Cached on (profile, profileParams) identity, so per-frame callers do not allocate. */
export function v1EngineFor(profile: ProfileId, pp: Record<ProfileId, Knobs>): { engine: V1Engine; params: V1EngineParams } {
  if (v1Cache && v1Cache.profile === profile && v1Cache.pp === pp) return v1Cache.out
  const k = pp[profile]
  const engine: V1Engine = profile === 'clean' ? 'clean' : profile === 'flange' ? 'smear' : 'degrade'
  // smooth: the click-guard / crossfade length; 0.5 = 15 ms (spec §3 Clean)
  const params: V1EngineParams = { smooth: 0.5, grain: 0.4, blend: 0.5, rate: 0, crunch: 0 }
  if (engine === 'smear') { params.grain = k[2]; params.blend = 1 - k[1] } // Grain size; Physics 1 = the single read
  else if (engine === 'degrade') { params.rate = k[0]; params.crunch = k[0] } // Degrade (or the profile's first knob)
  const out = { engine, params }
  v1Cache = { profile, pp, out }
  return out
}

interface WarpState extends WarpSnapshot {
  lut: Float32Array // derived, rebuilt on every points change
  setEnabled: (v: boolean) => void
  setPoints: (p: WarpPoint[]) => void
  patch: (p: Partial<WarpSnapshot>) => void
  loadPreset: (name: string) => void
  randomizeSteps: () => void
  randomizeCurves: () => void
  /** Flat along the top: live. */
  clearLine: () => void
  applySnapshot: (s: WarpSnapshot | undefined) => void
  getSnapshot: () => WarpSnapshot
}

/** Loop lengths in beats, shortest first. */
export const LENGTHS: readonly LengthBeats[] = [0.5, 1, 2, 4, 8, 16]
/** Quantize settings, Off (0) first, then coarse to fine. */
export const SNAPS: readonly number[] = [0, 1 / 4, 1 / 8, 1 / 16, 1 / 32, 1 / 64]
const APPLIES: WarpApplies[] = ['both', 'video', 'audio']

const num = (v: unknown, fallback: number, lo: number, hi: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback
const nearest = <T extends number>(v: unknown, set: readonly T[], fallback: T): T => {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback
  let best = set[0]
  for (const c of set) if (Math.abs(c - v) <= Math.abs(best - v)) best = c // ties go to the larger value
  return best
}
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object'
const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k)

/** v1 profile ids: 'smear' became 'flange'. */
function profileId(v: unknown, fallback: ProfileId): ProfileId {
  if (v === 'smear') return 'flange'
  return typeof v === 'string' && (PROFILE_IDS as readonly string[]).includes(v) ? (v as ProfileId) : fallback
}

/** Knob values per profile; missing or bad knobs fall back to `base` one by one. */
function sanitizeProfileParams(v: unknown, base: Record<ProfileId, Knobs>): Record<ProfileId, Knobs> {
  const src = isObj(v) ? v : {}
  const out = {} as Record<ProfileId, Knobs>
  for (const id of PROFILE_IDS) {
    const arr = has(src, id) && Array.isArray(src[id]) ? (src[id] as unknown[]) : []
    out[id] = [0, 1, 2, 3].map((k) => num(arr[k], base[id][k], 0, 1)) as Knobs
  }
  return out
}

/** A v1 snapshot's `params` mapped onto the first knobs of clean, flange (smear) and degrade. */
function fromV1Params(params: unknown, base: Record<ProfileId, Knobs>): Record<ProfileId, Knobs> {
  const out = copyProfileParams(base)
  if (!isObj(params)) return out
  const put = (id: ProfileId, k: number, v: unknown) => { out[id][k] = num(v, out[id][k], 0, 1) }
  put('clean', 0, params.smooth)
  put('flange', 0, params.grain)
  put('flange', 1, params.blend)
  put('degrade', 0, params.rate)
  put('degrade', 1, params.crunch)
  return out
}

/** Validate untrusted input (bank, preset, patch, v1 snapshot). Never yields NaN, Infinity, undefined or caller references. */
export function sanitize(s: Partial<WarpSnapshot> | undefined, base: WarpSnapshot = WARP_DEFAULTS): WarpSnapshot {
  const i = (s ?? {}) as Partial<WarpSnapshot> & { params?: unknown }
  const rawPts = Array.isArray(i.points) ? i.points.filter((q) => q && typeof q.x === 'number' && typeof q.y === 'number' && Number.isFinite(q.x) && Number.isFinite(q.y)) : []
  const points = normalizePoints(copyPoints(rawPts.length >= 2 ? rawPts : base.points))
  const out: Partial<WarpOutput> = isObj(i.output) ? i.output : {}
  const profileParams = i.profileParams === undefined && i.params !== undefined
    ? fromV1Params(i.params, base.profileParams)
    : sanitizeProfileParams(i.profileParams, base.profileParams)
  const low = num(out.low, base.output.low, 20, 2000)
  const high = num(out.high, base.output.high, 500, 20000)
  const levelDb = num(out.levelDb, base.output.levelDb, -24, 6)
  // An inverted band (low at or above high) would silence the wet signal: keep the base band instead
  const output: WarpOutput = low >= high ? { ...base.output } : { low, high, levelDb }
  return {
    enabled: typeof i.enabled === 'boolean' ? i.enabled : base.enabled,
    points,
    amount: num(i.amount, base.amount, 0, 1),
    lengthBeats: nearest(i.lengthBeats, LENGTHS, base.lengthBeats),
    snap: nearest(i.snap, SNAPS, base.snap),
    skew: num(i.skew, base.skew, -1, 1),
    profile: profileId(i.profile, base.profile),
    profileParams,
    output,
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
    randomizeSteps: () => {
      const points = normalizePoints(randomSteps(get().snap))
      set({ points, lut: buildLut(points), presetName: null })
    },
    randomizeCurves: () => {
      const points = normalizePoints(randomCurves(get().snap))
      set({ points, lut: buildLut(points), presetName: null })
    },
    clearLine: () => {
      const points = normalizePoints(copyPoints(PRESETS.Straight))
      set({ points, lut: buildLut(points), presetName: 'Straight' })
    },
    applySnapshot: (s) => {
      const next = sanitize(s, WARP_DEFAULTS)
      set({ ...next, lut: buildLut(next.points) })
    },
    getSnapshot: () => {
      const s = get()
      return fresh({
        enabled: s.enabled, points: s.points, amount: s.amount, lengthBeats: s.lengthBeats, snap: s.snap, skew: s.skew,
        profile: s.profile, profileParams: s.profileParams, output: s.output, appliesTo: s.appliesTo, mix: s.mix, presetName: s.presetName,
      })
    },
  }
})
