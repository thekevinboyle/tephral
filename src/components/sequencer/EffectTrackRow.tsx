import { useCallback, useState, useEffect, useMemo } from 'react'
import { useEffectSequencerStore, type EffectTrack } from '../../stores/effectSequencerStore'
import { useAudioSourceStore } from '../../stores/audioSourceStore'
import { useMIDIStore } from '../../stores/midiStore'
import { EffectStepCell } from './EffectStepCell'
import { EFFECT_PARAM_REGISTRY } from '../../config/effectParams'

const SEQ = '#9580FF'
const MIDI_COLOR = '#00AAFF'

// MIDI note number to name
function midiNoteName(note: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  const octave = Math.floor(note / 12) - 1
  return `${names[note % 12]}${octave}`
}

interface EffectTrackRowProps {
  effectId: string
  track: EffectTrack
  stepPage: number
  currentStep: number
  selectedStep: { effectId: string; stepIndex: number } | null
  color: string
  label: string
  isSelectedTrack?: boolean
  onSelectTrack?: (effectId: string) => void
}

export function EffectTrackRow({
  effectId,
  track,
  stepPage,
  currentStep,
  selectedStep,
  color: _color,
  label,
  isSelectedTrack,
  onSelectTrack,
}: EffectTrackRowProps) {
  void _color
  const {
    setTrackMode,
    setTrackMuted,
    setTrackSoloed,
    setTrackAudioGate,
    setTrackMidiGate,
    setStepActive,
    setStepLock,
    addToSelection,
    automationParam,
  } = useEffectSequencerStore()

  const audioGateLevel = useEffectSequencerStore((s) => s.audioGateLevel)
  const gateThreshold = useAudioSourceStore((s) => s.gateThreshold)
  const trackNoteMap = useMIDIStore((s) => s.trackNoteMap)
  const noteStates = useMIDIStore((s) => s.noteStates)
  const setNoteForTrack = useMIDIStore((s) => s.setNoteForTrack)
  const removeNoteMapping = useMIDIStore((s) => s.removeNoteMapping)

  const [midiLearnMode, setMidiLearnMode] = useState(false)
  const mappedNote = trackNoteMap[effectId]

  // MIDI learn: listen for next note
  useEffect(() => {
    if (!midiLearnMode) return
    let prevNoteStates = { ...useMIDIStore.getState().noteStates }
    const unsubscribe = useMIDIStore.subscribe((state) => {
      for (const [noteStr, isOn] of Object.entries(state.noteStates)) {
        if (isOn && !prevNoteStates[parseInt(noteStr)]) {
          const note = parseInt(noteStr)
          setNoteForTrack(effectId, note)
          setMidiLearnMode(false)
          break
        }
      }
      prevNoteStates = { ...state.noteStates }
    })
    return () => unsubscribe()
  }, [midiLearnMode, effectId, setNoteForTrack])

  // Drag-to-draw state
  const [isDragging, setIsDragging] = useState(false)
  const [dragValue, setDragValue] = useState<boolean | null>(null)

  // Page-based display (8 steps per page)
  const pageStart = stepPage * 8
  const visibleSteps = track.steps.slice(pageStart, pageStart + 8)

  // Does automation target this track?
  const automationTargetsThis = automationParam?.effectId === effectId
  const automationParamId = automationTargetsThis ? automationParam!.paramId : null
  const automationMin = automationTargetsThis ? automationParam!.min : 0
  const automationMax = automationTargetsThis ? automationParam!.max : 1
  const automationStep = automationTargetsThis ? automationParam!.step : 0.01

  // Build param range map for generic lock fill normalization
  const paramRanges = useMemo(() => {
    const entry = EFFECT_PARAM_REGISTRY[effectId]
    if (!entry) return null
    const map = new Map<string, { min: number; max: number }>()
    for (const p of entry.getParams()) {
      map.set(p.id, { min: p.min, max: p.max })
    }
    return map
  }, [effectId])

  const handleCellMouseDown = useCallback(
    (stepIndex: number, e: React.MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()

      if (e.shiftKey) {
        addToSelection(effectId, stepIndex)
        return
      }

      // Immediate toggle on left click
      const step = track.steps[stepIndex]
      const newValue = !step.active
      setStepActive(effectId, stepIndex, newValue)

      // Start drag-to-paint
      setIsDragging(true)
      setDragValue(newValue)
    },
    [effectId, track.steps, addToSelection, setStepActive],
  )

  const handleCellMouseEnter = useCallback(
    (stepIndex: number) => {
      if (isDragging && dragValue !== null) {
        if (track.steps[stepIndex].active !== dragValue) {
          setStepActive(effectId, stepIndex, dragValue)
        }
      }
    },
    [isDragging, dragValue, effectId, track.steps, setStepActive],
  )

  const handleSetLock = useCallback(
    (stepIndex: number, value: number) => {
      if (!automationParamId) return
      setStepLock(effectId, stepIndex, automationParamId, value)
    },
    [effectId, automationParamId, setStepLock],
  )

  const handleActivateStep = useCallback(
    (stepIndex: number) => {
      setStepActive(effectId, stepIndex, true)
    },
    [effectId, setStepActive],
  )

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
  }, [])

  // Global mouseup to end drag
  useEffect(() => {
    const handleUp = () => {
      setIsDragging(false)
      setDragValue(null)
    }
    window.addEventListener('mouseup', handleUp)
    return () => window.removeEventListener('mouseup', handleUp)
  }, [])

  const isPlayheadOnPage =
    currentStep >= pageStart && currentStep < pageStart + 8

  // Dim tracks where no steps are active
  const hasAnyActiveSteps = track.steps.some((s) => s.active)

  return (
    <div
      className="flex"
      style={{
        borderBottom: isSelectedTrack ? '2px solid var(--border)' : '1px solid transparent',
        borderTop: isSelectedTrack ? '2px solid var(--border)' : '1px solid transparent',
        borderLeft: isSelectedTrack ? '3px solid var(--border)' : '3px solid transparent',
        borderRight: isSelectedTrack ? '2px solid var(--border)' : '1px solid transparent',
        opacity: track.muted ? 0.4 : (hasAnyActiveSteps || track.audioGate || track.midiGate) ? 1 : 0.55,
        transition: 'opacity 0.15s, border-color 0.1s',
      }}
    >
      {/* Track header */}
      <div
        className="flex-shrink-0 flex flex-col justify-center gap-1 cursor-pointer"
        style={{
          width: 130,
          padding: '4px 10px',
          borderRight: '2px solid var(--border)',
          backgroundColor: 'var(--bg-primary)',
        }}
        onClick={() => onSelectTrack?.(effectId)}
      >
        {/* Effect label */}
        <span
          className="text-[11px] font-bold uppercase tracking-wider truncate"
          style={{ color: 'var(--text-secondary)' }}
        >
          {label}
        </span>

        {/* Controls row: Mode, Mute, Solo */}
        <div className="flex items-center gap-1.5">
          {/* Mode toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setTrackMode(effectId, track.mode === 'gate' ? 'param' : 'gate')
            }}
            className="text-[11px] font-bold w-6 h-6 flex items-center justify-center rounded-sm"
            style={{
              backgroundColor: `${SEQ}20`,
              color: SEQ,
              border: `1px solid ${SEQ}40`,
            }}
            title={
              track.mode === 'gate'
                ? 'Gate mode: steps toggle effect on/off'
                : 'Param mode: steps change parameters only'
            }
          >
            {track.mode === 'gate' ? 'G' : 'P'}
          </button>

          {/* Mute */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setTrackMuted(effectId, !track.muted)
            }}
            className="text-[11px] font-bold w-6 h-6 flex items-center justify-center rounded-sm"
            style={{
              backgroundColor: track.muted
                ? 'rgba(255, 100, 100, 0.2)'
                : 'transparent',
              color: track.muted ? '#ff6666' : 'var(--border)',
              border: '1px solid var(--border)',
            }}
            title="Mute track"
          >
            M
          </button>

          {/* Solo */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setTrackSoloed(effectId, !track.soloed)
            }}
            className="text-[11px] font-bold w-6 h-6 flex items-center justify-center rounded-sm"
            style={{
              backgroundColor: track.soloed
                ? `${SEQ}30`
                : 'transparent',
              color: track.soloed ? SEQ : 'var(--border)',
              border: '1px solid var(--border)',
            }}
            title="Solo track"
          >
            S
          </button>

          {/* Audio Gate */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              setTrackAudioGate(effectId, !track.audioGate)
            }}
            className="text-[11px] font-bold w-6 h-6 flex items-center justify-center rounded-sm relative overflow-hidden"
            style={{
              backgroundColor: track.audioGate
                ? 'rgba(255, 204, 0, 0.2)'
                : 'transparent',
              color: track.audioGate ? '#FFCC00' : 'var(--border)',
              border: `1px solid ${track.audioGate ? '#FFCC0060' : 'var(--border)'}`,
            }}
            title="Audio gate: video audio amplitude triggers effect"
          >
            {track.audioGate && (
              <span
                className="absolute inset-0 rounded-sm"
                style={{
                  backgroundColor: '#FFCC00',
                  opacity: audioGateLevel > gateThreshold ? 0.5 : 0,
                  transition: 'opacity 0.05s',
                }}
              />
            )}
            <span className="relative z-10">A</span>
          </button>

          {/* MIDI Note Gate */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (track.midiGate && mappedNote !== undefined) {
                // Already mapped — click to clear and re-learn
                removeNoteMapping(effectId)
                setTrackMidiGate(effectId, false)
                setMidiLearnMode(false)
              } else if (midiLearnMode) {
                // Cancel learn mode
                setMidiLearnMode(false)
                if (mappedNote === undefined) setTrackMidiGate(effectId, false)
              } else {
                // Enter learn mode
                setTrackMidiGate(effectId, true)
                setMidiLearnMode(true)
              }
            }}
            className="text-[11px] font-bold h-6 flex items-center justify-center rounded-sm relative overflow-hidden"
            style={{
              minWidth: 24,
              paddingLeft: 2,
              paddingRight: 2,
              backgroundColor: track.midiGate
                ? `${MIDI_COLOR}20`
                : 'transparent',
              color: midiLearnMode ? MIDI_COLOR : track.midiGate ? MIDI_COLOR : 'var(--border)',
              border: `1px solid ${track.midiGate ? `${MIDI_COLOR}60` : 'var(--border)'}`,
              animation: midiLearnMode ? 'pulse 0.8s infinite' : 'none',
            }}
            title={
              midiLearnMode
                ? 'Waiting for MIDI note...'
                : track.midiGate && mappedNote !== undefined
                  ? `MIDI note: ${midiNoteName(mappedNote)} (click to clear)`
                  : 'MIDI note gate: assign a MIDI note to trigger this effect'
            }
          >
            {track.midiGate && mappedNote !== undefined && (noteStates[mappedNote] ?? false) && (
              <span
                className="absolute inset-0 rounded-sm"
                style={{
                  backgroundColor: MIDI_COLOR,
                  opacity: 0.5,
                  transition: 'opacity 0.05s',
                }}
              />
            )}
            <span className="relative z-10 text-[9px]">
              {midiLearnMode ? '...' : mappedNote !== undefined ? midiNoteName(mappedNote) : 'N'}
            </span>
          </button>
        </div>
      </div>

      {/* Step cells grid */}
      <div
        className="flex-1 min-w-0"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(8, 1fr)',
          gap: 4,
          padding: '4px 3px',
        }}
      >
        {visibleSteps.map((step, index) => {
          const actualIndex = pageStart + index
          const isCurrent = isPlayheadOnPage && currentStep === actualIndex
          const isSelected =
            selectedStep?.effectId === effectId &&
            selectedStep?.stepIndex === actualIndex

          const lockValue = automationParamId != null
            ? step.locks[automationParamId] as number | undefined
            : undefined

          // Compute generic lock fill when no automation param is targeted
          let genericLockFill: number | undefined
          if (automationParamId == null && paramRanges && Object.keys(step.locks).length > 0) {
            let sum = 0
            let count = 0
            for (const [paramId, val] of Object.entries(step.locks)) {
              const range = paramRanges.get(paramId)
              if (range && typeof val === 'number') {
                sum += (val - range.min) / (range.max - range.min || 1)
                count++
              }
            }
            if (count > 0) genericLockFill = sum / count
          }

          return (
            <EffectStepCell
              key={actualIndex}
              stepIndex={actualIndex}
              step={step}
              isCurrentStep={isCurrent}
              isSelected={isSelected}
              onMouseDown={handleCellMouseDown}
              onMouseEnter={handleCellMouseEnter}
              onContextMenu={handleContextMenu}
              automationParamId={automationParamId}
              automationMin={automationMin}
              automationMax={automationMax}
              automationStep={automationStep}
              lockValue={lockValue}
              genericLockFill={genericLockFill}
              onSetLock={handleSetLock}
              onActivateStep={handleActivateStep}
            />
          )
        })}
      </div>
    </div>
  )
}
