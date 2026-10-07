import { useRef, useEffect, useState } from 'react'
import './layout.css'
import type { CanvasHandle } from '../Canvas'
import { StageArea } from './StageArea'
import { Dock } from './Dock'
import { HeaderBar } from './HeaderBar'
import { EffectsColumn } from './EffectsColumn'
import { ClipDetailModal } from './ClipDetailModal'
import { ChainPanel } from './ChainPanel'
import { ModulationLines } from './ModulationLines'
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
import { DestructionOverlay } from '../DestructionOverlay'
// LFO Editor Panel hidden — component kept, just not rendered
// import { LFOEditorPanel } from './LFOEditorPanel'
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
    <div className="seg-shell grid-substrate">
      <div data-area="header" className="panel-header"><HeaderBar canvasRef={captureRef} /></div>
      <div data-area="effects"><EffectsColumn /></div>
      <div data-area="stage"><StageArea ref={canvasRef} /></div>
      <div data-area="chain">
        <ChainPanel />
      </div>
      <div data-area="dock"><Dock /></div>
      <div data-area="status"><StatusBar /></div>

      <ClipDetailModal />
      <ModulationLines />
      <DestructionOverlay />
    </div>
  )
}
