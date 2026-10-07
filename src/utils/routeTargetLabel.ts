import { EFFECT_PARAM_REGISTRY } from '../config/effectParams'
import { getEffectInfo } from '../config/effectNames'
import { displayParamLabel } from '../config/paramNames'

const cache = new Map<string, string>()

/** Display name of a registry param ("seg_voxel", "scatter" -> "Scatter"); falls back to the raw id. */
const nameCache = new Map<string, string>()

export function paramDisplayName(effectId: string, paramId: string): string {
  const key = `${effectId}.${paramId}`
  const hit = nameCache.get(key)
  if (hit !== undefined) return hit
  const entry = EFFECT_PARAM_REGISTRY[effectId]
  const p = entry?.getParams().find((x) => x.id === paramId) ?? entry?.getSelectParams?.().find((x) => x.id === paramId)
  const out = p ? displayParamLabel(effectId, p) : paramId
  if (entry) nameCache.set(key, out)
  return out
}

/** A routing target "effectId.paramId" as the user reads it: "Voxel · Scatter". */
export function routeTargetLabel(targetParam: string): string {
  const hit = cache.get(targetParam)
  if (hit !== undefined) return hit
  const dot = targetParam.indexOf('.')
  if (dot < 0) return targetParam
  const effectId = targetParam.slice(0, dot)
  const out = `${getEffectInfo(effectId).name} · ${paramDisplayName(effectId, targetParam.slice(dot + 1))}`
  cache.set(targetParam, out)
  return out
}
