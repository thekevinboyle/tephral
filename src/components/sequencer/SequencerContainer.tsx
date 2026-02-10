import { useSequencerContainerStore } from '../../stores/sequencerContainerStore'
import { SlicerPanel } from './SlicerPanel'
import { DiagonalEuclidean } from './DiagonalEuclidean'

export function SequencerContainer() {
  const { activeSequencer, setActiveSequencer } = useSequencerContainerStore()

  return (
    <div className="flex flex-col h-full w-full" style={{ backgroundColor: 'var(--bg-surface)' }}>
      {/* Tab bar */}
      <div
        className="flex-shrink-0 flex"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <button
          onClick={() => setActiveSequencer('slicer')}
          className="flex-1 px-3 py-2 flex items-center justify-center transition-colors"
          style={{
            backgroundColor: activeSequencer === 'slicer' ? 'var(--bg-elevated)' : 'transparent',
            borderRight: '1px solid var(--border)',
          }}
        >
          <span
            className="text-[9px] uppercase tracking-widest"
            style={{ color: activeSequencer === 'slicer' ? 'var(--accent)' : 'var(--text-ghost)' }}
          >
            Slicer
          </span>
        </button>
        <button
          onClick={() => setActiveSequencer('euclid')}
          className="flex-1 px-3 py-2 flex items-center justify-center transition-colors"
          style={{
            backgroundColor: activeSequencer === 'euclid' ? 'var(--bg-elevated)' : 'transparent',
          }}
        >
          <span
            className="text-[9px] uppercase tracking-widest"
            style={{ color: activeSequencer === 'euclid' ? 'var(--accent)' : 'var(--text-ghost)' }}
          >
            Euclid
          </span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {activeSequencer === 'slicer' && <SlicerPanel />}
        {activeSequencer === 'euclid' && <DiagonalEuclidean />}
      </div>
    </div>
  )
}
