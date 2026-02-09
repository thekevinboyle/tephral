import { useState, useEffect } from 'react'
import { SendIcon } from '../ui/DotMatrixIcons'
import { useModulationStore } from '../../stores/modulationStore'
import { useUIStore } from '../../stores/uiStore'

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

// Sample & Hold Animation (stepped signal)
function SampleHoldGraphic({ tick }: { tick: number }) {
  const width = 32
  const height = 14
  const steps = 6
  const stepWidth = width / steps
  const phase = (tick * 0.05) % 1

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Stepped horizontal lines */}
      {Array.from({ length: steps }, (_, i) => {
        // Pseudo-random heights based on step index and phase
        const seed = (i + Math.floor(phase * 10)) * 17 % 100
        const y = 2 + (seed / 100) * (height - 4)
        const x1 = i * stepWidth
        const x2 = (i + 1) * stepWidth
        const isActive = i === Math.floor(phase * steps)
        return (
          <g key={i}>
            <line
              x1={x1}
              y1={y}
              x2={x2}
              y2={y}
              stroke={isActive ? '#f59e0b' : '#f59e0b'}
              strokeWidth="1.5"
              opacity={isActive ? 1 : 0.5}
            />
            {/* Vertical transition line */}
            {i < steps - 1 && (
              <line
                x1={x2}
                y1={y}
                x2={x2}
                y2={2 + (((i + 1 + Math.floor(phase * 10)) * 17 % 100) / 100) * (height - 4)}
                stroke="#f59e0b"
                strokeWidth="1"
                opacity={0.3}
              />
            )}
          </g>
        )
      })}
      {/* Sample indicator dot */}
      <circle
        cx={phase * width}
        cy={2 + ((Math.floor(phase * steps) + Math.floor(phase * 10)) * 17 % 100) / 100 * (height - 4)}
        r="2"
        fill="#f59e0b"
      />
    </svg>
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
  type: 'lfo' | 'random' | 'step' | 'envelope' | 'sampleHold'
  label: string
  tick: number
  active?: boolean
  selected?: boolean
  isAssigning?: boolean
  onClick?: () => void
  onAssignClick?: () => void
}

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
      case 'sampleHold':
        return <SampleHoldGraphic tick={tick} />
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
  )
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════

export function ModulationLane() {
  const [tick, setTick] = useState(0)

  // Get modulation state from store
  const {
    lfo,
    random,
    step,
    envelope,
    sampleHold,
    toggleLFO,
    toggleRandom,
    toggleStep,
    toggleEnvelope,
    toggleSampleHold,
    assigningModulator,
    toggleAssignmentMode,
    selectedModulator,
    setSelectedModulator,
  } = useModulationStore()

  const { setSelectedEffect } = useUIStore()

  // Handle card click - select and enable, or disable if already selected
  const handleCardClick = (type: 'lfo' | 'random' | 'step' | 'envelope' | 'sampleHold') => {
    // Clear effect selection when selecting a modulator
    setSelectedEffect(null)
    // If clicking the already selected one, disable and deselect
    if (selectedModulator === type) {
      switch (type) {
        case 'lfo': if (lfo.enabled) toggleLFO(); break
        case 'random': if (random.enabled) toggleRandom(); break
        case 'step': if (step.enabled) toggleStep(); break
        case 'envelope': if (envelope.enabled) toggleEnvelope(); break
        case 'sampleHold': if (sampleHold.enabled) toggleSampleHold(); break
      }
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
      case 'sampleHold': if (!sampleHold.enabled) toggleSampleHold(); break
    }
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
      className="h-full flex items-center px-3 py-3 gap-2 overflow-x-auto"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderTop: '1px solid var(--border)',
      }}
    >
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
      <ModulationCard
        type="sampleHold"
        label="S&H"
        tick={tick}
        active={sampleHold.enabled}
        selected={selectedModulator === 'sampleHold'}
        isAssigning={assigningModulator === 'sampleHold'}
        onClick={() => handleCardClick('sampleHold')}
        onAssignClick={() => toggleAssignmentMode('sampleHold')}
      />
    </div>
  )
}
