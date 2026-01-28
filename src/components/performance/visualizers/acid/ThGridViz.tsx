interface ThGridVizProps {
  threshold: number
  color: string
}

export function ThGridViz({ threshold, color }: ThGridVizProps) {
  const cells = []
  const gridSize = 4
  const cols = 80 / gridSize
  const rows = 24 / gridSize

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      // Simulate brightness threshold
      const brightness = Math.random() * 255
      const visible = brightness > threshold

      if (visible) {
        cells.push(
          <rect
            key={`${x}-${y}`}
            x={x * gridSize + 0.5}
            y={y * gridSize + 0.5}
            width={gridSize - 1}
            height={gridSize - 1}
            fill={color}
            opacity={0.3 + (brightness / 255) * 0.7}
          />
        )
      }
    }
  }

  return (
    <svg width="80" height="24" viewBox="0 0 80 24" className="rounded">
      {cells}
    </svg>
  )
}
