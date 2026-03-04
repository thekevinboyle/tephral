import { Knob } from '../Knob'
import { MiniCurve, type CurveMode } from '../../ui/MiniCurve'

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
  curve?: CurveMode
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
  curve,
}: SliderRowProps) {
  const normalized = (value - min) / (max - min || 1)

  return (
    <div className="flex flex-col items-center gap-0.5">
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
      {curve && (
        <MiniCurve value={normalized} mode={curve} width={36} height={18} />
      )}
    </div>
  )
}
