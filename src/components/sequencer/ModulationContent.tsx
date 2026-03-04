import { useState, useEffect } from 'react'
import { useModulationStore, type ModulationState, LFO_COUNT } from '../../stores/modulationStore'
import { useSequencerStore } from '../../stores/sequencerStore'
import { useMIDIStore } from '../../stores/midiStore'
import { useAudioReactiveStore } from '../../stores/audioReactiveStore'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { useAcidStore } from '../../stores/acidStore'
import { useStrandStore } from '../../stores/strandStore'
import { useMotionStore } from '../../stores/motionStore'
import { useDestructionStore } from '../../stores/destructionStore'
import { useUIStore } from '../../stores/uiStore'
import { Knob } from '../performance/Knob'
import { getUIStatusText } from '../../config/statusDescriptions'

// ════════════════════════════════════════════════════════════════════════════
// Shared constants & helpers (also used by EffectsLane)
// ════════════════════════════════════════════════════════════════════════════

export const RATE_OPTIONS = [
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

export const divisionToHz = (bpm: number, division: number) => (bpm / 60) * division

export const hzToClosestOption = (hz: number, bpm: number): { label: string; division: number } => {
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

// ════════════════════════════════════════════════════════════════════════════
// Shared UI components
// ════════════════════════════════════════════════════════════════════════════

export function ModSlider({
  label,
  value,
  min,
  max,
  step: _step = 0.01,
  onChange,
  format,
  color,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  format?: (v: number) => string
  color?: string
}) {
  void _step
  const setStatusText = useUIStore((s) => s.setStatusText)
  const normalized = (value - min) / (max - min)
  const display = format ? format(value) : value.toFixed(2)

  return (
    <div
      className="flex items-center gap-2 py-0.5"
      onMouseEnter={() => setStatusText(label ? `${label} — Drag to adjust` : null)}
      onMouseLeave={() => setStatusText(null)}
    >
      <span className="text-[9px] w-12 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <div
        className="flex-1 h-3 rounded-sm relative cursor-pointer"
        style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
          onChange(min + ratio * (max - min))
        }}
      >
        <div
          className="absolute left-0 top-0 bottom-0 rounded-sm"
          style={{
            width: `${normalized * 100}%`,
            backgroundColor: color || 'var(--accent)',
            opacity: 0.5,
          }}
        />
      </div>
      <span className="text-[9px] w-8 text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>
        {display}
      </span>
    </div>
  )
}

export function ModSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  color,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  color?: string
}) {
  const setStatusText = useUIStore((s) => s.setStatusText)
  return (
    <div
      className="flex items-center gap-2 py-0.5"
      onMouseEnter={() => setStatusText(label ? `${label} — Click to change mode` : null)}
      onMouseLeave={() => setStatusText(null)}
    >
      <span className="text-[9px] w-12 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <div className="flex-1 flex gap-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className="flex-1 text-[8px] uppercase tracking-wide py-0.5 rounded-sm transition-colors"
            style={{
              backgroundColor: value === opt.value ? (color || 'var(--accent)') : 'var(--bg-elevated)',
              color: value === opt.value ? 'white' : 'var(--text-muted)',
              border: '1px solid var(--border)',
              opacity: value === opt.value ? 1 : 0.7,
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function ModRateSelect({
  label,
  value,
  bpm,
  onChange,
  color,
}: {
  label: string
  value: number
  bpm: number
  onChange: (hz: number) => void
  color?: string
}) {
  const currentOption = hzToClosestOption(value, bpm)

  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className="text-[9px] w-12 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <select
        value={currentOption.label}
        onChange={(e) => {
          const opt = RATE_OPTIONS.find(o => o.label === e.target.value)
          if (opt) onChange(divisionToHz(bpm, opt.division))
        }}
        className="flex-1 text-[9px] px-1 py-0.5 rounded-sm"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          color: 'var(--text-secondary)',
          accentColor: color,
        }}
      >
        {RATE_OPTIONS.map(opt => (
          <option key={opt.label} value={opt.label}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}

export function ModulatorSection({
  title,
  enabled,
  selected,
  onToggle,
  onSelect,
  color,
  children,
}: {
  title: string
  enabled: boolean
  selected: boolean
  onToggle: () => void
  onSelect: () => void
  color: string
  children: React.ReactNode
}) {
  const setStatusText = useUIStore((s) => s.setStatusText)
  const isExpanded = selected

  return (
    <div
      className="overflow-hidden"
      style={{
        border: selected ? `1px solid ${color}` : enabled ? `1px solid ${color}40` : '1px solid var(--border)',
        backgroundColor: selected ? `${color}15` : enabled ? `${color}08` : 'transparent',
        borderRadius: 12,
      }}
    >
      {/* Accent line */}
      <div style={{ height: 2, backgroundColor: color, opacity: enabled ? 0.5 : 0.15 }} />
      <div
        className="w-full flex items-center gap-2 px-2 py-1.5 cursor-pointer"
        style={{ borderBottom: isExpanded ? '1px solid var(--border)' : 'none' }}
        onClick={onSelect}
        onMouseEnter={() => setStatusText(`${title} — Click to expand/collapse`)}
        onMouseLeave={() => setStatusText(null)}
      >
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggle()
          }}
          onMouseEnter={() => setStatusText(getUIStatusText('modToggle'))}
          onMouseLeave={() => setStatusText(null)}
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{
            backgroundColor: enabled ? color : 'transparent',
            border: enabled ? 'none' : '1px solid var(--text-ghost)',
            boxShadow: enabled ? `0 0 6px ${color}` : 'none',
          }}
        />
        <span
          className="text-[10px] uppercase tracking-widest flex-1"
          style={{ color: enabled ? color : 'var(--text-muted)' }}
        >
          {title}
        </span>
        <span
          className="text-[8px] uppercase"
          style={{ color: enabled ? color : 'var(--text-ghost)' }}
        >
          {enabled ? 'ON' : 'OFF'}
        </span>
      </div>
      {isExpanded && <div className="px-2 py-1.5">{children}</div>}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Value display bar (reused across modulators)
// ════════════════════════════════════════════════════════════════════════════

function ValueBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2 mt-1">
      <span className="text-[8px] uppercase" style={{ color: 'var(--text-ghost)' }}>Value</span>
      <div className="flex-1 h-1 rounded-sm" style={{ backgroundColor: 'var(--bg-elevated)' }}>
        <div
          className="h-full rounded-sm transition-all duration-75"
          style={{
            width: `${value * 100}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Full modulation panel (all 5 modulators stacked)
// ════════════════════════════════════════════════════════════════════════════

// LFO_SHAPES removed — now using continuous tilt/curve morphing

export function ModulationPanel() {
  const mod = useModulationStore()
  const { selectedModulator, setSelectedModulator } = useModulationStore()
  const { routings, bpm } = useSequencerStore()

  const lfoRoutings = routings.filter(r => r.trackId === `lfo-${mod.selectedLFOIndex}`).length
  const totalLfoRoutings = routings.filter(r => r.trackId.startsWith('lfo-')).length
  const randomRoutings = routings.filter(r => r.trackId === 'random').length
  const stepRoutings = routings.filter(r => r.trackId === 'step').length
  const envRoutings = routings.filter(r => r.trackId === 'envelope').length
  const sampleHoldRoutings = routings.filter(r => r.trackId === 'sampleHold').length

  const handleSelect = (type: string) => {
    setSelectedModulator(selectedModulator === type ? null : type)
  }

  return (
    <div className="flex flex-col gap-2 p-2">
      <LFOContent
        mod={mod}
        bpm={bpm}
        routingCount={lfoRoutings}
        totalLfoRoutings={totalLfoRoutings}
        selected={selectedModulator === 'lfo'}
        onSelect={() => handleSelect('lfo')}
        wrapped
      />
      <RandomContent
        mod={mod}
        bpm={bpm}
        routingCount={randomRoutings}
        selected={selectedModulator === 'random'}
        onSelect={() => handleSelect('random')}
        wrapped
      />
      <StepContent
        mod={mod}
        bpm={bpm}
        routingCount={stepRoutings}
        selected={selectedModulator === 'step'}
        onSelect={() => handleSelect('step')}
        wrapped
      />
      <EnvelopeContent
        mod={mod}
        routingCount={envRoutings}
        selected={selectedModulator === 'envelope'}
        onSelect={() => handleSelect('envelope')}
        wrapped
      />
      <SampleHoldContent
        mod={mod}
        bpm={bpm}
        routingCount={sampleHoldRoutings}
        selected={selectedModulator === 'sampleHold'}
        onSelect={() => handleSelect('sampleHold')}
        wrapped
      />
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Individual modulator content components
// ════════════════════════════════════════════════════════════════════════════

// Common modulator store type
type ModStore = ModulationState

interface WrappedModProps {
  wrapped?: boolean
  selected?: boolean
  onSelect?: () => void
  routingCount?: number
}

function LFOSelectorRow({ mod }: { mod: ModStore }) {
  const idx = mod.selectedLFOIndex
  return (
    <div className="flex gap-1 mb-1">
      {Array.from({ length: LFO_COUNT }, (_, i) => (
        <button
          key={i}
          onClick={(e) => { e.stopPropagation(); mod.setSelectedLFOIndex(i) }}
          className="flex-1 flex items-center justify-center gap-0.5 rounded-sm transition-all"
          style={{
            height: 18,
            backgroundColor: i === idx ? 'var(--accent-subtle)' : 'transparent',
            border: `1px solid ${i === idx ? 'var(--accent)' : 'var(--border)'}`,
            cursor: 'pointer',
          }}
        >
          <span
            className="w-1 h-1 rounded-full"
            style={{
              backgroundColor: mod.lfos[i].enabled ? '#707070' : 'var(--text-ghost)',
              boxShadow: mod.lfos[i].enabled ? '0 0 3px #707070' : 'none',
            }}
          />
          <span
            className="text-[8px] font-semibold"
            style={{ color: i === idx ? 'var(--text-primary)' : 'var(--text-muted)' }}
          >
            {i + 1}
          </span>
        </button>
      ))}
    </div>
  )
}

function LFOContent({ mod, bpm, wrapped, selected, onSelect, routingCount: _routingCount, totalLfoRoutings }: { mod: ModStore; bpm: number; totalLfoRoutings?: number } & WrappedModProps) {
  void _routingCount
  const color = '#707070'
  const idx = mod.selectedLFOIndex
  const lfo = mod.lfos[idx]
  const controls = (
    <>
      <LFOSelectorRow mod={mod} />
      <ModSlider label="Tilt" value={lfo.tilt} min={-1} max={1} onChange={(v) => mod.setLFOTilt(idx, v)} format={(v) => v.toFixed(2)} color={color} />
      <ModSlider label="Curve" value={lfo.curve} min={-1} max={1} onChange={(v) => mod.setLFOCurve(idx, v)} format={(v) => v.toFixed(2)} color={color} />
      <ModRateSelect label="Rate" value={lfo.rate} bpm={bpm} onChange={(rate) => mod.setLFORate(idx, rate)} color={color} />
      <ValueBar value={lfo.currentValue} color={color} />
    </>
  )

  if (wrapped) {
    const routingLabel = totalLfoRoutings ? ` → ${totalLfoRoutings}` : ''
    return (
      <ModulatorSection
        title={`LFO ${idx + 1}${routingLabel}`}
        enabled={lfo.enabled}
        selected={selected ?? false}
        onToggle={() => mod.toggleLFO(idx)}
        onSelect={onSelect ?? (() => {})}
        color={color}
      >
        {controls}
      </ModulatorSection>
    )
  }
  return <div className="p-2">{controls}</div>
}

function RandomContent({ mod, bpm, wrapped, selected, onSelect, routingCount }: { mod: ModStore; bpm: number } & WrappedModProps) {
  const color = '#FF6B6B'
  const controls = (
    <>
      <ModRateSelect label="Rate" value={mod.random.rate} bpm={bpm} onChange={mod.setRandomRate} color={color} />
      <ModSlider
        label="Smooth"
        value={mod.random.smoothing}
        min={0} max={1} step={0.01}
        onChange={mod.setRandomSmoothing}
        format={(v) => `${Math.round(v * 100)}%`}
        color={color}
      />
      <ValueBar value={mod.random.currentValue} color={color} />
    </>
  )

  if (wrapped) {
    return (
      <ModulatorSection
        title={`Random${routingCount ? ` → ${routingCount}` : ''}`}
        enabled={mod.random.enabled}
        selected={selected ?? false}
        onToggle={mod.toggleRandom}
        onSelect={onSelect ?? (() => {})}
        color={color}
      >
        {controls}
      </ModulatorSection>
    )
  }
  return <div className="p-2">{controls}</div>
}

function StepContent({ mod, bpm, wrapped, selected, onSelect, routingCount }: { mod: ModStore; bpm: number } & WrappedModProps) {
  const color = '#4ECDC4'
  const controls = (
    <>
      <ModRateSelect label="Rate" value={mod.step.rate} bpm={bpm} onChange={mod.setStepRate} color={color} />
      <div className="flex gap-[2px] mt-1 mb-1">
        {mod.step.steps.map((val, i) => (
          <div
            key={i}
            className="flex-1 flex flex-col items-center cursor-pointer"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const ratio = 1 - Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
              mod.setStepValue(i, ratio)
            }}
          >
            <div
              className="w-full h-8 rounded-sm relative"
              style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
            >
              <div
                className="absolute bottom-0 left-0 right-0 rounded-sm transition-all"
                style={{
                  height: `${val * 100}%`,
                  backgroundColor: mod.step.currentStep === i ? color : `${color}80`,
                }}
              />
            </div>
            <span
              className="text-[7px] mt-0.5"
              style={{ color: mod.step.currentStep === i ? color : 'var(--text-ghost)' }}
            >
              {i + 1}
            </span>
          </div>
        ))}
      </div>
    </>
  )

  if (wrapped) {
    return (
      <ModulatorSection
        title={`Step${routingCount ? ` → ${routingCount}` : ''}`}
        enabled={mod.step.enabled}
        selected={selected ?? false}
        onToggle={mod.toggleStep}
        onSelect={onSelect ?? (() => {})}
        color={color}
      >
        {controls}
      </ModulatorSection>
    )
  }
  return <div className="p-2">{controls}</div>
}

function EnvelopeContent({ mod, wrapped, selected, onSelect, routingCount }: { mod: ModStore } & WrappedModProps) {
  const color = '#AA55FF'
  const controls = (
    <>
      <ModSlider label="Attack" value={mod.envelope.attack} min={0} max={2} step={0.01} onChange={(v) => mod.setEnvelopeParams({ attack: v })} format={(v) => `${(v * 1000).toFixed(0)}ms`} color={color} />
      <ModSlider label="Decay" value={mod.envelope.decay} min={0} max={2} step={0.01} onChange={(v) => mod.setEnvelopeParams({ decay: v })} format={(v) => `${(v * 1000).toFixed(0)}ms`} color={color} />
      <ModSlider label="Sustain" value={mod.envelope.sustain} min={0} max={1} step={0.01} onChange={(v) => mod.setEnvelopeParams({ sustain: v })} format={(v) => `${Math.round(v * 100)}%`} color={color} />
      <ModSlider label="Release" value={mod.envelope.release} min={0} max={2} step={0.01} onChange={(v) => mod.setEnvelopeParams({ release: v })} format={(v) => `${(v * 1000).toFixed(0)}ms`} color={color} />
      <div className="flex items-center gap-2 mt-1">
        <button
          onMouseDown={mod.triggerEnvelope}
          onMouseUp={mod.releaseEnvelope}
          onMouseEnter={() => { const st = useUIStore.getState().setStatusText; st(getUIStatusText('modTrigger')) }}
          onMouseLeave={() => { mod.releaseEnvelope(); useUIStore.getState().setStatusText(null) }}
          className="flex-1 text-[8px] uppercase py-1 rounded-sm"
          style={{
            backgroundColor: mod.envelope.phase !== 'idle' ? color : 'var(--bg-elevated)',
            color: mod.envelope.phase !== 'idle' ? 'white' : 'var(--text-muted)',
            border: '1px solid var(--border)',
          }}
        >
          {mod.envelope.phase === 'idle' ? 'Trigger' : mod.envelope.phase.toUpperCase()}
        </button>
      </div>
      <ValueBar value={mod.envelope.currentValue} color={color} />
    </>
  )

  if (wrapped) {
    return (
      <ModulatorSection
        title={`Envelope${routingCount ? ` → ${routingCount}` : ''}`}
        enabled={mod.envelope.enabled}
        selected={selected ?? false}
        onToggle={mod.toggleEnvelope}
        onSelect={onSelect ?? (() => {})}
        color={color}
      >
        {controls}
      </ModulatorSection>
    )
  }
  return <div className="p-2">{controls}</div>
}

function SampleHoldContent({ mod, bpm, wrapped, selected, onSelect, routingCount }: { mod: ModStore; bpm: number } & WrappedModProps) {
  const color = '#AAFF00'
  const controls = (
    <>
      <ModSlider label="Input" value={mod.sampleHold.input} min={0} max={1} step={0.01} onChange={mod.setSampleHoldInput} format={(v) => `${Math.round(v * 100)}%`} color={color} />
      <ModSlider label="Smooth" value={mod.sampleHold.smoothing} min={0} max={1} step={0.01} onChange={mod.setSampleHoldSmoothing} format={(v) => `${Math.round(v * 100)}%`} color={color} />
      <div className="flex items-center gap-2 py-0.5">
        <span className="text-[9px] w-12 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Mode</span>
        <div className="flex-1 flex gap-1">
          {(['metronomic', 'free', 'hold'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => mod.setSampleHoldRateMode(mode)}
              className="flex-1 text-[8px] uppercase tracking-wide py-0.5 rounded-sm transition-colors"
              style={{
                backgroundColor: mod.sampleHold.rateMode === mode ? color : 'var(--bg-elevated)',
                color: mod.sampleHold.rateMode === mode ? 'white' : 'var(--text-muted)',
                border: '1px solid var(--border)',
                opacity: mod.sampleHold.rateMode === mode ? 1 : 0.7,
              }}
            >
              {mode === 'metronomic' ? 'Sync' : mode}
            </button>
          ))}
        </div>
      </div>
      {mod.sampleHold.rateMode === 'metronomic' && (
        <ModRateSelect label="Rate" value={mod.sampleHold.rateDivision * (bpm / 60)} bpm={bpm} onChange={(hz) => mod.setSampleHoldRateDivision(hz / (bpm / 60))} color={color} />
      )}
      {mod.sampleHold.rateMode === 'free' && (
        <ModSlider label="Rate" value={mod.sampleHold.rateHz} min={0.1} max={50} step={0.1} onChange={mod.setSampleHoldRateHz} format={(v) => `${v.toFixed(1)}Hz`} color={color} />
      )}
      {mod.sampleHold.rateMode !== 'hold' && (
        <ModSlider label="Scale" value={mod.sampleHold.rateScale} min={0.02} max={50} step={0.01} onChange={mod.setSampleHoldRateScale} format={(v) => `${(v * 100).toFixed(0)}%`} color={color} />
      )}
      <div className="flex items-center gap-2 py-0.5">
        <span className="text-[9px] w-12 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Clock</span>
        <div className="flex-1 flex gap-1">
          {(['free', 'gate', 'sync'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => mod.setSampleHoldClockMode(mode)}
              className="flex-1 text-[8px] uppercase tracking-wide py-0.5 rounded-sm transition-colors"
              style={{
                backgroundColor: mod.sampleHold.clockMode === mode ? color : 'var(--bg-elevated)',
                color: mod.sampleHold.clockMode === mode ? 'white' : 'var(--text-muted)',
                border: '1px solid var(--border)',
                opacity: mod.sampleHold.clockMode === mode ? 1 : 0.7,
              }}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>
      <ValueBar value={mod.sampleHold.currentValue} color={color} />
    </>
  )

  if (wrapped) {
    return (
      <ModulatorSection
        title={`S&H${routingCount ? ` → ${routingCount}` : ''}`}
        enabled={mod.sampleHold.enabled}
        selected={selected ?? false}
        onToggle={mod.toggleSampleHold}
        onSelect={onSelect ?? (() => {})}
        color={color}
      >
        {controls}
      </ModulatorSection>
    )
  }
  return <div className="p-2">{controls}</div>
}

// ════════════════════════════════════════════════════════════════════════════
// MIDI CC modulation content
// ════════════════════════════════════════════════════════════════════════════

function MIDIModContent() {
  const color = '#00AAFF'
  const setStatusText = useUIStore((s) => s.setStatusText)
  const {
    isSupported,
    isConnected,
    inputs,
    selectedInputId,
    ccValues,
    setSelectedInput,
  } = useMIDIStore()

  const { setAssigningModulator } = useModulationStore()
  const { routings, removeRouting, updateRoutingDepth } = useSequencerStore()

  const [learnCC, setLearnCC] = useState<number | null>(null)
  const [isLearning, setIsLearning] = useState(false)

  // CC learn: watch for incoming CC
  useEffect(() => {
    if (!isLearning) return
    let prevCCValues = { ...useMIDIStore.getState().ccValues }
    const unsubscribe = useMIDIStore.subscribe((state) => {
      for (const [ccStr, val] of Object.entries(state.ccValues)) {
        const prevVal = prevCCValues[parseInt(ccStr)] ?? 0
        if (val !== prevVal && val > 0) {
          setLearnCC(parseInt(ccStr))
          setIsLearning(false)
          break
        }
      }
      prevCCValues = { ...state.ccValues }
    })
    return () => unsubscribe()
  }, [isLearning])

  // MIDI CC routings
  const midiRoutings = routings.filter((r) => r.trackId.startsWith('midi-cc-'))

  if (!isSupported) {
    return (
      <div className="p-2 text-[9px] uppercase" style={{ color: 'var(--text-ghost)' }}>
        Web MIDI not supported in this browser
      </div>
    )
  }

  const activeName = inputs.find((i) => i.id === selectedInputId)?.name
    ?? (inputs.length > 0 ? inputs[0].name : null)

  return (
    <div className="flex flex-col gap-2">
      {/* Connection status */}
      <div className="flex items-center gap-2">
        <div
          className="w-2 h-2 rounded-full"
          style={{
            backgroundColor: isConnected && inputs.length > 0 ? color : 'var(--text-ghost)',
            boxShadow: isConnected && inputs.length > 0 ? `0 0 4px ${color}` : 'none',
          }}
        />
        <span className="text-[9px] uppercase" style={{ color: 'var(--text-secondary)' }}>
          {isConnected && inputs.length > 0 ? activeName ?? 'Connected' : 'No device'}
        </span>
      </div>

      {/* Input selector */}
      {inputs.length > 1 && (
        <select
          value={selectedInputId ?? ''}
          onChange={(e) => setSelectedInput(e.target.value || null)}
          className="text-[9px] px-1 py-0.5 rounded-sm"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
          }}
        >
          <option value="">All inputs</option>
          {inputs.map((input) => (
            <option key={input.id} value={input.id}>
              {input.name}
            </option>
          ))}
        </select>
      )}

      {/* Learn CC */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            if (isLearning) {
              setIsLearning(false)
            } else {
              setIsLearning(true)
              setLearnCC(null)
            }
          }}
          onMouseEnter={() => setStatusText(getUIStatusText('modLearnCC'))}
          onMouseLeave={() => setStatusText(null)}
          className="text-[8px] uppercase px-2 py-1 rounded-sm"
          style={{
            backgroundColor: isLearning ? color : 'var(--bg-elevated)',
            color: isLearning ? 'white' : 'var(--text-muted)',
            border: '1px solid var(--border)',
          }}
        >
          {isLearning ? 'Turn a knob...' : 'Learn CC'}
        </button>
        {learnCC !== null && (
          <span className="text-[9px]" style={{ color }}>
            CC {learnCC}
          </span>
        )}
        {learnCC !== null && (
          <button
            onClick={() => {
              const trackId = `midi-cc-${learnCC}`
              // Clear modulator assignment, enter track assignment mode for this CC
              setAssigningModulator(null)
              useSequencerStore.getState().setAssigningTrack(trackId)
            }}
            onMouseEnter={() => setStatusText(getUIStatusText('modAssignCC'))}
            onMouseLeave={() => setStatusText(null)}
            className="text-[8px] uppercase px-2 py-1 rounded-sm"
            style={{
              backgroundColor: `${color}20`,
              color,
              border: `1px solid ${color}40`,
            }}
          >
            Assign
          </button>
        )}
      </div>

      {/* Active routings */}
      {midiRoutings.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-[8px] uppercase" style={{ color: 'var(--text-ghost)' }}>
            CC Routings
          </span>
          {midiRoutings.map((routing) => {
            const ccNum = parseInt(routing.trackId.split('-')[2])
            return (
              <div key={`${routing.trackId}-${routing.targetParam}`} className="flex items-center gap-2">
                <span className="text-[8px] w-8" style={{ color }}>CC{ccNum}</span>
                <span className="text-[8px] flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>
                  {routing.targetParam}
                </span>
                <ModSlider
                  label=""
                  value={routing.depth}
                  min={0}
                  max={1}
                  step={0.01}
                  onChange={(v) => updateRoutingDepth(routing.id, v)}
                  color={color}
                />
                <button
                  onClick={() => removeRouting(routing.id)}
                  onMouseEnter={() => setStatusText('Remove — Delete this MIDI CC routing')}
                  onMouseLeave={() => setStatusText(null)}
                  className="text-[8px] px-1"
                  style={{ color: 'var(--text-ghost)' }}
                >
                  x
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* CC monitor */}
      <div className="flex flex-col gap-0.5">
        <span className="text-[8px] uppercase" style={{ color: 'var(--text-ghost)' }}>
          CC Monitor
        </span>
        <div className="flex flex-wrap gap-1">
          {Object.entries(ccValues)
            .filter(([_, v]) => v > 0)
            .slice(0, 12)
            .map(([cc, val]) => (
              <div
                key={cc}
                className="text-[7px] px-1 py-0.5 rounded-sm"
                style={{
                  backgroundColor: `${color}15`,
                  color,
                  border: `1px solid ${color}30`,
                }}
              >
                {cc}:{val}
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Audio reactive modulation content
// ════════════════════════════════════════════════════════════════════════════

const AUDIO_BANDS = [
  { key: 'sub' as const, label: 'Sub', color: '#FF3333', trackId: 'audio-sub' },
  { key: 'mid' as const, label: 'Mid', color: '#FF8800', trackId: 'audio-mid' },
  { key: 'high' as const, label: 'High', color: '#33CCFF', trackId: 'audio-high' },
  { key: 'hit' as const, label: 'Hit', color: '#FF00FF', trackId: 'audio-hit' },
]

// Best param per effect for each band type (sub=bass/movement, mid=color/texture, high=detail/sparkle, hit=transient/flash)
const BAND_PARAMS: Record<string, Record<string, string>> = {
  'audio-sub': {
    block_displace: 'displaceDistance', static_displace: 'intensity', feedback: 'decay', lens: 'curvature',
    pixelate: 'pixelSize', acid_ripple: 'amplitude', acid_cloud: 'density', strand_voidout: 'distortAmount',
    strand_tar: 'spreadSpeed', strand_seam: 'riftWidth', echo_trail: 'offset', time_smear: 'accumulation',
    datamosh: 'intensity', sonify: 'drive', acid_hex: 'cellSize', acid_decomp: 'threshold',
    strand_handprints: 'density', strand_timefall: 'intensity', strand_extinction: 'coverage',
    motion_extract: 'amplify', freeze_mask: 'freezeThreshold',
  },
  'audio-mid': {
    chromatic: 'intensity', vhs: 'tearIntensity', dither: 'intensity', color_grade: 'saturation',
    noise: 'amount', acid_contour: 'levels', acid_voronoi: 'cellCount', strand_chiralium: 'shimmer',
    strand_cloud: 'density', strand_dooms: 'sensitivity', acid_halftone: 'contrast', acid_slit: 'speed',
    acid_scan: 'trail', acid_dots: 'dotScale', strand_web: 'glowIntensity', strand_bbpod: 'tintStrength',
    echo_trail: 'decay', pixelSort: 'intensity', sonify: 'filterCutoff',
    strand_beach: 'grainAmount', strand_bridge: 'opacity',
  },
  'audio-high': {
    scan_lines: 'lineFlicker', posterize: 'edgeContrast', edges: 'threshold', chromatic: 'radialAmount',
    noise: 'amount', acid_glyph: 'density', acid_led: 'brightness', strand_odradek: 'pingIntensity',
    acid_thgrid: 'threshold', acid_ripple: 'frequency', acid_scan: 'speed', strand_chiralium: 'density',
    acid_halftone: 'dotSize', acid_slice: 'offset', strand_umbilical: 'pulseSpeed',
    strand_path: 'flowSpeed', strand_beach: 'flickerSpeed', datamosh: 'chaos',
    pixelSort: 'randomness', sonify: 'bitDepth',
  },
  'audio-hit': {
    rgb_split: 'amount', block_displace: 'displaceChance', static_displace: 'intensity',
    vhs: 'headSwitchNoise', feedback: 'zoom', acid_mirror: 'segments', strand_voidout: 'speed',
    acid_icons: 'rotation', acid_ripple: 'amplitude', strand_dooms: 'haloSize',
    strand_odradek: 'sweepSpeed', strand_extinction: 'erosionSpeed', datamosh: 'feedback',
    pixelSort: 'streakLength', sonify: 'byteOffset', motion_extract: 'threshold',
    echo_trail: 'hueAmount', acid_hex: 'rotation',
  },
}

function getActiveEffectIds(): Set<string> {
  const ids = new Set<string>()
  const g = useGlitchEngineStore.getState()
  if (g.rgbSplitEnabled) ids.add('rgb_split')
  if (g.blockDisplaceEnabled) ids.add('block_displace')
  if (g.scanLinesEnabled) ids.add('scan_lines')
  if (g.noiseEnabled) ids.add('noise')
  if (g.pixelateEnabled) ids.add('pixelate')
  if (g.edgeDetectionEnabled) ids.add('edges')
  if (g.chromaticAberrationEnabled) ids.add('chromatic')
  if (g.vhsTrackingEnabled) ids.add('vhs')
  if (g.lensDistortionEnabled) ids.add('lens')
  if (g.ditherEnabled) ids.add('dither')
  if (g.posterizeEnabled) ids.add('posterize')
  if (g.staticDisplacementEnabled) ids.add('static_displace')
  if (g.colorGradeEnabled) ids.add('color_grade')
  if (g.feedbackLoopEnabled) ids.add('feedback')
  const a = useAcidStore.getState()
  if (a.dotsEnabled) ids.add('acid_dots')
  if (a.glyphEnabled) ids.add('acid_glyph')
  if (a.iconsEnabled) ids.add('acid_icons')
  if (a.contourEnabled) ids.add('acid_contour')
  if (a.decompEnabled) ids.add('acid_decomp')
  if (a.mirrorEnabled) ids.add('acid_mirror')
  if (a.sliceEnabled) ids.add('acid_slice')
  if (a.thGridEnabled) ids.add('acid_thgrid')
  if (a.cloudEnabled) ids.add('acid_cloud')
  if (a.ledEnabled) ids.add('acid_led')
  if (a.slitEnabled) ids.add('acid_slit')
  if (a.voronoiEnabled) ids.add('acid_voronoi')
  if (a.halftoneEnabled) ids.add('acid_halftone')
  if (a.hexEnabled) ids.add('acid_hex')
  if (a.scanEnabled) ids.add('acid_scan')
  if (a.rippleEnabled) ids.add('acid_ripple')
  const s = useStrandStore.getState()
  if (s.handprintsEnabled) ids.add('strand_handprints')
  if (s.tarSpreadEnabled) ids.add('strand_tar')
  if (s.timefallEnabled) ids.add('strand_timefall')
  if (s.voidOutEnabled) ids.add('strand_voidout')
  if (s.strandWebEnabled) ids.add('strand_web')
  if (s.bridgeLinkEnabled) ids.add('strand_bridge')
  if (s.chiralPathEnabled) ids.add('strand_path')
  if (s.umbilicalEnabled) ids.add('strand_umbilical')
  if (s.odradekEnabled) ids.add('strand_odradek')
  if (s.chiraliumEnabled) ids.add('strand_chiralium')
  if (s.beachStaticEnabled) ids.add('strand_beach')
  if (s.doomsEnabled) ids.add('strand_dooms')
  if (s.chiralCloudEnabled) ids.add('strand_cloud')
  if (s.bbPodEnabled) ids.add('strand_bbpod')
  if (s.seamEnabled) ids.add('strand_seam')
  if (s.extinctionEnabled) ids.add('strand_extinction')
  const m = useMotionStore.getState()
  if (m.motionExtractEnabled) ids.add('motion_extract')
  if (m.echoTrailEnabled) ids.add('echo_trail')
  if (m.timeSmearEnabled) ids.add('time_smear')
  if (m.freezeMaskEnabled) ids.add('freeze_mask')
  const d = useDestructionStore.getState()
  if (d.datamoshEnabled) ids.add('datamosh')
  if (d.pixelSortEnabled) ids.add('pixelSort')
  if (d.sonifyEnabled) ids.add('sonify')
  return ids
}

function AudioReactiveContent() {
  const color = '#FF3333'
  const setStatusText = useUIStore((s) => s.setStatusText)
  const ar = useAudioReactiveStore()
  const { routings, addRouting, removeRouting, updateRoutingDepth } = useSequencerStore()
  const { setAssigningModulator } = useModulationStore()
  const [assigningBand, setAssigningBand] = useState<string | null>(null)

  const audioRoutings = routings.filter(r => r.trackId.startsWith('audio-'))

  const handleAssign = (trackId: string) => {
    if (assigningBand === trackId) {
      // Cancel assignment
      setAssigningBand(null)
      useSequencerStore.getState().setAssigningTrack(null)
    } else {
      // Enter assignment mode for this band
      setAssigningBand(trackId)
      setAssigningModulator(null)
      useSequencerStore.getState().setAssigningTrack(trackId)
      // Auto-enable
      if (!ar.enabled) ar.setEnabled(true)
    }
  }

  const handleAutoRoute = () => {
    // Auto-enable
    if (!ar.enabled) ar.setEnabled(true)

    const activeIds = getActiveEffectIds()
    const existingTargets = new Set(audioRoutings.map(r => r.targetParam))

    for (const [trackId, paramMap] of Object.entries(BAND_PARAMS)) {
      // Skip if this band already has a routing
      if (audioRoutings.some(r => r.trackId === trackId)) continue

      // Find first active effect that has a param mapping for this band
      for (const [effectId, paramName] of Object.entries(paramMap)) {
        if (activeIds.has(effectId)) {
          const target = `${effectId}.${paramName}`
          if (!existingTargets.has(target)) {
            addRouting(trackId, target, 0.7)
            existingTargets.add(target)
            break
          }
        }
      }
    }
  }

  const handleClearAll = () => {
    for (const r of audioRoutings) {
      removeRouting(r.id)
    }
  }

  // Cancel assignment mode when switching away
  useEffect(() => {
    return () => {
      if (assigningBand) {
        useSequencerStore.getState().setAssigningTrack(null)
      }
    }
  }, [assigningBand])

  return (
    <div className="flex flex-col gap-2">
      {/* Enable toggle + auto-route */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => ar.toggleEnabled()}
          onMouseEnter={() => setStatusText(getUIStatusText('modToggle'))}
          onMouseLeave={() => setStatusText(null)}
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{
            backgroundColor: ar.enabled ? color : 'transparent',
            border: ar.enabled ? 'none' : '1px solid var(--text-ghost)',
            boxShadow: ar.enabled ? `0 0 6px ${color}` : 'none',
          }}
        />
        <span
          className="text-[10px] uppercase tracking-widest flex-1"
          style={{ color: ar.enabled ? color : 'var(--text-muted)' }}
        >
          Audio Reactive
        </span>
        <span
          className="text-[8px] uppercase"
          style={{ color: ar.enabled ? color : 'var(--text-ghost)' }}
        >
          {ar.enabled ? 'ON' : 'OFF'}
        </span>
      </div>

      {/* Band meters with assign buttons */}
      <div className="flex gap-2">
        {AUDIO_BANDS.map((band) => {
          const value = ar[band.key]
          const bandRoutings = routings.filter(r => r.trackId === band.trackId)
          const isAssigning = assigningBand === band.trackId
          return (
            <div key={band.key} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[8px] uppercase tracking-wide" style={{ color: band.color }}>
                {band.label}
              </span>
              <div
                className="w-full h-16 rounded-sm relative"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: isAssigning ? `1px solid ${band.color}` : '1px solid var(--border)',
                  boxShadow: isAssigning ? `0 0 6px ${band.color}40` : 'none',
                }}
              >
                <div
                  className="absolute bottom-0 left-0 right-0 rounded-sm transition-all duration-75"
                  style={{
                    height: `${value * 100}%`,
                    backgroundColor: band.color,
                    opacity: 0.7,
                  }}
                />
              </div>
              {/* Assign button */}
              <button
                onClick={() => handleAssign(band.trackId)}
                onMouseEnter={() => setStatusText(`${band.label} — ${isAssigning ? 'Click a knob to route' : 'Click to assign to effect parameters'}`)}
                onMouseLeave={() => setStatusText(null)}
                className="w-full text-[7px] uppercase py-0.5 rounded-sm"
                style={{
                  backgroundColor: isAssigning ? band.color : `${band.color}15`,
                  color: isAssigning ? 'white' : band.color,
                  border: `1px solid ${band.color}40`,
                }}
              >
                {isAssigning ? 'Click knob...' : bandRoutings.length > 0 ? `${bandRoutings.length}` : 'Assign'}
              </button>
            </div>
          )
        })}
      </div>

      {/* Auto-Route + Clear */}
      <div className="flex gap-1">
        <button
          onClick={handleAutoRoute}
          onMouseEnter={() => setStatusText(getUIStatusText('modAutoRoute'))}
          onMouseLeave={() => setStatusText(null)}
          className="flex-1 text-[8px] uppercase font-semibold py-1 rounded-sm"
          style={{
            backgroundColor: `${color}20`,
            color,
            border: `1px solid ${color}40`,
          }}
        >
          Auto-Route
        </button>
        {audioRoutings.length > 0 && (
          <button
            onClick={handleClearAll}
            onMouseEnter={() => setStatusText(getUIStatusText('modClearRouting'))}
            onMouseLeave={() => setStatusText(null)}
            className="text-[8px] uppercase py-1 px-2 rounded-sm"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border)',
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Active routings */}
      {audioRoutings.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-[8px] uppercase" style={{ color: 'var(--text-ghost)' }}>
            Routings
          </span>
          {audioRoutings.map((routing) => {
            const band = AUDIO_BANDS.find(b => b.trackId === routing.trackId)
            return (
              <div key={routing.id} className="flex items-center gap-1">
                <span
                  className="text-[7px] uppercase w-6 flex-shrink-0 text-center rounded-sm py-0.5"
                  style={{ backgroundColor: `${band?.color || color}20`, color: band?.color || color }}
                >
                  {band?.label || '?'}
                </span>
                <span className="text-[8px] flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>
                  {routing.targetParam}
                </span>
                <div className="w-16 flex-shrink-0">
                  <ModSlider
                    label=""
                    value={routing.depth}
                    min={0} max={1} step={0.01}
                    onChange={(v) => updateRoutingDepth(routing.id, v)}
                    color={band?.color || color}
                  />
                </div>
                <button
                  onClick={() => removeRouting(routing.id)}
                  onMouseEnter={() => setStatusText('Remove — Delete this audio routing')}
                  onMouseLeave={() => setStatusText(null)}
                  className="text-[8px] px-1 flex-shrink-0"
                  style={{ color: 'var(--text-ghost)' }}
                >
                  x
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Auto/Manual toggle + config sliders */}
      <div className="border-t pt-2 mt-1" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 mb-1 px-1">
          <button
            onClick={() => ar.setAutoMode(!ar.autoMode)}
            className="text-[8px] uppercase font-semibold py-0.5 px-2 rounded-sm"
            style={{
              backgroundColor: ar.autoMode ? `${color}30` : 'transparent',
              color: ar.autoMode ? color : 'var(--text-ghost)',
              border: `1px solid ${ar.autoMode ? `${color}50` : 'var(--border)'}`,
            }}
          >
            {ar.autoMode ? 'Auto' : 'Manual'}
          </button>
          <span className="text-[7px] uppercase" style={{ color: 'var(--text-ghost)' }}>
            {ar.autoMode ? 'Adaptive gain' : 'Fixed gain'}
          </span>
        </div>

        {ar.autoMode ? (
          <>
            <Knob
              label="SENS"
              value={ar.sensitivity}
              min={0} max={1} step={0.01}
              size="xs"
              showArc
              showValue
              color={color}
              onChange={ar.setSensitivity}
              formatValue={(v) => `${(v * 100).toFixed(0)}%`}
            />
            <ModSlider
              label="Attack"
              value={ar.attackMs}
              min={1} max={50} step={1}
              onChange={ar.setAttackMs}
              format={(v) => `${v.toFixed(0)}ms`}
              color={color}
            />
            <ModSlider
              label="Release"
              value={ar.releaseMs}
              min={50} max={2000} step={10}
              onChange={ar.setReleaseMs}
              format={(v) => `${v.toFixed(0)}ms`}
              color={color}
            />
          </>
        ) : (
          <>
            <ModSlider
              label="Gain"
              value={ar.gain}
              min={0.1} max={10} step={0.1}
              onChange={ar.setGain}
              format={(v) => `${v.toFixed(1)}x`}
              color={color}
            />
            <ModSlider
              label="Attack"
              value={ar.attackMs}
              min={1} max={50} step={1}
              onChange={ar.setAttackMs}
              format={(v) => `${v.toFixed(0)}ms`}
              color={color}
            />
            <ModSlider
              label="Release"
              value={ar.releaseMs}
              min={50} max={2000} step={10}
              onChange={ar.setReleaseMs}
              format={(v) => `${v.toFixed(0)}ms`}
              color={color}
            />
            <ModSlider
              label="Curve"
              value={ar.curve}
              min={0.5} max={4} step={0.1}
              onChange={ar.setCurve}
              format={(v) => `${v.toFixed(1)}`}
              color={color}
            />
            <ModSlider
              label="Thresh"
              value={ar.transientThreshold}
              min={0} max={1} step={0.01}
              onChange={ar.setTransientThreshold}
              format={(v) => `${(v * 100).toFixed(0)}%`}
              color="#FF00FF"
            />
            <ModSlider
              label="Decay"
              value={ar.transientDecay}
              min={0.01} max={0.5} step={0.01}
              onChange={ar.setTransientDecay}
              format={(v) => `${v.toFixed(2)}`}
              color="#FF00FF"
            />
          </>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// Filtered modulation content (for unified panel — shows single modulator)
// ════════════════════════════════════════════════════════════════════════════

export type ModulatorId = 'lfo' | 'random' | 'step' | 'envelope' | 'sh' | 'midi' | 'audio'

interface ModulationContentProps {
  activeModulator: ModulatorId
}

export function ModulationContent({ activeModulator }: ModulationContentProps) {
  const mod = useModulationStore()
  const { bpm } = useSequencerStore()

  switch (activeModulator) {
    case 'lfo':
      return <LFOContent mod={mod} bpm={bpm} />
    case 'random':
      return <RandomContent mod={mod} bpm={bpm} />
    case 'step':
      return <StepContent mod={mod} bpm={bpm} />
    case 'envelope':
      return <EnvelopeContent mod={mod} />
    case 'sh':
      return <SampleHoldContent mod={mod} bpm={bpm} />
    case 'midi':
      return <MIDIModContent />
    case 'audio':
      return <AudioReactiveContent />
    default:
      return null
  }
}
