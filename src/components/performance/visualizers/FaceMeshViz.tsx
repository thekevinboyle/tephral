interface FaceMeshVizProps {
  confidence: number
  color: string
}

export function FaceMeshViz({ confidence, color }: FaceMeshVizProps) {
  const opacity = confidence / 100
  const cx = 40
  const cy = 14

  return (
    <svg width="80" height="24" viewBox="0 0 80 24" className="rounded">
      {/* Face oval */}
      <ellipse
        cx={cx}
        cy={cy}
        rx={12}
        ry={10}
        fill="none"
        stroke={color}
        strokeWidth={1}
        opacity={opacity}
      />
      {/* Eyes */}
      <ellipse cx={cx - 5} cy={cy - 2} rx={2} ry={1.5} fill="none" stroke={color} strokeWidth={0.8} opacity={opacity} />
      <ellipse cx={cx + 5} cy={cy - 2} rx={2} ry={1.5} fill="none" stroke={color} strokeWidth={0.8} opacity={opacity} />
      {/* Nose */}
      <path d={`M${cx},${cy - 1} L${cx - 1},${cy + 2} L${cx + 1},${cy + 2}`} fill="none" stroke={color} strokeWidth={0.8} opacity={opacity} />
      {/* Mouth */}
      <path d={`M${cx - 4},${cy + 5} Q${cx},${cy + 7} ${cx + 4},${cy + 5}`} fill="none" stroke={color} strokeWidth={0.8} opacity={opacity} />
      {/* Tracking points */}
      <circle cx={cx - 5} cy={cy - 2} r={1} fill={color} opacity={opacity} />
      <circle cx={cx + 5} cy={cy - 2} r={1} fill={color} opacity={opacity} />
      <circle cx={cx} cy={cy + 2} r={1} fill={color} opacity={opacity} />
      <circle cx={cx} cy={cy + 5} r={1} fill={color} opacity={opacity} />
      <circle cx={cx - 10} cy={cy} r={1} fill={color} opacity={opacity} />
      <circle cx={cx + 10} cy={cy} r={1} fill={color} opacity={opacity} />
    </svg>
  )
}
