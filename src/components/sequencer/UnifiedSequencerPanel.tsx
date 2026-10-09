import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { useEffectSequencerStore } from '../../stores/effectSequencerStore'
import { useSequencerContainerStore } from '../../stores/sequencerContainerStore'
import { useRoutingStore } from '../../stores/routingStore'
import { useUIStore } from '../../stores/uiStore'
import { useEffectSequencerPlayback } from '../../hooks/useEffectSequencerPlayback'
import { useWebMIDI } from '../../hooks/useWebMIDI'
import { useMIDINoteGate } from '../../hooks/useMIDINoteGate'
import { useActiveEffects } from '../../hooks/useActiveEffects'
import {
  EFFECTS,
  STRAND_EFFECTS,
  MOTION_EFFECTS,
  DESTRUCTION_EFFECTS,
  type EffectDefinition,
} from '../../config/effects'
import { SequencerTransport } from './SequencerTransport'
import { EffectTrackRow } from './EffectTrackRow'
import { getEffectInfo } from '../../config/effectNames'
import { TrackParamPanel } from './TrackParamPanel'
import { LinesView } from './LinesView'
import { linkedPlay, linkedStop } from '../../utils/sequencerTransport'
import { isInteractiveKeyTarget } from '../../utils/keyboard'

const ALL_EFFECTS: EffectDefinition[] = [
  ...EFFECTS,
  ...STRAND_EFFECTS,
  ...MOTION_EFFECTS,
  ...DESTRUCTION_EFFECTS,
]
const EFFECT_MAP = new Map(ALL_EFFECTS.map((e) => [e.id, e]))

export function UnifiedSequencerPanel() {

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
    setBpm,
    setResolution,
    setStepPage,
    setSwing,
    trackParamPanelOpen,
  } = useEffectSequencerStore()

  // Initialize playback engine
  useEffectSequencerPlayback()
  useWebMIDI()
  useMIDINoteGate()

  // ─── Active effects (reactive to all store changes) ─────────────────────
  const { sortedEffects } = useActiveEffects()
  const activeEffectIds = useMemo(
    () => sortedEffects.map((e) => e.id),
    [sortedEffects],
  )

  // DeviceChain owns ensureTrack + auto-select for active effects (always mounted in the bottom panel)

  // Active tracks (enabled effects that also have sequencer tracks)
  const activeTrackIds = useMemo(
    () => activeEffectIds.filter((id) => !!tracks[id]),
    [activeEffectIds, tracks],
  )

  // Steps | Lines (lines editor spec §4.1): the Lines view replaces the param panel and the track list
  const sequencerView = useUIStore((s) => s.sequencerView)
  const trackColors = useMemo(() => {
    const out: Record<string, string> = {}
    for (const id of activeTrackIds) out[id] = EFFECT_MAP.get(id)?.color ?? 'var(--text-muted)'
    return out
  }, [activeTrackIds])

  // ─── Auto-switch effect tab when step is selected on a track ──────────
  useEffect(() => {
    if (selectedStep && selectedStep.effectId !== selectedEffectId) {
      setSelectedEffect(selectedStep.effectId)
    }
  }, [selectedStep, selectedEffectId, setSelectedEffect])

  // ─── Effect tab click → switch to effect params ────────────────────────
  const handleEffectTabSelect = useCallback(
    (effectId: string) => {
      setSelectedEffect(effectId)
    },
    [setSelectedEffect],
  )

  // ─── Drag-to-reorder track rows (signal chain order) ─────────────────
  const { effectOrder, reorderEffect } = useRoutingStore()
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [dragSide, setDragSide] = useState<'top' | 'bottom'>('top')
  const draggedId = useRef<string | null>(null)

  const handleRowDragStart = useCallback((effectId: string, e: React.DragEvent) => {
    draggedId.current = effectId
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', effectId)
  }, [])

  const handleRowDragOver = useCallback((effectId: string, e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const midY = rect.top + rect.height / 2
    setDragOverId(effectId)
    setDragSide(e.clientY < midY ? 'top' : 'bottom')
  }, [])

  const handleRowDragLeave = useCallback(() => {
    setDragOverId(null)
  }, [])

  const handleRowDrop = useCallback(
    (targetId: string, e: React.DragEvent) => {
      e.preventDefault()
      const sourceId = draggedId.current
      if (!sourceId || sourceId === targetId) {
        setDragOverId(null)
        draggedId.current = null
        return
      }

      const fromIndex = effectOrder.indexOf(sourceId)
      let toIndex = effectOrder.indexOf(targetId)
      if (dragSide === 'bottom') toIndex++
      if (fromIndex < toIndex) toIndex--

      if (fromIndex !== -1 && toIndex >= 0 && fromIndex !== toIndex) {
        reorderEffect(fromIndex, toIndex)
      }

      setDragOverId(null)
      draggedId.current = null
    },
    [effectOrder, dragSide, reorderEffect],
  )

  const handleRowDragEnd = useCallback(() => {
    setDragOverId(null)
    draggedId.current = null
  }, [])

  // ─── Keyboard shortcuts ────────────────────────────────────────────────
  useEffect(() => {
    if (activeSequencer !== 'effects') return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInteractiveKeyTarget(e.target)) return

      const state = useEffectSequencerStore.getState()

      switch (e.key) {
        case ' ': {
          e.preventDefault()
          if (state.isPlaying) linkedStop()
          else linkedPlay()
          break
        }
        case 'Escape': {
          if (e.defaultPrevented) break // already handled (e.g. cancelled a routing assignment)
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
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: 'var(--bg-surface)' }}
      data-dock-empty={activeTrackIds.length === 0 || undefined}
    >
      {/* ─── Transport ───────────────────────────────────────── */}
      <SequencerTransport
        isPlaying={isPlaying}
        bpm={bpm}
        resolution={resolution}
        swing={swing}
        currentStep={currentStep}
        stepPage={stepPage}
        onPlay={linkedPlay}
        onStop={linkedStop}
        compact
        onBpmChange={setBpm}
        onResolutionChange={setResolution}
        onSwingChange={setSwing}
        onPageChange={setStepPage}
      />

      {sequencerView === 'lines' && activeTrackIds.length > 0 ? (
        <LinesView ids={activeTrackIds} colors={trackColors} />
      ) : (
      /* ─── Track list + param panel ───────────────────────── */
      <div className="flex-1 min-h-0 flex">
        {/* Param panel column (full height, left side) */}
        {trackParamPanelOpen && tracks[trackParamPanelOpen] && (
          <TrackParamPanel effectId={trackParamPanelOpen} />
        )}

        {/* Track rows (scrollable) */}
        <div className="flex-1 min-w-0 overflow-y-auto" style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '4px 0' }}>
        {activeTrackIds.length === 0 ? (
          <div className="seg-dock-empty">
            <p className="hud-label seg-dock-empty-title">Sequencer</p>
            <p data-dock-hint className="seg-dock-empty-hint">Effects you enable get a lane automatically.</p>
          </div>
        ) : (
          activeTrackIds.map((effectId, index) => {
            const def = EFFECT_MAP.get(effectId)
            const isSelectedTrack = effectId === selectedEffectId
            const isDragTarget = dragOverId === effectId
            return (
              <div
                key={effectId}
                draggable
                onDragStart={(e) => handleRowDragStart(effectId, e)}
                onDragOver={(e) => handleRowDragOver(effectId, e)}
                onDragLeave={handleRowDragLeave}
                onDrop={(e) => handleRowDrop(effectId, e)}
                onDragEnd={handleRowDragEnd}
                className="relative"
                style={{ cursor: 'grab' }}
              >
                {/* Drop indicator */}
                {isDragTarget && (
                  <div
                    className="absolute left-0 right-0 z-10"
                    style={{
                      [dragSide === 'top' ? 'top' : 'bottom']: -2,
                      height: 2,
                      backgroundColor: 'var(--seq-accent)',
                      boxShadow: '0 0 4px var(--seq-accent)',
                    }}
                  />
                )}
                <EffectTrackRow
                  effectId={effectId}
                  track={tracks[effectId]}
                  stepPage={stepPage}
                  currentStep={currentStep}
                  selectedStep={selectedStep}
                  color={def?.color ?? 'var(--text-muted)'}
                  label={getEffectInfo(effectId).name}
                  isSelectedTrack={isSelectedTrack}
                  onSelectTrack={handleEffectTabSelect}
                  orderIndex={index + 1}
                />
              </div>
            )
          })
        )}
        </div>
      </div>
      )}
    </div>
  )
}
