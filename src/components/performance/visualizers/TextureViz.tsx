interface TextureVizProps {
  opacity: number
  blendMode: string
}

export function TextureViz({ opacity, blendMode }: TextureVizProps) {
  // Draw a small grid pattern representing texture overlay
  const gridLines = []
  const gridOpacity = 0.3 + opacity * 0.5

  // Horizontal lines
  for (let i = 0; i < 6; i++) {
    const y = 4 + i * 4
    gridLines.push(
      <line
        key={`h${i}`}
        x1={4}
        y1={y}
        x2={76}
        y2={y}
        stroke="#a3a3a3"
        strokeWidth={0.5}
        opacity={gridOpacity}
      />
    )
  }

  // Vertical lines
  for (let i = 0; i < 10; i++) {
    const x = 4 + i * 8
    gridLines.push(
      <line
        key={`v${i}`}
        x1={x}
        y1={0}
        x2={x}
        y2={24}
        stroke="#a3a3a3"
        strokeWidth={0.5}
        opacity={gridOpacity}
      />
    )
  }

  // Blend mode indicator - small box in corner
  const modeColors: Record<string, string> = {
    multiply: '#f97316',
    screen: '#22c55e',
    overlay: '#3b82f6',
    softLight: '#a855f7',
  }

  return (
    <svg width="80" height="24" viewBox="0 0 80 24" className="rounded">
      {gridLines}
      {/* Noise dots for texture feel */}
      {Array.from({ length: 20 }).map((_, i) => (
        <circle
          key={`dot${i}`}
          cx={((i * 37) % 76) + 2}
          cy={((i * 19) % 22) + 1}
          r={0.5 + (i % 3) * 0.3}
          fill="#a3a3a3"
          opacity={0.2 + opacity * 0.3}
        />
      ))}
      {/* Blend mode indicator */}
      <rect
        x={64}
        y={2}
        width={12}
        height={6}
        rx={1}
        fill={modeColors[blendMode] || '#666'}
        opacity={0.8}
      />
    </svg>
  )
}
