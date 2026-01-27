interface FeedbackVizProps {
  decay: number
  color: string
}

export function FeedbackViz({ decay, color }: FeedbackVizProps) {
  const layers = []
  const layerCount = 4

  for (let i = 0; i < layerCount; i++) {
    const scale = 1 - i * 0.15
    const opacity = decay / 100 * (1 - i * 0.25)
    const offset = i * 2
    layers.push(
      <rect
        key={i}
        x={20 + offset}
        y={4 + offset}
        width={40 * scale}
        height={16 * scale}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        opacity={opacity}
      />
    )
  }

  return (
    <svg width="80" height="24" viewBox="0 0 80 24" className="rounded">
      {layers.reverse()}
    </svg>
  )
}
