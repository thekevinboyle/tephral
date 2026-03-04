import { useUIStore } from '../../stores/uiStore'
import { SignalAnalysis, IrisScanner } from '../ui/MicroVisuals'

export function StatusBar() {
  const statusText = useUIStore((s) => s.statusText)

  return (
    <div
      style={{
        height: 24,
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        background: 'linear-gradient(to right, var(--bg-elevated), var(--bg-surface), var(--bg-elevated))',
        borderTop: '1px solid var(--border)',
        boxShadow: 'inset 0 1px 0 var(--surface-highlight)',
      }}
    >
      <SignalAnalysis value={0.3} size={16} color="var(--text-ghost)" className="opacity-20 mr-1.5" />
      <span
        style={{
          fontSize: 10,
          color: 'var(--text-muted)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          flex: 1,
        }}
      >
        {statusText ?? 'Ready'}
      </span>
      <IrisScanner value={0.4} size={16} color="var(--text-ghost)" className="opacity-20 ml-1.5" />
    </div>
  )
}
