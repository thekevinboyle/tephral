import { useSequencerContainerStore } from '../../stores/sequencerContainerStore'
import { SlicerPanel } from './SlicerPanel'
import { DiagonalEuclidean } from './DiagonalEuclidean'
import { StepSequencerPanel } from './StepSequencerPanel'

// Icon symbols for each sequencer
const SEQUENCER_ICONS = {
  slicer: '⊗',   // Slice/cut - crosshair circle
  euclid: '◉',   // Euclidean - concentric circles
  steps: '⊞',    // Steps - grid
} as const

export function SequencerContainer() {
  const { activeSequencer, setActiveSequencer } = useSequencerContainerStore()

  return (
    <div className="flex h-full w-full" style={{ backgroundColor: 'var(--bg-surface)' }}>
      {/* Vertical tab bar on left */}
      <div
        className="flex-shrink-0 flex flex-col"
        style={{
          borderRight: '1px solid var(--border)',
          width: '36px',
        }}
      >
        <button
          onClick={() => setActiveSequencer('slicer')}
          className="px-2 py-3 flex items-center justify-center transition-colors"
          style={{
            backgroundColor: activeSequencer === 'slicer' ? 'var(--bg-elevated)' : 'transparent',
            borderBottom: '1px solid var(--border)',
          }}
          title="CHI_R0N - Slicer"
        >
          <span
            className="text-[18px]"
            style={{
              color: activeSequencer === 'slicer' ? 'var(--accent)' : 'var(--text-ghost)',
            }}
          >
            {SEQUENCER_ICONS.slicer}
          </span>
        </button>
        <button
          onClick={() => setActiveSequencer('euclid')}
          className="px-2 py-3 flex items-center justify-center transition-colors"
          style={{
            backgroundColor: activeSequencer === 'euclid' ? 'var(--bg-elevated)' : 'transparent',
            borderBottom: '1px solid var(--border)',
          }}
          title="T3S:S¥L - Euclidean"
        >
          <span
            className="text-[18px]"
            style={{
              color: activeSequencer === 'euclid' ? 'var(--accent)' : 'var(--text-ghost)',
            }}
          >
            {SEQUENCER_ICONS.euclid}
          </span>
        </button>
        <button
          onClick={() => setActiveSequencer('steps')}
          className="px-2 py-3 flex items-center justify-center transition-colors"
          style={{
            backgroundColor: activeSequencer === 'steps' ? 'var(--bg-elevated)' : 'transparent',
            borderBottom: '1px solid var(--border)',
          }}
          title="PÜL.$YX - Step Sequencer"
        >
          <span
            className="text-[18px]"
            style={{
              color: activeSequencer === 'steps' ? 'var(--accent)' : 'var(--text-ghost)',
            }}
          >
            {SEQUENCER_ICONS.steps}
          </span>
        </button>
        {/* Spacer to fill remaining height */}
        <div className="flex-1" />
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 min-w-0">
        {activeSequencer === 'slicer' && <SlicerPanel />}
        {activeSequencer === 'euclid' && <DiagonalEuclidean />}
        {activeSequencer === 'steps' && <StepSequencerPanel />}
      </div>
    </div>
  )
}
