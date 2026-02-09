import { useCallback, useRef } from 'react'
import { useRoutingStore } from '../../stores/routingStore'
import { SourceIcon, FxIcon } from '../ui/DotMatrixIcons'

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
    <div className="px-4 py-3">
      <div className="flex items-center gap-3">
        {/* Source icon (film frame) */}
        <button
          onClick={snapToSource}
          className="p-2 rounded-sm transition-colors flex-shrink-0"
          style={{
            color: crossfaderPosition < 0.5 ? 'var(--text-primary)' : 'var(--text-ghost)',
            backgroundColor: crossfaderPosition < 0.5 ? 'var(--accent-subtle)' : 'transparent',
          }}
          title="Source"
        >
          <SourceIcon size={14} />
        </button>

        {/* Crossfader track */}
        <div
          ref={trackRef}
          className="flex-1 h-5 relative cursor-pointer rounded-sm"
          style={{ backgroundColor: 'var(--bg-elevated)' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* Center line */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-2"
            style={{ backgroundColor: 'var(--border-emphasis)' }}
          />

          {/* Thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-sm transition-shadow"
            style={{
              left: `calc(${thumbPosition}% - 6px)`,
              backgroundColor: 'var(--accent)',
              boxShadow: '0 0 6px var(--accent-glow)',
            }}
          />
        </div>

        {/* FX icon (sparkle/effects) */}
        <button
          onClick={snapToProcessed}
          className="p-2 rounded-sm transition-colors flex-shrink-0"
          style={{
            color: crossfaderPosition > 0.5 ? 'var(--text-primary)' : 'var(--text-ghost)',
            backgroundColor: crossfaderPosition > 0.5 ? 'var(--accent-subtle)' : 'transparent',
          }}
          title="Processed"
        >
          <FxIcon size={14} />
        </button>
      </div>
    </div>
  )
}
