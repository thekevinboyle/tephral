import { useRef, useState, useCallback } from 'react'
import { useDrag } from '@use-gesture/react'
import { ModulationContextMenu } from '../controls/ModulationContextMenu'
import { BracketDisplay } from '../../ui/BracketDisplay'
import { ScanMeter } from '../../ui/ScanMeter'
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
  onTap?: () => void
  isAutomationTarget?: boolean
}

const TRACK_TOP = 28
const TRACK_BOTTOM = 20

export function VerticalFaderBlock({ label, value, min, max, step, onChange, paramId, color = 'var(--accent)', onTap, isAutomationTarget }: VerticalFaderBlockProps) {
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

  return (
    <div
      ref={containerRef}
      {...bind()}
      onClick={() => onTap?.()}
      onDoubleClick={handleDoubleClick}
      onContextMenu={paramId ? (e) => {
        e.preventDefault()
        setContextMenuPos({ x: e.clientX, y: e.clientY })
      } : undefined}
      style={{
        position: 'relative',
        height: 72,
        borderRadius: 0,
        overflow: 'hidden',
        cursor: 'ns-resize',
        touchAction: 'none',
        userSelect: 'none',
        backgroundColor: BLOCK.bg,
        border: isAutomationTarget ? '1px solid #FF3355' : '1px solid var(--border)',
        animation: isAutomationTarget ? 'hud-blink 1s step-end infinite' : undefined,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {/* BracketDisplay — top section */}
      <div style={{
        padding: '6px 8px 0',
        pointerEvents: 'none',
      }}>
        <BracketDisplay value={displayValue} label={label} color={color} size="sm" />
      </div>

      {/* ScanMeter — bottom, vertical mode showing fader fill */}
      <div style={{ pointerEvents: 'none' }}>
        <ScanMeter value={normalized} color={color} height={6} />
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
