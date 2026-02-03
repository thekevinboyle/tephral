import { useCallback, useState } from 'react'
import { Button } from '../ui/Button'
import { useSequencerStore, type StepResolution, type StepMode } from '../../stores/sequencerStore'
import { useSequencerPlayback } from '../../hooks/useSequencerPlayback'
import { useAudioAnalysis } from '../../hooks/useAudioAnalysis'
import { Track } from './Track'
import { EuclideanPanel } from './EuclideanPanel'
import { RicochetPanel } from './RicochetPanel'

const RESOLUTION_OPTIONS: StepResolution[] = ['1/4', '1/8', '1/16', '1/32']
const MODE_OPTIONS: { value: StepMode; label: string }[] = [
  { value: 'forward', label: 'Forward' },
  { value: 'backward', label: 'Backward' },
  { value: 'pendulum', label: 'Pendulum' },
  { value: 'random', label: 'Random' },
]

type SequencerView = 'steps' | 'euclidean' | 'ricochet'

interface ViewConfig {
  type: SequencerView
  color: string
  label: string
  icon: React.ReactNode
}

const VIEWS: ViewConfig[] = [
  {
    type: 'steps',
    color: '#a78bfa', // purple
    label: 'Step Sequencer',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="3" width="3" height="10" rx="0.5" />
        <rect x="5" y="6" width="3" height="7" rx="0.5" />
        <rect x="9" y="4" width="3" height="9" rx="0.5" />
        <rect x="13" y="8" width="2" height="5" rx="0.5" />
      </svg>
    ),
  },
  {
    type: 'euclidean',
    color: '#FF9F43',
    label: 'Euclidean Sequencer',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="8" cy="8" r="6" />
        <circle cx="8" cy="2" r="1.5" fill="currentColor" />
        <circle cx="13" cy="6" r="1.5" fill="currentColor" />
        <circle cx="11" cy="12" r="1.5" fill="currentColor" />
        <circle cx="5" cy="12" r="1" />
        <circle cx="3" cy="6" r="1" />
      </svg>
    ),
  },
  {
    type: 'ricochet',
    color: '#00D9FF',
    label: 'Ricochet Sequencer',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polygon points="8,1 15,12 1,12" />
        <circle cx="7" cy="8" r="2" fill="currentColor" />
      </svg>
    ),
  },
]

export function SequencerPanel() {
  const [activeView, setActiveView] = useState<SequencerView>('steps')

  const {
    isPlaying,
    bpm,
    stepResolution,
    tracks,
    globalMode,
    fillModeActive,
    previousStepsSnapshot,
    frozenState,
    audioReactive,
    audioLevel,
    play,
    stop,
    setBpm,
    setStepResolution,
    addTrack,
    setGlobalMode,
    setFillModeActive,
    randomizeAllTracks,
    undoRandomize,
    freeze,
    revert,
    setAudioReactive,
  } = useSequencerStore()

  // Initialize playback engine
  useSequencerPlayback()

  // Initialize audio analysis
  useAudioAnalysis()

  const handleBpmChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10)
    if (!isNaN(value)) {
      setBpm(value)
    }
  }, [setBpm])

  const handleResolutionCycle = useCallback(() => {
    const currentIndex = RESOLUTION_OPTIONS.indexOf(stepResolution)
    const nextIndex = (currentIndex + 1) % RESOLUTION_OPTIONS.length
    setStepResolution(RESOLUTION_OPTIONS[nextIndex])
  }, [stepResolution, setStepResolution])

  const renderContent = () => {
    switch (activeView) {
      case 'euclidean':
        return <EuclideanPanel />
      case 'ricochet':
        return <RicochetPanel />
      case 'steps':
      default:
        return (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Header */}
            <div
              className="flex items-center gap-3 px-3 py-2"
              style={{
                borderBottom: '1px solid var(--border)',
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              {/* Title */}
              <span
                className="text-[13px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}
              >
                Sequencer
              </span>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Play/Stop */}
              <button
                onClick={isPlaying ? stop : play}
                className="w-7 h-7 flex items-center justify-center rounded transition-colors"
                style={{
                  backgroundColor: isPlaying ? 'var(--text-primary)' : 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                }}
              >
                {isPlaying ? (
                  <div
                    className="w-2.5 h-2.5"
                    style={{ backgroundColor: 'var(--bg-surface)' }}
                  />
                ) : (
                  <div
                    className="w-0 h-0"
                    style={{
                      borderTop: '5px solid transparent',
                      borderBottom: '5px solid transparent',
                      borderLeft: '8px solid var(--text-muted)',
                      marginLeft: '2px',
                    }}
                  />
                )}
              </button>

              {/* BPM */}
              <input
                type="number"
                value={bpm}
                onChange={handleBpmChange}
                className="w-12 h-7 text-center text-[14px] font-mono rounded"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
                min={20}
                max={300}
              />

              {/* Resolution */}
              <button
                onClick={handleResolutionCycle}
                className="h-7 px-2 text-[14px] font-mono rounded"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-muted)',
                }}
              >
                {stepResolution}
              </button>

              {/* Audio Reactive Toggle */}
              <button
                onClick={() => setAudioReactive(!audioReactive)}
                className="h-7 px-2 text-[14px] font-medium rounded flex items-center gap-1.5"
                style={{
                  backgroundColor: audioReactive ? '#8b5cf6' : 'var(--bg-surface)',
                  border: audioReactive ? '1px solid #7c3aed' : '1px solid var(--border)',
                  color: audioReactive ? '#ffffff' : 'var(--text-muted)',
                }}
                title="Audio reactive mode - modulates parameters based on audio input"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                </svg>
                {audioReactive && (
                  <div
                    className="w-1.5 h-3 rounded-sm"
                    style={{
                      backgroundColor: '#ffffff',
                      opacity: 0.3 + audioLevel * 0.7,
                      transform: `scaleY(${0.3 + audioLevel * 0.7})`,
                    }}
                  />
                )}
              </button>
            </div>

            {/* Track list - scrollable */}
            <div className="flex-1 overflow-y-auto">
              {tracks.length === 0 ? (
                <div
                  className="flex items-center justify-center h-full text-[14px] cursor-pointer"
                  style={{ color: 'var(--text-muted)' }}
                  onDoubleClick={addTrack}
                  title="Double-click to add a track"
                >
                  No tracks yet
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {tracks.map((track) => (
                    <Track key={track.id} track={track} />
                  ))}
                </div>
              )}
            </div>

            {/* Add Track button */}
            <div
              className="px-3 py-2"
              style={{ borderTop: '1px solid var(--border)' }}
            >
              <button
                onClick={addTrack}
                className="w-full h-8 text-[14px] font-medium rounded transition-colors"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-muted)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}
              >
                + Add Track
              </button>
            </div>

            {/* Global controls */}
            <div
              className="px-3 py-2"
              style={{
                borderTop: '1px solid var(--border)',
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              {/* Row 1: Mode, Fill, Random, Undo */}
              <div className="flex gap-2 mb-2">
                <select
                  value={globalMode}
                  onChange={(e) => setGlobalMode(e.target.value as StepMode)}
                  className="flex-1 h-7 px-2 text-[13px] rounded"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-muted)',
                  }}
                >
                  {MODE_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>

                <button
                  onClick={() => setFillModeActive(!fillModeActive)}
                  className="h-7 px-3 text-[13px] font-medium rounded transition-colors"
                  style={{
                    backgroundColor: fillModeActive ? '#4ade80' : 'var(--bg-surface)',
                    border: fillModeActive ? '1px solid #4ade80' : '1px solid var(--border)',
                    color: fillModeActive ? '#fff' : 'var(--text-muted)',
                  }}
                  title={fillModeActive ? 'Click a track to fill/clear' : 'Enter fill mode'}
                >
                  Fill
                </button>

                <Button
                  size="sm"
                  onClick={(e) => {
                    if (e.shiftKey && tracks.length > 0) {
                      useSequencerStore.getState().randomizeTrack(tracks[0].id)
                    } else {
                      randomizeAllTracks()
                    }
                  }}
                  title="Randomize all tracks (Shift+click for selected only)"
                >
                  Random
                </Button>

                <Button
                  size="sm"
                  onClick={undoRandomize}
                  disabled={!previousStepsSnapshot}
                  className="w-7 px-0 flex items-center justify-center"
                  title="Undo last randomize"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                </Button>
              </div>

              {/* Row 2: Freeze / Revert */}
              <div className="flex gap-2">
                <button
                  onClick={freeze}
                  className="flex-1 h-7 text-[13px] font-medium rounded transition-colors flex items-center justify-center gap-1"
                  style={{
                    backgroundColor: frozenState ? '#e0f2fe' : 'var(--bg-surface)',
                    border: frozenState ? '1px solid #38bdf8' : '1px solid var(--border)',
                    color: frozenState ? '#0284c7' : 'var(--text-muted)',
                  }}
                  onMouseEnter={(e) => !frozenState && (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                  onMouseLeave={(e) => !frozenState && (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}
                  title="Capture current state"
                >
                  {frozenState && (
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: '#38bdf8' }}
                    />
                  )}
                  Freeze
                </button>

                <Button
                  size="sm"
                  className="flex-1"
                  onClick={revert}
                  disabled={!frozenState}
                  title={frozenState ? 'Restore to frozen state' : 'No frozen state'}
                >
                  Revert
                </Button>
              </div>
            </div>
          </div>
        )
    }
  }

  return (
    <div
      className="h-full flex flex-row"
      style={{
        backgroundColor: 'var(--bg-surface)',
      }}
    >
      {/* Icon bar */}
      <div
        className="flex flex-col items-center gap-2 py-2"
        style={{
          width: '40px',
          backgroundColor: 'var(--bg-elevated)',
          borderRight: '1px solid var(--border)',
        }}
      >
        {VIEWS.map(({ type, color, label, icon }) => {
          const isActive = activeView === type

          return (
            <button
              key={type}
              onClick={() => setActiveView(type)}
              title={label}
              className="flex items-center justify-center transition-colors"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '4px',
                backgroundColor: isActive ? `${color}20` : 'transparent',
                border: isActive ? `2px solid ${color}` : '1px solid var(--border)',
                boxShadow: isActive ? `0 0 8px ${color}40` : 'none',
                color: isActive ? color : 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              {icon}
            </button>
          )
        })}
      </div>

      {/* Content area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {renderContent()}
      </div>
    </div>
  )
}
