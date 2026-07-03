import { useEffect, useRef } from 'react'
import { SendIcon } from '../ui/DotMatrixIcons'
import { useModulationStore, computeMorphedWave } from '../../stores/modulationStore'
import { useSequencerStore } from '../../stores/sequencerStore'
import { useUIStore } from '../../stores/uiStore'
import { getUIStatusText } from '../../config/statusDescriptions'

// ════════════════════════════════════════════════════════════════════════════
// LIVE MODULATION SCOPES
// Each scope runs a single rAF loop writing directly to SVG element attributes
// via refs — no React state updates at frame rate, no tree re-renders.
// ════════════════════════════════════════════════════════════════════════════

const SCOPE_W = 56
const SCOPE_H = 16

// Map a 0-1 signal value to scope Y (2px padding top/bottom)
function scopeY(v: number): number {
  return SCOPE_H - 2 - Math.max(0, Math.min(1, v)) * (SCOPE_H - 4)
}

// Shared rAF driver: calls draw() every frame, cancelled on unmount
function useScopeFrame(draw: (now: number) => void) {
  const drawRef = useRef(draw)
  drawRef.current = draw
  useEffect(() => {
    let frame = 0
    const loop = (now: number) => {
      drawRef.current(now)
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [])
}

// Scope chrome: center reference line behind the trace
function ScopeSvg({ children }: { children: React.ReactNode }) {
  return (
    <svg width={SCOPE_W} height={SCOPE_H} viewBox={`0 0 ${SCOPE_W} ${SCOPE_H}`}>
      <line
        x1={0}
        y1={SCOPE_H / 2}
        x2={SCOPE_W}
        y2={SCOPE_H / 2}
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="1"
        strokeDasharray="2 3"
      />
      {children}
    </svg>
  )
}

// LFO: actual morphed waveform (tilt/curve) with phosphor dot at live phase.
// Enabled: tracks the engine's real phase. Idle: self-oscillates at the set
// rate so the lane always reads as powered-on.
function LFOGraphic() {
  const pathRef = useRef<SVGPathElement>(null)
  const dotRef = useRef<SVGCircleElement>(null)
  const shapeKey = useRef('')

  useScopeFrame((now) => {
    const { lfos, selectedLFOIndex } = useModulationStore.getState()
    const lfo = lfos[selectedLFOIndex]
    const path = pathRef.current
    const dot = dotRef.current
    if (!path || !dot) return

    // Rebuild the waveform path only when the shape actually changes
    const key = `${lfo.tilt}|${lfo.curve}`
    if (key !== shapeKey.current) {
      shapeKey.current = key
      let d = ''
      for (let x = 0; x <= SCOPE_W; x += 2) {
        const v = computeMorphedWave(x / SCOPE_W, lfo.tilt, lfo.curve)
        d += `${x === 0 ? 'M' : 'L'} ${x} ${scopeY(v).toFixed(1)} `
      }
      path.setAttribute('d', d)
    }

    const phase = lfo.enabled
      ? (lfo.phase + lfo.phaseOffset / 360) % 1
      : ((now / 1000) * lfo.rate) % 1
    const v = lfo.enabled ? lfo.currentValue : computeMorphedWave(phase, lfo.tilt, lfo.curve)
    dot.setAttribute('cx', (phase * SCOPE_W).toFixed(1))
    dot.setAttribute('cy', scopeY(v).toFixed(1))
    path.setAttribute('opacity', lfo.enabled ? '0.9' : '0.4')
    dot.setAttribute('opacity', lfo.enabled ? '1' : '0.6')
  })

  return (
    <ScopeSvg>
      <path ref={pathRef} fill="none" stroke="var(--accent)" strokeWidth="1.5" opacity={0.4} />
      <circle ref={dotRef} r="2" fill="var(--accent)" />
    </ScopeSvg>
  )
}

// Scrolling history trace of a live value (Random, S&H): one sample per frame
// pushed into a ring buffer, drawn as a polyline — ~1s of signal history.
function TraceGraphic({ source }: { source: () => { value: number; enabled: boolean } }) {
  const polyRef = useRef<SVGPolylineElement>(null)
  const dotRef = useRef<SVGCircleElement>(null)
  const buffer = useRef<Float32Array | null>(null)
  const head = useRef(0)

  useScopeFrame(() => {
    const { value, enabled } = source()
    const poly = polyRef.current
    const dot = dotRef.current
    if (!poly || !dot) return

    if (!buffer.current) buffer.current = new Float32Array(SCOPE_W).fill(value)
    const buf = buffer.current
    buf[head.current] = value
    head.current = (head.current + 1) % buf.length

    let pts = ''
    let lastY = SCOPE_H / 2
    for (let i = 0; i < buf.length; i++) {
      lastY = scopeY(buf[(head.current + i) % buf.length])
      pts += `${i},${lastY.toFixed(1)} `
    }
    poly.setAttribute('points', pts)
    dot.setAttribute('cx', String(buf.length - 1))
    dot.setAttribute('cy', lastY.toFixed(1))
    poly.setAttribute('opacity', enabled ? '0.9' : '0.35')
    dot.setAttribute('opacity', enabled ? '1' : '0.5')
  })

  return (
    <ScopeSvg>
      <polyline ref={polyRef} fill="none" stroke="var(--accent)" strokeWidth="1.2" opacity={0.35} />
      <circle ref={dotRef} r="1.8" fill="var(--accent)" />
    </ScopeSvg>
  )
}

// Step: the real 8-step sequence with a playhead sweeping through the live step
const STEP_COUNT = 8
function StepGraphic() {
  const barRefs = useRef<(SVGRectElement | null)[]>([])
  const headRef = useRef<SVGLineElement>(null)

  useScopeFrame(() => {
    const { step } = useModulationStore.getState()
    const n = step.steps.length
    const count = Math.min(n, STEP_COUNT)
    for (let i = 0; i < count; i++) {
      const bar = barRefs.current[i]
      if (!bar) continue
      const h = Math.max(1, step.steps[i] * (SCOPE_H - 4))
      bar.setAttribute('y', (SCOPE_H - 2 - h).toFixed(1))
      bar.setAttribute('height', h.toFixed(1))
      const isActive = step.enabled && i === step.currentStep
      bar.setAttribute('opacity', isActive ? '1' : step.enabled ? '0.35' : '0.25')
    }
    const ph = headRef.current
    if (ph) {
      const frac = Math.min(1, step.timeSinceStep * step.rate)
      const x = ((step.currentStep + frac) / n) * SCOPE_W
      ph.setAttribute('x1', x.toFixed(1))
      ph.setAttribute('x2', x.toFixed(1))
      ph.setAttribute('opacity', step.enabled ? '0.9' : '0.2')
    }
  })

  const cellW = SCOPE_W / STEP_COUNT
  return (
    <ScopeSvg>
      {Array.from({ length: STEP_COUNT }, (_, i) => (
        <rect
          key={i}
          ref={(el) => { barRefs.current[i] = el }}
          x={(i * cellW + 1).toFixed(1)}
          width={(cellW - 2).toFixed(1)}
          y={SCOPE_H - 3}
          height={1}
          fill="var(--accent)"
          opacity={0.25}
        />
      ))}
      <line ref={headRef} x1={0} x2={0} y1={1} y2={SCOPE_H - 1} stroke="var(--accent)" strokeWidth="1" opacity={0.2} />
    </ScopeSvg>
  )
}

// Envelope: actual ADSR curve (segment widths proportional to real times)
// with a phosphor dot tracking the live phase position and output value.
function EnvelopeGraphic() {
  const pathRef = useRef<SVGPathElement>(null)
  const dotRef = useRef<SVGCircleElement>(null)
  const adsrKey = useRef('')

  useScopeFrame(() => {
    const { envelope: env } = useModulationStore.getState()
    const path = pathRef.current
    const dot = dotRef.current
    if (!path || !dot) return

    const sustainDwell = 0.4 // fixed visual dwell for the sustain plateau
    const a = Math.max(env.attack, 0.02)
    const d = Math.max(env.decay, 0.02)
    const r = Math.max(env.release, 0.02)
    const total = a + d + sustainDwell + r
    const xA = (a / total) * SCOPE_W
    const xD = xA + (d / total) * SCOPE_W
    const xS = xD + (sustainDwell / total) * SCOPE_W

    const key = `${a}|${d}|${env.sustain}|${r}`
    if (key !== adsrKey.current) {
      adsrKey.current = key
      path.setAttribute(
        'd',
        `M 0 ${scopeY(0).toFixed(1)} L ${xA.toFixed(1)} ${scopeY(1).toFixed(1)} ` +
        `L ${xD.toFixed(1)} ${scopeY(env.sustain).toFixed(1)} L ${xS.toFixed(1)} ${scopeY(env.sustain).toFixed(1)} ` +
        `L ${SCOPE_W} ${scopeY(0).toFixed(1)}`
      )
    }

    let x = 0
    switch (env.phase) {
      case 'attack': x = Math.min(1, env.phaseStartTime / a) * xA; break
      case 'decay': x = xA + Math.min(1, env.phaseStartTime / d) * (xD - xA); break
      case 'sustain': x = (xD + xS) / 2; break
      case 'release': x = xS + Math.min(1, env.phaseStartTime / r) * (SCOPE_W - xS); break
      default: x = 0
    }
    dot.setAttribute('cx', x.toFixed(1))
    dot.setAttribute('cy', scopeY(env.currentValue).toFixed(1))
    dot.setAttribute('opacity', env.phase !== 'idle' ? '1' : env.enabled ? '0.5' : '0.3')
    path.setAttribute('opacity', env.enabled ? '0.9' : '0.4')
  })

  return (
    <ScopeSvg>
      <path ref={pathRef} fill="none" stroke="var(--accent)" strokeWidth="1.5" opacity={0.4} />
      <circle ref={dotRef} r="2" fill="var(--accent)" />
    </ScopeSvg>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// MODULATION CARD COMPONENT
// ════════════════════════════════════════════════════════════════════════════

interface ModulationCardProps {
  type: 'lfo' | 'random' | 'step' | 'envelope' | 'sampleHold'
  label: string
  active?: boolean
  routed?: boolean
  selected?: boolean
  isAssigning?: boolean
  onClick?: () => void
  onAssignClick?: () => void
}

function ModulationCard({
  type,
  label,
  active = false,
  routed = false,
  selected = false,
  isAssigning = false,
  onClick,
  onAssignClick,
}: ModulationCardProps) {
  const setStatusText = useUIStore((s) => s.setStatusText)
  const renderGraphic = () => {
    switch (type) {
      case 'lfo':
        return <LFOGraphic />
      case 'random':
        return (
          <TraceGraphic
            source={() => {
              const s = useModulationStore.getState()
              return { value: s.random.currentValue, enabled: s.random.enabled }
            }}
          />
        )
      case 'step':
        return <StepGraphic />
      case 'envelope':
        return <EnvelopeGraphic />
      case 'sampleHold':
        return (
          <TraceGraphic
            source={() => {
              const s = useModulationStore.getState()
              return { value: s.sampleHold.currentValue, enabled: s.sampleHold.enabled }
            }}
          />
        )
    }
  }

  return (
    <div
      onClick={onClick}
      data-mod-source={type}
      className={`flex flex-col cursor-pointer relative${active && routed ? ' alive-active' : ''}`}
      onMouseEnter={() => setStatusText(`${label} — Click to select/enable, double-click to disable`)}
      onMouseLeave={() => setStatusText(null)}
      style={{
        width: '80px',
        height: '100%',
        background: selected
          ? 'linear-gradient(to bottom, #1E1E1E, #161616)'
          : 'linear-gradient(to bottom, #1A1A1A, #131313)',
        border: selected ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.06)',
        borderRadius: 4,
        boxShadow: selected
          ? '0 0 10px var(--accent-glow), var(--shadow-panel)'
          : 'var(--shadow-panel)',
        transition: 'all var(--transition-normal)',
        overflow: 'hidden',
      }}
    >
      {/* Graphic area — scrolling telemetry grid when the source is running */}
      <div
        className="flex-1 flex items-center justify-center px-2"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          backgroundImage:
            'repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 7px), linear-gradient(to bottom, rgba(0,0,0,0.15), transparent)',
          animation: active ? 'signal-flow 1.6s linear infinite' : 'none',
          ['--signal-span' as string]: '7px',
        }}
      >
        {renderGraphic()}
      </div>

      {/* Label and assign button */}
      <div className="px-2 py-1 flex items-center justify-between">
        <span
          className="text-[9px] uppercase tracking-widest"
          style={{
            color: active ? 'var(--accent)' : 'var(--text-muted)',
            fontFamily: 'var(--font-sans)',
          }}
        >
          {label}
        </span>

        {/* Assignment mode button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onAssignClick?.()
          }}
          onMouseEnter={(e) => { e.stopPropagation(); setStatusText(getUIStatusText('modAssign')) }}
          onMouseLeave={() => setStatusText(null)}
          className="w-5 h-5 rounded-sm flex items-center justify-center hover:scale-110"
          style={{
            backgroundColor: isAssigning ? 'var(--accent)' : 'transparent',
            boxShadow: isAssigning ? '0 0 8px var(--accent-glow)' : 'none',
            transition: 'all var(--transition-fast)',
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
  // Get modulation state from store
  const {
    lfos,
    selectedLFOIndex,
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

  const lfo = lfos[selectedLFOIndex]

  const { setSelectedEffect } = useUIStore()

  // Live routing state — a source glows when it is enabled AND wired to a param
  const routings = useSequencerStore((s) => s.routings)
  const lfoRouted = routings.some((r) => r.trackId.startsWith('lfo-'))
  const randomRouted = routings.some((r) => r.trackId === 'random')
  const stepRouted = routings.some((r) => r.trackId === 'step')
  const envelopeRouted = routings.some((r) => r.trackId === 'envelope')
  const sampleHoldRouted = routings.some((r) => r.trackId === 'sampleHold')

  // Handle card click - select and enable, or disable if already selected
  const handleCardClick = (type: 'lfo' | 'random' | 'step' | 'envelope' | 'sampleHold') => {
    // Clear effect selection when selecting a modulator
    setSelectedEffect(null)
    // If clicking the already selected one, disable and deselect
    if (selectedModulator === type) {
      switch (type) {
        case 'lfo': if (lfo.enabled) toggleLFO(selectedLFOIndex); break
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
      case 'lfo': if (!lfo.enabled) toggleLFO(selectedLFOIndex); break
      case 'random': if (!random.enabled) toggleRandom(); break
      case 'step': if (!step.enabled) toggleStep(); break
      case 'envelope': if (!envelope.enabled) toggleEnvelope(); break
      case 'sampleHold': if (!sampleHold.enabled) toggleSampleHold(); break
    }
  }

  return (
    <div
      className="h-full flex items-center gap-2 overflow-x-auto"
      style={{
        background: 'linear-gradient(to bottom, #181818, #131313)',
        borderTop: '1px solid var(--border)',
        paddingLeft: 'var(--sidebar-width)',
        paddingRight: 'var(--panel-padding)',
        paddingTop: 'var(--panel-padding)',
        paddingBottom: 'var(--panel-padding)',
      }}
    >
      {/* Modulation cards */}
      <ModulationCard
        type="lfo"
        label={`LFO ${selectedLFOIndex + 1}`}
        active={lfo.enabled}
        routed={lfoRouted}
        selected={selectedModulator === 'lfo'}
        isAssigning={assigningModulator?.startsWith('lfo-') ?? false}
        onClick={() => handleCardClick('lfo')}
        onAssignClick={() => toggleAssignmentMode(`lfo-${selectedLFOIndex}`)}
      />
      <ModulationCard
        type="random"
        label="Random"
        active={random.enabled}
        routed={randomRouted}
        selected={selectedModulator === 'random'}
        isAssigning={assigningModulator === 'random'}
        onClick={() => handleCardClick('random')}
        onAssignClick={() => toggleAssignmentMode('random')}
      />
      <ModulationCard
        type="step"
        label="Step"
        active={step.enabled}
        routed={stepRouted}
        selected={selectedModulator === 'step'}
        isAssigning={assigningModulator === 'step'}
        onClick={() => handleCardClick('step')}
        onAssignClick={() => toggleAssignmentMode('step')}
      />
      <ModulationCard
        type="envelope"
        label="Env"
        active={envelope.enabled}
        routed={envelopeRouted}
        selected={selectedModulator === 'envelope'}
        isAssigning={assigningModulator === 'envelope'}
        onClick={() => handleCardClick('envelope')}
        onAssignClick={() => toggleAssignmentMode('envelope')}
      />
      <ModulationCard
        type="sampleHold"
        label="S&H"
        active={sampleHold.enabled}
        routed={sampleHoldRouted}
        selected={selectedModulator === 'sampleHold'}
        isAssigning={assigningModulator === 'sampleHold'}
        onClick={() => handleCardClick('sampleHold')}
        onAssignClick={() => toggleAssignmentMode('sampleHold')}
      />
    </div>
  )
}
