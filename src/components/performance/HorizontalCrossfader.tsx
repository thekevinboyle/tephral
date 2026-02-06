import { useCallback, useRef } from 'react'
import { useRoutingStore } from '../../stores/routingStore'

export function HorizontalCrossfader() {
  const { crossfaderPosition, setCrossfaderPosition } = useRoutingStore()
  const trackRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  const updatePosition = useCallback((clientX: number) => {
    if (!trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const position = Math.max(0, Math.min(1, x / rect.width))
    setCrossfaderPosition(position)
  }, [setCrossfaderPosition])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    updatePosition(e.clientX)
  }, [updatePosition])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return
    updatePosition(e.clientX)
  }, [updatePosition])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    isDragging.current = false
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
  }, [])

  // Snap to source (0)
  const snapToSource = useCallback(() => {
    setCrossfaderPosition(0)
  }, [setCrossfaderPosition])

  // Snap to processed (1)
  const snapToProcessed = useCallback(() => {
    setCrossfaderPosition(1)
  }, [setCrossfaderPosition])

  const thumbPosition = crossfaderPosition * 100

  return (
    <div className="px-3 py-3">
      <div className="flex items-center gap-2">
        {/* Source icon (video camera) */}
        <button
          onClick={snapToSource}
          className="p-1.5 rounded transition-colors"
          style={{
            color: crossfaderPosition < 0.5 ? '#10b981' : 'var(--text-muted)',
            backgroundColor: crossfaderPosition < 0.5 ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
          }}
          title="Source"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 7l-7 5 7 5V7z" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
        </button>

        {/* Crossfader track */}
        <div
          ref={trackRef}
          className="flex-1 h-6 relative cursor-pointer rounded-full"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* Fill from left to thumb */}
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all"
            style={{
              width: `${thumbPosition}%`,
              background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.3), rgba(99, 102, 241, 0.3))',
            }}
          />

          {/* Center line */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-3"
            style={{ backgroundColor: 'var(--border)' }}
          />

          {/* Thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full shadow-md transition-shadow"
            style={{
              left: `calc(${thumbPosition}% - 8px)`,
              backgroundColor: crossfaderPosition < 0.5 ? '#10b981' : '#6366f1',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            }}
          />
        </div>

        {/* Processed icon (waveform/effects) */}
        <button
          onClick={snapToProcessed}
          className="p-1.5 rounded transition-colors"
          style={{
            color: crossfaderPosition > 0.5 ? '#6366f1' : 'var(--text-muted)',
            backgroundColor: crossfaderPosition > 0.5 ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
          }}
          title="Processed"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 12h4l3-9 4 18 3-9h4" />
          </svg>
        </button>
      </div>
    </div>
  )
}
