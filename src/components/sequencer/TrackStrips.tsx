import { useEffect } from 'react'
import { usePolyEuclidStore } from '../../stores/polyEuclidStore'
import { useSequencerStore } from '../../stores/sequencerStore'
import { SendIcon } from '../ui/DotMatrixIcons'

const CLOCK_DIVIDERS = [
  { label: '/4', value: 0.25 },
  { label: '/2', value: 0.5 },
  { label: '1x', value: 1 },
  { label: '2x', value: 2 },
  { label: '4x', value: 4 },
]

// Color for polyEuclid routing (matches slicer accent)
const POLY_EUCLID_COLOR = '#FF0055'

export function TrackStrips() {
  const { tracks, maxTracks, addTrack, removeTrack, updateTrack, getPattern, assigningTrack, toggleAssignmentMode, setAssigningTrack } = usePolyEuclidStore()
  const { routings, isPlaying } = useSequencerStore()

  // ESC key to cancel assignment mode
  useEffect(() => {
    if (!assigningTrack) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAssigningTrack(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [assigningTrack, setAssigningTrack])

  const cycleClockDivider = (trackId: string, current: number) => {
    const currentIndex = CLOCK_DIVIDERS.findIndex(d => d.value === current)
    const nextIndex = (currentIndex + 1) % CLOCK_DIVIDERS.length
    updateTrack(trackId, { clockDivider: CLOCK_DIVIDERS[nextIndex].value })
  }

  const handleDrag = (
    trackId: string,
    param: 'steps' | 'hits' | 'rotation' | 'decay',
    startY: number,
    startValue: number
  ) => {
    const handleMove = (e: MouseEvent) => {
      const deltaY = startY - e.clientY
      let newValue: number

      if (param === 'decay') {
        newValue = startValue + deltaY / 100
      } else {
        newValue = Math.round(startValue + deltaY / 15)
      }

      updateTrack(trackId, { [param]: newValue })
    }

    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }

  const handleRouteDragStart = (trackId: string, e: React.DragEvent) => {
    e.dataTransfer.setData('sequencer-track', `polyEuclid-${trackId}`)
    e.dataTransfer.effectAllowed = 'link'
  }

  return (
    <div className="flex flex-col" style={{ fontFamily: 'var(--font-mono, monospace)' }}>
      {tracks.map((track, index) => {
        const pattern = getPattern(track.id)
        const divLabel = CLOCK_DIVIDERS.find(d => d.value === track.clockDivider)?.label || '1x'

        return (
          <div
            key={track.id}
            className="flex items-center gap-3 px-3 py-1.5"
            style={{
              borderBottom: '1px solid var(--border)',
              opacity: track.muted ? 0.5 : 1,
              backgroundColor: track.muted ? 'transparent' : 'rgba(255, 255, 255, 0.02)',
            }}
          >
            {/* Track number / mute toggle */}
            <button
              className="text-[11px] font-bold uppercase"
              style={{ color: track.muted ? 'var(--danger)' : 'var(--text-primary)' }}
              onClick={() => updateTrack(track.id, { muted: !track.muted })}
            >
              T{index + 1}
            </button>

            {/* Steps */}
            <div
              className="text-[11px] cursor-ns-resize select-none"
              style={{ color: 'var(--text-secondary)' }}
              onMouseDown={(e) => handleDrag(track.id, 'steps', e.clientY, track.steps)}
            >
              <span style={{ opacity: 0.6 }}>STP</span> <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{String(track.steps).padStart(2, '0')}</span>
            </div>

            {/* Hits */}
            <div
              className="text-[11px] cursor-ns-resize select-none"
              style={{ color: 'var(--text-secondary)' }}
              onMouseDown={(e) => handleDrag(track.id, 'hits', e.clientY, track.hits)}
            >
              <span style={{ opacity: 0.6 }}>HIT</span> <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{String(track.hits).padStart(2, '0')}</span>
            </div>

            {/* Rotation */}
            <div
              className="text-[11px] cursor-ns-resize select-none"
              style={{ color: 'var(--text-secondary)' }}
              onMouseDown={(e) => handleDrag(track.id, 'rotation', e.clientY, track.rotation)}
            >
              <span style={{ opacity: 0.6 }}>ROT</span> <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{track.rotation >= 0 ? '+' : ''}{track.rotation}</span>
            </div>

            {/* Clock divider */}
            <button
              className="text-[11px] font-bold px-1.5 py-0.5 rounded-sm"
              style={{ color: 'var(--text-primary)', backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
              onClick={() => cycleClockDivider(track.id, track.clockDivider)}
            >
              {divLabel}
            </button>

            {/* Decay */}
            <div
              className="text-[11px] cursor-ns-resize select-none"
              style={{ color: 'var(--text-secondary)' }}
              onMouseDown={(e) => handleDrag(track.id, 'decay', e.clientY, track.decay)}
            >
              <span style={{ opacity: 0.6 }}>DCY</span> <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{track.decay.toFixed(1)}</span>
            </div>

            {/* Route button - click to enter assignment mode */}
            {(() => {
              const trackRouteId = `polyEuclid-${track.id}`
              const routeCount = routings.filter(r => r.trackId === trackRouteId).length
              const isAssigning = assigningTrack === track.id
              const isActive = isPlaying && routeCount > 0 && !track.muted

              return (
                <>
                  <button
                    className="w-5 h-5 rounded-sm flex items-center justify-center transition-all hover:scale-110"
                    style={{
                      backgroundColor: isAssigning ? POLY_EUCLID_COLOR : 'transparent',
                      boxShadow: isAssigning
                        ? `0 0 8px ${POLY_EUCLID_COLOR}`
                        : isActive
                          ? `0 0 4px ${POLY_EUCLID_COLOR}40`
                          : 'none',
                      animation: isActive ? 'pulse-route 1.5s ease-in-out infinite' : 'none',
                    }}
                    onClick={() => toggleAssignmentMode(track.id)}
                    title={isAssigning ? 'Click parameter to route (ESC to cancel)' : 'Click to route to parameters'}
                  >
                    <SendIcon
                      size={12}
                      color={isAssigning ? 'var(--bg-primary)' : isActive ? POLY_EUCLID_COLOR : 'var(--text-ghost)'}
                    />
                  </button>
                  {routeCount > 0 && (
                    <span
                      className="text-[10px] font-bold"
                      style={{
                        color: POLY_EUCLID_COLOR,
                        opacity: isActive ? 1 : 0.6,
                      }}
                    >
                      {routeCount}
                    </span>
                  )}
                </>
              )
            })()}

            {/* Mini pattern preview */}
            <div className="flex gap-[2px] ml-auto">
              {pattern.map((hit, i) => (
                <div
                  key={i}
                  className="w-[5px] h-[10px]"
                  style={{
                    backgroundColor: hit ? 'var(--text-primary)' : 'transparent',
                    border: hit ? 'none' : '1px solid rgba(255, 255, 255, 0.2)',
                    opacity: i === track.currentStep ? 1 : 0.5,
                  }}
                />
              ))}
            </div>

            {/* Remove button (if more than 1 track) */}
            {tracks.length > 1 && (
              <button
                className="text-[11px] ml-1 font-bold"
                style={{ color: 'var(--danger)' }}
                onClick={() => removeTrack(track.id)}
              >
                ×
              </button>
            )}
          </div>
        )
      })}

      {/* Add track button */}
      {tracks.length < maxTracks && (
        <button
          className="text-[11px] uppercase tracking-wider py-2 text-center"
          style={{ color: 'var(--text-muted)' }}
          onClick={addTrack}
        >
          + ADD TRACK
        </button>
      )}
    </div>
  )
}
