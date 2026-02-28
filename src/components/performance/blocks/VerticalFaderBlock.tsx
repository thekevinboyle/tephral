import { useRef, useState, useCallback } from 'react'
import { useDrag } from '@use-gesture/react'
import { ModulationContextMenu } from '../controls/ModulationContextMenu'
import { BLOCK } from './blockTheme'

interface VerticalFaderBlockProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  paramId?: string
  color?: string
}

const TRACK_TOP = 28
const TRACK_BOTTOM = 20
const CIRCLE_R = 7

export function VerticalFaderBlock({ label, value, min, max, step, onChange, paramId, color = 'var(--accent)' }: VerticalFaderBlockProps) {
  const normalized = (value - min) / (max - min)
  const displayValue = step >= 1 ? value.toFixed(0) : step >= 0.1 ? value.toFixed(1) : value.toFixed(2)
  const containerRef = useRef<HTMLDivElement>(null)
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null)
  const draggingRef = useRef(false)
  const lastAppliedRef = useRef(value)

  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const normalizedRef = useRef(normalized)
  normalizedRef.current = normalized
  lastAppliedRef.current = value

  const applyValue = useCallback((norm: number) => {
    const clamped = Math.max(0, Math.min(1, norm))
    let newValue = min + clamped * (max - min)
    if (step) newValue = Math.round(newValue / step) * step
    newValue = Math.max(min, Math.min(max, newValue))
    if (newValue !== lastAppliedRef.current) {
      lastAppliedRef.current = newValue
      onChangeRef.current(newValue)
    }
  }, [min, max, step])

  // Vertical drag — absolute position mapped to track
  const trackRectRef = useRef<DOMRect | null>(null)
  const bind = useDrag(({ down, first, last, event }) => {
    event?.preventDefault()
    if (first) {
      draggingRef.current = true
      trackRectRef.current = containerRef.current?.getBoundingClientRect() ?? null
    }
    const rect = trackRectRef.current
    if (down && rect && event) {
      const clientY = 'touches' in event ? (event as TouchEvent).touches[0].clientY : (event as PointerEvent).clientY
      const trackHeight = rect.height - TRACK_TOP - TRACK_BOTTOM
      // Inverted: top = max, bottom = min
      const norm = 1 - (clientY - rect.top - TRACK_TOP) / trackHeight
      applyValue(norm)
    }
    if (last) {
      draggingRef.current = false
      trackRectRef.current = null
    }
  }, {
    pointer: { touch: true },
    filterTaps: true,
  })

  const handleDoubleClick = useCallback(() => {
    const midValue = min + (max - min) * 0.5
    let snapped = midValue
    if (step) snapped = Math.round(snapped / step) * step
    onChange(Math.max(min, Math.min(max, snapped)))
  }, [min, max, step, onChange])

  // Circle Y position: top = max (norm=1), bottom = min (norm=0)
  const trackHeight = 120 - TRACK_TOP - TRACK_BOTTOM
  const circleY = TRACK_TOP + trackHeight * (1 - normalized)

  return (
    <div
      ref={containerRef}
      {...bind()}
      onDoubleClick={handleDoubleClick}
      onContextMenu={paramId ? (e) => {
        e.preventDefault()
        setContextMenuPos({ x: e.clientX, y: e.clientY })
      } : undefined}
      style={{
        position: 'relative',
        height: 120,
        borderRadius: BLOCK.radius,
        overflow: 'hidden',
        cursor: 'ns-resize',
        touchAction: 'none',
        userSelect: 'none',
        backgroundColor: BLOCK.bg,
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: BLOCK.shadow,
      }}
    >
      {/* Value — top center */}
      <div
        style={{
          position: 'absolute',
          top: 6,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: 16,
          fontWeight: 800,
          fontVariantNumeric: 'tabular-nums',
          color: BLOCK.text,
          pointerEvents: 'none',
        }}
      >
        {displayValue}
      </div>

      {/* Vertical line */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: TRACK_TOP,
          bottom: TRACK_BOTTOM,
          width: 1,
          backgroundColor: 'rgba(255,255,255,0.12)',
          transform: 'translateX(-0.5px)',
          pointerEvents: 'none',
        }}
      />

      {/* Active fill below circle */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: circleY,
          bottom: TRACK_BOTTOM,
          width: 1,
          backgroundColor: color,
          opacity: 0.4,
          transform: 'translateX(-0.5px)',
          pointerEvents: 'none',
        }}
      />

      {/* Hollow circle handle */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: circleY,
          width: CIRCLE_R * 2,
          height: CIRCLE_R * 2,
          borderRadius: '50%',
          border: `1.5px solid ${color}`,
          backgroundColor: 'transparent',
          transform: `translate(-${CIRCLE_R}px, -${CIRCLE_R}px)`,
          pointerEvents: 'none',
        }}
      />

      {/* Label — bottom center */}
      <div
        style={{
          position: 'absolute',
          bottom: 3,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: 8,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: BLOCK.textGhost,
          pointerEvents: 'none',
        }}
      >
        {label}
      </div>

      {contextMenuPos && paramId && (
        <ModulationContextMenu
          paramId={paramId}
          position={contextMenuPos}
          onClose={() => setContextMenuPos(null)}
        />
      )}
    </div>
  )
}
