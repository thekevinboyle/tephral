import { useRef, useCallback } from 'react'

interface KnobProps {
  label: string
  value: number
  min?: number
  max?: number
  color?: string
  size?: 'sm' | 'md'
  onChange: (value: number) => void
  formatValue?: (value: number) => string
}

export function Knob({
  label,
  value,
  min = 0,
  max = 100,
  color = '#666666',
  size = 'md',
  onChange,
}: KnobProps) {
  const dragStartY = useRef<number | null>(null)
  const dragStartValue = useRef<number>(0)

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragStartY.current = e.clientY
    dragStartValue.current = value
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [value])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragStartY.current === null) return
    const deltaY = dragStartY.current - e.clientY
    const range = max - min
    const sensitivity = range / 150
    const newValue = Math.min(max, Math.max(min, dragStartValue.current + deltaY * sensitivity))
    onChange(newValue)
  }, [min, max, onChange])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {}
    dragStartY.current = null
  }, [])

  // Rotation: -135 to +135 degrees
  const rotation = ((value - min) / (max - min)) * 270 - 135

  const dimensions = {
    sm: { outer: 32, indicator: 10 },
    md: { outer: 40, indicator: 14 },
  }[size]

  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* Flat knob container */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative cursor-pointer select-none touch-none"
        style={{ width: dimensions.outer, height: dimensions.outer }}
      >
        {/* Simple flat circle with 1px border */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            backgroundColor: '#f5f5f5',
            border: '1px solid #d0d0d0',
          }}
        />

        {/* Thin line indicator from center to edge */}
        <div
          className="absolute"
          style={{
            width: 2,
            height: dimensions.indicator,
            top: 4,
            left: '50%',
            backgroundColor: color,
            transform: `translateX(-50%) rotate(${rotation}deg)`,
            transformOrigin: `center ${dimensions.outer / 2 - 4}px`,
            borderRadius: 1,
          }}
        />
      </div>

      {/* Label - mixed case, medium weight */}
      <span
        className="text-[14px] font-medium"
        style={{ color: '#666666' }}
      >
        {label}
      </span>
    </div>
  )
}
