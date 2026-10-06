import { SequencerContainer } from '../sequencer/SequencerContainer'
import { BottomPanel } from './BottomPanel'

/** Bottom dock (laptop/narrow) or right column (ultrawide): sequencer above, modulation tabs below. */
export function Dock() {
  return (
    <>
      <div className="min-h-0" style={{ flex: '1 1 auto' }}>
        <SequencerContainer hideTabsBar />
      </div>
      <div className="flex-shrink-0" style={{ marginTop: 'auto' }}>
        <BottomPanel />
      </div>
    </>
  )
}
