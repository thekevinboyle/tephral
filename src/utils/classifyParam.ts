import type { LockableParam } from '../config/effectParams'

const PRIMARY_KEYWORDS = new Set([
  'mix', 'amount', 'intensity', 'threshold', 'opacity', 'blend',
  'accumulation', 'coverage', 'speed', 'wet', 'dry', 'strength',
  'depth', 'gain', 'decay', 'feedback',
])

export type ParamControlType = 'slider' | 'knob' | 'stepper' | 'toggle'

export function classifyParam(p: LockableParam): ParamControlType {
  // Explicit override wins
  if (p.controlType) return p.controlType

  // Toggle: boolean-like (0/1, integer step)
  if (p.min === 0 && p.max === 1 && p.step >= 1) return 'toggle'

  // Stepper: small integer range (≤10 discrete values)
  if (p.step >= 1 && Math.round((p.max - p.min) / p.step) <= 10) return 'stepper'

  // Slider: primary continuous params (keyword match)
  if (PRIMARY_KEYWORDS.has(p.id)) return 'slider'

  // Default: knob
  return 'knob'
}
