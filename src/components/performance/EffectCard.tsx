import { useCallback, useMemo } from 'react'
import type { ActiveEffect } from '../../hooks/useActiveEffects'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { useSequencerStore } from '../../stores/sequencerStore'
import { useModulationStore } from '../../stores/modulationStore'
import { usePolyEuclidStore } from '../../stores/polyEuclidStore'
import { CompactEffectParams } from './CompactEffectParams'
import { EffectParameters } from './ExpandedParameterPanel'

// Modulation source colors (shared with Knob)
const SPECIAL_SOURCES: Record<string, { name: string; color: string }> = {
  euclidean: { name: 'Euclidean', color: '#FF0055' },
  ricochet: { name: 'Ricochet', color: '#FF0055' },
  lfo: { name: 'LFO', color: '#00D4FF' },
  random: { name: 'Random', color: '#FF6B6B' },
  step: { name: 'Step', color: '#4ECDC4' },
  envelope: { name: 'Envelope', color: '#AA55FF' },
  sampleHold: { name: 'S&H', color: '#AAFF00' },
}
const POLY_EUCLID_COLOR = '#FF0055'
const STEP_SEQ_COLOR = '#FF9500'

interface EffectCardProps {
  effect: ActiveEffect
  mode: 'compact' | 'full'
  isBypassed: boolean
  isSelected: boolean
  onBypass: () => void
  onRemove: () => void
  onSelect: () => void
  onToggleExpand: () => void
  onPointerDown: (e: React.PointerEvent) => void
  onPointerMove: (e: React.PointerEvent) => void
  onPointerUp: (e: React.PointerEvent) => void
  isDragging: boolean
  isDropTarget: boolean
}

// SVG icon components
function ChevronRight({ color }: { color: string }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M3.5 2L6.5 5L3.5 8" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronDown({ color }: { color: string }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M2 3.5L5 6.5L8 3.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function BypassIcon({ color, active }: { color: string; active: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="5" stroke={color} strokeWidth="1.2" />
      {active && <line x1="3.5" y1="3.5" x2="10.5" y2="10.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" />}
    </svg>
  )
}

function RemoveIcon({ color }: { color: string }) {
  return (
    <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
      <line x1="4" y1="4" x2="10" y2="10" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10" y1="4" x2="4" y2="10" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/** Bypass button with modulation routing support */
function ModBypassButton({ effectId, effectColor, isBypassed, onBypass }: {
  effectId: string
  effectColor: string
  isBypassed: boolean
  onBypass: () => void
}) {
  const paramId = `${effectId}.bypass`
  const {
    addRouting, routings, removeRouting,
    tracks: seqTracks,
    assigningTrack: assigningStepTrack,
    setAssigningTrack: setAssigningStepTrack,
  } = useSequencerStore()
  const { assigningModulator } = useModulationStore()
  const {
    assigningTrack: assigningPolyEuclid,
    tracks: polyEuclidTracks,
    setAssigningTrack: setAssigningPolyEuclid,
  } = usePolyEuclidStore()

  const isInAssignmentMode = assigningModulator !== null || assigningPolyEuclid !== null || assigningStepTrack !== null
  const paramRoutings = routings.filter(r => r.targetParam === paramId)
  const hasRouting = paramRoutings.length > 0
  const firstRouting = hasRouting ? paramRoutings[0] : null

  const sourceInfo = useMemo(() => {
    if (!firstRouting) return null
    if (firstRouting.trackId.startsWith('polyEuclid-')) {
      const polyTrackId = firstRouting.trackId.replace('polyEuclid-', '')
      const polyTrack = polyEuclidTracks.find(t => t.id === polyTrackId)
      if (polyTrack) return { name: `Euclid T${polyEuclidTracks.indexOf(polyTrack) + 1}`, color: POLY_EUCLID_COLOR }
    }
    const stepTrack = seqTracks.find(t => t.id === firstRouting.trackId)
    if (stepTrack) return { name: `Step T${seqTracks.indexOf(stepTrack) + 1}`, color: STEP_SEQ_COLOR }
    return SPECIAL_SOURCES[firstRouting.trackId] || null
  }, [firstRouting, seqTracks, polyEuclidTracks])

  const assigningColor = assigningModulator
    ? SPECIAL_SOURCES[assigningModulator]?.color
    : assigningPolyEuclid
      ? POLY_EUCLID_COLOR
      : assigningStepTrack
        ? STEP_SEQ_COLOR
        : undefined

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()

    if (isInAssignmentMode) {
      let trackId: string | null = null
      if (assigningModulator) trackId = assigningModulator
      else if (assigningPolyEuclid) trackId = `polyEuclid-${assigningPolyEuclid}`
      else if (assigningStepTrack) trackId = assigningStepTrack

      if (trackId) {
        const existing = routings.find(r => r.trackId === trackId && r.targetParam === paramId)
        if (!existing) {
          addRouting(trackId, paramId, 1.0)
          if (assigningPolyEuclid) setAssigningPolyEuclid(null)
          if (assigningStepTrack) setAssigningStepTrack(null)
        }
      }
      return
    }

    onBypass()
  }, [isInAssignmentMode, paramId, assigningModulator, assigningPolyEuclid, assigningStepTrack, routings, addRouting, setAssigningPolyEuclid, setAssigningStepTrack, onBypass])

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (firstRouting) removeRouting(firstRouting.id)
  }, [firstRouting, removeRouting])

  const routingBorder = hasRouting && sourceInfo
    ? `1px solid ${sourceInfo.color}`
    : isInAssignmentMode && !hasRouting
      ? `1px solid ${assigningColor}`
      : undefined

  return (
    <button
      onPointerDown={(e) => e.stopPropagation()}
      onClick={handleClick}
      onDoubleClick={hasRouting ? handleDoubleClick : undefined}
      className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full relative"
      style={{
        opacity: hasRouting ? 1 : isBypassed ? 0.8 : 0.4,
        border: routingBorder || 'none',
        boxShadow: hasRouting && sourceInfo ? `0 0 4px ${sourceInfo.color}40` : undefined,
        transition: 'opacity 150ms',
      }}
      title={hasRouting && sourceInfo
        ? `Bypass modulated by ${sourceInfo.name} — double-click to remove`
        : isInAssignmentMode
          ? 'Click to assign modulation to bypass'
          : 'Bypass'
      }
    >
      <BypassIcon
        color={hasRouting && sourceInfo ? sourceInfo.color : isBypassed ? effectColor : 'var(--text-muted)'}
        active={isBypassed}
      />
      {/* Assignment mode plus icon */}
      {isInAssignmentMode && !hasRouting && (
        <div
          className="absolute -right-1 -top-1 w-3 h-3 rounded-full flex items-center justify-center pointer-events-none"
          style={{
            backgroundColor: assigningColor,
            boxShadow: `0 0 4px ${assigningColor}`,
          }}
        >
          <svg width="8" height="8" viewBox="0 0 10 10">
            <path d="M5 2v6M2 5h6" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      )}
      {/* Routing indicator dot */}
      {hasRouting && sourceInfo && (
        <div
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full pointer-events-none"
          style={{
            backgroundColor: sourceInfo.color,
            boxShadow: `0 0 4px ${sourceInfo.color}`,
          }}
        />
      )}
    </button>
  )
}

export function EffectCard({
  effect,
  mode,
  isBypassed,
  isSelected,
  onBypass,
  onRemove,
  onSelect,
  onToggleExpand,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  isDragging,
  isDropTarget,
}: EffectCardProps) {
  const { effectBypassed } = useGlitchEngineStore()
  void effectBypassed // used for reactivity via isBypassed prop

  if (mode === 'compact') {
    return (
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={onSelect}
        onDoubleClick={onRemove}
        className="select-none touch-none cursor-grab active:cursor-grabbing"
        style={{
          backgroundColor: '#1a1a2e',
          borderRadius: 6,
          opacity: isBypassed ? 0.35 : isDragging ? 0.8 : 1,
          transform: isDragging ? 'scale(1.02)' : 'scale(1)',
          boxShadow: isDragging
            ? '0 4px 16px rgba(0,0,0,0.5)'
            : isSelected
              ? `0 0 0 1px ${effect.color}40`
              : '0 1px 3px rgba(0,0,0,0.3)',
          marginTop: isDropTarget ? 24 : 0,
          transition: 'margin-top 150ms, opacity 150ms, transform 100ms, box-shadow 150ms',
          overflow: 'hidden',
        }}
      >
        {/* Header row — colored name + rule + actions */}
        <div
          className="flex items-center gap-1.5 px-2"
          style={{ height: 26 }}
        >
          {/* Chevron */}
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onToggleExpand() }}
            className="flex-shrink-0 flex items-center justify-center"
            style={{ opacity: 0.7 }}
            title="Expand parameters"
          >
            <ChevronRight color={effect.color} />
          </button>

          {/* Effect name in effect color */}
          <span
            className="text-[11px] uppercase tracking-wide font-semibold flex-shrink-0"
            style={{ color: effect.color }}
          >
            {effect.label}
          </span>

          {/* Horizontal rule */}
          <div
            className="flex-1 h-px"
            style={{ backgroundColor: `${effect.color}30` }}
          />

          {/* Bypass */}
          <ModBypassButton effectId={effect.id} effectColor={effect.color} isBypassed={isBypassed} onBypass={onBypass} />

          {/* Remove */}
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onRemove() }}
            className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full opacity-30 hover:opacity-100 transition-opacity"
            title="Remove"
          >
            <RemoveIcon color="var(--text-muted)" />
          </button>
        </div>

        {/* Knobs row */}
        <div
          className="flex items-start justify-start px-3 pb-2"
          onPointerDown={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
        >
          <CompactEffectParams effectId={effect.id} color={effect.color} />
        </div>
      </div>
    )
  }

  // Full mode — fills entire panel
  return (
    <div
      className="flex flex-col select-none"
      style={{
        flex: 1,
        minHeight: 0,
        backgroundColor: '#1a1a2e',
        borderRadius: 6,
        opacity: isBypassed ? 0.4 : 1,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-1.5 px-2 flex-shrink-0"
        style={{ height: 30, borderBottom: `1px solid ${effect.color}20` }}
      >
        {/* Chevron */}
        <button
          onClick={onToggleExpand}
          className="flex-shrink-0 flex items-center justify-center"
          title="Collapse parameters"
        >
          <ChevronDown color={effect.color} />
        </button>

        {/* Effect name */}
        <span
          className="text-[11px] uppercase tracking-wide font-semibold flex-shrink-0"
          style={{ color: effect.color }}
        >
          {effect.label}
        </span>

        {/* Horizontal rule */}
        <div
          className="flex-1 h-px"
          style={{ backgroundColor: `${effect.color}30` }}
        />

        {/* Bypass */}
        <ModBypassButton effectId={effect.id} effectColor={effect.color} isBypassed={isBypassed} onBypass={onBypass} />

        {/* Remove */}
        <button
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full opacity-30 hover:opacity-100 transition-opacity"
          title="Remove"
        >
          <RemoveIcon color="var(--text-muted)" />
        </button>
      </div>

      {/* Full parameters — scrollable, fills remaining space */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2">
        <EffectParameters effectId={effect.id} />
      </div>
    </div>
  )
}
