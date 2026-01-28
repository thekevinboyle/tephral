interface DrawerTriggerProps {
  side: 'left' | 'right'
  onClick: () => void
  icon: 'folder' | 'sliders'
}

export function DrawerTrigger({ side, onClick, icon }: DrawerTriggerProps) {
  return (
    <button
      onClick={onClick}
      className={`absolute top-1/2 -translate-y-1/2 z-30 bg-white/90 backdrop-blur-sm border border-gray-300 rounded-full p-2 shadow-sm hover:bg-gray-50 transition-colors ${
        side === 'left' ? 'left-2' : 'right-2'
      }`}
      title={icon === 'folder' ? 'Presets (P)' : 'Parameters (E)'}
    >
      {icon === 'folder' ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="4" y1="21" x2="4" y2="14" />
          <line x1="4" y1="10" x2="4" y2="3" />
          <line x1="12" y1="21" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12" y2="3" />
          <line x1="20" y1="21" x2="20" y2="16" />
          <line x1="20" y1="12" x2="20" y2="3" />
          <line x1="1" y1="14" x2="7" y2="14" />
          <line x1="9" y1="8" x2="15" y2="8" />
          <line x1="17" y1="16" x2="23" y2="16" />
        </svg>
      )}
    </button>
  )
}
