interface VHSVizProps {
  tearIntensity: number
  color: string
}

export function VHSViz({ tearIntensity, color }: VHSVizProps) {
  const lines = []
  const lineCount = 3 + Math.floor(tearIntensity * 0.05)

  for (let i = 0; i < lineCount; i++) {
    const y = 4 + (i * 20 / lineCount)
    const offset = ((i * 17) % 5) * tearIntensity * 0.02
    lines.push(
      <line
        key={i}
        x1={10 + offset}
        y1={y}
        x2={70 + offset * 2}
        y2={y}
        stroke={color}
        strokeWidth={1.5}
        opacity={0.5 + (i % 3) * 0.2}
      />
    )
  }

  return (
    <svg width="80" height="24" viewBox="0 0 80 24" className="rounded">
      {lines}
      {/* Static noise at bottom */}
      <rect x="5" y="20" width="70" height="2" fill={color} opacity={0.3} />
    </svg>
  )
}
