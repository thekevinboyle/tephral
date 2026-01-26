interface RGBSplitVizProps {
  amount: number
  redOffsetX: number
  color?: string
}

export function RGBSplitViz({ amount }: RGBSplitVizProps) {
  const offset = Math.min(amount * 0.3, 8)

  return (
    <svg width="80" height="24" viewBox="0 0 80 24" className="rounded">
      {/* Red bar */}
      <rect
        x={24 - offset}
        y={4}
        width={32}
        height={16}
        fill="#ff0040"
        opacity={0.7}
      />
      {/* Green bar */}
      <rect
        x={24}
        y={4}
        width={32}
        height={16}
        fill="#00ff40"
        opacity={0.7}
      />
      {/* Blue bar */}
      <rect
        x={24 + offset}
        y={4}
        width={32}
        height={16}
        fill="#0080ff"
        opacity={0.7}
      />
    </svg>
  )
}
