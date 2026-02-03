import { useMemo } from 'react'
import { useEuclideanStore } from '../../stores/euclideanStore'

const ACCENT_COLOR = '#FF9F43'

interface Props {
  size?: number
}

export function EuclideanDisplay({ size = 160 }: Props) {
  const { steps, currentStep, getPattern } = useEuclideanStore()
  const pattern = useMemo(() => getPattern(), [getPattern, steps])

  const center = size / 2
  const radius = size / 2 - 20

  // Calculate dot positions around the circle
  const dots = useMemo(() => {
    return Array.from({ length: steps }, (_, i) => {
      // Start from top (-90 degrees) and go clockwise
      const angle = ((i / steps) * 2 * Math.PI) - Math.PI / 2
      const x = center + radius * Math.cos(angle)
      const y = center + radius * Math.sin(angle)
      return { x, y, index: i }
    })
  }, [steps, center, radius])

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Background circle */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="var(--border)"
        strokeWidth="1"
        opacity="0.3"
      />

      {/* Step dots */}
      {dots.map(({ x, y, index }) => {
        const isHit = pattern[index]
        const isCurrent = index === currentStep

        return (
          <g key={index}>
            {/* Glow for current step */}
            {isCurrent && isHit && (
              <circle
                cx={x}
                cy={y}
                r={10}
                fill={ACCENT_COLOR}
                opacity={0.3}
              />
            )}

            {/* Main dot */}
            <circle
              cx={x}
              cy={y}
              r={isHit ? 6 : 4}
              fill={isHit ? ACCENT_COLOR : 'var(--bg-elevated)'}
              stroke={isCurrent ? ACCENT_COLOR : 'var(--border)'}
              strokeWidth={isCurrent ? 2 : 1}
              style={{
                transition: 'all 0.1s ease-out',
                filter: isCurrent && isHit ? `drop-shadow(0 0 6px ${ACCENT_COLOR})` : 'none',
              }}
            />
          </g>
        )
      })}

      {/* Center indicator showing hits/steps */}
      <text
        x={center}
        y={center - 8}
        textAnchor="middle"
        fontSize="18"
        fontWeight="bold"
        fill={ACCENT_COLOR}
        fontFamily="'JetBrains Mono', monospace"
      >
        {pattern.filter(Boolean).length}
      </text>
      <text
        x={center}
        y={center + 12}
        textAnchor="middle"
        fontSize="12"
        fill="var(--text-muted)"
        fontFamily="'JetBrains Mono', monospace"
      >
        / {steps}
      </text>
    </svg>
  )
}
