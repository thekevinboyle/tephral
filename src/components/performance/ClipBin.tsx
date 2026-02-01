import { useState, useRef } from 'react'
import { useClipStore } from '../../stores/clipStore'
import { ClipBinPopover } from './ClipBinPopover'

export function ClipBin() {
  const clips = useClipStore((state) => state.clips)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const stackRef = useRef<HTMLDivElement>(null)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)

  const handleStackClick = () => {
    if (clips.length === 0) return
    if (stackRef.current) {
      setAnchorRect(stackRef.current.getBoundingClientRect())
    }
    setPopoverOpen(true)
  }

  const handleClosePopover = () => {
    setPopoverOpen(false)
  }

  // Card dimensions
  const cardWidth = 80
  const cardHeight = 48
  const offsetX = 4
  const offsetY = 6
  const maxVisibleCards = 4

  // Calculate visible clips for stack
  const visibleClips = clips.slice(0, maxVisibleCards)
  const extraCount = clips.length - maxVisibleCards

  // Stack dimensions (including offsets)
  const stackWidth = cardWidth + (Math.min(clips.length, maxVisibleCards) - 1) * offsetX
  const stackHeight = cardHeight + (Math.min(clips.length, maxVisibleCards) - 1) * offsetY

  // Hide if no clips
  if (clips.length === 0) {
    return null
  }

  return (
    <>
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          zIndex: 20,
        }}
      >
        {/* Stacked cards */}
        <div
          ref={stackRef}
          className="relative cursor-pointer transition-transform duration-150 hover:-translate-y-0.5"
          style={{
            width: stackWidth,
            height: stackHeight,
          }}
          onClick={handleStackClick}
        >
          {visibleClips.map((clip, index) => {
            // Reverse order so first clip is on top
            const reverseIndex = visibleClips.length - 1 - index
            const opacity = 1 - reverseIndex * 0.15

            return (
              <div
                key={clip.id}
                className="absolute rounded overflow-hidden"
                style={{
                  width: cardWidth,
                  height: cardHeight,
                  left: reverseIndex * offsetX,
                  top: reverseIndex * offsetY,
                  opacity,
                  zIndex: visibleClips.length - reverseIndex,
                  boxShadow: reverseIndex === 0
                    ? '0 4px 12px rgba(0, 0, 0, 0.4)'
                    : '0 2px 4px rgba(0, 0, 0, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <img
                  src={clip.thumbnailUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              </div>
            )
          })}

          {/* Extra count badge */}
          {extraCount > 0 && (
            <div
              className="absolute flex items-center justify-center rounded-full text-[10px] font-medium"
              style={{
                width: 20,
                height: 20,
                right: -6,
                top: -6,
                backgroundColor: '#FF6B6B',
                color: '#fff',
                zIndex: maxVisibleCards + 1,
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
              }}
            >
              +{extraCount}
            </div>
          )}

          {/* Hover glow effect */}
          <div
            className="absolute inset-0 rounded opacity-0 hover:opacity-100 transition-opacity pointer-events-none"
            style={{
              boxShadow: '0 0 20px rgba(255, 107, 107, 0.3)',
            }}
          />
        </div>
      </div>

      {/* Popover */}
      {popoverOpen && (
        <ClipBinPopover
          onClose={handleClosePopover}
          anchorRect={anchorRect}
        />
      )}
    </>
  )
}
