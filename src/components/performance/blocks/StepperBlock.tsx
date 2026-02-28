import { useRef } from 'react'
import { useSpring, useTransition, animated } from '@react-spring/web'
import { BLOCK, SPRING } from './blockTheme'

interface StepperBlockProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  paramId?: string
  color?: string
}

export function StepperBlock({ label, value, min, max, step: stepSize, onChange, color = 'var(--accent)' }: StepperBlockProps) {
  const directionRef = useRef(1)
  const discreteCount = Math.round((max - min) / stepSize) + 1
  const currentIndex = Math.round((value - min) / stepSize)

  const displayValue = value.toFixed(0)

  // Click feedback spring
  const [clickSpring, clickApi] = useSpring(() => ({
    scale: 1,
    config: SPRING.pop,
  }))

  // Value text transition (slides in from direction)
  const transitions = useTransition(displayValue, {
    from: { opacity: 0, x: 20 * directionRef.current, scale: 0.9 },
    enter: { opacity: 1, x: 0, scale: 1 },
    leave: { opacity: 0, x: -20 * directionRef.current, scale: 0.9 },
    config: SPRING.bouncy,
    keys: displayValue,
  })

  const decrement = () => {
    const newVal = Math.max(min, value - stepSize)
    if (newVal !== value) {
      directionRef.current = -1
      onChange(newVal)
      clickApi.start({ scale: 0.95, onRest: () => clickApi.start({ scale: 1 }) })
    }
  }

  const increment = () => {
    const newVal = Math.min(max, value + stepSize)
    if (newVal !== value) {
      directionRef.current = 1
      onChange(newVal)
      clickApi.start({ scale: 0.95, onRest: () => clickApi.start({ scale: 1 }) })
    }
  }

  return (
    <animated.div
      style={{
        position: 'relative',
        height: 120,
        borderRadius: BLOCK.radius,
        overflow: 'hidden',
        userSelect: 'none',
        backgroundColor: BLOCK.bg,
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: BLOCK.shadow,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        scale: clickSpring.scale,
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

      {/* Arrow + value row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginTop: 8,
        }}
      >
        {/* Left arrow */}
        <button
          onClick={decrement}
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            border: 'none',
            backgroundColor: 'rgba(255,255,255,0.04)',
            color: value <= min ? 'var(--text-ghost)' : 'var(--text-primary)',
            cursor: value <= min ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            fontWeight: 700,
            transition: 'color 0.15s, background-color 0.15s',
          }}
          onMouseEnter={(e) => { if (value > min) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)' }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)' }}
        >
          ‹
        </button>

        {/* Value — animated transition */}
        <div style={{ position: 'relative', width: 48, height: 40, overflow: 'hidden' }}>
          {transitions((style, item) => (
            <animated.div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 36,
                fontWeight: 900,
                fontVariantNumeric: 'tabular-nums',
                color: BLOCK.text,
                ...style,
              }}
            >
              {item}
            </animated.div>
          ))}
        </div>

        {/* Right arrow */}
        <button
          onClick={increment}
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            border: 'none',
            backgroundColor: 'rgba(255,255,255,0.04)',
            color: value >= max ? 'var(--text-ghost)' : 'var(--text-primary)',
            cursor: value >= max ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            fontWeight: 700,
            transition: 'color 0.15s, background-color 0.15s',
          }}
          onMouseEnter={(e) => { if (value < max) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)' }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)' }}
        >
          ›
        </button>
      </div>

      {/* Dot indicators */}
      {discreteCount <= 12 && (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {Array.from({ length: discreteCount }, (_, i) => (
            <div
              key={i}
              style={{
                width: i === currentIndex ? 6 : 4,
                height: i === currentIndex ? 6 : 4,
                borderRadius: '50%',
                backgroundColor: i === currentIndex ? color : 'var(--text-ghost)',
                transition: 'all 0.2s',
              }}
            />
          ))}
        </div>
      )}
    </animated.div>
  )
}
