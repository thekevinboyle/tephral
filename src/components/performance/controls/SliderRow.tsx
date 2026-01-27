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

  // Check if this param has routings
  const paramRoutings = paramId ? routings.filter(r => r.targetParam === paramId) : []
  const hasRouting = paramRoutings.length > 0
  const firstRouting = hasRouting ? paramRoutings[0] : null
  const routingTrack = firstRouting ? tracks.find(t => t.id === firstRouting.trackId) : null

  const handleDragOver = (e: React.DragEvent) => {
    // Allow drop if we have a paramId - check dataTransfer for sequencer track data
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
      // Check if this exact routing already exists (same track to same param)
      const existingRouting = routings.find(r => r.trackId === trackId && r.targetParam === paramId)
      if (!existingRouting) {
        addRouting(trackId, paramId, 0.5)
      }
    }
    setIsDropTarget(false)
  }

  // Drag to adjust depth on routing indicator
  const isDragging = useRef(false)
  const dragStartY = useRef(0)
  const dragStartDepth = useRef(0)

  const handleIndicatorPointerDown = useCallback((e: React.PointerEvent) => {
    if (!firstRouting) return
    e.preventDefault()
    e.stopPropagation()
    isDragging.current = true
    dragStartY.current = e.clientY
    dragStartDepth.current = firstRouting.depth
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [firstRouting])

  const handleIndicatorPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current || !firstRouting) return
    e.stopPropagation()
    const deltaY = dragStartY.current - e.clientY
    const deltaDepth = deltaY / 50
    const newDepth = Math.max(-1, Math.min(1, dragStartDepth.current + deltaDepth))
    updateRoutingDepth(firstRouting.id, newDepth)
  }, [firstRouting, updateRoutingDepth])

  const handleIndicatorPointerUp = useCallback((e: React.PointerEvent) => {
    isDragging.current = false
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
      <span className="text-[11px] text-gray-500 w-20 shrink-0 flex items-center gap-1">
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
              <circle
                cx="6"
                cy="6"
                r="4"
                fill="none"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="2"
              />
              <circle
                cx="6"
                cy="6"
                r="4"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeDasharray={`${Math.abs(firstRouting.depth) * 25} 100`}
                strokeDashoffset="0"
                transform="rotate(-90 6 6)"
              />
            </svg>
          </span>
        )}
        {label}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1 accent-gray-700 cursor-pointer"
      />
      <span className="text-[11px] text-gray-600 w-10 text-right tabular-nums">
        {displayValue}
      </span>
    </div>
  )
}
