import { memo, useEffect, useState } from 'react'
import { useUIStore } from '../../../stores/uiStore'
import { useWarpStore } from '../../../stores/warpStore'
import { statusHover } from '../../../utils/statusHover'
import { WarpGraph, type WarpTool } from './WarpGraph'
import { describePoint, editPoints, isOwnEdit } from './warpEdit'
import { WarpSettingsRow } from './WarpSettingsRow'
import { WarpSidePanel } from './WarpSidePanel'
import { LockIcon } from './WarpLock'
import { useWarpLockStore } from './warpLocks'
import { WarpLinesMenu, WarpSaveLine } from './WarpLineTools'
import { handleLineKey } from '../lines/lineKeys'
import { LINE_TOOLS } from '../lines/lineTools'

const randomSteps = () => useWarpStore.getState().randomizeSteps()
const randomCurves = () => useWarpStore.getState().randomizeCurves()
const clearLine = () => useWarpStore.getState().clearLine()

/** Lock mode only: the graph's lock, at the right of the tools (spec §5, mockup view 2). */
const GraphLock = memo(function GraphLock() {
  const show = useWarpLockStore((s) => s.lockMode)
  const locked = useWarpLockStore((s) => s.locks.graph)
  if (!show) return null
  return (
    <button type="button" className="seg-warp-tool seg-warp-graph-lock" data-warp-lock="graph" aria-pressed={locked}
      onClick={() => useWarpLockStore.getState().toggleLock('graph')}
      {...statusHover(locked ? 'Graph locked: Dice keeps this line. Click to unlock' : 'Graph unlocked: Dice draws a new line. Click to lock')}>
      <LockIcon open={!locked} />
      {locked ? 'Graph locked' : 'Graph unlocked'}
    </button>
  )
})

/**
 * The Warp tab (v1 spec §4, v2 spec §2): tools, line actions, Lines / Save line, the graph, the settings row
 * and the side panel.
 * Keys (handled here, every handled key stops propagating): R is Random steps; with the graph focused,
 * [ and ] select the previous / next point; with a point selected, Delete removes it, the arrows
 * nudge it one grid step and Escape deselects it. The selection is announced (status bar + aria-live).
 * Keys from inside the portalled menus and from text fields are left to them.
 */
export const WarpEditor = memo(function WarpEditor() {
  const visible = useUIStore((s) => s.bottomTab === 'warp' && s.showBottom)
  const [tool, setTool] = useState<WarpTool>('draw')
  const [selected, setSelected] = useState<number | null>(null)
  const [announce, setAnnounce] = useState('')

  // A line change the editor did not make (preset, randomize, bank) invalidates the selected index
  useEffect(() => useWarpStore.subscribe((s, prev) => {
    if (s.points !== prev.points && !isOwnEdit(s.points)) setSelected(null)
  }), [])

  const say = (pts: Parameters<typeof describePoint>[0], i: number) => {
    const t = describePoint(pts, i)
    setAnnounce(t)
    useUIStore.getState().setStatusText(t)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return
    const target = e.target as Element
    // portalled menus: React still bubbles their keys here; text fields keep their own keys
    if (target.closest('[data-warp-lines-menu], input, textarea')) return
    const s = useWarpStore.getState()
    if (e.key === 'r' || e.key === 'R') {
      e.preventDefault(); e.stopPropagation()
      s.randomizeSteps()
      setSelected(null)
      return
    }
    handleLineKey(e, {
      points: s.points, snap: s.snap, selected, setSelected,
      setPoints: editPoints, say, announce: setAnnounce,
      inPlot: !!target.closest('[data-warp-graph]'),
    })
  }

  return (
    <div className="seg-warp" data-warp-editor onKeyDown={onKeyDown}>
      <div className="seg-warp-main">
        <div className="seg-warp-tools" role="toolbar" aria-label="Warp tools">
          {LINE_TOOLS.map((t) => (
            <button key={t.id} type="button" className="seg-warp-tool" data-warp-tool={t.id} aria-pressed={tool === t.id}
              onClick={() => setTool(t.id)} {...statusHover(t.status)}>
              {t.name}
              {t.id === 'steps' && <span className="seg-warp-kbd" aria-hidden="true">⇧</span>}
            </button>
          ))}
          <span className="seg-warp-sep" aria-hidden="true" />
          <button type="button" className="seg-warp-tool" data-warp-random="steps" onClick={randomSteps}
            {...statusHover('Random steps: a new staircase of holds and repeats on the quantize grid (R)')}>
            Random steps
          </button>
          <button type="button" className="seg-warp-tool" data-warp-random="curves" onClick={randomCurves}
            {...statusHover('Random curves: a new line of slopes and curves on the quantize grid')}>
            Random curves
          </button>
          <button type="button" className="seg-warp-tool" data-warp-clear onClick={clearLine}
            {...statusHover('Clear: a flat line along the top, so everything plays live')}>
            Clear
          </button>
          <span className="seg-warp-sep" aria-hidden="true" />
          <span className="seg-warp-tools-gap" />
          <GraphLock />
          <WarpLinesMenu />
          <WarpSaveLine onAnnounce={setAnnounce} />
        </div>
        <WarpGraph tool={tool} visible={visible} selected={selected} onSelect={setSelected} />
        <span className="sr-only" aria-live="polite" data-warp-announce>{announce}</span>
        <WarpSettingsRow />
      </div>
      <WarpSidePanel />
    </div>
  )
})
