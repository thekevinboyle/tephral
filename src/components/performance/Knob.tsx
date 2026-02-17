import { useRef, useCallback, useMemo, useState, useEffect } from 'react'
import { useSequencerStore } from '../../stores/sequencerStore'
import { useModulationStore } from '../../stores/modulationStore'
import { usePolyEuclidStore } from '../../stores/polyEuclidStore'
import { useUIStore } from '../../stores/uiStore'

// Modulation source colors (same as SliderRow)
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

interface KnobProps {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  color?: string
  size?: 'xs' | 'sm' | 'md'
  onChange: (value: number) => void
  formatValue?: (value: number) => string
  paramId?: string
  showArc?: boolean
  showValue?: boolean
}

// SVG arc path helper — 270 degree sweep from -135 to +135
const ARC_RADIUS = 46
const ARC_CIRCUMFERENCE = 2 * Math.PI * ARC_RADIUS
const ARC_SWEEP = (270 / 360) * ARC_CIRCUMFERENCE // ~216.77

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
}: KnobProps) {
  const dragStartY = useRef<number | null>(null)
  const dragStartValue = useRef<number>(0)

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
  const { selectRouting } = useUIStore()
  const [isDropTarget, setIsDropTarget] = useState(false)
  const [isModulationDrag, setIsModulationDrag] = useState(false)

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
    return SPECIAL_SOURCES[firstRouting.trackId] || null
  }, [firstRouting, seqTracks, polyEuclidTracks])

  // Assigning color
  const assigningColor = assigningModulator
    ? SPECIAL_SOURCES[assigningModulator]?.color
    : assigningPolyEuclid
      ? POLY_EUCLID_COLOR
      : assigningStepTrack
        ? STEP_SEQ_COLOR
        : undefined

  // Knob drag
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // In assignment mode, clicking assigns instead of dragging
    if (isInAssignmentMode && paramId) {
      let trackId: string | null = null
      if (assigningModulator) trackId = assigningModulator
      else if (assigningPolyEuclid) trackId = `polyEuclid-${assigningPolyEuclid}`
      else if (assigningStepTrack) trackId = assigningStepTrack

      if (trackId) {
        const existing = routings.find(r => r.trackId === trackId && r.targetParam === paramId)
        if (!existing) {
          addRouting(trackId, paramId, 0.5)
          if (assigningPolyEuclid) setAssigningPolyEuclid(null)
          if (assigningStepTrack) setAssigningStepTrack(null)
        }
      }
      return
    }

    dragStartY.current = e.clientY
    dragStartValue.current = value
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [value, isInAssignmentMode, paramId, assigningModulator, assigningPolyEuclid, assigningStepTrack, routings, addRouting, setAssigningPolyEuclid, setAssigningStepTrack])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragStartY.current === null) return
    const deltaY = dragStartY.current - e.clientY
    const range = max - min
    const sensitivity = range / 150
    let newValue = Math.min(max, Math.max(min, dragStartValue.current + deltaY * sensitivity))
    if (step) {
      newValue = Math.round(newValue / step) * step
    }
    onChange(newValue)
  }, [min, max, step, onChange])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {}
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

  // Routing indicator depth drag
  const isDraggingDepth = useRef(false)
  const didDragDepth = useRef(false)
  const depthDragStartY = useRef(0)
  const depthDragStartDepth = useRef(0)

  const handleIndicatorPointerDown = useCallback((e: React.PointerEvent) => {
    if (!firstRouting) return
    e.preventDefault()
    e.stopPropagation()
    isDraggingDepth.current = true
    didDragDepth.current = false
    depthDragStartY.current = e.clientY
    depthDragStartDepth.current = firstRouting.depth
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [firstRouting])

  const handleIndicatorPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingDepth.current || !firstRouting) return
    e.stopPropagation()
    const deltaY = depthDragStartY.current - e.clientY
    if (Math.abs(deltaY) > 3) {
      didDragDepth.current = true
      const deltaDepth = deltaY / 50
      const newDepth = Math.max(-1, Math.min(1, depthDragStartDepth.current + deltaDepth))
      updateRoutingDepth(firstRouting.id, newDepth)
    }
  }, [firstRouting, updateRoutingDepth])

  const handleIndicatorPointerUp = useCallback((e: React.PointerEvent) => {
    const wasDrag = didDragDepth.current
    isDraggingDepth.current = false
    didDragDepth.current = false
    try {
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {}
    if (!wasDrag && firstRouting) selectRouting(firstRouting.id)
  }, [firstRouting, selectRouting])

  const handleIndicatorDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (firstRouting) removeRouting(firstRouting.id)
  }, [firstRouting, removeRouting])

  const normalized = (value - min) / (max - min)
  const rotation = normalized * 270 - 135

  const dimensions = {
    xs: { outer: 36, indicator: 10 },
    sm: { outer: 38, indicator: 12 },
    md: { outer: 40, indicator: 14 },
  }[size]

  const displayValue = formatValue
    ? formatValue(value)
    : step && step >= 1
      ? value.toFixed(0)
      : value.toFixed(1)

  // Determine ring color: routing source > effect color
  const arcColor = sourceInfo ? sourceInfo.color : color

  const isCompact = size === 'xs'
  const arcStrokeWidth = isCompact ? 6 : 5

  return (
    <div
      className="flex flex-col items-center relative"
      style={{ gap: isCompact ? 2 : 3, minWidth: isCompact ? 48 : undefined }}
      onDragOver={paramId ? handleDragOver : undefined}
      onDragLeave={paramId ? handleDragLeave : undefined}
      onDrop={paramId ? handleDrop : undefined}
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
        style={{ color: isCompact ? 'var(--text-muted)' : showArc ? 'var(--text-secondary)' : 'var(--text-muted)' }}
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
          outline: isInAssignmentMode && !hasRouting
            ? `2px solid ${assigningColor}`
            : isDropTarget
              ? '2px solid var(--accent)'
              : 'none',
          outlineOffset: 2,
          borderRadius: '50%',
        }}
      >
        {/* Dark circle body */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            backgroundColor: isCompact ? '#12121f' : 'var(--bg-surface)',
            border: isCompact ? '1px solid #2a2a40' : '1px solid var(--border)',
          }}
        />

        {/* SVG arc overlay */}
        {showArc && (
          <svg
            className="absolute inset-0"
            viewBox="0 0 100 100"
            style={{ transform: 'rotate(-135deg)' }}
          >
            {/* Background track */}
            <circle
              cx="50" cy="50" r={ARC_RADIUS}
              fill="none" stroke={isCompact ? '#2a2a40' : 'var(--border)'} strokeWidth={arcStrokeWidth}
              strokeDasharray={`${ARC_SWEEP} ${ARC_CIRCUMFERENCE}`}
              strokeLinecap="round"
            />
            {/* Value arc */}
            <circle
              cx="50" cy="50" r={ARC_RADIUS}
              fill="none" stroke={arcColor} strokeWidth={arcStrokeWidth}
              strokeDasharray={`${normalized * ARC_SWEEP} ${ARC_CIRCUMFERENCE}`}
              strokeLinecap="round"
            />
          </svg>
        )}

        {/* Line indicator */}
        <div
          className="absolute"
          style={{
            width: isCompact ? 1.5 : 2,
            height: dimensions.indicator,
            top: isCompact ? 3 : 4,
            left: '50%',
            backgroundColor: arcColor,
            transform: `translateX(-50%) rotate(${rotation}deg)`,
            transformOrigin: `center ${dimensions.outer / 2 - (isCompact ? 3 : 4)}px`,
            borderRadius: 1,
          }}
        />

        {/* Assignment mode plus icon */}
        {paramId && (isInAssignmentMode || isModulationDrag) && !hasRouting && (
          <div
            className="absolute -right-1 -top-1 w-4 h-4 rounded-full flex items-center justify-center z-10 pointer-events-none"
            style={{
              backgroundColor: isInAssignmentMode ? assigningColor : 'var(--accent)',
              boxShadow: isInAssignmentMode ? `0 0 6px ${assigningColor}` : '0 0 6px var(--accent-glow)',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path d="M5 2v6M2 5h6" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        )}
      </div>

      {/* Routing indicator dot — shows below knob when routed */}
      {hasRouting && firstRouting && sourceInfo && (
        <div
          onPointerDown={handleIndicatorPointerDown}
          onPointerMove={handleIndicatorPointerMove}
          onPointerUp={handleIndicatorPointerUp}
          onDoubleClick={handleIndicatorDoubleClick}
          className="w-4 h-4 rounded-full flex items-center justify-center cursor-ns-resize hover:scale-125 transition-transform"
          style={{
            backgroundColor: sourceInfo.color,
            boxShadow: `0 0 6px ${sourceInfo.color}`,
          }}
          title={`${sourceInfo.name}: ${Math.round(firstRouting.depth * 100)}% — Drag to adjust, double-click to remove`}
        >
          <svg width="12" height="12" viewBox="0 0 12 12">
            <circle cx="6" cy="6" r="4" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
            <circle
              cx="6" cy="6" r="4" fill="none" stroke="white" strokeWidth="2"
              strokeDasharray={`${Math.abs(firstRouting.depth) * 25} 100`}
              strokeDashoffset="0" transform="rotate(-90 6 6)"
            />
          </svg>
        </div>
      )}

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
          }}
        >
          {displayValue}
        </div>
      )}
    </div>
  )
}
