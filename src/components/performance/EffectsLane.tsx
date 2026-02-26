import { useModulationStore } from '../../stores/modulationStore'
import { ModulationPanel } from '../sequencer/ModulationContent'

export function EffectsLane() {
  const modulation = useModulationStore()
  const hasActiveModulation = modulation.lfos.some(l => l.enabled) || modulation.random.enabled || modulation.step.enabled || modulation.envelope.enabled || modulation.sampleHold.enabled

  return (
    <div className="h-full flex flex-col" style={{ background: 'linear-gradient(to bottom, #1A1A1A, #141414)' }}>
      {/* Header */}
      <div
        className="flex-shrink-0 flex items-center justify-between"
        style={{
          borderBottom: '1px solid var(--border)',
          padding: 'var(--panel-padding-sm) var(--panel-padding)',
          boxShadow: 'inset 0 1px 0 var(--surface-highlight)',
        }}
      >
        <span
          className="text-[9px] uppercase tracking-widest flex items-center gap-1.5"
          style={{
            color: 'var(--accent)',
            fontFamily: 'var(--font-sans)',
          }}
        >
          MODULATION
          {hasActiveModulation && (
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: 'var(--accent)',
                boxShadow: '0 0 4px var(--accent-glow), 0 0 8px var(--accent-glow)',
              }}
            />
          )}
        </span>
      </div>

      {/* Modulation panel */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <ModulationPanel />
      </div>
    </div>
  )
}
