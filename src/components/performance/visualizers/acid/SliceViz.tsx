interface SliceVizProps {
  sliceCount: number
  color: string
}

export function SliceViz({ sliceCount, color }: SliceVizProps) {
  const slices = []
  const numSlices = Math.max(4, Math.min(20, sliceCount / 2))
  const sliceHeight = 24 / numSlices

  for (let i = 0; i < numSlices; i++) {
    const offset = (Math.sin(i * 0.8) * 10) + (Math.random() - 0.5) * 4
    const y = i * sliceHeight

    slices.push(
      <rect
        key={i}
        x={20 + offset}
        y={y}
        width={40}
        height={sliceHeight - 0.5}
        fill={color}
        opacity={0.3 + (i % 3) * 0.2}
      />
    )
  }

  return (
    <svg width="80" height="24" viewBox="0 0 80 24" className="rounded">
      {slices}
    </svg>
  )
}
