interface DotsVizProps {
  gridSize: number
  color: string
}

export function DotsViz({ gridSize, color }: DotsVizProps) {
  const spacing = Math.max(4, 80 / Math.max(4, gridSize / 2))
  const dots = []

  for (let x = spacing / 2; x < 80; x += spacing) {
    for (let y = spacing / 2; y < 24; y += spacing) {
      const size = 1 + Math.random() * 2
      dots.push(
        <circle
          key={`${x}-${y}`}
          cx={x}
          cy={y}
          r={size}
          fill={color}
          opacity={0.4 + Math.random() * 0.6}
        />
      )
    }
  }

  return (
    <svg width="80" height="24" viewBox="0 0 80 24" className="rounded">
      {dots}
    </svg>
  )
}
