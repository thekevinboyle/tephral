interface ToggleRowProps {
  label: string
  value: boolean
  onChange: (value: boolean) => void
}

export function ToggleRow({ label, value, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{label}</span>
      <button
        onClick={() => onChange(!value)}
        className="w-8 h-4 rounded-full transition-colors"
        style={{
          backgroundColor: value ? 'var(--text-primary)' : 'var(--border)',
        }}
      >
        <div
          className={`w-3 h-3 rounded-full shadow transition-transform ${
            value ? 'translate-x-4' : 'translate-x-0.5'
          }`}
          style={{ backgroundColor: 'var(--bg-surface)' }}
        />
      </button>
    </div>
  )
}
