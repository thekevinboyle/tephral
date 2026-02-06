interface ToggleRowProps {
  label: string
  value: boolean
  onChange: (value: boolean) => void
}

export function ToggleRow({ label, value, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <button
        onClick={() => onChange(!value)}
        className="w-7 h-3.5 rounded-sm transition-colors relative"
        style={{
          backgroundColor: value ? 'var(--accent)' : 'var(--bg-surface)',
          border: value ? '1px solid var(--accent)' : '1px solid var(--border)',
          boxShadow: value ? '0 0 4px var(--accent-glow)' : 'none',
        }}
      >
        <div
          className={`absolute top-0.5 w-2 h-2 rounded-sm transition-all ${
            value ? 'left-3.5' : 'left-0.5'
          }`}
          style={{ backgroundColor: value ? 'var(--text-primary)' : 'var(--text-ghost)' }}
        />
      </button>
    </div>
  )
}
