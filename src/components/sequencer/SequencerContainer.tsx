import { useSequencerContainerStore } from '../../stores/sequencerContainerStore'
import { SequencerIconBar } from './SequencerIconBar'
import { SlicerPanel } from './SlicerPanel'
import { EuclideanPanel } from './EuclideanPanel'

export function SequencerContainer() {
  const { activeSequencer } = useSequencerContainerStore()

  const renderContent = () => {
    switch (activeSequencer) {
      case 'slicer':
        return <SlicerPanel />
      case 'euclidean':
        return <EuclideanPanel />
      case 'ricochet':
        return (
          <div
            className="flex-1 flex items-center justify-center"
            style={{ color: 'var(--text-muted)' }}
          >
            Coming soon
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="flex flex-row h-full">
      <SequencerIconBar />
      <div className="flex-1 min-w-0">
        {renderContent()}
      </div>
    </div>
  )
}
