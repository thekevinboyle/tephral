import { useUIStore } from '../../stores/uiStore'

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
      <span
        style={{
          fontSize: 10,
          color: 'var(--text-muted)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {statusText ?? 'Ready'}
      </span>
    </div>
  )
}
