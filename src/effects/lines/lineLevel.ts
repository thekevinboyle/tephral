// A Line track's level (spec §1): 1 − y of the line at the skewed phase, from a LUT cached per points array.
import { buildLut, skewPhase, type WarpPoint } from '../warp/warpMath'

const luts = new WeakMap<WarpPoint[], Float32Array>()

/** The line's LUT, built once per (immutable) points array. */
export function lineLut(points: WarpPoint[]): Float32Array {
  let l = luts.get(points)
  if (!l) { l = buildLut(points); luts.set(points, l) }
  return l
}

/**
 * Level 0..1 at loop phase `phase` (top = 1, bottom = 0 at amount 1; `amount` sets the depth: bottom = 1 − amount).
 * Never NaN: anything non-finite reads as full.
 */
export function lineLevel(points: WarpPoint[], phase: number, skew: number, amount = 1): number {
  const lut = lineLut(points)
  const x = skewPhase(phase, skew)
  const f = (x > 0 ? (x < 1 ? x : 1) : 0) * (lut.length - 1)
  const i = Math.floor(f)
  const y = i >= lut.length - 1 ? lut[lut.length - 1] : lut[i] + (lut[i + 1] - lut[i]) * (f - i)
  const a = amount > 0 ? (amount < 1 ? amount : 1) : 0
  const v = 1 - a * y
  return v > 0 ? (v < 1 ? v : 1) : v === 0 ? 0 : Number.isNaN(v) ? 1 : 0
}
