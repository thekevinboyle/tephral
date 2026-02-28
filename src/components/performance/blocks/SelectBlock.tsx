import { useRef, useState } from 'react'
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

export function SelectBlock({ label, value, options, onChange, color = 'var(--accent)' }: SelectBlockProps) {
  const currentIndex = options.findIndex(o => o.value === value)
  const currentLabel = options[currentIndex]?.label ?? value
  const directionRef = useRef(1)
  const [isHovered, setIsHovered] = useState(false)

  // Click feedback spring
  const [clickSpring, clickApi] = useSpring(() => ({
    scale: 1,
    config: SPRING.pop,
  }))

  const handleClick = () => {
    const nextIndex = (currentIndex + 1) % options.length
    directionRef.current = 1
    onChange(options[nextIndex].value)
    // Press feedback
    clickApi.start({
      scale: 0.97,
      onRest: () => clickApi.start({ scale: 1 }),
    })
  }

  // Bouncy text transition with scale
  const transitions = useTransition(currentLabel, {
    from: { opacity: 0, x: 30 * directionRef.current, scale: 0.92 },
    enter: { opacity: 1, x: 0, scale: 1 },
    leave: { opacity: 0, x: -30 * directionRef.current, scale: 0.92 },
    config: SPRING.bouncy,
    keys: currentLabel,
  })

  return (
    <animated.button
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        height: 80,
        width: '100%',
        borderRadius: BLOCK.radius,
        overflow: 'hidden',
        cursor: 'pointer',
        border: '1px solid rgba(255,255,255,0.06)',
        outline: 'none',
        backgroundColor: BLOCK.bg,
        boxShadow: BLOCK.shadow,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        scale: clickSpring.scale,
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
          color: BLOCK.textGhost,
        }}
      >
        {label}
      </div>

      {/* Animated value text with directional arrows */}
      <div style={{
        position: 'relative',
        height: 28,
        width: '100%',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {/* Left arrow */}
        <div style={{
          position: 'absolute',
          left: 8,
          fontSize: 14,
          color: 'var(--text-ghost)',
          opacity: isHovered ? 0.5 : 0.15,
          transition: 'opacity 0.2s',
          pointerEvents: 'none',
        }}>
          ‹
        </div>

        {transitions((style, item) => (
          <animated.div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: BLOCK.text,
              ...style,
            }}
          >
            {item}
          </animated.div>
        ))}

        {/* Right arrow */}
        <div style={{
          position: 'absolute',
          right: 8,
          fontSize: 14,
          color: 'var(--text-ghost)',
          opacity: isHovered ? 0.5 : 0.15,
          transition: 'opacity 0.2s',
          pointerEvents: 'none',
        }}>
          ›
        </div>
      </div>

      {/* Dot indicators */}
      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
        {options.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === currentIndex ? 8 : 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: i === currentIndex ? color : 'var(--text-ghost)',
              transition: 'width 0.2s, background-color 0.2s',
            }}
          />
        ))}
      </div>
    </animated.button>
  )
}
