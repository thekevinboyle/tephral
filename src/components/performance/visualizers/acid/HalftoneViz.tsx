interface HalftoneVizProps {
  dotSize: number
  color: string
}

export function HalftoneViz({ dotSize, color }: HalftoneVizProps) {
  const dots = []
  const spacing = Math.max(4, dotSize * 0.8)
  const angle = 45 * (Math.PI / 180)
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)

  for (let gy = -20; gy < 50; gy += spacing) {
    for (let gx = -20; gx < 100; gx += spacing) {
      const x = gx * cos - gy * sin + 40
      const y = gx * sin + gy * cos + 12
      if (x < 0 || x > 80 || y < 0 || y > 24) continue
      const size = 1 + Math.random() * (dotSize / 8)
      dots.push(
        <circle
          key={`${gx}-${gy}`}
          cx={x}
          cy={y}
          r={size}
          fill={color}
          opacity={0.4 + Math.random() * 0.6}
        />
      )
    }
  }

  return (
    <svg width="80" height="24" viewBox="0 0 80 24" className="rounded">
      {dots}
    </svg>
  )
}
