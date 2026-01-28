interface ContourVizProps {
  levels: number
  color: string
}

export function ContourViz({ levels, color }: ContourVizProps) {
  const lines = []
  const numLines = Math.min(6, Math.max(2, levels / 2))

  for (let i = 0; i < numLines; i++) {
    const y = 4 + (i * 16) / numLines
    const amplitude = 3 + Math.random() * 4
    const offset = Math.random() * 20

    let d = `M 0 ${y}`
    for (let x = 0; x <= 80; x += 4) {
      const yOffset = Math.sin((x + offset) * 0.15) * amplitude
      d += ` L ${x} ${y + yOffset}`
    }

    lines.push(
      <path
        key={i}
        d={d}
        stroke={color}
        strokeWidth={1}
        fill="none"
        opacity={0.5 + (i / numLines) * 0.5}
      />
    )
  }

  return (
    <svg width="80" height="24" viewBox="0 0 80 24" className="rounded">
      {lines}
    </svg>
  )
}
