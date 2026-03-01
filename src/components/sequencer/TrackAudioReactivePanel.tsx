import { useCallback } from 'react'
import { useEffectSequencerStore, type AudioReactiveSource } from '../../stores/effectSequencerStore'
import { useAudioReactiveStore } from '../../stores/audioReactiveStore'
import { useAudioSourceStore } from '../../stores/audioSourceStore'
import { useUIStore } from '../../stores/uiStore'
import { Knob } from '../performance/Knob'

const SOURCES: { value: AudioReactiveSource; label: string }[] = [
  { value: 'kick', label: 'KICK' },
  { value: 'low', label: 'LOW' },
  { value: 'mid', label: 'MID' },
  { value: 'high', label: 'HIGH' },
  { value: 'rms', label: 'RMS' },
  { value: 'peak', label: 'PEAK' },
  { value: 'silence', label: 'SIL' },
]

const ACCENT = '#FF3355'

export function TrackAudioReactivePanel({ effectId: effectIdProp }: { effectId?: string } = {}) {
  const selectedEffectId = useUIStore((s) => s.selectedEffectId)
  const effectId = effectIdProp ?? selectedEffectId

  const track = useEffectSequencerStore((s) => effectId ? s.tracks[effectId] : undefined)
  const setTrackAudioReactive = useEffectSequencerStore((s) => s.setTrackAudioReactive)
  const setTrackAudioReactiveEnabled = useEffectSequencerStore((s) => s.setTrackAudioReactiveEnabled)
  const trackAudioLevel = useEffectSequencerStore((s) => effectId ? (s.trackAudioLevels[effectId] ?? 0) : 0)

  // Live band values for mini meter
  const sub = useAudioReactiveStore((s) => s.sub)
  const mid = useAudioReactiveStore((s) => s.mid)
  const high = useAudioReactiveStore((s) => s.high)
  const rms = useAudioSourceStore((s) => s.amplitude)

  const config = track?.audioReactive

  const handleSourceChange = useCallback(
    (source: AudioReactiveSource) => {
      if (effectId) setTrackAudioReactive(effectId, { source })
    },
    [effectId, setTrackAudioReactive],
  )

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

  const bands = [
    { label: 'L', value: sub, active: config.source === 'kick' || config.source === 'low' },
    { label: 'M', value: mid, active: config.source === 'mid' },
    { label: 'H', value: high, active: config.source === 'high' || config.source === 'peak' },
    { label: 'R', value: rms, active: config.source === 'rms' || config.source === 'silence' },
  ]

  return (
    <div className="flex items-center gap-4" style={{ padding: '8px 16px' }}>
      {/* Source selector */}
      <div className="flex gap-0.5 flex-shrink-0">
        {SOURCES.map((s) => (
          <button
            key={s.value}
            onClick={() => handleSourceChange(s.value)}
            className="text-[9px] font-bold px-2 py-1 rounded-sm"
            style={{
              backgroundColor: config.source === s.value ? `${ACCENT}30` : 'transparent',
              color: config.source === s.value ? ACCENT : 'var(--text-ghost)',
              border: `1px solid ${config.source === s.value ? `${ACCENT}50` : 'transparent'}`,
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Knobs */}
      <Knob
        label="GAIN"
        value={config.gain}
        min={0.1}
        max={4}
        step={0.05}
        size="xs"
        showArc
        showValue
        color={ACCENT}
        onChange={(v) => setTrackAudioReactive(effectId, { gain: v })}
        formatValue={(v) => `${v.toFixed(1)}×`}
      />
      <Knob
        label="THRESH"
        value={config.threshold}
        min={0.01}
        max={0.95}
        step={0.01}
        size="xs"
        showArc
        showValue
        color={ACCENT}
        onChange={(v) => setTrackAudioReactive(effectId, { threshold: v })}
        formatValue={(v) => `${(v * 100).toFixed(0)}%`}
      />
      <Knob
        label="SPEED"
        value={config.speedMultiplier}
        min={0.25}
        max={4}
        step={0.25}
        size="xs"
        showArc
        showValue
        color={ACCENT}
        onChange={(v) => setTrackAudioReactive(effectId, { speedMultiplier: v })}
        formatValue={(v) => `${v.toFixed(2)}×`}
      />
      <Knob
        label="ATK"
        value={config.attackMs}
        min={1}
        max={100}
        step={1}
        size="xs"
        showArc
        showValue
        color={ACCENT}
        onChange={(v) => setTrackAudioReactive(effectId, { attackMs: v })}
        formatValue={(v) => `${Math.round(v)}ms`}
      />
      <Knob
        label="REL"
        value={config.releaseMs}
        min={50}
        max={1000}
        step={10}
        size="xs"
        showArc
        showValue
        color={ACCENT}
        onChange={(v) => setTrackAudioReactive(effectId, { releaseMs: v })}
        formatValue={(v) => `${Math.round(v)}ms`}
      />

      {/* Mini band display */}
      <div className="flex gap-0.5 flex-shrink-0" style={{ marginLeft: 4 }}>
        {bands.map((b) => (
          <div key={b.label} className="flex flex-col items-center gap-0.5">
            <div
              className="relative rounded-sm overflow-hidden"
              style={{
                width: 6,
                height: 28,
                backgroundColor: 'var(--bg-primary)',
                border: `1px solid ${b.active ? `${ACCENT}50` : 'var(--border)'}`,
              }}
            >
              <div
                className="absolute bottom-0 left-0 right-0 rounded-sm"
                style={{
                  height: `${Math.min(100, b.value * 100)}%`,
                  backgroundColor: b.active ? ACCENT : 'var(--text-ghost)',
                  opacity: b.active ? 0.8 : 0.3,
                  transition: 'height 0.05s',
                }}
              />
            </div>
            <span
              className="text-[7px] font-bold"
              style={{ color: b.active ? ACCENT : 'var(--text-ghost)' }}
            >
              {b.label}
            </span>
          </div>
        ))}
      </div>

      {/* Level meter with threshold */}
      <div className="flex-1 min-w-[60px] max-w-[120px] relative" style={{ height: 10 }}>
        <div
          className="absolute inset-0 rounded-sm overflow-hidden"
          style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)' }}
        >
          <div
            className="absolute top-0 bottom-0 left-0 rounded-sm"
            style={{
              width: `${Math.min(100, trackAudioLevel * 100)}%`,
              backgroundColor: trackAudioLevel >= config.threshold ? ACCENT : `${ACCENT}60`,
              transition: 'width 0.05s',
            }}
          />
        </div>
        {/* Threshold line */}
        <div
          className="absolute top-0 bottom-0"
          style={{
            left: `${config.threshold * 100}%`,
            width: 1,
            backgroundColor: 'var(--text-secondary)',
          }}
        />
      </div>

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
  )
}
