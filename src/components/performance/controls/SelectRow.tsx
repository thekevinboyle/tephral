interface SelectRowProps {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}

export function SelectRow({ label, value, options, onChange }: SelectRowProps) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[14px]" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <div className="flex gap-1">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className="px-2 py-0.5 text-[13px] rounded transition-colors"
            style={{
              backgroundColor:
                value === option.value
                  ? 'var(--accent)'
                  : 'var(--bg-surface)',
              color:
                value === option.value
                  ? 'var(--bg-surface)'
                  : 'var(--text-muted)',
              border: value === option.value ? 'none' : '1px solid var(--border)',
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
