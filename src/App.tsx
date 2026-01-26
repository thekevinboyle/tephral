import { Canvas } from './components/Canvas'
import { MediaInputPanel } from './components/MediaInputPanel'
import { GlitchEnginePanel } from './components/effects/GlitchEnginePanel'

function App() {
  return (
    <div className="w-screen h-screen flex flex-col">
      <header className="h-12 border-b border-muted flex items-center justify-between px-4">
        <h1 className="text-sm font-bold uppercase tracking-widest">STRAND-TRACER</h1>
        <div className="flex gap-2">
          <button className="px-3 py-1 border border-muted text-xs uppercase hover:border-base-light">
            CAPTURE
          </button>
          <button className="px-3 py-1 border border-muted text-xs uppercase hover:border-base-light">
            EXPORT
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-64 border-r border-muted p-2 flex flex-col gap-2 overflow-y-auto">
          <MediaInputPanel />
          <GlitchEnginePanel />
        </aside>

        <main className="flex-1">
          <Canvas />
        </main>
      </div>
    </div>
  )
}

export default App
