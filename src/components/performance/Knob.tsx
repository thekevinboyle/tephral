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
  color = '#ffaa00',
  size = 'md',
  onChange,
  formatValue = (v) => Math.round(v).toString()
}: KnobProps) {
  const dragStartY = useRef<number | null>(null)
  const dragStartValue = useRef<number>(0)

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
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

  // Rotation: -135 to +135 degrees (270 degree range)
  const rotation = ((value - min) / (max - min)) * 270 - 135
  const percentage = ((value - min) / (max - min)) * 100

  const dimensions = size === 'sm' ? 'w-8 h-8' : 'w-12 h-12'
  const notchSize = size === 'sm' ? 'w-0.5 h-2' : 'w-1 h-3'
  const notchOrigin = size === 'sm' ? '16px' : '24px'

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Label */}
      <span className="text-[8px] uppercase tracking-wider text-muted">{label}</span>

      {/* Knob container */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`${dimensions} relative cursor-pointer select-none touch-none`}
      >
        {/* Background ring with value arc */}
        <svg className="absolute inset-0 w-full h-full -rotate-[135deg]">
          {/* Track */}
          <circle
            cx="50%"
            cy="50%"
            r="45%"
            fill="none"
            stroke="#333"
            strokeWidth="3"
            strokeDasharray={`${270 * Math.PI * 0.45 / 180} 1000`}
          />
          {/* Value arc */}
          <circle
            cx="50%"
            cy="50%"
            r="45%"
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeDasharray={`${percentage * 2.7 * Math.PI * 0.45 / 180} 1000`}
            style={{ filter: `drop-shadow(0 0 4px ${color})` }}
          />
        </svg>

        {/* Knob body */}
        <div
          className="absolute inset-1 rounded-full bg-[#1a1a1a] border border-[#333]"
          style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)' }}
        />

        {/* Notch indicator */}
        <div
          className={`absolute ${notchSize} left-1/2 rounded-full`}
          style={{
            backgroundColor: color,
            boxShadow: `0 0 6px ${color}`,
            transformOrigin: `center ${notchOrigin}`,
            transform: `translateX(-50%) rotate(${rotation}deg)`,
            top: size === 'sm' ? '4px' : '6px',
          }}
        />
      </div>

      {/* Value display */}
      <span
        className="text-[10px] font-mono tabular-nums"
        style={{ color }}
      >
        {formatValue(value)}
      </span>
    </div>
  )
}
