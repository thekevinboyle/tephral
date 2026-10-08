import { memo, useState } from 'react'
import { defaultTrackLine, useEffectSequencerStore, type TrackLine } from '../../stores/effectSequencerStore'
import { SNAPS } from '../../stores/warpStore'
import { useUIStore } from '../../stores/uiStore'
import { getEffectInfo } from '../../config/effectNames'
import { LANE_PRESET_NAMES, lanePresetPoints } from '../../effects/lines/lanePresets'
import { randomCurves, randomSteps, type WarpPoint } from '../../effects/warp/warpMath'
import { statusHover } from '../../utils/statusHover'
import { LINE_TOOLS } from '../performance/lines/lineTools'
import { LinesMenu, SaveLine } from '../performance/warp/WarpLineTools'
import { Spin } from '../performance/warp/WarpSettingsRow'
import { LockIcon } from '../performance/warp/WarpLock'
import { useLineEditStore } from './lineSelection'
import { useLineLockStore } from './lineLocks'

const DEFAULT_LINE = defaultTrackLine()
const FLAT: WarpPoint[] = [{ x: 0, y: 0 }, { x: 1, y: 0 }]

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const nearestIdx = (list: readonly number[], v: number) => {
  let best = 0
  list.forEach((c, i) => { if (Math.abs(c - v) < Math.abs(list[best] - v)) best = i })
  return best
}
const status = (t: string | null) => useUIStore.getState().setStatusText(t)
const lineOf = (id: string): TrackLine => useEffectSequencerStore.getState().tracks[id]?.line ?? DEFAULT_LINE

/** Dice one Line track (spec §5): random steps or random curves with equal chance; snap and skew are kept. */
function diceLine(id: string) {
  const t = useEffectSequencerStore.getState().tracks[id]
  if (!t || t.mode !== 'line') return
  const snap = (t.line ?? defaultTrackLine()).snap || 1 / 16
  useEffectSequencerStore.getState().setTrackLine(id, { points: Math.random() < 0.5 ? randomSteps(snap) : randomCurves(snap) })
}

/** Dice every Line track that is not locked. Steps tracks are never touched. */
function diceAllLines() {
  const { tracks } = useEffectSequencerStore.getState()
  const { locks } = useLineLockStore.getState()
  const ids = Object.keys(tracks).filter((id) => tracks[id].mode === 'line' && !locks[id])
  ids.forEach(diceLine)
  status(ids.length ? `New lines on ${ids.length} ${ids.length === 1 ? 'track' : 'tracks'}` : 'Every Line track is locked, so the dice changed nothing')
}

/**
 * The Sequencer toolbar for a selected Line track (spec §4, §5): "<Effect> line", the tools, Lines ▾ / Save line /
 * Clear, Quantize and Skew, then lock mode, Dice track and Dice all lines. Keys handled here stop propagating, so
 * they never reach the sequencer's own shortcuts.
 */
export const LineToolbar = memo(function LineToolbar({ effectId }: { effectId: string }) {
  const name = getEffectInfo(effectId).name
  const tool = useLineEditStore((s) => s.tool)
  const line = useEffectSequencerStore((s) => s.tracks[effectId]?.line) ?? DEFAULT_LINE
  const lockMode = useLineLockStore((s) => s.lockMode)
  const [announce, setAnnounce] = useState('')
  // The loaded line's name, kept with the track and the points it produced: selecting another track forgets it,
  // and points changed by anything else (an edit, the dice) show Custom
  const [pick, setPick] = useState<{ id: string; name: string; points: WarpPoint[] } | null>(null)
  if (pick && pick.id !== effectId) setPick(null) // another track selected: forget the name (render-time reset)
  const presetName = pick && pick.id === effectId && pick.points === line.points ? pick.name : null

  const setLine = (patch: Partial<TrackLine>) => useEffectSequencerStore.getState().setTrackLine(effectId, patch)
  const loadPoints = (points: WarpPoint[], n: string) => {
    setLine({ points })
    setPick({ id: effectId, name: n, points: lineOf(effectId).points })
  }

  const stepSnap = (dir: number) => {
    const i = clamp(nearestIdx(SNAPS, lineOf(effectId).snap) + dir, 0, SNAPS.length - 1)
    setLine({ snap: SNAPS[i] })
  }
  const stepSkew = (dir: number, big: boolean) => {
    const v = Math.round(lineOf(effectId).skew * 100) + dir * (big ? 10 : 1)
    setLine({ skew: clamp(v, -100, 100) / 100 })
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    // the save name field keeps its keys to itself; the menu's arrows (handled there) stop here too
    if ((e.target as Element).closest('input') || (e.defaultPrevented && (e.key === 'ArrowUp' || e.key === 'ArrowDown'))) e.stopPropagation()
  }

  const snapDen = line.snap > 0 ? Math.round(1 / line.snap) : 0
  const skew = Math.round(line.skew * 100)
  return (
    <div className="seg-line-tools" role="toolbar" aria-label={`${name} line tools`} data-line-tools onKeyDown={onKeyDown}>
      <span className="seg-line-ctx">{name} line</span>
      {LINE_TOOLS.map((t) => (
        <button key={t.id} type="button" className="seg-warp-tool" data-line-tool={t.id} aria-pressed={tool === t.id}
          onClick={() => useLineEditStore.getState().setTool(t.id)} {...statusHover(t.status)}>
          {t.name}
          {t.id === 'steps' && <span className="seg-warp-kbd" aria-hidden="true">⇧</span>}
        </button>
      ))}
      <span className="seg-warp-sep" aria-hidden="true" />
      <LinesMenu attr="line" label={`${name} lines`} builtIns={LANE_PRESET_NAMES} current={presetName}
        onPickBuiltIn={(n) => {
          const pts = lanePresetPoints(n, line.snap || 1 / 16)
          if (pts) loadPoints(pts, n)
        }}
        onPickUser={(l) => loadPoints(l.points, l.name)} />
      <SaveLine attr="line" getPoints={() => lineOf(effectId).points}
        onSaved={(n) => setPick({ id: effectId, name: n, points: lineOf(effectId).points })} onAnnounce={setAnnounce} />
      <button type="button" className="seg-warp-tool" data-line-clear onClick={() => setLine({ points: FLAT })}
        {...statusHover('Clear: a flat line along the top, so the effect plays at its full Dry/wet')}>
        Clear
      </button>
      <span className="seg-warp-sep" aria-hidden="true" />
      <Spin attr="line-setting" id="snap" label="Quantize" value={snapDen ? `1/${snapDen}` : 'Off'} now={snapDen} min={0}
        max={Math.round(1 / SNAPS[SNAPS.length - 1])} step={stepSnap} pxPerStep={14}
        status="Quantize: the grid points and steps land on across the track's loop. Off places points freely. Drag or use the arrow keys" />
      <Spin attr="line-setting" id="skew" label="Skew" value={`${skew > 0 ? '+' : skew < 0 ? '−' : '+'}${Math.abs(skew)}%`} now={skew}
        min={-100} max={100} step={stepSkew} pxPerStep={2}
        status="Skew: bends time before the line is read. Positive plays the start of the loop faster. Drag or use the arrow keys" />
      <span className="seg-line-dice">
        <button type="button" className="seg-warp-tool seg-line-lockmode" data-line-lockmode aria-pressed={lockMode} aria-label="Lock mode"
          onClick={() => { const l = useLineLockStore.getState(); l.setLockMode(!l.lockMode) }}
          {...statusHover(lockMode ? 'Lock mode: click a track\'s lock to keep its line when you roll the dice. Click to finish' : 'Lock mode: choose which lines Dice all lines leaves alone')}>
          <LockIcon />
          {lockMode && <span aria-hidden="true">Lock mode</span>}
        </button>
        <button type="button" className="seg-warp-tool" data-line-dice="track" onClick={() => diceLine(effectId)}
          {...statusHover(`Dice track: a new random line for ${name}, as steps or curves. Quantize and Skew stay`)}>
          <span aria-hidden="true">🎲</span> Dice track
        </button>
        <button type="button" className="seg-warp-tool" data-line-dice="all" onClick={diceAllLines}
          {...statusHover('Dice all lines: a new random line on every Line track that is not locked. Steps tracks stay as they are')}>
          <span aria-hidden="true">🎲</span> Dice all lines
        </button>
      </span>
      <span className="sr-only" aria-live="polite">{announce}</span>
    </div>
  )
})
