import { useCallback, useRef, useState } from 'react'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'

export function VerticalCrossfader() {
  const { wetMix, setWetMix } = useGlitchEngineStore()
  const trackRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const updateValueFromPointer = useCallback((clientY: number) => {
    if (!trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    const y = clientY - rect.top
    // Invert: top = 1 (wet), bottom = 0 (dry)
    const percentage = Math.max(0, Math.min(1, 1 - y / rect.height))
    setWetMix(percentage)
  }, [setWetMix])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    setIsDragging(true)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    updateValueFromPointer(e.clientY)
  }, [updateValueFromPointer])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (e.buttons === 0) return
    updateValueFromPointer(e.clientY)
  }, [updateValueFromPointer])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setIsDragging(false)
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {}
  }, [])

  // Constrain thumb position so it doesn't overlap labels
  // Map 0-100% to ~7%-93% of track height (half thumb height padding on each side)
  // Invert for CSS: 0% wetMix = bottom (93%), 100% wetMix = top (7%)
  const thumbPosition = 93 - wetMix * 86

  return (
    <div className="w-[40px] h-full flex flex-col items-center py-2">
      {/* WET label (top) */}
      <span
        className="text-[10px] font-medium select-none"
        style={{
          color: isDragging && wetMix >= 0.5 ? 'var(--text-primary)' : 'var(--text-muted)',
          transition: 'color var(--dur-quick) var(--ease-out-expo)',
        }}
      >
        Wet
      </span>

      {/* Fader track - entire area is draggable */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="flex-1 relative w-full flex justify-center cursor-pointer select-none touch-none"
        style={{ cursor: isDragging ? 'grabbing' : undefined }}
      >
        {/* Track background */}
        <div
          className="absolute w-[3px] rounded-full"
          style={{
            top: '7%',
            bottom: '7%',
            backgroundColor: isHovered || isDragging ? 'var(--border-emphasis)' : 'var(--border)',
            transition: 'background-color var(--dur-quick) var(--ease-out-expo)',
          }}
        />

        {/* Active track (fills from bottom) — scaleY so it moves liquid, settles with spring */}
        <div
          className="absolute w-[3px] rounded-full"
          style={{
            top: '7%',
            bottom: '7%',
            transformOrigin: 'bottom',
            transform: `scaleY(${wetMix})`,
            backgroundColor: isDragging ? 'var(--text-primary)' : 'var(--text-muted)',
            boxShadow: isDragging ? '0 0 6px var(--accent-glow)' : 'none',
            transition: isDragging
              ? 'background-color var(--dur-quick) var(--ease-out-expo), box-shadow var(--dur-quick) var(--ease-out-expo)'
              : 'transform var(--dur-settle) var(--ease-out-back), background-color var(--dur-quick) var(--ease-out-expo), box-shadow var(--dur-quick) var(--ease-out-expo)',
          }}
        />

        {/* Thumb rail — transform-only positioning */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            transform: `translateY(${thumbPosition}%)`,
            transition: isDragging ? 'none' : 'transform var(--dur-settle) var(--ease-out-back)',
          }}
        >
          {/* Thumb — doubles as precise readout on hover/drag */}
          <div
            className="absolute left-1/2 top-0 w-[40px] h-[14px] rounded flex items-center justify-center"
            style={{
              transform: `translate(-50%, -50%) scale(${isDragging ? 1.06 : 1})`,
              backgroundColor: 'var(--bg-surface)',
              border: `1px solid ${isDragging ? 'var(--border-emphasis)' : 'var(--border)'}`,
              boxShadow: isDragging
                ? '0 0 10px var(--accent-glow), 0 2px 6px rgba(0,0,0,0.15)'
                : '0 2px 6px rgba(0,0,0,0.15)',
              transition: 'transform var(--dur-settle) var(--ease-out-back), box-shadow var(--dur-quick) var(--ease-out-expo), border-color var(--dur-quick) var(--ease-out-expo)',
            }}
          >
            <span
              className="tabular-nums select-none leading-none"
              style={{
                fontSize: 8,
                fontFamily: 'var(--font-mono)',
                color: isDragging ? 'var(--accent)' : 'var(--text-secondary)',
                opacity: isDragging || isHovered ? 1 : 0,
                transition: 'opacity var(--dur-quick) var(--ease-out-expo), color var(--dur-quick) var(--ease-out-expo)',
              }}
            >
              {Math.round(wetMix * 100)}
            </span>
          </div>
        </div>
      </div>

      {/* DRY label (bottom) */}
      <span
        className="text-[10px] font-medium select-none"
        style={{
          color: isDragging && wetMix < 0.5 ? 'var(--text-primary)' : 'var(--text-muted)',
          transition: 'color var(--dur-quick) var(--ease-out-expo)',
        }}
      >
        Dry
      </span>
    </div>
  )
}
