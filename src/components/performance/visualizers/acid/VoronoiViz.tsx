interface VoronoiVizProps {
  cellCount: number
  color: string
}

export function VoronoiViz({ cellCount, color }: VoronoiVizProps) {
  const cells = []
  const numCells = Math.min(12, Math.max(4, cellCount / 16))

  // Generate seed points
  const points: { x: number; y: number }[] = []
  for (let i = 0; i < numCells; i++) {
    points.push({
      x: 5 + Math.random() * 70,
      y: 2 + Math.random() * 20,
    })
  }

  // Draw cell boundaries as lines connecting neighboring points
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dx = points[j].x - points[i].x
      const dy = points[j].y - points[i].y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < 30) {
        // Perpendicular bisector (simplified visualization)
        const mx = (points[i].x + points[j].x) / 2
        const my = (points[i].y + points[j].y) / 2

        cells.push(
          <line
            key={`${i}-${j}`}
            x1={mx - dy * 0.3}
            y1={my + dx * 0.3}
            x2={mx + dy * 0.3}
            y2={my - dx * 0.3}
            stroke={color}
            strokeWidth={0.5}
            opacity={0.5}
          />
        )
      }
    }

    // Draw seed points
    cells.push(
      <circle
        key={`p${i}`}
        cx={points[i].x}
        cy={points[i].y}
        r={1.5}
        fill={color}
        opacity={0.8}
      />
    )
  }

  return (
    <svg width="80" height="24" viewBox="0 0 80 24" className="rounded">
      {cells}
    </svg>
  )
}
