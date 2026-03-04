import type { ComponentType } from 'react'
import type { LockableParam } from '../config/effectParams'
import type { MicroVisualProps } from '../components/ui/MicroVisuals'
import {
  SignalAnalysis,
  ShapeMorpher,
  DataGrid,
  OrbitalRings,
  RadarSweep,
  Crosshair,
} from '../components/ui/MicroVisuals'

interface SectionDef {
  label: string
  keywords: string[]
  visual: ComponentType<MicroVisualProps>
}

const SECTIONS: SectionDef[] = [
  { label: 'MIX', keywords: ['mix', 'wet', 'dry', 'blend', 'amount', 'strength', 'intensity', 'opacity'], visual: SignalAnalysis },
  { label: 'SHAPE', keywords: ['direction', 'angle', 'rotation', 'hue', 'phase', 'mode', 'shape'], visual: ShapeMorpher },
  { label: 'SIZE', keywords: ['size', 'scale', 'width', 'height', 'radius', 'thickness', 'resolution', 'count'], visual: DataGrid },
  { label: 'SPEED', keywords: ['speed', 'rate', 'frequency', 'time', 'duration', 'decay', 'attack'], visual: OrbitalRings },
  { label: 'NOISE', keywords: ['noise', 'jitter', 'seed', 'chaos', 'random', 'chance'], visual: RadarSweep },
  { label: 'OFFSET', keywords: ['offset', 'position', 'distance', 'x', 'y', 'shift'], visual: Crosshair },
]

export interface ParamSection {
  label: string
  params: LockableParam[]
  visual: ComponentType<MicroVisualProps>
}

export function classifySection(params: LockableParam[]): ParamSection[] {
  const buckets = new Map<string, { def: SectionDef; params: LockableParam[] }>()
  const unmatched: LockableParam[] = []

  for (const p of params) {
    const id = p.id.toLowerCase()
    let matched = false

    for (const def of SECTIONS) {
      if (def.keywords.some((kw) => id.includes(kw))) {
        const existing = buckets.get(def.label)
        if (existing) {
          existing.params.push(p)
        } else {
          buckets.set(def.label, { def, params: [p] })
        }
        matched = true
        break
      }
    }

    if (!matched) {
      unmatched.push(p)
    }
  }

  // Build result array preserving section order
  const result: ParamSection[] = []

  for (const def of SECTIONS) {
    const bucket = buckets.get(def.label)
    if (bucket && bucket.params.length > 0) {
      result.push({
        label: bucket.def.label,
        params: bucket.params,
        visual: bucket.def.visual,
      })
    }
  }

  // Add unmatched params as fallback group
  if (unmatched.length > 0) {
    result.push({
      label: 'PARAMS',
      params: unmatched,
      visual: Crosshair,
    })
  }

  // Merge single-param sections into the nearest group
  for (let i = result.length - 1; i >= 0; i--) {
    if (result[i].params.length === 1 && result.length > 1) {
      const target = i > 0 ? i - 1 : i + 1
      if (target < result.length) {
        result[target].params.push(...result[i].params)
        result.splice(i, 1)
      }
    }
  }

  return result
}
