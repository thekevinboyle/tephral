import { useState, useEffect } from 'react'
import { HorizontalCrossfader } from './HorizontalCrossfader'
import { useModulationStore } from '../../stores/modulationStore'

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

// Routing icon - shows connection symbol
function RoutingIcon({ active }: { active: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12">
      <circle
        cx="3" cy="6" r="2"
        fill="none"
        stroke={active ? 'var(--bg-primary)' : 'var(--text-ghost)'}
        strokeWidth="1.5"
      />
      <circle
        cx="9" cy="6" r="2"
        fill="none"
        stroke={active ? 'var(--bg-primary)' : 'var(--text-ghost)'}
        strokeWidth="1.5"
      />
      <path
        d="M5 6 L7 6"
        stroke={active ? 'var(--bg-primary)' : 'var(--text-ghost)'}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

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
        backgroundColor: isAssigning ? 'var(--accent)' : active ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
        border: isAssigning ? '1px solid var(--accent)' : active ? '1px solid var(--accent-dim)' : '1px solid var(--border)',
        boxShadow: isAssigning ? '0 0 12px var(--accent-glow)' : active ? '0 0 8px var(--accent-glow)' : 'none',
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
          style={{ color: isAssigning ? 'var(--bg-primary)' : active ? 'var(--accent)' : 'var(--text-muted)' }}
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
            backgroundColor: isAssigning ? 'rgba(0,0,0,0.2)' : 'transparent',
          }}
          title={isAssigning ? 'Stop assigning' : 'Click to assign to parameters'}
        >
          <RoutingIcon active={isAssigning} />
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
        className="h-full flex items-center flex-shrink-0"
        style={{
          width: 'var(--col-left)',
          borderRight: '1px solid var(--border)',
        }}
      >
        <div className="flex-1 px-2">
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
