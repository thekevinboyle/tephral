import { useUIStore } from '../../../stores/uiStore'

interface ToggleBlockProps {
  label: string
  value: boolean
  onChange: (v: boolean) => void
  color?: string
  paramId?: string
}

const setStatus = (t: string | null) => useUIStore.getState().setStatusText(t)

/** On/off switch for a toggle param: name plus On/Off, filled when on. */
export function ToggleBlock({ label, value, onChange }: ToggleBlockProps) {
  return (
    <button
      type="button"
      className="seg-toggle-block"
      aria-pressed={value}
      data-on={value || undefined}
      title={label}
      onClick={() => { onChange(!value); setStatus(`${label}: ${value ? 'off' : 'on'}. Click to turn it ${value ? 'on' : 'off'}`) }}
      onMouseEnter={() => setStatus(`${label}: ${value ? 'on' : 'off'}. Click to turn it ${value ? 'off' : 'on'}`)}
      onMouseLeave={() => setStatus(null)}
    >
      <span className="seg-toggle-block-name">{label}</span>
      <span className="seg-toggle-block-state">{value ? 'On' : 'Off'}</span>
    </button>
  )
}
