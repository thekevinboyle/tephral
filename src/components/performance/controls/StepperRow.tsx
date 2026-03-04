import { useEffectSequencerStore } from '../../../stores/effectSequencerStore'

interface StepperRowProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  paramId?: string
}

export function StepperRow({ label, value, min, max, step, onChange, paramId }: StepperRowProps) {
  const automationParam = useEffectSequencerStore((s) => s.automationParam)
  const setAutomationParam = useEffectSequencerStore((s) => s.setAutomationParam)
  const isAutomationTarget = paramId != null && automationParam?.fullParamId === paramId

  const atMin = value <= min
  const atMax = value >= max
  const displayValue = step >= 1 ? value.toFixed(0) : value.toFixed(1)

  const handleClick = () => {
    if (!paramId) return
    const parts = paramId.split('.')
    if (parts.length === 2) {
      setAutomationParam({
        effectId: parts[0],
        paramId: parts[1],
        fullParamId: paramId,
        label, min, max, step,
      })
    }
  }

  return (
    <div className="flex flex-col items-center" style={{ gap: 3, minWidth: 64 }}>
      <span
        className="text-[9px] uppercase tracking-wide leading-none font-medium"
        style={{ color: isAutomationTarget ? '#FF4060' : 'var(--text-secondary)' }}
      >
        {label}
      </span>
      <div
        className="flex items-center"
        style={{
          gap: 2,
          border: `1px solid ${isAutomationTarget ? '#FF4060' : 'var(--border)'}`,
          padding: '1px 2px',
          backgroundColor: '#000000',
          animation: isAutomationTarget ? 'hud-blink 0.5s step-end infinite' : undefined,
        }}
      >
        {/* Decrement */}
        <button
          onClick={() => !atMin && onChange(Math.max(min, value - step))}
          disabled={atMin}
          className="flex items-center justify-center transition-colors"
          style={{
            width: 16, height: 16,
            color: atMin ? 'var(--text-ghost)' : 'var(--text-secondary)',
            cursor: atMin ? 'default' : 'pointer',
            fontSize: 11, fontWeight: 700, lineHeight: 1,
            fontFamily: 'var(--font-mono)',
          }}
        >
          -
        </button>

        {/* Value */}
        <span
          className="text-[9px] tabular-nums text-center cursor-pointer select-none"
          style={{
            color: isAutomationTarget ? '#FF4060' : 'var(--text-secondary)',
            minWidth: 28,
            fontFamily: 'var(--font-mono)',
          }}
          onClick={handleClick}
        >
          {displayValue}
        </span>

        {/* Increment */}
        <button
          onClick={() => !atMax && onChange(Math.min(max, value + step))}
          disabled={atMax}
          className="flex items-center justify-center transition-colors"
          style={{
            width: 16, height: 16,
            color: atMax ? 'var(--text-ghost)' : 'var(--text-secondary)',
            cursor: atMax ? 'default' : 'pointer',
            fontSize: 11, fontWeight: 700, lineHeight: 1,
            fontFamily: 'var(--font-mono)',
          }}
        >
          +
        </button>
      </div>
    </div>
  )
}
