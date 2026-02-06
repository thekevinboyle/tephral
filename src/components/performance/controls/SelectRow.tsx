interface SelectRowProps {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}

export function SelectRow({ label, value, options, onChange }: SelectRowProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '4px 0',
      }}
    >
      <span
        style={{
          fontSize: '11px',
          color: 'var(--text-muted)',
        }}
      >
        {label}
      </span>
      <div style={{ display: 'flex', gap: '2px' }}>
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            style={{
              padding: '2px 6px',
              fontSize: '10px',
              borderRadius: '2px',
              transition: 'background-color 0.15s, color 0.15s, box-shadow 0.15s',
              border: value === option.value ? '1px solid var(--accent)' : '1px solid var(--border)',
              cursor: 'pointer',
              backgroundColor:
                value === option.value
                  ? 'var(--accent)'
                  : 'var(--bg-surface)',
              color:
                value === option.value
                  ? 'var(--text-primary)'
                  : 'var(--text-muted)',
              boxShadow:
                value === option.value
                  ? '0 0 4px var(--accent-glow)'
                  : 'none',
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
