import { memo, useMemo, type ReactNode } from 'react'
import { SequencerContainer } from '../sequencer/SequencerContainer'
import { BottomPanel } from './BottomPanel'
import { useActiveEffects } from '../../hooks/useActiveEffects'

/**
 * Frame: the only part that reads the track count. Its children are created once by Dock
 * (stable element identity), so a store tick re-renders this wrapper but not the sequencer.
 */
function DockFrame({ children }: { children: ReactNode }) {
  const count = useActiveEffects().sortedEffects.length
  return (
    <div className="seg-dock" data-dock-empty={count === 0 || undefined}>
      {children}
    </div>
  )
}

/**
 * Bottom dock (laptop/narrow) or right column (ultrawide): sequencer above, modulation tabs below.
 * Height follows the track count (cap and scroll live in layout.css) and snaps, never animates.
 * The empty hint is rendered by the sequencer's track list.
 */
export const Dock = memo(function Dock() {
  const body = useMemo(
    () => (
      <>
        <div className="seg-dock-seq">
          <SequencerContainer hideTabsBar />
        </div>
        <div className="seg-dock-tabs">
          <BottomPanel />
        </div>
      </>
    ),
    [],
  )
  return <DockFrame>{body}</DockFrame>
})
