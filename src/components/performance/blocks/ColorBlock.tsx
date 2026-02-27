import { useRef } from 'react'
import { useSpring, animated } from '@react-spring/web'

interface ColorBlockProps {
  label: string
  value: string
  onChange: (v: string) => void
}

export function ColorBlock({ label, value, onChange }: ColorBlockProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const spring = useSpring({
    backgroundColor: value,
    config: { tension: 200, friction: 26 },
  })

  // Determine contrasting text color
  const isLight = isLightColor(value)

  return (
    <animated.div
      onClick={() => inputRef.current?.click()}
      style={{
        position: 'relative',
        height: 120,
        borderRadius: 6,
        overflow: 'hidden',
        cursor: 'pointer',
        border: '1px solid rgba(255,255,255,0.06)',
        backgroundColor: spring.backgroundColor,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
      }}
    >
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
          color: isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)',
        }}
      >
        {label}
      </div>

      {/* Hex value */}
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          color: isLight ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)',
          letterSpacing: '0.02em',
        }}
      >
        {value.toUpperCase()}
      </div>

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

function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '')
  if (c.length < 6) return false
  const r = parseInt(c.substring(0, 2), 16)
  const g = parseInt(c.substring(2, 4), 16)
  const b = parseInt(c.substring(4, 6), 16)
  // Perceived luminance
  return (r * 299 + g * 587 + b * 114) / 1000 > 128
}
