import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useEffectSequencerStore } from '../../stores/effectSequencerStore'
import { useSequencerContainerStore } from '../../stores/sequencerContainerStore'
import { useRoutingStore } from '../../stores/routingStore'
import { useEffectSequencerPlayback } from '../../hooks/useEffectSequencerPlayback'
import { EFFECT_PARAM_REGISTRY } from '../../config/effectParams'
import {
  EFFECTS,
  STRAND_EFFECTS,
  MOTION_EFFECTS,
  DESTRUCTION_EFFECTS,
  type EffectDefinition,
} from '../../config/effects'
import { PlayIcon, StopIcon } from '../ui/DotMatrixIcons'
import { EffectTrackRow } from './EffectTrackRow'
import { PLockDetail } from './PLockDetail'

// Build a lookup map for effect definitions
const ALL_EFFECTS: EffectDefinition[] = [
  ...EFFECTS,
  ...STRAND_EFFECTS,
  ...MOTION_EFFECTS,
  ...DESTRUCTION_EFFECTS,
]
const EFFECT_MAP = new Map(ALL_EFFECTS.map((e) => [e.id, e]))

const RESOLUTION_OPTIONS = ['1/4', '1/8', '1/16', '1/32'] as const

export function EffectSequencer() {
  const {
    tracks,
    bpm,
    resolution,
    isPlaying,
    currentStep,
    stepPage,
    selectedStep,
    swing,
    play,
    stop,
    setBpm,
    setResolution,
    setStepPage,
    setSwing,
  } = useEffectSequencerStore()

  const effectOrder = useRoutingStore((s) => s.effectOrder)
  const activeSequencer = useSequencerContainerStore((s) => s.activeSequencer)

  // Initialize playback engine
  useEffectSequencerPlayback()

  // Container ref for focus management
  const containerRef = useRef<HTMLDivElement>(null)

  // ─── Keyboard shortcuts ────────────────────────────────────────────────
  useEffect(() => {
    if (activeSequencer !== 'effects') return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      const state = useEffectSequencerStore.getState()

      switch (e.key) {
        case ' ': {
          e.preventDefault()
          if (state.isPlaying) state.stop()
          else state.play()
          break
        }
        case 'Escape': {
          state.clearSelection()
          break
        }
        case 'ArrowRight': {
          e.preventDefault()
          if (state.selectedStep) {
            const next = Math.min(63, state.selectedStep.stepIndex + 1)
            state.selectStep(state.selectedStep.effectId, next)
            // Auto-advance page
            const newPage = Math.floor(next / 16)
            if (newPage !== state.stepPage) state.setStepPage(newPage)
          }
          break
        }
        case 'ArrowLeft': {
          e.preventDefault()
          if (state.selectedStep) {
            const prev = Math.max(0, state.selectedStep.stepIndex - 1)
            state.selectStep(state.selectedStep.effectId, prev)
            const newPage = Math.floor(prev / 16)
            if (newPage !== state.stepPage) state.setStepPage(newPage)
          }
          break
        }
        case '1':
        case '2':
        case '3':
        case '4': {
          if (!e.metaKey && !e.ctrlKey && !e.altKey) {
            state.setStepPage(parseInt(e.key) - 1)
          }
          break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeSequencer])

  // Ordered list of active tracks (effects that have tracks AND are enabled)
  const activeTrackIds = useMemo(() => {
    return effectOrder.filter((id) => {
      if (!tracks[id]) return false
      const entry = EFFECT_PARAM_REGISTRY[id]
      return entry ? entry.getEnabled() : false
    })
  }, [effectOrder, tracks])

  // BPM drag handler
  const handleBpmDrag = useCallback(
    (e: React.MouseEvent) => {
      const startY = e.clientY
      const startBpm = bpm

      const handleMove = (ev: MouseEvent) => {
        const deltaY = startY - ev.clientY
        setBpm(Math.round(startBpm + deltaY / 2))
      }
      const handleUp = () => {
        window.removeEventListener('mousemove', handleMove)
        window.removeEventListener('mouseup', handleUp)
      }
      window.addEventListener('mousemove', handleMove)
      window.addEventListener('mouseup', handleUp)
    },
    [bpm, setBpm],
  )

  // Swing drag handler
  const handleSwingDrag = useCallback(
    (e: React.MouseEvent) => {
      const startY = e.clientY
      const startSwing = swing

      const handleMove = (ev: MouseEvent) => {
        const deltaY = startY - ev.clientY
        setSwing(Math.round(startSwing + deltaY / 2))
      }
      const handleUp = () => {
        window.removeEventListener('mousemove', handleMove)
        window.removeEventListener('mouseup', handleUp)
      }
      window.addEventListener('mousemove', handleMove)
      window.addEventListener('mouseup', handleUp)
    },
    [swing, setSwing],
  )

  // Resolution cycle
  const handleResolutionCycle = useCallback(() => {
    const idx = RESOLUTION_OPTIONS.indexOf(resolution as typeof RESOLUTION_OPTIONS[number])
    const next = (idx + 1) % RESOLUTION_OPTIONS.length
    setResolution(RESOLUTION_OPTIONS[next])
  }, [resolution, setResolution])

  // Get selected step data
  const selectedStepData = selectedStep
    ? tracks[selectedStep.effectId]?.steps[selectedStep.stepIndex]
    : null
  const selectedDef = selectedStep ? EFFECT_MAP.get(selectedStep.effectId) : null

  return (
    <div ref={containerRef} className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg-surface)' }}>
      {/* ─── Transport bar ──────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 flex items-center"
        style={{
          height: 56,
          padding: '0 var(--panel-padding)',
          gap: 'var(--space-3)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {/* Play/Stop */}
        <button
          onClick={isPlaying ? stop : play}
          className="w-8 h-8 flex items-center justify-center rounded-sm transition-all"
          style={{
            backgroundColor: isPlaying ? 'var(--accent)' : 'var(--bg-elevated)',
            border: `1px solid ${isPlaying ? 'var(--accent)' : 'var(--border)'}`,
            boxShadow: isPlaying ? '0 0 8px var(--accent-glow)' : 'none',
          }}
        >
          {isPlaying ? (
            <StopIcon size={12} color="var(--bg-primary)" />
          ) : (
            <PlayIcon size={12} color="var(--text-muted)" />
          )}
        </button>

        {/* BPM */}
        <div
          className="text-[13px] cursor-ns-resize select-none"
          style={{ color: 'var(--text-secondary)' }}
          onMouseDown={handleBpmDrag}
        >
          <span style={{ opacity: 0.5 }}>BPM</span>{' '}
          <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
            {String(bpm).padStart(3, '0')}
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-4" style={{ backgroundColor: 'var(--border)' }} />

        {/* Resolution */}
        <button
          onClick={handleResolutionCycle}
          className="text-[12px] font-bold px-2 py-1 rounded-sm"
          style={{
            color: 'var(--text-secondary)',
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
          }}
        >
          {resolution}
        </button>

        {/* Swing */}
        <div
          className="text-[12px] cursor-ns-resize select-none"
          style={{ color: 'var(--text-muted)' }}
          onMouseDown={handleSwingDrag}
        >
          <span style={{ opacity: 0.5 }}>SWG</span>{' '}
          <span>{swing}</span>
        </div>

        {/* Divider */}
        <div className="w-px h-4" style={{ backgroundColor: 'var(--border)' }} />

        {/* Step position */}
        <span
          className="text-[12px] tabular-nums"
          style={{ color: 'var(--text-ghost)' }}
        >
          {(currentStep % 8) + 1}/8
        </span>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Page dots */}
        <div className="flex items-center gap-1.5">
          {[0, 1, 2, 3].map((page) => {
            const isActive = page === stepPage
            const hasPlayhead =
              isPlaying &&
              currentStep >= page * 8 &&
              currentStep < (page + 1) * 8
            return (
              <button
                key={page}
                onClick={() => setStepPage(page)}
                className="w-3 h-3 rounded-full transition-all"
                style={{
                  backgroundColor: isActive
                    ? 'var(--text-primary)'
                    : hasPlayhead
                      ? 'var(--text-muted)'
                      : 'transparent',
                  border: `2px solid ${
                    isActive ? 'var(--text-primary)' : 'var(--text-muted)'
                  }`,
                  opacity: isActive ? 1 : 0.4,
                }}
                title={`Page ${page + 1}`}
              />
            )
          })}
        </div>
      </div>

      {/* ─── Track list ─────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTrackIds.length === 0 ? (
          <div className="relative h-full overflow-hidden">
            {/* Idle scan sweep — powered-on instrument awaiting tracks */}
            <div className="surface-scanline" style={{ animationDuration: '7s' }} />
            <div
              className="alive-idle flex items-center justify-center h-full text-[11px] uppercase tracking-wider"
              style={{ color: 'var(--text-ghost)' }}
            >
              Enable effects on the grid to add tracks
            </div>
          </div>
        ) : (
          activeTrackIds.map((effectId) => {
            const def = EFFECT_MAP.get(effectId)
            return (
              <EffectTrackRow
                key={effectId}
                effectId={effectId}
                track={tracks[effectId]}
                stepPage={stepPage}
                currentStep={currentStep}
                selectedStep={selectedStep}
                color={def?.color ?? 'var(--text-muted)'}
                label={def?.label ?? effectId}
              />
            )
          })
        )}
      </div>

      {/* ─── P-lock detail (slide transition) ─────────────────────── */}
      <div
        className="flex-shrink-0 overflow-hidden"
        style={{
          maxHeight: selectedStep && selectedStepData && selectedDef ? 200 : 0,
          borderTop: selectedStep && selectedStepData && selectedDef
            ? '1px solid var(--border)' : '1px solid transparent',
          transition: 'max-height 0.15s ease-out, border-color 0.15s',
        }}
      >
        {selectedStep && selectedStepData && selectedDef && (
          <PLockDetail
            effectId={selectedStep.effectId}
            stepIndex={selectedStep.stepIndex}
            step={selectedStepData}
            color={selectedDef.color}
            label={selectedDef.label}
          />
        )}
      </div>
    </div>
  )
}
