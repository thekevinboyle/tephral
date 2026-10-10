// The playhead (playback spec §2): which x of a line is read at an absolute loop position. Shared by the Lines
// engine, the warp picture and the Warp modulation source; public/worklets/warp-processor.js carries a port
// (KEEP IN SYNC: hash32, the shuffle, playPosition). Randomness is a hash of (seed, cycle, slice) only.
import { skewPhase } from './warp/warpMath'

export type PlayDirection = 'fwd' | 'rev' | 'pingpong' | 'random'
export const PLAY_DIRECTIONS: readonly PlayDirection[] = ['fwd', 'rev', 'pingpong', 'random']
export const PLAY_DIRECTION_NAMES: Record<PlayDirection, string> = { fwd: 'Fwd', rev: 'Rev', pingpong: 'Ping-pong', random: 'Random' }

/** What a line stores (warp snapshot and TrackLine). */
export interface PlayFields { direction: PlayDirection; loopStart: number; loopEnd: number; scatter: number }
export const PLAY_FIELD_DEFAULTS: PlayFields = { direction: 'fwd', loopStart: 0, loopEnd: 1, scatter: 0 }

/** Everything playPosition needs. */
export interface PlayParams { direction: PlayDirection; start: number; end: number; scatter: number; skew: number; slices: number; seed: number }

export const MIN_REGION = 1 / 64
export const WARP_SEED = 0x57a2b
export const MASTER_SEED = 0x3a57e2

/** A uint32 hash of three integers (lowbias32 finaliser). */
export function hash32(a: number, b: number, c: number): number {
  let h = (Math.imul(a | 0, 0x9e3779b1) ^ Math.imul((b | 0) + 0x632be59b, 0x85ebca6b) ^ Math.imul((c | 0) + 0x27d4eb2f, 0xc2b2ae35)) | 0
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d)
  h ^= h >>> 15; h = Math.imul(h, 0x846ca68b)
  h ^= h >>> 16
  return h >>> 0
}

/** 32-bit FNV-1a of a string (each Lines track's seed). */
export function fnv1a(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) }
  return h >>> 0
}

/** Slices per region: the Quantize grid (1/4..1/64), 16 when Quantize is Off. */
export const slicesFor = (snap: number) => (snap > 0 ? Math.max(1, Math.min(64, Math.round(1 / snap))) : 16)

// One cached shuffle: recomputed when (seed, cycle, n) changes (at most a few lines a frame, 64 steps each).
const perm = new Uint8Array(64)
let pSeed = NaN, pCycle = NaN, pN = 0
function shuffleAt(seed: number, cycle: number, n: number): Uint8Array {
  if (seed === pSeed && cycle === pCycle && n === pN) return perm
  for (let i = 0; i < n; i++) perm[i] = i
  let s = hash32(seed, cycle, 0x5ca77e5)
  for (let i = n - 1; i > 0; i--) {
    // mulberry32 step
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    const r = ((t ^ (t >>> 14)) >>> 0) / 4294967296
    const j = Math.floor(r * (i + 1))
    const tmp = perm[i]; perm[i] = perm[j]; perm[j] = tmp
  }
  pSeed = seed; pCycle = cycle; pN = n
  return perm
}

/**
 * x of the line at absolute loop position `loopPos` (loops since the anchor): Skew, then Direction, then Scatter,
 * then the region (stretched over the whole Length). Defaults give skewPhase(phase, skew) exactly.
 */
export function playPosition(loopPos: number, p: PlayParams): number {
  const pos = Number.isFinite(loopPos) ? loopPos : 0
  const cycle = Math.floor(pos)
  let u = skewPhase(pos - cycle, p.skew)
  const n = p.slices
  if (p.direction === 'rev') u = 1 - u
  else if (p.direction === 'pingpong') { if (cycle & 1) u = 1 - u }
  else if (p.direction === 'random') {
    const k = Math.min(n - 1, Math.floor(u * n))
    u = ((hash32(p.seed, cycle, k) % n) + (u * n - k)) / n
  }
  if (p.scatter > 0) {
    const k = Math.min(n - 1, Math.floor(u * n))
    if (hash32(p.seed ^ 0x51ced, cycle, k) / 4294967296 < p.scatter) u = (shuffleAt(p.seed, cycle, n)[k] + (u * n - k)) / n
  }
  if (p.start === 0 && p.end === 1) return u
  return p.start + u * (p.end - p.start)
}

const num01 = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : null)

/** Untrusted fields (bank, preset file): each invalid one takes `base`'s; an empty or inverted region becomes 0..1. */
export function cleanPlayFields(v: Partial<Record<keyof PlayFields, unknown>>, base: PlayFields): PlayFields {
  const direction = PLAY_DIRECTIONS.includes(v.direction as PlayDirection) ? (v.direction as PlayDirection) : base.direction
  const s = v.loopStart === undefined ? base.loopStart : num01(v.loopStart)
  const e = v.loopEnd === undefined ? base.loopEnd : num01(v.loopEnd)
  const okRegion = s !== null && e !== null && e - s >= MIN_REGION - 1e-9
  return {
    direction,
    loopStart: okRegion ? s : 0,
    loopEnd: okRegion ? e : 1,
    scatter: num01(v.scatter) ?? base.scatter,
  }
}

export const isPlainPlay = (f: PlayFields) => f.direction === 'fwd' && f.loopStart === 0 && f.loopEnd === 1 && f.scatter === 0

/** PlayParams for stored fields + skew + Quantize. */
export const playParams = (f: PlayFields, skew: number, snap: number, seed: number): PlayParams => ({
  direction: f.direction, start: f.loopStart, end: f.loopEnd, scatter: f.scatter, skew, slices: slicesFor(snap), seed,
})
