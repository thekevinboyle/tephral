import { Canvas } from '../Canvas'
import { PreviewHeader } from './PreviewHeader'
import { SignalPathBar } from './SignalPathBar'
import { ParameterPanel } from './ParameterPanel'
import { PerformanceGrid } from './PerformanceGrid'
import { GraphicPanelV2 } from './GraphicPanelV2'

export function PerformanceLayout() {
  return (
    <div className="w-screen h-screen bg-base-dark flex flex-col overflow-hidden">
      {/* Preview section (55vh) - Canvas + Graphic panel */}
      <div className="relative flex-shrink-0 flex" style={{ height: '55vh' }}>
        {/* Canvas area */}
        <div className="flex-1 relative">
          {/* Source selection overlay */}
          <div className="absolute top-0 left-0 right-0 z-10">
            <PreviewHeader />
          </div>

          {/* Canvas */}
          <div className="w-full h-full">
            <Canvas />
          </div>
        </div>

        {/* Graphic panel - right of preview */}
        <div className="w-80 flex-shrink-0 border-l border-[#222]">
          <GraphicPanelV2 />
        </div>
      </div>

      {/* Signal path bar (5vh) */}
      <div className="flex-shrink-0" style={{ height: '5vh', minHeight: '32px' }}>
        <SignalPathBar />
      </div>

      {/* Parameter strip (15vh) - horizontal scrollable */}
      <div className="flex-shrink-0 border-b border-[#222]" style={{ height: '15vh', minHeight: '100px' }}>
        <ParameterPanel />
      </div>

      {/* Bottom section (25vh) - Button grid */}
      <div className="flex-1 min-h-0 p-2">
        <PerformanceGrid />
      </div>
    </div>
  )
}
