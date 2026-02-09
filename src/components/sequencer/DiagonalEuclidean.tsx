import { useRef, useState, useEffect } from 'react'
import { DiagonalCascade } from './DiagonalCascade'
import { TrackStrips } from './TrackStrips'

export function DiagonalEuclidean() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 400, height: 200 })

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setDimensions({ width: rect.width, height: rect.height })
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  return (
    <div className="flex flex-col h-full w-full" style={{ backgroundColor: 'var(--bg-surface)' }}>
      {/* Header */}
      <div
        className="px-3 py-1.5 flex items-center"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div
          className="w-1.5 h-1.5 rounded-full mr-2"
          style={{ backgroundColor: '#E8E4D9', boxShadow: '0 0 6px rgba(232, 228, 217, 0.5)' }}
        />
        <span
          className="text-[9px] font-medium uppercase tracking-widest"
          style={{ color: '#E8E4D9' }}
        >
          Euclidean
        </span>
      </div>

      {/* Diagonal cascade visualization (70%) */}
      <div ref={containerRef} className="flex-[7] min-h-0 overflow-hidden">
        <DiagonalCascade width={dimensions.width} height={dimensions.height} />
      </div>

      {/* Track strips (30%) */}
      <div
        className="flex-[3] min-h-0 overflow-y-auto"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <TrackStrips />
      </div>
    </div>
  )
}
