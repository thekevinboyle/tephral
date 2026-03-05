import { useSpring, animated } from '@react-spring/web'
import { BLOCK, SPRING } from './blockTheme'

interface ToggleBlockProps {
  label: string
  value: boolean
  onChange: (v: boolean) => void
  color?: string
  paramId?: string
}

export function ToggleBlock({ label, value, onChange }: ToggleBlockProps) {
  // Squish press animation
  const [pressSpring, pressApi] = useSpring(() => ({
    scale: 1,
    config: SPRING.snappy,
  }))

  const handleClick = () => {
    pressApi.start({
      scale: 0.9,
      onRest: () => pressApi.start({ scale: 1 }),
    })
    onChange(!value)
  }

  return (
    <animated.button
      onClick={handleClick}
      style={{
        position: 'relative',
        height: 36,
        width: '100%',
        borderRadius: 0,
        overflow: 'hidden',
        cursor: 'pointer',
        border: '1px solid var(--border)',
        outline: 'none',
        backgroundColor: value ? BLOCK.text : BLOCK.bg,
        boxShadow: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        padding: '0 6px',
        scale: pressSpring.scale,
      }}
    >
      {/* Label */}
      <span
        style={{
          fontSize: 8,
          fontFamily: 'var(--font-mono)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: value ? BLOCK.bg : BLOCK.textGhost,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {label}
      </span>
      {/* State indicator */}
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          color: value ? BLOCK.bg : BLOCK.text,
          whiteSpace: 'nowrap',
        }}
      >
        {value ? 'ON' : 'OFF'}
      </span>
    </animated.button>
  )
}
