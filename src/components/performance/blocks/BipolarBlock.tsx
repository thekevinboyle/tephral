import { useRef, useState, useCallback } from 'react'
import { useDrag } from '@use-gesture/react'
import { ModulationContextMenu } from '../controls/ModulationContextMenu'
import { BracketDisplay } from '../../ui/BracketDisplay'
import { ScanMeter } from '../../ui/ScanMeter'

interface BipolarBlockProps {
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

export function BipolarBlock({ label, value, min, max, step, onChange, paramId, color = 'var(--accent)', onTap, isAutomationTarget }: BipolarBlockProps) {
  const range = max - min
  const normalized = (value - min) / range // 0-1
  const displayValue = step >= 0.1 ? value.toFixed(2) : value.toFixed(3)
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
    let newValue = min + clamped * range
    if (step) newValue = Math.round(newValue / step) * step
    newValue = Math.max(min, Math.min(max, newValue))
    if (newValue !== lastAppliedRef.current) {
      lastAppliedRef.current = newValue
      onChangeRef.current(newValue)
    }
  }, [min, max, step, range])

  // Vertical drag — relative movement (drag up = increase)
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
  }, { pointer: { touch: true }, filterTaps: true })

  const handleDoubleClick = useCallback(() => {
    onChange(0)
  }, [onChange])

  // Prefix display: show sign for non-zero values
  const isNegative = value < 0
  const prefixedDisplay = isNegative ? displayValue : `+${displayValue}`

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
      {/* BracketDisplay — top section with bipolar value */}
      <div style={{
        padding: '10px 12px 0',
        pointerEvents: 'none',
      }}>
        <BracketDisplay value={prefixedDisplay} label={label} color={color} size="md" bipolar={true} />
      </div>

      {/* ScanMeter — bottom, bipolar mode */}
      <div style={{ pointerEvents: 'none' }}>
        <ScanMeter value={normalized} color={color} height={6} bipolar={true} />
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
