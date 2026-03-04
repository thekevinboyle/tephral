import { type ReactNode } from 'react'

interface CornerFrameProps {
  label?: string
  statusLabel?: string
  children: ReactNode
  color?: string
  animate?: boolean
  className?: string
  style?: React.CSSProperties
}

const BRACKET_SIZE = 10
const BRACKET_WEIGHT = 1

export function CornerFrame({
  label,
  statusLabel,
  children,
  color = '#FFFFFF',
  animate = false,
  className,
  style,
}: CornerFrameProps) {
  const bracketColor = color
  const bracketOpacity = 0.4

  const cornerBase: React.CSSProperties = {
    position: 'absolute',
    width: BRACKET_SIZE,
    height: BRACKET_SIZE,
    pointerEvents: 'none',
    animation: animate ? 'hud-corner-tick 0.6s ease-out' : undefined,
  }

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        padding: '8px 10px',
        ...style,
      }}
    >
      {/* Top-left bracket */}
      <div style={{
        ...cornerBase,
        top: 0, left: 0,
        borderTop: `${BRACKET_WEIGHT}px solid ${bracketColor}`,
        borderLeft: `${BRACKET_WEIGHT}px solid ${bracketColor}`,
        opacity: bracketOpacity,
      }} />
      {/* Top-right bracket */}
      <div style={{
        ...cornerBase,
        top: 0, right: 0,
        borderTop: `${BRACKET_WEIGHT}px solid ${bracketColor}`,
        borderRight: `${BRACKET_WEIGHT}px solid ${bracketColor}`,
        opacity: bracketOpacity,
      }} />
      {/* Bottom-left bracket */}
      <div style={{
        ...cornerBase,
        bottom: 0, left: 0,
        borderBottom: `${BRACKET_WEIGHT}px solid ${bracketColor}`,
        borderLeft: `${BRACKET_WEIGHT}px solid ${bracketColor}`,
        opacity: bracketOpacity,
      }} />
      {/* Bottom-right bracket */}
      <div style={{
        ...cornerBase,
        bottom: 0, right: 0,
        borderBottom: `${BRACKET_WEIGHT}px solid ${bracketColor}`,
        borderRight: `${BRACKET_WEIGHT}px solid ${bracketColor}`,
        opacity: bracketOpacity,
      }} />

      {/* Label — left of frame */}
      {label && (
        <div style={{
          position: 'absolute',
          top: '50%',
          right: '100%',
          transform: 'translateY(-50%)',
          fontSize: 8,
          fontFamily: 'var(--font-mono)',
          fontWeight: 600,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--text-ghost)',
          lineHeight: 1,
          paddingRight: 6,
          whiteSpace: 'nowrap',
        }}>
          {label}
        </div>
      )}

      {/* Status label — bottom-right inside frame */}
      {statusLabel && (
        <div style={{
          position: 'absolute',
          bottom: 1,
          right: BRACKET_SIZE + 4,
          fontSize: 7,
          fontFamily: 'var(--font-mono)',
          fontWeight: 500,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--text-ghost)',
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}>
          {statusLabel}
        </div>
      )}

      {children}
    </div>
  )
}
