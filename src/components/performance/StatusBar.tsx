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
        backgroundColor: 'var(--bg-surface)',
        borderTop: '1px solid var(--border)',
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
