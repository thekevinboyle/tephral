import { useUIStore } from '../../../stores/uiStore'
import { displayOptionLabel } from '../../../config/paramNames'

interface SelectBlockProps {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
  paramId?: string
  color?: string
}

const setStatus = (t: string | null) => useUIStore.getState().setStatusText(t)

/** One-row stepper for a select param: name, ‹ value ›, position. Arrows are labelled for screen readers and the status bar. */
export function SelectBlock({ label, value, options, onChange }: SelectBlockProps) {
  const currentIndex = options.findIndex((o) => o.value === value)
  const current = displayOptionLabel(options[currentIndex]?.label ?? value)
  const step = (dir: 1 | -1) => (e: React.MouseEvent) => {
    e.stopPropagation()
    const i = currentIndex < 0 ? 0 : currentIndex
    onChange(options[(i + dir + options.length) % options.length].value)
  }
  const hover = (what: string) => () => setStatus(`${label}: ${current}. ${what}`)
  return (
    <div className="seg-select" role="group" aria-label={label}>
      <span className="seg-select-name" title={label}>{label}</span>
      <button type="button" className="seg-select-btn" aria-label={`Previous ${label}`}
        onClick={step(-1)} onMouseEnter={hover('Click for the previous option')} onMouseLeave={() => setStatus(null)}>‹</button>
      <span className="seg-select-value" aria-live="polite">{current}</span>
      <button type="button" className="seg-select-btn" aria-label={`Next ${label}`}
        onClick={step(1)} onMouseEnter={hover('Click for the next option')} onMouseLeave={() => setStatus(null)}>›</button>
      <span className="seg-select-count" aria-hidden>{currentIndex + 1}/{options.length}</span>
    </div>
  )
}
