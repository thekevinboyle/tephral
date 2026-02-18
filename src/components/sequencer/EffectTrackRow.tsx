import { useCallback, useState, useEffect, useMemo } from 'react'
import { useEffectSequencerStore, type EffectTrack } from '../../stores/effectSequencerStore'
import { EffectStepCell } from './EffectStepCell'
import { EFFECT_PARAM_REGISTRY } from '../../config/effectParams'

const SEQ = '#9580FF'

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
  color,
  label,
  isSelectedTrack,
  onSelectTrack,
}: EffectTrackRowProps) {
  const {
    setTrackMode,
    setTrackMuted,
    setTrackSoloed,
    setStepActive,
    setStepLock,
    addToSelection,
    automationParam,
  } = useEffectSequencerStore()

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
        opacity: track.muted ? 0.4 : hasAnyActiveSteps ? 1 : 0.55,
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
