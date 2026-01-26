import { Canvas } from '../Canvas'
import { PreviewHeader } from './PreviewHeader'
import { SignalPathBar } from './SignalPathBar'
import { ParameterPanel } from './ParameterPanel'
import { BankPanel } from './BankPanel'
import { PerformanceGrid } from './PerformanceGrid'
import { GraphicPanelV2 } from './GraphicPanelV2'
import { XYPad } from './XYPad'

export function PerformanceLayout() {
  return (
    <div
      className="w-screen h-screen flex flex-col overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #0d0f12 0%, #1a1d24 100%)',
      }}
    >
      {/* Preview section (55vh) - Full width canvas */}
      <div
        className="relative flex-shrink-0 m-3 mb-0 rounded-xl overflow-hidden"
        style={{
          height: 'calc(55vh - 12px)',
          background: 'linear-gradient(180deg, #0a0c0f 0%, #13151a 100%)',
          boxShadow: `
            inset 0 2px 4px rgba(0,0,0,0.5),
            inset 0 -1px 2px rgba(255,255,255,0.02),
            0 4px 12px rgba(0,0,0,0.4),
            0 0 0 1px rgba(255,255,255,0.03)
          `,
        }}
      >
        {/* Source selection overlay */}
        <div className="absolute top-0 left-0 right-0 z-10">
          <PreviewHeader />
        </div>

        {/* Canvas */}
        <div className="w-full h-full">
          <Canvas />
        </div>

        {/* Corner accents */}
        <div
          className="absolute top-2 left-2 w-3 h-3 border-l-2 border-t-2 rounded-tl"
          style={{ borderColor: 'rgba(99, 102, 241, 0.3)' }}
        />
        <div
          className="absolute top-2 right-2 w-3 h-3 border-r-2 border-t-2 rounded-tr"
          style={{ borderColor: 'rgba(99, 102, 241, 0.3)' }}
        />
        <div
          className="absolute bottom-2 left-2 w-3 h-3 border-l-2 border-b-2 rounded-bl"
          style={{ borderColor: 'rgba(99, 102, 241, 0.3)' }}
        />
        <div
          className="absolute bottom-2 right-2 w-3 h-3 border-r-2 border-b-2 rounded-br"
          style={{ borderColor: 'rgba(99, 102, 241, 0.3)' }}
        />
      </div>

      {/* Signal path bar (5vh) */}
      <div
        className="flex-shrink-0 mx-3"
        style={{
          height: '5vh',
          minHeight: '32px',
          background: 'linear-gradient(180deg, #13151a 0%, #1a1d24 100%)',
          borderTop: '1px solid rgba(255,255,255,0.03)',
        }}
      >
        <SignalPathBar />
      </div>

      {/* Parameter strip (12vh) - horizontal scrollable, draggable */}
      <div
        className="flex-shrink-0 mx-3"
        style={{
          height: '12vh',
          minHeight: '80px',
          borderTop: '1px solid #2a2d35',
        }}
      >
        <ParameterPanel />
      </div>

      {/* Bank panel (~4vh) - preset banks */}
      <div
        className="flex-shrink-0 mx-3"
        style={{
          height: '4vh',
          minHeight: '40px',
          borderTop: '1px solid #2a2d35',
        }}
      >
        <BankPanel />
      </div>

      {/* Bottom section (~24vh) - Button grid + Graphic panel */}
      <div
        className="flex-1 min-h-0 flex mx-3 mb-3 gap-3"
        style={{
          borderTop: '1px solid #2a2d35',
          paddingTop: '12px',
        }}
      >
        {/* Button grid - 50vw */}
        <PerformanceGrid />

        {/* Right side - Graphic panel + XY Pad */}
        <div className="flex-1 flex gap-3">
          {/* Graphic panel */}
          <div
            className="flex-1 rounded-xl overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, #1a1d24 0%, #0d0f12 100%)',
              boxShadow: `
                inset 0 1px 2px rgba(255,255,255,0.03),
                0 0 0 1px #2a2d35
              `,
            }}
          >
            <GraphicPanelV2 />
          </div>

          {/* XY Pad */}
          <div
            className="flex-1 rounded-xl overflow-hidden relative"
            style={{
              background: 'linear-gradient(180deg, #1a1d24 0%, #0d0f12 100%)',
              boxShadow: `
                inset 0 1px 2px rgba(255,255,255,0.03),
                0 0 0 1px #2a2d35
              `,
            }}
          >
            <XYPad />
          </div>
        </div>
      </div>
    </div>
  )
}
