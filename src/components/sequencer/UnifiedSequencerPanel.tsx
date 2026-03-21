import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { useEffectSequencerStore } from '../../stores/effectSequencerStore'
import { useSequencerContainerStore } from '../../stores/sequencerContainerStore'
import { useRoutingStore } from '../../stores/routingStore'
import { useMediaStore } from '../../stores/mediaStore'
import { useRecordingStore } from '../../stores/recordingStore'
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
import { EffectTabsBar } from './EffectTabsBar'
import { SequencerTransport } from './SequencerTransport'
import { EffectTrackRow } from './EffectTrackRow'
import { TrackParamPanel } from './TrackParamPanel'
import { Crosshair } from '../ui/MicroVisuals'

const ALL_EFFECTS: EffectDefinition[] = [
  ...EFFECTS,
  ...STRAND_EFFECTS,
  ...MOTION_EFFECTS,
  ...DESTRUCTION_EFFECTS,
]
const EFFECT_MAP = new Map(ALL_EFFECTS.map((e) => [e.id, e]))

export function UnifiedSequencerPanel({ hideTabsBar = false }: { hideTabsBar?: boolean } = {}) {

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
    }
  }, [selectedStep, selectedEffectId, setSelectedEffect])

  // ─── Linked play/stop (also toggles video/recording playback) ─────────
  const linkedPlay = useCallback(() => {
    play()
    const { source, videoElement } = useMediaStore.getState()
    const rec = useRecordingStore.getState()
    if (rec.duration > 0 && !rec.isRecording) {
      rec.play()
    } else if (source === 'file' && videoElement && videoElement.paused) {
      videoElement.play().catch(console.error)
    }
  }, [play])

  const linkedStop = useCallback(() => {
    stop()
    const { source, videoElement } = useMediaStore.getState()
    const rec = useRecordingStore.getState()
    if (rec.isPlaying) {
      rec.pause()
    } else if (source === 'file' && videoElement && !videoElement.paused) {
      videoElement.pause()
    }
  }, [stop])

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

      {/* ─── Zone 2: Transport ───────────────────────────────────────── */}
      <SequencerTransport
        isPlaying={isPlaying}
        bpm={bpm}
        resolution={resolution}
        swing={swing}
        currentStep={currentStep}
        stepPage={stepPage}
        onPlay={linkedPlay}
        onStop={linkedStop}
        onBpmChange={setBpm}
        onResolutionChange={setResolution}
        onSwingChange={setSwing}
        onPageChange={setStepPage}
      />

      {/* ─── Zone 3: Track list + param panel ───────────────────────── */}
      <div className="flex-1 min-h-0 flex">
        {/* Param panel column (full height, left side) */}
        {trackParamPanelOpen && tracks[trackParamPanelOpen] && (
          <TrackParamPanel effectId={trackParamPanelOpen} />
        )}

        {/* Track rows (scrollable) */}
        <div className="flex-1 min-w-0 overflow-y-auto" style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '4px 0' }}>
        {activeTrackIds.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-full gap-2"
            style={{ color: 'var(--text-ghost)' }}
          >
            <Crosshair value={0.3} size={40} color="var(--text-ghost)" className="opacity-25" />
            <span className="text-[10px] uppercase tracking-wider">
              Enable effects on the grid to add tracks
            </span>
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
                  label={def?.label ?? effectId}
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
    </div>
  )
}
