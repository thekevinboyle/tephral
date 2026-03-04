import type React from 'react'

interface GlyphIconProps {
  glyph: GlyphType
  size?: number
  color?: string
  active?: boolean
  className?: string
}

export type GlyphType = 'gem' | 'target' | 'sparkle' | 'matrix' | 'wave' | 'prism' | 'eye' | 'asterisk' | 'hexagon' | 'bracket'

// Diamond with facet line
function GemPath() {
  return (
    <>
      <path d="M 8 1.5 L 14 6 L 8 14.5 L 2 6 Z" />
      <path d="M 2 6 L 8 4.5 L 14 6" />
    </>
  )
}

// Concentric rings
function TargetPath() {
  return (
    <>
      <circle cx={8} cy={8} r={7} />
      <circle cx={8} cy={8} r={4.5} />
      <circle cx={8} cy={8} r={2} />
    </>
  )
}

// 4-point star with elongated rays
function SparklePath() {
  const outer = 7
  const inner = 2.2
  const cx = 8
  const cy = 8
  const points: string[] = []

  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 - Math.PI / 2
    const nextAngle = angle + Math.PI / 4
    // Outer point
    points.push(`${cx + Math.cos(angle) * outer},${cy + Math.sin(angle) * outer}`)
    // Inner point (between outer points)
    points.push(`${cx + Math.cos(nextAngle) * inner},${cy + Math.sin(nextAngle) * inner}`)
  }

  return <polygon points={points.join(' ')} />
}

// 3x3 dot grid
function MatrixPath() {
  const dots: Array<[number, number]> = []
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      dots.push([3.5 + c * 4.5, 3.5 + r * 4.5])
    }
  }
  return (
    <>
      {dots.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={1.2} fill="currentColor" stroke="none" />
      ))}
    </>
  )
}

// Squiggly waveform
function WavePath() {
  return (
    <path d="M 1 8 Q 3 3, 5 8 Q 7 13, 9 8 Q 11 3, 13 8 Q 14 10.5, 15 8" />
  )
}

// Triangle with light dispersion rays
function PrismPath() {
  return (
    <>
      <path d="M 8 2 L 14 13 L 2 13 Z" />
      <line x1={11} y1={6.5} x2={15} y2={4} />
      <line x1={11.5} y1={8} x2={15.5} y2={7} />
      <line x1={12} y1={9.5} x2={15} y2={10.5} />
    </>
  )
}

// Eye glyph — oval with inner circle
function EyePath() {
  return (
    <>
      <path d="M 1 8 Q 8 2, 15 8 Q 8 14, 1 8 Z" />
      <circle cx={8} cy={8} r={2.5} />
    </>
  )
}

// Asterisk — 3 crossing lines
function AsteriskPath() {
  return (
    <>
      <line x1={8} y1={2} x2={8} y2={14} />
      <line x1={2.8} y1={5} x2={13.2} y2={11} />
      <line x1={13.2} y1={5} x2={2.8} y2={11} />
    </>
  )
}

// Hexagon
function HexagonPath() {
  const cx = 8, cy = 8, r = 6.5
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (i * 60 - 90) * Math.PI / 180
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`
  }).join(' ')
  return <polygon points={pts} />
}

// Bracket — square brackets
function BracketPath() {
  return (
    <>
      <polyline points="5,3 3,3 3,13 5,13" />
      <polyline points="11,3 13,3 13,13 11,13" />
    </>
  )
}

const GLYPH_MAP: Record<GlyphType, () => React.JSX.Element> = {
  gem: GemPath,
  target: TargetPath,
  sparkle: SparklePath,
  matrix: MatrixPath,
  wave: WavePath,
  prism: PrismPath,
  eye: EyePath,
  asterisk: AsteriskPath,
  hexagon: HexagonPath,
  bracket: BracketPath,
}

export function GlyphIcon({
  glyph,
  size = 16,
  color = 'currentColor',
  active = false,
  className,
}: GlyphIconProps) {
  const Component = GLYPH_MAP[glyph]
  if (!Component) return null

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke={color}
      strokeWidth={1}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{
        display: 'block',
        flexShrink: 0,
        transition: 'opacity 0.2s',
        opacity: active ? 1 : 0.7,
      }}
    >
      <Component />
    </svg>
  )
}
