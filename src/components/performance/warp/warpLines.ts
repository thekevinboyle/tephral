// User warp lines, saved in localStorage under `seg.warp.lines` (spec §2). Every access is wrapped in
// try/catch: with storage unavailable (private mode, blocked site data) the list is empty and saving
// reports failure instead of throwing.
import { normalizePoints, PRESETS, type WarpPoint } from '../../../effects/warp/warpMath'

export interface WarpLine { name: string; points: WarpPoint[] }

const KEY = 'seg.warp.lines'
const MAX_NAME = 40
/** At most this many saved lines, and this many points a line, both when loading and when saving. */
export const MAX_LINES = 100
export const MAX_POINTS = 512

/** A built-in line's name (any case): user lines may not use one. */
export const isBuiltInName = (name: string) => Object.keys(PRESETS).some((n) => n.toLowerCase() === name.trim().toLowerCase())

/** Trimmed, length-capped name; '' when nothing usable is left. */
export const cleanLineName = (name: string) => name.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME)

function cleanPoints(v: unknown): WarpPoint[] | null {
  if (!Array.isArray(v) || v.length > MAX_POINTS) return null
  const pts: WarpPoint[] = []
  for (const q of v) {
    if (!q || typeof q !== 'object') continue
    const { x, y, bend } = q as Record<string, unknown>
    if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) continue
    const p: WarpPoint = { x, y }
    if (typeof bend === 'number' && Number.isFinite(bend) && bend !== 0) p.bend = Math.max(-1, Math.min(1, bend))
    pts.push(p)
  }
  if (pts.length < 2) return null
  const out = normalizePoints(pts)
  return out.length <= MAX_POINTS ? out : null
}

/**
 * Saved user lines, oldest first: at most MAX_LINES, skipping built-in names and lines over MAX_POINTS points.
 * Empty when storage is unavailable or the stored value is unusable.
 */
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
      if (name && points && !isBuiltInName(name) && !out.some((l) => l.name === name)) out.push({ name, points })
      if (out.length >= MAX_LINES) break
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

export type SaveResult = 'saved' | 'replaced' | 'empty' | 'builtin' | 'full' | 'toolong' | 'unavailable'

/**
 * Save a line by name, replacing a saved line of the same name. Refused for an empty or built-in name, a
 * line over MAX_POINTS points, a new name when MAX_LINES are already saved, or storage unavailable.
 */
export function saveLine(name: string, points: WarpPoint[]): SaveResult {
  const n = cleanLineName(name)
  if (!n) return 'empty'
  if (isBuiltInName(n)) return 'builtin'
  const pts = cleanPoints(points)
  if (!pts) return points.length > MAX_POINTS ? 'toolong' : 'empty'
  const lines = loadLines()
  const replaced = lines.some((l) => l.name === n)
  if (!replaced && lines.length >= MAX_LINES) return 'full'
  const next = lines.filter((l) => l.name !== n)
  next.push({ name: n, points: pts })
  if (!store(next)) return 'unavailable'
  return replaced ? 'replaced' : 'saved'
}

/** Remove a line by name. False when storage is unavailable. */
export function deleteLine(name: string): boolean {
  return store(loadLines().filter((l) => l.name !== name))
}
