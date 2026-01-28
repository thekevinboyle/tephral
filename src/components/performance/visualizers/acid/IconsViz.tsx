interface IconsVizProps {
  iconSize: number
  color: string
}

export function IconsViz({ iconSize, color }: IconsVizProps) {
  const size = Math.max(8, iconSize * 0.4)
  const cols = Math.floor(80 / size)
  const rows = Math.floor(24 / size)

  const icons = []
  const shapes = ['circle', 'rect', 'triangle']

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const shape = shapes[Math.floor(Math.random() * shapes.length)]
      const cx = x * size + size / 2
      const cy = y * size + size / 2
      const r = size * 0.35
      const opacity = 0.4 + Math.random() * 0.6

      if (shape === 'circle') {
        icons.push(
          <circle key={`${x}-${y}`} cx={cx} cy={cy} r={r} fill={color} opacity={opacity} />
        )
      } else if (shape === 'rect') {
        icons.push(
          <rect
            key={`${x}-${y}`}
            x={cx - r}
            y={cy - r}
            width={r * 2}
            height={r * 2}
            fill={color}
            opacity={opacity}
          />
        )
      } else {
        icons.push(
          <polygon
            key={`${x}-${y}`}
            points={`${cx},${cy - r} ${cx + r},${cy + r} ${cx - r},${cy + r}`}
            fill={color}
            opacity={opacity}
          />
        )
      }
    }
  }

  return (
    <svg width="80" height="24" viewBox="0 0 80 24" className="rounded">
      {icons}
    </svg>
  )
}
