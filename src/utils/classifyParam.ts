import type { LockableParam } from '../config/effectParams'

const PRIMARY_KEYWORDS = new Set([
  'mix', 'amount', 'intensity', 'threshold', 'opacity', 'blend',
  'accumulation', 'coverage', 'speed', 'wet', 'dry', 'strength',
  'depth', 'gain', 'decay', 'feedback',
])

const ANGLE_KEYWORDS = new Set([
  'direction', 'angle', 'rotation', 'hue', 'phase',
])

export type ParamControlType = 'slider' | 'knob' | 'stepper' | 'toggle' | 'arc' | 'vfader' | 'ruler' | 'bipolar'

export function classifyParam(p: LockableParam): ParamControlType {
  // Explicit override wins
  if (p.controlType) return p.controlType as ParamControlType

  // Toggle: boolean-like (0/1, integer step)
  if (p.min === 0 && p.max === 1 && p.step >= 1) return 'toggle'

  // Bipolar: negative min value (offsets, curvature, brightness, lift)
  if (p.min < 0) return 'bipolar'

  // Stepper: small integer range (≤6 discrete values) → button row
  if (p.step >= 1 && Math.round((p.max - p.min) / p.step) <= 6) return 'stepper'

  // Vertical fader: large integer range (>6 discrete values)
  if (p.step >= 1 && Math.round((p.max - p.min) / p.step) > 6) return 'vfader'

  // Slider: primary continuous params (keyword match) → DragNumberBlock
  if (PRIMARY_KEYWORDS.has(p.id)) return 'slider'

  // Arc: angle/rotation params → ArcBlock
  if (ANGLE_KEYWORDS.has(p.id)) return 'arc'

  // Ruler: continuous with non-standard range (not 0-1)
  if (p.min > 0 || p.max > 1) return 'ruler'

  // Default: knob → ParamBlock (horizontal slider)
  return 'knob'
}
