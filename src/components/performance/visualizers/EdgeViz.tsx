interface EdgeVizProps {
  threshold: number
  mix: number
  color: string
}

export function EdgeViz({ mix, color }: EdgeVizProps) {
  return (
    <svg width="80" height="24" viewBox="0 0 80 24" className="rounded">
      {/* Geometric outline shape */}
      <rect
        x={20}
        y={4}
        width={40}
        height={16}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        opacity={mix}
      />
      {/* Inner diamond */}
      <polygon
        points="40,6 52,12 40,18 28,12"
        fill="none"
        stroke={color}
        strokeWidth={1}
        opacity={mix * 0.7}
      />
      {/* Edge lines */}
      <line x1={8} y1={4} x2={8} y2={20} stroke={color} strokeWidth={1} opacity={mix * 0.4} />
      <line x1={72} y1={4} x2={72} y2={20} stroke={color} strokeWidth={1} opacity={mix * 0.4} />
    </svg>
  )
}
