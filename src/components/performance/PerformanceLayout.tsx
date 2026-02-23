import { useRef, useEffect, useState } from 'react'
import { Canvas, type CanvasHandle } from '../Canvas'
import { HeaderBar } from './HeaderBar'
import { BankPanel } from './BankPanel'
import { PerformanceGrid } from './PerformanceGrid'
import { ClipBin } from './ClipBin'
import { ClipDetailModal } from './ClipDetailModal'
import { EffectCardStack } from './EffectCardStack'
import { TransportBar } from './TransportBar'
import { MiddleSection } from './MiddleSection'
import { ModulationLines } from './ModulationLines'
import { SequencerContainer } from '../sequencer/SequencerContainer'
import { AudioSourceRow } from '../sequencer/AudioSourceRow'
import { SharedEffectTabsBar } from '../sequencer/SharedEffectTabsBar'
import { TimelinePanel } from '../sequencer/TimelinePanel'
import { useUIStore } from '../../stores/uiStore'
// DataTerminal stashed — component file kept, just not rendered
// import { DataTerminal } from '../terminal/DataTerminal'
import { useRecordingCapture } from '../../hooks/useRecordingCapture'
import { useAutomationPlayback } from '../../hooks/useAutomationPlayback'
import { useContinuousModulation } from '../../hooks/useContinuousModulation'
import { useEuclideanEngine } from '../../hooks/useEuclideanEngine'
import { useRicochetEngine } from '../../hooks/useRicochetEngine'
import { usePolyEuclidEngine } from '../../hooks/usePolyEuclidEngine'
import { useModulationEngine } from '../../hooks/useModulationEngine'
import { useDestructionMode } from '../../hooks/useDestructionMode'
import { useDestructionChaos } from '../../hooks/useDestructionChaos'
import { useUnifiedAudioAnalysis } from '../../hooks/useUnifiedAudioAnalysis'
import { useAudioReactive } from '../../hooks/useAudioReactive'
import { useTimelinePlayback } from '../../hooks/useTimelinePlayback'
import { DestructionOverlay } from '../DestructionOverlay'
// LFO Editor Panel hidden — component kept, just not rendered
// import { LFOEditorPanel } from './LFOEditorPanel'
import { BottomPanel } from './BottomPanel'
import { StatusBar } from './StatusBar'

export function PerformanceLayout() {
  const canvasRef = useRef<CanvasHandle>(null)
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null)

  // Initialize automation playback (handles keyboard shortcuts and event replay)
  useAutomationPlayback()

  // Initialize sequencer engines (always running)
  useEuclideanEngine()
  useRicochetEngine()
  usePolyEuclidEngine()

  // Initialize modulation engine (LFO, Random, Step, Envelope value generators)
  useModulationEngine()

  // Initialize continuous modulation for special sources (euclidean, ricochet, lfo, random, step, envelope)
  useContinuousModulation()

  // Initialize destruction mode (hidden feature)
  useDestructionMode()
  useDestructionChaos()

  // Audio analysis (always runs — feeds waveform display + audio gate)
  useUnifiedAudioAnalysis()

  // Audio reactive DSP (FFT band splitting + envelope following)
  useAudioReactive()

  // Timeline playback engine (clip-based composition with audio-reactive transitions)
  useTimelinePlayback()

  const captureRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const checkCanvas = () => {
      if (canvasRef.current) {
        const canvas = canvasRef.current.getCanvas()
        if (canvas && canvas !== captureRef.current) {
          captureRef.current = canvas
          setCanvasElement(canvas)
        }
      }
    }
    checkCanvas()
    const interval = setInterval(checkCanvas, 100)
    return () => clearInterval(interval)
  }, [])

  useRecordingCapture(captureRef, canvasElement)

  const appMode = useUIStore((s) => s.appMode)

  if (appMode === 'timeline') {
    return (
      <div
        className="w-screen h-screen overflow-hidden grid-substrate"
        style={{
          display: 'grid',
          gridTemplateRows: 'var(--row-header) 1fr 1fr auto 24px',
          gridTemplateColumns: 'var(--col-left) 1fr',
          gap: 'var(--gap)',
          padding: 'var(--gap)',
        }}
      >
        {/* Row 1: Header Bar (spans all columns) */}
        <div
          className="rounded-sm overflow-hidden panel-header"
          style={{
            gridRow: 1,
            gridColumn: '1 / -1',
            border: '1px solid var(--border)',
          }}
        >
          <HeaderBar />
        </div>

        {/* Rows 2-4, Col 1: Effect Card Stack only */}
        <div
          className="flex flex-col rounded-sm overflow-hidden panel-raised"
          style={{
            gridRow: '2 / 5',
            gridColumn: 1,
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-panel-lg)',
          }}
        >
          <div className="flex-1 min-h-0">
            <EffectCardStack />
          </div>
        </div>

        {/* Row 2, Col 2: Canvas + ClipBin + AudioSource + Transport */}
        <div
          className="flex flex-col rounded-sm overflow-hidden"
          style={{
            gridRow: 2,
            gridColumn: 2,
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-panel)',
          }}
        >
          <div className="relative flex-1 min-h-0" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <Canvas ref={canvasRef} />
            <ClipBin />
          </div>
          <AudioSourceRow />
          <TransportBar />
        </div>

        {/* Row 3, Col 2: TimelinePanel (expanded) */}
        <div
          className="flex-1 min-w-0 rounded-sm overflow-hidden panel-raised"
          style={{
            gridRow: 3,
            gridColumn: 2,
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-panel)',
          }}
        >
          <TimelinePanel />
        </div>

        {/* Row 4, Col 2: Bottom Panel */}
        <div style={{ gridRow: 4, gridColumn: 2 }}>
          <BottomPanel />
        </div>

        {/* Row 5: Status Bar (spans all columns) */}
        <div style={{ gridRow: 5, gridColumn: '1 / -1' }}>
          <StatusBar />
        </div>

        <ClipDetailModal />
        <ModulationLines />
        <DestructionOverlay />
      </div>
    )
  }

  return (
    <div
      className="w-screen h-screen overflow-hidden grid-substrate"
      style={{
        display: 'grid',
        gridTemplateRows: 'var(--row-header) 1fr auto 1fr auto 24px',
        gridTemplateColumns: 'var(--col-left) var(--col-grid) 1fr',
        gap: 'var(--gap)',
        padding: 'var(--gap)',
      }}
    >
      {/* Row 1: Header Bar (spans all columns) */}
      <div
        className="rounded-sm overflow-hidden panel-header"
        style={{
          gridRow: 1,
          gridColumn: '1 / -1',
          border: '1px solid var(--border)',
        }}
      >
        <HeaderBar />
      </div>

      {/* Rows 2-5, Col 1: Effect Card Stack + Grid + Crossfader */}
      <div
        className="flex flex-col rounded-sm overflow-hidden panel-raised"
        style={{
          gridRow: '2 / 6',
          gridColumn: 1,
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-panel-lg)',
        }}
      >
        <div className="flex-1 min-h-0">
          <EffectCardStack />
        </div>
        <div
          className="flex-shrink-0"
          style={{
            borderTop: '1px solid var(--border)',
          }}
        >
          <div
            className="flex-shrink-0"
            style={{
              height: '52px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <BankPanel />
          </div>
          <div style={{ height: 200 }}>
            <PerformanceGrid />
          </div>
        </div>
        <div
          className="flex-shrink-0"
          style={{
            borderTop: '1px solid var(--border)',
            minHeight: 'var(--row-middle)',
          }}
        >
          <MiddleSection />
        </div>
      </div>

      {/* Row 2, Cols 2-3: Canvas + Transport */}
      <div
        className="flex flex-col rounded-sm overflow-hidden"
        style={{
          gridRow: 2,
          gridColumn: '2 / -1',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-panel)',
        }}
      >
        <div className="relative flex-1 min-h-0" style={{ backgroundColor: 'var(--bg-elevated)' }}>
          <Canvas ref={canvasRef} />
          <ClipBin />
        </div>
        <AudioSourceRow />
        <TransportBar />
      </div>

      {/* Row 3, Cols 2-3: Effect Tabs Bar */}
      <div
        className="rounded-sm overflow-hidden"
        style={{
          gridRow: 3,
          gridColumn: '2 / -1',
          border: '1px solid var(--border)',
        }}
      >
        <SharedEffectTabsBar />
      </div>

      {/* Row 4, Cols 2-3: Sequencer */}
      <div
        className="flex-1 min-w-0 rounded-sm overflow-hidden panel-raised"
        style={{
          gridRow: 4,
          gridColumn: '2 / -1',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-panel)',
        }}
      >
        <SequencerContainer hideTabsBar />
      </div>

      {/* Row 5, Cols 2-3: Bottom Panel */}
      <div style={{ gridRow: 5, gridColumn: '2 / -1' }}>
        <BottomPanel />
      </div>

      {/* Row 6: Status Bar (spans all columns) */}
      <div style={{ gridRow: 6, gridColumn: '1 / -1' }}>
        <StatusBar />
      </div>

      <ClipDetailModal />
      <ModulationLines />
      <DestructionOverlay />
    </div>
  )
}
