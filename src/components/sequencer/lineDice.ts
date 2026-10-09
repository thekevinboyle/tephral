// The Lines view's dice (lines editor spec §4.2) and the open line's read / write helpers.
import { useEffectSequencerStore, defaultTrackLine, type TrackLine } from '../../stores/effectSequencerStore'
import { useUIStore } from '../../stores/uiStore'
import { randomCurves, randomSteps } from '../../effects/warp/warpMath'
import { useLineLockStore } from './lineLocks'

export const MASTER_LOCK = '__master'
const roll = (snap: number) => (Math.random() < 0.5 ? randomSteps(snap || 1 / 16) : randomCurves(snap || 1 / 16))

const DEFAULT_LINE = defaultTrackLine()

/** The line a Lines tab edits: the master's for 'master', otherwise that effect's track line. */
export function readLine(tab: string): TrackLine {
  const s = useEffectSequencerStore.getState()
  return { ...DEFAULT_LINE, ...(tab === 'master' ? s.master.line : s.tracks[tab]?.line) }
}

/** Write a patch to the line a Lines tab edits. */
export function writeLine(tab: string, patch: Partial<TrackLine>): void {
  const s = useEffectSequencerStore.getState()
  if (tab === 'master') s.setMasterLine(patch)
  else s.setTrackLine(tab, patch)
}

/** Dice one Line track: random steps or curves, equal chance; snap, skew, amount, beats and gridY are kept. */
export function diceLine(id: string): void {
  const t = useEffectSequencerStore.getState().tracks[id]
  if (!t || t.mode !== 'line') return
  useEffectSequencerStore.getState().setTrackLine(id, { points: roll((t.line ?? defaultTrackLine()).snap) })
}

export function diceMaster(): void {
  const s = useEffectSequencerStore.getState()
  s.setMasterLine({ points: roll(s.master.line.snap) })
}

/** Every unlocked Line track, and the master unless it is locked. Steps tracks are never touched. */
export function diceAllLines(): void {
  const { tracks } = useEffectSequencerStore.getState()
  const { locks } = useLineLockStore.getState()
  const ids = Object.keys(tracks).filter((id) => tracks[id].mode === 'line' && !locks[id])
  ids.forEach(diceLine)
  const master = !locks[MASTER_LOCK]
  if (master) diceMaster()
  const n = ids.length + (master ? 1 : 0)
  useUIStore.getState().setStatusText(n ? `New lines on ${ids.length} ${ids.length === 1 ? 'track' : 'tracks'}${master ? ' and the master' : ''}` : 'Every line is locked, so the dice changed nothing')
}
