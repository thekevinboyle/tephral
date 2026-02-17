import { memo } from 'react'
import type { EffectStep } from '../../stores/effectSequencerStore'

const SEQ = '#9580FF'
const PLOCK = '#FF4060'

interface EffectStepCellProps {
  stepIndex: number
  step: EffectStep
  isCurrentStep: boolean
  isSelected: boolean
  onMouseDown: (stepIndex: number, e: React.MouseEvent) => void
  onMouseUp: (stepIndex: number) => void
  onMouseEnter: (stepIndex: number) => void
  onDoubleClick: (stepIndex: number) => void
}

export const EffectStepCell = memo(function EffectStepCell({
  stepIndex,
  step,
  isCurrentStep,
  isSelected,
  onMouseDown,
  onMouseUp,
  onMouseEnter,
  onDoubleClick,
}: EffectStepCellProps) {
  const hasLocks = Object.keys(step.locks).length > 0
  const hasProbability = step.probability < 1
  const isPlayheadHit = isCurrentStep && step.active

  return (
    <div
      onMouseDown={(e) => onMouseDown(stepIndex, e)}
      onMouseUp={() => onMouseUp(stepIndex)}
      onMouseEnter={() => onMouseEnter(stepIndex)}
      onDoubleClick={() => onDoubleClick(stepIndex)}
      onClick={(e) => e.stopPropagation()}
      className="relative cursor-pointer select-none flex flex-col justify-end"
      style={{
        height: '100%',
        minHeight: 56,
        borderRadius: 3,
        backgroundColor: isPlayheadHit
          ? 'var(--bg-hover)'
          : 'var(--bg-elevated)',
        border: isSelected
          ? `2px solid ${SEQ}`
          : step.active && hasLocks
            ? `1.5px solid ${PLOCK}80`
            : '1px solid var(--border)',
        boxShadow: isSelected
          ? `0 0 6px ${SEQ}40`
          : step.active && hasLocks
            ? `0 0 5px ${PLOCK}30, 0 0 10px ${PLOCK}15`
            : isPlayheadHit
              ? `inset 0 0 8px ${SEQ}12`
              : 'none',
        opacity: hasProbability && step.active ? 0.7 : 1,
        transition: 'background-color 0.06s, border-color 0.06s, box-shadow 0.1s',
      }}
      title={`Step ${stepIndex + 1}${hasLocks ? ` (${Object.keys(step.locks).length} lock${Object.keys(step.locks).length > 1 ? 's' : ''})` : ''}`}
    >
      {/* Trig bar — solid bar at bottom for active steps */}
      {step.active && (
        <div
          style={{
            height: 4,
            margin: '0 3px 3px',
            borderRadius: 1,
            backgroundColor: hasLocks ? PLOCK : SEQ,
            opacity: isPlayheadHit ? 1 : 0.85,
            transition: 'opacity 0.06s',
          }}
        />
      )}
    </div>
  )
})
