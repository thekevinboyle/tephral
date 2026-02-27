import { useRef, useCallback, useMemo, useState, useEffect } from 'react'
import { useSequencerStore } from '../../stores/sequencerStore'
import { useModulationStore } from '../../stores/modulationStore'
import { usePolyEuclidStore } from '../../stores/polyEuclidStore'
import { useUIStore } from '../../stores/uiStore'
import { useEffectSequencerStore } from '../../stores/effectSequencerStore'
import { ModulationContextMenu } from './controls/ModulationContextMenu'
import { getParamStatusText } from '../../config/statusDescriptions'

// Modulation source colors (same as SliderRow)
const SPECIAL_SOURCES: Record<string, { name: string; color: string }> = {
  euclidean: { name: 'Euclidean', color: '#FF0055' },
  ricochet: { name: 'Ricochet', color: '#FF0055' },
  random: { name: 'Random', color: '#FF6B6B' },
  step: { name: 'Step', color: '#4ECDC4' },
  envelope: { name: 'Envelope', color: '#AA55FF' },
  sampleHold: { name: 'S&H', color: '#AAFF00' },
}

function getSourceInfo(trackId: string): { name: string; color: string } | null {
  if (trackId.startsWith('lfo-')) {
    const idx = parseInt(trackId.split('-')[1])
    return { name: `LFO ${idx + 1}`, color: '#707070' }
  }
  if (trackId.startsWith('audio-')) {
    const AUDIO_SOURCES: Record<string, { name: string; color: string }> = {
      'audio-sub': { name: 'Sub', color: '#FF3333' },
      'audio-mid': { name: 'Mid', color: '#FF8800' },
      'audio-high': { name: 'High', color: '#33CCFF' },
      'audio-hit': { name: 'Hit', color: '#FF00FF' },
    }
    return AUDIO_SOURCES[trackId] || null
  }
  return SPECIAL_SOURCES[trackId] || null
}
const POLY_EUCLID_COLOR = '#FF0055'
const STEP_SEQ_COLOR = '#FF9500'

interface KnobProps {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  color?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  onChange: (value: number) => void
  formatValue?: (value: number) => string
  paramId?: string
  showArc?: boolean
  showValue?: boolean
  statusText?: string
}

// SVG arc path helper — 270 degree sweep from -135 to +135
const ARC_RADIUS = 46

export function Knob({
  label,
  value,
  min = 0,
  max = 100,
  step,
  color = 'var(--text-muted)',
  size = 'md',
  onChange,
  formatValue,
  paramId,
  showArc = false,
  showValue = false,
  statusText,
}: KnobProps) {
  const resolvedStatusText = statusText ?? getParamStatusText(label)

  const dragStartY = useRef<number | null>(null)
  const dragStartValue = useRef<number>(0)
  const didDrag = useRef(false)

  // Depth-drag assignment refs/state
  const depthAssignSource = useRef<string | null>(null)
  const depthAssignStartY = useRef(0)
  const depthAssignValue = useRef(0)
  const [isDepthDragging, setIsDepthDragging] = useState(false)
  const [depthDragDisplay, setDepthDragDisplay] = useState(0)

  // Automation target state
  const automationParam = useEffectSequencerStore((s) => s.automationParam)
  const setAutomationParam = useEffectSequencerStore((s) => s.setAutomationParam)
  const clearAutomationParam = useEffectSequencerStore((s) => s.clearAutomationParam)
  const isAutomationTarget = paramId != null && automationParam?.fullParamId === paramId

  // Modulation routing state — only subscribe when paramId is provided
  const {
    addRouting,
    routings,
    tracks: seqTracks,
    updateRoutingDepth,
    removeRouting,
    assigningTrack: assigningStepTrack,
    setAssigningTrack: setAssigningStepTrack,
  } = useSequencerStore()
  const { assigningModulator } = useModulationStore()
  const {
    assigningTrack: assigningPolyEuclid,
    tracks: polyEuclidTracks,
    setAssigningTrack: setAssigningPolyEuclid,
  } = usePolyEuclidStore()
  const { selectRouting, setStatusText } = useUIStore()
  const [isDropTarget, setIsDropTarget] = useState(false)
  const [, setIsModulationDrag] = useState(false)
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null)

  // Check assignment mode
  const isInAssignmentMode = (assigningModulator !== null || assigningPolyEuclid !== null || assigningStepTrack !== null) && !!paramId

  // Listen for global drag events
  useEffect(() => {
    if (!paramId) return
    const handleDragStart = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('modulation-source') ||
          e.dataTransfer?.types.includes('sequencer-track')) {
        setIsModulationDrag(true)
      }
    }
    const handleDragEnd = () => setIsModulationDrag(false)
    document.addEventListener('dragstart', handleDragStart)
    document.addEventListener('dragend', handleDragEnd)
    return () => {
      document.removeEventListener('dragstart', handleDragStart)
      document.removeEventListener('dragend', handleDragEnd)
    }
  }, [paramId])

  // Routing info
  const paramRoutings = paramId ? routings.filter(r => r.targetParam === paramId) : []
  const hasRouting = paramRoutings.length > 0
  const firstRouting = hasRouting ? paramRoutings[0] : null

  const sourceInfo = useMemo(() => {
    if (!firstRouting) return null
    if (firstRouting.trackId.startsWith('polyEuclid-')) {
      const polyTrackId = firstRouting.trackId.replace('polyEuclid-', '')
      const polyTrack = polyEuclidTracks.find(t => t.id === polyTrackId)
      if (polyTrack) {
        const trackIndex = polyEuclidTracks.indexOf(polyTrack)
        return { name: `Euclid T${trackIndex + 1}`, color: POLY_EUCLID_COLOR }
      }
    }
    const stepTrack = seqTracks.find(t => t.id === firstRouting.trackId)
    if (stepTrack) {
      const trackIndex = seqTracks.indexOf(stepTrack)
      return { name: `Step T${trackIndex + 1}`, color: STEP_SEQ_COLOR }
    }
    return getSourceInfo(firstRouting.trackId)
  }, [firstRouting, seqTracks, polyEuclidTracks])

  // Assigning color
  const assigningColor = assigningModulator
    ? (getSourceInfo(assigningModulator)?.color ?? SPECIAL_SOURCES[assigningModulator]?.color)
    : assigningPolyEuclid
      ? POLY_EUCLID_COLOR
      : assigningStepTrack
        ? STEP_SEQ_COLOR
        : undefined

  // Knob drag
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // In assignment mode, start depth-drag instead of instant assign
    if (isInAssignmentMode && paramId) {
      let trackId: string | null = null
      if (assigningModulator) trackId = assigningModulator
      else if (assigningPolyEuclid) trackId = `polyEuclid-${assigningPolyEuclid}`
      else if (assigningStepTrack) trackId = assigningStepTrack

      if (trackId) {
        depthAssignSource.current = trackId
        depthAssignStartY.current = e.clientY
        depthAssignValue.current = 0
        setIsDepthDragging(true)
        setDepthDragDisplay(0)
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      }
      return
    }

    didDrag.current = false
    dragStartY.current = e.clientY
    dragStartValue.current = value
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [value, isInAssignmentMode, paramId, assigningModulator, assigningPolyEuclid, assigningStepTrack, routings, addRouting, setAssigningPolyEuclid, setAssigningStepTrack])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    // Depth-drag in assignment mode
    if (isDepthDragging) {
      const deltaY = depthAssignStartY.current - e.clientY
      const depth = Math.max(-1, Math.min(1, deltaY / 100))
      depthAssignValue.current = depth
      setDepthDragDisplay(depth)
      return
    }

    if (dragStartY.current === null) return
    const deltaY = dragStartY.current - e.clientY
    if (Math.abs(deltaY) > 3) didDrag.current = true
    const range = max - min
    const sensitivity = range / 150
    let newValue = Math.min(max, Math.max(min, dragStartValue.current + deltaY * sensitivity))
    if (step) {
      newValue = Math.round(newValue / step) * step
    }
    onChange(newValue)
  }, [isDepthDragging, min, max, step, onChange])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {}

    // Commit depth-drag assignment
    if (isDepthDragging && depthAssignSource.current && paramId) {
      const depth = depthAssignValue.current
      const src = depthAssignSource.current
      if (Math.abs(depth) > 0.02) {
        const existing = routings.find(r => r.trackId === src && r.targetParam === paramId)
        if (existing) {
          updateRoutingDepth(existing.id, depth)
        } else {
          addRouting(src, paramId, depth)
          // Auto-enable the LFO if it was disabled
          if (src.startsWith('lfo-')) {
            const lfoIdx = parseInt(src.split('-')[1])
            useModulationStore.getState().setLFOEnabled(lfoIdx, true)
          }
        }
      }
      setIsDepthDragging(false)
      depthAssignSource.current = null
      return
    }

    // Click (not drag) → toggle automation target
    if (!didDrag.current && !isInAssignmentMode && paramId) {
      if (isAutomationTarget) {
        clearAutomationParam()
      } else {
        const parts = paramId.split('.')
        if (parts.length === 2) {
          setAutomationParam({
            effectId: parts[0],
            paramId: parts[1],
            fullParamId: paramId,
            label: label,
            min: min,
            max: max,
            step: step ?? 0.01,
          })
        }
      }
    }

    dragStartY.current = null
  }, [isDepthDragging, isInAssignmentMode, isAutomationTarget, paramId, label, min, max, step, routings, addRouting, updateRoutingDepth, setAutomationParam, clearAutomationParam])

  // Drop target handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!paramId) return
    if (e.dataTransfer.types.includes('sequencer-track') ||
        e.dataTransfer.types.includes('modulation-source')) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'link'
      setIsDropTarget(true)
    }
  }, [paramId])

  const handleDragLeave = useCallback(() => setIsDropTarget(false), [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const trackId = e.dataTransfer.getData('sequencer-track') ||
                    e.dataTransfer.getData('modulation-source')
    if (trackId && paramId) {
      const existing = routings.find(r => r.trackId === trackId && r.targetParam === paramId)
      if (!existing) addRouting(trackId, paramId, 0.5)
    }
    setIsDropTarget(false)
  }, [paramId, routings, addRouting])

  // Dot drag state for modulation indicators on the arc
  const draggingRoutingRef = useRef<string | null>(null)
  const dotDragStartY = useRef(0)
  const dotDragStartDepth = useRef(0)
  const dotDidDrag = useRef(false)
  const [dotDraggingInfo, setDotDraggingInfo] = useState<{ name: string; depth: number; color: string } | null>(null)

  // Get source info for any routing (not just firstRouting)
  const getRoutingInfo = useCallback((routing: { trackId: string }) => {
    if (routing.trackId.startsWith('polyEuclid-')) {
      const polyTrackId = routing.trackId.replace('polyEuclid-', '')
      const polyTrack = polyEuclidTracks.find(t => t.id === polyTrackId)
      if (polyTrack) {
        const trackIndex = polyEuclidTracks.indexOf(polyTrack)
        return { name: `Euclid T${trackIndex + 1}`, color: POLY_EUCLID_COLOR }
      }
    }
    const stepTrack = seqTracks.find(t => t.id === routing.trackId)
    if (stepTrack) {
      const trackIndex = seqTracks.indexOf(stepTrack)
      return { name: `Step T${trackIndex + 1}`, color: STEP_SEQ_COLOR }
    }
    return getSourceInfo(routing.trackId)
  }, [seqTracks, polyEuclidTracks])

  const handleDotPointerDown = useCallback((e: React.PointerEvent, routing: { id: string; trackId: string; depth: number }) => {
    e.preventDefault()
    e.stopPropagation()
    // Alt+click = instant remove
    if (e.altKey) {
      removeRouting(routing.id)
      return
    }
    draggingRoutingRef.current = routing.id
    dotDidDrag.current = false
    dotDragStartY.current = e.clientY
    dotDragStartDepth.current = routing.depth
    const info = getRoutingInfo(routing)
    if (info) setDotDraggingInfo({ name: info.name, depth: routing.depth, color: info.color })
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [getRoutingInfo, removeRouting])

  const handleDotPointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRoutingRef.current) return
    e.stopPropagation()
    const deltaY = dotDragStartY.current - e.clientY
    if (Math.abs(deltaY) > 3) dotDidDrag.current = true
    const deltaDepth = deltaY / 50
    const newDepth = Math.max(-1, Math.min(1, dotDragStartDepth.current + deltaDepth))
    updateRoutingDepth(draggingRoutingRef.current, newDepth)
    setDotDraggingInfo(prev => prev ? { ...prev, depth: newDepth } : null)
  }, [updateRoutingDepth])

  const handleDotPointerUp = useCallback((e: React.PointerEvent) => {
    const routingId = draggingRoutingRef.current
    const wasDrag = dotDidDrag.current
    draggingRoutingRef.current = null
    dotDidDrag.current = false
    setDotDraggingInfo(null)
    try { ;(e.target as HTMLElement).releasePointerCapture(e.pointerId) } catch {}
    if (!routingId) return
    // Snap-remove: if depth near zero after drag, delete the routing
    if (wasDrag) {
      const routing = routings.find(r => r.id === routingId)
      if (routing && Math.abs(routing.depth) < 0.05) removeRouting(routingId)
    } else {
      selectRouting(routingId)
    }
  }, [routings, removeRouting, selectRouting])

  const handleDotDoubleClick = useCallback((e: React.MouseEvent, routingId: string) => {
    e.stopPropagation()
    removeRouting(routingId)
  }, [removeRouting])

  const normalized = (value - min) / (max - min)
  const rotation = normalized * 270 - 135

  const dimensions = {
    xs: { outer: 36, indicator: 10 },
    sm: { outer: 38, indicator: 12 },
    md: { outer: 40, indicator: 14 },
    lg: { outer: 60, indicator: 20 },
  }[size]

  // Compute modulation dot positions on the arc rim
  const modDots = useMemo(() => {
    return paramRoutings.map(routing => {
      const info = getRoutingInfo(routing)
      if (!info) return null
      const targetPos = Math.max(0, Math.min(1, normalized + routing.depth))
      const angleDeg = targetPos * 270 - 135
      const angleRad = angleDeg * Math.PI / 180
      const r = dimensions.outer * ARC_RADIUS / 100
      const cx = dimensions.outer / 2 + r * Math.sin(angleRad)
      const cy = dimensions.outer / 2 - r * Math.cos(angleRad)
      return { routing, info, cx, cy }
    }).filter((d): d is NonNullable<typeof d> => d !== null)
  }, [paramRoutings, normalized, dimensions.outer, getRoutingInfo])

  const displayValue = formatValue
    ? formatValue(value)
    : step && step >= 1
      ? value.toFixed(0)
      : value.toFixed(1)

  // Determine ring color: routing source > effect color
  const arcColor = sourceInfo ? sourceInfo.color : color

  const isCompact = size === 'xs'

  return (
    <div
      className="flex flex-col items-center relative"
      style={{ gap: isCompact ? 2 : 3, minWidth: isCompact ? 48 : undefined }}
      onDragOver={paramId ? handleDragOver : undefined}
      onDragLeave={paramId ? handleDragLeave : undefined}
      onDrop={paramId ? handleDrop : undefined}
      onContextMenu={paramId ? (e) => {
        e.preventDefault()
        setContextMenuPos({ x: e.clientX, y: e.clientY })
      } : undefined}
      onMouseEnter={resolvedStatusText ? () => setStatusText(resolvedStatusText) : undefined}
      onMouseLeave={resolvedStatusText ? () => setStatusText(null) : undefined}
    >
      {/* Label — above the knob */}
      <span
        className={
          isCompact
            ? 'text-[8px] uppercase tracking-wider leading-none'
            : showArc
              ? 'text-[9px] uppercase tracking-wide leading-none font-medium'
              : 'text-[14px] font-medium'
        }
        style={{
          color: isCompact ? 'var(--text-muted)' : showArc ? 'var(--text-secondary)' : 'var(--text-muted)',
          fontFamily: 'var(--font-sans)',
        }}
      >
        {label}
      </span>

      {/* Knob container */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative cursor-pointer select-none touch-none"
        style={{
          width: dimensions.outer,
          height: dimensions.outer,
          outline: isAutomationTarget
            ? '2px solid #FF4060'
            : isInAssignmentMode && !hasRouting
              ? `2px solid ${assigningColor}`
              : isDropTarget
                ? '2px solid var(--accent)'
                : 'none',
          outlineOffset: 2,
          borderRadius: '50%',
          boxShadow: isInAssignmentMode && assigningColor ? `0 0 8px ${assigningColor}40` : undefined,
        }}
      >
        {/* Depth drag indicator */}
        {isDepthDragging && (
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[9px] font-bold tabular-nums whitespace-nowrap z-20"
            style={{
              backgroundColor: assigningColor ?? 'var(--accent)',
              color: '#fff',
            }}>
            {(() => {
              const src = depthAssignSource.current
              const name = src ? getSourceInfo(src)?.name ?? '' : ''
              const sign = depthDragDisplay > 0 ? '+' : ''
              return name ? `${name}: ${sign}${(depthDragDisplay * 100).toFixed(0)}%` : `${sign}${(depthDragDisplay * 100).toFixed(0)}%`
            })()}
          </div>
        )}

        {/* Dot drag tooltip */}
        {dotDraggingInfo && (
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[9px] font-bold tabular-nums whitespace-nowrap z-20"
            style={{ backgroundColor: dotDraggingInfo.color, color: '#fff' }}>
            {dotDraggingInfo.name}: {dotDraggingInfo.depth > 0 ? '+' : ''}{(dotDraggingInfo.depth * 100).toFixed(0)}%
          </div>
        )}

        {/* Outer rim ring */}
        {!isCompact && (
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'linear-gradient(135deg, var(--knob-rim-highlight), var(--knob-rim))',
            }}
          />
        )}
        {/* Dark circle body */}
        <div
          className="absolute rounded-full"
          style={{
            inset: isCompact ? 0 : 2,
            background: isCompact
              ? '#12121f'
              : 'radial-gradient(ellipse at 35% 30%, var(--knob-body-highlight), var(--knob-body))',
            border: isCompact ? '1px solid #2a2a40' : 'none',
            boxShadow: 'var(--shadow-knob)',
            transition: 'box-shadow var(--transition-fast)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-knob-hover)' }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-knob)' }}
        />

        {/* Line indicator */}
        <div
          className="absolute"
          style={{
            width: isCompact ? 1 : size === 'sm' ? 1 : 2,
            height: dimensions.indicator,
            top: isCompact ? 3 : 4,
            left: '50%',
            backgroundColor: arcColor,
            transform: `translateX(-50%) rotate(${rotation}deg)`,
            transformOrigin: `center ${dimensions.outer / 2 - (isCompact ? 3 : 4)}px`,
            borderRadius: 1,
            boxShadow: normalized !== 0 ? `0 0 4px ${arcColor}60` : 'none',
          }}
        />

        {/* Modulation dots on the arc rim */}
        {modDots.map(dot => (
          <div
            key={dot.routing.id}
            onPointerDown={(e) => handleDotPointerDown(e, dot.routing)}
            onPointerMove={handleDotPointerMove}
            onPointerUp={handleDotPointerUp}
            onDoubleClick={(e) => handleDotDoubleClick(e, dot.routing.id)}
            className="absolute cursor-ns-resize touch-none z-10 hover:scale-150 transition-transform"
            style={{
              width: isCompact ? 5 : 6,
              height: isCompact ? 5 : 6,
              borderRadius: '50%',
              backgroundColor: dot.info.color,
              boxShadow: `0 0 4px ${dot.info.color}`,
              left: dot.cx - (isCompact ? 2.5 : 3),
              top: dot.cy - (isCompact ? 2.5 : 3),
            }}
            title={`${dot.info.name}: ${dot.routing.depth > 0 ? '+' : ''}${Math.round(dot.routing.depth * 100)}% — Drag to adjust, double-click to remove`}
          />
        ))}
      </div>

      {/* Value pill — bordered box below knob */}
      {showValue && !hasRouting && (
        <div
          className="tabular-nums leading-none text-center"
          style={{
            fontSize: isCompact ? 8 : 9,
            color: arcColor,
            border: `1px solid ${arcColor}40`,
            borderRadius: 3,
            padding: isCompact ? '1px 4px' : '2px 6px',
            backgroundColor: `${arcColor}08`,
            minWidth: isCompact ? 32 : undefined,
            boxShadow: 'var(--shadow-inset)',
          }}
        >
          {displayValue}
        </div>
      )}

      {/* Modulation context menu */}
      {contextMenuPos && paramId && (
        <ModulationContextMenu
          paramId={paramId}
          position={contextMenuPos}
          onClose={() => setContextMenuPos(null)}
        />
      )}
    </div>
  )
}
