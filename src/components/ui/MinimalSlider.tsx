import { useId } from 'react'

interface MinimalSliderProps {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (value: number) => void
  formatValue?: (value: number) => string
}

export function MinimalSlider({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  onChange,
  formatValue = (v) => Math.round(v * 100).toString()
}: MinimalSliderProps) {
  const id = useId()
  const percentage = ((value - min) / (max - min)) * 100

  return (
    <div className="flex items-center gap-3 py-2">
      <label htmlFor={id} className="text-xs uppercase text-muted w-24 shrink-0">
        {label}
      </label>
      <div className="flex-1 relative h-6 flex items-center">
        <div className="absolute inset-x-0 h-[2px] bg-muted/30 rounded-full" />
        <div
          className="absolute left-0 h-[2px] bg-accent-yellow rounded-full"
          style={{ width: `${percentage}%` }}
        />
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
        <div
          className="absolute w-3 h-3 bg-accent-yellow rounded-full -translate-x-1/2 pointer-events-none"
          style={{ left: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-base-light w-8 text-right tabular-nums">
        {formatValue(value)}
      </span>
    </div>
  )
}
