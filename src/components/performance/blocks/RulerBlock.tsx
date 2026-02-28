import { useRef, useState, useCallback } from 'react'
import { useDrag } from '@use-gesture/react'
import { ModulationContextMenu } from '../controls/ModulationContextMenu'
import { BLOCK } from './blockTheme'

interface RulerBlockProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  paramId?: string
  color?: string
}

const TRACK_PADDING = 12
const RULER_Y = 62
const RULER_H = 24

export function RulerBlock({ label, value, min, max, step, onChange, paramId, color = 'var(--accent)' }: RulerBlockProps) {
  const normalized = (value - min) / (max - min)
  const displayValue = step >= 1 ? value.toFixed(0) : step >= 0.1 ? value.toFixed(1) : value.toFixed(2)
  const containerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
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

  // Horizontal drag — absolute pointer position mapped to track
  const trackRectRef = useRef<DOMRect | null>(null)
  const bind = useDrag(({ down, first, last, event }) => {
    event?.preventDefault()
    if (first) {
      draggingRef.current = true
      trackRectRef.current = trackRef.current?.getBoundingClientRect() ?? null
    }
    const rect = trackRectRef.current
    if (down && rect && event) {
      const clientX = 'touches' in event ? (event as TouchEvent).touches[0].clientX : (event as PointerEvent).clientX
      const norm = (clientX - rect.left) / rect.width
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

  // Compute tick marks
  const range = max - min
  const majorInterval = computeMajorInterval(range, step)
  const minorCount = 4 // minor ticks between majors

  const ticks: { norm: number; major: boolean }[] = []
  // Major ticks
  for (let v = min; v <= max + step * 0.01; v += majorInterval) {
    const n = (v - min) / range
    if (n >= -0.001 && n <= 1.001) {
      ticks.push({ norm: Math.max(0, Math.min(1, n)), major: true })
    }
  }
  // Minor ticks
  for (let v = min; v <= max + step * 0.01; v += majorInterval / minorCount) {
    const n = (v - min) / range
    if (n >= -0.001 && n <= 1.001) {
      const isMajor = ticks.some(t => Math.abs(t.norm - n) < 0.001)
      if (!isMajor) {
        ticks.push({ norm: Math.max(0, Math.min(1, n)), major: false })
      }
    }
  }

  return (
    <div
      ref={containerRef}
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
        userSelect: 'none',
        backgroundColor: BLOCK.bg,
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: BLOCK.shadow,
      }}
    >
      {/* Label — top left */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: TRACK_PADDING,
          fontSize: 9,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: BLOCK.textGhost,
          pointerEvents: 'none',
        }}
      >
        {label}
      </div>

      {/* Value — top right */}
      <div
        style={{
          position: 'absolute',
          top: 8,
          right: TRACK_PADDING,
          fontSize: 18,
          fontWeight: 800,
          fontVariantNumeric: 'tabular-nums',
          color: BLOCK.text,
          pointerEvents: 'none',
        }}
      >
        {displayValue}
      </div>

      {/* Ruler track area */}
      <div
        ref={trackRef}
        {...bind()}
        style={{
          position: 'absolute',
          left: TRACK_PADDING,
          right: TRACK_PADDING,
          top: RULER_Y - 10,
          height: RULER_H + 20,
          cursor: 'grab',
          touchAction: 'none',
        }}
      >
        {/* Tick marks */}
        {ticks.map((tick, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${tick.norm * 100}%`,
              top: 10,
              width: 1,
              height: tick.major ? RULER_H : RULER_H * 0.5,
              backgroundColor: tick.major ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
              transform: 'translateX(-0.5px)',
              pointerEvents: 'none',
            }}
          />
        ))}

        {/* Indicator line */}
        <div
          style={{
            position: 'absolute',
            left: `${normalized * 100}%`,
            top: 4,
            width: 1.5,
            height: RULER_H + 12,
            backgroundColor: color,
            transform: 'translateX(-0.75px)',
            pointerEvents: 'none',
          }}
        />

        {/* Indicator dot */}
        <div
          style={{
            position: 'absolute',
            left: `${normalized * 100}%`,
            top: 2,
            width: 5,
            height: 5,
            borderRadius: '50%',
            backgroundColor: color,
            transform: 'translate(-2.5px, 0)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Min/max labels */}
      <div
        style={{
          position: 'absolute',
          bottom: 8,
          left: TRACK_PADDING,
          fontSize: 8,
          color: 'rgba(255,255,255,0.15)',
          fontVariantNumeric: 'tabular-nums',
          pointerEvents: 'none',
        }}
      >
        {step >= 1 ? min.toFixed(0) : min.toFixed(1)}
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 8,
          right: TRACK_PADDING,
          fontSize: 8,
          color: 'rgba(255,255,255,0.15)',
          fontVariantNumeric: 'tabular-nums',
          pointerEvents: 'none',
        }}
      >
        {step >= 1 ? max.toFixed(0) : max.toFixed(1)}
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

function computeMajorInterval(range: number, _step: number): number {
  // Aim for 4-8 major ticks
  const candidates = [1, 2, 5, 10, 20, 25, 50, 100, 0.1, 0.2, 0.5, 0.05, 0.01]
  for (const c of candidates) {
    const count = range / c
    if (count >= 3 && count <= 10) return c
  }
  return range / 5
}
