import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useEffectSequencerStore, defaultTrackLine, type EffectTrack } from '../../stores/effectSequencerStore'
import { useUIStore } from '../../stores/uiStore'
import { skewPhase } from '../../effects/warp/warpMath'
import { getLinePhase } from '../../effects/lines/linePhase'
import { PAD } from '../performance/lines/LinePlot'
import { linePath } from '../performance/lines/linePath'

const COLS = 16

interface Props {
  effectId: string
  track: EffectTrack
  color: string
  label: string
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
 * A Line track's preview in the Steps view (lines editor spec §4.1): the 16-column grid, the filled area under the
 * line in the effect's colour, the line and a --live playhead (rAF from getLinePhase, only while the Sequencer tab
 * shows and the sequencer plays). A press selects the track and opens the Lines view on its tab.
 */
export const LineLane = memo(function LineLane({ effectId, track, color, label, onSelect }: Props) {
  const line = track.line ?? defaultTrackLine()
  const isPlaying = useEffectSequencerStore((s) => s.isPlaying)
  const visible = useUIStore((s) => s.bottomTab === 'sequencer' && s.showBottom)

  const boxRef = useRef<HTMLDivElement>(null)
  const headRef = useRef<HTMLDivElement>(null)
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

  const openLines = () => {
    onSelect()
    const ui = useUIStore.getState()
    ui.setLineTab(effectId)
    ui.setSequencerView('lines')
  }
  const open = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.stopPropagation()
    openLines()
  }

  const d = w > 0 ? linePath(line.points, X, Y) : ''
  const owner = track.audioGate || track.audioReactive?.enabled ? 'Audio gate controls Dry/wet' : track.midiGate ? 'MIDI gate controls Dry/wet' : null

  return (
    <div
      ref={boxRef}
      className="seg-line-lane"
      data-line-lane={effectId}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); openLines() } }}
      aria-label={`${label} line. Click to edit it in Lines`}
      style={{ '--lane': color } as React.CSSProperties}
      onPointerDownCapture={holdRowDrag}
      onPointerDown={open}
      onDragStart={(e) => { e.preventDefault(); e.stopPropagation() }}
    >
      {w > 0 && (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
          {Array.from({ length: COLS + 1 }, (_, i) => (
            <line key={i} x1={X(i / COLS)} y1={0} x2={X(i / COLS)} y2={h} style={{ stroke: i % 4 ? 'var(--warp-grid)' : 'var(--border)' }} strokeWidth={1} />
          ))}
          <path d={`${d} L${X(1).toFixed(1)} ${Y(1).toFixed(1)} L${X(0).toFixed(1)} ${Y(1).toFixed(1)} Z`} style={{ fill: 'var(--lane)', fillOpacity: 0.16 }} />
          <path d={d} style={{ stroke: 'var(--lane)' }} strokeWidth={1.5} fill="none" strokeLinejoin="round" />
        </svg>
      )}
      <div ref={headRef} className="seg-line-playhead" data-line-playhead hidden />
      {owner && <span className="seg-line-owner" data-line-owner-note>{owner}</span>}
    </div>
  )
})
