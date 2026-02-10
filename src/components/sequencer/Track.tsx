import { useCallback, useEffect, useState, useRef } from 'react'
import { useSequencerStore, type Track as TrackType, type StepMode, type StepResolution } from '../../stores/sequencerStore'
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

const RESOLUTION_OPTIONS: StepResolution[] = ['1/4', '1/8', '1/16', '1/32']

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

  const { infoPanelSelection, selectTrack } = useUIStore()
  const { stepResolution: globalResolution, globalMode } = useSequencerStore()
  const routings = getRoutingsForTrack(track.id)
  const isSelected = infoPanelSelection?.type === 'track' && infoPanelSelection.trackId === track.id
  const isAssigning = assigningTrack === track.id

  // Dropdown state
  const [resolutionDropdownOpen, setResolutionDropdownOpen] = useState(false)
  const [modeDropdownOpen, setModeDropdownOpen] = useState(false)
  const resolutionRef = useRef<HTMLDivElement>(null)
  const modeRef = useRef<HTMLDivElement>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (resolutionRef.current && !resolutionRef.current.contains(e.target as Node)) {
        setResolutionDropdownOpen(false)
      }
      if (modeRef.current && !modeRef.current.contains(e.target as Node)) {
        setModeDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
    selectTrack(track.id)

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
  }, [track.id, track.length, setTrackLength, selectTrack])

  const handleTrackClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.tagName === 'BUTTON' || target.tagName === 'INPUT' || target.closest('button')) {
      return
    }
    // Always select this track (no toggle - LCD click returns to global)
    selectTrack(track.id)
  }, [track.id, selectTrack])

  const handleModeSelect = useCallback((mode: StepMode | null) => {
    updateTrack(track.id, { modeOverride: mode })
    setModeDropdownOpen(false)
    selectTrack(track.id)
  }, [track.id, updateTrack, selectTrack])

  const handleResolutionSelect = useCallback((resolution: StepResolution | null) => {
    updateTrack(track.id, { resolutionOverride: resolution })
    setResolutionDropdownOpen(false)
    selectTrack(track.id)
  }, [track.id, updateTrack, selectTrack])

  const handleSoloClick = useCallback(() => {
    updateTrack(track.id, { solo: !track.solo })
    selectTrack(track.id)
  }, [track.id, track.solo, updateTrack, selectTrack])

  const handleFillClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const isAllFilled = track.steps.slice(0, track.length).every(s => s.active)
    if (isAllFilled) {
      clearTrack(track.id)
    } else {
      fillTrack(track.id)
    }
    selectTrack(track.id)
  }, [track.id, track.steps, track.length, fillTrack, clearTrack, selectTrack])

  const handleRandomClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    randomizeTrack(track.id)
    selectTrack(track.id)
  }, [track.id, randomizeTrack, selectTrack])

  const isActive = isPlaying && routings.length > 0 && !track.solo

  return (
    <div
      className="flex items-center"
      style={{
        fontFamily: 'var(--font-mono, monospace)',
        borderBottom: '1px solid var(--border)',
        backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
        paddingLeft: 'var(--panel-padding)',
        paddingRight: 'var(--panel-padding)',
        paddingTop: 'var(--panel-padding)',
        paddingBottom: 'var(--panel-padding)',
        gap: 'var(--gap-lg)',
      }}
      onClick={handleTrackClick}
      onDoubleClick={(e) => e.stopPropagation()}
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
        className="cursor-ns-resize select-none flex items-end gap-1"
        style={{ color: 'var(--text-secondary)' }}
        onMouseDown={(e) => handleDrag('length', e.clientY, track.length)}
      >
        <span className="text-[9px] uppercase tracking-wider pb-[3px]" style={{ color: 'var(--text-ghost)' }}>LEN</span>
        <span className="text-[20px] font-bold leading-none" style={{ color: 'var(--text-primary)' }}>
          {String(track.length).padStart(2, '0')}
        </span>
      </div>

      {/* Resolution Dropdown */}
      <div ref={resolutionRef} className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation()
            setResolutionDropdownOpen(!resolutionDropdownOpen)
            setModeDropdownOpen(false)
          }}
          className="text-[16px] font-bold px-2 py-1 rounded-sm min-w-[52px] text-center"
          style={{
            color: 'var(--text-primary)',
            backgroundColor: track.resolutionOverride ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.08)',
          }}
          title={track.resolutionOverride ? `Resolution: ${track.resolutionOverride}` : 'Using global resolution'}
        >
          {track.resolutionOverride ?? globalResolution}
        </button>
        {resolutionDropdownOpen && (
          <div
            className="absolute top-full left-0 mt-1 rounded-sm overflow-hidden z-50"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleResolutionSelect(null)
              }}
              className="block w-full text-left px-3 py-1.5 text-[14px] font-bold hover:bg-white/10"
              style={{
                color: !track.resolutionOverride ? STEP_COLOR : 'var(--text-muted)',
              }}
            >
              GLOBAL
            </button>
            {RESOLUTION_OPTIONS.map((res) => (
              <button
                key={res}
                onClick={(e) => {
                  e.stopPropagation()
                  handleResolutionSelect(res)
                }}
                className="block w-full text-left px-3 py-1.5 text-[14px] font-bold hover:bg-white/10"
                style={{
                  color: track.resolutionOverride === res ? STEP_COLOR : 'var(--text-primary)',
                }}
              >
                {res}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mode Dropdown */}
      <div ref={modeRef} className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation()
            setModeDropdownOpen(!modeDropdownOpen)
            setResolutionDropdownOpen(false)
          }}
          className="text-[20px] font-bold px-2 py-1 rounded-sm min-w-[40px] text-center"
          style={{
            color: 'var(--text-primary)',
            backgroundColor: track.modeOverride ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.08)',
          }}
          title={track.modeOverride ? `Mode: ${track.modeOverride}` : 'Using global mode'}
        >
          {track.modeOverride ? MODE_LABELS[track.modeOverride] : MODE_LABELS[globalMode]}
        </button>
        {modeDropdownOpen && (
          <div
            className="absolute top-full left-0 mt-1 rounded-sm overflow-hidden z-50"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleModeSelect(null)
              }}
              className="block w-full text-left px-3 py-1.5 text-[14px] font-bold hover:bg-white/10"
              style={{
                color: !track.modeOverride ? STEP_COLOR : 'var(--text-muted)',
              }}
            >
              GLOBAL
            </button>
            {MODE_ORDER.map((mode) => (
              <button
                key={mode}
                onClick={(e) => {
                  e.stopPropagation()
                  handleModeSelect(mode)
                }}
                className="block w-full text-left px-3 py-1.5 text-[14px] font-bold hover:bg-white/10 flex items-center gap-2"
                style={{
                  color: track.modeOverride === mode ? STEP_COLOR : 'var(--text-primary)',
                }}
              >
                <span className="w-5">{MODE_LABELS[mode]}</span>
                <span className="text-[11px] uppercase" style={{ color: 'var(--text-muted)' }}>
                  {mode.slice(0, 3)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

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
