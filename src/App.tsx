import { Canvas } from './components/Canvas'
import { BottomDrawer } from './components/ui/BottomDrawer'
import { SourcePanel } from './components/panels/SourcePanel'
import { GlitchPanel } from './components/panels/GlitchPanel'
import { VisionPanel } from './components/panels/VisionPanel'
import { ExportPanel } from './components/panels/ExportPanel'
import { useUIStore } from './stores/uiStore'

function App() {
  const { activeTab, drawerHeight } = useUIStore()

  return (
    <div className="w-screen h-screen bg-black overflow-hidden">
      {/* Full-bleed canvas */}
      <div
        className="w-full transition-all duration-300"
        style={{ height: `${100 - (drawerHeight * 0.6)}vh` }}
      >
        <Canvas />
      </div>

      {/* Bottom drawer with controls */}
      <BottomDrawer>
        {activeTab === 'source' && <SourcePanel />}
        {activeTab === 'glitch' && <GlitchPanel />}
        {activeTab === 'vision' && <VisionPanel />}
        {activeTab === 'export' && <ExportPanel />}
      </BottomDrawer>
    </div>
  )
}

export default App
