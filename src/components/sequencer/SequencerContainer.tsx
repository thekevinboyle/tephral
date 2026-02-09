import { useSequencerContainerStore } from '../../stores/sequencerContainerStore'
import { SlicerPanel } from './SlicerPanel'
import { DiagonalEuclidean } from './DiagonalEuclidean'

export function SequencerContainer() {
  const { activeSequencer, setActiveSequencer } = useSequencerContainerStore()

  return (
    <div className="flex flex-col h-full w-full">
      {/* Tab bar */}
      <div
        className="flex items-center gap-1 px-2"
        style={{
          height: '28px',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--bg-elevated)',
        }}
      >
        <button
          className="text-[9px] font-medium uppercase tracking-widest px-2 py-1"
          style={{
            color: activeSequencer === 'slicer' ? 'var(--accent)' : 'var(--text-ghost)',
            borderBottom: activeSequencer === 'slicer' ? '1px solid var(--accent)' : '1px solid transparent',
          }}
          onClick={() => setActiveSequencer('slicer')}
        >
          Slicer
        </button>
        <button
          className="text-[9px] font-medium uppercase tracking-widest px-2 py-1"
          style={{
            color: activeSequencer === 'euclid' ? '#E8E4D9' : 'var(--text-ghost)',
            borderBottom: activeSequencer === 'euclid' ? '1px solid #E8E4D9' : '1px solid transparent',
          }}
          onClick={() => setActiveSequencer('euclid')}
        >
          Euclid
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
