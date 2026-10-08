// User warp lines, saved in localStorage under `seg.warp.lines` (spec §2). Every access is wrapped in
// try/catch: with storage unavailable (private mode, blocked site data) the list is empty and saving
// reports failure instead of throwing.
import { normalizePoints, type WarpPoint } from '../../../effects/warp/warpMath'

export interface WarpLine { name: string; points: WarpPoint[] }

const KEY = 'seg.warp.lines'
const MAX_NAME = 40

/** Trimmed, length-capped name; '' when nothing usable is left. */
export const cleanLineName = (name: string) => name.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME)

function cleanPoints(v: unknown): WarpPoint[] | null {
  if (!Array.isArray(v)) return null
  const pts: WarpPoint[] = []
  for (const q of v) {
    if (!q || typeof q !== 'object') continue
    const { x, y, bend } = q as Record<string, unknown>
    if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) continue
    const p: WarpPoint = { x, y }
    if (typeof bend === 'number' && Number.isFinite(bend) && bend !== 0) p.bend = Math.max(-1, Math.min(1, bend))
    pts.push(p)
  }
  return pts.length >= 2 ? normalizePoints(pts) : null
}

/** Saved user lines, oldest first. Empty when storage is unavailable or the stored value is unusable. */
export function loadLines(): WarpLine[] {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const out: WarpLine[] = []
    for (const e of parsed) {
      if (!e || typeof e !== 'object') continue
      const name = typeof (e as WarpLine).name === 'string' ? cleanLineName((e as WarpLine).name) : ''
      const points = cleanPoints((e as WarpLine).points)
      if (name && points && !out.some((l) => l.name === name)) out.push({ name, points })
    }
    return out
  } catch {
    return []
  }
}

function store(lines: WarpLine[]): boolean {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(lines))
    return true
  } catch {
    return false
  }
}

/** Save (or replace) a line by name. False when the name is empty or storage is unavailable. */
export function saveLine(name: string, points: WarpPoint[]): boolean {
  const n = cleanLineName(name)
  const pts = cleanPoints(points)
  if (!n || !pts) return false
  const lines = loadLines().filter((l) => l.name !== n)
  lines.push({ name: n, points: pts })
  return store(lines)
}

/** Remove a line by name. False when storage is unavailable. */
export function deleteLine(name: string): boolean {
  return store(loadLines().filter((l) => l.name !== name))
}
