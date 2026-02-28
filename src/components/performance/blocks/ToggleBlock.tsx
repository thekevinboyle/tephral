import { useSpring, animated } from '@react-spring/web'
import { BLOCK, SPRING } from './blockTheme'

interface ToggleBlockProps {
  label: string
  value: boolean
  onChange: (v: boolean) => void
  color?: string
  paramId?: string
}

export function ToggleBlock({ label, value, onChange, color = 'var(--accent)' }: ToggleBlockProps) {
  // Thumb position + track color
  const spring = useSpring({
    x: value ? 20 : 2,
    trackOpacity: value ? 1 : 0,
    labelColor: value ? 1 : 0,
    config: SPRING.snappy,
  })

  // Squish effect — scale dips mid-travel
  const [pressSpring, pressApi] = useSpring(() => ({
    scale: 1,
    config: SPRING.snappy,
  }))

  const handleClick = () => {
    // Trigger squish animation
    pressApi.start({
      scale: 0.9,
      onRest: () => pressApi.start({ scale: 1 }),
    })
    onChange(!value)
  }

  return (
    <button
      onClick={handleClick}
      style={{
        position: 'relative',
        height: 60,
        width: '100%',
        borderRadius: BLOCK.radius,
        overflow: 'hidden',
        cursor: 'pointer',
        border: '1px solid rgba(255,255,255,0.06)',
        outline: 'none',
        backgroundColor: BLOCK.bg,
        boxShadow: BLOCK.shadow,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
      }}
    >
      {/* Label */}
      <animated.div
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: spring.labelColor.to(t =>
            t > 0.5 ? 'var(--text-primary)' : 'var(--text-ghost)'
          ),
        }}
      >
        {label}
      </animated.div>

      {/* Toggle switch */}
      <div
        style={{
          position: 'relative',
          width: 36,
          height: 18,
          borderRadius: 9,
          flexShrink: 0,
          boxShadow: BLOCK.inset,
          overflow: 'hidden',
        }}
      >
        {/* Track — ghost bg with color overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'var(--text-ghost)',
            opacity: 0.3,
            borderRadius: 9,
          }}
        />
        <animated.div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: color,
            opacity: spring.trackOpacity.to(t => t * 0.7),
            borderRadius: 9,
          }}
        />

        {/* Thumb */}
        <animated.div
          style={{
            position: 'absolute',
            top: 2,
            width: 14,
            height: 14,
            borderRadius: 7,
            background: 'radial-gradient(ellipse at 35% 30%, var(--knob-body-highlight), var(--knob-body))',
            boxShadow: 'var(--shadow-knob)',
            left: spring.x,
            scale: pressSpring.scale,
          }}
        />
      </div>
    </button>
  )
}
