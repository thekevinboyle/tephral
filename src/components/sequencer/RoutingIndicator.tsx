import { useState, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useSequencerStore, type Routing } from '../../stores/sequencerStore'

interface RoutingIndicatorProps {
  routing: Routing
  trackColor: string
  trackName: string
}

export function RoutingIndicator({ routing, trackColor, trackName }: RoutingIndicatorProps) {
  const [showPopup, setShowPopup] = useState(false)
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const { updateRoutingDepth, removeRouting } = useSequencerStore()

  useEffect(() => {
    if (showPopup && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPopupPos({
        x: rect.left + rect.width / 2,
        y: rect.top - 8,
      })
    }
  }, [showPopup])

  // Close on click outside
  useEffect(() => {
    if (!showPopup) return
    const handleClick = (e: MouseEvent) => {
      // Don't close if clicking inside the popup
      if (popupRef.current && popupRef.current.contains(e.target as Node)) {
        return
      }
      setShowPopup(false)
    }
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClick)
    }, 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handleClick)
    }
  }, [showPopup])

  // Drag to adjust depth
  const isDragging = useRef(false)
  const hasDragged = useRef(false)
  const dragStartY = useRef(0)
  const dragStartDepth = useRef(0)

  const handleDragStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    isDragging.current = true
    hasDragged.current = false
    dragStartY.current = e.clientY
    dragStartDepth.current = routing.depth
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [routing.depth])

  const handleDragMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return
    e.stopPropagation()

    // Drag up = increase, drag down = decrease
    const deltaY = dragStartY.current - e.clientY

    // Only count as drag if moved more than 3px
    if (Math.abs(deltaY) > 3) {
      hasDragged.current = true
    }

    // 50px for full range (-1 to 1)
    const deltaDepth = deltaY / 50
    const newDepth = Math.max(-1, Math.min(1, dragStartDepth.current + deltaDepth))
    updateRoutingDepth(routing.id, newDepth)
  }, [routing.id, updateRoutingDepth])

  const handleDragEnd = useCallback((e: React.PointerEvent) => {
    isDragging.current = false
    try {
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {}
  }, [])

  const handleDepthChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateRoutingDepth(routing.id, parseFloat(e.target.value))
  }, [routing.id, updateRoutingDepth])

  const handleRemove = useCallback(() => {
    removeRouting(routing.id)
    setShowPopup(false)
  }, [routing.id, removeRouting])

  return (
    <div className="relative">
      {/* Small arc indicator - drag to adjust, click for popup */}
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation()
          // Only open popup if we weren't dragging
          if (!hasDragged.current) {
            setShowPopup(!showPopup)
          }
          hasDragged.current = false
        }}
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragEnd}
        className="w-4 h-4 rounded-full flex items-center justify-center transition-transform hover:scale-110 cursor-ns-resize"
        style={{
          backgroundColor: trackColor,
          boxShadow: `0 0 4px ${trackColor}`,
        }}
        title={`${trackName}: ${Math.round(routing.depth * 100)}% — Drag to adjust`}
      >
        {/* Arc visualization */}
        <svg width="12" height="12" viewBox="0 0 12 12">
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
            strokeDasharray={`${Math.abs(routing.depth) * 25} 100`}
            strokeDashoffset="0"
            transform="rotate(-90 6 6)"
          />
        </svg>
      </button>

      {/* Popup for editing - using portal to escape overflow:hidden */}
      {showPopup && createPortal(
        <div
          ref={popupRef}
          className="fixed z-[100] rounded-lg shadow-lg"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #d0d0d0',
            padding: '8px',
            minWidth: '140px',
            left: `${popupPos.x}px`,
            top: `${popupPos.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: trackColor }}
            />
            <span className="text-[10px] font-medium" style={{ color: '#333' }}>
              {trackName}
            </span>
          </div>

          {/* Depth slider */}
          <div className="mb-2">
            <div className="flex justify-between text-[9px] mb-1" style={{ color: '#999' }}>
              <span>Depth</span>
              <span>{Math.round(routing.depth * 100)}%</span>
            </div>
            <input
              type="range"
              min="-1"
              max="1"
              step="0.01"
              value={routing.depth}
              onChange={handleDepthChange}
              className="w-full h-2"
              style={{
                accentColor: trackColor,
              }}
            />
          </div>

          {/* Remove button */}
          <button
            onClick={handleRemove}
            className="w-full py-1 text-[9px] rounded"
            style={{
              backgroundColor: '#fff5f5',
              border: '1px solid #ffcccc',
              color: '#c44',
            }}
          >
            Remove
          </button>
        </div>,
        document.body
      )}
    </div>
  )
}

interface RoutingIndicatorsProps {
  effectId: string
}

export function RoutingIndicators({ effectId }: RoutingIndicatorsProps) {
  const { routings, tracks } = useSequencerStore()

  const effectRoutings = routings.filter(r => r.targetParam.startsWith(effectId))

  if (effectRoutings.length === 0) return null

  return (
    <div className="flex gap-1">
      {effectRoutings.map((routing) => {
        const track = tracks.find(t => t.id === routing.trackId)
        if (!track) return null

        return (
          <RoutingIndicator
            key={routing.id}
            routing={routing}
            trackColor={track.color}
            trackName={track.name}
          />
        )
      })}
    </div>
  )
}
