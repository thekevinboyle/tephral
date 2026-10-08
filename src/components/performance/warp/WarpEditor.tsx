import { memo, useEffect, useState } from 'react'
import { useUIStore } from '../../../stores/uiStore'
import { useWarpStore } from '../../../stores/warpStore'
import { statusHover } from '../../../utils/statusHover'
import { WarpGraph, type WarpTool } from './WarpGraph'
import { describePoint, editPoints, isOwnEdit } from './warpEdit'
import { WarpSettingsRow } from './WarpSettingsRow'
import { WarpPresetMenu, WarpSidePanel } from './WarpSidePanel'

const TOOLS: { id: WarpTool; name: string; status: string }[] = [
  { id: 'draw', name: 'Draw', status: 'Draw: click to add a point, drag to paint points, drag a point to move it' },
  { id: 'steps', name: 'Steps', status: 'Steps: drag to paint a staircase on the snap grid (stutters and repeats)' },
  { id: 'curve', name: 'Curve', status: 'Curve: drag up or down over a segment to bend it' },
  { id: 'erase', name: 'Erase', status: 'Erase: drag over points to remove them' },
]

const GRID_Y = 1 / 16

/**
 * The Warp tab (spec §4): tools, the graph, the settings row and the side panel.
 * Keys (handled here, every handled key stops propagating): R randomizes; with the graph focused,
 * [ and ] select the previous / next point; with a point selected, Delete removes it, the arrows
 * nudge it one grid step and Escape deselects it. The selection is announced (status bar + aria-live).
 * Keys from inside the portalled presets menu are left to the menu.
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
    if (target.closest('[data-warp-preset-menu]')) return // portalled: React still bubbles its keys here
    const s = useWarpStore.getState()
    if ((e.key === 'r' || e.key === 'R') && !(e.target as Element).closest('input, textarea')) {
      e.preventDefault(); e.stopPropagation()
      s.randomize()
      setSelected(null)
      return
    }
    const pts = s.points
    if ((e.key === '[' || e.key === ']') && target.closest('[data-warp-graph]')) {
      e.preventDefault(); e.stopPropagation()
      const n = pts.length
      const cur = selected !== null && selected < n ? selected : e.key === ']' ? -1 : n
      const k = (cur + (e.key === ']' ? 1 : -1) + n) % n
      setSelected(k)
      say(pts, k)
      return
    }
    const i = selected
    if (i === null || !pts[i]) return
    if (e.key === 'Escape') {
      e.preventDefault(); e.stopPropagation()
      setSelected(null)
      return
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault(); e.stopPropagation()
      if (pts.length > 2) editPoints(pts.filter((_, k) => k !== i))
      setSelected(null)
      setAnnounce('Point removed')
      return
    }
    const dx = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    const dy = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0
    if (!dx && !dy) return
    e.preventDefault(); e.stopPropagation()
    const last = pts.length - 1
    const p = pts[i]
    const x = !dx || i === 0 || i === last ? p.x : Math.min(pts[i + 1].x, Math.max(pts[i - 1].x, Math.round((p.x + dx * s.snap) / s.snap) * s.snap))
    const y = Math.min(1, Math.max(0, Math.round((p.y + dy * GRID_Y) / GRID_Y) * GRID_Y))
    const next = pts.slice()
    next[i] = { ...p, x, y: dy ? y : p.y }
    say(editPoints(next), i)
  }

  return (
    <div className="seg-warp" data-warp-editor onKeyDown={onKeyDown}>
      <div className="seg-warp-main">
        <div className="seg-warp-tools" role="toolbar" aria-label="Warp tools">
          {TOOLS.map((t) => (
            <button key={t.id} type="button" className="seg-warp-tool" data-warp-tool={t.id} aria-pressed={tool === t.id}
              onClick={() => setTool(t.id)} {...statusHover(t.status)}>
              {t.name}
            </button>
          ))}
          <span className="seg-warp-tools-gap" />
          <WarpPresetMenu variant="tools" />
        </div>
        <WarpGraph tool={tool} visible={visible} selected={selected} onSelect={setSelected} />
        <span className="sr-only" aria-live="polite" data-warp-announce>{announce}</span>
        <WarpSettingsRow />
      </div>
      <WarpSidePanel />
    </div>
  )
})
