import { useState, useEffect } from 'react'
import { HorizontalCrossfader } from './HorizontalCrossfader'
import { TargetIcon } from '../ui/DotMatrixIcons'
import { useModulationStore } from '../../stores/modulationStore'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { useAsciiRenderStore } from '../../stores/asciiRenderStore'
import { useStippleStore } from '../../stores/stippleStore'
import { useContourStore } from '../../stores/contourStore'
import { useLandmarksStore } from '../../stores/landmarksStore'
import { useAcidStore } from '../../stores/acidStore'
import { useVisionTrackingStore } from '../../stores/visionTrackingStore'
import { useStrandStore } from '../../stores/strandStore'
import { useMotionStore } from '../../stores/motionStore'
import { useTextureOverlayStore } from '../../stores/textureOverlayStore'
import { useDataOverlayStore } from '../../stores/dataOverlayStore'
import { Button } from '../ui/Button'

// ════════════════════════════════════════════════════════════════════════════
// MODULATION CARD GRAPHICS
// ════════════════════════════════════════════════════════════════════════════

// LFO Sine Wave Animation
function LFOGraphic({ tick, rate = 1 }: { tick: number; rate?: number }) {
  const width = 32
  const height = 16

  return (
    <div className="flex items-center justify-center">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Wave path */}
        <path
          d={Array.from({ length: width }, (_, x) => {
            const y = height / 2 + Math.sin((x * 0.3) + (tick * 0.15 * rate)) * (height / 2 - 2)
            return `${x === 0 ? 'M' : 'L'} ${x} ${y}`
          }).join(' ')}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.5"
          opacity={0.8}
        />
        {/* Current position dot */}
        <circle
          cx={width / 2}
          cy={height / 2 + Math.sin((width / 2 * 0.3) + (tick * 0.15 * rate)) * (height / 2 - 2)}
          r="2"
          fill="var(--accent)"
        />
      </svg>
    </div>
  )
}

// Random/Noise Animation
function RandomGraphic({ tick }: { tick: number }) {
  const cols = 8
  const rows = 4

  // Generate pseudo-random values based on tick
  const getRandomValue = (x: number, y: number, t: number) => {
    const seed = (x * 13 + y * 7 + Math.floor(t / 3) * 11) % 17
    return seed / 17
  }

  return (
    <div className="flex flex-col gap-[1px]">
      {Array.from({ length: rows }, (_, y) => (
        <div key={y} className="flex gap-[1px]">
          {Array.from({ length: cols }, (_, x) => {
            const value = getRandomValue(x, y, tick)
            return (
              <div
                key={x}
                className="w-1.5 h-1.5"
                style={{
                  backgroundColor: value > 0.5 ? 'var(--accent)' : 'var(--bg-elevated)',
                  opacity: value > 0.5 ? (0.4 + value * 0.6) : 0.3,
                }}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

// Step Sequencer Animation
function StepGraphic({ tick }: { tick: number }) {
  const steps = 8
  const currentStep = Math.floor(tick / 4) % steps

  return (
    <div className="flex gap-[2px] items-end h-4">
      {Array.from({ length: steps }, (_, i) => {
        const height = ((i * 3 + 5) % 8) + 2
        const isActive = i === currentStep
        return (
          <div
            key={i}
            className="w-1.5 transition-all duration-75"
            style={{
              height: `${height * 2}px`,
              backgroundColor: isActive ? 'var(--accent)' : 'var(--text-ghost)',
              opacity: isActive ? 1 : 0.5,
              boxShadow: isActive ? '0 0 4px var(--accent-glow)' : 'none',
            }}
          />
        )
      })}
    </div>
  )
}

// Envelope Animation (ADSR style)
function EnvelopeGraphic({ tick }: { tick: number }) {
  const width = 32
  const height = 14
  const phase = (tick * 0.08) % 4

  // ADSR envelope shape
  const getEnvelopeY = (x: number, t: number) => {
    const normalizedX = x / width
    const cyclePos = (normalizedX + t) % 1

    if (cyclePos < 0.1) {
      // Attack
      return height - (cyclePos / 0.1) * height
    } else if (cyclePos < 0.2) {
      // Decay
      return ((cyclePos - 0.1) / 0.1) * (height * 0.4)
    } else if (cyclePos < 0.6) {
      // Sustain
      return height * 0.4
    } else if (cyclePos < 0.8) {
      // Release
      return height * 0.4 + ((cyclePos - 0.6) / 0.2) * (height * 0.6)
    }
    return height
  }

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path
        d={Array.from({ length: width }, (_, x) => {
          const y = getEnvelopeY(x, phase)
          return `${x === 0 ? 'M' : 'L'} ${x} ${y}`
        }).join(' ')}
        fill="none"
        stroke="#22c55e"
        strokeWidth="1.5"
        opacity={0.8}
      />
    </svg>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// MODULATION CARD COMPONENT
// ════════════════════════════════════════════════════════════════════════════

interface ModulationCardProps {
  type: 'lfo' | 'random' | 'step' | 'envelope'
  label: string
  tick: number
  active?: boolean
  isAssigning?: boolean
  onClick?: () => void
  onAssignClick?: () => void
}

// Use imported RoutingIcon from DotMatrixIcons

function ModulationCard({
  type,
  label,
  tick,
  active = false,
  isAssigning = false,
  onClick,
  onAssignClick,
}: ModulationCardProps) {
  const renderGraphic = () => {
    switch (type) {
      case 'lfo':
        return <LFOGraphic tick={tick} />
      case 'random':
        return <RandomGraphic tick={tick} />
      case 'step':
        return <StepGraphic tick={tick} />
      case 'envelope':
        return <EnvelopeGraphic tick={tick} />
    }
  }

  return (
    <div
      onClick={onClick}
      data-mod-source={type}
      className="flex flex-col rounded-sm cursor-pointer transition-all relative"
      style={{
        width: '80px',
        height: '100%',
        backgroundColor: active ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
        border: active ? '1px solid var(--accent-dim)' : '1px solid var(--border)',
        boxShadow: active ? '0 0 8px var(--accent-glow)' : 'none',
      }}
    >
      {/* Graphic area */}
      <div
        className="flex-1 flex items-center justify-center px-2"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {renderGraphic()}
      </div>

      {/* Label and assign button */}
      <div className="px-2 py-1 flex items-center justify-between">
        <span
          className="text-[9px] uppercase tracking-widest"
          style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }}
        >
          {label}
        </span>

        {/* Assignment mode button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onAssignClick?.()
          }}
          className="w-5 h-5 rounded-sm flex items-center justify-center transition-all hover:scale-110"
          style={{
            backgroundColor: isAssigning ? 'var(--accent)' : 'transparent',
            boxShadow: isAssigning ? '0 0 8px var(--accent-glow)' : 'none',
          }}
          title={isAssigning ? 'Stop assigning' : 'Click to assign to parameters'}
        >
          <TargetIcon size={16} color={isAssigning ? 'var(--bg-primary)' : 'var(--text-ghost)'} />
        </button>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════

export function MiddleSection() {
  const [tick, setTick] = useState(0)

  // Get modulation state from store
  const {
    lfo,
    random,
    step,
    envelope,
    toggleLFO,
    toggleRandom,
    toggleStep,
    toggleEnvelope,
    assigningModulator,
    toggleAssignmentMode,
  } = useModulationStore()

  // Effect stores for Clear/Bypass
  const glitch = useGlitchEngineStore()
  const ascii = useAsciiRenderStore()
  const stipple = useStippleStore()
  const contour = useContourStore()
  const landmarks = useLandmarksStore()
  const acid = useAcidStore()
  const vision = useVisionTrackingStore()
  const strand = useStrandStore()
  const motion = useMotionStore()
  const textureOverlay = useTextureOverlayStore()
  const dataOverlay = useDataOverlayStore()

  const handleClear = () => {
    // Clear glitch effects
    glitch.setRGBSplitEnabled(false)
    glitch.setChromaticAberrationEnabled(false)
    glitch.setPosterizeEnabled(false)
    glitch.setColorGradeEnabled(false)
    glitch.setBlockDisplaceEnabled(false)
    glitch.setStaticDisplacementEnabled(false)
    glitch.setPixelateEnabled(false)
    glitch.setLensDistortionEnabled(false)
    glitch.setScanLinesEnabled(false)
    glitch.setVHSTrackingEnabled(false)
    glitch.setNoiseEnabled(false)
    glitch.setDitherEnabled(false)
    glitch.setEdgeDetectionEnabled(false)
    glitch.setFeedbackLoopEnabled(false)
    // Clear vision effects
    ascii.setEnabled(false)
    stipple.setEnabled(false)
    contour.setEnabled(false)
    landmarks.setEnabled(false)
    landmarks.setCurrentMode('off')
    // Clear acid effects
    acid.setDotsEnabled(false)
    acid.setGlyphEnabled(false)
    acid.setIconsEnabled(false)
    acid.setContourEnabled(false)
    acid.setDecompEnabled(false)
    acid.setMirrorEnabled(false)
    acid.setSliceEnabled(false)
    acid.setThGridEnabled(false)
    acid.setCloudEnabled(false)
    acid.setLedEnabled(false)
    acid.setSlitEnabled(false)
    acid.setVoronoiEnabled(false)
    // Clear vision tracking effects
    vision.setBrightEnabled(false)
    vision.setEdgeEnabled(false)
    vision.setColorEnabled(false)
    vision.setMotionEnabled(false)
    vision.setFaceEnabled(false)
    vision.setHandsEnabled(false)
    // Clear overlay effects
    textureOverlay.setEnabled(false)
    dataOverlay.setEnabled(false)
    // Clear strand effects
    strand.setHandprintsEnabled(false)
    strand.setTarSpreadEnabled(false)
    strand.setTimefallEnabled(false)
    strand.setVoidOutEnabled(false)
    strand.setStrandWebEnabled(false)
    strand.setBridgeLinkEnabled(false)
    strand.setChiralPathEnabled(false)
    strand.setUmbilicalEnabled(false)
    strand.setOdradekEnabled(false)
    strand.setChiraliumEnabled(false)
    strand.setBeachStaticEnabled(false)
    strand.setDoomsEnabled(false)
    strand.setChiralCloudEnabled(false)
    strand.setBBPodEnabled(false)
    strand.setSeamEnabled(false)
    strand.setExtinctionEnabled(false)
    // Clear motion effects
    motion.setMotionExtractEnabled(false)
    motion.setEchoTrailEnabled(false)
    motion.setTimeSmearEnabled(false)
    motion.setFreezeMaskEnabled(false)
  }

  // Animation tick
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1)
    }, 100)
    return () => clearInterval(interval)
  }, [])

  return (
    <div
      className="h-full rounded-sm flex panel-gradient-up"
      style={{
        border: '1px solid var(--border)',
      }}
    >
      {/* Crossfader aligned with grid button column width */}
      <div
        className="h-full flex items-center flex-shrink-0 gap-2 px-3"
        style={{
          width: 'var(--col-left)',
          borderRight: '1px solid var(--border)',
        }}
      >
        {/* Clear/Bypass buttons stacked */}
        <div className="flex flex-col gap-1 flex-shrink-0">
          <Button
            size="sm"
            onClick={handleClear}
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: '#f59e0b',
              color: '#f59e0b',
            }}
          >
            Clear
          </Button>
          <Button
            size="sm"
            onClick={() => glitch.setBypassActive(!glitch.bypassActive)}
            style={{
              backgroundColor: glitch.bypassActive ? '#ef4444' : 'var(--bg-elevated)',
              borderColor: '#ef4444',
              color: glitch.bypassActive ? '#fff' : '#ef4444',
              boxShadow: glitch.bypassActive ? '0 0 8px rgba(239, 68, 68, 0.5)' : 'none',
            }}
          >
            Bypass
          </Button>
        </div>
        {/* Crossfader */}
        <div className="flex-1">
          <HorizontalCrossfader />
        </div>
      </div>

      {/* Modulation Lane */}
      <div className="flex-1 flex items-center px-3 gap-2 overflow-x-auto">
        {/* Section label */}
        <div
          className="flex-shrink-0 text-[9px] uppercase tracking-widest mr-2"
          style={{ color: 'var(--text-ghost)' }}
        >
          MOD
        </div>

        {/* Modulation cards */}
        <ModulationCard
          type="lfo"
          label="LFO"
          tick={tick}
          active={lfo.enabled}
          isAssigning={assigningModulator === 'lfo'}
          onClick={toggleLFO}
          onAssignClick={() => toggleAssignmentMode('lfo')}
        />
        <ModulationCard
          type="random"
          label="Random"
          tick={tick}
          active={random.enabled}
          isAssigning={assigningModulator === 'random'}
          onClick={toggleRandom}
          onAssignClick={() => toggleAssignmentMode('random')}
        />
        <ModulationCard
          type="step"
          label="Step"
          tick={tick}
          active={step.enabled}
          isAssigning={assigningModulator === 'step'}
          onClick={toggleStep}
          onAssignClick={() => toggleAssignmentMode('step')}
        />
        <ModulationCard
          type="envelope"
          label="Env"
          tick={tick}
          active={envelope.enabled}
          isAssigning={assigningModulator === 'envelope'}
          onClick={toggleEnvelope}
          onAssignClick={() => toggleAssignmentMode('envelope')}
        />
      </div>
    </div>
  )
}
