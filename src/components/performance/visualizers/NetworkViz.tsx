interface NetworkVizProps {
  pointRadius: number
  maxDistance: number
  color: string
}

export function NetworkViz({ pointRadius, color }: NetworkVizProps) {
  // Static point positions
  const points = [
    { x: 10, y: 8 },
    { x: 25, y: 16 },
    { x: 40, y: 6 },
    { x: 55, y: 18 },
    { x: 70, y: 10 },
    { x: 35, y: 12 },
  ]

  // Generate connection lines
  const lines = []
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dx = points[i].x - points[j].x
      const dy = points[i].y - points[j].y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 35) {
        lines.push(
          <line
            key={`${i}-${j}`}
            x1={points[i].x}
            y1={points[i].y}
            x2={points[j].x}
            y2={points[j].y}
            stroke={color}
            strokeWidth={0.5}
            opacity={1 - dist / 40}
          />
        )
      }
    }
  }

  return (
    <svg width="80" height="24" viewBox="0 0 80 24" className="rounded">
      {lines}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={Math.max(1.5, pointRadius * 0.3)}
          fill={color}
        />
      ))}
    </svg>
  )
}
