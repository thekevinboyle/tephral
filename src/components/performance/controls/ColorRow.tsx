interface ColorRowProps {
  label: string
  value: string
  onChange: (value: string) => void
}

export function ColorRow({ label, value, onChange }: ColorRowProps) {
  return (
    <div className="flex flex-col items-center" style={{ gap: 3, minWidth: 64 }}>
      <span
        className="text-[9px] uppercase tracking-wide leading-none font-medium"
        style={{ color: 'var(--text-secondary)' }}
      >
        {label}
      </span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded cursor-pointer"
        style={{ border: '1px solid var(--border)', backgroundColor: 'transparent' }}
      />
    </div>
  )
}
