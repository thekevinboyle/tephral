import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useEffectSequencerStore, defaultTrackLine, GRID_Y, LINE_BEATS, type TrackLine } from '../../stores/effectSequencerStore'
import { SNAPS } from '../../stores/warpStore'
import { useUIStore } from '../../stores/uiStore'
import { getEffectInfo } from '../../config/effectNames'
import { getLinePhase, getMasterPhase } from '../../effects/lines/linePhase'
import { lineLevel } from '../../effects/lines/lineLevel'
import { randomCurves, randomSteps, skewPhase, type WarpPoint } from '../../effects/warp/warpMath'
import { statusHover } from '../../utils/statusHover'
import { LinePlot, PAD } from '../performance/lines/LinePlot'
import { linePath } from '../performance/lines/linePath'
import { handleLineKey } from '../performance/lines/lineKeys'
import { LINE_TOOLS } from '../performance/lines/lineTools'
import { describePoint } from '../performance/warp/warpEdit'
import { SaveLine } from '../performance/warp/WarpLineTools'
import { Spin } from '../performance/warp/WarpSettingsRow'
import { noteLinesViewRender, useLineEditStore, useLinePickStore } from './lineSelection'
import { readLine, writeLine } from './lineDice'
import { fmtBeats, fmtLoop } from './lineFormat'
import { LineTabs } from './LineTabs'
import { LineLinesMenu, LineSidePanel } from './LineSidePanel'

const DEFAULT_LINE = defaultTrackLine()
const FLAT: WarpPoint[] = [{ x: 0, y: 0 }, { x: 1, y: 0 }]
const SAMPLES = 200
const NONE: (string | WarpPoint[])[] = []
/** Keys the focused graph keeps from the Sequencer's window shortcuts, handled or not. */
const LANE_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '1', '2', '3', '4'])

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const nearestIdx = (list: readonly number[], v: number) => {
  let best = 0
  list.forEach((c, i) => { if (Math.abs(c - v) < Math.abs(list[best] - v)) best = i })
  return best
}

/**
 * The Sequencer's Lines view (lines editor spec §4.2): the tab row, then the Warp-style editor (tools, graph, bar)
 * for the open tab's line, and the side panel. The open tab is uiStore.lineTab; a tab whose effect left the chain
 * falls back to Master.
 */
export const LinesView = memo(function LinesView({ ids, colors }: { ids: string[]; colors: Record<string, string> }) {
  if (import.meta.env.DEV) noteLinesViewRender()
  const lineTab = useUIStore((s) => s.lineTab)
  // A tab whose effect is not in the chain renders as Master; the stored tab is only dropped when the chain is
  // non-empty and really lacks it (a bank load can pass through an empty chain)
  const tab = lineTab !== 'master' && !ids.includes(lineTab) ? 'master' : lineTab
  const isMaster = tab === 'master'
  useEffect(() => { if (tab !== lineTab && ids.length > 0) useUIStore.getState().setLineTab('master') }, [tab, lineTab, ids])

  const line = useEffectSequencerStore((s) => (isMaster ? s.master.line : s.tracks[tab]?.line)) ?? DEFAULT_LINE
  const master = useEffectSequencerStore((s) => s.master)
  // The master tab draws every Line track's line faintly: [id, points] pairs, flat, compared shallowly
  const layers = useEffectSequencerStore(useShallow((s) => (isMaster ? ids.flatMap((id) => (s.tracks[id]?.mode === 'line' ? [id, s.tracks[id].line?.points ?? FLAT] : [])) : NONE)))
  const tool = useLineEditStore((s) => s.tool)
  const sel = useLineEditStore((s) => s.selected)
  const setSelected = useLineEditStore((s) => s.setSelected)
  const isPlaying = useEffectSequencerStore((s) => s.isPlaying)
  const visible = useUIStore((s) => s.bottomTab === 'sequencer' && s.showBottom)
  const [announce, setAnnounce] = useState('')

  const title = isMaster ? 'Master' : getEffectInfo(tab).name
  const color = isMaster ? 'var(--warp)' : colors[tab] ?? 'var(--text-muted)'

  const boxRef = useRef<HTMLDivElement>(null)
  const headRef = useRef<HTMLDivElement>(null)
  const own = useRef<WarpPoint[] | null>(null)
  const editing = useRef(false) // store subscribers run inside the write, before `own` is known
  const [size, setSize] = useState({ w: 0, h: 0 })

  useLayoutEffect(() => {
    const el = boxRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const w = Math.round(el.clientWidth), h = Math.round(el.clientHeight)
      setSize((s) => (s.w === w && s.h === h ? s : { w, h }))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const { w, h } = size
  const iw = Math.max(1, w - 2 * PAD), ih = Math.max(1, h - 2 * PAD)
  const X = (x: number) => PAD + x * iw
  const Y = (y: number) => PAD + y * ih

  // A tab that opens starts with no point selected; a change to its points the editor did not make (preset, dice,
  // bank) drops the selection, whose index may no longer mean anything
  useEffect(() => {
    useLineEditStore.getState().setSelected(null)
    return useEffectSequencerStore.subscribe((s, prev) => {
      const a = tab === 'master' ? s.master.line.points : s.tracks[tab]?.line?.points
      const b = tab === 'master' ? prev.master.line.points : prev.tracks[tab]?.line?.points
      if (a !== b && !editing.current && a !== own.current) useLineEditStore.getState().setSelected(null)
    })
  }, [tab])

  // Playhead: rAF only while the Sequencer tab shows and the sequencer plays; allocation-free per frame
  useEffect(() => {
    const head = headRef.current
    if (!head) return
    if (!visible || !isPlaying || w < 2) { head.hidden = true; return }
    let raf = 0
    const frame = () => {
      raf = requestAnimationFrame(frame)
      const ph = tab === 'master' ? getMasterPhase() : getLinePhase(tab)
      if (ph === null) { if (!head.hidden) head.hidden = true; return }
      if (head.hidden) head.hidden = false
      const s = useEffectSequencerStore.getState()
      const skew = (tab === 'master' ? s.master.line.skew : s.tracks[tab]?.line?.skew) ?? 0
      head.style.transform = `translateX(${(PAD + skewPhase(ph, skew) * iw).toFixed(1)}px)`
    }
    frame()
    return () => cancelAnimationFrame(raf)
  }, [visible, isPlaying, tab, w, iw])

  const getPoints = () => readLine(tab).points
  const setPoints = (p: WarpPoint[]) => {
    editing.current = true
    try { writeLine(tab, { points: p }) } finally { editing.current = false }
    own.current = readLine(tab).points
    return own.current
  }
  const write = (patch: Partial<TrackLine>) => writeLine(tab, patch)
  const say = (pts: WarpPoint[], i: number) => {
    const t = describePoint(pts, i)
    setAnnounce(t)
    useUIStore.getState().setStatusText(t)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const target = e.target as Element
    // the save name field keeps its keys to itself; the menu's arrows (handled there) stop here too
    if (target.closest('input') || (e.defaultPrevented && (e.key === 'ArrowUp' || e.key === 'ArrowDown'))) { e.stopPropagation(); return }
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || target.closest('[data-line-lines-menu]')) return
    // Point keys (Delete, nudges, [ ]) only from the focused graph: toolbar buttons, Spins and the side panel
    // keep their own keys and never edit the selected point
    const inPlot = !!target.closest('[data-line-graph]')
    if (!inPlot) return
    const handled = handleLineKey(e, {
      points: getPoints(), snap: line.snap, selected: sel, setSelected,
      setPoints, say, announce: setAnnounce, inPlot,
    })
    // In the focused graph the arrows and 1-4 belong to the editor even with no point selected: keep them from the
    // Sequencer's window shortcuts (step selection, step page). Space and Escape still reach it.
    if (!handled && LANE_KEYS.has(e.key)) e.stopPropagation()
  }

  // ── bar steps ──
  const stepAmount = (dir: number, big: boolean) => write({ amount: clamp(Math.round(readLine(tab).amount * 100) + dir * (big ? 10 : 1), 0, 100) / 100 })
  const stepBeats = (dir: number) => write({ beats: LINE_BEATS[clamp(nearestIdx(LINE_BEATS, readLine(tab).beats) + dir, 0, LINE_BEATS.length - 1)] })
  const stepSnap = (dir: number) => write({ snap: SNAPS[clamp(nearestIdx(SNAPS, readLine(tab).snap) + dir, 0, SNAPS.length - 1)] })
  const stepGridY = (dir: number) => write({ gridY: GRID_Y[clamp(nearestIdx(GRID_Y, readLine(tab).gridY) + dir, 0, GRID_Y.length - 1)] })
  const stepSkew = (dir: number, big: boolean) => write({ skew: clamp(Math.round(readLine(tab).skew * 100) + dir * (big ? 10 : 1), -100, 100) / 100 })

  // ── overlays ──
  let back: React.ReactNode = null
  if (w > 0 && !isMaster) {
    const m = master.line
    let d = `M${X(0).toFixed(1)} ${Y(1).toFixed(1)}`
    for (let i = 0; i <= SAMPLES; i++) {
      const x = i / SAMPLES
      // Not phase-aligned when the track's and the master's lengths differ: a visual aid only
      const v = lineLevel(line.points, x, line.skew, line.amount) * (master.enabled ? lineLevel(m.points, x, m.skew, m.amount) : 1)
      d += ` L${X(x).toFixed(1)} ${Y(1 - v).toFixed(1)}`
    }
    d += ` L${X(1).toFixed(1)} ${Y(1).toFixed(1)} Z`
    back = (
      <>
        <path d={d} style={{ fill: color, fillOpacity: 0.22 }} pointerEvents="none" data-line-hear />
        {master.enabled && <path d={linePath(m.points, X, Y)} style={{ stroke: 'var(--warp)' }} strokeDasharray="5 4" strokeWidth={1.4} fill="none" pointerEvents="none" data-line-master-dash />}
      </>
    )
  } else if (w > 0) {
    const out: React.ReactNode[] = []
    for (let i = 0; i < layers.length; i += 2) {
      const id = layers[i] as string
      out.push(<path key={id} d={linePath(layers[i + 1] as WarpPoint[], X, Y)} style={{ stroke: colors[id] ?? 'var(--text-muted)' }} strokeOpacity={0.45}
        strokeWidth={1.3} fill="none" pointerEvents="none" />)
    }
    back = out
  }

  const snapDen = line.snap > 0 ? Math.round(1 / line.snap) : 0
  const skew = Math.round(line.skew * 100)
  const amount = Math.round(line.amount * 100)
  const pick = useLinePickStore.getState().setPick

  return (
    <div className="seg-lines" data-lines-view onKeyDown={onKeyDown}>
      <LineTabs ids={ids} colors={colors} />
      <div className="seg-lines-body">
        <div className="seg-warp-main seg-lines-main">
          <div className="seg-warp-tools" role="toolbar" aria-label={`${title} line tools`}>
            {LINE_TOOLS.map((t) => (
              <button key={t.id} type="button" className="seg-warp-tool" data-line-tool={t.id} aria-pressed={tool === t.id}
                onClick={() => useLineEditStore.getState().setTool(t.id)} {...statusHover(t.status)}>
                {t.name}
                {t.id === 'steps' && <span className="seg-warp-kbd" aria-hidden="true">⇧</span>}
              </button>
            ))}
            <span className="seg-warp-sep" aria-hidden="true" />
            <button type="button" className="seg-warp-tool" data-line-random="steps" onClick={() => write({ points: randomSteps(readLine(tab).snap || 1 / 16) })}
              {...statusHover(`Random steps: a new staircase for the ${title} line on the quantize grid`)}>
              Random steps
            </button>
            <button type="button" className="seg-warp-tool" data-line-random="curves" onClick={() => write({ points: randomCurves(readLine(tab).snap || 1 / 16) })}
              {...statusHover(`Random curves: a new line of slopes and curves for ${title} on the quantize grid`)}>
              Random curves
            </button>
            <button type="button" className="seg-warp-tool" data-line-clear onClick={() => write({ points: FLAT })}
              {...statusHover(isMaster ? 'Clear: a flat master line along the top, so it changes nothing' : 'Clear: a flat line along the top, so the effect plays at its full Dry/wet')}>
              Clear
            </button>
            <span className="seg-warp-sep" aria-hidden="true" />
            <span className="seg-warp-tools-gap" />
            <LineLinesMenu tab={tab} title={title} />
            <SaveLine attr="line" getPoints={getPoints} onSaved={(n) => pick({ tab, name: n, points: readLine(tab).points })} onAnnounce={setAnnounce} />
          </div>
          <div className="seg-lines-graph" ref={boxRef} data-tool={tool}>
            {w > 0 && (
              <LinePlot
                attr="line"
                points={line.points}
                getPoints={getPoints}
                setPoints={setPoints}
                snap={line.snap}
                gridY={line.gridY}
                tool={tool}
                selected={sel}
                onSelect={setSelected}
                width={w}
                height={h}
                ariaLabel={`${title} line: height is how much ${isMaster ? 'of every track' : 'of the effect'} plays. Top is the card's Dry/wet, bottom is dry`}
                backChildren={back}
              >
                <text className="seg-line-edge" x={PAD + 4} y={PAD + 10} pointerEvents="none">{fmtLoop(line.beats)}{isMaster ? '' : master.enabled ? ' · master dashed' : ''}</text>
                <text className="seg-line-edge" x={w - PAD - 4} y={PAD + 10} textAnchor="end" pointerEvents="none">wet (card&apos;s Dry/wet)</text>
                <text className="seg-line-edge" x={w - PAD - 4} y={h - PAD - 5} textAnchor="end" pointerEvents="none">dry</text>
              </LinePlot>
            )}
            <div ref={headRef} className="seg-line-playhead" data-line-playhead hidden />
          </div>
          <span className="sr-only" aria-live="polite">{announce}</span>
          <div className="seg-warp-settings seg-lines-settings">
            <Spin attr="line-setting" id="amount" label="Amount" value={`${amount}%`} now={amount} min={0} max={100} step={stepAmount} pxPerStep={2}
              status="Amount: how deep the line cuts. At 0% the line does nothing, at 100% the bottom is fully dry. Drag or use the arrow keys" />
            <Spin attr="line-setting" id="beats" label="Length" value={fmtBeats(line.beats)} now={line.beats} min={LINE_BEATS[0]} max={LINE_BEATS[LINE_BEATS.length - 1]}
              step={stepBeats} pxPerStep={14}
              status="Length: the line's own loop, from half a beat to 16 beats, on the Sequencer's Play and BPM. Drag or use the arrow keys" />
            <Spin attr="line-setting" id="snap" label="Quantize" value={snapDen ? `1/${snapDen}` : 'Off'} now={snapDen} min={0}
              max={Math.round(1 / SNAPS[SNAPS.length - 1])} step={stepSnap} pxPerStep={14}
              status="Quantize: the grid points and steps land on across the track's loop. Off places points freely. Drag or use the arrow keys" />
            <Spin attr="line-setting" id="gridy" label="Grid Y" value={String(line.gridY)} now={line.gridY} min={GRID_Y[0]} max={GRID_Y[GRID_Y.length - 1]}
              step={stepGridY} pxPerStep={14}
              status="Grid Y: the rows Alt snaps heights to. Drag or use the arrow keys" />
            <Spin attr="line-setting" id="skew" label="Skew" value={`${skew > 0 ? '+' : skew < 0 ? '−' : '+'}${Math.abs(skew)}%`} now={skew}
              min={-100} max={100} step={stepSkew} pxPerStep={2}
              status="Skew: bends time before the line is read. Positive plays the start of the loop faster. Drag or use the arrow keys" />
          </div>
        </div>
        <LineSidePanel tab={tab} />
      </div>
    </div>
  )
})
