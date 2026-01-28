interface ColorTrackVizProps {
  targetColor: string
  color: string
}

export function ColorTrackViz({ targetColor, color }: ColorTrackVizProps) {
  const spots = []

  // Create color spots matching the target
  for (let i = 0; i < 4; i++) {
    const x = 12 + i * 18
    const y = 8 + (i % 2) * 8
    const size = 4 + Math.random() * 3

    // Detected color blob
    spots.push(
      <circle
        key={`c${i}`}
        cx={x}
        cy={y}
        r={size}
        fill={targetColor}
        opacity={0.7}
      />
    )
    // Tracking box around it
    spots.push(
      <rect
        key={`b${i}`}
        x={x - size - 2}
        y={y - size - 2}
        width={size * 2 + 4}
        height={size * 2 + 4}
        stroke={color}
        strokeWidth={1}
        fill="none"
        opacity={0.8}
      />
    )
  }

  return (
    <svg width="80" height="24" viewBox="0 0 80 24" className="rounded">
      <rect width="80" height="24" fill="#111" />
      {spots}
    </svg>
  )
}
