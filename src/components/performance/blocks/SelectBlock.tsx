import { useRef } from 'react'
import { useTransition, animated } from '@react-spring/web'

interface SelectBlockProps {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
  paramId?: string
}

export function SelectBlock({ label, value, options, onChange }: SelectBlockProps) {
  const currentIndex = options.findIndex(o => o.value === value)
  const currentLabel = options[currentIndex]?.label ?? value
  const directionRef = useRef(1) // 1 = forward, -1 = backward

  const handleClick = () => {
    const nextIndex = (currentIndex + 1) % options.length
    directionRef.current = 1
    onChange(options[nextIndex].value)
  }

  // Text transition
  const transitions = useTransition(currentLabel, {
    from: { opacity: 0, x: 30 * directionRef.current },
    enter: { opacity: 1, x: 0 },
    leave: { opacity: 0, x: -30 * directionRef.current },
    config: { tension: 280, friction: 24 },
    keys: currentLabel,
  })

  return (
    <button
      onClick={handleClick}
      style={{
        position: 'relative',
        height: 80,
        width: '100%',
        borderRadius: 6,
        overflow: 'hidden',
        cursor: 'pointer',
        border: '1px solid rgba(255,255,255,0.06)',
        outline: 'none',
        backgroundColor: 'rgba(255,255,255,0.03)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      }}
    >
      {/* Section label */}
      <div
        style={{
          position: 'absolute',
          top: 8,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: 9,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--text-ghost)',
        }}
      >
        {label}
      </div>

      {/* Animated value text */}
      <div style={{ position: 'relative', height: 28, width: '100%', overflow: 'hidden' }}>
        {transitions((style, item) => (
          <animated.div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--text-primary)',
              ...style,
            }}
          >
            {item}
          </animated.div>
        ))}
      </div>

      {/* Dot indicators */}
      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
        {options.map((_, i) => (
          <animated.div
            key={i}
            style={{
              width: i === currentIndex ? 8 : 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: i === currentIndex ? 'var(--text-primary)' : 'var(--text-ghost)',
              transition: 'width 0.2s, background-color 0.2s',
            }}
          />
        ))}
      </div>
    </button>
  )
}
