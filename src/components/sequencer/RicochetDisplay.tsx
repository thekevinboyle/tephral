import { useMemo } from 'react'
import { useRicochetStore } from '../../stores/ricochetStore'

const ACCENT_COLOR = '#00D9FF'

interface Props {
  size?: number
}

/**
 * Get vertices of a regular polygon for SVG rendering
 */
function getPolygonPoints(sides: number, size: number, radius: number): string {
  const center = size / 2
  const points: string[] = []
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2 - Math.PI / 2
    const x = center + Math.cos(angle) * radius
    const y = center + Math.sin(angle) * radius
    points.push(`${x},${y}`)
  }
  return points.join(' ')
}

export function RicochetDisplay({ size = 140 }: Props) {
  const { sides, ballX, ballY, currentValue, lastHitEdge } = useRicochetStore()

  const center = size / 2
  const radius = size / 2 - 20

  // Polygon points for SVG
  const polygonPoints = useMemo(() => getPolygonPoints(sides, size, radius), [sides, size, radius])

  // Ball position in SVG coordinates
  const ballSvgX = center + ballX * radius
  const ballSvgY = center + ballY * radius

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Background glow on hit */}
      {currentValue > 0.1 && (
        <circle
          cx={center}
          cy={center}
          r={radius + 10}
          fill={ACCENT_COLOR}
          opacity={currentValue * 0.15}
        />
      )}

      {/* Polygon outline */}
      <polygon
        points={polygonPoints}
        fill="none"
        stroke="var(--border)"
        strokeWidth="1"
        opacity="0.5"
      />

      {/* Active edge highlight */}
      {lastHitEdge >= 0 && currentValue > 0.1 && (
        <line
          x1={center + Math.cos((lastHitEdge / sides) * Math.PI * 2 - Math.PI / 2) * radius}
          y1={center + Math.sin((lastHitEdge / sides) * Math.PI * 2 - Math.PI / 2) * radius}
          x2={center + Math.cos(((lastHitEdge + 1) / sides) * Math.PI * 2 - Math.PI / 2) * radius}
          y2={center + Math.sin(((lastHitEdge + 1) / sides) * Math.PI * 2 - Math.PI / 2) * radius}
          stroke={ACCENT_COLOR}
          strokeWidth="3"
          opacity={currentValue}
          style={{ filter: `drop-shadow(0 0 ${4 + currentValue * 8}px ${ACCENT_COLOR})` }}
        />
      )}

      {/* Vertex dots */}
      {Array.from({ length: sides }).map((_, i) => {
        const angle = (i / sides) * Math.PI * 2 - Math.PI / 2
        const x = center + Math.cos(angle) * radius
        const y = center + Math.sin(angle) * radius
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={3}
            fill="var(--bg-elevated)"
            stroke="var(--border)"
            strokeWidth="1"
          />
        )
      })}

      {/* Ball trail (fading) */}
      <circle
        cx={ballSvgX}
        cy={ballSvgY}
        r={12}
        fill={ACCENT_COLOR}
        opacity={0.1 + currentValue * 0.2}
      />

      {/* Ball */}
      <circle
        cx={ballSvgX}
        cy={ballSvgY}
        r={6}
        fill={ACCENT_COLOR}
        style={{
          filter: currentValue > 0.1 ? `drop-shadow(0 0 ${6 + currentValue * 10}px ${ACCENT_COLOR})` : 'none',
          transition: 'filter 0.1s ease-out',
        }}
      />

      {/* Center indicator */}
      <text
        x={center}
        y={center + 4}
        textAnchor="middle"
        fontSize="14"
        fontWeight="bold"
        fill={ACCENT_COLOR}
        fontFamily="'JetBrains Mono', monospace"
        opacity={0.6}
      >
        {sides}
      </text>
    </svg>
  )
}
