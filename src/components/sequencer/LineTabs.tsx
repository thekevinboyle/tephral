import { memo, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useEffectSequencerStore, defaultTrackLine } from '../../stores/effectSequencerStore'
import { useUIStore } from '../../stores/uiStore'
import { getEffectInfo } from '../../config/effectNames'
import { statusHover } from '../../utils/statusHover'
import { linePath } from '../performance/lines/linePath'
import type { WarpPoint } from '../../effects/warp/warpMath'
import { useLineLockStore } from './lineLocks'
import { MASTER_LOCK } from './lineDice'

const DEFAULT_POINTS = defaultTrackLine().points

function MiniLine({ points, color }: { points: WarpPoint[]; color: string }) {
  return (
    <svg width={54} height={18} aria-hidden="true" className="seg-line-tab-mini">
      <path d={linePath(points, (x) => x * 54, (y) => 2 + y * 14)} style={{ stroke: color }} fill="none" strokeWidth={1.3} />
    </svg>
  )
}

const COPY_HINT = 'Click to open. Alt-drag onto another tab to copy this line and its settings'

const tabName = (id: string) => (id === 'master' ? 'Master' : getEffectInfo(id).name)

/**
 * Alt-drag tab copy (lines editor spec §5): copies points, amount, beats, snap, gridY and skew from `src` onto
 * `dst` (never mode, steps, Dry/wet or locks). Returns false when the target is locked.
 */
function copyLine(src: string, dst: string): boolean {
  const s = useEffectSequencerStore.getState()
  const from = src === 'master' ? s.master.line : s.tracks[src]?.line
  if (!from) return true
  const ui = useUIStore.getState()
  if (useLineLockStore.getState().locks[dst === 'master' ? MASTER_LOCK : dst]) {
    ui.setStatusText('That line is locked, so the copy was refused')
    return false
  }
  const copy = { points: from.points, amount: from.amount, beats: from.beats, snap: from.snap, gridY: from.gridY, skew: from.skew }
  if (dst === 'master') s.setMasterLine(copy)
  else s.setTrackLine(dst, copy)
  ui.setStatusText(`Copied ${tabName(src)} line to ${tabName(dst)}`)
  return true
}

const Lock = () => <span className="seg-line-tab-lock" aria-label="locked">🔒</span>

const EffectTab = memo(function EffectTab({ id, color, selected }: { id: string; color: string; selected: boolean }) {
  const mode = useEffectSequencerStore((s) => (s.tracks[id]?.mode === 'line' ? 'line' : 'gate'))
  const points = useEffectSequencerStore((s) => s.tracks[id]?.line?.points) ?? DEFAULT_POINTS
  const locked = useLineLockStore((s) => !!s.locks[id])
  const name = getEffectInfo(id).name
  return (
    <button type="button" role="tab" data-line-tab={id} data-mode={mode} aria-selected={selected} tabIndex={selected ? 0 : -1}
      onClick={() => { useUIStore.getState().setLineTab(id); useUIStore.getState().setSelectedEffect(id) }}
      {...statusHover(`${name}: ${mode === 'line' ? 'the line plays' : 'the steps play'}. ${COPY_HINT}`)}>
      <i className="seg-line-tab-dot" style={{ background: color }} aria-hidden="true" />
      <span className="seg-line-tab-name">{name}</span>
      <span className="seg-line-tab-badge">{mode === 'line' ? 'Line' : 'Steps'}</span>
      {locked && <Lock />}
      <MiniLine points={points} color={color} />
    </button>
  )
})

/**
 * The Lines view's tab row (lines editor spec §4.2): Master, then one tab per chain effect in signal order. Arrow
 * Left / Right move between tabs (roving tabIndex); handled keys stop propagating, so the Sequencer's window
 * shortcuts never see them. The row scrolls inside itself.
 */
export const LineTabs = memo(function LineTabs({ ids, colors }: { ids: string[]; colors: Record<string, string> }) {
  const tab = useUIStore((s) => s.lineTab)
  const masterPoints = useEffectSequencerStore((s) => s.master.line.points)
  const masterLocked = useLineLockStore((s) => !!s.locks[MASTER_LOCK])
  const rowRef = useRef<HTMLDivElement>(null)
  const open = tab !== 'master' && ids.includes(tab) ? tab : 'master'
  const [ghost, setGhost] = useState<{ label: string; x: number; y: number } | null>(null)
  const drag = useRef<{ src: string; pointerId: number } | null>(null)
  const target = useRef<HTMLElement | null>(null)
  const swallowClick = useRef(false)
  const refusedTimer = useRef(0)

  const setTarget = (el: HTMLElement | null) => {
    if (target.current === el) return
    target.current?.removeAttribute('data-drop-target')
    target.current = el
    if (!el) return
    const id = el.getAttribute('data-line-tab') ?? ''
    el.setAttribute('data-drop-target', useLineLockStore.getState().locks[id === 'master' ? MASTER_LOCK : id] ? 'locked' : '')
  }
  const endDrag = () => {
    drag.current = null
    setTarget(null)
    setGhost(null)
  }
  // Unmounting mid-drag leaves no outline or ghost behind, and no pending refusal flash
  useEffect(() => () => {
    window.clearTimeout(refusedTimer.current)
    target.current?.removeAttribute('data-drop-target')
    rowRef.current?.querySelector('[data-refused]')?.removeAttribute('data-refused')
  }, [])

  const onPointerDown = (e: React.PointerEvent) => {
    swallowClick.current = false
    const tabEl = (e.target as HTMLElement).closest('[data-line-tab]') as HTMLElement | null
    if (!tabEl || !e.altKey || e.button !== 0) return
    e.preventDefault()
    swallowClick.current = true // the Alt gesture never opens a tab
    rowRef.current?.setPointerCapture(e.pointerId)
    const src = tabEl.getAttribute('data-line-tab') ?? ''
    drag.current = { src, pointerId: e.pointerId }
    setGhost({ label: tabName(src), x: e.clientX, y: e.clientY })
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (drag.current?.pointerId !== e.pointerId) return
    setGhost((g) => (g ? { ...g, x: e.clientX, y: e.clientY } : g))
    const over = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-line-tab]') as HTMLElement | null
    setTarget(over && rowRef.current?.contains(over) && over.getAttribute('data-line-tab') !== drag.current.src ? over : null)
  }
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current
    if (d?.pointerId !== e.pointerId) return
    const el = target.current
    const dst = el?.getAttribute('data-line-tab')
    endDrag()
    window.setTimeout(() => { swallowClick.current = false }, 0)
    if (!el || !dst || dst === d.src) return // a drop anywhere else changes nothing
    if (!copyLine(d.src, dst)) {
      window.clearTimeout(refusedTimer.current)
      rowRef.current?.querySelector('[data-refused]')?.removeAttribute('data-refused')
      el.setAttribute('data-refused', '')
      refusedTimer.current = window.setTimeout(() => el.removeAttribute('data-refused'), 400)
    }
  }
  const onPointerCancel = (e: React.PointerEvent) => {
    if (drag.current?.pointerId !== e.pointerId) return
    endDrag()
    swallowClick.current = false
  }
  const onClickCapture = (e: React.MouseEvent) => {
    if (!swallowClick.current) return
    swallowClick.current = false
    e.preventDefault()
    e.stopPropagation()
  }

  useEffect(() => {
    // Horizontal only (scrollIntoView would also scroll the bottom panel's ancestors)
    const row = rowRef.current
    const el = row?.querySelector('[aria-selected="true"]') as HTMLElement | null
    if (!row || !el) return
    if (el.offsetLeft < row.scrollLeft) row.scrollLeft = el.offsetLeft
    else if (el.offsetLeft + el.offsetWidth > row.scrollLeft + row.clientWidth) row.scrollLeft = el.offsetLeft + el.offsetWidth - row.clientWidth
  }, [open])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    e.stopPropagation()
    const all = ['master', ...ids]
    const i = all.indexOf(open)
    const next = all[Math.min(all.length - 1, Math.max(0, i + (e.key === 'ArrowRight' ? 1 : -1)))]
    const ui = useUIStore.getState()
    ui.setLineTab(next)
    if (next !== 'master') ui.setSelectedEffect(next)
    requestAnimationFrame(() => (rowRef.current?.querySelector(`[data-line-tab="${next}"]`) as HTMLElement | null)?.focus())
  }

  return (
    <div ref={rowRef} className="seg-line-tabs" role="tablist" aria-label="Lines" data-line-tabs onKeyDown={onKeyDown}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel}
      onLostPointerCapture={onPointerCancel} onClickCapture={onClickCapture}>
      <button type="button" role="tab" data-line-tab="master" data-mode="line" aria-selected={open === 'master'} tabIndex={open === 'master' ? 0 : -1}
        onClick={() => useUIStore.getState().setLineTab('master')}
        {...statusHover(`Master: the line that multiplies every track's Dry/wet. ${COPY_HINT}`)}>
        <i className="seg-line-tab-dot" style={{ background: 'var(--warp)' }} aria-hidden="true" />
        <span className="seg-line-tab-name">Master</span>
        {masterLocked && <Lock />}
        <MiniLine points={masterPoints} color="var(--warp)" />
      </button>
      {ids.map((id) => <EffectTab key={id} id={id} color={colors[id] ?? 'var(--text-muted)'} selected={open === id} />)}
      {ghost && createPortal(<div className="seg-line-tab-ghost" aria-hidden="true" style={{ left: ghost.x, top: ghost.y }}>{ghost.label}</div>, document.body)}
    </div>
  )
})
