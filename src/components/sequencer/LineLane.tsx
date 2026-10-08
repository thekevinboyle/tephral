import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useEffectSequencerStore, defaultTrackLine, type EffectTrack } from '../../stores/effectSequencerStore'
import { useUIStore } from '../../stores/uiStore'
import { skewPhase, type WarpPoint } from '../../effects/warp/warpMath'
import { getLinePhase } from '../../effects/lines/linePhase'
import { LinePlot, PAD } from '../performance/lines/LinePlot'
import { linePath } from '../performance/lines/linePath'
import { handleLineKey } from '../performance/lines/lineKeys'
import { describePoint } from '../performance/warp/warpEdit'
import { useLineEditStore } from './lineSelection'
import { useLineLockStore } from './lineLocks'
import { fmtBars, fmtScale, trackBars } from './lineFormat'

const COLS = 16
/** Keys the focused lane keeps from the Sequencer's window shortcuts, handled or not. */
const LANE_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '1', '2', '3', '4'])

interface Props {
  effectId: string
  track: EffectTrack
  color: string
  label: string
  selected: boolean
  onSelect: () => void
}

/**
 * The track row is draggable (reorder). A native drag starting inside the lane would cancel the pointer gesture
 * (pointercancel), so the row is not draggable from a pointer press in the lane until it is released.
 */
function holdRowDrag(e: React.PointerEvent) {
  const row = (e.currentTarget as Element).closest('[draggable="true"]') as HTMLElement | null
  if (!row) return
  row.draggable = false
  const release = () => {
    row.draggable = true
    window.removeEventListener('pointerup', release, true)
    window.removeEventListener('pointercancel', release, true)
  }
  window.addEventListener('pointerup', release, true)
  window.addEventListener('pointercancel', release, true)
}

/**
 * A Line track's lane (spec §4): the 16-column grid, the filled area under the line in the effect's colour, the
 * line and a --live playhead (rAF from getLinePhase, only while the Sequencer tab shows and the sequencer plays).
 * Unselected it is a 58 px preview and a click only selects the track; selected it is a 170 px LinePlot editor
 * (tool and point selection in useLineEditStore). Handled keys stop propagating, so they never reach the
 * sequencer's own shortcuts.
 */
export const LineLane = memo(function LineLane({ effectId, track, color, label, selected, onSelect }: Props) {
  const line = track.line ?? defaultTrackLine()
  const tool = useLineEditStore((s) => s.tool)
  const sel = useLineEditStore((s) => s.selected)
  const setSelected = useLineEditStore((s) => s.setSelected)
  const resolution = useEffectSequencerStore((s) => s.resolution)
  const isPlaying = useEffectSequencerStore((s) => s.isPlaying)
  const visible = useUIStore((s) => s.bottomTab === 'sequencer' && s.showBottom)
  const [announce, setAnnounce] = useState('')
  const locked = useLineLockStore((s) => s.lockMode && !!s.locks[effectId])

  const boxRef = useRef<HTMLDivElement>(null)
  const headRef = useRef<HTMLDivElement>(null)
  const own = useRef<WarpPoint[] | null>(null)
  const editing = useRef(false) // store subscribers run inside setTrackLine, before `own` is known
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

  // A lane that becomes the selected one is scrolled into view in the track list: at 170 px it can sit below the fold
  useEffect(() => {
    if (!selected) return
    const el = boxRef.current
    ;(el?.closest('[data-track-row]') ?? el)?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [selected])

  // A lane that becomes the edited one starts with no point selected; while edited, a change to its points that
  // the lane did not make (preset, dice, bank) drops the selection, whose index may no longer mean anything
  useEffect(() => {
    if (!selected) return
    useLineEditStore.getState().setSelected(null)
    return useEffectSequencerStore.subscribe((s, prev) => {
      const a = s.tracks[effectId]?.line?.points, b = prev.tracks[effectId]?.line?.points
      if (a !== b && !editing.current && a !== own.current) useLineEditStore.getState().setSelected(null)
    })
  }, [selected, effectId])

  // Playhead: rAF only while the Sequencer tab shows and the sequencer plays; allocation-free per frame
  useEffect(() => {
    const head = headRef.current
    if (!head) return
    if (!visible || !isPlaying || w < 2) { head.hidden = true; return }
    let raf = 0
    const frame = () => {
      raf = requestAnimationFrame(frame)
      const ph = getLinePhase(effectId)
      if (ph === null) { if (!head.hidden) head.hidden = true; return }
      if (head.hidden) head.hidden = false
      const skew = useEffectSequencerStore.getState().tracks[effectId]?.line?.skew ?? 0
      head.style.transform = `translateX(${(PAD + skewPhase(ph, skew) * iw).toFixed(1)}px)`
    }
    frame()
    return () => cancelAnimationFrame(raf)
  }, [visible, isPlaying, effectId, w, iw])

  const getPoints = () => (useEffectSequencerStore.getState().tracks[effectId]?.line ?? defaultTrackLine()).points
  const setPoints = (p: WarpPoint[]) => {
    editing.current = true
    try { useEffectSequencerStore.getState().setTrackLine(effectId, { points: p }) } finally { editing.current = false }
    own.current = useEffectSequencerStore.getState().tracks[effectId].line.points
    return own.current
  }
  const say = (pts: WarpPoint[], i: number) => {
    const t = describePoint(pts, i)
    setAnnounce(t)
    useUIStore.getState().setStatusText(t)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!selected || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return
    const inPlot = !!(e.target as Element).closest('[data-line-graph]')
    const handled = handleLineKey(e, {
      points: getPoints(), snap: line.snap, selected: sel, setSelected,
      setPoints, say, announce: setAnnounce, inPlot,
    })
    // In the focused plot the arrows and 1-4 belong to the lane even with no point selected: keep them from the
    // Sequencer's window shortcuts (step selection, step page). Space and Escape still reach it.
    if (!handled && inPlot && LANE_KEYS.has(e.key)) e.stopPropagation()
  }

  const d = w > 0 ? linePath(line.points, X, Y) : ''
  const fill = w > 0 ? <path d={`${d} L${X(1).toFixed(1)} ${Y(1).toFixed(1)} L${X(0).toFixed(1)} ${Y(1).toFixed(1)} Z`} style={{ fill: 'var(--lane)', fillOpacity: 0.16 }} pointerEvents="none" /> : null
  const scale = track.timeScale ?? 1
  const span = `${fmtBars(trackBars(track.length, resolution, scale))} bars · ${fmtScale(scale)}`
  const owner = track.audioGate || track.audioReactive?.enabled ? 'Audio gate controls Dry/wet' : track.midiGate ? 'MIDI gate controls Dry/wet' : null

  return (
    <div
      ref={boxRef}
      className="seg-line-lane"
      data-line-lane={effectId}
      data-selected={selected || undefined}
      data-tool={selected ? tool : undefined}
      data-locked={locked || undefined}
      style={{ '--lane': color } as React.CSSProperties}
      onKeyDown={onKeyDown}
      onPointerDownCapture={holdRowDrag}
      onDragStart={(e) => { e.preventDefault(); e.stopPropagation() }}
    >
      {selected ? (
        <LinePlot
          attr="line"
          points={line.points}
          getPoints={getPoints}
          setPoints={setPoints}
          snap={line.snap}
          tool={tool}
          selected={sel}
          onSelect={setSelected}
          width={w}
          height={h}
          ariaLabel={`${label} line: height is how much of the effect plays. Top is the card's Dry/wet, bottom is dry`}
          backChildren={fill}
        >
          <text className="seg-line-edge" x={PAD + 4} y={PAD + 10} pointerEvents="none">{span}</text>
          <text className="seg-line-edge" x={w - PAD - 14} y={PAD + 10} textAnchor="end" pointerEvents="none">wet (card&apos;s Dry/wet)</text>
          <text className="seg-line-edge" x={w - PAD - 14} y={h - PAD - 5} textAnchor="end" pointerEvents="none">dry</text>
        </LinePlot>
      ) : (
        w > 0 && (
          <svg
            width={w}
            height={h}
            viewBox={`0 0 ${w} ${h}`}
            aria-label={`${label} line. Click to edit`}
            role="img"
            onPointerDown={(e) => { if (e.button !== 0) return; e.stopPropagation(); onSelect() }}
          >
            {Array.from({ length: COLS + 1 }, (_, i) => (
              <line key={i} x1={X(i / COLS)} y1={0} x2={X(i / COLS)} y2={h} style={{ stroke: i % 4 ? 'var(--warp-grid)' : 'var(--border)' }} strokeWidth={1} />
            ))}
            {fill}
            <path d={d} style={{ stroke: 'var(--lane)' }} strokeWidth={1.5} fill="none" strokeLinejoin="round" pointerEvents="none" />
          </svg>
        )
      )}
      <div ref={headRef} className="seg-line-playhead" data-line-playhead hidden />
      {owner && <span className="seg-line-owner" data-line-owner-note>{owner}</span>}
      <span className="sr-only" aria-live="polite">{announce}</span>
    </div>
  )
})
