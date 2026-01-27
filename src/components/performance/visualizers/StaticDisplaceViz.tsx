interface StaticDisplaceVizProps {
  intensity: number
  color: string
}

export function StaticDisplaceViz({ intensity, color }: StaticDisplaceVizProps) {
  const lines = []
  const displacement = intensity * 0.15

  for (let i = 0; i < 6; i++) {
    const y = 4 + i * 3
    const offset = ((i * 13) % 7 - 3) * displacement
    lines.push(
      <line
        key={i}
        x1={15 + offset}
        y1={y}
        x2={65 + offset}
        y2={y}
        stroke={color}
        strokeWidth={2}
        opacity={0.5 + (i % 2) * 0.3}
      />
    )
  }

  return (
    <svg width="80" height="24" viewBox="0 0 80 24" className="rounded">
      {lines}
    </svg>
  )
}
