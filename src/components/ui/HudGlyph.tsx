import { memo } from 'react'

export type HudGlyphType =
  | 'eye'
  | 'asterisk'
  | 'diamond'
  | 'crosshair'
  | 'triangle'
  | 'hexagon'
  | 'circle-dot'
  | 'brackets'

interface HudGlyphProps {
  glyph: HudGlyphType
  size?: number
  color?: string
  animate?: 'spin' | 'pulse' | 'morph' | 'none'
  className?: string
}

function getAnimation(animate: HudGlyphProps['animate']): React.CSSProperties {
  switch (animate) {
    case 'spin': return { animation: 'hud-reticle-spin 10s linear infinite' }
    case 'pulse': return { animation: 'hud-pulse 2s ease-in-out infinite' }
    case 'morph': return { animation: 'hud-glyph-morph 20s ease-in-out infinite' }
    default: return {}
  }
}

function renderGlyph(glyph: HudGlyphType, size: number, color: string) {
  const s = size
  const c = s / 2
  const sw = Math.max(0.8, s / 16)

  switch (glyph) {
    case 'eye':
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
          {/* Eye outline */}
          <ellipse cx={c} cy={c} rx={c * 0.7} ry={c * 0.4}
            fill="none" stroke={color} strokeWidth={sw} />
          {/* Pupil */}
          <circle cx={c} cy={c} r={c * 0.18} fill={color} />
          {/* Inner iris ring */}
          <circle cx={c} cy={c} r={c * 0.32}
            fill="none" stroke={color} strokeWidth={sw * 0.6} opacity={0.4} />
        </svg>
      )

    case 'asterisk':
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
          {[0, 30, 60, 90, 120, 150].map((deg) => {
            const rad = (deg * Math.PI) / 180
            const r = c * 0.7
            return (
              <line key={deg}
                x1={c - Math.cos(rad) * r} y1={c - Math.sin(rad) * r}
                x2={c + Math.cos(rad) * r} y2={c + Math.sin(rad) * r}
                stroke={color} strokeWidth={sw} />
            )
          })}
          <circle cx={c} cy={c} r={c * 0.08} fill={color} />
        </svg>
      )

    case 'diamond':
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
          <rect x={c * 0.4} y={c * 0.4}
            width={c * 1.2} height={c * 1.2}
            fill="none" stroke={color} strokeWidth={sw}
            transform={`rotate(45 ${c} ${c})`} />
          <rect x={c * 0.65} y={c * 0.65}
            width={c * 0.7} height={c * 0.7}
            fill="none" stroke={color} strokeWidth={sw * 0.6} opacity={0.3}
            transform={`rotate(45 ${c} ${c})`} />
        </svg>
      )

    case 'crosshair': {
      const gap = c * 0.25
      const arm = c * 0.7
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
          {/* Vertical lines */}
          <line x1={c} y1={c - arm} x2={c} y2={c - gap} stroke={color} strokeWidth={sw} />
          <line x1={c} y1={c + gap} x2={c} y2={c + arm} stroke={color} strokeWidth={sw} />
          {/* Horizontal lines */}
          <line x1={c - arm} y1={c} x2={c - gap} y2={c} stroke={color} strokeWidth={sw} />
          <line x1={c + gap} y1={c} x2={c + arm} y2={c} stroke={color} strokeWidth={sw} />
          {/* Center dot */}
          <circle cx={c} cy={c} r={sw} fill={color} />
          {/* Outer circle */}
          <circle cx={c} cy={c} r={c * 0.6}
            fill="none" stroke={color} strokeWidth={sw * 0.6} opacity={0.3} />
        </svg>
      )
    }

    case 'triangle':
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
          <polygon
            points={`${c},${c * 0.3} ${c * 1.7},${c * 1.6} ${c * 0.3},${c * 1.6}`}
            fill="none" stroke={color} strokeWidth={sw} strokeLinejoin="miter" />
          <circle cx={c} cy={c * 1.1} r={c * 0.08} fill={color} opacity={0.5} />
        </svg>
      )

    case 'hexagon': {
      const r = c * 0.7
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (i * 60 - 30) * Math.PI / 180
        return `${c + r * Math.cos(a)},${c + r * Math.sin(a)}`
      }).join(' ')
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
          <polygon points={pts} fill="none" stroke={color} strokeWidth={sw} />
          <circle cx={c} cy={c} r={c * 0.1} fill={color} opacity={0.4} />
        </svg>
      )
    }

    case 'circle-dot':
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
          <circle cx={c} cy={c} r={c * 0.65} fill="none" stroke={color} strokeWidth={sw} />
          <circle cx={c} cy={c} r={c * 0.12} fill={color} />
        </svg>
      )

    case 'brackets': {
      const bw = c * 0.25
      const bh = c * 0.6
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
          {/* Left bracket */}
          <polyline points={`${c - bw},${c - bh} ${c - bw * 2},${c - bh} ${c - bw * 2},${c + bh} ${c - bw},${c + bh}`}
            fill="none" stroke={color} strokeWidth={sw} />
          {/* Right bracket */}
          <polyline points={`${c + bw},${c - bh} ${c + bw * 2},${c - bh} ${c + bw * 2},${c + bh} ${c + bw},${c + bh}`}
            fill="none" stroke={color} strokeWidth={sw} />
        </svg>
      )
    }
  }
}

export const HudGlyph = memo(function HudGlyph({
  glyph,
  size = 16,
  color = 'var(--text-ghost)',
  animate = 'none',
  className,
}: HudGlyphProps) {
  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        flexShrink: 0,
        ...getAnimation(animate),
      }}
    >
      {renderGlyph(glyph, size, color)}
    </div>
  )
})
