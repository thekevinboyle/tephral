interface BrightVizProps {
  threshold: number
  color: string
}

export function BrightViz({ threshold, color }: BrightVizProps) {
  const normalizedThreshold = threshold / 255
  const numBrightSpots = Math.floor(6 - normalizedThreshold * 4)

  const spots = []
  for (let i = 0; i < numBrightSpots; i++) {
    const x = 10 + (i % 4) * 18
    const y = 6 + Math.floor(i / 4) * 12
    const size = 3 + Math.random() * 4
    const opacity = 0.5 + (1 - normalizedThreshold) * 0.5

    spots.push(
      <circle
        key={i}
        cx={x}
        cy={y}
        r={size}
        fill={color}
        opacity={opacity}
      />
    )
    // Glow effect
    spots.push(
      <circle
        key={`g${i}`}
        cx={x}
        cy={y}
        r={size * 1.5}
        fill={color}
        opacity={opacity * 0.3}
      />
    )
  }

  return (
    <svg width="80" height="24" viewBox="0 0 80 24" className="rounded">
      <rect width="80" height="24" fill="#111" />
      {spots}
    </svg>
  )
}
