import { useCallback, useState, useRef, useEffect } from 'react'
import { BankButton } from './BankButton'
import { useBankStore } from '../../stores/bankStore'
import { useGlitchEngineStore, type GlitchSnapshot } from '../../stores/glitchEngineStore'
import { useAsciiRenderStore } from '../../stores/asciiRenderStore'
import { useStippleStore } from '../../stores/stippleStore'
import { useContourStore } from '../../stores/contourStore'
import { useLandmarksStore } from '../../stores/landmarksStore'

const BANK_LABELS = ['A', 'B', 'C', 'D']

const RANDOMIZABLE_EFFECTS = [
  'rgb_split', 'block_displace', 'scan_lines', 'noise',
  'pixelate', 'edges', 'contour', 'ascii', 'matrix', 'stipple',
] as const

interface EffectState {
  glitchSnapshot: GlitchSnapshot
  asciiEnabled: boolean
  asciiMode: 'standard' | 'matrix' | 'blocks' | 'braille'
  stippleEnabled: boolean
  contourEnabled: boolean
  landmarksEnabled: boolean
  landmarksMode: 'off' | 'face' | 'hands' | 'pose' | 'holistic'
}

export function BankPanel() {
  const [previousState, setPreviousState] = useState<EffectState | null>(null)
  const [isRekt, setIsRekt] = useState(false)
  const [isRektLocked, setIsRektLocked] = useState(false)
  const [rektFlashOn, setRektFlashOn] = useState(true)
  const rektStateRef = useRef<EffectState | null>(null)
  const rektPressTimeRef = useRef<number>(0)

  // Flash effect when REKT is locked
  useEffect(() => {
    if (isRektLocked) {
      const interval = setInterval(() => {
        setRektFlashOn(prev => !prev)
      }, 300)
      return () => clearInterval(interval)
    } else {
      setRektFlashOn(true)
    }
  }, [isRektLocked])
  const { banks, activeBank, loadBank, saveBank, clearBank } = useBankStore()
  const glitch = useGlitchEngineStore()
  const ascii = useAsciiRenderStore()
  const stipple = useStippleStore()
  const contour = useContourStore()
  const landmarks = useLandmarksStore()

  const hasPreviousState = previousState !== null

  // Capture current state
  const captureState = useCallback((): EffectState => {
    return {
      glitchSnapshot: glitch.getSnapshot(),
      asciiEnabled: ascii.enabled,
      asciiMode: ascii.params.mode,
      stippleEnabled: stipple.enabled,
      contourEnabled: contour.enabled,
      landmarksEnabled: landmarks.enabled,
      landmarksMode: landmarks.currentMode,
    }
  }, [glitch, ascii, stipple, contour, landmarks])

  // Restore state
  const restoreState = useCallback((state: EffectState) => {
    glitch.applySnapshot(state.glitchSnapshot)
    ascii.setEnabled(state.asciiEnabled)
    if (state.asciiEnabled) {
      ascii.updateParams({ mode: state.asciiMode })
    }
    stipple.setEnabled(state.stippleEnabled)
    contour.setEnabled(state.contourEnabled)
    landmarks.setEnabled(state.landmarksEnabled)
    landmarks.setCurrentMode(state.landmarksMode)
  }, [glitch, ascii, stipple, contour, landmarks])

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
    contour.setEnabled(false)
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
        case 'contour':
          contour.setEnabled(true)
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
  }, [captureState, glitch, ascii, stipple, contour, landmarks])

  const handleUndo = useCallback(() => {
    if (previousState) {
      restoreState(previousState)
      setPreviousState(null)
    }
  }, [previousState, restoreState])

  // REKT - CHAOS MODE - max out only ACTIVE effects
  // Quick tap = toggle lock, hold = momentary
  const handleRektDown = useCallback(() => {
    rektPressTimeRef.current = Date.now()

    // If already locked, pressing will unlock
    if (isRektLocked) {
      return // Handle in handleRektUp
    }

    // Capture current state and apply REKT
    rektStateRef.current = captureState()
    setIsRekt(true)

    // Only boost effects that are already enabled - but make them EXTREME

    if (glitch.rgbSplitEnabled) {
      glitch.updateRGBSplit({
        amount: 4,
        redOffsetX: 0.04,
        redOffsetY: -0.03,
        greenOffsetX: -0.03,
        greenOffsetY: 0.04,
        blueOffsetX: 0.02,
        blueOffsetY: -0.04,
      })
    }

    if (glitch.blockDisplaceEnabled) {
      glitch.updateBlockDisplace({
        blockSize: 0.12,
        displaceDistance: 0.2,
        displaceChance: 1,
        seed: Math.random() * 1000,
      })
    }

    if (glitch.scanLinesEnabled) {
      glitch.updateScanLines({
        lineCount: 500,
        lineOpacity: 1,
        lineFlicker: 1,
      })
    }

    if (glitch.noiseEnabled) {
      glitch.updateNoise({
        amount: 0.8,
        speed: 50,
      })
    }

    if (glitch.pixelateEnabled) {
      glitch.updatePixelate({
        pixelSize: 32,
      })
    }

    if (glitch.edgeDetectionEnabled) {
      glitch.updateEdgeDetection({
        threshold: 0.05,
        mixAmount: 1,
      })
    }

    if (ascii.enabled) {
      ascii.updateParams({
        fontSize: 20,
        contrast: 3,
        resolution: 4,
      })
    }

    if (stipple.enabled) {
      stipple.updateParams({
        particleSize: 8,
        density: 4,
        jitter: 1,
      })
    }
  }, [captureState, glitch, ascii, stipple, isRektLocked])

  const handleRektUp = useCallback(() => {
    const pressDuration = Date.now() - rektPressTimeRef.current
    const isQuickTap = pressDuration < 200

    if (isRektLocked) {
      // Currently locked - unlock and restore
      if (rektStateRef.current) {
        restoreState(rektStateRef.current)
        rektStateRef.current = null
      }
      setIsRekt(false)
      setIsRektLocked(false)
    } else if (isQuickTap) {
      // Quick tap - lock REKT on
      setIsRektLocked(true)
      // Keep isRekt true, don't restore
    } else {
      // Long press release - restore original state
      if (rektStateRef.current) {
        restoreState(rektStateRef.current)
        rektStateRef.current = null
      }
      setIsRekt(false)
    }
  }, [restoreState, isRektLocked])

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
        onClick={handleRandom}
        className="h-full px-4 rounded-lg text-[13px] font-medium transition-colors active:scale-95"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          color: 'var(--text-muted)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}
        onPointerDown={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
        onPointerUp={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
      >
        Random
      </button>
      <button
        onClick={handleUndo}
        disabled={!hasPreviousState}
        className="h-full px-4 rounded-lg text-[13px] font-medium transition-colors active:scale-95"
        style={{
          backgroundColor: hasPreviousState ? 'var(--bg-surface)' : 'var(--bg-hover)',
          border: '1px solid var(--border)',
          color: hasPreviousState ? 'var(--text-muted)' : '#c0c0c0',
          cursor: hasPreviousState ? 'pointer' : 'not-allowed',
        }}
        onMouseEnter={(e) => hasPreviousState && (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
        onMouseLeave={(e) => hasPreviousState && (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}
        onPointerDown={(e) => hasPreviousState && (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
        onPointerUp={(e) => hasPreviousState && (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
      >
        Undo
      </button>
      <button
        onPointerDown={handleRektDown}
        onPointerUp={handleRektUp}
        onPointerLeave={isRektLocked ? undefined : handleRektUp}
        onPointerCancel={isRektLocked ? undefined : handleRektUp}
        className="h-full px-4 rounded-lg text-[13px] font-medium transition-all select-none touch-none"
        style={{
          backgroundColor: isRektLocked
            ? (rektFlashOn ? '#ef4444' : '#b91c1c')
            : isRekt ? '#ef4444' : 'var(--bg-surface)',
          border: isRektLocked
            ? `2px solid ${rektFlashOn ? '#fca5a5' : '#b91c1c'}`
            : isRekt ? '1px solid #dc2626' : '1px solid var(--border)',
          color: isRekt ? 'var(--bg-surface)' : 'var(--text-muted)',
          boxShadow: isRektLocked
            ? `0 0 ${rektFlashOn ? '20px' : '8px'} rgba(239, 68, 68, ${rektFlashOn ? 0.7 : 0.3})`
            : isRekt ? '0 0 12px rgba(239, 68, 68, 0.5)' : 'none',
          transform: isRekt ? 'scale(1.05)' : 'scale(1)',
        }}
        title={isRektLocked ? 'Click to unlock' : 'Hold or tap to lock'}
      >
        REKT
      </button>
    </div>
  )
}
