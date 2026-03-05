import { useRef, useState, useCallback } from 'react'
import { useSpring, animated } from '@react-spring/web'
import { useDrag } from '@use-gesture/react'
import { ModulationContextMenu } from '../controls/ModulationContextMenu'
import { BracketDisplay } from '../../ui/BracketDisplay'
import { ScanMeter } from '../../ui/ScanMeter'
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

const TRACK_PADDING = 10
const THUMB_W = 10
const THUMB_H = 14

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
        height: 72,
        borderRadius: 0,
        overflow: 'hidden',
        userSelect: 'none',
        backgroundColor: BLOCK.bg,
        border: isAutomationTarget ? '1px solid #FF3355' : '1px solid var(--border)',
        animation: isAutomationTarget ? 'hud-blink 1s step-end infinite' : undefined,
      }}
    >
      {/* BracketDisplay — top section */}
      <div style={{
        position: 'absolute',
        top: 6,
        left: TRACK_PADDING,
        right: TRACK_PADDING,
        pointerEvents: 'none',
      }}>
        <BracketDisplay value={displayValue} label={label} color={color} size="sm" />
      </div>

      {/* Slider track area */}
      <div
        ref={trackRef}
        {...bind()}
        style={{
          position: 'absolute',
          left: TRACK_PADDING,
          right: TRACK_PADDING,
          top: 38,
          height: 20,
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
            borderRadius: 0,
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border)',
          }}
        >
          {/* Fill */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: `${normalized * 100}%`,
              backgroundColor: color,
              opacity: 0.5,
            }}
          />
        </div>

        {/* Thumb */}
        <animated.div
          style={{
            position: 'absolute',
            width: THUMB_W,
            height: THUMB_H,
            borderRadius: 0,
            backgroundColor: '#FFFFFF',
            left: thumbLeft,
            scaleY: thumbSpring.scaleY,
            cursor: 'grab',
          }}
        />
      </div>

      {/* ScanMeter — bottom */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        pointerEvents: 'none',
      }}>
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
