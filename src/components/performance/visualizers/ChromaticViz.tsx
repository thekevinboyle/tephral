interface ChromaticVizProps {
  intensity: number
  color: string
}

export function ChromaticViz({ intensity }: ChromaticVizProps) {
  const offset = Math.min(intensity * 0.06, 6)

  return (
    <svg width="80" height="24" viewBox="0 0 80 24" className="rounded">
      {/* Concentric rings with color fringing */}
      <circle cx="40" cy="12" r={10 + offset} fill="none" stroke="#ff0040" strokeWidth="2" opacity={0.6} />
      <circle cx="40" cy="12" r={10} fill="none" stroke="#ffffff" strokeWidth="2" opacity={0.8} />
      <circle cx="40" cy="12" r={10 - offset} fill="none" stroke="#0080ff" strokeWidth="2" opacity={0.6} />
    </svg>
  )
}
