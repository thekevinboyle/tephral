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
        padding: '6px 0',
      }}
    >
      <span
        style={{
          fontSize: '14px',
          color: 'var(--text-muted)',
        }}
      >
        {label}
      </span>
      <div style={{ display: 'flex', gap: '4px' }}>
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            style={{
              padding: '2px 8px',
              fontSize: '13px',
              borderRadius: '4px',
              transition: 'background-color 0.15s, color 0.15s',
              border: 'none',
              cursor: 'pointer',
              backgroundColor:
                value === option.value
                  ? 'var(--accent)'
                  : 'var(--bg-surface)',
              color:
                value === option.value
                  ? 'var(--bg-surface)'
                  : 'var(--text-muted)',
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
