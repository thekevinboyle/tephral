import { memo } from 'react'
import { EffectButton } from './EffectButton'
import { getEffectsForPage, PAGE_NAMES } from '../../config/effects'
import { getEffectInfo, EFFECT_CATEGORIES } from '../../config/effectNames'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { useUIStore } from '../../stores/uiStore'
import { useVisionTrackingStore } from '../../stores/visionTrackingStore'
import { useEffectSequencerStore } from '../../stores/effectSequencerStore'
import { toggleEffect, useEnabledEffectIds } from '../../hooks/useEffectToggle'
import { getEffectStatusText, getPageStatusText } from '../../config/statusDescriptions'
import { DataGrid } from '../ui/MicroVisuals'

export const PerformanceGrid = memo(function PerformanceGrid() {
  // Narrow selectors only: param ticks must not re-render the grid. Enabled flags come from one string-keyed subscription.
  const enabled = useEnabledEffectIds()
  const soloEffectId = useGlitchEngineStore((s) => s.soloEffectId)
  const effectMix = useGlitchEngineStore((s) => s.effectMix)
  const setEffectMix = useGlitchEngineStore((s) => s.setEffectMix)

  // Transport clock — page LEDs pulse on the beat while playing,
  // fall back to the slow ambient breathe (class default) when paused
  const bpm = useEffectSequencerStore((s) => s.bpm)
  const seqPlaying = useEffectSequencerStore((s) => s.isPlaying)
  const beatDuration = seqPlaying ? `${60 / bpm}s` : undefined

  const gridPage = useUIStore((s) => s.gridPage)
  const setGridPage = useUIStore((s) => s.setGridPage)
  const setStatusText = useUIStore((s) => s.setStatusText)

  // Check if an effect is soloed
  const isSoloing = soloEffectId !== null

  // Face/hand blob tracking has no pad but still runs on the Vision page
  const visionTrackingOn = useVisionTrackingStore((s) => s.faceEnabled || s.handsEnabled)

  // A page's LED lights when any of its effects is enabled
  const pageHasActiveEffects = (pageIndex: number): boolean =>
    (pageIndex === 1 && visionTrackingOn) || getEffectsForPage(pageIndex).some((e) => enabled.has(e.id))

  // Get effects for current page
  const pageEffects = getEffectsForPage(gridPage)

  // Create 16 slots for 4x4 grid
  const gridSlots = [...pageEffects]
  while (gridSlots.length < 16) {
    gridSlots.push(null as unknown as typeof pageEffects[0])
  }

  return (
    <div
      className="h-full w-full flex flex-col p-2"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(112, 112, 112, 0.03) 0%, transparent 70%)',
      }}
    >
      {/* Page navigation */}
      <div className="flex items-center justify-center mb-1.5 px-1 w-full">
        <div className="flex items-center gap-0.5 seg-page-tabs">
          {PAGE_NAMES.map((name, index) => {
            const hasActive = pageHasActiveEffects(index)
            const isSelected = gridPage === index
            return (
              <button
                key={index}
                onClick={() => setGridPage(index)}
                onMouseEnter={() => setStatusText(getPageStatusText(name))}
                onMouseLeave={() => setStatusText(null)}
                className="flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-medium rounded-sm transition-colors press-physical"
                style={{
                  backgroundColor: isSelected ? 'var(--bg-elevated)' : 'transparent',
                  color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}
              >
                {/* LED indicator - always reserve space; pulses with the transport when its page runs effects */}
                <span
                  className={`w-1 h-1 rounded-full flex-shrink-0 transition-opacity ${hasActive ? 'alive-idle' : ''}`}
                  style={{
                    backgroundColor: 'var(--accent)',
                    boxShadow: hasActive ? '0 0 4px var(--accent-glow)' : 'none',
                    opacity: hasActive ? 1 : 0,
                    animationDuration: hasActive ? beatDuration : undefined,
                  }}
                />
                {EFFECT_CATEGORIES[index]?.name ?? name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Effect grid */}
      {/* 4 x 4, or 3 columns when the browser panel is under 340px wide (see layout.css .seg-pad-grid) */}
      <div className="flex-1 min-h-0 grid gap-1.5 seg-pad-grid">
        {gridSlots.map((effect, index) => {
          if (!effect) {
            // Empty placeholder cell
            return (
              <div
                key={`empty-${index}`}
                data-pad-empty
                className="rounded-sm flex items-center justify-center"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                }}
              >
                <DataGrid value={0.05} size={20} color="var(--text-ghost)" className="opacity-10" />
              </div>
            )
          }

          // Reserved slot styling
          if (effect.id.includes('reserved')) {
            return (
              <div
                key={effect.id}
                data-pad-empty
                aria-hidden
                className="rounded-sm"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px dashed var(--border)',
                }}
              />
            )
          }

          const isSoloed = soloEffectId === effect.id
          const active = enabled.has(effect.id)
          const isMuted = isSoloing && !isSoloed && active

          return (
            <EffectButton
              key={effect.id}
              id={effect.id}
              label={getEffectInfo(effect.id).name}
              color={effect.color}
              active={active}
              mix={effectMix[effect.id] ?? 1}
              onToggle={() => toggleEffect(effect.id)}
              onMixChange={(v) => setEffectMix(effect.id, v)}
              isSoloed={isSoloed}
              isMuted={isMuted}
              statusText={getEffectStatusText(effect.id)}
            />
          )
        })}
      </div>
    </div>
  )
})
