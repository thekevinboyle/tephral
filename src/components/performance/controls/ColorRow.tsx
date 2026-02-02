interface ColorRowProps {
  label: string
  value: string
  onChange: (value: string) => void
}

export function ColorRow({ label, value, onChange }: ColorRowProps) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="text-[14px] w-20 shrink-0" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-6 h-6 rounded cursor-pointer"
        style={{ border: '1px solid var(--border)' }}
      />
      <span className="text-[14px] tabular-nums" style={{ color: 'var(--text-muted)' }}>{value}</span>
    </div>
  )
}
