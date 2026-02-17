import { Knob } from '../Knob'
import { usePLockContext } from '../../../contexts/PLockContext'

const PLOCK = '#FFB830'

interface SliderRowProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  format?: (value: number) => string
  paramId?: string
}

export function SliderRow({
  label,
  value,
  min,
  max,
  step = 0.01,
  onChange,
  format,
  paramId,
}: SliderRowProps) {
  const plock = usePLockContext()

  // Extract short param name from "effectId.paramName" format
  const shortParam = paramId?.split('.')[1]
  const isPlockActive = plock?.active && !!shortParam
  const isLocked = isPlockActive && shortParam in plock.locks

  // In p-lock mode: show lock value and record lock + apply to effect
  const effectiveValue = isLocked ? plock!.locks[shortParam!] as number : value
  const effectiveOnChange = isPlockActive
    ? (v: number) => {
        plock!.setLock(shortParam!, v)
        onChange(v) // Apply to effect for live preview
      }
    : onChange

  return (
    <Knob
      label={label}
      value={effectiveValue}
      min={min}
      max={max}
      step={step}
      onChange={effectiveOnChange}
      formatValue={format}
      paramId={paramId}
      color={isLocked ? PLOCK : undefined}
      showArc
      showValue
    />
  )
}
