interface ScanVizProps {
  speed: number
  color: string
}

export function ScanViz({ speed, color }: ScanVizProps) {
  const lines = []
  const trailLength = Math.min(30, speed * 8)

  // Background grid dots
  for (let x = 5; x < 80; x += 10) {
    for (let y = 4; y < 24; y += 8) {
      lines.push(
        <circle
          key={`dot-${x}-${y}`}
          cx={x}
          cy={y}
          r={1}
          fill={color}
          opacity={0.2}
        />
      )
    }
  }

  // Animated scan line effect (static representation)
  const scanX = 40
  lines.push(
    <line
      key="scan-line"
      x1={scanX}
      y1={0}
      x2={scanX}
      y2={24}
      stroke={color}
      strokeWidth={2}
      opacity={0.9}
    />
  )

  // Trail gradient
  lines.push(
    <rect
      key="trail"
      x={scanX - trailLength}
      y={0}
      width={trailLength}
      height={24}
      fill={`url(#scanGradient)`}
    />
  )

  return (
    <svg width="80" height="24" viewBox="0 0 80 24" className="rounded">
      <defs>
        <linearGradient id="scanGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={color} stopOpacity="0" />
          <stop offset="100%" stopColor={color} stopOpacity="0.4" />
        </linearGradient>
      </defs>
      {lines}
    </svg>
  )
}
