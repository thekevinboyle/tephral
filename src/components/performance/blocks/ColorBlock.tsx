import { useRef } from 'react'
import { useSpring, animated } from '@react-spring/web'
import { BLOCK, SPRING } from './blockTheme'

interface ColorBlockProps {
  label: string
  value: string
  onChange: (v: string) => void
}

export function ColorBlock({ label, value, onChange }: ColorBlockProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  // Spring animates the swatch bar background color
  const colorSpring = useSpring({
    backgroundColor: value,
    config: SPRING.smooth,
  })

  // Press-down spring on click
  const [pressSpring, pressApi] = useSpring(() => ({
    scale: 1,
    config: SPRING.pop,
  }))

  const handleClick = () => {
    pressApi.start({
      scale: 0.96,
      onRest: () => pressApi.start({ scale: 1 }),
    })
    inputRef.current?.click()
  }

  return (
    <animated.div
      onClick={handleClick}
      style={{
        position: 'relative',
        height: 72,
        borderRadius: 0,
        overflow: 'hidden',
        cursor: 'pointer',
        border: '1px solid var(--border)',
        backgroundColor: BLOCK.bg,
        boxShadow: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        justifyContent: 'space-between',
        padding: '6px 0 0',
        scale: pressSpring.scale,
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

      {/* Bracket hex display */}
      <div
        style={{
          textAlign: 'center',
          fontSize: 10,
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          letterSpacing: '0.12em',
          color: BLOCK.text,
        }}
      >
        [ {value.toUpperCase()} ]
      </div>

      {/* Thin animated color swatch bar at 30% opacity */}
      <animated.div
        style={{
          height: 16,
          width: '100%',
          flexShrink: 0,
          opacity: 0.3,
          backgroundColor: colorSpring.backgroundColor,
        }}
      />

      {/* Hidden color input */}
      <input
        ref={inputRef}
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          position: 'absolute',
          opacity: 0,
          width: 0,
          height: 0,
          pointerEvents: 'none',
        }}
      />
    </animated.div>
  )
}
