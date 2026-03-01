import { useRef, useState, useCallback } from 'react'
import { useDrag } from '@use-gesture/react'
import { ModulationContextMenu } from '../controls/ModulationContextMenu'
import { BLOCK } from './blockTheme'

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
  const centerNorm = (0 - min) / range // where zero falls in 0-1
  const displayValue = step >= 0.1 ? value.toFixed(2) : value.toFixed(3)
  const isNegative = value < 0
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

  // Direct CSS values — no spring
  const centerPct = centerNorm * 100
  const valuePct = normalized * 100
  const barLeft = `${Math.min(valuePct, centerPct)}%`
  const barWidth = `${Math.abs(valuePct - centerPct)}%`

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
        borderRadius: BLOCK.radius,
        overflow: 'hidden',
        cursor: 'ns-resize',
        touchAction: 'none',
        userSelect: 'none',
        backgroundColor: BLOCK.bg,
        borderLeft: isAutomationTarget ? '3px solid #FF3355' : undefined,
        border: isAutomationTarget ? undefined : '1px solid rgba(255,255,255,0.06)',
        borderRight: isAutomationTarget ? '1px solid rgba(255,255,255,0.06)' : undefined,
        borderTop: isAutomationTarget ? '1px solid rgba(255,255,255,0.06)' : undefined,
        borderBottom: isAutomationTarget ? '1px solid rgba(255,255,255,0.06)' : undefined,
        boxShadow: isAutomationTarget
          ? `0 0 8px rgba(255, 51, 85, 0.15), ${BLOCK.shadow}`
          : BLOCK.shadow,
      }}
    >
      {/* Label — top left */}
      <div style={{
        position: 'absolute', top: 10, left: 12,
        fontSize: 9, fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: '0.08em', color: BLOCK.textGhost, pointerEvents: 'none',
      }}>
        {label}
      </div>

      {/* Value — centered */}
      <div style={{
        position: 'absolute', top: 24, left: 0, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 28, fontWeight: 900, fontVariantNumeric: 'tabular-nums',
        color: isNegative ? 'var(--text-muted)' : BLOCK.text,
        pointerEvents: 'none',
      }}>
        {isNegative ? '' : '+'}{displayValue}
      </div>

      {/* Bipolar bar — horizontal, extends from center */}
      <div style={{
        position: 'absolute', bottom: 16, left: 12, right: 12, height: 12,
        borderRadius: 6,
        backgroundColor: 'rgba(255,255,255,0.04)',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.4)',
      }}>
        {/* Center line */}
        <div style={{
          position: 'absolute', left: `${centerPct}%`, top: -2, bottom: -2, width: 1,
          backgroundColor: 'rgba(255,255,255,0.2)',
        }} />

        {/* Fill from center to value */}
        <div style={{
          position: 'absolute',
          top: 1, bottom: 1,
          borderRadius: 4,
          backgroundColor: color,
          opacity: 0.7,
          left: barLeft,
          width: barWidth,
        }} />
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
