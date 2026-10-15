import { useEffect, useRef, useState, type RefObject } from 'react'
import type { CanvasHandle } from '../components/Canvas'
import { useRecordingCapture } from './useRecordingCapture'
import { useAutomationPlayback } from './useAutomationPlayback'
import { useContinuousModulation } from './useContinuousModulation'
import { useEuclideanEngine } from './useEuclideanEngine'
import { useRicochetEngine } from './useRicochetEngine'
import { usePolyEuclidEngine } from './usePolyEuclidEngine'
import { useModulationEngine } from './useModulationEngine'
import { useDestructionMode } from './useDestructionMode'
import { useDestructionChaos } from './useDestructionChaos'
import { useUnifiedAudioAnalysis } from './useUnifiedAudioAnalysis'
import { useAudioReactive } from './useAudioReactive'
import { useEffectSequencerPlayback } from './useEffectSequencerPlayback'
import { useWebMIDI } from './useWebMIDI'
import { useMIDINoteGate } from './useMIDINoteGate'
import { useChainIds } from './useChainIds'
import { useEffectSequencerStore } from '../stores/effectSequencerStore'
import { linkedToggle } from '../utils/sequencerTransport'
import { isInteractiveKeyTarget } from '../utils/keyboard'

/**
 * Everything that runs the instrument, independent of the layout (desktop shell or phone): the master
 * transport's Space key, the step sequencer's playback, modulation sources, audio analysis, MIDI, a sequencer
 * track for every effect in the chain, and recording capture of the stage canvas. Mount it once, in the layout.
 */
export function useEngine(canvasRef: RefObject<CanvasHandle | null>): RefObject<HTMLCanvasElement | null> {
  // Space plays and stops the master transport anywhere in the app (not while typing or on a focused control)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== ' ' || e.repeat || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || isInteractiveKeyTarget(e.target)) return
      e.preventDefault()
      linkedToggle()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useAutomationPlayback()
  useEuclideanEngine()
  useRicochetEngine()
  usePolyEuclidEngine()
  useModulationEngine()
  useContinuousModulation()
  useDestructionMode()
  useDestructionChaos()
  useUnifiedAudioAnalysis()
  useAudioReactive()
  // Step sequencer, MIDI: here rather than in the sequencer panel, so they run whichever view or layout is open
  useEffectSequencerPlayback()
  useWebMIDI()
  useMIDINoteGate()

  // Every effect in the chain has a sequencer track (also for presets, which switch effects on without a toggle)
  const ids = useChainIds()
  useEffect(() => {
    const { ensureTrack } = useEffectSequencerStore.getState()
    for (const id of ids) ensureTrack(id)
  }, [ids])

  // Recording captures the stage canvas once it exists
  const captureRef = useRef<HTMLCanvasElement | null>(null)
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null)
  useEffect(() => {
    const check = () => {
      const canvas = canvasRef.current?.getCanvas()
      if (canvas && canvas !== captureRef.current) {
        captureRef.current = canvas
        setCanvasElement(canvas)
      }
    }
    check()
    const id = setInterval(check, 100)
    return () => clearInterval(id)
  }, [canvasRef])
  useRecordingCapture(captureRef, canvasElement)
  return captureRef
}
