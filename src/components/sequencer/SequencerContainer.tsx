import { useSequencerContainerStore } from '../../stores/sequencerContainerStore'
import { SequencerIconBar } from './SequencerIconBar'
import { SlicerPanel } from './SlicerPanel'
import { EuclideanPanel } from './EuclideanPanel'
import { RicochetPanel } from './RicochetPanel'

export function SequencerContainer() {
  const { activeSequencer } = useSequencerContainerStore()

  const renderContent = () => {
    switch (activeSequencer) {
      case 'slicer':
        return <SlicerPanel />
      case 'euclidean':
        return <EuclideanPanel />
      case 'ricochet':
        return <RicochetPanel />
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
