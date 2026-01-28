interface MirrorVizProps {
  segments: number
  color: string
}

export function MirrorViz({ segments, color }: MirrorVizProps) {
  const lines = []
  const numSegments = Math.max(2, Math.min(8, segments))

  // Create radial mirror lines from center
  const cx = 40
  const cy = 12

  for (let i = 0; i < numSegments; i++) {
    const angle = (i * Math.PI * 2) / numSegments
    const x2 = cx + Math.cos(angle) * 40
    const y2 = cy + Math.sin(angle) * 12

    lines.push(
      <line
        key={i}
        x1={cx}
        y1={cy}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={1}
        opacity={0.6}
      />
    )
  }

  // Add some mirrored shapes
  const shapes = []
  for (let i = 0; i < 3; i++) {
    const r = 4 + i * 3
    shapes.push(
      <circle
        key={`c${i}`}
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={0.5}
        opacity={0.3 + i * 0.2}
      />
    )
  }

  return (
    <svg width="80" height="24" viewBox="0 0 80 24" className="rounded">
      {lines}
      {shapes}
    </svg>
  )
}
