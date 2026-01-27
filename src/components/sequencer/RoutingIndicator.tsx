import { useState, useCallback } from 'react'
import { useSequencerStore, type Routing } from '../../stores/sequencerStore'

interface RoutingIndicatorProps {
  routing: Routing
  trackColor: string
  trackName: string
}

export function RoutingIndicator({ routing, trackColor, trackName }: RoutingIndicatorProps) {
  const [showPopup, setShowPopup] = useState(false)
  const { updateRoutingDepth, removeRouting } = useSequencerStore()

  const handleDepthChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateRoutingDepth(routing.id, parseFloat(e.target.value))
  }, [routing.id, updateRoutingDepth])

  const handleRemove = useCallback(() => {
    removeRouting(routing.id)
    setShowPopup(false)
  }, [routing.id, removeRouting])

  return (
    <div className="relative">
      {/* Small arc indicator */}
      <button
        onClick={() => setShowPopup(!showPopup)}
        className="w-4 h-4 rounded-full flex items-center justify-center transition-transform hover:scale-110"
        style={{
          backgroundColor: trackColor,
          boxShadow: `0 0 4px ${trackColor}`,
        }}
        title={`${trackName}: ${Math.round(routing.depth * 100)}%`}
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

      {/* Popup for editing */}
      {showPopup && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 rounded-lg shadow-lg"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #d0d0d0',
            padding: '8px',
            minWidth: '140px',
          }}
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
        </div>
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
