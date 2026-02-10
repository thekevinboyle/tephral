import { useState, useRef, useCallback, useEffect } from 'react'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { useAsciiRenderStore } from '../../stores/asciiRenderStore'
import { useStippleStore } from '../../stores/stippleStore'
import { useLandmarksStore } from '../../stores/landmarksStore'
import { useContourStore } from '../../stores/contourStore'
import { useAcidStore } from '../../stores/acidStore'
import { useVisionTrackingStore } from '../../stores/visionTrackingStore'
import { useTextureOverlayStore } from '../../stores/textureOverlayStore'
import { useDataOverlayStore } from '../../stores/dataOverlayStore'
import { useStrandStore } from '../../stores/strandStore'
import { useMotionStore } from '../../stores/motionStore'
import { useUIStore } from '../../stores/uiStore'
import { useRoutingStore } from '../../stores/routingStore'
import { useModulationStore, type LFOShape } from '../../stores/modulationStore'
import { useSequencerStore } from '../../stores/sequencerStore'
import { EFFECTS } from '../../config/effects'

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

interface ActiveEffect {
  id: string
  label: string
  color: string
  primaryValue: number
  primaryLabel: string
}

type TabId = 'fx' | 'mod'

export function EffectsLane() {
  const [activeTab, setActiveTab] = useState<TabId>('fx')
  const glitch = useGlitchEngineStore()
  const { effectBypassed, toggleEffectBypassed } = useGlitchEngineStore()
  const ascii = useAsciiRenderStore()
  const stipple = useStippleStore()
  const landmarks = useLandmarksStore()
  const contour = useContourStore()
  const acid = useAcidStore()
  const vision = useVisionTrackingStore()
  const textureOverlay = useTextureOverlayStore()
  const dataOverlay = useDataOverlayStore()
  const strand = useStrandStore()
  const motion = useMotionStore()
  const { selectedEffectId, setSelectedEffect } = useUIStore()
  const { effectOrder, reorderEffect } = useRoutingStore()
  const modulation = useModulationStore()

  // Check if any modulator is active (for tab indicator)
  const hasActiveModulation = modulation.lfo.enabled || modulation.random.enabled || modulation.step.enabled || modulation.envelope.enabled || modulation.sampleHold.enabled

  // Auto-switch to MOD tab when a modulator is selected
  useEffect(() => {
    if (modulation.selectedModulator !== null) {
      setActiveTab('mod')
    }
  }, [modulation.selectedModulator])

  // Auto-switch to FX tab when an effect is selected
  useEffect(() => {
    if (selectedEffectId !== null) {
      setActiveTab('fx')
    }
  }, [selectedEffectId])

  // Build list of active effects
  const activeEffects: ActiveEffect[] = []

  // Glitch effects
  if (glitch.rgbSplitEnabled) {
    const effect = EFFECTS.find(e => e.id === 'rgb_split')
    activeEffects.push({
      id: 'rgb_split',
      label: 'RGB Split',
      color: effect?.color || '#00d4ff',
      primaryValue: Math.round(glitch.rgbSplit.amount * 50),
      primaryLabel: 'amt',
    })
  }
  if (glitch.blockDisplaceEnabled) {
    const effect = EFFECTS.find(e => e.id === 'block_displace')
    activeEffects.push({
      id: 'block_displace',
      label: 'Block',
      color: effect?.color || '#ff00aa',
      primaryValue: Math.round(glitch.blockDisplace.displaceDistance * 1000),
      primaryLabel: 'dist',
    })
  }
  if (glitch.scanLinesEnabled) {
    const effect = EFFECTS.find(e => e.id === 'scan_lines')
    activeEffects.push({
      id: 'scan_lines',
      label: 'Scan Lines',
      color: effect?.color || '#4444ff',
      primaryValue: glitch.scanLines.lineCount,
      primaryLabel: 'lines',
    })
  }
  if (glitch.noiseEnabled) {
    const effect = EFFECTS.find(e => e.id === 'noise')
    activeEffects.push({
      id: 'noise',
      label: 'Noise',
      color: effect?.color || '#aa44ff',
      primaryValue: Math.round(glitch.noise.amount * 100),
      primaryLabel: 'amt',
    })
  }
  if (glitch.pixelateEnabled) {
    const effect = EFFECTS.find(e => e.id === 'pixelate')
    activeEffects.push({
      id: 'pixelate',
      label: 'Pixelate',
      color: effect?.color || '#ff6600',
      primaryValue: glitch.pixelate.pixelSize,
      primaryLabel: 'size',
    })
  }
  if (glitch.edgeDetectionEnabled) {
    const effect = EFFECTS.find(e => e.id === 'edges')
    activeEffects.push({
      id: 'edges',
      label: 'Edges',
      color: effect?.color || '#00ffaa',
      primaryValue: Math.round(glitch.edgeDetection.threshold * 100),
      primaryLabel: 'thresh',
    })
  }
  if (glitch.chromaticAberrationEnabled) {
    const effect = EFFECTS.find(e => e.id === 'chromatic')
    activeEffects.push({
      id: 'chromatic',
      label: 'Chromatic',
      color: effect?.color || '#ff6b6b',
      primaryValue: Math.round(glitch.chromaticAberration.intensity * 100),
      primaryLabel: 'int',
    })
  }
  if (glitch.vhsTrackingEnabled) {
    const effect = EFFECTS.find(e => e.id === 'vhs')
    activeEffects.push({
      id: 'vhs',
      label: 'VHS',
      color: effect?.color || '#a855f7',
      primaryValue: Math.round(glitch.vhsTracking.tearIntensity * 100),
      primaryLabel: 'tear',
    })
  }
  if (glitch.lensDistortionEnabled) {
    const effect = EFFECTS.find(e => e.id === 'lens')
    activeEffects.push({
      id: 'lens',
      label: 'Lens',
      color: effect?.color || '#06b6d4',
      primaryValue: Math.round(glitch.lensDistortion.curvature * 100),
      primaryLabel: 'curve',
    })
  }
  if (glitch.ditherEnabled) {
    const effect = EFFECTS.find(e => e.id === 'dither')
    activeEffects.push({
      id: 'dither',
      label: 'Dither',
      color: effect?.color || '#f472b6',
      primaryValue: Math.round(glitch.dither.intensity * 100),
      primaryLabel: 'int',
    })
  }
  if (glitch.posterizeEnabled) {
    const effect = EFFECTS.find(e => e.id === 'posterize')
    activeEffects.push({
      id: 'posterize',
      label: 'Posterize',
      color: effect?.color || '#AAFF00',
      primaryValue: glitch.posterize.levels,
      primaryLabel: 'lvl',
    })
  }
  if (glitch.staticDisplacementEnabled) {
    const effect = EFFECTS.find(e => e.id === 'static_displace')
    activeEffects.push({
      id: 'static_displace',
      label: 'Static',
      color: effect?.color || '#ec4899',
      primaryValue: Math.round(glitch.staticDisplacement.intensity * 100),
      primaryLabel: 'int',
    })
  }
  if (glitch.colorGradeEnabled) {
    const effect = EFFECTS.find(e => e.id === 'color_grade')
    activeEffects.push({
      id: 'color_grade',
      label: 'Grade',
      color: effect?.color || '#84cc16',
      primaryValue: Math.round(glitch.colorGrade.saturation * 100),
      primaryLabel: 'sat',
    })
  }
  if (glitch.feedbackLoopEnabled) {
    const effect = EFFECTS.find(e => e.id === 'feedback')
    activeEffects.push({
      id: 'feedback',
      label: 'Feedback',
      color: effect?.color || '#8b5cf6',
      primaryValue: Math.round(glitch.feedbackLoop.decay * 100),
      primaryLabel: 'decay',
    })
  }

  // ASCII
  if (ascii.enabled) {
    activeEffects.push({
      id: 'ascii',
      label: ascii.params.mode === 'matrix' ? 'Matrix' : 'ASCII',
      color: ascii.params.mode === 'matrix' ? '#88ff00' : '#ffaa00',
      primaryValue: ascii.params.fontSize,
      primaryLabel: 'size',
    })
  }

  // Stipple
  if (stipple.enabled) {
    activeEffects.push({
      id: 'stipple',
      label: 'Stipple',
      color: '#ff6600',
      primaryValue: Math.round(stipple.params.particleSize),
      primaryLabel: 'size',
    })
  }

  // Contour
  if (contour.enabled) {
    activeEffects.push({
      id: 'contour',
      label: 'Contour',
      color: '#65a30d',
      primaryValue: Math.round(contour.params.threshold * 100),
      primaryLabel: 'thresh',
    })
  }

  // Landmarks
  if (landmarks.enabled && landmarks.currentMode !== 'off') {
    activeEffects.push({
      id: 'landmarks',
      label: landmarks.currentMode.charAt(0).toUpperCase() + landmarks.currentMode.slice(1),
      color: '#88ff00',
      primaryValue: Math.round(landmarks.minDetectionConfidence * 100),
      primaryLabel: 'conf',
    })
  }

  // Vision tracking effects
  if (vision.brightEnabled) activeEffects.push({ id: 'track_bright', label: 'Bright', color: '#eab308', primaryValue: vision.brightParams.threshold, primaryLabel: 'thresh' })
  if (vision.edgeEnabled) activeEffects.push({ id: 'track_edge', label: 'Edge Track', color: '#06b6d4', primaryValue: vision.edgeParams.threshold, primaryLabel: 'thresh' })
  if (vision.colorEnabled) activeEffects.push({ id: 'track_color', label: 'Color Track', color: '#ec4899', primaryValue: Math.round(vision.colorParams.colorRange * 100), primaryLabel: 'range' })
  if (vision.motionEnabled) activeEffects.push({ id: 'track_motion', label: 'Motion Track', color: '#AA55FF', primaryValue: vision.motionParams.sensitivity, primaryLabel: 'sens' })
  if (vision.faceEnabled) activeEffects.push({ id: 'track_face', label: 'Face Track', color: '#f97316', primaryValue: vision.faceParams.threshold, primaryLabel: 'thresh' })
  if (vision.handsEnabled) activeEffects.push({ id: 'track_hands', label: 'Hands Track', color: '#a855f7', primaryValue: vision.handsParams.threshold, primaryLabel: 'thresh' })

  // Acid effects
  if (acid.dotsEnabled) activeEffects.push({ id: 'acid_dots', label: 'Dots', color: '#e5e5e5', primaryValue: acid.dotsParams.gridSize, primaryLabel: 'grid' })
  if (acid.glyphEnabled) activeEffects.push({ id: 'acid_glyph', label: 'Glyph', color: '#d4d4d4', primaryValue: acid.glyphParams.gridSize, primaryLabel: 'grid' })
  if (acid.iconsEnabled) activeEffects.push({ id: 'acid_icons', label: 'Icons', color: '#c4c4c4', primaryValue: acid.iconsParams.gridSize, primaryLabel: 'grid' })
  if (acid.contourEnabled) activeEffects.push({ id: 'acid_contour', label: 'Contour', color: '#b4b4b4', primaryValue: acid.contourParams.levels, primaryLabel: 'lvl' })
  if (acid.decompEnabled) activeEffects.push({ id: 'acid_decomp', label: 'Decomp', color: '#94a3b8', primaryValue: acid.decompParams.minBlock, primaryLabel: 'min' })
  if (acid.mirrorEnabled) activeEffects.push({ id: 'acid_mirror', label: 'Mirror', color: '#7dd3fc', primaryValue: acid.mirrorParams.segments, primaryLabel: 'seg' })
  if (acid.sliceEnabled) activeEffects.push({ id: 'acid_slice', label: 'Slice', color: '#67e8f9', primaryValue: acid.sliceParams.sliceCount, primaryLabel: 'cnt' })
  if (acid.thGridEnabled) activeEffects.push({ id: 'acid_thgrid', label: 'ThGrid', color: '#a5f3fc', primaryValue: acid.thGridParams.threshold, primaryLabel: 'thresh' })
  if (acid.cloudEnabled) activeEffects.push({ id: 'acid_cloud', label: 'Cloud', color: '#f0abfc', primaryValue: Math.round(acid.cloudParams.density / 1000), primaryLabel: 'den' })
  if (acid.ledEnabled) activeEffects.push({ id: 'acid_led', label: 'LED', color: '#c084fc', primaryValue: acid.ledParams.gridSize, primaryLabel: 'grid' })
  if (acid.slitEnabled) activeEffects.push({ id: 'acid_slit', label: 'Slit', color: '#a78bfa', primaryValue: Math.round(acid.slitParams.speed * 10), primaryLabel: 'spd' })
  if (acid.voronoiEnabled) activeEffects.push({ id: 'acid_voronoi', label: 'Voronoi', color: '#818cf8', primaryValue: acid.voronoiParams.cellCount, primaryLabel: 'cells' })

  // Overlay effects
  if (textureOverlay.enabled) activeEffects.push({ id: 'texture_overlay', label: 'Texture', color: '#a3a3a3', primaryValue: Math.round(textureOverlay.opacity * 100), primaryLabel: 'opac' })
  if (dataOverlay.enabled) activeEffects.push({ id: 'data_overlay', label: 'Data', color: '#60a5fa', primaryValue: dataOverlay.style.fontSize, primaryLabel: 'size' })

  // Strand effects
  if (strand.handprintsEnabled) activeEffects.push({ id: 'strand_handprints', label: 'Handprints', color: '#1a1a1a', primaryValue: strand.handprintsParams.density, primaryLabel: 'den' })
  if (strand.tarSpreadEnabled) activeEffects.push({ id: 'strand_tar', label: 'Tar', color: '#ff6b35', primaryValue: Math.round(strand.tarSpreadParams.spreadSpeed * 100), primaryLabel: 'spd' })
  if (strand.timefallEnabled) activeEffects.push({ id: 'strand_timefall', label: 'Timefall', color: '#4a5568', primaryValue: Math.round(strand.timefallParams.intensity * 100), primaryLabel: 'int' })
  if (strand.voidOutEnabled) activeEffects.push({ id: 'strand_voidout', label: 'Void Out', color: '#ff6b35', primaryValue: Math.round(strand.voidOutParams.speed * 100), primaryLabel: 'spd' })
  if (strand.strandWebEnabled) activeEffects.push({ id: 'strand_web', label: 'Strand Web', color: '#00d4ff', primaryValue: Math.round(strand.strandWebParams.threshold * 100), primaryLabel: 'thresh' })
  if (strand.bridgeLinkEnabled) activeEffects.push({ id: 'strand_bridge', label: 'Bridge', color: '#00d4ff', primaryValue: strand.bridgeLinkParams.gridSize, primaryLabel: 'grid' })
  if (strand.chiralPathEnabled) activeEffects.push({ id: 'strand_path', label: 'Chiral Path', color: '#00d4ff', primaryValue: strand.chiralPathParams.particleCount, primaryLabel: 'cnt' })
  if (strand.umbilicalEnabled) activeEffects.push({ id: 'strand_umbilical', label: 'Umbilical', color: '#00d4ff', primaryValue: strand.umbilicalParams.tendrilCount, primaryLabel: 'cnt' })
  if (strand.odradekEnabled) activeEffects.push({ id: 'strand_odradek', label: 'Odradek', color: '#ffd700', primaryValue: Math.round(strand.odradekParams.sweepSpeed * 100), primaryLabel: 'spd' })
  if (strand.chiraliumEnabled) activeEffects.push({ id: 'strand_chiralium', label: 'Chiralium', color: '#ffd700', primaryValue: Math.round(strand.chiraliumParams.threshold * 100), primaryLabel: 'thresh' })
  if (strand.beachStaticEnabled) activeEffects.push({ id: 'strand_beach', label: 'Beach', color: '#ffd700', primaryValue: Math.round(strand.beachStaticParams.grainAmount * 100), primaryLabel: 'grain' })
  if (strand.doomsEnabled) activeEffects.push({ id: 'strand_dooms', label: 'Dooms', color: '#ffd700', primaryValue: Math.round(strand.doomsParams.haloSize * 100), primaryLabel: 'halo' })
  if (strand.chiralCloudEnabled) activeEffects.push({ id: 'strand_cloud', label: 'Chiral Cloud', color: '#7b68ee', primaryValue: Math.round(strand.chiralCloudParams.density * 100), primaryLabel: 'den' })
  if (strand.bbPodEnabled) activeEffects.push({ id: 'strand_bbpod', label: 'BB Pod', color: '#7b68ee', primaryValue: Math.round(strand.bbPodParams.vignetteSize * 100), primaryLabel: 'vig' })
  if (strand.seamEnabled) activeEffects.push({ id: 'strand_seam', label: 'Seam', color: '#7b68ee', primaryValue: Math.round(strand.seamParams.riftWidth * 100), primaryLabel: 'width' })
  if (strand.extinctionEnabled) activeEffects.push({ id: 'strand_extinction', label: 'Extinction', color: '#7b68ee', primaryValue: Math.round(strand.extinctionParams.erosionSpeed * 100), primaryLabel: 'spd' })

  // Motion effects
  if (motion.motionExtractEnabled) activeEffects.push({ id: 'motion_extract', label: 'Motion Extract', color: '#AA55FF', primaryValue: Math.round(motion.motionExtract.threshold * 100), primaryLabel: 'thresh' })
  if (motion.echoTrailEnabled) activeEffects.push({ id: 'echo_trail', label: 'Echo Trail', color: '#06b6d4', primaryValue: Math.round(motion.echoTrail.decay * 100), primaryLabel: 'decay' })
  if (motion.timeSmearEnabled) activeEffects.push({ id: 'time_smear', label: 'Time Smear', color: '#8b5cf6', primaryValue: Math.round(motion.timeSmear.accumulation * 100), primaryLabel: 'acc' })
  if (motion.freezeMaskEnabled) activeEffects.push({ id: 'freeze_mask', label: 'Freeze Mask', color: '#f97316', primaryValue: Math.round(motion.freezeMask.freezeThreshold * 100), primaryLabel: 'thresh' })

  // Sort effects by effectOrder
  const sortedEffects = [...activeEffects].sort((a, b) => {
    const aIndex = effectOrder.indexOf(a.id)
    const bIndex = effectOrder.indexOf(b.id)
    const aPos = aIndex === -1 ? Infinity : aIndex
    const bPos = bIndex === -1 ? Infinity : bIndex
    return aPos - bPos
  })

  // Drag state
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const dragStartY = useRef<number>(0)
  const dragStartTime = useRef<number>(0)
  const isDragging = useRef(false)

  const handlePointerDown = useCallback((e: React.PointerEvent, _index: number) => {
    dragStartY.current = e.clientY
    dragStartTime.current = Date.now()
    isDragging.current = false
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent, index: number) => {
    const deltaY = Math.abs(e.clientY - dragStartY.current)
    const elapsed = Date.now() - dragStartTime.current

    // Start drag after 150ms hold or 10px movement
    if (!isDragging.current && (elapsed > 150 || deltaY > 10)) {
      isDragging.current = true
      setDragIndex(index)
    }

    if (isDragging.current) {
      // Find which card we're over based on Y position
      const container = (e.currentTarget as HTMLElement).parentElement
      if (container) {
        const cards = Array.from(container.children) as HTMLElement[]
        for (let i = 0; i < cards.length; i++) {
          const rect = cards[i].getBoundingClientRect()
          const midY = rect.top + rect.height / 2
          if (e.clientY < midY) {
            setDragOverIndex(i)
            return
          }
        }
        setDragOverIndex(cards.length)
      }
    }
  }, [])

  const handlePointerUp = useCallback((e: React.PointerEvent, index: number) => {
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {}

    if (isDragging.current && dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      // Get the effect IDs from the sorted visible effects
      const fromEffectId = sortedEffects[dragIndex].id
      const fromOrderIndex = effectOrder.indexOf(fromEffectId)

      // For the target, figure out where in effectOrder to insert
      let toOrderIndex: number
      if (dragOverIndex >= sortedEffects.length) {
        toOrderIndex = effectOrder.indexOf(sortedEffects[sortedEffects.length - 1].id) + 1
      } else if (dragOverIndex === 0) {
        toOrderIndex = effectOrder.indexOf(sortedEffects[0].id)
      } else {
        toOrderIndex = effectOrder.indexOf(sortedEffects[dragOverIndex].id)
      }

      if (fromOrderIndex !== -1 && toOrderIndex !== -1 && fromOrderIndex !== toOrderIndex) {
        reorderEffect(fromOrderIndex, toOrderIndex)
      }
    } else if (!isDragging.current) {
      // It was a click, select the effect
      setSelectedEffect(sortedEffects[index].id)
    }

    setDragIndex(null)
    setDragOverIndex(null)
    isDragging.current = false
  }, [dragIndex, dragOverIndex, effectOrder, reorderEffect, setSelectedEffect, sortedEffects])

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--bg-surface)' }}>
      {/* Tab Header */}
      <div
        className="flex-shrink-0 flex"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <button
          onClick={() => setActiveTab('fx')}
          className="flex-1 flex items-center justify-between transition-colors"
          style={{
            backgroundColor: activeTab === 'fx' ? 'var(--bg-elevated)' : 'transparent',
            borderRight: '1px solid var(--border)',
            padding: 'var(--panel-padding-sm) var(--panel-padding)',
          }}
        >
          <span
            className="text-[9px] uppercase tracking-widest"
            style={{ color: activeTab === 'fx' ? 'var(--accent)' : 'var(--text-ghost)' }}
          >
            FX
          </span>
          <span className="text-[9px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
            {sortedEffects.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('mod')}
          className="flex-1 flex items-center justify-between transition-colors"
          style={{
            backgroundColor: activeTab === 'mod' ? 'var(--bg-elevated)' : 'transparent',
            padding: 'var(--panel-padding-sm) var(--panel-padding)',
          }}
        >
          <span
            className="text-[9px] uppercase tracking-widest flex items-center gap-1"
            style={{ color: activeTab === 'mod' ? 'var(--accent)' : 'var(--text-ghost)' }}
          >
            MOD
            {hasActiveModulation && (
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: 'var(--accent)', boxShadow: '0 0 4px var(--accent-glow)' }}
              />
            )}
          </span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === 'fx' ? (
          /* Effects list */
          <div style={{ padding: 'var(--panel-padding-sm)' }}>
            {sortedEffects.length === 0 ? (
              <div className="h-full flex items-center justify-center py-8">
                <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-ghost)' }}>
                  —
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {sortedEffects.map((effect, index) => {
                  const isSelected = selectedEffectId === effect.id
                  const isBypassed = effectBypassed[effect.id] || false
                  const isBeingDragged = dragIndex === index
                  const isDropTarget = dragOverIndex === index && dragIndex !== null && dragIndex !== index

                  return (
                    <div
                      key={effect.id}
                      onPointerDown={(e) => handlePointerDown(e, index)}
                      onPointerMove={(e) => handlePointerMove(e, index)}
                      onPointerUp={(e) => handlePointerUp(e, index)}
                      onDoubleClick={() => toggleEffectBypassed(effect.id)}
                      className="flex items-center gap-2 px-2 py-1 rounded-sm cursor-grab active:cursor-grabbing transition-all select-none touch-none"
                      style={{
                        backgroundColor: isBypassed
                          ? 'var(--bg-elevated)'
                          : isSelected
                            ? 'var(--accent-subtle)'
                            : 'transparent',
                        border: isSelected ? '1px solid var(--accent-dim)' : '1px solid transparent',
                        opacity: isBypassed ? 0.4 : isBeingDragged ? 0.8 : 1,
                        transform: isBeingDragged ? 'scale(1.02)' : 'scale(1)',
                        marginTop: isDropTarget ? '24px' : '0',
                      }}
                    >
                      {/* LED indicator */}
                      <div
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: isBypassed ? 'var(--text-ghost)' : 'var(--accent)',
                          boxShadow: isBypassed ? 'none' : '0 0 4px var(--accent-glow)',
                        }}
                      />

                      {/* Label */}
                      <span
                        className="flex-1 text-[10px] uppercase tracking-wide truncate"
                        style={{ color: isBypassed ? 'var(--text-ghost)' : 'var(--text-secondary)' }}
                      >
                        {effect.label}
                      </span>

                      {/* Value */}
                      <span
                        className="text-[9px] tabular-nums tracking-wide"
                        style={{
                          color: isBypassed ? 'var(--text-ghost)' : 'var(--text-muted)',
                        }}
                      >
                        {effect.primaryValue}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : (
          /* Modulation panel */
          <ModulationPanel />
        )}
      </div>

    </div>
  )
}
