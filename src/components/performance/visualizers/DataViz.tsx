interface DataVizProps {
  template: string
  fieldCount: number
}

export function DataViz({ template, fieldCount }: DataVizProps) {
  // Draw "Aa" text icon with field count indicator
  const templateColors: Record<string, string> = {
    watermark: '#60a5fa',
    statsBar: '#4ade80',
    titleCard: '#f97316',
    socialCard: '#a855f7',
  }

  const color = templateColors[template] || '#60a5fa'

  return (
    <svg width="80" height="24" viewBox="0 0 80 24" className="rounded">
      {/* "Aa" text representation */}
      <text
        x={20}
        y={18}
        fontSize={16}
        fontFamily="sans-serif"
        fontWeight="bold"
        fill={color}
        opacity={0.9}
      >
        Aa
      </text>

      {/* Field count indicator bars */}
      {Array.from({ length: Math.min(fieldCount, 4) }).map((_, i) => (
        <rect
          key={i}
          x={50 + i * 7}
          y={8}
          width={5}
          height={8}
          rx={1}
          fill={color}
          opacity={0.5 + i * 0.1}
        />
      ))}

      {/* Extra indicator if more than 4 fields */}
      {fieldCount > 4 && (
        <text
          x={78}
          y={16}
          fontSize={8}
          fontFamily="sans-serif"
          fill={color}
          opacity={0.7}
        >
          +
        </text>
      )}
    </svg>
  )
}
