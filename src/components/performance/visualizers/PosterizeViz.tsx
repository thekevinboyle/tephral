interface PosterizeVizProps {
  levels: number
  color: string
}

export function PosterizeViz({ levels, color }: PosterizeVizProps) {
  const bars = []
  const barCount = Math.min(levels, 8)

  for (let i = 0; i < barCount; i++) {
    const width = 60 / barCount
    const opacity = 0.2 + (i / barCount) * 0.8
    bars.push(
      <rect
        key={i}
        x={10 + i * width}
        y={4}
        width={width - 1}
        height={16}
        fill={color}
        opacity={opacity}
      />
    )
  }

  return (
    <svg width="80" height="24" viewBox="0 0 80 24" className="rounded">
      {bars}
    </svg>
  )
}
