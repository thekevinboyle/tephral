interface FaceTrackVizProps {
  threshold: number
  color: string
}

export function FaceTrackViz({ threshold, color }: FaceTrackVizProps) {
  const opacity = 0.5 + (1 - threshold / 100) * 0.4

  return (
    <svg width="80" height="24" viewBox="0 0 80 24" className="rounded">
      <rect width="80" height="24" fill="#111" />

      {/* Face outline */}
      <ellipse
        cx={25}
        cy={12}
        rx={8}
        ry={10}
        stroke={color}
        strokeWidth={1}
        fill="none"
        opacity={opacity}
      />
      {/* Eyes */}
      <circle cx={22} cy={10} r={1.5} fill={color} opacity={opacity * 0.8} />
      <circle cx={28} cy={10} r={1.5} fill={color} opacity={opacity * 0.8} />
      {/* Mouth line */}
      <line x1={22} y1={15} x2={28} y2={15} stroke={color} strokeWidth={1} opacity={opacity * 0.6} />

      {/* Bounding box */}
      <rect
        x={14}
        y={1}
        width={22}
        height={22}
        stroke={color}
        strokeWidth={1.5}
        fill="none"
        opacity={0.8}
      />

      {/* Second smaller face */}
      <ellipse
        cx={58}
        cy={12}
        rx={6}
        ry={8}
        stroke={color}
        strokeWidth={1}
        fill="none"
        opacity={opacity * 0.7}
      />
      <circle cx={56} cy={10} r={1} fill={color} opacity={opacity * 0.6} />
      <circle cx={60} cy={10} r={1} fill={color} opacity={opacity * 0.6} />
      <rect
        x={50}
        y={3}
        width={16}
        height={18}
        stroke={color}
        strokeWidth={1}
        fill="none"
        opacity={0.6}
      />
    </svg>
  )
}
