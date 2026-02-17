import { usePLockContext } from '../../../contexts/PLockContext'

const PLOCK = '#FFB830'

interface SelectRowProps {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  paramId?: string
}

export function SelectRow({ label, value, options, onChange, paramId }: SelectRowProps) {
  const plock = usePLockContext()

  const shortParam = paramId?.split('.')[1]
  const isPlockActive = plock?.active && !!shortParam
  const isLocked = isPlockActive && shortParam in plock.locks

  const effectiveValue = isLocked ? String(plock!.locks[shortParam!]) : value
  const effectiveOnChange = isPlockActive
    ? (v: string) => {
        plock!.setLock(shortParam!, v)
        onChange(v) // Apply to effect for live preview
      }
    : onChange

  return (
    <div className="flex flex-col items-center" style={{ gap: 3, minWidth: 64 }}>
      <span
        className="text-[9px] uppercase tracking-wide leading-none font-medium"
        style={{ color: isLocked ? PLOCK : 'var(--text-secondary)' }}
      >
        {label}
      </span>
      <select
        value={effectiveValue}
        onChange={(e) => effectiveOnChange(e.target.value)}
        className="text-[9px] tabular-nums text-center cursor-pointer"
        style={{
          border: `1px solid ${isLocked ? PLOCK + '60' : 'var(--border)'}`,
          borderRadius: 3,
          padding: '2px 6px',
          backgroundColor: isLocked ? PLOCK + '10' : 'var(--bg-surface)',
          color: isLocked ? PLOCK : 'var(--text-secondary)',
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
