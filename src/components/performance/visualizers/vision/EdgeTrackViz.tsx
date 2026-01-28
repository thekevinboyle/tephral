interface EdgeTrackVizProps {
  threshold: number
  color: string
}

export function EdgeTrackViz({ threshold, color }: EdgeTrackVizProps) {
  const normalizedThreshold = threshold / 255
  const edges = []

  // Draw edge contours
  for (let i = 0; i < 5; i++) {
    const y = 4 + i * 4
    const startX = 5 + Math.random() * 10
    const endX = 65 + Math.random() * 10
    const midY = y + (Math.random() - 0.5) * 6
    const opacity = 0.4 + (1 - normalizedThreshold) * 0.5

    edges.push(
      <path
        key={i}
        d={`M ${startX} ${y} Q ${40} ${midY} ${endX} ${y}`}
        stroke={color}
        strokeWidth={1}
        fill="none"
        opacity={opacity}
      />
    )
  }

  // Add some detected edge boxes
  const numBoxes = Math.floor(3 - normalizedThreshold * 2)
  for (let i = 0; i < numBoxes; i++) {
    const x = 15 + i * 22
    const y = 6 + (i % 2) * 6
    edges.push(
      <rect
        key={`b${i}`}
        x={x}
        y={y}
        width={12}
        height={10}
        stroke={color}
        strokeWidth={1}
        fill="none"
        opacity={0.6}
      />
    )
  }

  return (
    <svg width="80" height="24" viewBox="0 0 80 24" className="rounded">
      <rect width="80" height="24" fill="#111" />
      {edges}
    </svg>
  )
}
