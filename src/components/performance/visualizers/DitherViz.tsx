interface DitherVizProps {
  intensity: number
  color: string
}

export function DitherViz({ intensity, color }: DitherVizProps) {
  // Bayer-like pattern
  const dots = []
  const dotSize = 2

  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 12; col++) {
      // Bayer pattern threshold
      const threshold = ((row * 2 + col) % 4) / 4
      const show = intensity / 100 > threshold
      if (show) {
        dots.push(
          <rect
            key={`${row}-${col}`}
            x={10 + col * 5}
            y={4 + row * 5}
            width={dotSize}
            height={dotSize}
            fill={color}
            opacity={0.6 + threshold * 0.4}
          />
        )
      }
    }
  }

  return (
    <svg width="80" height="24" viewBox="0 0 80 24" className="rounded">
      {dots}
    </svg>
  )
}
