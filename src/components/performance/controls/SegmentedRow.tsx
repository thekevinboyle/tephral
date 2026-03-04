import { useEffectSequencerStore } from '../../../stores/effectSequencerStore'

interface SegmentedRowProps {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  paramId?: string
}

export function SegmentedRow({ label, value, options, onChange, paramId }: SegmentedRowProps) {
  const automationParam = useEffectSequencerStore((s) => s.automationParam)
  const isAutomationTarget = paramId != null && automationParam?.fullParamId === paramId

  return (
    <div className="flex flex-col" style={{ gap: 4, width: '100%' }}>
      <span
        className="text-[9px] uppercase tracking-wide leading-none font-medium"
        style={{ color: isAutomationTarget ? '#FF4060' : 'var(--text-secondary)' }}
      >
        {label}
      </span>
      <div className="flex" style={{ gap: 2 }}>
        {options.map((opt) => {
          const isActive = value === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className="flex-1 text-[9px] font-bold uppercase transition-colors"
              style={{
                padding: '4px 4px',
                backgroundColor: isActive ? '#FFFFFF' : 'transparent',
                color: isActive ? '#000000' : 'var(--text-muted)',
                border: `1px solid ${isActive ? '#FFFFFF' : 'var(--border)'}`,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.06em',
              }}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
