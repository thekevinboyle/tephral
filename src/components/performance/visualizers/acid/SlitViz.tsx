interface SlitVizProps {
  speed: number
  color: string
}

export function SlitViz({ speed, color }: SlitVizProps) {
  const lines = []
  const numLines = 20

  for (let i = 0; i < numLines; i++) {
    const x = i * 4
    const waveOffset = Math.sin(i * 0.3 * speed) * 3
    const opacity = 0.3 + (i / numLines) * 0.5

    lines.push(
      <line
        key={i}
        x1={x}
        y1={0}
        x2={x + waveOffset}
        y2={24}
        stroke={color}
        strokeWidth={2}
        opacity={opacity}
      />
    )
  }

  return (
    <svg width="80" height="24" viewBox="0 0 80 24" className="rounded">
      {lines}
    </svg>
  )
}
