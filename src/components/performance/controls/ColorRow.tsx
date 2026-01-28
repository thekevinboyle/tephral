interface ColorRowProps {
  label: string
  value: string
  onChange: (value: string) => void
}

export function ColorRow({ label, value, onChange }: ColorRowProps) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-[13px] text-gray-500 w-20 shrink-0">{label}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-6 h-6 rounded border border-gray-200 cursor-pointer"
      />
      <span className="text-[13px] text-gray-400 tabular-nums">{value}</span>
    </div>
  )
}
