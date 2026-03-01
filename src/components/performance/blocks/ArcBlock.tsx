import { useRef, useState, useCallback } from 'react'
import { useDrag } from '@use-gesture/react'
import { ModulationContextMenu } from '../controls/ModulationContextMenu'
import { BLOCK } from './blockTheme'

interface ArcBlockProps {
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

const ARC_SIZE = 70
const ARC_STROKE = 3
const ARC_RADIUS = (ARC_SIZE - ARC_STROKE) / 2
const CENTER = ARC_SIZE / 2
// 270° sweep: from -225° to +45° (gap at bottom)
const START_ANGLE = -225
const SWEEP_DEG = 270

function polarToCart(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg - 90) * Math.PI / 180
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  }
}

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const start = polarToCart(cx, cy, r, endDeg)
  const end = polarToCart(cx, cy, r, startDeg)
  const sweep = endDeg - startDeg
  const largeArc = sweep > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`
}

export function ArcBlock({ label, value, min, max, step, onChange, paramId, color = 'var(--accent)', onTap, isAutomationTarget }: ArcBlockProps) {
  const normalized = (value - min) / (max - min)
  const containerRef = useRef<HTMLDivElement>(null)
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null)
  const draggingRef = useRef(false)
  const lastAppliedRef = useRef(value)

  // Stable refs to avoid stale closures in gesture handler
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const normalizedRef = useRef(normalized)
  normalizedRef.current = normalized
  lastAppliedRef.current = value

  // Format display value
  const displayValue = step >= 1 ? `${value.toFixed(0)}°` : value.toFixed(1)

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

  // Vertical drag — relative movement (drag up = increase)
  const startNormRef = useRef(0)
  const bind = useDrag(({ down, movement: [, my], first, last, event }) => {
    event?.preventDefault()
    if (first) {
      startNormRef.current = normalizedRef.current
      draggingRef.current = true
    }
    if (down) {
      applyValue(startNormRef.current + (-my / 150))
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

  // Direct SVG values — no spring
  const bgArc = describeArc(CENTER, CENTER, ARC_RADIUS, START_ANGLE, START_ANGLE + SWEEP_DEG)
  const fillSweep = Math.max(0.01, normalized * SWEEP_DEG)
  const fillArc = describeArc(CENTER, CENTER, ARC_RADIUS, START_ANGLE, START_ANGLE + fillSweep)
  const indicatorAngle = START_ANGLE + normalized * SWEEP_DEG
  const indicatorTip = polarToCart(CENTER, CENTER, ARC_RADIUS - 2, indicatorAngle)
  const dotPos = polarToCart(CENTER, CENTER, ARC_RADIUS, indicatorAngle)

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
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Label — top left */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 12,
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

      {/* SVG arc */}
      <svg
        width={ARC_SIZE}
        height={ARC_SIZE}
        viewBox={`0 0 ${ARC_SIZE} ${ARC_SIZE}`}
        style={{ pointerEvents: 'none', marginTop: 8 }}
      >
        {/* Background track */}
        <path
          d={bgArc}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={ARC_STROKE}
          strokeLinecap="round"
        />

        {/* Fill arc */}
        <path
          d={fillArc}
          fill="none"
          stroke={color}
          strokeWidth={ARC_STROKE}
          strokeLinecap="round"
        />

        {/* Indicator line from center outward */}
        <line
          x1={CENTER}
          y1={CENTER}
          x2={indicatorTip.x}
          y2={indicatorTip.y}
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />

        {/* Small dot at tip of indicator */}
        <circle
          cx={dotPos.x}
          cy={dotPos.y}
          r={4}
          fill={color}
        />
      </svg>

      {/* Center value text (overlaid on arc) */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -40%)',
          fontSize: 16,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          color: BLOCK.text,
          pointerEvents: 'none',
        }}
      >
        {displayValue}
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
