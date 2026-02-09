interface HexVizProps {
  cellSize: number
  color: string
}

export function HexViz({ cellSize, color }: HexVizProps) {
  const hexes = []
  const size = Math.max(4, cellSize / 4)
  const hexWidth = Math.sqrt(3) * size
  const hexHeight = size * 2
  const vertDist = hexHeight * 0.75
  const horizDist = hexWidth

  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 8; col++) {
      const offsetX = (row % 2) * (horizDist / 2)
      const cx = 5 + col * horizDist + offsetX
      const cy = 4 + row * vertDist

      // Create hexagon path
      let path = ''
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6
        const x = cx + size * 0.8 * Math.cos(angle)
        const y = cy + size * 0.8 * Math.sin(angle)
        path += (i === 0 ? 'M' : 'L') + `${x},${y}`
      }
      path += 'Z'

      hexes.push(
        <path
          key={`${row}-${col}`}
          d={path}
          fill={color}
          opacity={0.3 + Math.random() * 0.5}
          stroke={color}
          strokeWidth={0.5}
          strokeOpacity={0.3}
        />
      )
    }
  }

  return (
    <svg width="80" height="24" viewBox="0 0 80 24" className="rounded">
      {hexes}
    </svg>
  )
}
