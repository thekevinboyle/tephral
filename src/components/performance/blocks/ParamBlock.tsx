import { useRef, useState, useCallback } from 'react'
import { useSpring, animated } from '@react-spring/web'
import { useDrag } from '@use-gesture/react'
import { ModulationContextMenu } from '../controls/ModulationContextMenu'
import { BLOCK, SPRING } from './blockTheme'

interface ParamBlockProps {
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

const TRACK_PADDING = 16
const THUMB_W = 16
const THUMB_H = 20

export function ParamBlock({ label, value, min, max, step, onChange, paramId, color = 'var(--accent)', onTap, isAutomationTarget }: ParamBlockProps) {
  const normalized = (value - min) / (max - min)
  const displayValue = step >= 1 ? value.toFixed(0) : step >= 0.1 ? value.toFixed(1) : value.toFixed(2)
  const containerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null)
  const draggingRef = useRef(false)
  const lastAppliedRef = useRef(value)

  // Stable refs to avoid stale closures in gesture handler
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const normalizedRef = useRef(normalized)
  normalizedRef.current = normalized
  lastAppliedRef.current = value

  // Spring for thumb grab scale (cosmetic only)
  const [thumbSpring, thumbApi] = useSpring(() => ({
    scaleY: 1,
    config: SPRING.snappy,
  }))

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
      thumbApi.start({ scaleY: 1.15 })
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
      thumbApi.start({ scaleY: 1 })
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

  // Direct CSS values — no spring, no bounce
  const fillWidth = `${normalized * 100}%`
  const thumbLeft = `calc(${normalized * 100}% - ${normalized * THUMB_W}px)`

  return (
    <div
      ref={containerRef}
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

      {/* Slider track area */}
      <div
        ref={trackRef}
        {...bind()}
        style={{
          position: 'absolute',
          left: TRACK_PADDING,
          right: TRACK_PADDING,
          top: 52,
          height: 40,
          cursor: 'grab',
          touchAction: 'none',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {/* Track groove */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: 4,
            borderRadius: 2,
            backgroundColor: 'rgba(255,255,255,0.06)',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.5)',
          }}
        >
          {/* Fill */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: fillWidth,
              backgroundColor: color,
              opacity: 0.6,
              borderRadius: 2,
            }}
          />
        </div>

        {/* Thumb */}
        <animated.div
          style={{
            position: 'absolute',
            width: THUMB_W,
            height: THUMB_H,
            borderRadius: 4,
            background: 'radial-gradient(ellipse at 35% 30%, var(--knob-body-highlight), var(--knob-body))',
            boxShadow: 'var(--shadow-knob)',
            left: thumbLeft,
            scaleY: thumbSpring.scaleY,
            cursor: 'grab',
          }}
        />
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
