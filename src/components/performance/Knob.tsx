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
      'audio-rms': { name: 'RMS', color: '#FFFFFF' },
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
  showArc,
  statusText,
}: KnobProps) {
  const resolvedStatusText = statusText ?? getParamStatusText(label)

  const dragStartY = useRef<number | null>(null)
  const dragStartValue = useRef<number>(0)
  const didDrag = useRef(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

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
    setIsDragging(true)
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

    setIsDragging(false)

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

  // Pointer cancel (e.g. touch interruption) — reset visual/drag state without click side-effects
  const handlePointerCancel = useCallback((e: React.PointerEvent) => {
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {}
    setIsDragging(false)
    setIsDepthDragging(false)
    depthAssignSource.current = null
    dragStartY.current = null
  }, [])

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

  const dimensions = {
    xs: { width: 48, height: 22 },
    sm: { width: 52, height: 24 },
    md: { width: 56, height: 26 },
    lg: { width: 72, height: 32 },
  }[size]

  // Modulation routing indicators
  const modDots = useMemo(() => {
    return paramRoutings.map(routing => {
      const info = getRoutingInfo(routing)
      if (!info) return null
      return { routing, info }
    }).filter((d): d is NonNullable<typeof d> => d !== null)
  }, [paramRoutings, getRoutingInfo])

  const displayValue = formatValue
    ? formatValue(value)
    : step && step >= 1
      ? value.toFixed(0)
      : value.toFixed(1)

  // Determine ring color: routing source > effect color
  const arcColor = sourceInfo ? sourceInfo.color : color

  const isCompact = size === 'xs'

  // Arc knob geometry
  const arcSize = { xs: 28, sm: 32, md: 36, lg: 44 }[size]
  const arcStroke = 2.5
  const arcRadius = (arcSize - arcStroke) / 2
  const arcCenter = arcSize / 2
  // Arc spans 270° (from 135° to 405°)
  const startAngle = 135
  const endAngle = 405
  const angleRange = endAngle - startAngle
  const valueAngle = startAngle + normalized * angleRange

  const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
    const rad = (angleDeg - 90) * Math.PI / 180
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
  }

  const describeArc = (cx: number, cy: number, r: number, start: number, end: number) => {
    const s = polarToCartesian(cx, cy, r, start)
    const e = polarToCartesian(cx, cy, r, end)
    const largeArc = end - start > 180 ? 1 : 0
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`
  }

  // Indicator line drawn at 12 o'clock (angle 360) and rotated into place via CSS
  // transform — lets the settle spring animate on transform only (no path recompute)
  const indicatorEnd = polarToCartesian(arcCenter, arcCenter, arcRadius - 3, 360)
  const indicatorStart = polarToCartesian(arcCenter, arcCenter, arcRadius * 0.35, 360)
  const indicatorRotation = valueAngle - 360 // continuous over [-225°, +45°], no wrap

  // 12 o'clock reference tick
  const tickOuter = polarToCartesian(arcCenter, arcCenter, arcRadius, 360)
  const tickInner = polarToCartesian(arcCenter, arcCenter, arcRadius - 3, 360)

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
      {/* Label */}
      <span
        className="uppercase leading-none font-bold"
        style={{
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.1em',
          fontSize: isCompact ? 8 : 9,
        }}
      >
        {label}
      </span>

      {showArc ? (
        /* Circular arc knob */
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="relative select-none touch-none flex flex-col items-center"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <svg
            width={arcSize}
            height={arcSize}
            className={hasRouting && !isDragging ? 'alive-active' : undefined}
            style={{
              borderRadius: '50%',
              transform: isDragging ? 'scale(1.05)' : 'scale(1)',
              transition: `transform ${isDragging ? 'var(--dur-instant) var(--ease-snap)' : 'var(--dur-settle) var(--ease-out-back)'}`,
            }}
          >
            {/* Background track */}
            <path
              d={describeArc(arcCenter, arcCenter, arcRadius, startAngle, endAngle)}
              fill="none"
              stroke={isHovered || isDragging ? 'var(--border-emphasis)' : 'var(--border)'}
              strokeWidth={arcStroke}
              strokeLinecap="round"
              style={{ transition: 'stroke var(--dur-quick) var(--ease-out-expo)' }}
            />
            {/* 12 o'clock reference tick */}
            <line
              x1={tickInner.x} y1={tickInner.y}
              x2={tickOuter.x} y2={tickOuter.y}
              stroke="var(--text-ghost)"
              strokeWidth={1}
            />
            {/* Active arc */}
            {normalized > 0.005 && (
              <path
                d={describeArc(arcCenter, arcCenter, arcRadius, startAngle, valueAngle)}
                fill="none"
                stroke={arcColor}
                strokeWidth={arcStroke}
                strokeLinecap="round"
                style={{
                  opacity: isDragging ? 1 : 0.9,
                  filter: isDragging ? 'drop-shadow(0 0 3px var(--accent-glow))' : 'none',
                  transition: 'opacity var(--dur-quick) var(--ease-out-expo), filter var(--dur-quick) var(--ease-out-expo)',
                }}
              />
            )}
            {/* Indicator line — rotated group so release settles with spring */}
            <g
              style={{
                transform: `rotate(${indicatorRotation}deg)`,
                transformOrigin: `${arcCenter}px ${arcCenter}px`,
                transition: isDragging ? 'none' : 'transform var(--dur-settle) var(--ease-out-back)',
              }}
            >
              <line
                x1={indicatorStart.x} y1={indicatorStart.y}
                x2={indicatorEnd.x} y2={indicatorEnd.y}
                stroke={isDragging ? 'var(--accent)' : arcColor}
                strokeWidth={1.5}
                strokeLinecap="round"
                style={{
                  filter: isDragging ? 'drop-shadow(0 0 2px var(--accent-glow))' : 'none',
                  transition: 'stroke var(--dur-quick) var(--ease-out-expo), filter var(--dur-quick) var(--ease-out-expo)',
                }}
              />
            </g>
          </svg>
          {/* Value below arc */}
          <span
            className="tabular-nums font-bold"
            style={{
              fontSize: isCompact ? 9 : 10,
              color: isDragging ? 'var(--accent)' : arcColor,
              textShadow: isDragging ? '0 0 6px var(--accent-glow)' : 'none',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.06em',
              marginTop: -2,
              transition: 'color var(--dur-quick) var(--ease-out-expo), text-shadow var(--dur-quick) var(--ease-out-expo)',
            }}
          >
            {displayValue}
          </span>
        </div>
      ) : (
      /* Rectangular value container — all pointer events */
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`relative select-none touch-none ${hasRouting && !isDragging && !isAutomationTarget ? 'alive-active' : ''}`}
        style={{
          width: dimensions.width,
          height: dimensions.height,
          cursor: isDragging ? 'grabbing' : 'grab',
          border: isAutomationTarget
            ? '1px solid #FF4060'
            : isInAssignmentMode && !hasRouting
              ? `1px solid ${assigningColor}`
              : isDropTarget
                ? '1px solid var(--accent)'
                : isDragging && !hasRouting
                  ? '1px solid var(--accent)'
                  : `1px solid ${hasRouting ? (sourceInfo?.color ?? 'var(--border)') : isHovered ? 'var(--border-emphasis)' : 'var(--border)'}`,
          backgroundColor: '#000000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isDragging ? '0 0 10px var(--accent-glow)' : 'none',
          transform: isDragging ? 'scale(1.03)' : 'scale(1)',
          transition: `border-color var(--dur-quick) var(--ease-out-expo), box-shadow var(--dur-quick) var(--ease-out-expo), transform ${isDragging ? 'var(--dur-instant) var(--ease-snap)' : 'var(--dur-settle) var(--ease-out-back)'}`,
          animation: isAutomationTarget ? 'hud-blink 0.5s step-end infinite' : undefined,
        }}
      >
        {/* Depth drag indicator */}
        {isDepthDragging && (
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 text-[9px] font-bold tabular-nums whitespace-nowrap z-20"
            style={{
              backgroundColor: assigningColor ?? 'var(--accent)',
              color: '#000',
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
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 text-[9px] font-bold tabular-nums whitespace-nowrap z-20"
            style={{ backgroundColor: dotDraggingInfo.color, color: '#000' }}>
            {dotDraggingInfo.name}: {dotDraggingInfo.depth > 0 ? '+' : ''}{(dotDraggingInfo.depth * 100).toFixed(0)}%
          </div>
        )}

        {/* Value */}
        <span
          className="tabular-nums font-bold"
          style={{
            fontSize: isCompact ? 10 : 12,
            color: isDragging ? 'var(--accent)' : arcColor,
            textShadow: isDragging ? '0 0 6px var(--accent-glow)' : 'none',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.06em',
            transition: 'color var(--dur-quick) var(--ease-out-expo), text-shadow var(--dur-quick) var(--ease-out-expo)',
          }}
        >
          {displayValue}
        </span>

        {/* Fill bar at bottom — scaleX so external value changes settle with spring */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: arcColor,
            opacity: isDragging ? 0.9 : 0.4,
            transform: `scaleX(${normalized})`,
            transformOrigin: 'left',
            transition: isDragging
              ? 'opacity var(--dur-quick) var(--ease-out-expo)'
              : 'transform var(--dur-settle) var(--ease-out-back), opacity var(--dur-quick) var(--ease-out-expo)',
          }}
        />
      </div>
      )}

      {/* Modulation indicators */}
      {modDots.length > 0 && (
        <div className="flex" style={{ gap: 2 }}>
          {modDots.map(dot => (
            <div
              key={dot.routing.id}
              onPointerDown={(e) => handleDotPointerDown(e, dot.routing)}
              onPointerMove={handleDotPointerMove}
              onPointerUp={handleDotPointerUp}
              onDoubleClick={(e) => handleDotDoubleClick(e, dot.routing.id)}
              className="cursor-ns-resize touch-none hover:opacity-100 transition-opacity"
              style={{
                width: isCompact ? 14 : 18,
                height: 3,
                backgroundColor: dot.info.color,
                opacity: 0.7,
              }}
              title={`${dot.info.name}: ${dot.routing.depth > 0 ? '+' : ''}${Math.round(dot.routing.depth * 100)}% — Drag to adjust, double-click to remove`}
            />
          ))}
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
