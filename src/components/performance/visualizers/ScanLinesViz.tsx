interface ScanLinesVizProps {
  lineCount: number
  opacity: number
  color: string
}

export function ScanLinesViz({ lineCount, opacity, color }: ScanLinesVizProps) {
  const numLines = Math.max(3, Math.floor(lineCount / 80))
  const spacing = 24 / numLines

  const lines = []
  for (let i = 0; i < numLines; i++) {
    lines.push(
      <line
        key={i}
        x1={0}
        y1={i * spacing + spacing / 2}
        x2={80}
        y2={i * spacing + spacing / 2}
        stroke={color}
        strokeWidth={1}
        opacity={opacity * (0.5 + (i % 2) * 0.5)}
      />
    )
  }

  return (
    <svg width="80" height="24" viewBox="0 0 80 24" className="rounded">
      {lines}
    </svg>
  )
}
