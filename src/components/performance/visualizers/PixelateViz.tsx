interface PixelateVizProps {
  pixelSize: number
  color: string
}

export function PixelateViz({ pixelSize, color }: PixelateVizProps) {
  const pSize = Math.max(3, Math.floor(pixelSize / 3))
  const cols = Math.ceil(80 / pSize)
  const rows = Math.ceil(24 / pSize)

  const cells = []
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x
      // Checkerboard-ish pattern
      const brightness = 0.2 + ((x + y) % 2) * 0.3 + ((i * 3) % 5) * 0.1
      cells.push(
        <rect
          key={i}
          x={x * pSize}
          y={y * pSize}
          width={pSize - 1}
          height={pSize - 1}
          fill={color}
          opacity={brightness}
        />
      )
    }
  }

  return (
    <svg width="80" height="24" viewBox="0 0 80 24" className="rounded">
      {cells}
    </svg>
  )
}
