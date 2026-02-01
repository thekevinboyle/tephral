import { useCallback, useRef } from 'react'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'

export function VerticalCrossfader() {
  const { wetMix, setWetMix } = useGlitchEngineStore()
  const trackRef = useRef<HTMLDivElement>(null)

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
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    updateValueFromPointer(e.clientY)
  }, [updateValueFromPointer])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (e.buttons === 0) return
    updateValueFromPointer(e.clientY)
  }, [updateValueFromPointer])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
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
      <span className="text-[10px] font-medium select-none" style={{ color: 'var(--text-muted)' }}>
        Wet
      </span>

      {/* Fader track - entire area is draggable */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="flex-1 relative w-full flex justify-center cursor-pointer select-none touch-none"
      >
        {/* Track background */}
        <div
          className="absolute w-[3px] rounded-full"
          style={{ top: '7%', bottom: '7%', backgroundColor: 'var(--border)' }}
        />

        {/* Active track (fills from bottom) */}
        <div
          className="absolute w-[3px] rounded-full"
          style={{
            bottom: '7%',
            height: `${wetMix * 86}%`,
            backgroundColor: 'var(--text-muted)',
          }}
        />

        {/* Thumb */}
        <div
          className="absolute w-[40px] h-[14px] -translate-y-1/2 pointer-events-none rounded"
          style={{
            top: `${thumbPosition}%`,
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
          }}
        />
      </div>

      {/* DRY label (bottom) */}
      <span className="text-[10px] font-medium select-none" style={{ color: 'var(--text-muted)' }}>
        Dry
      </span>
    </div>
  )
}
