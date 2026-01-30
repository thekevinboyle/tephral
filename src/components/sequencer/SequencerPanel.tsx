import { useCallback } from 'react'
import { useSequencerStore, type StepResolution, type StepMode } from '../../stores/sequencerStore'
import { useSequencerPlayback } from '../../hooks/useSequencerPlayback'
import { useAudioAnalysis } from '../../hooks/useAudioAnalysis'
import { Track } from './Track'

const RESOLUTION_OPTIONS: StepResolution[] = ['1/4', '1/8', '1/16', '1/32']
const MODE_OPTIONS: { value: StepMode; label: string }[] = [
  { value: 'forward', label: 'Forward' },
  { value: 'backward', label: 'Backward' },
  { value: 'pendulum', label: 'Pendulum' },
  { value: 'random', label: 'Random' },
]

export function SequencerPanel() {
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

  return (
    <div
      className="h-full flex flex-col"
      style={{
        backgroundColor: '#f5f5f5',
        borderLeft: '1px solid #d0d0d0',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-3 py-2"
        style={{
          borderBottom: '1px solid #d0d0d0',
          backgroundColor: '#ffffff',
        }}
      >
        {/* Title */}
        <span
          className="text-[13px] font-semibold uppercase tracking-wider"
          style={{ color: '#999999' }}
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
            backgroundColor: isPlaying ? '#333333' : '#ffffff',
            border: '1px solid #d0d0d0',
          }}
        >
          {isPlaying ? (
            // Stop icon
            <div
              className="w-2.5 h-2.5"
              style={{ backgroundColor: '#ffffff' }}
            />
          ) : (
            // Play icon
            <div
              className="w-0 h-0"
              style={{
                borderTop: '5px solid transparent',
                borderBottom: '5px solid transparent',
                borderLeft: '8px solid #666666',
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
            backgroundColor: '#ffffff',
            border: '1px solid #d0d0d0',
            color: '#333333',
          }}
          min={20}
          max={300}
        />

        {/* Resolution */}
        <button
          onClick={handleResolutionCycle}
          className="h-7 px-2 text-[14px] font-mono rounded"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #d0d0d0',
            color: '#666666',
          }}
        >
          {stepResolution}
        </button>

        {/* Audio Reactive Toggle */}
        <button
          onClick={() => setAudioReactive(!audioReactive)}
          className="h-7 px-2 text-[14px] font-medium rounded flex items-center gap-1.5"
          style={{
            backgroundColor: audioReactive ? '#8b5cf6' : '#ffffff',
            border: audioReactive ? '1px solid #7c3aed' : '1px solid #d0d0d0',
            color: audioReactive ? '#ffffff' : '#666666',
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
            style={{ color: '#999999' }}
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
        style={{ borderTop: '1px solid #d0d0d0' }}
      >
        <button
          onClick={addTrack}
          className="w-full h-8 text-[14px] font-medium rounded transition-colors"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #d0d0d0',
            color: '#666666',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f0f0f0')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
        >
          + Add Track
        </button>
      </div>

      {/* Global controls */}
      <div
        className="px-3 py-2"
        style={{
          borderTop: '1px solid #d0d0d0',
          backgroundColor: '#ffffff',
        }}
      >
        {/* Row 1: Mode, Fill, Random, Undo */}
        <div className="flex gap-2 mb-2">
          {/* Mode dropdown */}
          <select
            value={globalMode}
            onChange={(e) => setGlobalMode(e.target.value as StepMode)}
            className="flex-1 h-7 px-2 text-[13px] rounded"
            style={{
              backgroundColor: '#f5f5f5',
              border: '1px solid #d0d0d0',
              color: '#666',
            }}
          >
            {MODE_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          {/* Fill button */}
          <button
            onClick={() => setFillModeActive(!fillModeActive)}
            className="h-7 px-3 text-[13px] font-medium rounded transition-colors"
            style={{
              backgroundColor: fillModeActive ? '#4ade80' : '#f5f5f5',
              border: fillModeActive ? '1px solid #4ade80' : '1px solid #d0d0d0',
              color: fillModeActive ? '#fff' : '#666',
            }}
            title={fillModeActive ? 'Click a track to fill/clear' : 'Enter fill mode'}
          >
            Fill
          </button>

          {/* Random button */}
          <button
            onClick={(e) => {
              if (e.shiftKey && tracks.length > 0) {
                // Randomize selected track only - for now randomize first track
                useSequencerStore.getState().randomizeTrack(tracks[0].id)
              } else {
                randomizeAllTracks()
              }
            }}
            className="h-7 px-3 text-[13px] font-medium rounded transition-colors"
            style={{
              backgroundColor: '#f5f5f5',
              border: '1px solid #d0d0d0',
              color: '#666',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e8e8e8')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f5f5f5')}
            title="Randomize all tracks (Shift+click for selected only)"
          >
            Random
          </button>

          {/* Undo button */}
          <button
            onClick={undoRandomize}
            disabled={!previousStepsSnapshot}
            className="w-7 h-7 flex items-center justify-center text-[12px] rounded transition-colors"
            style={{
              backgroundColor: previousStepsSnapshot ? '#f5f5f5' : '#fafafa',
              border: '1px solid #d0d0d0',
              color: previousStepsSnapshot ? '#666' : '#ccc',
              cursor: previousStepsSnapshot ? 'pointer' : 'not-allowed',
            }}
            title="Undo last randomize"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
        </div>

        {/* Row 2: Freeze / Revert */}
        <div className="flex gap-2">
          {/* Freeze button */}
          <button
            onClick={freeze}
            className="flex-1 h-7 text-[13px] font-medium rounded transition-colors flex items-center justify-center gap-1"
            style={{
              backgroundColor: frozenState ? '#e0f2fe' : '#f5f5f5',
              border: frozenState ? '1px solid #38bdf8' : '1px solid #d0d0d0',
              color: frozenState ? '#0284c7' : '#666',
            }}
            onMouseEnter={(e) => !frozenState && (e.currentTarget.style.backgroundColor = '#e8e8e8')}
            onMouseLeave={(e) => !frozenState && (e.currentTarget.style.backgroundColor = '#f5f5f5')}
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

          {/* Revert button */}
          <button
            onClick={revert}
            disabled={!frozenState}
            className="flex-1 h-7 text-[13px] font-medium rounded transition-colors"
            style={{
              backgroundColor: frozenState ? '#f5f5f5' : '#fafafa',
              border: '1px solid #d0d0d0',
              color: frozenState ? '#666' : '#ccc',
              cursor: frozenState ? 'pointer' : 'not-allowed',
            }}
            onMouseEnter={(e) => frozenState && (e.currentTarget.style.backgroundColor = '#e8e8e8')}
            onMouseLeave={(e) => frozenState && (e.currentTarget.style.backgroundColor = '#f5f5f5')}
            title={frozenState ? 'Restore to frozen state' : 'No frozen state'}
          >
            Revert
          </button>
        </div>
      </div>

    </div>
  )
}
