interface CloudVizProps {
  density: number
  color: string
}

export function CloudViz({ density, color }: CloudVizProps) {
  const points = []
  const numPoints = Math.min(100, Math.max(20, density / 100))

  for (let i = 0; i < numPoints; i++) {
    const x = Math.random() * 80
    const y = Math.random() * 24
    const z = Math.random() // Depth
    const size = 0.5 + z * 1.5
    const opacity = 0.2 + z * 0.6

    points.push(
      <circle
        key={i}
        cx={x}
        cy={y}
        r={size}
        fill={color}
        opacity={opacity}
      />
    )
  }

  return (
    <svg width="80" height="24" viewBox="0 0 80 24" className="rounded">
      {points}
    </svg>
  )
}
