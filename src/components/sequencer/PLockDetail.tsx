import { useCallback } from 'react'
import { useEffectSequencerStore, type EffectStep } from '../../stores/effectSequencerStore'
import { EFFECT_PARAM_REGISTRY, type LockableParam } from '../../config/effectParams'

const SEQ = '#9580FF'

interface PLockDetailProps {
  effectId: string
  stepIndex: number
  step: EffectStep
  color: string
  label: string
}

export function PLockDetail({ effectId, stepIndex, step, color, label }: PLockDetailProps) {
  const { setStepLock, clearStepLock, clearAllStepLocks, clearSelection, selectedSteps } =
    useEffectSequencerStore()

  const entry = EFFECT_PARAM_REGISTRY[effectId]
  if (!entry) return null

  const params = entry.getParams()
  const multiCount = selectedSteps.length

  return (
    <div
      style={{
        padding: '6px 12px',
        backgroundColor: 'var(--bg-surface)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
        <div className="flex items-center gap-2">
          <span
            className="text-[9px] font-bold uppercase tracking-wider"
            style={{ color }}
          >
            {label}
          </span>
          <span
            className="text-[10px] tabular-nums"
            style={{ color: 'var(--text-muted)' }}
          >
            Step {stepIndex + 1}
            {multiCount > 1 && ` (+${multiCount - 1})`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {Object.keys(step.locks).length > 0 && (
            <button
              onClick={() => clearAllStepLocks(effectId, stepIndex)}
              className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm"
              style={{
                color: 'var(--text-ghost)',
                border: '1px solid var(--border)',
              }}
            >
              Clear
            </button>
          )}
          <button
            onClick={clearSelection}
            className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm"
            style={{
              color: 'var(--text-ghost)',
              border: '1px solid var(--border)',
            }}
          >
            Close
          </button>
        </div>
      </div>

      {/* Parameter sliders */}
      <div className="flex gap-4 flex-wrap">
        {params.map((param) => (
          <PLockSlider
            key={param.id}
            param={param}
            effectId={effectId}
            stepIndex={stepIndex}
            lockedValue={step.locks[param.id] as number | undefined}
            isLocked={param.id in step.locks}
            onLock={setStepLock}
            onClear={clearStepLock}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Individual Parameter Slider ──────────────────────────────────────────

interface PLockSliderProps {
  param: LockableParam
  effectId: string
  stepIndex: number
  lockedValue: number | undefined
  isLocked: boolean
  onLock: (effectId: string, stepIndex: number, paramId: string, value: number) => void
  onClear: (effectId: string, stepIndex: number, paramId: string) => void
}

function PLockSlider({
  param,
  effectId,
  stepIndex,
  lockedValue,
  isLocked,
  onLock,
  onClear,
}: PLockSliderProps) {
  const displayValue = isLocked ? lockedValue! : param.read()
  const normalized = (displayValue - param.min) / (param.max - param.min)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onLock(effectId, stepIndex, param.id, parseFloat(e.target.value))
    },
    [effectId, stepIndex, param.id, onLock],
  )

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onClear(effectId, stepIndex, param.id)
    },
    [effectId, stepIndex, param.id, onClear],
  )

  // Format display value
  const formatValue = (v: number) => {
    if (param.step >= 1) return Math.round(v).toString()
    if (param.step >= 0.1) return v.toFixed(1)
    return v.toFixed(2)
  }

  return (
    <div className="flex flex-col gap-1" style={{ minWidth: 100, flex: '1 1 100px', maxWidth: 160 }}>
      {/* Label + value + clear */}
      <div className="flex items-center justify-between">
        <span
          className="text-[9px] font-bold uppercase tracking-wider"
          style={{ color: isLocked ? SEQ : 'var(--text-ghost)' }}
        >
          {param.label}
        </span>
        <div className="flex items-center gap-1">
          <span
            className="text-[10px] tabular-nums"
            style={{ color: isLocked ? 'var(--text-secondary)' : 'var(--text-ghost)' }}
          >
            {formatValue(displayValue)}
          </span>
          {isLocked && (
            <button
              onClick={handleClear}
              className="text-[9px] leading-none"
              style={{ color: 'var(--text-ghost)' }}
              title="Clear lock"
            >
              x
            </button>
          )}
        </div>
      </div>

      {/* Slider track */}
      <div className="relative" style={{ height: 12 }}>
        {/* Background track */}
        <div
          className="absolute inset-y-0 left-0 right-0 rounded-sm"
          style={{
            top: 4,
            bottom: 4,
            backgroundColor: 'var(--bg-elevated)',
          }}
        />
        {/* Fill */}
        <div
          className="absolute rounded-sm"
          style={{
            top: 4,
            bottom: 4,
            left: 0,
            width: `${normalized * 100}%`,
            backgroundColor: isLocked ? SEQ : 'var(--text-ghost)',
            opacity: isLocked ? 0.6 : 0.3,
          }}
        />
        {/* Native range input overlay */}
        <input
          type="range"
          min={param.min}
          max={param.max}
          step={param.step}
          value={displayValue}
          onChange={handleChange}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
          style={{ height: 12 }}
        />
      </div>
    </div>
  )
}
