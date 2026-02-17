interface ToggleRowProps {
  label: string
  value: boolean
  onChange: (value: boolean) => void
}

export function ToggleRow({ label, value, onChange }: ToggleRowProps) {
  return (
    <div className="flex flex-col items-center" style={{ gap: 3, minWidth: 64 }}>
      <span
        className="text-[9px] uppercase tracking-wide leading-none font-medium"
        style={{ color: 'var(--text-secondary)' }}
      >
        {label}
      </span>
      <button
        onClick={() => onChange(!value)}
        className="text-[9px] tabular-nums font-bold"
        style={{
          border: `1px solid ${value ? 'var(--accent-dim)' : 'var(--border)'}`,
          borderRadius: 3,
          padding: '2px 6px',
          backgroundColor: value ? 'rgba(0, 212, 255, 0.1)' : 'var(--bg-surface)',
          color: value ? 'var(--accent)' : 'var(--text-ghost)',
          minWidth: 48,
        }}
      >
        {value ? 'ON' : 'OFF'}
      </button>
    </div>
  )
}
