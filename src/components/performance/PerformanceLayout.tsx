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
import { SharedEffectTabsBar } from '../sequencer/SharedEffectTabsBar'
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
import { DestructionOverlay } from '../DestructionOverlay'

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

  return (
    <div
      className="w-screen h-screen overflow-hidden grid-substrate"
      style={{
        display: 'grid',
        gridTemplateRows: 'var(--row-header) 1fr auto 1fr',
        gridTemplateColumns: 'var(--col-left) 1fr',
        gap: 'var(--gap)',
        padding: 'var(--gap)',
      }}
    >
      {/* Row 1: Header Bar (spans all columns) */}
      <div
        className="rounded-sm overflow-hidden"
        style={{
          gridRow: 1,
          gridColumn: '1 / -1',
          border: '1px solid var(--border)',
        }}
      >
        <HeaderBar />
      </div>

      {/* Rows 2-4, Col 1: Effect Card Stack + Crossfader */}
      <div
        className="flex flex-col rounded-sm overflow-hidden panel-gradient-subtle"
        style={{
          gridRow: '2 / 5',
          gridColumn: 1,
          border: '1px solid var(--border)',
        }}
      >
        <div className="flex-1 min-h-0">
          <EffectCardStack />
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

      {/* Row 2, Col 2: Canvas + Transport */}
      <div
        className="flex flex-col rounded-sm overflow-hidden"
        style={{
          gridRow: 2,
          gridColumn: 2,
          border: '1px solid var(--border)',
        }}
      >
        <div className="relative flex-1 min-h-0" style={{ backgroundColor: 'var(--bg-elevated)' }}>
          <Canvas ref={canvasRef} />
          <ClipBin />
        </div>
        <TransportBar />
      </div>

      {/* Row 3, Col 2: Effect Tabs Bar */}
      <div
        className="rounded-sm overflow-hidden"
        style={{
          gridRow: 3,
          gridColumn: 2,
          border: '1px solid var(--border)',
        }}
      >
        <SharedEffectTabsBar />
      </div>

      {/* Row 4, Col 2: Grid + Sequencer */}
      <div
        className="flex rounded-sm overflow-hidden"
        style={{
          gridRow: 4,
          gridColumn: 2,
          gap: 'var(--gap)',
        }}
      >
        {/* Left: Bank + Grid */}
        <div
          className="flex flex-col rounded-sm overflow-hidden panel-gradient"
          style={{
            width: 'var(--col-grid)',
            flexShrink: 0,
            border: '1px solid var(--border)',
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
          <div className="flex-1 min-h-0">
            <PerformanceGrid />
          </div>
        </div>

        {/* Right: Sequencer (tabs hidden, shown above) */}
        <div
          className="flex-1 min-w-0 rounded-sm overflow-hidden panel-gradient-subtle"
          style={{ border: '1px solid var(--border)' }}
        >
          <SequencerContainer hideTabsBar />
        </div>
      </div>

      <ClipDetailModal />
      <ModulationLines />
      <DestructionOverlay />
    </div>
  )
}
