import { useSpring, animated } from '@react-spring/web'

interface ToggleBlockProps {
  label: string
  value: boolean
  onChange: (v: boolean) => void
  color?: string
  paramId?: string
}

export function ToggleBlock({ label, value, onChange, color = 'var(--accent)' }: ToggleBlockProps) {
  const spring = useSpring({
    fill: value ? 1 : 0,
    glow: value ? 0.3 : 0,
    config: { tension: 300, friction: 20 },
  })

  return (
    <animated.button
      onClick={() => onChange(!value)}
      style={{
        position: 'relative',
        height: 60,
        width: '100%',
        borderRadius: 6,
        overflow: 'hidden',
        cursor: 'pointer',
        border: 'none',
        outline: 'none',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: spring.glow.to(g => `rgba(255,255,255,${0.06 + g * 0.1})`),
        boxShadow: spring.glow.to(g =>
          g > 0.05 ? `0 0 ${g * 20}px ${color}30, inset 0 0 ${g * 10}px ${color}10` : 'none'
        ),
      }}
    >
      {/* Fill */}
      <animated.div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: spring.fill.to(f => `${f * 100}%`),
          backgroundColor: color,
          opacity: 0.18,
          borderRadius: 6,
        }}
      />

      {/* Label */}
      <animated.div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: spring.fill.to(f => f > 0.5 ? 'var(--text-primary)' : 'var(--text-ghost)'),
        }}
      >
        {label}
      </animated.div>
    </animated.button>
  )
}
