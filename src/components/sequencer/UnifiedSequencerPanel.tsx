import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useEffectSequencerStore } from '../../stores/effectSequencerStore'
import { EFFECT_PARAM_REGISTRY } from '../../config/effectParams'
import { useSequencerContainerStore } from '../../stores/sequencerContainerStore'
import { useUIStore } from '../../stores/uiStore'
import { useEffectSequencerPlayback } from '../../hooks/useEffectSequencerPlayback'
import { useActiveEffects } from '../../hooks/useActiveEffects'
import { PLockProvider, type PLockContextValue } from '../../contexts/PLockContext'
import {
  EFFECTS,
  STRAND_EFFECTS,
  MOTION_EFFECTS,
  DESTRUCTION_EFFECTS,
  type EffectDefinition,
} from '../../config/effects'
import { EffectParameters } from '../performance/ExpandedParameterPanel'
import { EffectTabsBar } from './EffectTabsBar'
import { ModTabsBar, type ParamView } from './ModTabsBar'
import { ModulationContent } from './ModulationContent'
import { SequencerTransport } from './SequencerTransport'
import { EffectTrackRow } from './EffectTrackRow'

const SEQ = '#9580FF'
const PLOCK = '#FFB830'

const ALL_EFFECTS: EffectDefinition[] = [
  ...EFFECTS,
  ...STRAND_EFFECTS,
  ...MOTION_EFFECTS,
  ...DESTRUCTION_EFFECTS,
]
const EFFECT_MAP = new Map(ALL_EFFECTS.map((e) => [e.id, e]))

export function UnifiedSequencerPanel() {
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
    setStepLock,
    clearStepLock,
    clearAllStepLocks,
    clearSelection,
  } = useEffectSequencerStore()

  // Initialize playback engine
  useEffectSequencerPlayback()

  // ─── Active effects (reactive to all store changes) ─────────────────────
  const { sortedEffects } = useActiveEffects()
  const activeEffectIds = useMemo(
    () => sortedEffects.map((e) => e.id),
    [sortedEffects],
  )

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

  // ─── Step preview: apply locks to effect when step is selected ───────
  const previewBaseRef = useRef<Record<string, number | string>>({})
  const selectedStepKey = selectedStep
    ? `${selectedStep.effectId}:${selectedStep.stepIndex}`
    : null

  useEffect(() => {
    if (!selectedStep || isPlaying) return

    const entry = EFFECT_PARAM_REGISTRY[selectedStep.effectId]
    if (!entry) return

    // Always capture current param values as base on step selection.
    // This is critical: the onChange calls during p-lock editing modify
    // the store directly for live preview. Without capturing/restoring,
    // the base values get corrupted and playback sees no difference.
    const base: Record<string, number | string> = {}
    for (const param of entry.getParams()) {
      base[param.id] = param.read()
    }
    if (entry.getSelectParams) {
      for (const param of entry.getSelectParams()) {
        base[param.id] = param.read()
      }
    }
    previewBaseRef.current = base

    // Apply any existing lock values for immediate preview
    const currentTracks = useEffectSequencerStore.getState().tracks
    const track = currentTracks[selectedStep.effectId]
    const step = track?.steps[selectedStep.stepIndex]
    if (step && Object.keys(step.locks).length > 0) {
      for (const param of entry.getParams()) {
        if (param.id in step.locks) {
          param.apply(step.locks[param.id] as number)
        }
      }
      if (entry.getSelectParams) {
        for (const param of entry.getSelectParams()) {
          if (param.id in step.locks) {
            param.apply(step.locks[param.id] as string)
          }
        }
      }
    }

    // Cleanup: restore base values on deselect or step change
    return () => {
      const restoreBase = previewBaseRef.current
      const restoreEntry = EFFECT_PARAM_REGISTRY[selectedStep.effectId]
      if (!restoreEntry || Object.keys(restoreBase).length === 0) return

      for (const param of restoreEntry.getParams()) {
        if (param.id in restoreBase) {
          param.apply(restoreBase[param.id] as number)
        }
      }
      if (restoreEntry.getSelectParams) {
        for (const param of restoreEntry.getSelectParams()) {
          if (param.id in restoreBase) {
            param.apply(restoreBase[param.id] as string)
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStepKey, isPlaying])

  // ─── P-lock context ───────────────────────────────────────────────────
  const plockContext = useMemo((): PLockContextValue | null => {
    if (!selectedStep || !validSelectedId) return null
    if (selectedStep.effectId !== validSelectedId) return null

    const track = tracks[selectedStep.effectId]
    if (!track) return null
    const step = track.steps[selectedStep.stepIndex]
    if (!step) return null

    return {
      active: true,
      effectId: selectedStep.effectId,
      stepIndex: selectedStep.stepIndex,
      locks: step.locks,
      setLock: (paramId: string, value: number) =>
        setStepLock(selectedStep.effectId, selectedStep.stepIndex, paramId, value),
      clearLock: (paramId: string) =>
        clearStepLock(selectedStep.effectId, selectedStep.stepIndex, paramId),
    }
  }, [selectedStep, validSelectedId, tracks, setStepLock, clearStepLock])

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

  // ─── P-lock header data ───────────────────────────────────────────────
  const selectedStepData = selectedStep
    ? tracks[selectedStep.effectId]?.steps[selectedStep.stepIndex]
    : null
  const selectedDef = selectedStep ? EFFECT_MAP.get(selectedStep.effectId) : null
  const lockCount = selectedStepData ? Object.keys(selectedStepData.locks).length : 0

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--bg-surface)' }}>
      {/* ─── Zone 1: Effect tabs ─────────────────────────────────────── */}
      <EffectTabsBar
        activeEffectIds={activeEffectIds}
        selectedEffectId={selectedEffectId}
        onSelect={handleEffectTabSelect}
      />

      {/* ─── Zone 2: Param area (always rendered for stable layout) ──── */}
      <div
        className="flex-shrink-0 overflow-y-auto"
        style={{
          height: 200,
          borderBottom: '1px solid var(--border)',
          padding: (validSelectedId || paramView !== 'effect')
            ? 'var(--panel-padding-sm) var(--panel-padding)'
            : 0,
        }}
      >
          {/* P-lock mode header */}
          {plockContext && paramView === 'effect' && selectedDef && (
            <div
              className="flex items-center justify-between"
              style={{ marginBottom: 6 }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="text-[9px] font-bold uppercase tracking-wider"
                  style={{ color: PLOCK }}
                >
                  P-Lock
                </span>
                <span
                  className="text-[10px] tabular-nums"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Step {selectedStep!.stepIndex + 1}
                </span>
                {lockCount > 0 && (
                  <span
                    className="text-[9px] tabular-nums"
                    style={{ color: PLOCK, opacity: 0.6 }}
                  >
                    {lockCount} lock{lockCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {lockCount > 0 && (
                  <button
                    onClick={() => clearAllStepLocks(selectedStep!.effectId, selectedStep!.stepIndex)}
                    className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm"
                    style={{
                      color: 'var(--text-ghost)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    Clear All
                  </button>
                )}
                <button
                  onClick={clearSelection}
                  className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm"
                  style={{
                    color: 'var(--text-ghost)',
                    border: '1px solid var(--border)',
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {paramView === 'effect' && validSelectedId ? (
            plockContext ? (
              <PLockProvider value={plockContext}>
                <EffectParameters effectId={validSelectedId} />
              </PLockProvider>
            ) : (
              <EffectParameters effectId={validSelectedId} />
            )
          ) : paramView !== 'effect' ? (
            <ModulationContent activeModulator={paramView} />
          ) : null}
      </div>

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
      <div className="flex-1 min-h-0 overflow-y-auto">
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
              />
            )
          })
        )}
      </div>
    </div>
  )
}
