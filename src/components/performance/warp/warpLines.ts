// User warp lines, saved in localStorage under `seg.warp.lines` (spec §2). Every access is wrapped in
// try/catch: with storage unavailable (private mode, blocked site data) the list is empty and saving
// reports failure instead of throwing.
import { cleanPoints, MAX_POINTS, PRESETS, type WarpPoint } from '../../../effects/warp/warpMath'
import { LANE_PRESET_NAMES } from '../../../effects/lines/lanePresets'

export interface WarpLine { name: string; points: WarpPoint[] }

const KEY = 'seg.warp.lines'
const MAX_NAME = 40
/** At most this many saved lines, and this many points a line, both when loading and when saving. */
export const MAX_LINES = 100
export { MAX_POINTS }

const WARP_NAMES = Object.keys(PRESETS).map((n) => n.toLowerCase())
const LANE_NAMES = LANE_PRESET_NAMES.map((n) => n.toLowerCase())
const BUILT_IN_NAMES = [...WARP_NAMES, ...LANE_NAMES]
/** A built-in line's name (any case), warp or lane presets: user lines may not use one. */
export const isBuiltInName = (name: string) => BUILT_IN_NAMES.includes(name.trim().toLowerCase())
const isWarpPresetName = (name: string) => WARP_NAMES.includes(name.trim().toLowerCase())
const isLanePresetName = (name: string) => LANE_NAMES.includes(name.trim().toLowerCase())

/** Trimmed, length-capped name; '' when nothing usable is left. */
export const cleanLineName = (name: string) => name.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME)

/** Saved lines over MAX_POINTS are refused, not cut short. */
function cleanLinePoints(v: unknown): WarpPoint[] | null {
  if (!Array.isArray(v) || v.length > MAX_POINTS) return null
  return cleanPoints(v)
}

/**
 * A name for a user line saved before the lane presets existed under one of their names: "<name> (mine)", then
 * "<name> (mine 2)", … — never a built-in name, never one in `taken`, at most MAX_NAME characters.
 */
function renameLaneCollision(name: string, taken: Set<string>): string {
  for (let k = 1; ; k++) {
    const suffix = k === 1 ? ' (mine)' : ` (mine ${k})`
    const n = name.slice(0, MAX_NAME - suffix.length) + suffix
    if (!taken.has(n) && !isBuiltInName(n)) return n
  }
}

/**
 * Saved user lines, oldest first: at most MAX_LINES, skipping warp preset names and lines over MAX_POINTS points.
 * A line named like a lane preset (saved before those existed) is kept, renamed "<name> (mine)", so a later
 * save or delete, which rewrites the list from this one, keeps it too.
 * Empty when storage is unavailable or the stored value is unusable.
 */
export function loadLines(): WarpLine[] {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const valid: WarpLine[] = []
    for (const e of parsed) {
      if (!e || typeof e !== 'object') continue
      const name = typeof (e as WarpLine).name === 'string' ? cleanLineName((e as WarpLine).name) : ''
      const points = cleanLinePoints((e as WarpLine).points)
      if (name && points && !isWarpPresetName(name)) valid.push({ name, points })
    }
    // every name a user line already has, so a rename never takes one (even of a line later in the list)
    const taken = new Set(valid.filter((l) => !isLanePresetName(l.name)).map((l) => l.name))
    const out: WarpLine[] = []
    const seen = new Set<string>()
    for (const l of valid) {
      if (seen.has(l.name)) continue // a repeated name: the first one wins
      seen.add(l.name)
      let name = l.name
      if (isLanePresetName(name)) { name = renameLaneCollision(name, taken); taken.add(name) }
      out.push({ name, points: l.points })
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
  const pts = cleanLinePoints(points)
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
