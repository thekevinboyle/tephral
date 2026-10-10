// A Line track's level (spec §1): 1 − amount·y of the line at x (the playhead's x: playback spec §2), from a LUT cached
// per points array.
import { buildLut, type WarpPoint } from '../warp/warpMath'
import { fnv1a, MASTER_SEED, playParams, type PlayParams } from '../playhead'
import type { TrackLine } from '../../stores/effectSequencerStore'

const luts = new WeakMap<WarpPoint[], Float32Array>()

/** The line's LUT, built once per (immutable) points array. */
export function lineLut(points: WarpPoint[]): Float32Array {
  let l = luts.get(points)
  if (!l) { l = buildLut(points); luts.set(points, l) }
  return l
}

/**
 * Level 0..1 at the line's x (top = 1, bottom = 0 at amount 1; `amount` sets the depth: bottom = 1 − amount). `x` is
 * already through the playhead (playPosition applies skew, direction, scatter and the region).
 * Never NaN: anything non-finite reads as full.
 */
export function lineLevel(points: WarpPoint[], x: number, amount = 1): number {
  const lut = lineLut(points)
  const f = (x > 0 ? (x < 1 ? x : 1) : 0) * (lut.length - 1)
  const i = Math.floor(f)
  const y = i >= lut.length - 1 ? lut[lut.length - 1] : lut[i] + (lut[i + 1] - lut[i]) * (f - i)
  const a = amount > 0 ? (amount < 1 ? amount : 1) : 0
  const v = 1 - a * y
  return v > 0 ? (v < 1 ? v : 1) : v === 0 ? 0 : Number.isNaN(v) ? 1 : 0
}

/** Each line's scatter/random seed: the master a constant, a track a hash of its effect id. */
export const lineSeed = (id: string) => (id === 'master' ? MASTER_SEED : fnv1a(id))
/** PlayParams of a stored line. */
export const linePlay = (l: TrackLine, seed: number): PlayParams => playParams(l, l.skew, l.snap, seed)
