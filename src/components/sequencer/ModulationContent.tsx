import { useModulationStore, type LFOShape } from '../../stores/modulationStore'
import { useSequencerStore } from '../../stores/sequencerStore'

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
  const normalized = (value - min) / (max - min)
  const display = format ? format(value) : value.toFixed(2)

  return (
    <div className="flex items-center gap-2 py-0.5">
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
  return (
    <div className="flex items-center gap-2 py-0.5">
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
  const isExpanded = selected

  return (
    <div
      className="rounded-sm overflow-hidden"
      style={{
        border: selected ? `1px solid ${color}` : enabled ? `1px solid ${color}40` : '1px solid var(--border)',
        backgroundColor: selected ? `${color}15` : enabled ? `${color}08` : 'transparent',
      }}
    >
      <div
        className="w-full flex items-center gap-2 px-2 py-1.5 cursor-pointer"
        style={{ borderBottom: isExpanded ? '1px solid var(--border)' : 'none' }}
        onClick={onSelect}
      >
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggle()
          }}
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

const LFO_SHAPES: { value: LFOShape; label: string }[] = [
  { value: 'sine', label: 'Sin' },
  { value: 'triangle', label: 'Tri' },
  { value: 'square', label: 'Sqr' },
  { value: 'saw', label: 'Saw' },
  { value: 'random', label: 'Rnd' },
]

export function ModulationPanel() {
  const mod = useModulationStore()
  const { selectedModulator, setSelectedModulator } = useModulationStore()
  const { routings, bpm } = useSequencerStore()

  const lfoRoutings = routings.filter(r => r.trackId === 'lfo').length
  const randomRoutings = routings.filter(r => r.trackId === 'random').length
  const stepRoutings = routings.filter(r => r.trackId === 'step').length
  const envRoutings = routings.filter(r => r.trackId === 'envelope').length
  const sampleHoldRoutings = routings.filter(r => r.trackId === 'sampleHold').length

  const handleSelect = (type: 'lfo' | 'random' | 'step' | 'envelope' | 'sampleHold') => {
    setSelectedModulator(selectedModulator === type ? null : type)
  }

  return (
    <div className="flex flex-col gap-2 p-2">
      <LFOContent
        mod={mod}
        bpm={bpm}
        routingCount={lfoRoutings}
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
type ModStore = ReturnType<typeof useModulationStore>

interface WrappedModProps {
  wrapped?: boolean
  selected?: boolean
  onSelect?: () => void
  routingCount?: number
}

function LFOContent({ mod, bpm, wrapped, selected, onSelect, routingCount }: { mod: ModStore; bpm: number } & WrappedModProps) {
  const color = '#00D4FF'
  const controls = (
    <>
      <ModSelect
        label="Shape"
        value={mod.lfo.shape}
        options={LFO_SHAPES}
        onChange={mod.setLFOShape}
        color={color}
      />
      <ModRateSelect label="Rate" value={mod.lfo.rate} bpm={bpm} onChange={mod.setLFORate} color={color} />
      <ValueBar value={mod.lfo.currentValue} color={color} />
    </>
  )

  if (wrapped) {
    return (
      <ModulatorSection
        title={`LFO${routingCount ? ` → ${routingCount}` : ''}`}
        enabled={mod.lfo.enabled}
        selected={selected ?? false}
        onToggle={mod.toggleLFO}
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
          onMouseLeave={mod.releaseEnvelope}
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
// Filtered modulation content (for unified panel — shows single modulator)
// ════════════════════════════════════════════════════════════════════════════

export type ModulatorId = 'lfo' | 'random' | 'step' | 'envelope' | 'sh'

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
    default:
      return null
  }
}
