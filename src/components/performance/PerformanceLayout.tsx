import { useRef } from 'react'
import { useEngine } from '../../hooks/useEngine'
import './layout.css'
import type { CanvasHandle } from '../Canvas'
import { StageArea } from './StageArea'
import { BottomPanel2 } from './BottomPanel2'
import { HeaderBar } from './HeaderBar'
import { EffectBrowser } from './EffectBrowser'
import { ClipDetailModal } from './ClipDetailModal'
import { Inspector } from './Inspector'
import { ModulationLines } from './ModulationLines'
// DataTerminal stashed — component file kept, just not rendered
// import { DataTerminal } from '../terminal/DataTerminal'
import { DestructionOverlay } from '../DestructionOverlay'
// LFO Editor Panel hidden — component kept, just not rendered
// import { LFOEditorPanel } from './LFOEditorPanel'
import { StatusBar } from './StatusBar'
import { ShellDrawers } from './ShellDrawers'
import { useUIStore } from '../../stores/uiStore'

export function PerformanceLayout() {
  const canvasRef = useRef<CanvasHandle>(null)
  const captureRef = useEngine(canvasRef)

  // Narrow selectors: panel flags change rarely. The children below keep a fixed position in the tree
  // (hidden by CSS, never conditionally rendered) so the stage/canvas is never remounted.
  const showBrowser = useUIStore((s) => s.showBrowser)
  const showInspector = useUIStore((s) => s.showInspector)
  const showBottom = useUIStore((s) => s.showBottom)
  const drawer = useUIStore((s) => s.drawer)
  const bottomTab = useUIStore((s) => s.bottomTab)

  return (
    <div
      className="seg-shell"
      data-browser={showBrowser ? 'on' : 'off'}
      data-inspector={showInspector ? 'on' : 'off'}
      data-bottom={showBottom ? 'on' : 'off'}
      data-bottom-tab={bottomTab}
      data-drawer={drawer ?? 'none'}
    >
      <div data-area="header" className="panel-header"><HeaderBar canvasRef={captureRef} /></div>
      <div data-area="browser" id="seg-panel-browser" role="region" aria-label="Effects browser" tabIndex={-1}><div data-area="effects" className="seg-area-fill"><EffectBrowser /></div></div>
      <div data-area="stage"><StageArea ref={canvasRef} /></div>
      <div data-area="inspector" id="seg-panel-inspector" role="region" aria-label="Inspector" tabIndex={-1}>{/* data-area="chain" is kept only for harness selectors (layout-check, seg-verify); it no longer names a layout area */}<div data-area="chain" className="seg-area-fill"><Inspector /></div></div>
      <div data-area="bottom" id="seg-panel-bottom" role="region" aria-label="Chain and sequencer"><div data-area="dock" className="seg-area-fill"><BottomPanel2 /></div></div>
      <div data-area="footer"><div data-area="status" className="seg-area-fill"><StatusBar /></div></div>
      <ShellDrawers />

      <ClipDetailModal />
      <ModulationLines />
      <DestructionOverlay />
    </div>
  )
}
