import { useState, useEffect } from 'react'
import { HorizontalCrossfader } from './HorizontalCrossfader'
import { SendIcon } from '../ui/DotMatrixIcons'
import { useModulationStore } from '../../stores/modulationStore'
import { useSequencerStore } from '../../stores/sequencerStore'

// Time division options for rate dropdowns
const RATE_OPTIONS = [
  { label: '4 bars', division: 0.0625 },
  { label: '2 bars', division: 0.125 },
  { label: '1 bar', division: 0.25 },
  { label: '1/2', division: 0.5 },
  { label: '1/4', division: 1 },
  { label: '1/8', division: 2 },
  { label: '1/16', division: 4 },
  { label: '1/32', division: 8 },
  { label: '1/64', division: 16 },
] as const

// Convert BPM and division multiplier to Hz
const divisionToHz = (bpm: number, division: number) => (bpm / 60) * division

// Find closest rate option for a given Hz value
const hzToClosestOption = (hz: number, bpm: number): { label: string; division: number } => {
  let closest: { label: string; division: number } = RATE_OPTIONS[0]
  let closestDiff = Math.abs(divisionToHz(bpm, closest.division) - hz)
  for (const opt of RATE_OPTIONS) {
    const diff = Math.abs(divisionToHz(bpm, opt.division) - hz)
    if (diff < closestDiff) {
      closest = opt
      closestDiff = diff
    }
  }
  return closest
}
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
  onContextMenu?: (e: React.MouseEvent) => void
  popupContent?: React.ReactNode
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
  onContextMenu,
  popupContent,
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
    <div className="relative">
      {/* Popup panel above card */}
      {selected && popupContent && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex items-center gap-3 px-3 py-2 rounded-sm z-50"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--accent)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            whiteSpace: 'nowrap',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {popupContent}
          {/* Arrow pointing down */}
          <div
            className="absolute top-full left-1/2 -translate-x-1/2"
            style={{
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid var(--accent)',
            }}
          />
        </div>
      )}

      <div
        onClick={onClick}
        onContextMenu={onContextMenu}
        data-mod-source={type}
        className="flex flex-col rounded-sm cursor-pointer transition-all"
        style={{
          width: '80px',
          height: '100%',
          backgroundColor: 'var(--bg-elevated)',
          border: selected ? '2px solid var(--accent)' : '1px solid var(--border)',
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
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════

export function MiddleSection() {
  const [tick, setTick] = useState(0)

  // Get BPM from sequencer
  const { bpm } = useSequencerStore()

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

  // Handle card click - just toggle enable/disable
  const handleCardClick = (type: 'lfo' | 'random' | 'step' | 'envelope') => {
    switch (type) {
      case 'lfo': toggleLFO(); break
      case 'random': toggleRandom(); break
      case 'step': toggleStep(); break
      case 'envelope': toggleEnvelope(); break
    }
  }

  // Handle right-click - toggle parameter panel visibility
  const handleCardContextMenu = (type: 'lfo' | 'random' | 'step' | 'envelope', e: React.MouseEvent) => {
    e.preventDefault()
    // Toggle selection (showing/hiding params)
    if (selectedModulator === type) {
      setSelectedModulator(null)
    } else {
      setSelectedModulator(type)
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
          onContextMenu={(e) => handleCardContextMenu('lfo', e)}
          onAssignClick={() => toggleAssignmentMode('lfo')}
          popupContent={
            <>
              <div className="flex flex-col gap-1">
                <span className="text-[8px] uppercase" style={{ color: 'var(--text-ghost)' }}>Rate</span>
                <select
                  value={hzToClosestOption(lfo.rate, bpm).label}
                  onChange={(e) => {
                    const opt = RATE_OPTIONS.find(o => o.label === e.target.value)
                    if (opt) setLFORate(divisionToHz(bpm, opt.division))
                  }}
                  className="text-[10px] px-1 py-0.5 rounded-sm"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {RATE_OPTIONS.map(opt => (
                    <option key={opt.label} value={opt.label}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[8px] uppercase" style={{ color: 'var(--text-ghost)' }}>Shape</span>
                <select
                  value={lfo.shape}
                  onChange={(e) => setLFOShape(e.target.value as 'sine' | 'triangle' | 'square' | 'saw' | 'random')}
                  className="text-[10px] px-1 py-0.5 rounded-sm"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
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
          }
        />
        <ModulationCard
          type="random"
          label="Random"
          tick={tick}
          active={random.enabled}
          selected={selectedModulator === 'random'}
          isAssigning={assigningModulator === 'random'}
          onClick={() => handleCardClick('random')}
          onContextMenu={(e) => handleCardContextMenu('random', e)}
          onAssignClick={() => toggleAssignmentMode('random')}
          popupContent={
            <>
              <div className="flex flex-col gap-1">
                <span className="text-[8px] uppercase" style={{ color: 'var(--text-ghost)' }}>Rate</span>
                <select
                  value={hzToClosestOption(random.rate, bpm).label}
                  onChange={(e) => {
                    const opt = RATE_OPTIONS.find(o => o.label === e.target.value)
                    if (opt) setRandomRate(divisionToHz(bpm, opt.division))
                  }}
                  className="text-[10px] px-1 py-0.5 rounded-sm"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {RATE_OPTIONS.map(opt => (
                    <option key={opt.label} value={opt.label}>{opt.label}</option>
                  ))}
                </select>
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
          }
        />
        <ModulationCard
          type="step"
          label="Step"
          tick={tick}
          active={step.enabled}
          selected={selectedModulator === 'step'}
          isAssigning={assigningModulator === 'step'}
          onClick={() => handleCardClick('step')}
          onContextMenu={(e) => handleCardContextMenu('step', e)}
          onAssignClick={() => toggleAssignmentMode('step')}
          popupContent={
            <>
              <div className="flex flex-col gap-1">
                <span className="text-[8px] uppercase" style={{ color: 'var(--text-ghost)' }}>Rate</span>
                <select
                  value={hzToClosestOption(step.rate, bpm).label}
                  onChange={(e) => {
                    const opt = RATE_OPTIONS.find(o => o.label === e.target.value)
                    if (opt) setStepRate(divisionToHz(bpm, opt.division))
                  }}
                  className="text-[10px] px-1 py-0.5 rounded-sm"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {RATE_OPTIONS.map(opt => (
                    <option key={opt.label} value={opt.label}>{opt.label}</option>
                  ))}
                </select>
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
          }
        />
        <ModulationCard
          type="envelope"
          label="Env"
          tick={tick}
          active={envelope.enabled}
          selected={selectedModulator === 'envelope'}
          isAssigning={assigningModulator === 'envelope'}
          onClick={() => handleCardClick('envelope')}
          onContextMenu={(e) => handleCardContextMenu('envelope', e)}
          onAssignClick={() => toggleAssignmentMode('envelope')}
          popupContent={
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
                  backgroundColor: envelope.phase !== 'idle' ? 'var(--accent)' : 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  color: envelope.phase !== 'idle' ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
              >
                Trig
              </button>
            </>
          }
        />
      </div>
    </div>
  )
}
