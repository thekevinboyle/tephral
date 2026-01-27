import { useCallback, useState, useRef } from 'react'
import { useSequencerStore, type Track as TrackType, type StepMode } from '../../stores/sequencerStore'
import { useUIStore } from '../../stores/uiStore'
import { StepGrid } from './StepGrid'

interface TrackProps {
  track: TrackType
  onOpenStepDetail?: (trackId: string, stepIndex: number) => void
}

const MODE_LABELS: Record<StepMode, string> = {
  forward: '>',
  backward: '<',
  pendulum: '<>',
  random: '?',
}

const MODE_ORDER: StepMode[] = ['forward', 'backward', 'pendulum', 'random']

export function Track({ track, onOpenStepDetail }: TrackProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(track.name)
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    updateTrack,
    removeTrack,
    setTrackLength,
    getRoutingsForTrack,
    fillModeActive,
    fillTrack,
    clearTrack,
  } = useSequencerStore()

  const { startSequencerDrag, endSequencerDrag } = useUIStore()
  const routings = getRoutingsForTrack(track.id)
  const [isRoutingDrag, setIsRoutingDrag] = useState(false)

  const handleNameDoubleClick = useCallback(() => {
    setEditName(track.name)
    setIsEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }, [track.name])

  const handleNameSubmit = useCallback(() => {
    if (editName.trim()) {
      updateTrack(track.id, { name: editName.trim() })
    }
    setIsEditing(false)
  }, [track.id, editName, updateTrack])

  const handleNameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSubmit()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
    }
  }, [handleNameSubmit])

  const handleModeClick = useCallback(() => {
    const currentIndex = track.modeOverride
      ? MODE_ORDER.indexOf(track.modeOverride)
      : -1
    const nextIndex = currentIndex + 1
    const nextMode = nextIndex >= MODE_ORDER.length ? null : MODE_ORDER[nextIndex]
    updateTrack(track.id, { modeOverride: nextMode })
  }, [track.id, track.modeOverride, updateTrack])

  const handleSoloClick = useCallback(() => {
    updateTrack(track.id, { solo: !track.solo })
  }, [track.id, track.solo, updateTrack])

  const handleLengthClick = useCallback(() => {
    // Cycle through common lengths
    const lengths = [4, 8, 12, 16, 24, 32, 48, 64]
    const currentIndex = lengths.indexOf(track.length)
    const nextIndex = (currentIndex + 1) % lengths.length
    setTrackLength(track.id, lengths[nextIndex])
  }, [track.id, track.length, setTrackLength])

  const handleFillClick = useCallback(() => {
    if (fillModeActive) {
      // Check if track is already filled
      const isAllFilled = track.steps.slice(0, track.length).every(s => s.active)
      if (isAllFilled) {
        clearTrack(track.id)
      } else {
        fillTrack(track.id)
      }
    }
  }, [track.id, track.steps, track.length, fillModeActive, fillTrack, clearTrack])

  const handleRemove = useCallback(() => {
    removeTrack(track.id)
  }, [track.id, removeTrack])

  return (
    <div
      className="flex items-center gap-2 px-2 py-1.5 rounded group"
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e5e5e5',
      }}
      onClick={fillModeActive ? handleFillClick : undefined}
    >
      {/* Drag handle for routing */}
      <div
        className="w-4 h-4 flex flex-col justify-center gap-0.5 cursor-grab opacity-40 group-hover:opacity-100 transition-opacity"
        title="Drag to effect parameter to create modulation route"
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('sequencer-track', track.id)
          e.dataTransfer.effectAllowed = 'link'
          startSequencerDrag(track.id, track.color)
          setIsRoutingDrag(true)
        }}
        onDragEnd={() => {
          endSequencerDrag()
          setIsRoutingDrag(false)
        }}
        style={{
          backgroundColor: isRoutingDrag ? track.color : undefined,
          borderRadius: isRoutingDrag ? '2px' : undefined,
        }}
      >
        <div className="w-full h-0.5 bg-gray-400 rounded" style={{ backgroundColor: isRoutingDrag ? '#fff' : undefined }} />
        <div className="w-full h-0.5 bg-gray-400 rounded" style={{ backgroundColor: isRoutingDrag ? '#fff' : undefined }} />
        <div className="w-full h-0.5 bg-gray-400 rounded" style={{ backgroundColor: isRoutingDrag ? '#fff' : undefined }} />
      </div>

      {/* Track name with color dot */}
      <div className="flex items-center gap-1.5 w-16 flex-shrink-0">
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: track.color }}
        />
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={handleNameKeyDown}
            className="w-full text-[10px] px-1 py-0.5 rounded"
            style={{
              backgroundColor: '#f5f5f5',
              border: '1px solid #d0d0d0',
            }}
          />
        ) : (
          <span
            className="text-[10px] font-medium truncate cursor-text"
            style={{ color: '#666666' }}
            onDoubleClick={handleNameDoubleClick}
            title="Double-click to rename"
          >
            {track.name}
          </span>
        )}
        {/* Routing indicator dots */}
        {routings.length > 0 && (
          <div className="flex gap-0.5">
            {routings.slice(0, 3).map((r, i) => (
              <div
                key={i}
                className="w-1 h-1 rounded-full"
                style={{ backgroundColor: track.color }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Step grid */}
      <div className="flex-1 min-w-0">
        <StepGrid
          track={track}
          onOpenStepDetail={onOpenStepDetail}
        />
      </div>

      {/* Length */}
      <button
        onClick={handleLengthClick}
        className="w-6 text-[9px] font-mono text-center rounded hover:bg-gray-100"
        style={{ color: '#999999' }}
        title="Click to change length"
      >
        {track.length}
      </button>

      {/* Mode override */}
      <button
        onClick={handleModeClick}
        className="w-5 text-[10px] font-mono text-center rounded hover:bg-gray-100"
        style={{ color: track.modeOverride ? '#333333' : '#cccccc' }}
        title={track.modeOverride ? `Mode: ${track.modeOverride}` : 'Using global mode'}
      >
        {track.modeOverride ? MODE_LABELS[track.modeOverride] : '-'}
      </button>

      {/* Solo toggle */}
      <button
        onClick={handleSoloClick}
        className="w-5 h-5 text-[10px] font-medium rounded"
        style={{
          backgroundColor: track.solo ? track.color : 'transparent',
          color: track.solo ? '#ffffff' : '#cccccc',
          border: track.solo ? 'none' : '1px solid #e5e5e5',
        }}
        title={track.solo ? 'Solo (click to unsolo)' : 'Solo this track'}
      >
        S
      </button>

      {/* Remove button (shown on hover) */}
      <button
        onClick={handleRemove}
        className="w-4 h-4 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
        style={{ color: '#cccccc' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#f44')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#cccccc')}
        title="Remove track"
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <path d="M1 1L7 7M7 1L1 7" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
    </div>
  )
}
