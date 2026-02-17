import { useModulationStore, type LFOShape } from '../../stores/modulationStore'
import { useSequencerStore } from '../../stores/sequencerStore'

// ════════════════════════════════════════════════════════════════════════════
// MODULATION PARAMETER CONTROLS
// ════════════════════════════════════════════════════════════════════════════

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

function ModSlider({
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
  void _step // Used for future snap-to-step functionality
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

function ModSelect<T extends string>({
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

function ModRateSelect({
  label,
  value,
  bpm,
  onChange,
  color,
}: {
  label: string
  value: number // Hz
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

function ModulatorSection({
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
        {/* Enable/disable toggle */}
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

function ModulationPanel() {
  const mod = useModulationStore()
  const { selectedModulator, setSelectedModulator } = useModulationStore()
  const { routings, bpm } = useSequencerStore()

  // Count routings per modulator
  const lfoRoutings = routings.filter(r => r.trackId === 'lfo').length
  const randomRoutings = routings.filter(r => r.trackId === 'random').length
  const stepRoutings = routings.filter(r => r.trackId === 'step').length
  const envRoutings = routings.filter(r => r.trackId === 'envelope').length
  const sampleHoldRoutings = routings.filter(r => r.trackId === 'sampleHold').length

  // Toggle selection (deselect if already selected)
  const handleSelect = (type: 'lfo' | 'random' | 'step' | 'envelope' | 'sampleHold') => {
    setSelectedModulator(selectedModulator === type ? null : type)
  }

  const lfoShapes: { value: LFOShape; label: string }[] = [
    { value: 'sine', label: 'Sin' },
    { value: 'triangle', label: 'Tri' },
    { value: 'square', label: 'Sqr' },
    { value: 'saw', label: 'Saw' },
    { value: 'random', label: 'Rnd' },
  ]

  return (
    <div className="flex flex-col gap-2 p-2">
      {/* LFO */}
      <ModulatorSection
        title={`LFO${lfoRoutings > 0 ? ` → ${lfoRoutings}` : ''}`}
        enabled={mod.lfo.enabled}
        selected={selectedModulator === 'lfo'}
        onToggle={mod.toggleLFO}
        onSelect={() => handleSelect('lfo')}
        color="#00D4FF"
      >
        <ModSelect
          label="Shape"
          value={mod.lfo.shape}
          options={lfoShapes}
          onChange={mod.setLFOShape}
          color="#00D4FF"
        />
        <ModRateSelect
          label="Rate"
          value={mod.lfo.rate}
          bpm={bpm}
          onChange={mod.setLFORate}
          color="#00D4FF"
        />
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[8px] uppercase" style={{ color: 'var(--text-ghost)' }}>Value</span>
          <div className="flex-1 h-1 rounded-sm" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <div
              className="h-full rounded-sm transition-all duration-75"
              style={{
                width: `${mod.lfo.currentValue * 100}%`,
                backgroundColor: '#00D4FF',
              }}
            />
          </div>
        </div>
      </ModulatorSection>

      {/* Random */}
      <ModulatorSection
        title={`Random${randomRoutings > 0 ? ` → ${randomRoutings}` : ''}`}
        enabled={mod.random.enabled}
        selected={selectedModulator === 'random'}
        onToggle={mod.toggleRandom}
        onSelect={() => handleSelect('random')}
        color="#FF6B6B"
      >
        <ModRateSelect
          label="Rate"
          value={mod.random.rate}
          bpm={bpm}
          onChange={mod.setRandomRate}
          color="#FF6B6B"
        />
        <ModSlider
          label="Smooth"
          value={mod.random.smoothing}
          min={0}
          max={1}
          step={0.01}
          onChange={mod.setRandomSmoothing}
          format={(v) => `${Math.round(v * 100)}%`}
          color="#FF6B6B"
        />
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[8px] uppercase" style={{ color: 'var(--text-ghost)' }}>Value</span>
          <div className="flex-1 h-1 rounded-sm" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <div
              className="h-full rounded-sm transition-all duration-75"
              style={{
                width: `${mod.random.currentValue * 100}%`,
                backgroundColor: '#FF6B6B',
              }}
            />
          </div>
        </div>
      </ModulatorSection>

      {/* Step */}
      <ModulatorSection
        title={`Step${stepRoutings > 0 ? ` → ${stepRoutings}` : ''}`}
        enabled={mod.step.enabled}
        selected={selectedModulator === 'step'}
        onToggle={mod.toggleStep}
        onSelect={() => handleSelect('step')}
        color="#4ECDC4"
      >
        <ModRateSelect
          label="Rate"
          value={mod.step.rate}
          bpm={bpm}
          onChange={mod.setStepRate}
          color="#4ECDC4"
        />
        {/* Step value bars */}
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
                    backgroundColor: mod.step.currentStep === i ? '#4ECDC4' : '#4ECDC480',
                  }}
                />
              </div>
              <span
                className="text-[7px] mt-0.5"
                style={{ color: mod.step.currentStep === i ? '#4ECDC4' : 'var(--text-ghost)' }}
              >
                {i + 1}
              </span>
            </div>
          ))}
        </div>
      </ModulatorSection>

      {/* Envelope */}
      <ModulatorSection
        title={`Envelope${envRoutings > 0 ? ` → ${envRoutings}` : ''}`}
        enabled={mod.envelope.enabled}
        selected={selectedModulator === 'envelope'}
        onToggle={mod.toggleEnvelope}
        onSelect={() => handleSelect('envelope')}
        color="#AA55FF"
      >
        <ModSlider
          label="Attack"
          value={mod.envelope.attack}
          min={0}
          max={2}
          step={0.01}
          onChange={(v) => mod.setEnvelopeParams({ attack: v })}
          format={(v) => `${(v * 1000).toFixed(0)}ms`}
          color="#AA55FF"
        />
        <ModSlider
          label="Decay"
          value={mod.envelope.decay}
          min={0}
          max={2}
          step={0.01}
          onChange={(v) => mod.setEnvelopeParams({ decay: v })}
          format={(v) => `${(v * 1000).toFixed(0)}ms`}
          color="#AA55FF"
        />
        <ModSlider
          label="Sustain"
          value={mod.envelope.sustain}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => mod.setEnvelopeParams({ sustain: v })}
          format={(v) => `${Math.round(v * 100)}%`}
          color="#AA55FF"
        />
        <ModSlider
          label="Release"
          value={mod.envelope.release}
          min={0}
          max={2}
          step={0.01}
          onChange={(v) => mod.setEnvelopeParams({ release: v })}
          format={(v) => `${(v * 1000).toFixed(0)}ms`}
          color="#AA55FF"
        />
        <div className="flex items-center gap-2 mt-1">
          <button
            onMouseDown={mod.triggerEnvelope}
            onMouseUp={mod.releaseEnvelope}
            onMouseLeave={mod.releaseEnvelope}
            className="flex-1 text-[8px] uppercase py-1 rounded-sm"
            style={{
              backgroundColor: mod.envelope.phase !== 'idle' ? '#AA55FF' : 'var(--bg-elevated)',
              color: mod.envelope.phase !== 'idle' ? 'white' : 'var(--text-muted)',
              border: '1px solid var(--border)',
            }}
          >
            {mod.envelope.phase === 'idle' ? 'Trigger' : mod.envelope.phase.toUpperCase()}
          </button>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[8px] uppercase" style={{ color: 'var(--text-ghost)' }}>Value</span>
          <div className="flex-1 h-1 rounded-sm" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <div
              className="h-full rounded-sm transition-all duration-75"
              style={{
                width: `${mod.envelope.currentValue * 100}%`,
                backgroundColor: '#AA55FF',
              }}
            />
          </div>
        </div>
      </ModulatorSection>

      {/* Sample & Hold */}
      <ModulatorSection
        title={`S&H${sampleHoldRoutings > 0 ? ` → ${sampleHoldRoutings}` : ''}`}
        enabled={mod.sampleHold.enabled}
        selected={selectedModulator === 'sampleHold'}
        onToggle={mod.toggleSampleHold}
        onSelect={() => handleSelect('sampleHold')}
        color="#AAFF00"
      >
        {/* Input (the signal being sampled) */}
        <ModSlider
          label="Input"
          value={mod.sampleHold.input}
          min={0}
          max={1}
          step={0.01}
          onChange={mod.setSampleHoldInput}
          format={(v) => `${Math.round(v * 100)}%`}
          color="#AAFF00"
        />
        {/* Smoothing */}
        <ModSlider
          label="Smooth"
          value={mod.sampleHold.smoothing}
          min={0}
          max={1}
          step={0.01}
          onChange={mod.setSampleHoldSmoothing}
          format={(v) => `${Math.round(v * 100)}%`}
          color="#AAFF00"
        />
        {/* Rate Mode */}
        <div className="flex items-center gap-2 py-0.5">
          <span className="text-[9px] w-12 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Mode
          </span>
          <div className="flex-1 flex gap-1">
            {(['metronomic', 'free', 'hold'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => mod.setSampleHoldRateMode(mode)}
                className="flex-1 text-[8px] uppercase tracking-wide py-0.5 rounded-sm transition-colors"
                style={{
                  backgroundColor: mod.sampleHold.rateMode === mode ? '#AAFF00' : 'var(--bg-elevated)',
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
        {/* Rate (conditional based on mode) */}
        {mod.sampleHold.rateMode === 'metronomic' && (
          <ModRateSelect
            label="Rate"
            value={mod.sampleHold.rateDivision * (bpm / 60)}
            bpm={bpm}
            onChange={(hz) => mod.setSampleHoldRateDivision(hz / (bpm / 60))}
            color="#AAFF00"
          />
        )}
        {mod.sampleHold.rateMode === 'free' && (
          <ModSlider
            label="Rate"
            value={mod.sampleHold.rateHz}
            min={0.1}
            max={50}
            step={0.1}
            onChange={mod.setSampleHoldRateHz}
            format={(v) => `${v.toFixed(1)}Hz`}
            color="#AAFF00"
          />
        )}
        {/* Rate Scale */}
        {mod.sampleHold.rateMode !== 'hold' && (
          <ModSlider
            label="Scale"
            value={mod.sampleHold.rateScale}
            min={0.02}
            max={50}
            step={0.01}
            onChange={mod.setSampleHoldRateScale}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            color="#AAFF00"
          />
        )}
        {/* Clock Mode */}
        <div className="flex items-center gap-2 py-0.5">
          <span className="text-[9px] w-12 uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Clock
          </span>
          <div className="flex-1 flex gap-1">
            {(['free', 'gate', 'sync'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => mod.setSampleHoldClockMode(mode)}
                className="flex-1 text-[8px] uppercase tracking-wide py-0.5 rounded-sm transition-colors"
                style={{
                  backgroundColor: mod.sampleHold.clockMode === mode ? '#AAFF00' : 'var(--bg-elevated)',
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
        {/* Value display */}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[8px] uppercase" style={{ color: 'var(--text-ghost)' }}>Value</span>
          <div className="flex-1 h-1 rounded-sm" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <div
              className="h-full rounded-sm transition-all duration-75"
              style={{
                width: `${mod.sampleHold.currentValue * 100}%`,
                backgroundColor: '#AAFF00',
              }}
            />
          </div>
        </div>
      </ModulatorSection>
    </div>
  )
}

export function EffectsLane() {
  const modulation = useModulationStore()
  const hasActiveModulation = modulation.lfo.enabled || modulation.random.enabled || modulation.step.enabled || modulation.envelope.enabled || modulation.sampleHold.enabled

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--bg-surface)' }}>
      {/* Header */}
      <div
        className="flex-shrink-0 flex items-center justify-between"
        style={{
          borderBottom: '1px solid var(--border)',
          padding: 'var(--panel-padding-sm) var(--panel-padding)',
        }}
      >
        <span
          className="text-[9px] uppercase tracking-widest flex items-center gap-1"
          style={{ color: 'var(--accent)' }}
        >
          MODULATION
          {hasActiveModulation && (
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: 'var(--accent)', boxShadow: '0 0 4px var(--accent-glow)' }}
            />
          )}
        </span>
      </div>

      {/* Modulation panel */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <ModulationPanel />
      </div>
    </div>
  )
}
