import { useRef, useState, useCallback } from 'react'
import { useSpring, animated } from '@react-spring/web'
import { useDrag } from '@use-gesture/react'
import { ModulationContextMenu } from '../controls/ModulationContextMenu'

interface ParamBlockProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  paramId?: string
  color?: string
}

export function ParamBlock({ label, value, min, max, step, onChange, paramId, color = 'var(--accent)' }: ParamBlockProps) {
  const normalized = (value - min) / (max - min)
  const displayValue = step >= 1 ? value.toFixed(0) : step >= 0.1 ? value.toFixed(1) : value.toFixed(2)
  const containerRef = useRef<HTMLDivElement>(null)
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null)

  // Spring for fill level
  const [fillSpring, fillApi] = useSpring(() => ({
    fill: normalized,
    config: { tension: 300, friction: 26 },
  }))

  // Spring for value text scale (bounce on change)
  const [scaleSpring, scaleApi] = useSpring(() => ({
    scale: 1,
    config: { tension: 400, friction: 14 },
  }))

  // Spring for hover lift
  const [hoverSpring, hoverApi] = useSpring(() => ({
    y: 0,
    shadow: 0,
    config: { tension: 350, friction: 26 },
  }))

  // Update fill spring when value changes externally
  const lastNorm = useRef(normalized)
  if (Math.abs(normalized - lastNorm.current) > 0.001) {
    lastNorm.current = normalized
    fillApi.start({ fill: normalized })
    scaleApi.start({
      scale: 1.08,
      onRest: () => scaleApi.start({ scale: 1 }),
    })
  }

  const applyValue = useCallback((norm: number) => {
    const clamped = Math.max(0, Math.min(1, norm))
    let newValue = min + clamped * (max - min)
    if (step) newValue = Math.round(newValue / step) * step
    newValue = Math.max(min, Math.min(max, newValue))
    onChange(newValue)
    fillApi.start({ fill: clamped, immediate: true })
  }, [min, max, step, onChange, fillApi])

  // Drag gesture — vertical drag to adjust value
  const bind = useDrag(({ down, movement: [, my], memo, first, event }) => {
    event?.preventDefault()
    if (first) {
      memo = normalized
    }
    if (down) {
      const height = containerRef.current?.getBoundingClientRect().height ?? 120
      const delta = -my / height // up = positive
      applyValue(memo + delta)
    }
    return memo
  }, {
    pointer: { touch: true },
    filterTaps: true,
  })

  const handleDoubleClick = useCallback(() => {
    // Reset to midpoint default
    const midValue = min + (max - min) * 0.5
    let snapped = midValue
    if (step) snapped = Math.round(snapped / step) * step
    onChange(Math.max(min, Math.min(max, snapped)))
  }, [min, max, step, onChange])

  return (
    <animated.div
      ref={containerRef}
      {...bind()}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => hoverApi.start({ y: -2, shadow: 8 })}
      onMouseLeave={() => hoverApi.start({ y: 0, shadow: 0 })}
      onContextMenu={paramId ? (e) => {
        e.preventDefault()
        setContextMenuPos({ x: e.clientX, y: e.clientY })
      } : undefined}
      style={{
        position: 'relative',
        height: 120,
        borderRadius: 6,
        overflow: 'hidden',
        cursor: 'ns-resize',
        touchAction: 'none',
        userSelect: 'none',
        backgroundColor: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        y: hoverSpring.y,
        boxShadow: hoverSpring.shadow.to(s => `0 ${s}px ${s * 2}px rgba(0,0,0,0.2)`),
      }}
    >
      {/* Fill indicator */}
      <animated.div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: fillSpring.fill.to(f => `${f * 100}%`),
          backgroundColor: color,
          opacity: 0.12,
          borderRadius: 6,
        }}
      />

      {/* Label */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: 9,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--text-ghost)',
          pointerEvents: 'none',
        }}
      >
        {label}
      </div>

      {/* Value */}
      <animated.div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          color: 'var(--text-primary)',
          pointerEvents: 'none',
          scale: scaleSpring.scale,
        }}
      >
        {displayValue}
      </animated.div>

      {/* Modulation context menu */}
      {contextMenuPos && paramId && (
        <ModulationContextMenu
          paramId={paramId}
          position={contextMenuPos}
          onClose={() => setContextMenuPos(null)}
        />
      )}
    </animated.div>
  )
}
