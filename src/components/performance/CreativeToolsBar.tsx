import { useRoutingStore } from '../../stores/routingStore'

export function CreativeToolsBar() {
  const { randomize, undoRandomize, previousState } = useRoutingStore()

  return (
    <div
      className="flex items-center gap-2 px-3 py-2"
      style={{ backgroundColor: '#f0f0f0', borderBottom: '1px solid #e0e0e0' }}
    >
      <button
        onClick={randomize}
        className="px-3 py-1.5 rounded-md text-[14px] font-medium transition-colors hover:bg-white"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          color: '#1a1a1a',
        }}
      >
        Randomize
      </button>

      <button
        onClick={undoRandomize}
        disabled={!previousState}
        className="px-3 py-1.5 rounded-md text-[14px] font-medium transition-colors"
        style={{
          backgroundColor: previousState ? 'var(--bg-surface)' : 'var(--bg-surface)',
          border: '1px solid var(--border)',
          color: previousState ? '#1a1a1a' : 'var(--text-muted)',
          cursor: previousState ? 'pointer' : 'not-allowed',
        }}
      >
        Undo
      </button>
    </div>
  )
}
