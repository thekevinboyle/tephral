import { memo, useState, useEffect } from 'react'
import { useUIStore, type PanelId } from '../../stores/uiStore'
import { useSegStore } from '../../stores/segStore'
import { useNarrow } from '../../hooks/useNarrow'
import { perfMonitor } from '../../utils/perfMonitor'
import { statusHover } from '../../utils/statusHover'
import { getUIStatusText } from '../../config/statusDescriptions'

const TOGGLES: { id: PanelId; label: string }[] = [
  { id: 'browser', label: 'Browser' },
  { id: 'inspector', label: 'Inspector' },
  { id: 'bottom', label: 'Bottom' },
]

/** One footer toggle. At narrow widths browser/inspector open a drawer instead of the docked panel. */
const PanelToggle = memo(function PanelToggle({ id, label }: { id: PanelId; label: string }) {
  const narrow = useNarrow()
  const on = useUIStore((s) =>
    narrow && id !== 'bottom'
      ? s.drawer === id
      : id === 'browser' ? s.showBrowser : id === 'inspector' ? s.showInspector : s.showBottom,
  )
  return (
    <button
      type="button"
      className="seg-toggle"
      data-toggle={id}
      aria-controls={`seg-panel-${id}`}
      data-on={on ? '' : undefined}
      aria-pressed={on}
      onClick={() => {
        const st = useUIStore.getState()
        if (narrow && id !== 'bottom') st.toggleDrawer(id)
        else st.togglePanel(id)
      }}
      {...statusHover(getUIStatusText(id === 'browser' ? 'toggleBrowser' : id === 'inspector' ? 'toggleInspector' : 'toggleBottom'))}
    >
      <i aria-hidden />
      {label}
    </button>
  )
})

const PanelToggles = memo(function PanelToggles() {
  return (
    <div className="seg-footer-toggles" role="group" aria-label="Panels">
      {TOGGLES.map((t) => <PanelToggle key={t.id} id={t.id} label={t.label} />)}
    </div>
  )
})

const FpsReadout = memo(function FpsReadout() {
  const [perf, setPerf] = useState({ avgMs: 0, fps: 0 })
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const id = setInterval(() => setPerf(perfMonitor.getStats()), 500)
    return () => clearInterval(id)
  }, [])
  if (!import.meta.env.DEV) return null
  return <span className="seg-footer-fps" title="render pipeline avg ms / fps">{perf.avgMs.toFixed(1)}ms · {perf.fps.toFixed(0)} fps</span>
})

/** Footer: status text, then the panel toggles, then fps. */
export const StatusBar = memo(function StatusBar() {
  const statusText = useUIStore((s) => s.statusText)
  // Persistent SEG model status: its own channel, so hover tooltips can't wipe it
  const segStatus = useSegStore((s) => s.segStatus)
  const segText =
    segStatus === 'loading' ? 'SEG: loading model…' : segStatus === 'error' ? 'SEG: person mask unavailable' : null

  return (
    <div className="seg-footer">
      <span className="seg-footer-status">
        {statusText ?? 'Ready'}
        {segText && <span data-seg-status={segStatus} style={{ marginLeft: 8 }}>{segText}</span>}
      </span>
      <PanelToggles />
      <FpsReadout />
    </div>
  )
})
