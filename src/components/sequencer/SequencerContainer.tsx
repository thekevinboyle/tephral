import { useSequencerContainerStore } from '../../stores/sequencerContainerStore'
import { useUIStore } from '../../stores/uiStore'
import { getUIStatusText } from '../../config/statusDescriptions'
import { UnifiedSequencerPanel } from './UnifiedSequencerPanel'
import { SlicerPanel } from './SlicerPanel'

const SEQUENCER_MODES = [
  { id: 'effects', icon: '\u2B21', label: 'P-LOCK', tip: 'seqEffects' },
  { id: 'slicer', icon: '\u2297', label: 'CHI_R0N', tip: 'seqSlicer' },
] as const

export function SequencerContainer({ hideTabsBar = false }: { hideTabsBar?: boolean } = {}) {
  const { activeSequencer, setActiveSequencer } = useSequencerContainerStore()
  const setStatusText = useUIStore((s) => s.setStatusText)

  return (
    <div className="flex h-full w-full" style={{ backgroundColor: 'var(--bg-surface)' }}>
      {/* Vertical tab bar on left */}
      <div
        className="flex-shrink-0 flex flex-col"
        style={{
          borderRight: '1px solid var(--border)',
          width: 'var(--sidebar-width)',
        }}
      >
        {SEQUENCER_MODES.map((mode) => {
          const isActive = activeSequencer === mode.id
          return (
            <button
              key={mode.id}
              onClick={() => setActiveSequencer(mode.id)}
              className="w-full flex items-center justify-center transition-colors"
              style={{
                height: 64,
                borderBottom: '1px solid var(--border)',
                borderLeft: isActive ? '2px solid var(--seq-accent)' : '2px solid transparent',
                backgroundColor: 'transparent',
              }}
              title={mode.label}
              onMouseEnter={() => setStatusText(getUIStatusText(mode.tip))}
              onMouseLeave={() => setStatusText(null)}
            >
              <span
                className="text-[18px]"
                style={{
                  color: isActive ? 'var(--text-primary)' : 'var(--text-ghost)',
                }}
              >
                {mode.icon}
              </span>
            </button>
          )
        })}
        <div className="flex-1" />
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 min-w-0">
        {activeSequencer === 'effects' && <UnifiedSequencerPanel hideTabsBar={hideTabsBar} />}
        {activeSequencer === 'slicer' && <SlicerPanel />}
      </div>
    </div>
  )
}
