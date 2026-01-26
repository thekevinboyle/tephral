import { useRef, useCallback } from 'react'

interface Knob3DProps {
  label: string
  value: number
  min?: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  onChange: (value: number) => void
}

export function Knob3D({
  label,
  value,
  min = 0,
  max = 100,
  size = 'md',
  onChange,
}: Knob3DProps) {
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
    sm: { outer: 40, inner: 32, notch: 10 },
    md: { outer: 56, inner: 44, notch: 14 },
    lg: { outer: 72, inner: 58, notch: 18 },
  }[size]

  return (
    <div className="flex flex-col items-center gap-1.5">
      {/* Knob container */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative cursor-pointer select-none touch-none"
        style={{ width: dimensions.outer, height: dimensions.outer }}
      >
        {/* Outer ring / track */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'linear-gradient(145deg, #1a1d24, #0d0f12)',
            boxShadow: `
              inset 0 2px 4px rgba(0,0,0,0.5),
              inset 0 -1px 2px rgba(255,255,255,0.05),
              0 4px 8px rgba(0,0,0,0.4)
            `,
          }}
        />

        {/* Value arc */}
        <svg
          className="absolute inset-0"
          viewBox="0 0 100 100"
          style={{ transform: 'rotate(-135deg)' }}
        >
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="#2a2d35"
            strokeWidth="3"
            strokeDasharray="216.77 360"
            strokeLinecap="round"
          />
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="url(#knobGradient)"
            strokeWidth="3"
            strokeDasharray={`${((value - min) / (max - min)) * 216.77} 360`}
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="knobGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
        </svg>

        {/* Inner knob body */}
        <div
          className="absolute rounded-full"
          style={{
            top: (dimensions.outer - dimensions.inner) / 2,
            left: (dimensions.outer - dimensions.inner) / 2,
            width: dimensions.inner,
            height: dimensions.inner,
            background: `
              radial-gradient(ellipse at 30% 20%, #4a4d55 0%, #2a2d35 50%, #1a1d24 100%)
            `,
            boxShadow: `
              inset 0 2px 4px rgba(255,255,255,0.1),
              inset 0 -2px 4px rgba(0,0,0,0.3),
              0 2px 8px rgba(0,0,0,0.3)
            `,
          }}
        >
          {/* Notch indicator */}
          <div
            className="absolute left-1/2 bg-white rounded-full"
            style={{
              width: 3,
              height: dimensions.notch,
              top: 4,
              transform: `translateX(-50%) rotate(${rotation}deg)`,
              transformOrigin: `center ${dimensions.inner / 2 - 4}px`,
              boxShadow: '0 0 4px rgba(255,255,255,0.5)',
            }}
          />
        </div>
      </div>

      {/* Label */}
      <span className="text-[9px] uppercase tracking-wider text-[#6b7280] font-medium">
        {label}
      </span>
    </div>
  )
}
