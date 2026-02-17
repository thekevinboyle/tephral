export type ParamView = 'effect' | 'lfo' | 'random' | 'step' | 'envelope' | 'sh'

const MOD_SOURCES: { id: ParamView; label: string; color: string }[] = [
  { id: 'lfo', label: 'LFO', color: '#00D4FF' },
  { id: 'random', label: 'Random', color: '#FF6B6B' },
  { id: 'step', label: 'Step', color: '#4ECDC4' },
  { id: 'envelope', label: 'Env', color: '#AA55FF' },
  { id: 'sh', label: 'S&H', color: '#AAFF00' },
]

interface ModTabsBarProps {
  activeView: ParamView
  onSelectMod: (view: ParamView) => void
}

export function ModTabsBar({ activeView, onSelectMod }: ModTabsBarProps) {
  return (
    <div
      className="flex-shrink-0 flex items-center"
      style={{
        height: 28,
        padding: '0 var(--panel-padding)',
        gap: 4,
        borderBottom: '1px solid var(--border)',
      }}
    >
      {MOD_SOURCES.map((source) => {
        const isActive = activeView === source.id

        return (
          <button
            key={source.id}
            onClick={() => onSelectMod(isActive ? 'effect' : source.id)}
            className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm transition-colors"
            style={{
              backgroundColor: isActive ? `${source.color}20` : 'transparent',
              color: isActive ? source.color : 'var(--text-ghost)',
              border: isActive ? `1px solid ${source.color}40` : '1px solid transparent',
            }}
          >
            {source.label}
          </button>
        )
      })}
    </div>
  )
}
