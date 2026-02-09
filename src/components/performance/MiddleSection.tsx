import { useState, useEffect } from 'react'
import { HorizontalCrossfader } from './HorizontalCrossfader'
import { SendIcon } from '../ui/DotMatrixIcons'
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
  selected?: boolean
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
  selected = false,
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
        border: selected ? '2px solid var(--accent)' : active ? '1px solid var(--accent-dim)' : '1px solid var(--border)',
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
          <SendIcon size={16} color={isAssigning ? 'var(--bg-primary)' : 'var(--text-ghost)'} />
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
    selectedModulator,
    setSelectedModulator,
    setLFORate,
    setLFOShape,
    setRandomRate,
    setRandomSmoothing,
    setStepRate,
    setStepValue,
    setEnvelopeParams,
    triggerEnvelope,
    releaseEnvelope,
  } = useModulationStore()

  // Handle card click - select and enable if not already
  const handleCardClick = (type: 'lfo' | 'random' | 'step' | 'envelope') => {
    // If clicking the already selected one, deselect
    if (selectedModulator === type) {
      setSelectedModulator(null)
      return
    }
    // Select this modulator
    setSelectedModulator(type)
    // Enable it if not already
    switch (type) {
      case 'lfo': if (!lfo.enabled) toggleLFO(); break
      case 'random': if (!random.enabled) toggleRandom(); break
      case 'step': if (!step.enabled) toggleStep(); break
      case 'envelope': if (!envelope.enabled) toggleEnvelope(); break
    }
  }

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
          selected={selectedModulator === 'lfo'}
          isAssigning={assigningModulator === 'lfo'}
          onClick={() => handleCardClick('lfo')}
          onAssignClick={() => toggleAssignmentMode('lfo')}
        />
        <ModulationCard
          type="random"
          label="Random"
          tick={tick}
          active={random.enabled}
          selected={selectedModulator === 'random'}
          isAssigning={assigningModulator === 'random'}
          onClick={() => handleCardClick('random')}
          onAssignClick={() => toggleAssignmentMode('random')}
        />
        <ModulationCard
          type="step"
          label="Step"
          tick={tick}
          active={step.enabled}
          selected={selectedModulator === 'step'}
          isAssigning={assigningModulator === 'step'}
          onClick={() => handleCardClick('step')}
          onAssignClick={() => toggleAssignmentMode('step')}
        />
        <ModulationCard
          type="envelope"
          label="Env"
          tick={tick}
          active={envelope.enabled}
          selected={selectedModulator === 'envelope'}
          isAssigning={assigningModulator === 'envelope'}
          onClick={() => handleCardClick('envelope')}
          onAssignClick={() => toggleAssignmentMode('envelope')}
        />

        {/* Parameter panel for selected modulator */}
        {selectedModulator && (
          <div
            className="flex items-center gap-3 px-3 py-1 rounded-sm ml-2"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border)',
            }}
          >
            {selectedModulator === 'lfo' && (
              <>
                <div className="flex flex-col gap-1">
                  <span className="text-[8px] uppercase" style={{ color: 'var(--text-ghost)' }}>Rate</span>
                  <input
                    type="range"
                    min={0.1}
                    max={20}
                    step={0.1}
                    value={lfo.rate}
                    onChange={(e) => setLFORate(parseFloat(e.target.value))}
                    className="w-16"
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  <span className="text-[9px] tabular-nums" style={{ color: 'var(--text-muted)' }}>{lfo.rate.toFixed(1)} Hz</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[8px] uppercase" style={{ color: 'var(--text-ghost)' }}>Shape</span>
                  <select
                    value={lfo.shape}
                    onChange={(e) => setLFOShape(e.target.value as 'sine' | 'triangle' | 'square' | 'saw' | 'random')}
                    className="text-[10px] px-1 py-0.5 rounded-sm"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <option value="sine">Sine</option>
                    <option value="triangle">Tri</option>
                    <option value="square">Sqr</option>
                    <option value="saw">Saw</option>
                    <option value="random">S&H</option>
                  </select>
                </div>
              </>
            )}
            {selectedModulator === 'random' && (
              <>
                <div className="flex flex-col gap-1">
                  <span className="text-[8px] uppercase" style={{ color: 'var(--text-ghost)' }}>Rate</span>
                  <input
                    type="range"
                    min={0.1}
                    max={30}
                    step={0.1}
                    value={random.rate}
                    onChange={(e) => setRandomRate(parseFloat(e.target.value))}
                    className="w-16"
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  <span className="text-[9px] tabular-nums" style={{ color: 'var(--text-muted)' }}>{random.rate.toFixed(1)}/s</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[8px] uppercase" style={{ color: 'var(--text-ghost)' }}>Smooth</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={random.smoothing}
                    onChange={(e) => setRandomSmoothing(parseFloat(e.target.value))}
                    className="w-16"
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  <span className="text-[9px] tabular-nums" style={{ color: 'var(--text-muted)' }}>{Math.round(random.smoothing * 100)}%</span>
                </div>
              </>
            )}
            {selectedModulator === 'step' && (
              <>
                <div className="flex flex-col gap-1">
                  <span className="text-[8px] uppercase" style={{ color: 'var(--text-ghost)' }}>Rate</span>
                  <input
                    type="range"
                    min={0.1}
                    max={20}
                    step={0.1}
                    value={step.rate}
                    onChange={(e) => setStepRate(parseFloat(e.target.value))}
                    className="w-16"
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  <span className="text-[9px] tabular-nums" style={{ color: 'var(--text-muted)' }}>{step.rate.toFixed(1)}/s</span>
                </div>
                <div className="flex gap-[2px] items-end h-8">
                  {step.steps.map((val, i) => (
                    <div
                      key={i}
                      className="w-2 cursor-pointer hover:opacity-80"
                      style={{
                        height: `${val * 100}%`,
                        minHeight: '2px',
                        backgroundColor: step.currentStep === i ? 'var(--accent)' : 'var(--text-muted)',
                      }}
                      onClick={() => setStepValue(i, val > 0.5 ? 0 : 1)}
                    />
                  ))}
                </div>
              </>
            )}
            {selectedModulator === 'envelope' && (
              <>
                <div className="flex flex-col gap-1">
                  <span className="text-[8px] uppercase" style={{ color: 'var(--text-ghost)' }}>A</span>
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.01}
                    value={envelope.attack}
                    onChange={(e) => setEnvelopeParams({ attack: parseFloat(e.target.value) })}
                    className="w-10"
                    style={{ accentColor: 'var(--accent)' }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[8px] uppercase" style={{ color: 'var(--text-ghost)' }}>D</span>
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.01}
                    value={envelope.decay}
                    onChange={(e) => setEnvelopeParams({ decay: parseFloat(e.target.value) })}
                    className="w-10"
                    style={{ accentColor: 'var(--accent)' }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[8px] uppercase" style={{ color: 'var(--text-ghost)' }}>S</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={envelope.sustain}
                    onChange={(e) => setEnvelopeParams({ sustain: parseFloat(e.target.value) })}
                    className="w-10"
                    style={{ accentColor: 'var(--accent)' }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[8px] uppercase" style={{ color: 'var(--text-ghost)' }}>R</span>
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.01}
                    value={envelope.release}
                    onChange={(e) => setEnvelopeParams({ release: parseFloat(e.target.value) })}
                    className="w-10"
                    style={{ accentColor: 'var(--accent)' }}
                  />
                </div>
                <button
                  onMouseDown={triggerEnvelope}
                  onMouseUp={releaseEnvelope}
                  onMouseLeave={releaseEnvelope}
                  className="px-2 py-1 text-[9px] rounded-sm"
                  style={{
                    backgroundColor: envelope.phase !== 'idle' ? 'var(--accent)' : 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    color: envelope.phase !== 'idle' ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}
                >
                  Trig
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
