import { useSequencerContainerStore } from '../../stores/sequencerContainerStore'
import { SequencerIconBar } from './SequencerIconBar'
import { SequencerPanel } from './SequencerPanel'

export function SequencerContainer() {
  const { activeSequencer } = useSequencerContainerStore()

  const renderContent = () => {
    switch (activeSequencer) {
      case 'steps':
        return <SequencerPanel />
      case 'slicer':
        return (
          <div
            className="flex-1 flex items-center justify-center"
            style={{ color: 'var(--text-muted)' }}
          >
            Slicer coming soon
          </div>
        )
      case 'slot3':
      case 'slot4':
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
