import { useCallback } from 'react'
import { PlayIcon, StopIcon, UndoIcon, MicIcon } from '../ui/DotMatrixIcons'
import { useSequencerStore, type StepResolution, type StepMode } from '../../stores/sequencerStore'
import { useSequencerPlayback } from '../../hooks/useSequencerPlayback'
import { useAudioAnalysis } from '../../hooks/useAudioAnalysis'
import { Track } from './Track'
import { StepLCDDisplay } from './StepLCDDisplay'

const RESOLUTION_OPTIONS: StepResolution[] = ['1/4', '1/8', '1/16', '1/32']
const MODE_OPTIONS: { value: StepMode; label: string }[] = [
  { value: 'forward', label: '→ FWD' },
  { value: 'backward', label: '← BWD' },
  { value: 'pendulum', label: '↔ PND' },
  { value: 'random', label: '? RND' },
]

const ACCENT_COLOR = '#FF0055'

export function StepSequencerPanel() {
  const {
    isPlaying,
    bpm,
    stepResolution,
    tracks,
    globalMode,
    fillModeActive,
    previousStepsSnapshot,
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
    setAudioReactive,
  } = useSequencerStore()

  // Initialize playback engine
  useSequencerPlayback()

  // Initialize audio analysis
  useAudioAnalysis()

  const handleBpmDrag = useCallback((startY: number, startValue: number) => {
    const handleMove = (e: MouseEvent) => {
      const deltaY = startY - e.clientY
      const newBpm = Math.max(20, Math.min(300, startValue + Math.round(deltaY / 2)))
      setBpm(newBpm)
    }

    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }, [setBpm])

  const handleResolutionCycle = useCallback(() => {
    const currentIndex = RESOLUTION_OPTIONS.indexOf(stepResolution)
    const nextIndex = (currentIndex + 1) % RESOLUTION_OPTIONS.length
    setStepResolution(RESOLUTION_OPTIONS[nextIndex])
  }, [stepResolution, setStepResolution])

  const handleModeCycle = useCallback(() => {
    const currentIndex = MODE_OPTIONS.findIndex(m => m.value === globalMode)
    const nextIndex = (currentIndex + 1) % MODE_OPTIONS.length
    setGlobalMode(MODE_OPTIONS[nextIndex].value)
  }, [globalMode, setGlobalMode])

  return (
    <div
      className="flex-1 flex flex-col min-h-0 h-full"
      style={{ fontFamily: 'var(--font-mono, monospace)' }}
    >
      {/* LCD Display */}
      <StepLCDDisplay />

      {/* Header - Euclid style controls */}
      <div
        className="flex items-center gap-3 px-3 py-1.5"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {/* Play/Stop */}
        <button
          onClick={isPlaying ? stop : play}
          className="w-6 h-6 flex items-center justify-center rounded-sm transition-colors"
          style={{
            backgroundColor: isPlaying ? ACCENT_COLOR : 'rgba(255, 255, 255, 0.08)',
            boxShadow: isPlaying ? `0 0 8px ${ACCENT_COLOR}` : 'none',
          }}
        >
          {isPlaying ? (
            <StopIcon size={10} color="var(--bg-primary)" />
          ) : (
            <PlayIcon size={10} color="var(--text-muted)" />
          )}
        </button>

        {/* BPM - drag to adjust */}
        <div
          className="text-[11px] cursor-ns-resize select-none"
          style={{ color: 'var(--text-secondary)' }}
          onMouseDown={(e) => handleBpmDrag(e.clientY, bpm)}
        >
          <span style={{ opacity: 0.6 }}>BPM</span>{' '}
          <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
            {String(bpm).padStart(3, '0')}
          </span>
        </div>

        {/* Resolution */}
        <button
          onClick={handleResolutionCycle}
          className="text-[11px] font-bold px-1.5 py-0.5 rounded-sm"
          style={{
            color: 'var(--text-primary)',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
          }}
        >
          {stepResolution}
        </button>

        {/* Mode */}
        <button
          onClick={handleModeCycle}
          className="text-[11px] font-bold px-1.5 py-0.5 rounded-sm"
          style={{
            color: 'var(--text-primary)',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
          }}
        >
          {MODE_OPTIONS.find(m => m.value === globalMode)?.label || '→ FWD'}
        </button>

        {/* Audio Reactive Toggle */}
        <button
          onClick={() => setAudioReactive(!audioReactive)}
          className="w-5 h-5 flex items-center justify-center rounded-sm transition-all"
          style={{
            backgroundColor: audioReactive ? ACCENT_COLOR : 'transparent',
            boxShadow: audioReactive ? `0 0 8px ${ACCENT_COLOR}` : 'none',
          }}
          title="Audio reactive mode"
        >
          <MicIcon size={10} color={audioReactive ? 'var(--bg-primary)' : 'var(--text-ghost)'} />
        </button>
        {audioReactive && (
          <div
            className="w-1 h-3 rounded-sm"
            style={{
              backgroundColor: ACCENT_COLOR,
              opacity: 0.3 + audioLevel * 0.7,
              transform: `scaleY(${0.3 + audioLevel * 0.7})`,
            }}
          />
        )}

        <div className="flex-1" />

        {/* Fill */}
        <button
          onClick={() => setFillModeActive(!fillModeActive)}
          className="text-[11px] font-bold px-1.5 py-0.5 rounded-sm transition-colors"
          style={{
            color: fillModeActive ? 'var(--bg-primary)' : 'var(--text-primary)',
            backgroundColor: fillModeActive ? ACCENT_COLOR : 'rgba(255, 255, 255, 0.08)',
            boxShadow: fillModeActive ? `0 0 8px ${ACCENT_COLOR}` : 'none',
          }}
          title={fillModeActive ? 'Click a track to fill/clear' : 'Enter fill mode'}
        >
          FILL
        </button>

        {/* Random */}
        <button
          onClick={() => randomizeAllTracks()}
          className="text-[11px] font-bold px-1.5 py-0.5 rounded-sm"
          style={{
            color: 'var(--text-primary)',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
          }}
          title="Randomize all tracks"
        >
          RAND
        </button>

        {/* Undo */}
        <button
          onClick={undoRandomize}
          disabled={!previousStepsSnapshot}
          className="w-5 h-5 flex items-center justify-center rounded-sm"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            opacity: previousStepsSnapshot ? 1 : 0.4,
          }}
          title="Undo last randomize"
        >
          <UndoIcon size={10} color="var(--text-muted)" />
        </button>
      </div>

      {/* Track list - scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0">
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
          <div className="flex flex-col">
            {tracks.map((track) => (
              <Track key={track.id} track={track} />
            ))}
          </div>
        )}
      </div>

      {/* Add Track button */}
      <button
        onClick={addTrack}
        className="text-[11px] uppercase tracking-wider py-2 text-center"
        style={{
          color: 'var(--text-muted)',
          borderTop: '1px solid var(--border)',
        }}
      >
        + ADD TRACK
      </button>
    </div>
  )
}
