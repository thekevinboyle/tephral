interface RippleVizProps {
  frequency: number
  color: string
}

export function RippleViz({ frequency, color }: RippleVizProps) {
  const circles = []
  const centerX = 40
  const centerY = 12
  const ringCount = Math.max(2, Math.min(6, frequency))

  for (let i = 0; i < ringCount; i++) {
    const radius = 4 + i * (24 / ringCount)
    circles.push(
      <circle
        key={`ring-${i}`}
        cx={centerX}
        cy={centerY}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        opacity={0.8 - (i * 0.12)}
      />
    )
  }

  // Center point
  circles.push(
    <circle
      key="center"
      cx={centerX}
      cy={centerY}
      r={2}
      fill={color}
      opacity={0.9}
    />
  )

  // Secondary ripple source
  circles.push(
    <circle
      key="center2"
      cx={60}
      cy={8}
      r={1.5}
      fill={color}
      opacity={0.6}
    />
  )
  for (let i = 0; i < 3; i++) {
    circles.push(
      <circle
        key={`ring2-${i}`}
        cx={60}
        cy={8}
        r={3 + i * 4}
        fill="none"
        stroke={color}
        strokeWidth={1}
        opacity={0.4 - (i * 0.1)}
      />
    )
  }

  return (
    <svg width="80" height="24" viewBox="0 0 80 24" className="rounded">
      {circles}
    </svg>
  )
}
