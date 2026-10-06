import { memo } from 'react'
import { SequencerContainer } from '../sequencer/SequencerContainer'
import { BottomPanel } from './BottomPanel'

/**
 * Bottom dock (laptop/narrow) or right column (ultrawide): sequencer above, modulation tabs below.
 * No props and no store reads, so it never re-renders. Height follows the track count (cap in
 * layout.css, snaps, no transition). The sequencer panel owns the empty state and sets
 * `data-dock-empty` itself; its track list is the only scroller.
 */
export const Dock = memo(function Dock() {
  return (
    <div className="seg-dock">
      <div className="seg-dock-seq">
        <SequencerContainer />
      </div>
      <div className="seg-dock-tabs">
        <BottomPanel />
      </div>
    </div>
  )
})
