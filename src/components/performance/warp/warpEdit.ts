// Line edits made by the editor itself. Any other change to the points (preset, randomize, bank)
// is "external", and the editor clears its point selection on those.
import { useWarpStore } from '../../../stores/warpStore'
import type { WarpPoint } from '../../../effects/warp/warpMath'

let own: WarpPoint[] | null = null
let editing = false // store subscribers run inside setPoints, before `own` is known

/** setPoints on behalf of the editor; returns the normalised points now in the store. */
export function editPoints(p: WarpPoint[]): WarpPoint[] {
  editing = true
  try { useWarpStore.getState().setPoints(p) } finally { editing = false }
  own = useWarpStore.getState().points
  return own
}

/** True when `points` is exactly what the editor's last edit produced. */
export const isOwnEdit = (points: WarpPoint[]) => editing || points === own

/** Status / aria-live text for a selected point. */
export function describePoint(points: WarpPoint[], i: number): string {
  const p = points[i]
  if (!p) return ''
  return `Point ${i + 1} of ${points.length}: x ${p.x.toFixed(3)}, y ${p.y.toFixed(3)}`
}
