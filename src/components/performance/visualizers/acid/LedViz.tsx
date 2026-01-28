interface LedVizProps {
  pixelSize: number
  color: string
}

export function LedViz({ pixelSize, color }: LedVizProps) {
  const leds = []
  const size = Math.max(3, pixelSize * 0.6)
  const gap = size * 0.2
  const cols = Math.floor(80 / (size + gap))
  const rows = Math.floor(24 / (size + gap))

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const brightness = Math.random()
      const on = brightness > 0.3

      leds.push(
        <rect
          key={`${x}-${y}`}
          x={x * (size + gap) + gap / 2}
          y={y * (size + gap) + gap / 2}
          width={size}
          height={size}
          rx={size * 0.15}
          fill={on ? color : '#222'}
          opacity={on ? 0.5 + brightness * 0.5 : 0.3}
        />
      )
    }
  }

  return (
    <svg width="80" height="24" viewBox="0 0 80 24" className="rounded">
      {leds}
    </svg>
  )
}
