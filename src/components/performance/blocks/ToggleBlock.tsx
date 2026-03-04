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
        height: 60,
        width: '100%',
        borderRadius: 0,
        overflow: 'hidden',
        cursor: 'pointer',
        border: '1px solid var(--border)',
        outline: 'none',
        backgroundColor: value ? '#FFFFFF' : '#000000',
        boxShadow: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '0 8px',
        scale: pressSpring.scale,
      }}
    >
      {/* Label */}
      <div
        style={{
          fontSize: 8,
          fontFamily: 'var(--font-mono)',
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          color: value ? '#000000' : BLOCK.textGhost,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '100%',
        }}
      >
        {label}
      </div>

      {/* Bracket state display */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: value ? '#000000' : '#FFFFFF',
          whiteSpace: 'nowrap',
        }}
      >
        {value ? 'ENABLED' : 'DISABLED'}
      </div>
    </animated.button>
  )
}
