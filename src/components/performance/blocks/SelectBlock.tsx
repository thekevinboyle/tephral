import { useRef } from 'react'
import { useSpring, useTransition, animated } from '@react-spring/web'
import { BLOCK, SPRING } from './blockTheme'

interface SelectBlockProps {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
  paramId?: string
  color?: string
}

export function SelectBlock({ label, value, options, onChange }: SelectBlockProps) {
  const currentIndex = options.findIndex(o => o.value === value)
  const currentLabel = options[currentIndex]?.label ?? value
  const directionRef = useRef(1)

  // Click feedback spring
  const [clickSpring, clickApi] = useSpring(() => ({
    scale: 1,
    config: SPRING.pop,
  }))

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation()
    const prevIndex = (currentIndex - 1 + options.length) % options.length
    directionRef.current = -1
    onChange(options[prevIndex].value)
    clickApi.start({
      scale: 0.97,
      onRest: () => clickApi.start({ scale: 1 }),
    })
  }

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation()
    const nextIndex = (currentIndex + 1) % options.length
    directionRef.current = 1
    onChange(options[nextIndex].value)
    clickApi.start({
      scale: 0.97,
      onRest: () => clickApi.start({ scale: 1 }),
    })
  }

  // Directional text transition
  const transitions = useTransition(currentLabel, {
    from: { opacity: 0, x: 30 * directionRef.current, scale: 0.92 },
    enter: { opacity: 1, x: 0, scale: 1 },
    leave: { opacity: 0, x: -30 * directionRef.current, scale: 0.92 },
    config: SPRING.bouncy,
    keys: currentLabel,
  })

  return (
    <animated.div
      style={{
        position: 'relative',
        height: 48,
        width: '100%',
        borderRadius: 0,
        overflow: 'hidden',
        border: '1px solid var(--border)',
        backgroundColor: BLOCK.bg,
        boxShadow: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        justifyContent: 'space-between',
        padding: '4px 0',
        scale: clickSpring.scale,
      }}
    >
      {/* Label */}
      <div
        style={{
          textAlign: 'center',
          fontSize: 9,
          fontFamily: 'var(--font-mono)',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: BLOCK.textGhost,
        }}
      >
        {label}
      </div>

      {/* Navigation row: < [ VALUE ] > */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
        }}
      >
        {/* Left arrow button */}
        <button
          onClick={handlePrev}
          style={{
            background: 'none',
            border: '1px solid var(--border)',
            color: BLOCK.text,
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            letterSpacing: '0.12em',
            cursor: 'pointer',
            padding: '2px 6px',
            lineHeight: 1,
            borderRadius: 0,
            outline: 'none',
            flexShrink: 0,
          }}
        >
          {'<'}
        </button>

        {/* Animated bracket-framed value */}
        <div
          style={{
            position: 'relative',
            flex: 1,
            height: 20,
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
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: BLOCK.text,
                ...style,
              }}
            >
              [ {item} ]
            </animated.div>
          ))}
        </div>

        {/* Right arrow button */}
        <button
          onClick={handleNext}
          style={{
            background: 'none',
            border: '1px solid var(--border)',
            color: BLOCK.text,
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            letterSpacing: '0.12em',
            cursor: 'pointer',
            padding: '2px 6px',
            lineHeight: 1,
            borderRadius: 0,
            outline: 'none',
            flexShrink: 0,
          }}
        >
          {'>'}
        </button>
      </div>

      {/* Fraction counter */}
      <div
        style={{
          textAlign: 'center',
          fontSize: 9,
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.12em',
          color: BLOCK.textGhost,
        }}
      >
        {currentIndex + 1} / {options.length}
      </div>
    </animated.div>
  )
}
