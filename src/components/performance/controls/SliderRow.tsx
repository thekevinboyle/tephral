interface SliderRowProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  format?: (value: number) => string
}

export function SliderRow({
  label,
  value,
  min,
  max,
  step = 0.01,
  onChange,
  format,
}: SliderRowProps) {
  const displayValue = format ? format(value) : value.toFixed(1)

  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="text-[11px] text-gray-500 w-20 shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1 accent-gray-700 cursor-pointer"
      />
      <span className="text-[11px] text-gray-600 w-10 text-right tabular-nums">
        {displayValue}
      </span>
    </div>
  )
}
