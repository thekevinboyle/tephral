interface ToggleRowProps {
  label: string
  value: boolean
  onChange: (value: boolean) => void
}

export function ToggleRow({ label, value, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[14px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <button
        onClick={() => onChange(!value)}
        className="w-9 h-5 rounded-full transition-colors relative"
        style={{
          backgroundColor: value ? 'var(--accent)' : 'var(--border)',
        }}
      >
        <div
          className="w-3.5 h-3.5 rounded-full shadow absolute top-0.5 transition-all"
          style={{
            backgroundColor: 'var(--bg-surface)',
            left: value ? 'calc(100% - 18px)' : '3px',
          }}
        />
      </button>
    </div>
  )
}
