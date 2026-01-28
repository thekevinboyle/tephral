interface MotionVizProps {
  sensitivity: number
  color: string
}

export function MotionViz({ sensitivity, color }: MotionVizProps) {
  const elements = []
  const normalizedSensitivity = sensitivity / 100

  // Motion trails/vectors
  for (let i = 0; i < 6; i++) {
    const x = 8 + i * 12
    const y = 6 + (i % 3) * 6
    const length = 8 + normalizedSensitivity * 10
    const angle = (i * 40 + 20) * (Math.PI / 180)

    const x2 = x + Math.cos(angle) * length
    const y2 = y + Math.sin(angle) * length

    // Motion vector arrow
    elements.push(
      <line
        key={`l${i}`}
        x1={x}
        y1={y}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={1.5}
        opacity={0.6 + normalizedSensitivity * 0.3}
      />
    )
    // Arrowhead
    elements.push(
      <circle
        key={`c${i}`}
        cx={x2}
        cy={y2}
        r={2}
        fill={color}
        opacity={0.8}
      />
    )
  }

  // Motion detection boxes
  elements.push(
    <rect
      key="box1"
      x={20}
      y={4}
      width={18}
      height={14}
      stroke={color}
      strokeWidth={1}
      strokeDasharray="2,2"
      fill="none"
      opacity={0.5}
    />
  )
  elements.push(
    <rect
      key="box2"
      x={50}
      y={6}
      width={14}
      height={12}
      stroke={color}
      strokeWidth={1}
      strokeDasharray="2,2"
      fill="none"
      opacity={0.5}
    />
  )

  return (
    <svg width="80" height="24" viewBox="0 0 80 24" className="rounded">
      <rect width="80" height="24" fill="#111" />
      {elements}
    </svg>
  )
}
