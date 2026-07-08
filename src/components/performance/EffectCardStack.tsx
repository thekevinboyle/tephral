import { useMemo } from 'react'
import { useActiveEffects } from '../../hooks/useActiveEffects'
import { useUIStore } from '../../stores/uiStore'
import { useEffectSequencerStore } from '../../stores/effectSequencerStore'
import { PresetDropdownBar } from '../presets/PresetDropdownBar'
import { EffectParameters_v2 } from './ExpandedParameterPanel_v2'
import { TechReadout } from '../ui/MicroVisuals'

export function EffectCardStack() {
  const { sortedEffects } = useActiveEffects()
  const { selectedEffectId } = useUIStore()

  // Transport clock — header LED pulses on the beat while playing,
  // falls back to the slow ambient breathe (class default) when paused
  const bpm = useEffectSequencerStore((s) => s.bpm)
  const seqPlaying = useEffectSequencerStore((s) => s.isPlaying)
  const beatDuration = seqPlaying ? `${60 / bpm}s` : undefined
  const hasEffects = sortedEffects.length > 0

  const activeEffectIds = useMemo(
    () => sortedEffects.map((e) => e.id),
    [sortedEffects],
  )

  const validSelectedId =
    selectedEffectId && activeEffectIds.includes(selectedEffectId)
      ? selectedEffectId
      : null

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header: Preset bar */}
      <PresetDropdownBar />

      {/* FX header */}
      <div
        className="flex-shrink-0 flex items-center px-2"
        style={{
          height: 24,
          borderBottom: '1px solid var(--border-light)',
        }}
      >
        {/* Chain LED — pulses with the transport while effects are running */}
        <span
          aria-hidden
          className={`w-1 h-1 rounded-full flex-shrink-0 mr-1.5 transition-opacity ${hasEffects ? 'alive-idle' : ''}`}
          style={{
            backgroundColor: 'var(--accent)',
            boxShadow: hasEffects ? '0 0 4px var(--accent-glow)' : 'none',
            opacity: hasEffects ? 1 : 0.15,
            animationDuration: hasEffects ? beatDuration : undefined,
          }}
        />
        <span
          className="text-[9px] uppercase tracking-widest"
          style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}
        >
          FX ({sortedEffects.length})
        </span>
      </div>

      {/* Main content area */}
      {validSelectedId ? (
        <div
          className="flex-1 min-h-0 overflow-y-auto"
          style={{ padding: 8 }}
        >
          <EffectParameters_v2 effectId={validSelectedId} />
        </div>
      ) : (
        <div className="flex-1 min-h-0 relative overflow-hidden flex flex-col items-center justify-center gap-3">
          {/* Idle scan sweep — the instrument reads as armed and waiting, not dead */}
          <div aria-hidden className="surface-scanline" />
          {/* Breathing reticle */}
          <div className="alive-idle">
            <TechReadout value={0} size={64} color="var(--text-ghost)" className="opacity-40" />
          </div>
          <span
            className="text-[10px] uppercase tracking-widest alive-idle"
            style={{ color: 'var(--text-ghost)', animationDelay: '-2.25s' }}
          >
            Enable effects from the grid below
          </span>
        </div>
      )}
    </div>
  )
}
