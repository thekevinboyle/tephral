import { useUIStore } from '../../stores/uiStore'
import { SourceIcon, GlitchIcon, VisionIcon, ExportIcon } from './Icons'

const tabs = [
  { id: 'source' as const, label: 'Source', icon: SourceIcon },
  { id: 'glitch' as const, label: 'Glitch', icon: GlitchIcon },
  { id: 'vision' as const, label: 'Vision', icon: VisionIcon },
  { id: 'export' as const, label: 'Export', icon: ExportIcon },
]

export function TabBar() {
  const { activeTab, setActiveTab } = useUIStore()

  return (
    <div className="flex items-center justify-around border-t border-muted/30 bg-base-dark px-2 py-1">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => setActiveTab(id)}
          className={`flex flex-col items-center gap-0.5 px-4 py-2 transition-colors ${
            activeTab === id
              ? 'text-accent-yellow'
              : 'text-muted hover:text-base-light'
          }`}
        >
          <Icon size={20} />
          <span className="text-[10px] uppercase tracking-wider">{label}</span>
        </button>
      ))}
    </div>
  )
}
