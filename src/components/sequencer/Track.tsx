import { useCallback, useEffect } from 'react'
import { useSequencerStore, type Track as TrackType, type StepMode } from '../../stores/sequencerStore'
import { useUIStore } from '../../stores/uiStore'
import { StepGrid } from './StepGrid'
import { SendIcon } from '../ui/DotMatrixIcons'

interface TrackProps {
  track: TrackType
}

const MODE_LABELS: Record<StepMode, string> = {
  forward: '→',
  backward: '←',
  pendulum: '↔',
  random: '?',
}

const MODE_ORDER: StepMode[] = ['forward', 'backward', 'pendulum', 'random']

// Step sequencer accent color (distinct from euclidean #FF0055)
const STEP_COLOR = '#FF9500'

export function Track({ track }: TrackProps) {
  const {
    updateTrack,
    setTrackLength,
    getRoutingsForTrack,
    fillTrack,
    clearTrack,
    randomizeTrack,
    isPlaying,
    assigningTrack,
    toggleAssignmentMode,
    setAssigningTrack,
  } = useSequencerStore()

  const { infoPanelSelection, selectTrack, clearInfoPanelSelection } = useUIStore()
  const routings = getRoutingsForTrack(track.id)
  const isSelected = infoPanelSelection?.type === 'track' && infoPanelSelection.trackId === track.id
  const isAssigning = assigningTrack === track.id

  // ESC key to cancel assignment mode
  useEffect(() => {
    if (!isAssigning) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAssigningTrack(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isAssigning, setAssigningTrack])

  // Drag handlers for adjustable values
  const handleDrag = useCallback((
    _param: 'length',
    startY: number,
    startValue: number
  ) => {
    const lengths = [4, 8, 12, 16, 24, 32, 48, 64]
    const startIndex = lengths.indexOf(startValue)

    const handleMove = (e: MouseEvent) => {
      const deltaY = startY - e.clientY
      const indexDelta = Math.round(deltaY / 20)
      const newIndex = Math.max(0, Math.min(lengths.length - 1, startIndex + indexDelta))
      if (lengths[newIndex] !== track.length) {
        setTrackLength(track.id, lengths[newIndex])
      }
    }

    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }, [track.id, track.length, setTrackLength])

  const handleTrackClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.closest('button')) {
      return
    }
    if (isSelected) {
      clearInfoPanelSelection()
    } else {
      selectTrack(track.id)
    }
  }, [track.id, isSelected, selectTrack, clearInfoPanelSelection])

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

  const handleFillClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const isAllFilled = track.steps.slice(0, track.length).every(s => s.active)
    if (isAllFilled) {
      clearTrack(track.id)
    } else {
      fillTrack(track.id)
    }
  }, [track.id, track.steps, track.length, fillTrack, clearTrack])

  const handleRandomClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    randomizeTrack(track.id)
  }, [track.id, randomizeTrack])

  const isActive = isPlaying && routings.length > 0 && !track.solo

  return (
    <div
      className="flex items-center gap-4 px-4 py-3"
      style={{
        fontFamily: 'var(--font-mono, monospace)',
        borderBottom: '1px solid var(--border)',
        backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
      }}
      onClick={handleTrackClick}
    >
      {/* Track number / mute toggle */}
      <button
        onClick={handleSoloClick}
        className="text-[24px] font-bold uppercase"
        style={{ color: track.solo ? STEP_COLOR : 'var(--text-primary)' }}
      >
        T{track.name.replace(/[^0-9]/g, '') || '1'}
      </button>

      {/* Length - drag to adjust */}
      <div
        className="cursor-ns-resize select-none"
        style={{ color: 'var(--text-secondary)' }}
        onMouseDown={(e) => handleDrag('length', e.clientY, track.length)}
      >
        <span className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-ghost)' }}>LEN</span>{' '}
        <span className="text-[20px] font-bold" style={{ color: 'var(--text-primary)' }}>
          {String(track.length).padStart(2, '0')}
        </span>
      </div>

      {/* Mode */}
      <button
        onClick={handleModeClick}
        className="text-[20px] font-bold px-2 py-1 rounded-sm"
        style={{
          color: 'var(--text-primary)',
          backgroundColor: track.modeOverride ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.08)',
        }}
        title={track.modeOverride ? `Mode: ${track.modeOverride}` : 'Using global mode'}
      >
        {track.modeOverride ? MODE_LABELS[track.modeOverride] : '→'}
      </button>

      {/* Step grid - pattern preview style */}
      <div className="flex gap-[2px] ml-auto">
        <StepGrid track={track} />
      </div>

      {/* Fill button */}
      <button
        onClick={handleFillClick}
        className="text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded-sm"
        style={{
          color: 'var(--text-secondary)',
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
        }}
      >
        FILL
      </button>

      {/* Random button */}
      <button
        onClick={handleRandomClick}
        className="text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded-sm"
        style={{
          color: 'var(--text-secondary)',
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
        }}
      >
        RAND
      </button>

      {/* Route button with SendIcon - click to enter assignment mode */}
      <button
        className="w-7 h-7 rounded-sm flex items-center justify-center transition-all hover:scale-110"
        style={{
          backgroundColor: isAssigning ? STEP_COLOR : 'transparent',
          boxShadow: isAssigning
            ? `0 0 8px ${STEP_COLOR}`
            : isActive
              ? `0 0 4px ${STEP_COLOR}40`
              : 'none',
          animation: isActive && !isAssigning ? 'pulse-route 1.5s ease-in-out infinite' : 'none',
        }}
        onClick={(e) => {
          e.stopPropagation()
          toggleAssignmentMode(track.id)
        }}
        title={isAssigning ? 'Click parameter to route (ESC to cancel)' : 'Click to route to parameters'}
      >
        <SendIcon
          size={16}
          color={isAssigning ? 'var(--bg-primary)' : isActive ? STEP_COLOR : 'var(--text-ghost)'}
        />
      </button>
    </div>
  )
}
