import { useCallback, useRef } from 'react'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'

export function MixControls() {
  const { wetMix, setWetMix } = useGlitchEngineStore()
  const trackRef = useRef<HTMLDivElement>(null)

  const updateValueFromPointer = useCallback((clientX: number) => {
    if (!trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const percentage = Math.max(0, Math.min(1, x / rect.width))
    setWetMix(percentage)
  }, [setWetMix])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    updateValueFromPointer(e.clientX)
  }, [updateValueFromPointer])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (e.buttons === 0) return
    updateValueFromPointer(e.clientX)
  }, [updateValueFromPointer])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {}
  }, [])

  // Constrain thumb position so it doesn't overlap labels
  // Map 0-100% to ~7%-93% of track width (half thumb width padding on each side)
  const thumbPosition = 7 + wetMix * 86

  return (
    <div
      className="h-full flex flex-col justify-center px-4 py-2"
      style={{ backgroundColor: 'var(--bg-surface)' }}
    >
      {/* Crossfader row */}
      <div className="flex items-center gap-4 select-none">
        {/* DRY label */}
        <span className="text-[12px] font-medium" style={{ color: 'var(--text-muted)' }}>
          Dry
        </span>

        {/* Fader track - entire area is draggable */}
        <div
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="flex-1 relative h-12 flex items-center cursor-pointer select-none touch-none"
        >
          {/* Track background */}
          <div
            className="absolute h-3 rounded-full"
            style={{ left: '7%', right: '7%', backgroundColor: 'var(--border)' }}
          />

          {/* Active track */}
          <div
            className="absolute h-3 rounded-full"
            style={{
              left: '7%',
              width: `${wetMix * 86}%`,
              backgroundColor: 'var(--text-muted)',
            }}
          />

          {/* Thumb */}
          <div
            className="absolute h-10 w-14 -translate-x-1/2 pointer-events-none rounded-lg"
            style={{
              left: `${thumbPosition}%`,
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            }}
          />
        </div>

        {/* WET label */}
        <span className="text-[12px] font-medium" style={{ color: 'var(--text-muted)' }}>
          Wet
        </span>
      </div>
    </div>
  )
}
