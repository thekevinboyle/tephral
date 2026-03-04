import { memo, useRef, type ReactNode } from 'react'
import { useSpring, animated } from '@react-spring/web'
import { useDrag } from '@use-gesture/react'
import { SPRING } from '../performance/blocks/blockTheme'

export interface FilledPadProps {
  value: number            // 0-1, controls fill height
  active: boolean          // border glow when active
  color?: string           // fill color, default accent
  indicator?: boolean      // small dot above pad
  indicatorColor?: string
  onClick?: () => void
  onDrag?: (value: number) => void
  size?: 'sm' | 'md' | 'lg'
  highlighted?: boolean    // playhead highlight
  children?: ReactNode
  className?: string
  style?: React.CSSProperties
}

const DIMENSIONS = {
  sm: { width: 40, height: 48, radius: 0, indicatorR: 2 },
  md: { width: 56, height: 64, radius: 0, indicatorR: 3 },
  lg: { width: 72, height: 80, radius: 0, indicatorR: 4 },
} as const

export const FilledPad = memo(function FilledPad({
  value,
  active,
  color = 'var(--accent)',
  indicator = false,
  indicatorColor,
  onClick,
  onDrag,
  size = 'md',
  highlighted = false,
  children,
  className,
  style: externalStyle,
}: FilledPadProps) {
  const dim = DIMENSIONS[size]
  const startValue = useRef(0)

  const [pressSpring, pressApi] = useSpring(() => ({
    scale: 1,
    config: SPRING.snappy,
  }))

  const bind = useDrag(({ movement: [, my], first, last, down, tap }) => {
    if (tap && onClick) {
      onClick()
      return
    }

    if (first) {
      startValue.current = value
      pressApi.start({ scale: 0.95 })
    }

    if (down && onDrag) {
      const delta = -my / 150
      onDrag(Math.max(0, Math.min(1, startValue.current + delta)))
    }

    if (last) {
      pressApi.start({ scale: 1 })
    }
  }, {
    pointer: { touch: true },
    filterTaps: true,
  })

  const fillPercent = Math.max(0, Math.min(100, value * 100))

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, ...externalStyle }}>
      {/* Indicator dot */}
      {indicator && (
        <div
          style={{
            width: dim.indicatorR * 2,
            height: dim.indicatorR * 2,
            backgroundColor: active
              ? (indicatorColor ?? color)
              : 'var(--border)',
            transition: 'background-color 0.15s',
            flexShrink: 0,
          }}
        />
      )}

      {/* Pad body */}
      <animated.div
        {...bind()}
        style={{
          width: dim.width,
          height: dim.height,
          borderRadius: dim.radius,
          position: 'relative',
          overflow: 'hidden',
          cursor: onClick || onDrag ? 'pointer' : 'default',
          userSelect: 'none',
          touchAction: 'none',
          backgroundColor: highlighted
            ? '#FFFFFF'
            : '#000000',
          border: active
            ? `1px solid ${color}`
            : '1px solid var(--border)',
          color: highlighted ? '#000000' : undefined,
          transition: 'background-color 0.1s, border-color 0.15s',
          scale: pressSpring.scale,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          alignItems: 'center',
        }}
      >
        {/* Fill bar — flat solid */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: `${fillPercent}%`,
            backgroundColor: color,
            opacity: active ? 0.4 : 0.15,
            transition: 'height 0.08s, opacity 0.15s',
            pointerEvents: 'none',
          }}
        />

        {/* Children (label, etc.) */}
        {children && (
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              padding: '0 4px 4px',
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            {children}
          </div>
        )}
      </animated.div>
    </div>
  )
})
