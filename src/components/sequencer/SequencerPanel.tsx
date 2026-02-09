import { useCallback, useState } from 'react'
import { Button } from '../ui/Button'
import { PlayIcon, StopIcon, UndoIcon, MicIcon, StepsIcon, EuclideanIcon, RicochetIcon } from '../ui/DotMatrixIcons'
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
    color: 'var(--accent)',
    label: 'Step Sequencer',
    icon: <StepsIcon size={16} />,
  },
  {
    type: 'euclidean',
    color: 'var(--accent)',
    label: 'Euclidean Sequencer',
    icon: <EuclideanIcon size={16} />,
  },
  {
    type: 'ricochet',
    color: 'var(--accent)',
    label: 'Ricochet Sequencer',
    icon: <RicochetIcon size={16} />,
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
                className="text-[9px] font-medium uppercase tracking-widest"
                style={{ color: 'var(--text-ghost)' }}
              >
                SEQ
              </span>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Play/Stop */}
              <button
                onClick={isPlaying ? stop : play}
                className="w-7 h-7 flex items-center justify-center rounded-sm transition-colors"
                style={{
                  backgroundColor: isPlaying ? 'var(--accent)' : 'var(--bg-surface)',
                  border: isPlaying ? '1px solid var(--accent)' : '1px solid var(--border)',
                  boxShadow: isPlaying ? '0 0 6px var(--accent-glow)' : 'none',
                }}
              >
                {isPlaying ? (
                  <StopIcon size={12} color="var(--text-primary)" />
                ) : (
                  <PlayIcon size={12} color="var(--text-muted)" />
                )}
              </button>

              {/* BPM */}
              <input
                type="number"
                value={bpm}
                onChange={handleBpmChange}
                className="w-12 h-6 text-center text-[11px] font-mono rounded-sm"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                }}
                min={20}
                max={300}
              />

              {/* Resolution */}
              <button
                onClick={handleResolutionCycle}
                className="h-6 px-2 text-[11px] font-mono rounded-sm"
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
                className="h-6 px-2 text-[11px] font-medium rounded-sm flex items-center gap-1.5"
                style={{
                  backgroundColor: audioReactive ? 'var(--accent)' : 'var(--bg-surface)',
                  border: audioReactive ? '1px solid var(--accent)' : '1px solid var(--border)',
                  color: audioReactive ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: audioReactive ? '0 0 6px var(--accent-glow)' : 'none',
                }}
                title="Audio reactive mode - modulates parameters based on audio input"
              >
                <MicIcon size={10} color="currentColor" />
                {audioReactive && (
                  <div
                    className="w-1 h-2.5 rounded-sm"
                    style={{
                      backgroundColor: 'var(--text-primary)',
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
                  className="flex items-center justify-center h-full text-[11px] cursor-pointer uppercase tracking-wider"
                  style={{ color: 'var(--text-ghost)' }}
                  onDoubleClick={addTrack}
                  title="Double-click to add a track"
                >
                  No tracks
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
                className="w-full h-7 text-[11px] font-medium rounded-sm transition-colors"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-muted)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}
              >
                + Track
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
              <div className="flex gap-1.5 mb-1.5">
                <select
                  value={globalMode}
                  onChange={(e) => setGlobalMode(e.target.value as StepMode)}
                  className="flex-1 h-6 px-2 text-[11px] rounded-sm"
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
                  className="h-6 px-2 text-[11px] font-medium rounded-sm transition-colors"
                  style={{
                    backgroundColor: fillModeActive ? 'var(--accent)' : 'var(--bg-surface)',
                    border: fillModeActive ? '1px solid var(--accent)' : '1px solid var(--border)',
                    color: fillModeActive ? 'var(--text-primary)' : 'var(--text-muted)',
                    boxShadow: fillModeActive ? '0 0 6px var(--accent-glow)' : 'none',
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
                  Rand
                </Button>

                <Button
                  size="sm"
                  onClick={undoRandomize}
                  disabled={!previousStepsSnapshot}
                  className="w-6 px-0 flex items-center justify-center"
                  title="Undo last randomize"
                >
                  <UndoIcon size={12} color="currentColor" />
                </Button>
              </div>

              {/* Row 2: Freeze / Revert */}
              <div className="flex gap-1.5">
                <button
                  onClick={freeze}
                  className="flex-1 h-6 text-[11px] font-medium rounded-sm transition-colors flex items-center justify-center gap-1"
                  style={{
                    backgroundColor: frozenState ? 'var(--accent)' : 'var(--bg-surface)',
                    border: frozenState ? '1px solid var(--accent)' : '1px solid var(--border)',
                    color: frozenState ? 'var(--text-primary)' : 'var(--text-muted)',
                    boxShadow: frozenState ? '0 0 6px var(--accent-glow)' : 'none',
                  }}
                  onMouseEnter={(e) => !frozenState && (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                  onMouseLeave={(e) => !frozenState && (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}
                  title="Capture current state"
                >
                  {frozenState && (
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: 'var(--text-primary)' }}
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
        className="flex flex-col items-center gap-1.5 py-2"
        style={{
          width: '36px',
          backgroundColor: 'var(--bg-elevated)',
          borderRight: '1px solid var(--border)',
        }}
      >
        {VIEWS.map(({ type, label, icon }) => {
          const isActive = activeView === type

          return (
            <button
              key={type}
              onClick={() => setActiveView(type)}
              title={label}
              className="flex items-center justify-center transition-colors rounded-sm"
              style={{
                width: '28px',
                height: '28px',
                backgroundColor: isActive ? 'var(--accent-subtle)' : 'transparent',
                border: isActive ? '1px solid var(--accent)' : '1px solid var(--border)',
                boxShadow: isActive ? '0 0 6px var(--accent-glow)' : 'none',
                color: isActive ? 'var(--accent)' : 'var(--text-muted)',
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
