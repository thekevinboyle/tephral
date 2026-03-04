import { useEffectSequencerStore } from '../../../stores/effectSequencerStore'
import { useUIStore } from '../../../stores/uiStore'
import { getParamStatusText } from '../../../config/statusDescriptions'

interface ToggleRowProps {
  label: string
  value: boolean
  onChange: (value: boolean) => void
  paramId?: string
}

export function ToggleRow({ label, value, onChange, paramId }: ToggleRowProps) {
  const automationParam = useEffectSequencerStore((s) => s.automationParam)
  const setAutomationParam = useEffectSequencerStore((s) => s.setAutomationParam)
  const isAutomationTarget = paramId != null && automationParam?.fullParamId === paramId
  const setStatusText = useUIStore((s) => s.setStatusText)
  const resolvedStatus = getParamStatusText(label)

  const handleLabelClick = () => {
    if (!paramId) return
    const parts = paramId.split('.')
    if (parts.length === 2) {
      setAutomationParam({
        effectId: parts[0],
        paramId: parts[1],
        fullParamId: paramId,
        label, min: 0, max: 1, step: 1,
      })
    }
  }

  return (
    <div
      className="flex flex-col items-center"
      style={{ gap: 3, minWidth: 64 }}
      onMouseEnter={resolvedStatus ? () => setStatusText(resolvedStatus) : undefined}
      onMouseLeave={resolvedStatus ? () => setStatusText(null) : undefined}
    >
      <span
        className="text-[9px] uppercase tracking-wide leading-none font-medium cursor-pointer"
        style={{ color: isAutomationTarget ? '#FF4060' : 'var(--text-secondary)' }}
        onClick={handleLabelClick}
      >
        {label}
      </span>
      <button
        onClick={() => onChange(!value)}
        className="text-[9px] tabular-nums font-bold"
        style={{
          border: `1px solid ${isAutomationTarget ? '#FF4060' : value ? '#FFFFFF' : 'var(--border)'}`,
          padding: '2px 6px',
          backgroundColor: value ? '#FFFFFF' : 'transparent',
          color: value ? '#000000' : 'var(--text-ghost)',
          minWidth: 48,
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.08em',
        }}
      >
        {value ? 'ON' : 'OFF'}
      </button>
    </div>
  )
}
