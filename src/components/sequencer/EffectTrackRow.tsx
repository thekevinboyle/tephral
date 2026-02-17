import { useCallback, useState, useEffect, useRef } from 'react'
import { useEffectSequencerStore, type EffectTrack } from '../../stores/effectSequencerStore'
import { EffectStepCell } from './EffectStepCell'

const SEQ = '#9580FF'
const HOLD_MS = 250

interface EffectTrackRowProps {
  effectId: string
  track: EffectTrack
  stepPage: number
  currentStep: number
  selectedStep: { effectId: string; stepIndex: number } | null
  color: string
  label: string
  isSelectedTrack?: boolean
}

export function EffectTrackRow({
  effectId,
  track,
  stepPage,
  currentStep,
  selectedStep,
  color,
  label,
  isSelectedTrack,
}: EffectTrackRowProps) {
  const {
    setTrackMode,
    setTrackMuted,
    setTrackSoloed,
    setStepActive,
    selectStep,
    addToSelection,
    clearSelection,
  } = useEffectSequencerStore()

  // Drag-to-draw state
  const [isDragging, setIsDragging] = useState(false)
  const [dragValue, setDragValue] = useState<boolean | null>(null)

  // Hold-to-plock state
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const holdStep = useRef<number | null>(null)
  const didHold = useRef(false)

  // Page-based display (8 steps per page)
  const pageStart = stepPage * 8
  const visibleSteps = track.steps.slice(pageStart, pageStart + 8)

  const cancelHold = useCallback(() => {
    if (holdTimer.current !== null) {
      clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
    holdStep.current = null
  }, [])

  const handleCellMouseDown = useCallback(
    (stepIndex: number, e: React.MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()

      if (e.shiftKey) {
        addToSelection(effectId, stepIndex)
        return
      }

      // Start hold detection
      didHold.current = false
      holdStep.current = stepIndex
      holdTimer.current = setTimeout(() => {
        didHold.current = true
        holdTimer.current = null
        // Hold fired → enter p-lock mode
        const step = track.steps[stepIndex]
        if (!step.active) {
          setStepActive(effectId, stepIndex, true)
        }
        selectStep(effectId, stepIndex)
      }, HOLD_MS)
    },
    [effectId, track.steps, selectStep, addToSelection, setStepActive],
  )

  const handleCellMouseUp = useCallback(
    (stepIndex: number) => {
      if (didHold.current) return // Hold already handled
      cancelHold()

      // Short click → toggle on/off
      const step = track.steps[stepIndex]
      setStepActive(effectId, stepIndex, !step.active)
      if (step.active) {
        // Turning off → clear selection if this step was selected
        if (
          selectedStep?.effectId === effectId &&
          selectedStep?.stepIndex === stepIndex
        ) {
          clearSelection()
        }
      }
    },
    [effectId, track.steps, setStepActive, clearSelection, selectedStep, cancelHold],
  )

  const handleCellMouseEnter = useCallback(
    (stepIndex: number) => {
      // If we're mid-hold and mouse moves to another cell, cancel hold + start drag paint
      if (holdStep.current !== null && holdStep.current !== stepIndex) {
        const wasActive = track.steps[holdStep.current]?.active
        cancelHold()
        didHold.current = true // Prevent mouseUp toggle
        const paintValue = !wasActive
        setIsDragging(true)
        setDragValue(paintValue)
        // Paint the original cell
        if (track.steps[holdStep.current]?.active !== paintValue) {
          setStepActive(effectId, holdStep.current, paintValue)
        }
        // Paint the entered cell
        if (track.steps[stepIndex]?.active !== paintValue) {
          setStepActive(effectId, stepIndex, paintValue)
        }
        return
      }

      if (isDragging && dragValue !== null) {
        if (track.steps[stepIndex].active !== dragValue) {
          setStepActive(effectId, stepIndex, dragValue)
        }
      }
    },
    [isDragging, dragValue, effectId, track.steps, setStepActive, cancelHold],
  )

  const handleCellDoubleClick = useCallback(
    (_stepIndex: number) => {
      // No-op: click toggles, hold enters p-lock
    },
    [],
  )

  // Global mouseup to end drag + cancel any pending hold
  useEffect(() => {
    const handleUp = () => {
      cancelHold()
      setIsDragging(false)
      setDragValue(null)
    }
    window.addEventListener('mouseup', handleUp)
    return () => window.removeEventListener('mouseup', handleUp)
  }, [cancelHold])

  const isPlayheadOnPage =
    currentStep >= pageStart && currentStep < pageStart + 8

  // Dim tracks where no steps are active
  const hasAnyActiveSteps = track.steps.some((s) => s.active)

  return (
    <div
      className="flex"
      style={{
        borderBottom: '1px solid var(--border)',
        borderLeft: isSelectedTrack ? `3px solid ${color}` : '3px solid transparent',
        opacity: track.muted ? 0.4 : hasAnyActiveSteps ? 1 : 0.55,
        transition: 'opacity 0.15s, border-color 0.1s',
      }}
    >
      {/* Track header */}
      <div
        className="flex-shrink-0 flex flex-col justify-center gap-1"
        style={{
          width: 100,
          padding: '4px 8px',
          borderRight: '1px solid var(--border)',
        }}
      >
        {/* Effect label */}
        <span
          className="text-[9px] font-bold uppercase tracking-wider truncate"
          style={{ color }}
        >
          {label}
        </span>

        {/* Controls row: Mode, Mute, Solo */}
        <div className="flex items-center gap-1">
          {/* Mode toggle */}
          <button
            onClick={() =>
              setTrackMode(effectId, track.mode === 'gate' ? 'param' : 'gate')
            }
            className="text-[9px] font-bold px-1 rounded-sm"
            style={{
              backgroundColor:
                track.mode === 'gate'
                  ? `${SEQ}20`
                  : `${SEQ}20`,
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
            onClick={() => setTrackMuted(effectId, !track.muted)}
            className="text-[9px] font-bold px-1 rounded-sm"
            style={{
              backgroundColor: track.muted
                ? 'rgba(255, 100, 100, 0.2)'
                : 'transparent',
              color: track.muted ? '#ff6666' : 'var(--text-ghost)',
              border: '1px solid var(--border)',
            }}
            title="Mute track"
          >
            M
          </button>

          {/* Solo */}
          <button
            onClick={() => setTrackSoloed(effectId, !track.soloed)}
            className="text-[9px] font-bold px-1 rounded-sm"
            style={{
              backgroundColor: track.soloed
                ? `${SEQ}30`
                : 'transparent',
              color: track.soloed ? SEQ : 'var(--text-ghost)',
              border: '1px solid var(--border)',
            }}
            title="Solo track"
          >
            S
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

          return (
            <EffectStepCell
              key={actualIndex}
              stepIndex={actualIndex}
              step={step}
              isCurrentStep={isCurrent}
              isSelected={isSelected}
              onMouseDown={handleCellMouseDown}
              onMouseUp={handleCellMouseUp}
              onMouseEnter={handleCellMouseEnter}
              onDoubleClick={handleCellDoubleClick}
            />
          )
        })}
      </div>
    </div>
  )
}
