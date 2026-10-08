import type { WarpPoint } from '../../../effects/warp/warpMath'

const GRID_Y = 1 / 16

export interface LineKeyCtx {
  points: WarpPoint[]
  snap: number
  selected: number | null
  setSelected: (i: number | null) => void
  setPoints: (p: WarpPoint[]) => WarpPoint[]
  say: (pts: WarpPoint[], i: number) => void
  announce: (t: string) => void
  /** The focused plot (for [ and ]) */
  inPlot: boolean
}

/**
 * Point-editing keys for a line plot: with the plot focused, [ and ] select the previous / next point; with a
 * point selected, Delete / Backspace removes it, the arrows nudge it one grid step and Escape deselects it.
 * Handles [ ] Delete/Backspace Escape and the arrows; returns true (after preventDefault + stopPropagation)
 * when handled.
 */
export function handleLineKey(e: React.KeyboardEvent, c: LineKeyCtx): boolean {
  const pts = c.points
  if ((e.key === '[' || e.key === ']') && c.inPlot) {
    e.preventDefault(); e.stopPropagation()
    const n = pts.length
    const cur = c.selected !== null && c.selected < n ? c.selected : e.key === ']' ? -1 : n
    const k = (cur + (e.key === ']' ? 1 : -1) + n) % n
    c.setSelected(k)
    c.say(pts, k)
    return true
  }
  const i = c.selected
  if (i === null || !pts[i]) return false
  if (e.key === 'Escape') {
    e.preventDefault(); e.stopPropagation()
    c.setSelected(null)
    return true
  }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault(); e.stopPropagation()
    if (pts.length > 2) c.setPoints(pts.filter((_, k) => k !== i))
    c.setSelected(null)
    c.announce('Point removed')
    return true
  }
  const dx = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
  const dy = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0
  if (!dx && !dy) return false
  e.preventDefault(); e.stopPropagation()
  const last = pts.length - 1
  const p = pts[i]
  // On the grid: the next grid line. Quantize Off: exactly ±1/64, with no rounding onto a grid
  const g = c.snap > 0 ? c.snap : 1 / 64
  const nx = c.snap > 0 ? Math.round((p.x + dx * g) / g) * g : p.x + dx * g
  const x = !dx || i === 0 || i === last ? p.x : Math.min(pts[i + 1].x, Math.max(pts[i - 1].x, nx))
  const y = Math.min(1, Math.max(0, Math.round((p.y + dy * GRID_Y) / GRID_Y) * GRID_Y))
  const next = pts.slice()
  next[i] = { ...p, x, y: dy ? y : p.y }
  c.say(c.setPoints(next), i)
  return true
}
