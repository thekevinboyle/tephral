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

export function StepperBlock({ label, value, min, max, step: stepSize, onChange }: StepperBlockProps) {
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
        borderRadius: 0,
        overflow: 'hidden',
        userSelect: 'none',
        backgroundColor: '#000000',
        border: '1px solid var(--border)',
        boxShadow: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
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
          fontFamily: 'var(--font-mono)',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
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
          gap: 12,
          marginTop: 8,
        }}
      >
        {/* Left bracket arrow button */}
        <button
          onClick={decrement}
          style={{
            background: 'none',
            border: '1px solid var(--border)',
            color: value <= min ? BLOCK.textGhost : BLOCK.text,
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            letterSpacing: '0.12em',
            cursor: value <= min ? 'default' : 'pointer',
            padding: '4px 8px',
            lineHeight: 1,
            borderRadius: 0,
            outline: 'none',
          }}
        >
          {'[ < ]'}
        </button>

        {/* Bracket-framed animated value */}
        <div
          style={{
            position: 'relative',
            width: 88,
            height: 40,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {transitions((style, item) => (
            <animated.div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '0.12em',
                color: BLOCK.text,
                ...style,
              }}
            >
              [ {item} ]
            </animated.div>
          ))}
        </div>

        {/* Right bracket arrow button */}
        <button
          onClick={increment}
          style={{
            background: 'none',
            border: '1px solid var(--border)',
            color: value >= max ? BLOCK.textGhost : BLOCK.text,
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            letterSpacing: '0.12em',
            cursor: value >= max ? 'default' : 'pointer',
            padding: '4px 8px',
            lineHeight: 1,
            borderRadius: 0,
            outline: 'none',
          }}
        >
          {'[ > ]'}
        </button>
      </div>

      {/* Fraction counter replaces dot indicators */}
      <div
        style={{
          fontSize: 9,
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.12em',
          color: BLOCK.textGhost,
        }}
      >
        {currentIndex + 1}/{discreteCount}
      </div>
    </animated.div>
  )
}
