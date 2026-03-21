import { useState, useCallback, useRef } from 'react'
import { useMediaStore } from '../../stores/mediaStore'
import { useMediaSource } from '../../hooks/useMediaSource'
import type { CropRegion } from '../../utils/screenCrop'

/**
 * Overlay on the canvas preview that lets the user draw a crop rectangle
 * when screen capture is active. Drag to define the region, double-click to reset.
 */
export function ScreenCropOverlay() {
  const source = useMediaStore((s) => s.source)
  const { cropScreenCapture, clearScreenCrop, screenSourceVideo } = useMediaSource()

  const containerRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const [start, setStart] = useState<{ x: number; y: number } | null>(null)
  const [end, setEnd] = useState<{ x: number; y: number } | null>(null)
  const [hasCrop, setHasCrop] = useState(false)

  if (source !== 'screen') return null

  const getNormalizedRect = (s: { x: number; y: number }, e: { x: number; y: number }) => ({
    x: Math.min(s.x, e.x),
    y: Math.min(s.y, e.y),
    w: Math.abs(e.x - s.x),
    h: Math.abs(e.y - s.y),
  })

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    setStart({ x, y })
    setEnd({ x, y })
    setDragging(true)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    setEnd({ x, y })
  }, [dragging])

  const handlePointerUp = useCallback(async () => {
    if (!start || !end || !screenSourceVideo) {
      setDragging(false)
      return
    }

    const sel = getNormalizedRect(start, end)

    // Ignore tiny drags (accidental clicks)
    if (sel.w < 0.05 || sel.h < 0.05) {
      setDragging(false)
      setStart(null)
      setEnd(null)
      return
    }

    // Convert normalized coords to source video pixel coords
    const vw = screenSourceVideo.videoWidth
    const vh = screenSourceVideo.videoHeight
    const crop: CropRegion = {
      x: Math.round(sel.x * vw),
      y: Math.round(sel.y * vh),
      w: Math.round(sel.w * vw),
      h: Math.round(sel.h * vh),
    }

    await cropScreenCapture(crop)
    setHasCrop(true)
    setDragging(false)
    setStart(null)
    setEnd(null)
  }, [start, end, screenSourceVideo, cropScreenCapture])

  const handleDoubleClick = useCallback(() => {
    clearScreenCrop()
    setHasCrop(false)
    setStart(null)
    setEnd(null)
  }, [clearScreenCrop])

  const sel = start && end ? getNormalizedRect(start, end) : null

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      style={{
        position: 'absolute',
        inset: 0,
        cursor: hasCrop ? 'default' : 'crosshair',
        zIndex: 50,
        touchAction: 'none',
      }}
    >
      {/* Selection rectangle while dragging */}
      {dragging && sel && sel.w > 0.01 && sel.h > 0.01 && (
        <div
          style={{
            position: 'absolute',
            left: `${sel.x * 100}%`,
            top: `${sel.y * 100}%`,
            width: `${sel.w * 100}%`,
            height: `${sel.h * 100}%`,
            border: '2px solid var(--accent)',
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Hint text */}
      {!hasCrop && !dragging && (
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            left: 0,
            right: 0,
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              fontSize: 9,
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
              backgroundColor: 'rgba(0,0,0,0.6)',
              padding: '3px 8px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            Drag to crop · Double-click to reset
          </span>
        </div>
      )}
    </div>
  )
}
