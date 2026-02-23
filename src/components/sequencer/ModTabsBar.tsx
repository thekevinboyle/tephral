import { useUIStore } from '../../stores/uiStore'

export type ParamView = 'effect' | 'lfo' | 'random' | 'step' | 'envelope' | 'sh' | 'midi' | 'audio'

const MOD_SOURCES: { id: ParamView; label: string; color: string }[] = [
  { id: 'lfo', label: 'LFO', color: '#707070' },
  { id: 'random', label: 'Random', color: '#FF6B6B' },
  { id: 'step', label: 'Step', color: '#4ECDC4' },
  { id: 'envelope', label: 'Env', color: '#AA55FF' },
  { id: 'sh', label: 'S&H', color: '#AAFF00' },
  { id: 'midi', label: 'MIDI', color: '#00AAFF' },
  { id: 'audio', label: 'Audio', color: '#FF3333' },
]

interface ModTabsBarProps {
  activeView: ParamView
  onSelectMod: (view: ParamView) => void
}

const MOD_STATUS: Record<string, string> = {
  lfo: 'LFO — Low-frequency oscillator modulation',
  random: 'Random — Random value modulation',
  step: 'Step — Step sequencer modulation',
  envelope: 'Envelope — ADSR envelope modulation',
  sh: 'S&H — Sample and hold modulation',
  midi: 'MIDI — MIDI CC controller mapping',
  audio: 'Audio — Audio-reactive frequency band mapping',
}

export function ModTabsBar({ activeView, onSelectMod }: ModTabsBarProps) {
  const setStatusText = useUIStore((s) => s.setStatusText)

  return (
    <div
      className="flex-shrink-0 flex items-center"
      style={{
        height: 64,
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
            onMouseEnter={() => setStatusText(MOD_STATUS[source.id] ?? source.label)}
            onMouseLeave={() => setStatusText(null)}
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
