interface LensVizProps {
  curvature: number
  color: string
}

export function LensViz({ curvature, color }: LensVizProps) {
  const curve = curvature * 8

  return (
    <svg width="80" height="24" viewBox="0 0 80 24" className="rounded">
      {/* Lens distortion curve */}
      <path
        d={`M 10,12 Q 40,${12 + curve} 70,12`}
        fill="none"
        stroke={color}
        strokeWidth="2"
        opacity={0.8}
      />
      {/* Grid lines showing distortion */}
      <path
        d={`M 25,4 Q 25,${12 + curve * 0.5} 25,20`}
        fill="none"
        stroke={color}
        strokeWidth="1"
        opacity={0.4}
      />
      <path
        d={`M 40,4 Q 40,${12 + curve} 40,20`}
        fill="none"
        stroke={color}
        strokeWidth="1"
        opacity={0.4}
      />
      <path
        d={`M 55,4 Q 55,${12 + curve * 0.5} 55,20`}
        fill="none"
        stroke={color}
        strokeWidth="1"
        opacity={0.4}
      />
    </svg>
  )
}
