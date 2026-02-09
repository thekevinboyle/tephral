import { usePolyEuclidStore } from '../../stores/polyEuclidStore'

const CLOCK_DIVIDERS = [
  { label: '/4', value: 0.25 },
  { label: '/2', value: 0.5 },
  { label: '1x', value: 1 },
  { label: '2x', value: 2 },
  { label: '4x', value: 4 },
]

export function TrackStrips() {
  const { tracks, maxTracks, addTrack, removeTrack, updateTrack, getPattern } = usePolyEuclidStore()

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
    <div className="flex flex-col" style={{ fontFamily: 'monospace' }}>
      {tracks.map((track, index) => {
        const pattern = getPattern(track.id)
        const divLabel = CLOCK_DIVIDERS.find(d => d.value === track.clockDivider)?.label || '1x'

        return (
          <div
            key={track.id}
            className="flex items-center gap-2 px-2 py-1"
            style={{
              borderBottom: '1px solid var(--border)',
              opacity: track.muted ? 0.4 : 1,
              backgroundColor: track.muted ? 'transparent' : 'rgba(232, 228, 217, 0.03)',
            }}
          >
            {/* Track number / mute toggle */}
            <button
              className="text-[10px] font-bold uppercase w-8"
              style={{ color: track.muted ? 'var(--danger)' : '#E8E4D9' }}
              onClick={() => updateTrack(track.id, { muted: !track.muted })}
            >
              TRK{index + 1}
            </button>

            {/* Steps */}
            <div
              className="text-[10px] cursor-ns-resize select-none"
              style={{ color: '#E8E4D9' }}
              onMouseDown={(e) => handleDrag(track.id, 'steps', e.clientY, track.steps)}
            >
              STEPS <span className="font-bold">{String(track.steps).padStart(2, '0')}</span>
            </div>

            {/* Hits */}
            <div
              className="text-[10px] cursor-ns-resize select-none"
              style={{ color: '#E8E4D9' }}
              onMouseDown={(e) => handleDrag(track.id, 'hits', e.clientY, track.hits)}
            >
              HITS <span className="font-bold">{String(track.hits).padStart(2, '0')}</span>
            </div>

            {/* Rotation */}
            <div
              className="text-[10px] cursor-ns-resize select-none"
              style={{ color: '#E8E4D9' }}
              onMouseDown={(e) => handleDrag(track.id, 'rotation', e.clientY, track.rotation)}
            >
              ROT <span className="font-bold">{track.rotation >= 0 ? '+' : ''}{track.rotation}</span>
            </div>

            {/* Clock divider */}
            <button
              className="text-[10px] font-bold px-1"
              style={{ color: '#E8E4D9', backgroundColor: 'rgba(232, 228, 217, 0.1)' }}
              onClick={() => cycleClockDivider(track.id, track.clockDivider)}
            >
              DIV {divLabel}
            </button>

            {/* Decay */}
            <div
              className="text-[10px] cursor-ns-resize select-none"
              style={{ color: '#E8E4D9' }}
              onMouseDown={(e) => handleDrag(track.id, 'decay', e.clientY, track.decay)}
            >
              DCY <span className="font-bold">{track.decay.toFixed(1)}</span>
            </div>

            {/* Route handle - drag to connect to parameters */}
            <div
              className="text-[10px] px-1 cursor-grab active:cursor-grabbing"
              style={{ color: '#E8E4D9', backgroundColor: 'rgba(232, 228, 217, 0.1)' }}
              draggable
              onDragStart={(e) => handleRouteDragStart(track.id, e)}
              title="Drag to parameter to route"
            >
              +
            </div>

            {/* Mini pattern preview */}
            <div className="flex gap-[1px] ml-auto">
              {pattern.map((hit, i) => (
                <div
                  key={i}
                  className="w-[4px] h-[8px]"
                  style={{
                    backgroundColor: hit ? '#E8E4D9' : 'transparent',
                    border: hit ? 'none' : '1px solid rgba(232, 228, 217, 0.3)',
                    opacity: i === track.currentStep ? 1 : 0.6,
                  }}
                />
              ))}
            </div>

            {/* Remove button (if more than 1 track) */}
            {tracks.length > 1 && (
              <button
                className="text-[10px] ml-1"
                style={{ color: 'var(--danger)' }}
                onClick={() => removeTrack(track.id)}
              >
                x
              </button>
            )}
          </div>
        )
      })}

      {/* Add track button */}
      {tracks.length < maxTracks && (
        <button
          className="text-[10px] uppercase tracking-wider py-1 text-center"
          style={{ color: '#E8E4D9', opacity: 0.5 }}
          onClick={addTrack}
        >
          + ADD TRACK
        </button>
      )}
    </div>
  )
}
