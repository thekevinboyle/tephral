import { useCallback, useState } from 'react'
import { BankButton } from './BankButton'
import { useBankStore } from '../../stores/bankStore'
import { useGlitchEngineStore, type GlitchSnapshot } from '../../stores/glitchEngineStore'
import { useAsciiRenderStore } from '../../stores/asciiRenderStore'
import { useStippleStore } from '../../stores/stippleStore'
import { useBlobDetectStore } from '../../stores/blobDetectStore'
import { useLandmarksStore } from '../../stores/landmarksStore'

const BANK_LABELS = ['A', 'B', 'C', 'D']

const RANDOMIZABLE_EFFECTS = [
  'rgb_split', 'block_displace', 'scan_lines', 'noise',
  'pixelate', 'edges', 'blob_detect', 'ascii', 'matrix', 'stipple',
] as const

interface EffectState {
  glitchSnapshot: GlitchSnapshot
  asciiEnabled: boolean
  asciiMode: 'standard' | 'matrix' | 'blocks' | 'braille'
  stippleEnabled: boolean
  blobDetectEnabled: boolean
  landmarksEnabled: boolean
  landmarksMode: 'off' | 'face' | 'hands' | 'pose' | 'holistic'
}

export function BankPanel() {
  const [previousState, setPreviousState] = useState<EffectState | null>(null)
  const { banks, activeBank, loadBank, saveBank, clearBank } = useBankStore()
  const glitch = useGlitchEngineStore()
  const { bypassActive, setBypassActive } = glitch
  const ascii = useAsciiRenderStore()
  const stipple = useStippleStore()
  const blobDetect = useBlobDetectStore()
  const landmarks = useLandmarksStore()

  const hasPreviousState = previousState !== null

  const handleBypassDown = useCallback(() => {
    setBypassActive(true)
  }, [setBypassActive])

  const handleBypassUp = useCallback(() => {
    setBypassActive(false)
  }, [setBypassActive])

  // Capture current state
  const captureState = useCallback((): EffectState => {
    return {
      glitchSnapshot: glitch.getSnapshot(),
      asciiEnabled: ascii.enabled,
      asciiMode: ascii.params.mode,
      stippleEnabled: stipple.enabled,
      blobDetectEnabled: blobDetect.enabled,
      landmarksEnabled: landmarks.enabled,
      landmarksMode: landmarks.currentMode,
    }
  }, [glitch, ascii, stipple, blobDetect, landmarks])

  // Restore state
  const restoreState = useCallback((state: EffectState) => {
    glitch.applySnapshot(state.glitchSnapshot)
    ascii.setEnabled(state.asciiEnabled)
    if (state.asciiEnabled) {
      ascii.updateParams({ mode: state.asciiMode })
    }
    stipple.setEnabled(state.stippleEnabled)
    blobDetect.setEnabled(state.blobDetectEnabled)
    landmarks.setEnabled(state.landmarksEnabled)
    landmarks.setCurrentMode(state.landmarksMode)
  }, [glitch, ascii, stipple, blobDetect, landmarks])

  const handleRandom = useCallback(() => {
    setPreviousState(captureState())

    // Disable all effects first
    glitch.setRGBSplitEnabled(false)
    glitch.setBlockDisplaceEnabled(false)
    glitch.setScanLinesEnabled(false)
    glitch.setNoiseEnabled(false)
    glitch.setPixelateEnabled(false)
    glitch.setEdgeDetectionEnabled(false)
    ascii.setEnabled(false)
    stipple.setEnabled(false)
    blobDetect.setEnabled(false)
    landmarks.setEnabled(false)
    landmarks.setCurrentMode('off')

    // Randomly enable 2-4 effects
    const numEffects = 2 + Math.floor(Math.random() * 3)
    const shuffled = [...RANDOMIZABLE_EFFECTS].sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, numEffects)

    selected.forEach((effectId) => {
      switch (effectId) {
        case 'rgb_split':
          glitch.setRGBSplitEnabled(true)
          glitch.updateRGBSplit({ amount: 0.5 + Math.random() * 1.5 })
          break
        case 'block_displace':
          glitch.setBlockDisplaceEnabled(true)
          glitch.updateBlockDisplace({
            displaceDistance: 0.01 + Math.random() * 0.05,
            displaceChance: 0.3 + Math.random() * 0.5,
          })
          break
        case 'scan_lines':
          glitch.setScanLinesEnabled(true)
          glitch.updateScanLines({
            lineCount: 100 + Math.floor(Math.random() * 300),
            lineOpacity: 0.3 + Math.random() * 0.5,
          })
          break
        case 'noise':
          glitch.setNoiseEnabled(true)
          glitch.updateNoise({ amount: 0.1 + Math.random() * 0.4 })
          break
        case 'pixelate':
          glitch.setPixelateEnabled(true)
          glitch.updatePixelate({ pixelSize: 4 + Math.floor(Math.random() * 12) })
          break
        case 'edges':
          glitch.setEdgeDetectionEnabled(true)
          glitch.updateEdgeDetection({ threshold: 0.2 + Math.random() * 0.6 })
          break
        case 'blob_detect':
          blobDetect.setEnabled(true)
          break
        case 'ascii':
          ascii.setEnabled(true)
          ascii.updateParams({ mode: 'standard' })
          break
        case 'matrix':
          ascii.setEnabled(true)
          ascii.updateParams({ mode: 'matrix' })
          break
        case 'stipple':
          stipple.setEnabled(true)
          break
      }
    })
  }, [captureState, glitch, ascii, stipple, blobDetect, landmarks])

  const handleUndo = useCallback(() => {
    if (previousState) {
      restoreState(previousState)
      setPreviousState(null)
    }
  }, [previousState, restoreState])

  const handleClear = useCallback(() => {
    // Save state before clearing
    setPreviousState(captureState())

    // Disable all effects
    glitch.setRGBSplitEnabled(false)
    glitch.setBlockDisplaceEnabled(false)
    glitch.setScanLinesEnabled(false)
    glitch.setNoiseEnabled(false)
    glitch.setPixelateEnabled(false)
    glitch.setEdgeDetectionEnabled(false)
    ascii.setEnabled(false)
    stipple.setEnabled(false)
    blobDetect.setEnabled(false)
    landmarks.setEnabled(false)
    landmarks.setCurrentMode('off')
  }, [captureState, glitch, ascii, stipple, blobDetect, landmarks])

  return (
    <div
      className="h-full flex items-center gap-2 px-2 py-1.5"
    >
      {/* Bank buttons */}
      {BANK_LABELS.map((label, index) => (
        <div key={label} className="h-full w-16">
          <BankButton
            label={label}
            index={index}
            isEmpty={banks[index] === null}
            isActive={activeBank === index}
            onLoad={() => loadBank(index)}
            onSave={() => saveBank(index)}
            onClear={() => clearBank(index)}
          />
        </div>
      ))}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Action buttons */}
      <button
        onClick={handleClear}
        className="h-full px-4 rounded-lg text-[13px] font-medium transition-colors active:scale-95"
        style={{
          backgroundColor: '#f5f5f5',
          border: '1px solid #d0d0d0',
          color: '#666666',
        }}
        onPointerDown={(e) => (e.currentTarget.style.backgroundColor = '#e0e0e0')}
        onPointerUp={(e) => (e.currentTarget.style.backgroundColor = '#f5f5f5')}
        onPointerLeave={(e) => (e.currentTarget.style.backgroundColor = '#f5f5f5')}
      >
        Clear
      </button>
      <button
        onClick={handleRandom}
        className="h-full px-4 rounded-lg text-[13px] font-medium transition-colors active:scale-95"
        style={{
          backgroundColor: '#f5f5f5',
          border: '1px solid #d0d0d0',
          color: '#666666',
        }}
        onPointerDown={(e) => (e.currentTarget.style.backgroundColor = '#e0e0e0')}
        onPointerUp={(e) => (e.currentTarget.style.backgroundColor = '#f5f5f5')}
        onPointerLeave={(e) => (e.currentTarget.style.backgroundColor = '#f5f5f5')}
      >
        Random
      </button>
      <button
        onClick={handleUndo}
        disabled={!hasPreviousState}
        className="h-full px-4 rounded-lg text-[13px] font-medium transition-colors active:scale-95"
        style={{
          backgroundColor: hasPreviousState ? '#f5f5f5' : '#f0f0f0',
          border: '1px solid #d0d0d0',
          color: hasPreviousState ? '#666666' : '#c0c0c0',
          cursor: hasPreviousState ? 'pointer' : 'not-allowed',
        }}
        onPointerDown={(e) => hasPreviousState && (e.currentTarget.style.backgroundColor = '#e0e0e0')}
        onPointerUp={(e) => hasPreviousState && (e.currentTarget.style.backgroundColor = '#f5f5f5')}
        onPointerLeave={(e) => hasPreviousState && (e.currentTarget.style.backgroundColor = '#f5f5f5')}
      >
        Undo
      </button>
      <button
        onPointerDown={handleBypassDown}
        onPointerUp={handleBypassUp}
        onPointerLeave={handleBypassUp}
        onPointerCancel={handleBypassUp}
        className="h-full px-4 rounded-lg text-[13px] font-medium transition-all select-none touch-none active:scale-95"
        style={{
          backgroundColor: bypassActive ? '#ef4444' : '#f5f5f5',
          border: bypassActive ? '1px solid #ef4444' : '1px solid #d0d0d0',
          boxShadow: bypassActive ? '0 0 12px #ef4444' : 'none',
          color: bypassActive ? '#ffffff' : '#666666',
        }}
      >
        Bypass
      </button>
    </div>
  )
}
