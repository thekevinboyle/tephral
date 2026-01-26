interface BlockDisplaceVizProps {
  amount: number
  seed: number
  color: string
}

export function BlockDisplaceViz({ amount, seed, color }: BlockDisplaceVizProps) {
  const cols = 6
  const rows = 3
  const cellW = 80 / cols
  const cellH = 24 / rows

  // Pseudo-random offset based on seed
  const getOffset = (i: number) => {
    const s = (seed + i * 17) % 100
    return ((s % 5) - 2) * (amount / 40)
  }

  const cells = []
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x
      cells.push(
        <rect
          key={i}
          x={x * cellW + getOffset(i) + 1}
          y={y * cellH + 1}
          width={cellW - 2}
          height={cellH - 2}
          fill={color}
          opacity={0.3 + ((i * 7) % 5) * 0.15}
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
