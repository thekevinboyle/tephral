import { useEffectSequencerStore } from '../../stores/effectSequencerStore'
import { useUIStore } from '../../stores/uiStore'
import { Knob } from '../performance/Knob'
import { ParamSection } from '../performance/blocks/ParamSection'
import { SignalAnalysis } from '../ui/MicroVisuals'

const ACCENT = '#FF3355'

export function TrackAudioReactivePanel({ effectId: effectIdProp }: { effectId?: string } = {}) {
  const selectedEffectId = useUIStore((s) => s.selectedEffectId)
  const effectId = effectIdProp ?? selectedEffectId

  const track = useEffectSequencerStore((s) => effectId ? s.tracks[effectId] : undefined)
  const setTrackAudioReactive = useEffectSequencerStore((s) => s.setTrackAudioReactive)
  const setTrackAudioReactiveEnabled = useEffectSequencerStore((s) => s.setTrackAudioReactiveEnabled)
  const trackAudioLevel = useEffectSequencerStore((s) => effectId ? (s.trackAudioLevels[effectId] ?? 0) : 0)
  const trackAutoThreshold = useEffectSequencerStore((s) => effectId ? (s.trackAutoThresholds[effectId] ?? 0.5) : 0.5)


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

  return (
    <ParamSection label="Audio Reactive" color={ACCENT} visual={SignalAnalysis}>
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
    </ParamSection>
  )
}
