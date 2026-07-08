import { useCallback, useRef, useState } from 'react'
import { useRoutingStore } from '../../stores/routingStore'
import { useUIStore } from '../../stores/uiStore'
import { getUIStatusText } from '../../config/statusDescriptions'
import { SourceIcon, FxIcon } from '../ui/DotMatrixIcons'

export function HorizontalCrossfader() {
  const { crossfaderPosition, setCrossfaderPosition } = useRoutingStore()
  const setStatusText = useUIStore((s) => s.setStatusText)
  const trackRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const [dragging, setDragging] = useState(false)
  const [hovered, setHovered] = useState(false)

  const updatePosition = useCallback((clientX: number) => {
    if (!trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const position = Math.max(0, Math.min(1, x / rect.width))
    setCrossfaderPosition(position)
  }, [setCrossfaderPosition])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true
    setDragging(true)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    updatePosition(e.clientX)
  }, [updatePosition])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return
    updatePosition(e.clientX)
  }, [updatePosition])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    isDragging.current = false
    setDragging(false)
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {}
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
  const nearCenter = Math.abs(crossfaderPosition - 0.5) < 0.02

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3">
        {/* Source icon (film frame) */}
        <button
          onClick={snapToSource}
          onMouseEnter={() => setStatusText(getUIStatusText('snapSource'))}
          onMouseLeave={() => setStatusText(null)}
          className="p-2 rounded-sm flex-shrink-0 press-physical"
          style={{
            color: crossfaderPosition < 0.5 ? 'var(--text-primary)' : 'var(--text-ghost)',
            backgroundColor: crossfaderPosition < 0.5 ? 'var(--accent-subtle)' : 'transparent',
            transition: 'transform var(--dur-instant) var(--ease-snap), color var(--dur-quick) var(--ease-out-expo), background-color var(--dur-quick) var(--ease-out-expo)',
          }}
          title="Source"
        >
          <SourceIcon size={14} />
        </button>

        {/* Crossfader track */}
        <div
          ref={trackRef}
          className="flex-1 h-7 relative cursor-pointer rounded-sm"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            cursor: dragging ? 'grabbing' : undefined,
            boxShadow: dragging ? 'inset 0 0 10px rgba(255,255,255,0.04)' : 'none',
            transition: 'box-shadow var(--dur-quick) var(--ease-out-expo)',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onMouseEnter={() => { setStatusText(getUIStatusText('crossfader')); setHovered(true) }}
          onMouseLeave={() => { setStatusText(null); setHovered(false) }}
        >
          {/* Center detent line — brightens when the thumb sits on it */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-2"
            style={{
              backgroundColor: nearCenter ? 'var(--accent)' : 'var(--border-emphasis)',
              boxShadow: nearCenter ? '0 0 4px var(--accent-glow)' : 'none',
              transition: 'background-color var(--dur-quick) var(--ease-out-expo), box-shadow var(--dur-quick) var(--ease-out-expo)',
            }}
          />

          {/* Thumb rail — transform-only positioning; snaps settle with spring */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              transform: `translateX(${thumbPosition}%)`,
              transition: dragging ? 'none' : 'transform var(--dur-settle) var(--ease-out-back)',
            }}
          >
            {/* Precise readout above thumb — revealed on hover/drag */}
            <div
              className="absolute text-center tabular-nums select-none"
              style={{
                left: -12,
                width: 24,
                top: -13,
                fontSize: 9,
                fontFamily: 'var(--font-mono)',
                color: dragging ? 'var(--accent)' : 'var(--text-secondary)',
                opacity: dragging || hovered ? 1 : 0,
                transition: 'opacity var(--dur-quick) var(--ease-out-expo), color var(--dur-quick) var(--ease-out-expo)',
              }}
            >
              {Math.round(crossfaderPosition * 100)}
            </div>
            {/* Thumb */}
            <div
              className="absolute top-1/2 rounded-sm"
              style={{
                width: 24,
                height: 28,
                left: -12,
                transform: `translateY(-50%) scale(${dragging ? 1.06 : 1})`,
                backgroundColor: 'var(--accent)',
                boxShadow: dragging
                  ? '0 0 14px var(--accent-glow), 0 0 5px var(--accent-glow)'
                  : '0 0 6px var(--accent-glow)',
                border: '1px solid rgba(255,255,255,0.15)',
                transition: 'transform var(--dur-settle) var(--ease-out-back), box-shadow var(--dur-quick) var(--ease-out-expo)',
              }}
            />
          </div>
        </div>

        {/* FX icon (sparkle/effects) */}
        <button
          onClick={snapToProcessed}
          onMouseEnter={() => setStatusText(getUIStatusText('snapProcessed'))}
          onMouseLeave={() => setStatusText(null)}
          className="p-2 rounded-sm flex-shrink-0 press-physical"
          style={{
            color: crossfaderPosition > 0.5 ? 'var(--text-primary)' : 'var(--text-ghost)',
            backgroundColor: crossfaderPosition > 0.5 ? 'var(--accent-subtle)' : 'transparent',
            transition: 'transform var(--dur-instant) var(--ease-snap), color var(--dur-quick) var(--ease-out-expo), background-color var(--dur-quick) var(--ease-out-expo)',
          }}
          title="Processed"
        >
          <FxIcon size={14} />
        </button>
      </div>
    </div>
  )
}
