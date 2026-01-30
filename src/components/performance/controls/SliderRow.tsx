import { useState, useCallback, useRef } from 'react'
import { useUIStore } from '../../../stores/uiStore'
import { useSequencerStore } from '../../../stores/sequencerStore'

interface SliderRowProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  format?: (value: number) => string
  paramId?: string  // e.g., 'rgb_split.amount' for routing
}

const DOT_COUNT = 7 // Number of dots to show on the track

export function SliderRow({
  label,
  value,
  min,
  max,
  step = 0.01,
  onChange,
  format,
  paramId,
}: SliderRowProps) {
  const displayValue = format ? format(value) : value.toFixed(1)
  const { sequencerDrag } = useUIStore()
  const { addRouting, routings, tracks, updateRoutingDepth, removeRouting } = useSequencerStore()
  const [isDropTarget, setIsDropTarget] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)
  const [isDraggingSlider, setIsDraggingSlider] = useState(false)

  // Check if this param has routings
  const paramRoutings = paramId ? routings.filter(r => r.targetParam === paramId) : []
  const hasRouting = paramRoutings.length > 0
  const firstRouting = hasRouting ? paramRoutings[0] : null
  const routingTrack = firstRouting ? tracks.find(t => t.id === firstRouting.trackId) : null

  // Calculate thumb position (0-1)
  const normalizedValue = (value - min) / (max - min)

  const handleDragOver = (e: React.DragEvent) => {
    if (paramId && (sequencerDrag.isDragging || e.dataTransfer.types.includes('sequencer-track'))) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'link'
      setIsDropTarget(true)
    }
  }

  const handleDragLeave = () => {
    setIsDropTarget(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const trackId = e.dataTransfer.getData('sequencer-track')
    if (trackId && paramId) {
      const existingRouting = routings.find(r => r.trackId === trackId && r.targetParam === paramId)
      if (!existingRouting) {
        addRouting(trackId, paramId, 0.5)
      }
    }
    setIsDropTarget(false)
  }

  // Slider interaction
  const updateValueFromPosition = useCallback((clientX: number) => {
    if (!trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    const padding = 12 // Account for thumb radius
    const trackWidth = rect.width - padding * 2
    const x = Math.max(0, Math.min(trackWidth, clientX - rect.left - padding))
    const ratio = x / trackWidth
    let newValue = min + ratio * (max - min)

    // Snap to step
    newValue = Math.round(newValue / step) * step
    newValue = Math.max(min, Math.min(max, newValue))

    onChange(newValue)
  }, [min, max, step, onChange])

  const handleTrackPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    setIsDraggingSlider(true)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    updateValueFromPosition(e.clientX)
  }, [updateValueFromPosition])

  const handleTrackPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingSlider) return
    updateValueFromPosition(e.clientX)
  }, [isDraggingSlider, updateValueFromPosition])

  const handleTrackPointerUp = useCallback((e: React.PointerEvent) => {
    setIsDraggingSlider(false)
    try {
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {}
  }, [])

  // Routing indicator drag
  const isDraggingDepth = useRef(false)
  const dragStartY = useRef(0)
  const dragStartDepth = useRef(0)

  const handleIndicatorPointerDown = useCallback((e: React.PointerEvent) => {
    if (!firstRouting) return
    e.preventDefault()
    e.stopPropagation()
    isDraggingDepth.current = true
    dragStartY.current = e.clientY
    dragStartDepth.current = firstRouting.depth
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [firstRouting])

  const handleIndicatorPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingDepth.current || !firstRouting) return
    e.stopPropagation()
    const deltaY = dragStartY.current - e.clientY
    const deltaDepth = deltaY / 50
    const newDepth = Math.max(-1, Math.min(1, dragStartDepth.current + deltaDepth))
    updateRoutingDepth(firstRouting.id, newDepth)
  }, [firstRouting, updateRoutingDepth])

  const handleIndicatorPointerUp = useCallback((e: React.PointerEvent) => {
    isDraggingDepth.current = false
    try {
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {}
  }, [])

  const handleIndicatorDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (firstRouting) {
      removeRouting(firstRouting.id)
    }
  }, [firstRouting, removeRouting])

  return (
    <div
      className="flex items-center gap-2 py-1.5 rounded transition-colors"
      style={{
        backgroundColor: isDropTarget ? `${sequencerDrag.trackColor}20` : undefined,
        outline: isDropTarget ? `2px solid ${sequencerDrag.trackColor}` : undefined,
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <span className="text-[14px] text-gray-500 w-20 shrink-0 flex items-center gap-1">
        {hasRouting && firstRouting && routingTrack && (
          <span
            className="w-3 h-3 flex-shrink-0 cursor-ns-resize hover:scale-110 transition-transform flex items-center justify-center rounded-full"
            style={{
              backgroundColor: routingTrack.color,
              boxShadow: `0 0 4px ${routingTrack.color}`,
            }}
            title={`${routingTrack.name}: ${Math.round(firstRouting.depth * 100)}% — Drag to adjust, double-click to remove`}
            onPointerDown={handleIndicatorPointerDown}
            onPointerMove={handleIndicatorPointerMove}
            onPointerUp={handleIndicatorPointerUp}
            onPointerCancel={handleIndicatorPointerUp}
            onDoubleClick={handleIndicatorDoubleClick}
          >
            <svg width="10" height="10" viewBox="0 0 12 12">
              <circle cx="6" cy="6" r="4" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
              <circle
                cx="6" cy="6" r="4" fill="none" stroke="white" strokeWidth="2"
                strokeDasharray={`${Math.abs(firstRouting.depth) * 25} 100`}
                strokeDashoffset="0" transform="rotate(-90 6 6)"
              />
            </svg>
          </span>
        )}
        {label}
      </span>

      {/* Custom dot slider */}
      <div
        ref={trackRef}
        className="flex-1 h-7 bg-gray-100 rounded-full border border-gray-200 relative cursor-pointer select-none shadow-inner"
        onPointerDown={handleTrackPointerDown}
        onPointerMove={handleTrackPointerMove}
        onPointerUp={handleTrackPointerUp}
        onPointerCancel={handleTrackPointerUp}
      >
        {/* Track fill */}
        <div
          className="absolute left-1 top-1 bottom-1 rounded-full bg-gradient-to-r from-gray-200 to-gray-100 pointer-events-none"
          style={{ width: `calc((100% - 8px) * ${normalizedValue})` }}
        />

        {/* Dot markers */}
        <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none">
          {Array.from({ length: DOT_COUNT }).map((_, i) => {
            const dotPosition = i / (DOT_COUNT - 1)
            const isBeforeThumb = dotPosition <= normalizedValue
            return (
              <div
                key={i}
                className={`w-1 h-1 rounded-full transition-colors ${
                  isBeforeThumb ? 'bg-gray-400' : 'bg-gray-300'
                }`}
              />
            )
          })}
        </div>

        {/* Thumb */}
        <div
          className="absolute top-1/2 w-5 h-5 rounded-full bg-white border-2 border-gray-300 shadow-md pointer-events-none transition-shadow"
          style={{
            left: `calc(10px + (100% - 20px) * ${normalizedValue})`,
            transform: `translate(-50%, -50%)`,
            boxShadow: isDraggingSlider
              ? '0 2px 8px rgba(0,0,0,0.15), 0 0 0 3px rgba(156,163,175,0.2)'
              : '0 1px 3px rgba(0,0,0,0.1)',
          }}
        />
      </div>

      <span className="text-[14px] text-gray-600 w-10 text-right tabular-nums">
        {displayValue}
      </span>
    </div>
  )
}
