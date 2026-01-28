interface GlyphVizProps {
  fontSize: number
  color: string
}

export function GlyphViz({ fontSize, color }: GlyphVizProps) {
  const chars = '0123456789ABCDEF@#$%'
  const size = Math.max(6, fontSize * 0.6)
  const cols = Math.floor(80 / size)
  const rows = Math.floor(24 / size)

  const glyphs = []
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const char = chars[Math.floor(Math.random() * chars.length)]
      const opacity = 0.3 + Math.random() * 0.7
      glyphs.push(
        <text
          key={`${x}-${y}`}
          x={x * size + size / 2}
          y={y * size + size * 0.8}
          fontSize={size * 0.8}
          fill={color}
          opacity={opacity}
          textAnchor="middle"
          fontFamily="monospace"
        >
          {char}
        </text>
      )
    }
  }

  return (
    <svg width="80" height="24" viewBox="0 0 80 24" className="rounded">
      {glyphs}
    </svg>
  )
}
