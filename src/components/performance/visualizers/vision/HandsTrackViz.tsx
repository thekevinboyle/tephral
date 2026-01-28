interface HandsTrackVizProps {
  threshold: number
  color: string
}

export function HandsTrackViz({ threshold, color }: HandsTrackVizProps) {
  const opacity = 0.5 + (1 - threshold / 100) * 0.4

  return (
    <svg width="80" height="24" viewBox="0 0 80 24" className="rounded">
      <rect width="80" height="24" fill="#111" />

      {/* Left hand - simplified palm with fingers */}
      <g transform="translate(15, 12)">
        {/* Palm */}
        <ellipse cx={0} cy={0} rx={6} ry={5} stroke={color} strokeWidth={1} fill="none" opacity={opacity} />
        {/* Fingers */}
        <line x1={-4} y1={-4} x2={-6} y2={-9} stroke={color} strokeWidth={1} opacity={opacity * 0.8} />
        <line x1={-1} y1={-5} x2={-2} y2={-10} stroke={color} strokeWidth={1} opacity={opacity * 0.8} />
        <line x1={2} y1={-5} x2={2} y2={-10} stroke={color} strokeWidth={1} opacity={opacity * 0.8} />
        <line x1={5} y1={-4} x2={7} y2={-8} stroke={color} strokeWidth={1} opacity={opacity * 0.8} />
        {/* Thumb */}
        <line x1={6} y1={0} x2={10} y2={-2} stroke={color} strokeWidth={1} opacity={opacity * 0.8} />
      </g>
      {/* Left hand box */}
      <rect x={4} y={1} width={22} height={22} stroke={color} strokeWidth={1.5} fill="none" opacity={0.7} />

      {/* Right hand */}
      <g transform="translate(55, 12)">
        <ellipse cx={0} cy={0} rx={5} ry={4} stroke={color} strokeWidth={1} fill="none" opacity={opacity * 0.8} />
        <line x1={-3} y1={-3} x2={-5} y2={-7} stroke={color} strokeWidth={1} opacity={opacity * 0.6} />
        <line x1={0} y1={-4} x2={0} y2={-8} stroke={color} strokeWidth={1} opacity={opacity * 0.6} />
        <line x1={3} y1={-3} x2={5} y2={-7} stroke={color} strokeWidth={1} opacity={opacity * 0.6} />
      </g>
      {/* Right hand box */}
      <rect x={45} y={3} width={18} height={18} stroke={color} strokeWidth={1} fill="none" opacity={0.5} />
    </svg>
  )
}
