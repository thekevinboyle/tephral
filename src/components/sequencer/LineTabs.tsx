import { memo, useEffect, useRef } from 'react'
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

const Lock = () => <span className="seg-line-tab-lock" aria-label="locked">🔒</span>

const EffectTab = memo(function EffectTab({ id, color, selected }: { id: string; color: string; selected: boolean }) {
  const mode = useEffectSequencerStore((s) => (s.tracks[id]?.mode === 'line' ? 'line' : 'gate'))
  const points = useEffectSequencerStore((s) => s.tracks[id]?.line?.points) ?? DEFAULT_POINTS
  const locked = useLineLockStore((s) => !!s.locks[id])
  const name = getEffectInfo(id).name
  return (
    <button type="button" role="tab" data-line-tab={id} data-mode={mode} aria-selected={selected} tabIndex={selected ? 0 : -1}
      onClick={() => { useUIStore.getState().setLineTab(id); useUIStore.getState().setSelectedEffect(id) }}
      {...statusHover(`${name}: open its line. ${mode === 'line' ? 'The line plays' : 'The steps play'}`)}>
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
    <div ref={rowRef} className="seg-line-tabs" role="tablist" aria-label="Lines" data-line-tabs onKeyDown={onKeyDown}>
      <button type="button" role="tab" data-line-tab="master" data-mode="line" aria-selected={open === 'master'} tabIndex={open === 'master' ? 0 : -1}
        onClick={() => useUIStore.getState().setLineTab('master')}
        {...statusHover('Master: the line that multiplies every track\'s Dry/wet')}>
        <i className="seg-line-tab-dot" style={{ background: 'var(--warp)' }} aria-hidden="true" />
        <span className="seg-line-tab-name">Master</span>
        {masterLocked && <Lock />}
        <MiniLine points={masterPoints} color="var(--warp)" />
      </button>
      {ids.map((id) => <EffectTab key={id} id={id} color={colors[id] ?? 'var(--text-muted)'} selected={open === id} />)}
    </div>
  )
})
