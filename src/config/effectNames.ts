import { EFFECT_DESCRIPTIONS } from './statusDescriptions'
import { EFFECTS, STRAND_EFFECTS, MOTION_EFFECTS, DESTRUCTION_EFFECTS, PAGE_NAMES } from './effects'

export interface EffectInfo { id: string; name: string; description: string; color: string; page: number }

const ALL = [...EFFECTS, ...STRAND_EFFECTS, ...MOTION_EFFECTS, ...DESTRUCTION_EFFECTS]
const BY_ID = new Map(ALL.map((e) => [e.id, e]))

const titleCase = (s: string) =>
  s.toLowerCase().replace(/(^|[\s-])([a-z])/g, (_, sep: string, c: string) => sep + c.toUpperCase())

// Effects that have a lane and a device card but no pad, so no entry in config/effects.ts
const EXTRA_COLORS: Record<string, string> = { track_face: '#f97316', track_hands: '#a855f7', texture_overlay: '#a3a3a3', data_overlay: '#60a5fa' }

const cache = new Map<string, EffectInfo>()

/** Full name + one-line description for every effect; name from EFFECT_DESCRIPTIONS ("Name: desc"), else a title-cased label. */
export function getEffectInfo(id: string): EffectInfo {
  const hit = cache.get(id)
  if (hit) return hit
  const def = BY_ID.get(id)
  const raw = EFFECT_DESCRIPTIONS[id]
  let name: string
  let description = ''
  if (raw) {
    const i = raw.indexOf(': ')
    name = (i >= 0 ? raw.slice(0, i) : raw).trim()
    description = i >= 0 ? raw.slice(i + 2).trim() : ''
  } else {
    name = titleCase(def?.label ?? id.replace(/_/g, ' '))
  }
  const info: EffectInfo = { id, name, description, color: def?.color ?? EXTRA_COLORS[id] ?? '#9699a0', page: def?.page ?? 0 }
  cache.set(id, info)
  return info
}

/** Effects grouped by page, in PAGE_NAMES order, title case ("Acid", …). Reserved slots are left out. */
export const EFFECT_CATEGORIES: { name: string; effects: EffectInfo[] }[] = PAGE_NAMES.map((page, index) => ({
  name: titleCase(page),
  effects: ALL.filter((e) => e.page === index && !e.id.includes('reserved')).map((e) => getEffectInfo(e.id)),
}))

/** Categories whose effects match the query (case-insensitive over name and description). Empty query keeps everything. */
export function filterCategories(query: string): { name: string; effects: EffectInfo[] }[] {
  const q = query.trim().toLowerCase()
  if (!q) return EFFECT_CATEGORIES
  return EFFECT_CATEGORIES
    .map((c) => ({ name: c.name, effects: c.effects.filter((e) => e.name.toLowerCase().includes(q) || e.description.toLowerCase().includes(q)) }))
    .filter((c) => c.effects.length > 0)
}
