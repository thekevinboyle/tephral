import { useCallback, useEffect, useMemo, useState } from 'react'
import { useEffectSequencerStore } from '../../stores/effectSequencerStore'
import { useSequencerContainerStore } from '../../stores/sequencerContainerStore'
import { useUIStore } from '../../stores/uiStore'
import { useEffectSequencerPlayback } from '../../hooks/useEffectSequencerPlayback'
import { useActiveEffects } from '../../hooks/useActiveEffects'
import {
  EFFECTS,
  STRAND_EFFECTS,
  MOTION_EFFECTS,
  DESTRUCTION_EFFECTS,
  type EffectDefinition,
} from '../../config/effects'
import { EffectTabsBar } from './EffectTabsBar'
import { ModTabsBar, type ParamView } from './ModTabsBar'
import { ModulationContent } from './ModulationContent'
import { SequencerTransport } from './SequencerTransport'
import { EffectTrackRow } from './EffectTrackRow'

const ALL_EFFECTS: EffectDefinition[] = [
  ...EFFECTS,
  ...STRAND_EFFECTS,
  ...MOTION_EFFECTS,
  ...DESTRUCTION_EFFECTS,
]
const EFFECT_MAP = new Map(ALL_EFFECTS.map((e) => [e.id, e]))

export function UnifiedSequencerPanel({ hideTabsBar = false }: { hideTabsBar?: boolean } = {}) {
  // Local state for param view switching
  const [paramView, setParamView] = useState<ParamView>('effect')

  // Store hooks
  const { selectedEffectId, setSelectedEffect } = useUIStore()
  const activeSequencer = useSequencerContainerStore((s) => s.activeSequencer)

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
    ensureTrack,
  } = useEffectSequencerStore()

  // Initialize playback engine
  useEffectSequencerPlayback()

  // ─── Active effects (reactive to all store changes) ─────────────────────
  const { sortedEffects } = useActiveEffects()
  const activeEffectIds = useMemo(
    () => sortedEffects.map((e) => e.id),
    [sortedEffects],
  )

  // Ensure all active effects have sequencer tracks
  useEffect(() => {
    for (const id of activeEffectIds) {
      ensureTrack(id)
    }
  }, [activeEffectIds, ensureTrack])

  // Active tracks (enabled effects that also have sequencer tracks)
  const activeTrackIds = useMemo(
    () => activeEffectIds.filter((id) => !!tracks[id]),
    [activeEffectIds, tracks],
  )

  // ─── Auto-select / clear stale selection ──────────────────────────────
  const validSelectedId = selectedEffectId && activeEffectIds.includes(selectedEffectId)
    ? selectedEffectId
    : null

  useEffect(() => {
    if (selectedEffectId && !activeEffectIds.includes(selectedEffectId)) {
      setSelectedEffect(activeEffectIds.length > 0 ? activeEffectIds[0] : null)
    } else if (!selectedEffectId && activeEffectIds.length > 0) {
      setSelectedEffect(activeEffectIds[0])
    }
  }, [activeEffectIds, selectedEffectId, setSelectedEffect])

  // ─── Auto-switch effect tab when step is selected on a track ──────────
  useEffect(() => {
    if (selectedStep && selectedStep.effectId !== selectedEffectId) {
      setSelectedEffect(selectedStep.effectId)
      setParamView('effect')
    }
  }, [selectedStep, selectedEffectId, setSelectedEffect])

  // ─── Effect tab click → switch to effect params ────────────────────────
  const handleEffectTabSelect = useCallback(
    (effectId: string) => {
      setSelectedEffect(effectId)
      setParamView('effect')
    },
    [setSelectedEffect],
  )

  // ─── Mod tab click → toggle modulator view ─────────────────────────────
  const handleModSelect = useCallback(
    (view: ParamView) => {
      setParamView(view)
    },
    [],
  )

  // ─── Keyboard shortcuts ────────────────────────────────────────────────
  useEffect(() => {
    if (activeSequencer !== 'effects') return

    const handleKeyDown = (e: KeyboardEvent) => {
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
          state.clearAutomationParam()
          break
        }
        case 'ArrowRight': {
          e.preventDefault()
          if (state.selectedStep) {
            const next = Math.min(31, state.selectedStep.stepIndex + 1)
            state.selectStep(state.selectedStep.effectId, next)
            const newPage = Math.floor(next / 8)
            if (newPage !== state.stepPage) state.setStepPage(newPage)
          }
          break
        }
        case 'ArrowLeft': {
          e.preventDefault()
          if (state.selectedStep) {
            const prev = Math.max(0, state.selectedStep.stepIndex - 1)
            state.selectStep(state.selectedStep.effectId, prev)
            const newPage = Math.floor(prev / 8)
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

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg-surface)' }}>
      {/* ─── Zone 1: Effect tabs ─────────────────────────────────────── */}
      {!hideTabsBar && (
        <EffectTabsBar
          activeEffectIds={activeEffectIds}
          selectedEffectId={selectedEffectId}
          onSelect={handleEffectTabSelect}
        />
      )}

      {/* ─── Zone 2: Modulation content ────────────────────────────── */}
      {paramView !== 'effect' && (
        <div
          className="flex-shrink-0 overflow-y-auto"
          style={{
            maxHeight: 200,
            borderBottom: '1px solid var(--border)',
            padding: 'var(--panel-padding-sm) var(--panel-padding)',
          }}
        >
          <ModulationContent activeModulator={paramView} />
        </div>
      )}

      {/* ─── Zone 3: Mod tabs ────────────────────────────────────────── */}
      <ModTabsBar activeView={paramView} onSelectMod={handleModSelect} />

      {/* ─── Zone 4: Transport ───────────────────────────────────────── */}
      <SequencerTransport
        isPlaying={isPlaying}
        bpm={bpm}
        resolution={resolution}
        swing={swing}
        currentStep={currentStep}
        stepPage={stepPage}
        onPlay={play}
        onStop={stop}
        onBpmChange={setBpm}
        onResolutionChange={setResolution}
        onSwingChange={setSwing}
        onPageChange={setStepPage}
      />

      {/* ─── Zone 5: Track list ──────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto" style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '4px 0' }}>
        {activeTrackIds.length === 0 ? (
          <div
            className="flex items-center justify-center h-full text-[10px] uppercase tracking-wider"
            style={{ color: 'var(--text-ghost)' }}
          >
            Enable effects on the grid to add tracks
          </div>
        ) : (
          activeTrackIds.map((effectId) => {
            const def = EFFECT_MAP.get(effectId)
            const isSelectedTrack = effectId === selectedEffectId
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
                isSelectedTrack={isSelectedTrack}
                onSelectTrack={handleEffectTabSelect}
              />
            )
          })
        )}
      </div>
    </div>
  )
}
