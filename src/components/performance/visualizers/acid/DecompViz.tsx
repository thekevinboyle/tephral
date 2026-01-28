import type { ReactElement } from 'react'

interface DecompVizProps {
  minSize: number
  color: string
}

export function DecompViz({ minSize, color }: DecompVizProps) {
  const rects: ReactElement[] = []
  const size = Math.max(4, minSize / 4)

  // Create a quad-tree like pattern
  const subdivide = (x: number, y: number, w: number, h: number, depth: number) => {
    if (depth > 3 || w < size || h < size) {
      rects.push(
        <rect
          key={`${x}-${y}-${w}`}
          x={x + 0.5}
          y={y + 0.5}
          width={w - 1}
          height={h - 1}
          fill="none"
          stroke={color}
          strokeWidth={0.5}
          opacity={0.4 + Math.random() * 0.6}
        />
      )
      return
    }

    if (Math.random() > 0.5) {
      // Subdivide
      const hw = w / 2
      const hh = h / 2
      subdivide(x, y, hw, hh, depth + 1)
      subdivide(x + hw, y, hw, hh, depth + 1)
      subdivide(x, y + hh, hw, hh, depth + 1)
      subdivide(x + hw, y + hh, hw, hh, depth + 1)
    } else {
      rects.push(
        <rect
          key={`${x}-${y}-${w}`}
          x={x + 0.5}
          y={y + 0.5}
          width={w - 1}
          height={h - 1}
          fill="none"
          stroke={color}
          strokeWidth={0.5}
          opacity={0.5 + Math.random() * 0.5}
        />
      )
    }
  }

  subdivide(0, 0, 80, 24, 0)

  return (
    <svg width="80" height="24" viewBox="0 0 80 24" className="rounded">
      {rects}
    </svg>
  )
}
