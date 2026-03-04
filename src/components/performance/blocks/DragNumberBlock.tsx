import { useRef, useState, useCallback } from 'react'
import { useDrag } from '@use-gesture/react'
import { ModulationContextMenu } from '../controls/ModulationContextMenu'
import { BracketDisplay } from '../../ui/BracketDisplay'
import { ScanMeter } from '../../ui/ScanMeter'

interface DragNumberBlockProps {
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

export function DragNumberBlock({ label, value, min, max, step, onChange, paramId, color = 'var(--accent)', onTap, isAutomationTarget }: DragNumberBlockProps) {
  const normalized = (value - min) / (max - min)
  const displayValue = step >= 1 ? value.toFixed(0) : step >= 0.1 ? value.toFixed(1) : value.toFixed(2)
  const containerRef = useRef<HTMLDivElement>(null)
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null)
  const draggingRef = useRef(false)
  const containerHeightRef = useRef(120)
  const lastAppliedRef = useRef(value)

  // Stable refs to avoid stale closures in gesture handler
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

  // Vertical drag — relative movement (drag up = increase, drag down = decrease)
  const startNormRef = useRef(0)
  const bind = useDrag(({ down, movement: [, my], first, last, event }) => {
    event?.preventDefault()
    if (first) {
      startNormRef.current = normalizedRef.current
      draggingRef.current = true
      containerHeightRef.current = containerRef.current?.getBoundingClientRect().height || 120
    }
    if (down) {
      applyValue(startNormRef.current + (-my / containerHeightRef.current))
    }
    if (last) {
      draggingRef.current = false
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
        height: 120,
        borderRadius: 0,
        overflow: 'hidden',
        cursor: 'ns-resize',
        touchAction: 'none',
        userSelect: 'none',
        backgroundColor: '#000000',
        border: isAutomationTarget ? '1px solid #FF3355' : '1px solid var(--border)',
        animation: isAutomationTarget ? 'hud-blink 1s step-end infinite' : undefined,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {/* BracketDisplay — top section */}
      <div style={{
        padding: '10px 12px 0',
        pointerEvents: 'none',
      }}>
        <BracketDisplay value={displayValue} label={label} color={color} size="lg" />
      </div>

      {/* ScanMeter — bottom */}
      <div style={{ pointerEvents: 'none' }}>
        <ScanMeter value={normalized} color={color} height={6} />
      </div>

      {/* Modulation context menu */}
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
