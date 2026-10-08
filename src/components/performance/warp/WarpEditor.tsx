import { memo, useState } from 'react'
import { useUIStore } from '../../../stores/uiStore'
import { useWarpStore } from '../../../stores/warpStore'
import { statusHover } from '../../../utils/statusHover'
import { WarpGraph, type WarpTool } from './WarpGraph'
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
 * Keys (handled here, every handled key stops propagating): R randomizes; with a point selected,
 * Delete removes it and the arrows nudge it one grid step.
 */
export const WarpEditor = memo(function WarpEditor() {
  const visible = useUIStore((s) => s.bottomTab === 'warp' && s.showBottom)
  const [tool, setTool] = useState<WarpTool>('draw')
  const [selected, setSelected] = useState<number | null>(null)

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return
    const s = useWarpStore.getState()
    if ((e.key === 'r' || e.key === 'R') && !(e.target as Element).closest('input, textarea')) {
      e.preventDefault(); e.stopPropagation()
      s.randomize()
      setSelected(null)
      return
    }
    const pts = s.points
    const i = selected
    if (i === null || !pts[i]) return
    if (e.key === 'Escape') {
      e.preventDefault(); e.stopPropagation()
      setSelected(null)
      return
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault(); e.stopPropagation()
      if (pts.length > 2) s.setPoints(pts.filter((_, k) => k !== i))
      setSelected(null)
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
    s.setPoints(next)
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
        <WarpSettingsRow />
      </div>
      <WarpSidePanel />
    </div>
  )
})
