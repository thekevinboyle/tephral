import { useCallback } from 'react'
import { PlayIcon, StopIcon, DiceIcon, ShuffleIcon, SlidersIcon, ClearIcon } from '../ui/DotMatrixIcons'
import { useEffectSequencerStore, type EffectStepResolution } from '../../stores/effectSequencerStore'
import { useMIDIStore } from '../../stores/midiStore'
import { useAudioSourceStore } from '../../stores/audioSourceStore'
import { useUIStore } from '../../stores/uiStore'
import { getUIStatusText } from '../../config/statusDescriptions'
import { EFFECT_PARAM_REGISTRY } from '../../config/effectParams'
import { displayParamLabel } from '../../config/paramNames'
import { statusHover } from '../../utils/statusHover'

const MIDI_COLOR = '#00AAFF'
const AUDIO_COLOR = '#FF8800'


function RandomizeButton() {
  const selectedEffectId = useUIStore((s) => s.selectedEffectId)
  const setStatusText = useUIStore((s) => s.setStatusText)
  const randomizeTrack = useEffectSequencerStore((s) => s.randomizeTrack)

  const handleClick = useCallback(() => {
    if (selectedEffectId) randomizeTrack(selectedEffectId)
  }, [selectedEffectId, randomizeTrack])

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setStatusText(getUIStatusText('randomizeSteps'))}
      onMouseLeave={() => setStatusText(null)}
      className="h-7 px-2 flex items-center justify-center gap-1.5 rounded-sm text-[11px]"
      style={{
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        opacity: selectedEffectId ? 1 : 0.5,
      }}
      title="Randomize steps on selected track"
      aria-label="Randomize track steps"
    >
      <DiceIcon size={14} color={selectedEffectId ? 'var(--text-secondary)' : 'var(--text-ghost)'} />
      <span aria-hidden style={{ color: selectedEffectId ? 'var(--text-secondary)' : 'var(--text-muted)' }}>Random</span>
    </button>
  )
}

function RandomizeAllButton() {
  const setStatusText = useUIStore((s) => s.setStatusText)
  const randomizeAllTracks = useEffectSequencerStore((s) => s.randomizeAllTracks)
  const tracks = useEffectSequencerStore((s) => s.tracks)
  const hasTracks = Object.keys(tracks).length > 0

  return (
    <button
      onClick={() => randomizeAllTracks()}
      onMouseEnter={() => setStatusText('Randomize steps on all tracks')}
      onMouseLeave={() => setStatusText(null)}
      className="h-7 px-2 flex items-center justify-center gap-1.5 rounded-sm text-[11px]"
      style={{
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        opacity: hasTracks ? 1 : 0.5,
      }}
      title="Randomize steps on all tracks"
      aria-label="Randomize all tracks"
    >
      <ShuffleIcon size={14} color={hasTracks ? 'var(--text-secondary)' : 'var(--text-ghost)'} />
      <span aria-hidden style={{ color: hasTracks ? 'var(--text-secondary)' : 'var(--text-muted)' }}>All tracks</span>
    </button>
  )
}

function RandomizeLocksButton() {
  const selectedEffectId = useUIStore((s) => s.selectedEffectId)
  const setStatusText = useUIStore((s) => s.setStatusText)
  const randomizeLocks = useEffectSequencerStore((s) => s.randomizeLocks)
  const setAutomationParam = useEffectSequencerStore((s) => s.setAutomationParam)

  const handleClick = useCallback(() => {
    if (!selectedEffectId) return
    const entry = EFFECT_PARAM_REGISTRY[selectedEffectId]
    if (!entry) return
    const allParams = entry.getParams()
    const params = allParams.map((p) => ({
      id: p.id,
      min: p.min,
      max: p.max,
      step: p.step,
    }))
    randomizeLocks(selectedEffectId, params)

    // Auto-set automation target to first param so user can adjust locks
    if (allParams.length > 0) {
      const p = allParams[0]
      setAutomationParam({
        effectId: selectedEffectId,
        paramId: p.id,
        fullParamId: `${selectedEffectId}.${p.id}`,
        label: displayParamLabel(selectedEffectId, p),
        min: p.min,
        max: p.max,
        step: p.step,
      })
    }
  }, [selectedEffectId, randomizeLocks, setAutomationParam])

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setStatusText(getUIStatusText('randomizeLocks'))}
      onMouseLeave={() => setStatusText(null)}
      className="h-7 px-2 flex items-center justify-center gap-1.5 rounded-sm text-[11px]"
      style={{
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        opacity: selectedEffectId ? 1 : 0.5,
      }}
      title="Randomize p-locks on selected track"
      aria-label="Randomize track p-locks"
    >
      <SlidersIcon size={14} color={selectedEffectId ? 'var(--text-secondary)' : 'var(--text-ghost)'} />
      <span aria-hidden style={{ color: selectedEffectId ? 'var(--text-secondary)' : 'var(--text-muted)' }}>P-locks</span>
    </button>
  )
}

function ClearTrackButton() {
  const selectedEffectId = useUIStore((s) => s.selectedEffectId)
  const setStatusText = useUIStore((s) => s.setStatusText)
  const clearTrack = useEffectSequencerStore((s) => s.clearTrack)

  const handleClick = useCallback(() => {
    if (selectedEffectId) clearTrack(selectedEffectId)
  }, [selectedEffectId, clearTrack])

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setStatusText(getUIStatusText('clearTrack'))}
      onMouseLeave={() => setStatusText(null)}
      className="h-7 px-2 flex items-center justify-center gap-1.5 rounded-sm text-[11px]"
      style={{
        backgroundColor: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        opacity: selectedEffectId ? 1 : 0.5,
      }}
      title="Clear steps on selected track"
      aria-label="Clear track steps"
    >
      <ClearIcon size={14} color={selectedEffectId ? 'var(--text-secondary)' : 'var(--text-ghost)'} />
      <span aria-hidden style={{ color: selectedEffectId ? 'var(--text-secondary)' : 'var(--text-muted)' }}>Clear</span>
    </button>
  )
}

interface SequencerTransportProps {
  isPlaying: boolean
  bpm: number
  resolution: string
  swing: number
  currentStep: number
  stepPage: number
  onPlay: () => void
  onStop: () => void
  onBpmChange: (bpm: number) => void
  onResolutionChange: (res: EffectStepResolution) => void
  onSwingChange: (swing: number) => void
  onPageChange: (page: number) => void
  /** Inside the bottom panel: play/stop and BPM live in the header, so hide them here. */
  compact?: boolean
}

export function SequencerTransport({
  isPlaying,
  bpm,
  resolution: _resolution,
  swing,
  currentStep,
  stepPage,
  onPlay,
  onStop,
  onBpmChange,
  onResolutionChange: _onResolutionChange,
  onSwingChange,
  onPageChange,
  compact = false,
}: SequencerTransportProps) {
  void _resolution
  void _onResolutionChange
  const setStatusText = useUIStore((s) => s.setStatusText)
  const clockSyncEnabled = useMIDIStore((s) => s.clockSyncEnabled)
  const clockBpm = useMIDIStore((s) => s.clockBpm)
  const isConnected = useMIDIStore((s) => s.isConnected)
  const midiInputs = useMIDIStore((s) => s.inputs)
  const setClockSyncEnabled = useMIDIStore((s) => s.setClockSyncEnabled)
  // Steps | Lines (lines editor spec §4.1): the Lines view hides the step tools and the page dots
  const view = useUIStore((s) => s.sequencerView)

  const audioBpm = useAudioSourceStore((s) => s.audioBpm)
  const audioBpmSyncEnabled = useAudioSourceStore((s) => s.audioBpmSyncEnabled)
  const setAudioBpmSyncEnabled = useAudioSourceStore((s) => s.setAudioBpmSyncEnabled)

  const isAudioSynced = audioBpm !== null && audioBpmSyncEnabled
  const isMidiSynced = clockSyncEnabled && clockBpm !== null

  const handleBpmDrag = useCallback(
    (e: React.MouseEvent) => {
      const startY = e.clientY
      const startBpm = bpm

      const handleMove = (ev: MouseEvent) => {
        const deltaY = startY - ev.clientY
        onBpmChange(Math.round(startBpm + deltaY / 2))
      }
      const handleUp = () => {
        window.removeEventListener('mousemove', handleMove)
        window.removeEventListener('mouseup', handleUp)
      }
      window.addEventListener('mousemove', handleMove)
      window.addEventListener('mouseup', handleUp)
    },
    [bpm, onBpmChange],
  )

  const handleSwingDrag = useCallback(
    (e: React.MouseEvent) => {
      const startY = e.clientY
      const startSwing = swing

      const handleMove = (ev: MouseEvent) => {
        const deltaY = startY - ev.clientY
        onSwingChange(Math.round(startSwing + deltaY / 2))
      }
      const handleUp = () => {
        window.removeEventListener('mousemove', handleMove)
        window.removeEventListener('mouseup', handleUp)
      }
      window.addEventListener('mousemove', handleMove)
      window.addEventListener('mouseup', handleUp)
    },
    [swing, onSwingChange],
  )


  return (
    <div
      className="flex-shrink-0 flex items-center"
      style={{
        padding: '0 var(--panel-padding)',
        gap: 0,
        minHeight: view === 'lines' ? 40 : 64, // the Lines view gives the height to its graph
        backgroundColor: 'var(--bg-void)',
        borderBottom: '1px solid var(--border-light)',
      }}
    >
      {/* Group 1: Play + BPM + Sync */}
      <div className="flex items-center gap-3" style={{ marginRight: 16 }}>
        {!compact && (
          <>
        <button
          onClick={isPlaying ? onStop : onPlay}
          aria-label={isPlaying ? 'Stop sequencer' : 'Play sequencer'}
          onMouseEnter={(e) => {
            setStatusText(getUIStatusText('seqPlayStop'))
            if (!isPlaying) {
              e.currentTarget.style.backgroundColor = 'var(--bg-hover)'
              e.currentTarget.style.borderColor = 'var(--border-emphasis)'
            } else {
              e.currentTarget.style.filter = 'brightness(1.2)'
            }
          }}
          onMouseLeave={(e) => {
            setStatusText(null)
            e.currentTarget.style.backgroundColor = isPlaying ? 'var(--seq-accent)' : 'var(--bg-elevated)'
            e.currentTarget.style.borderColor = isPlaying ? 'var(--seq-accent)' : 'var(--border)'
            e.currentTarget.style.filter = 'none'
          }}
          className="w-11 h-11 flex items-center justify-center rounded-sm transition-all"
          style={{
            backgroundColor: isPlaying ? 'var(--seq-accent)' : 'var(--bg-elevated)',
            border: `1px solid ${isPlaying ? 'var(--seq-accent)' : 'var(--border)'}`,
            boxShadow: isPlaying ? '0 0 8px var(--seq-accent-glow)' : 'none',
          }}
        >
          {isPlaying ? (
            <StopIcon size={18} color="var(--bg-primary)" />
          ) : (
            <PlayIcon size={18} color="var(--text-muted)" />
          )}
        </button>

        <div
          className="select-none flex flex-col items-center"
          style={{
            cursor: isMidiSynced || isAudioSynced ? 'default' : 'ns-resize',
            lineHeight: 1.1,
          }}
          onMouseDown={isMidiSynced || isAudioSynced ? undefined : handleBpmDrag}
          onMouseEnter={() => setStatusText(getUIStatusText('seqBpm'))}
          onMouseLeave={() => setStatusText(null)}
        >
          <span className="text-[16px] font-bold tabular-nums" style={{ color: isMidiSynced ? MIDI_COLOR : isAudioSynced ? AUDIO_COLOR : 'var(--text-primary)' }}>
            {String(isMidiSynced ? clockBpm : bpm).padStart(3, '0')}
          </span>
          <span className="text-[9px] tracking-[0.15em] uppercase" style={{ color: isMidiSynced ? MIDI_COLOR : isAudioSynced ? AUDIO_COLOR : 'var(--text-muted)' }}>BPM</span>
        </div>

          </>
        )}

        {isConnected && midiInputs.length > 0 && (
          <button
            onClick={() => setClockSyncEnabled(!clockSyncEnabled)}
            onMouseEnter={() => setStatusText(getUIStatusText('seqSync'))}
            onMouseLeave={() => setStatusText(null)}
            className="text-[11px] font-medium px-1.5 py-0.5 rounded-sm"
            style={{
              backgroundColor: clockSyncEnabled ? `${MIDI_COLOR}20` : 'transparent',
              color: clockSyncEnabled ? MIDI_COLOR : 'var(--text-ghost)',
              border: `1px solid ${clockSyncEnabled ? `${MIDI_COLOR}40` : 'var(--border)'}`,
            }}
            title={clockSyncEnabled ? 'MIDI clock sync active' : 'Enable MIDI clock sync'}
          >
            MIDI sync
          </button>
        )}

        {audioBpm !== null && (
          <button
            onClick={() => {
              const next = !audioBpmSyncEnabled
              setAudioBpmSyncEnabled(next)
              if (next && audioBpm !== null) {
                useEffectSequencerStore.getState().setBpm(audioBpm)
              }
            }}
            onMouseEnter={() => setStatusText(`Audio BPM: ${audioBpm}. Click to ${audioBpmSyncEnabled ? 'unsync' : 'sync'}`)}
            onMouseLeave={() => setStatusText(null)}
            className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-sm"
            style={{
              backgroundColor: audioBpmSyncEnabled ? `${AUDIO_COLOR}20` : 'transparent',
              color: audioBpmSyncEnabled ? AUDIO_COLOR : 'var(--text-ghost)',
              border: `1px solid ${audioBpmSyncEnabled ? `${AUDIO_COLOR}40` : 'var(--border)'}`,
            }}
            title={audioBpmSyncEnabled ? `Synced to audio: ${audioBpm} BPM` : `Audio detected ${audioBpm} BPM. Click to sync`}
          >
            {audioBpmSyncEnabled ? `♪ ${audioBpm}` : `♪ ${audioBpm}`}
          </button>
        )}
      </div>

      {/* Steps | Lines */}
      <div className="seg-seq-view" role="group" aria-label="Sequencer view" style={{ marginRight: 16 }}>
        {(['steps', 'lines'] as const).map((v) => (
          <button key={v} type="button" data-seq-view={v} aria-pressed={view === v} onClick={() => useUIStore.getState().setSequencerView(v)}
            {...statusHover(v === 'lines' ? 'Lines: draw each effect\'s Dry/wet, and a master line over all of them' : 'Steps: the step grid')}>
            {v === 'lines' ? 'Lines' : 'Steps'}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="w-px h-6" style={{ backgroundColor: 'var(--border)', marginRight: 16 }} />

      {/* Group 2: Swing + Position */}
      <div className="flex items-center gap-3" style={{ marginRight: 16 }}>
        <div
          className="text-[12px] cursor-ns-resize select-none"
          style={{ color: 'var(--text-muted)' }}
          onMouseDown={handleSwingDrag}
          onMouseEnter={() => setStatusText(getUIStatusText('seqSwing'))}
          onMouseLeave={() => setStatusText(null)}
        >
          <span style={{ opacity: 0.7 }}>Swing</span>{' '}
          <span>{swing}</span>
        </div>

        <span
          className="text-[12px] tabular-nums"
          style={{ color: 'var(--text-ghost)' }}
        >
          {(currentStep % 8) + 1}/8
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-6" style={{ backgroundColor: 'var(--border)', marginRight: 16 }} />

      {/* Group 3: Track tools (Steps view only) */}
      {view === 'steps' && (
        <div className="flex items-center gap-1.5">
          <RandomizeButton />
          <RandomizeAllButton />
          <RandomizeLocksButton />
          <ClearTrackButton />
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Group 4: Page dots (Steps view only) */}
      {view === 'steps' && (
      <div className="flex items-center gap-1.5">
        {[0, 1, 2, 3].map((pg) => {
          const isActive = pg === stepPage
          const hasPlayhead =
            isPlaying &&
            currentStep >= pg * 8 &&
            currentStep < (pg + 1) * 8
          return (
            <button
              key={pg}
              onClick={() => onPageChange(pg)}
              onMouseEnter={() => setStatusText(getUIStatusText('seqPageDot'))}
              onMouseLeave={() => setStatusText(null)}
              className="w-2.5 h-2.5 rounded-full transition-all"
              style={{
                backgroundColor: isActive
                  ? 'var(--text-primary)'
                  : hasPlayhead
                    ? 'var(--text-muted)'
                    : 'transparent',
                border: `1.5px solid ${
                  isActive ? 'var(--text-primary)' : 'var(--text-muted)'
                }`,
                opacity: isActive ? 1 : 0.4,
              }}
              title={`Page ${pg + 1}`}
              aria-label={`Step page ${pg + 1}`}
              aria-pressed={isActive}
            />
          )
        })}
      </div>
      )}
    </div>
  )
}
