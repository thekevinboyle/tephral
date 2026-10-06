import { useMemo } from 'react'
import { useEffectSequencerStore } from '../../stores/effectSequencerStore'
import { useUIStore } from '../../stores/uiStore'
import { Knob } from '../performance/Knob'
import { ParamSection } from '../performance/blocks/ParamSection'
import { SignalAnalysis } from '../ui/MicroVisuals'
import { BandSpectrum } from './BandSpectrum'
import { BAND_PRESETS, legacySourceToBand, type BandPresetName } from '../../utils/audioBands'
import { EFFECT_PARAM_REGISTRY } from '../../config/effectParams'

const ACCENT = '#FF3355'

export function TrackAudioReactivePanel({ effectId: effectIdProp }: { effectId?: string } = {}) {
  const selectedEffectId = useUIStore((s) => s.selectedEffectId)
  const effectId = effectIdProp ?? selectedEffectId

  const track = useEffectSequencerStore((s) => effectId ? s.tracks[effectId] : undefined)
  const setTrackAudioReactive = useEffectSequencerStore((s) => s.setTrackAudioReactive)
  const setTrackAudioReactiveEnabled = useEffectSequencerStore((s) => s.setTrackAudioReactiveEnabled)
  const setTrackAudioBand = useEffectSequencerStore((s) => s.setTrackAudioBand)
  const setTrackAudioMod = useEffectSequencerStore((s) => s.setTrackAudioMod)
  const trackAudioLevel = useEffectSequencerStore((s) => effectId ? (s.trackAudioLevels[effectId] ?? 0) : 0)
  const trackAutoThreshold = useEffectSequencerStore((s) => effectId ? (s.trackAutoThresholds[effectId] ?? 0.5) : 0.5)
  // MOD target list: the param set is fixed per effect, so rebuild only on effectId
  const modParams = useMemo(() => (effectId ? EFFECT_PARAM_REGISTRY[effectId]?.getParams() ?? [] : []), [effectId])

  const config = track?.audioReactive

  if (!effectId || !track) {
    return (
      <div
        className="flex items-center justify-center h-full text-[10px] uppercase tracking-wider"
        style={{ color: 'var(--text-ghost)' }}
      >
        Select a track to configure audio reactivity
      </div>
    )
  }

  if (!config?.enabled) {
    return (
      <div className="flex items-center justify-center h-full gap-3">
        <span
          className="text-[10px] uppercase tracking-wider"
          style={{ color: 'var(--text-ghost)' }}
        >
          Audio reactive is off for this track
        </span>
        <button
          onClick={() => setTrackAudioReactiveEnabled(effectId, true)}
          className="text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-sm"
          style={{
            backgroundColor: `${ACCENT}20`,
            color: ACCENT,
            border: `1px solid ${ACCENT}40`,
          }}
        >
          Enable
        </button>
      </div>
    )
  }

  const isAboveThreshold = trackAudioLevel >= trackAutoThreshold
  const band = config.band ?? legacySourceToBand(config.source) ?? BAND_PRESETS.FULL

  return (
    <ParamSection label="Audio Reactive" color={ACCENT} visual={SignalAnalysis}>
    <div className="flex flex-col gap-2">
      {/* Row 1: band */}
      <div className="flex items-center gap-3">
        <BandSpectrum key={effectId} band={band} color={ACCENT} onChange={(b) => setTrackAudioBand(effectId, b)} />
        <div className="flex flex-wrap gap-1 max-w-[150px]">
          {(Object.keys(BAND_PRESETS) as BandPresetName[]).map((name) => {
            const p = BAND_PRESETS[name]
            const on = Math.abs(band.lowHz - p.lowHz) < 0.5 && Math.abs(band.highHz - p.highHz) < 0.5
            return (
              <button
                key={name}
                aria-pressed={on}
                onClick={() => setTrackAudioBand(effectId, { ...p })}
                className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm"
                style={{ color: on ? ACCENT : 'var(--text-ghost)', border: `1px solid ${on ? `${ACCENT}60` : 'var(--border)'}`, backgroundColor: on ? `${ACCENT}15` : 'transparent' }}
              >
                {name}
              </button>
            )
          })}
        </div>
      {/* Level meter with auto threshold */}
      <div className="flex-1 min-w-[60px] max-w-[120px] relative" style={{ height: 10 }}>
        <div
          className="absolute inset-0 rounded-sm overflow-hidden"
          style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)' }}
        >
          <div
            className="absolute top-0 bottom-0 left-0 rounded-sm"
            style={{
              width: `${Math.min(100, trackAudioLevel * 100)}%`,
              backgroundColor: isAboveThreshold ? ACCENT : `${ACCENT}60`,
              transition: 'width 0.05s',
            }}
          />
        </div>
        {/* Auto threshold line */}
        <div
          className="absolute top-0 bottom-0"
          style={{
            left: `${Math.min(100, trackAutoThreshold * 100)}%`,
            width: 1,
            backgroundColor: 'var(--text-secondary)',
            transition: 'left 0.1s',
          }}
        />
      </div>

      </div>

      {/* Row 2: gate + mod */}
      <div className="flex items-center gap-4">
      {/* Sensitivity / kick multiplier knob */}
      <Knob
        label="SENS"
        value={config.sensitivity}
        min={0.1}
        max={2}
        step={0.05}
        size="xs"
        showArc
        showValue
        color={ACCENT}
        onChange={(v) => setTrackAudioReactive(effectId, { sensitivity: v })}
        formatValue={(v) => `${v.toFixed(1)}×`}
      />

        <label className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-ghost)' }}>
          MOD
          <select
            data-track-mod-select
            value={config.mod.param ?? ''}
            onChange={(e) => setTrackAudioMod(effectId, { param: e.target.value || null })}
            className="text-[10px] px-1 py-0.5 rounded-sm"
            style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            <option value="">—</option>
            {modParams.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </label>
        {config.mod.param && (
          <Knob
            label="AMT"
            value={config.mod.amount}
            min={-1}
            max={1}
            step={0.01}
            size="xs"
            showArc
            showValue
            color={ACCENT}
            onChange={(v) => setTrackAudioMod(effectId, { amount: v })}
            formatValue={(v) => `${v >= 0 ? '+' : ''}${Math.round(v * 100)}%`}
          />
        )}
      {/* Disable button */}
      <button
        onClick={() => setTrackAudioReactiveEnabled(effectId, false)}
        className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-sm flex-shrink-0"
        style={{
          color: 'var(--text-ghost)',
          border: '1px solid var(--border)',
        }}
      >
        Off
      </button>
      </div>
    </div>
    </ParamSection>
  )
}
