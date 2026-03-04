import { useCallback, useState, useRef, useEffect } from 'react'
import { Button } from '../ui/Button'
import { BankButton } from './BankButton'
import { ShuffleIcon } from '../ui/DotMatrixIcons'
import { useUIStore } from '../../stores/uiStore'
import { getUIStatusText } from '../../config/statusDescriptions'
import { useBankStore } from '../../stores/bankStore'
import { CornerFrame } from '../ui/CornerFrame'
import { useGlitchEngineStore, type GlitchSnapshot } from '../../stores/glitchEngineStore'
import { useAsciiRenderStore } from '../../stores/asciiRenderStore'
import { useStippleStore } from '../../stores/stippleStore'
import { useContourStore } from '../../stores/contourStore'
import { useLandmarksStore } from '../../stores/landmarksStore'

const BANK_LABELS = ['A', 'B', 'C', 'D'] as const

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
  const setStatusText = useUIStore((s) => s.setStatusText)
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

  const handleRektDown = useCallback(() => {
    rektPressTimeRef.current = Date.now()

    if (isRektLocked) {
      return
    }

    rektStateRef.current = captureState()
    setIsRekt(true)

    if (glitch.rgbSplitEnabled) {
      glitch.updateRGBSplit({
        amount: 4,
        redOffsetX: 0.04, redOffsetY: -0.03,
        greenOffsetX: -0.03, greenOffsetY: 0.04,
        blueOffsetX: 0.02, blueOffsetY: -0.04,
      })
    }

    if (glitch.blockDisplaceEnabled) {
      glitch.updateBlockDisplace({
        blockSize: 0.12, displaceDistance: 0.2,
        displaceChance: 1, seed: Math.random() * 1000,
      })
    }

    if (glitch.scanLinesEnabled) {
      glitch.updateScanLines({ lineCount: 500, lineOpacity: 1, lineFlicker: 1 })
    }

    if (glitch.noiseEnabled) {
      glitch.updateNoise({ amount: 0.8, speed: 50 })
    }

    if (glitch.pixelateEnabled) {
      glitch.updatePixelate({ pixelSize: 32 })
    }

    if (glitch.edgeDetectionEnabled) {
      glitch.updateEdgeDetection({ threshold: 0.05, mixAmount: 1 })
    }

    if (ascii.enabled) {
      ascii.updateParams({ fontSize: 20, contrast: 3, resolution: 4 })
    }

    if (stipple.enabled) {
      stipple.updateParams({ particleSize: 8, density: 4, jitter: 1 })
    }
  }, [captureState, glitch, ascii, stipple, isRektLocked])

  const handleRektUp = useCallback(() => {
    const pressDuration = Date.now() - rektPressTimeRef.current
    const isQuickTap = pressDuration < 200

    if (isRektLocked) {
      if (rektStateRef.current) {
        restoreState(rektStateRef.current)
        rektStateRef.current = null
      }
      setIsRekt(false)
      setIsRektLocked(false)
    } else if (isQuickTap) {
      setIsRektLocked(true)
    } else {
      if (rektStateRef.current) {
        restoreState(rektStateRef.current)
        rektStateRef.current = null
      }
      setIsRekt(false)
    }
  }, [restoreState, isRektLocked])

  return (
    <div
      className="h-full flex items-center"
      style={{
        padding: 'var(--space-1) var(--panel-padding-sm)',
        gap: 'var(--gap-sm)',
        overflow: 'visible',
      }}
    >
      {/* Bank buttons */}
      <CornerFrame color="var(--text-ghost)" style={{ padding: '2px 6px', flexShrink: 1, minWidth: 0 }}>
        <div className="h-full flex items-center" style={{ gap: 'var(--gap-sm)' }}>
          {BANK_LABELS.map((label, index) => (
            <div key={label} className="h-full" style={{ width: 48, flexShrink: 0 }}>
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
        </div>
      </CornerFrame>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Action buttons */}
      <CornerFrame color="var(--text-ghost)" style={{ padding: '2px 6px', flexShrink: 0 }}>
        <div className="h-full flex items-center" style={{ gap: 'var(--gap-sm)' }}>
          <span onMouseEnter={() => setStatusText(getUIStatusText('randomize'))} onMouseLeave={() => setStatusText(null)} className="h-full" style={{ width: 48 }}>
            <Button size="lg" className="h-full w-full" onClick={handleRandom} title="Randomize effects">
              <ShuffleIcon size={16} />
            </Button>
          </span>
          <span onMouseEnter={() => setStatusText(getUIStatusText('undo'))} onMouseLeave={() => setStatusText(null)} className="h-full" style={{ width: 48 }}>
            <Button size="lg" className="h-full w-full" onClick={handleUndo} disabled={!hasPreviousState}>
              UNDO
            </Button>
          </span>
          <button
            onPointerDown={handleRektDown}
            onPointerUp={handleRektUp}
            onPointerLeave={isRektLocked ? undefined : handleRektUp}
            onPointerCancel={isRektLocked ? undefined : handleRektUp}
            onMouseEnter={(e) => { !isRekt && (e.currentTarget.style.backgroundColor = 'var(--bg-hover)'); setStatusText(getUIStatusText('rekt')) }}
            onMouseLeave={(e) => { !isRekt && (e.currentTarget.style.backgroundColor = 'transparent'); setStatusText(null) }}
            className="h-full text-[11px] font-bold transition-all select-none touch-none active:scale-95"
            style={{ width: 48 }}
            style={{
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.1em',
              backgroundColor: isRekt ? '#FFFFFF' : 'transparent',
              border: isRekt ? '1px solid #FFFFFF' : '1px solid var(--border)',
              color: isRekt ? '#000000' : 'var(--text-muted)',
              animation: isRektLocked ? (rektFlashOn ? undefined : 'hud-blink 0.5s step-end infinite') : undefined,
            }}
            title={isRektLocked ? 'Click to unlock' : 'Hold or tap to lock'}
          >
            REKT
          </button>
        </div>
      </CornerFrame>
    </div>
  )
}
