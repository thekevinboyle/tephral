interface NoiseVizProps {
  amount: number
  speed: number
  color: string
}

export function NoiseViz({ amount, color }: NoiseVizProps) {
  // Generate static noise dots
  const dots = []
  const density = Math.floor(amount * 0.8) + 10

  for (let i = 0; i < density; i++) {
    // Pseudo-random positions
    const x = ((i * 37) % 80)
    const y = ((i * 23) % 24)
    const size = 1 + (i % 3)
    const opacity = 0.3 + ((i * 7) % 5) * 0.15

    dots.push(
      <rect
        key={i}
        x={x}
        y={y}
        width={size}
        height={size}
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
