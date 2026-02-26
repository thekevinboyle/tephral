import { useSequencerContainerStore } from '../../stores/sequencerContainerStore'
import { useUIStore } from '../../stores/uiStore'
import { getUIStatusText } from '../../config/statusDescriptions'
import { UnifiedSequencerPanel } from './UnifiedSequencerPanel'
import { SlicerPanel } from './SlicerPanel'

// Icon symbols for each sequencer
const SEQUENCER_ICONS = {
  effects: '⬡',  // Hexagon - effect grid / p-locks
  slicer: '⊗',   // Slice/cut - crosshair circle
} as const

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
        <button
          onClick={() => setActiveSequencer('effects')}
          className="px-2 py-3 flex items-center justify-center transition-colors"
          style={{
            backgroundColor: activeSequencer === 'effects' ? 'var(--bg-elevated)' : 'transparent',
            borderBottom: '1px solid var(--border)',
          }}
          title="P-LOCK - Effect Sequencer"
          onMouseEnter={() => setStatusText(getUIStatusText('seqEffects'))}
          onMouseLeave={() => setStatusText(null)}
        >
          <span
            className="text-[18px]"
            style={{
              color: activeSequencer === 'effects' ? 'var(--seq-accent)' : 'var(--text-ghost)',
            }}
          >
            {SEQUENCER_ICONS.effects}
          </span>
        </button>
        <button
          onClick={() => setActiveSequencer('slicer')}
          className="px-2 py-3 flex items-center justify-center transition-colors"
          style={{
            backgroundColor: activeSequencer === 'slicer' ? 'var(--bg-elevated)' : 'transparent',
            borderBottom: '1px solid var(--border)',
          }}
          title="CHI_R0N - Slicer"
          onMouseEnter={() => setStatusText(getUIStatusText('seqSlicer'))}
          onMouseLeave={() => setStatusText(null)}
        >
          <span
            className="text-[18px]"
            style={{
              color: activeSequencer === 'slicer' ? 'var(--seq-accent)' : 'var(--text-ghost)',
            }}
          >
            {SEQUENCER_ICONS.slicer}
          </span>
        </button>
        {/* Spacer to fill remaining height */}
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
