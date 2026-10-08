// Built-in lines for Line tracks (spec §5). y follows the warp convention: 0 = full (top), 1 = dry (bottom).
import { normalizePoints, randomSteps, type WarpPoint } from '../warp/warpMath'

const stutter = (): WarpPoint[] => {
  const pts: WarpPoint[] = []
  for (let k = 0; k < 8; k++) {
    const y = k % 2 === 0 ? 0 : 1
    pts.push({ x: k / 8, y }, { x: (k + 1) / 8, y })
  }
  return pts
}

const pump = (): WarpPoint[] => {
  const pts: WarpPoint[] = []
  for (const q of [0, 0.25, 0.5, 0.75]) pts.push({ x: q, y: 0 }, { x: q, y: 1 }, { x: q + 0.25, y: 0, bend: -0.5 })
  return pts
}

const FIXED: Record<string, () => WarpPoint[]> = {
  'Ramp up': () => [{ x: 0, y: 1 }, { x: 1, y: 0 }],
  'Ramp down': () => [{ x: 0, y: 0 }, { x: 1, y: 1 }],
  Stutter: stutter,
  'Half on': () => [{ x: 0, y: 0 }, { x: 0.5, y: 0 }, { x: 0.5, y: 1 }, { x: 1, y: 1 }],
  Swell: () => [{ x: 0, y: 1 }, { x: 1, y: 0, bend: 0.6 }],
  'Sidechain pump': pump,
  Triangle: () => [{ x: 0, y: 1 }, { x: 0.5, y: 0 }, { x: 1, y: 1 }],
}

export const LANE_PRESET_NAMES: readonly string[] = [...Object.keys(FIXED), 'Random steps']

/** A preset's normalised points (Random steps rolls on every call, on `snap`); null for an unknown name. */
export function lanePresetPoints(name: string, snap: number): WarpPoint[] | null {
  if (name === 'Random steps') return normalizePoints(randomSteps(snap))
  const f = FIXED[name]
  return f ? normalizePoints(f()) : null
}
