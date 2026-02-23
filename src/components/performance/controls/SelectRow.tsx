import { useUIStore } from '../../../stores/uiStore'
import { getParamStatusText } from '../../../config/statusDescriptions'

interface SelectRowProps {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  paramId?: string
}

export function SelectRow({ label, value, options, onChange }: SelectRowProps) {
  const setStatusText = useUIStore((s) => s.setStatusText)
  const resolvedStatus = getParamStatusText(label)

  return (
    <div
      className="flex flex-col items-center"
      style={{ gap: 3, minWidth: 64 }}
      onMouseEnter={resolvedStatus ? () => setStatusText(resolvedStatus) : undefined}
      onMouseLeave={resolvedStatus ? () => setStatusText(null) : undefined}
    >
      <span
        className="text-[9px] uppercase tracking-wide leading-none font-medium"
        style={{ color: 'var(--text-secondary)' }}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-[9px] tabular-nums text-center cursor-pointer"
        style={{
          border: '1px solid var(--border)',
          borderRadius: 3,
          padding: '2px 6px',
          backgroundColor: 'var(--bg-surface)',
          color: 'var(--text-secondary)',
          minWidth: 48,
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
