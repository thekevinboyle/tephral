import { Knob } from '../Knob'

interface SliderRowProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  format?: (value: number) => string
  paramId?: string
  statusText?: string
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
  statusText,
}: SliderRowProps) {
  return (
    <Knob
      label={label}
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={onChange}
      formatValue={format}
      paramId={paramId}
      statusText={statusText}
      showArc
      showValue
    />
  )
}
