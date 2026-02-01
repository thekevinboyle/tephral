import { useSequencerContainerStore, type SequencerType } from '../../stores/sequencerContainerStore'

interface IconConfig {
  type: SequencerType
  color: string
  label: string
  icon: React.ReactNode
}

const ICONS: IconConfig[] = [
  {
    type: 'slicer',
    color: '#FF6B6B',
    label: 'Granular Slicer',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M1 8 Q4 3, 5 8 T9 8 T13 8 T15 8" />
        <line x1="4" y1="3" x2="4" y2="13" strokeDasharray="1,2" />
        <line x1="8" y1="3" x2="8" y2="13" strokeDasharray="1,2" />
        <line x1="12" y1="3" x2="12" y2="13" strokeDasharray="1,2" />
      </svg>
    ),
  },
  {
    type: 'slot3',
    color: '#888',
    label: 'Coming Soon',
    icon: <span style={{ fontSize: '16px', lineHeight: 1 }}>&#8226;</span>,
  },
  {
    type: 'slot4',
    color: '#888',
    label: 'Coming Soon',
    icon: <span style={{ fontSize: '16px', lineHeight: 1 }}>&#8226;</span>,
  },
]

export function SequencerIconBar() {
  const { activeSequencer, setActiveSequencer } = useSequencerContainerStore()

  return (
    <div
      className="flex flex-col items-center gap-2 py-2"
      style={{
        width: '40px',
        backgroundColor: 'var(--bg-elevated)',
      }}
    >
      {ICONS.map(({ type, color, label, icon }) => {
        const isActive = activeSequencer === type

        return (
          <button
            key={type}
            onClick={() => setActiveSequencer(type)}
            title={label}
            className="flex items-center justify-center transition-colors"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '4px',
              backgroundColor: isActive ? `${color}20` : 'transparent',
              border: isActive ? `2px solid ${color}` : '1px solid var(--border)',
              boxShadow: isActive ? `0 0 8px ${color}40` : 'none',
              color: isActive ? color : 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            {icon}
          </button>
        )
      })}
    </div>
  )
}
