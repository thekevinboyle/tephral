interface StippleVizProps {
  size: number
  density: number
  color: string
}

export function StippleViz({ size, density, color }: StippleVizProps) {
  const numDots = Math.floor(density * 25) + 10
  const dotSize = Math.max(1, size * 0.4)

  const dots = []
  for (let i = 0; i < numDots; i++) {
    const x = (i * 17) % 80
    const y = (i * 13) % 24
    const opacity = 0.3 + ((i * 7) % 5) * 0.15

    dots.push(
      <circle
        key={i}
        cx={x}
        cy={y}
        r={dotSize}
        fill={color}
        opacity={opacity}
      />
    )
  }

  return (
    <svg width="80" height="24" viewBox="0 0 80 24" className="rounded">
      {dots}
    </svg>
  )
}
