import { createElement, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type React from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useSequencerStore } from '../stores/sequencerStore'
import { useModulationStore } from '../stores/modulationStore'
import { usePolyEuclidStore } from '../stores/polyEuclidStore'
import { useUIStore } from '../stores/uiStore'
import { useEffectSequencerStore } from '../stores/effectSequencerStore'
import { ModulationContextMenu } from '../components/performance/controls/ModulationContextMenu'
import { getParamStatusText } from '../config/statusDescriptions'
import { getSourceInfo, SPECIAL_SOURCES, POLY_EUCLID_COLOR, STEP_SEQ_COLOR } from '../utils/modulationSources'

export interface ParamControlArgs {
  paramId?: string
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  axis: 'x' | 'y'
  dragSpanPx?: number
  /** Overrides the status text derived from the label */
  statusText?: string
  /** Double-click resets to the midpoint (off by default) */
  resetOnDoubleClick?: boolean
}

export interface RoutingView { id: string; trackId: string; depth: number; name: string; color: string }

export interface ParamControl {
  rootProps: {
    onPointerDown: (e: React.PointerEvent) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: (e: React.PointerEvent) => void
    onPointerCancel: (e: React.PointerEvent) => void
    onDoubleClick: () => void
    onKeyDown: (e: React.KeyboardEvent) => void
    onLostPointerCapture: () => void
  }
  /** Spread on the outer wrapper (whole control including its label) */
  wrapperProps: {
    onContextMenu: (e: React.MouseEvent) => void
    onDragOver: (e: React.DragEvent) => void
    onDragLeave: () => void
    onDrop: (e: React.DragEvent) => void
    onMouseEnter: () => void
    onMouseLeave: () => void
  }
  dotProps: (r: RoutingView) => {
    onPointerDown: (e: React.PointerEvent) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: (e: React.PointerEvent) => void
    onDoubleClick: (e: React.MouseEvent) => void
  }
  isDragging: boolean
  isHovered: boolean
  isDropTarget: boolean
  isAutomationTarget: boolean
  isInAssignmentMode: boolean
  assigningColor: string | undefined
  isDepthDragging: boolean
  depthDragDisplay: number
  /** Display name of the modulator being assigned during a depth drag */
  depthSourceName: string
  routings: RoutingView[]
  dotDragging: { name: string; depth: number; color: string } | null
  contextMenu: React.ReactNode
}

const EMPTY_IDS: string[] = []

export function useParamControl({
  paramId, label, value, min, max, step, onChange, axis, dragSpanPx, statusText, resetOnDoubleClick = false,
}: ParamControlArgs): ParamControl {
  const resolvedStatusText = statusText ?? getParamStatusText(label)

  const dragStart = useRef<number | null>(null)
  const dragStartValue = useRef<number>(0)
  const didDrag = useRef(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  // rAF-throttled onChange dispatch: coalesce drag updates to at most 1 per frame
  const pendingValueRef = useRef<number | null>(null)
  const changeRafRef = useRef(0)
  const onChangeRef = useRef(onChange)
  useLayoutEffect(() => { onChangeRef.current = onChange })

  // Depth-drag assignment
  const depthAssignSource = useRef<string | null>(null)
  const depthAssignStartY = useRef(0)
  const depthAssignValue = useRef(0)
  const [isDepthDragging, setIsDepthDragging] = useState(false)
  const [depthDragDisplay, setDepthDragDisplay] = useState(0)
  const [depthSourceName, setDepthSourceName] = useState('')

  // Automation target
  const automationParam = useEffectSequencerStore((s) => s.automationParam)
  const setAutomationParam = useEffectSequencerStore((s) => s.setAutomationParam)
  const clearAutomationParam = useEffectSequencerStore((s) => s.clearAutomationParam)
  const isAutomationTarget = paramId != null && automationParam?.fullParamId === paramId

  // Modulation state (narrow selectors only)
  const updateRoutingDepth = useSequencerStore((s) => s.updateRoutingDepth)
  const removeRouting = useSequencerStore((s) => s.removeRouting)
  const assigningStepTrack = useSequencerStore((s) => s.assigningTrack)
  const rawRoutings = useSequencerStore(
    useShallow((s) => (paramId ? s.routings.filter((r) => r.targetParam === paramId) : []))
  )
  const seqTrackIds = useSequencerStore(useShallow((s) => (paramId ? s.tracks.map((t) => t.id) : EMPTY_IDS)))
  const assigningModulator = useModulationStore((s) => s.assigningModulator)
  const assigningPolyEuclid = usePolyEuclidStore((s) => s.assigningTrack)
  const polyTrackIds = usePolyEuclidStore(useShallow((s) => (paramId ? s.tracks.map((t) => t.id) : EMPTY_IDS)))
  const selectRouting = useUIStore((s) => s.selectRouting)
  const setStatusText = useUIStore((s) => s.setStatusText)

  const [isDropTarget, setIsDropTarget] = useState(false)
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null)

  const isInAssignmentMode =
    (assigningModulator !== null || assigningPolyEuclid !== null || assigningStepTrack !== null) && !!paramId

  useEffect(() => () => cancelAnimationFrame(changeRafRef.current), [])

  const getRoutingInfo = useCallback((trackId: string): { name: string; color: string } | null => {
    if (trackId.startsWith('polyEuclid-')) {
      const idx = polyTrackIds.indexOf(trackId.replace('polyEuclid-', ''))
      if (idx >= 0) return { name: `Euclid T${idx + 1}`, color: POLY_EUCLID_COLOR }
    }
    const sIdx = seqTrackIds.indexOf(trackId)
    if (sIdx >= 0) return { name: `Step T${sIdx + 1}`, color: STEP_SEQ_COLOR }
    return getSourceInfo(trackId)
  }, [seqTrackIds, polyTrackIds])

  const routings = useMemo<RoutingView[]>(() => {
    const out: RoutingView[] = []
    for (const r of rawRoutings) {
      const info = getRoutingInfo(r.trackId)
      if (info) out.push({ id: r.id, trackId: r.trackId, depth: r.depth, name: info.name, color: info.color })
    }
    return out
  }, [rawRoutings, getRoutingInfo])

  const assigningColor = assigningModulator
    ? (getSourceInfo(assigningModulator)?.color ?? SPECIAL_SOURCES[assigningModulator]?.color)
    : assigningPolyEuclid
      ? POLY_EUCLID_COLOR
      : assigningStepTrack
        ? STEP_SEQ_COLOR
        : undefined

  const snapClamp = useCallback((v: number) => {
    let out = v
    if (step) out = Math.round(out / step) * step
    return Math.min(max, Math.max(min, out))
  }, [min, max, step])

  const resetDepthDrag = () => {
    setIsDepthDragging(false)
    depthAssignSource.current = null
    depthAssignValue.current = 0
  }

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()

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
        setDepthSourceName(getSourceInfo(trackId)?.name ?? '')
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      }
      return
    }

    didDrag.current = false
    dragStart.current = axis === 'y' ? e.clientY : e.clientX
    dragStartValue.current = value
    setIsDragging(true)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [value, axis, isInAssignmentMode, paramId, assigningModulator, assigningPolyEuclid, assigningStepTrack])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (depthAssignSource.current) {
      const deltaY = depthAssignStartY.current - e.clientY
      const depth = Math.max(-1, Math.min(1, deltaY / 100))
      depthAssignValue.current = depth
      setDepthDragDisplay(depth)
      return
    }

    if (dragStart.current === null) return
    const delta = axis === 'y' ? dragStart.current - e.clientY : e.clientX - dragStart.current
    if (Math.abs(delta) > 3) didDrag.current = true
    const span = dragSpanPx ?? 200
    const newValue = snapClamp(
      dragStartValue.current + (delta / span) * (max - min) * (e.shiftKey ? 0.1 : 1)
    )
    pendingValueRef.current = newValue
    if (!changeRafRef.current) {
      changeRafRef.current = requestAnimationFrame(() => {
        changeRafRef.current = 0
        if (pendingValueRef.current !== null) {
          onChangeRef.current(pendingValueRef.current)
          pendingValueRef.current = null
        }
      })
    }
  }, [axis, dragSpanPx, min, max, snapClamp])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    try { ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId) } catch { /* not captured */ }

    setIsDragging(false)

    // Flush any pending rAF-throttled change so the final value always lands
    if (changeRafRef.current) {
      cancelAnimationFrame(changeRafRef.current)
      changeRafRef.current = 0
    }
    if (pendingValueRef.current !== null) {
      onChangeRef.current(pendingValueRef.current)
      pendingValueRef.current = null
    }

    if (depthAssignSource.current && paramId) {
      // Assignment may have been cleared mid-press (Escape, another control)
      const mod = useModulationStore.getState().assigningModulator
      const poly = usePolyEuclidStore.getState().assigningTrack
      const stepT = useSequencerStore.getState().assigningTrack
      const currentSrc = mod ?? (poly !== null ? `polyEuclid-${poly}` : stepT)
      if (currentSrc === null || currentSrc !== depthAssignSource.current) {
        resetDepthDrag()
        dragStart.current = null
        return
      }

      const drawn = depthAssignValue.current
      const isClick = Math.abs(drawn) <= 0.02
      const src = depthAssignSource.current
      const seq = useSequencerStore.getState()
      const existing = seq.routings.find((r) => r.trackId === src && r.targetParam === paramId)
      if (existing) {
        if (!isClick) seq.updateRoutingDepth(existing.id, drawn)
        else useUIStore.getState().selectRouting(existing.id)
      } else {
        seq.addRouting(src, paramId, isClick ? 0.5 : drawn)
        if (src.startsWith('lfo-')) {
          const lfoIdx = parseInt(src.split('-')[1])
          useModulationStore.getState().setLFOEnabled(lfoIdx, true)
        }
      }
      resetDepthDrag()
      return
    }

    // Click (not drag) toggles the automation target
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
            label,
            min,
            max,
            step: step ?? 0.01,
          })
        }
      }
    }

    dragStart.current = null
  }, [isInAssignmentMode, isAutomationTarget, paramId, label, min, max, step, setAutomationParam, clearAutomationParam])

  const handlePointerCancel = useCallback((e: React.PointerEvent) => {
    if (changeRafRef.current) {
      cancelAnimationFrame(changeRafRef.current)
      changeRafRef.current = 0
    }
    pendingValueRef.current = null
    try { ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId) } catch { /* not captured */ }
    setIsDragging(false)
    resetDepthDrag()
    dragStart.current = null
  }, [])

  const handleLostPointerCapture = useCallback(() => {
    if (changeRafRef.current) {
      cancelAnimationFrame(changeRafRef.current)
      changeRafRef.current = 0
    }
    pendingValueRef.current = null
    setIsDragging(false)
    resetDepthDrag()
    dragStart.current = null
  }, [])

  const handleDoubleClick = useCallback(() => {
    if (!resetOnDoubleClick || isInAssignmentMode) return
    onChangeRef.current(snapClamp((min + max) / 2))
  }, [resetOnDoubleClick, isInAssignmentMode, min, max, snapClamp])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    let next: number | null = null
    const base = step ?? (max - min) / 100
    const inc = base * (e.shiftKey ? 10 : 1)
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        next = value + inc
        break
      case 'ArrowLeft':
      case 'ArrowDown':
        next = value - inc
        break
      case 'Home':
        next = min
        break
      case 'End':
        next = max
        break
      default:
        return
    }
    e.preventDefault()
    e.stopPropagation()
    onChangeRef.current(snapClamp(next))
  }, [value, min, max, step, snapClamp])

  // Drop target
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
    if (!paramId) return
    e.preventDefault()
    const trackId = e.dataTransfer.getData('sequencer-track') ||
                    e.dataTransfer.getData('modulation-source')
    if (trackId && paramId) {
      const seq = useSequencerStore.getState()
      const existing = seq.routings.find((r) => r.trackId === trackId && r.targetParam === paramId)
      if (!existing) seq.addRouting(trackId, paramId, 0.5)
    }
    setIsDropTarget(false)
  }, [paramId])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (!paramId) return
    e.preventDefault()
    setContextMenuPos({ x: e.clientX, y: e.clientY })
  }, [paramId])

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)
    if (resolvedStatusText) setStatusText(resolvedStatusText)
  }, [resolvedStatusText, setStatusText])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
    if (resolvedStatusText) setStatusText(null)
  }, [resolvedStatusText, setStatusText])

  // Modulation dots
  const draggingRoutingRef = useRef<string | null>(null)
  const dotDragStartY = useRef(0)
  const dotDragStartDepth = useRef(0)
  const dotDidDrag = useRef(false)
  const [dotDragging, setDotDragging] = useState<{ name: string; depth: number; color: string } | null>(null)

  const dotProps = useCallback((r: RoutingView) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.altKey) {
        removeRouting(r.id)
        return
      }
      draggingRoutingRef.current = r.id
      dotDidDrag.current = false
      dotDragStartY.current = e.clientY
      dotDragStartDepth.current = r.depth
      setDotDragging({ name: r.name, depth: r.depth, color: r.color })
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!draggingRoutingRef.current) return
      e.stopPropagation()
      const deltaY = dotDragStartY.current - e.clientY
      if (Math.abs(deltaY) > 3) dotDidDrag.current = true
      const newDepth = Math.max(-1, Math.min(1, dotDragStartDepth.current + deltaY / 50))
      updateRoutingDepth(draggingRoutingRef.current, newDepth)
      setDotDragging((prev) => (prev ? { ...prev, depth: newDepth } : null))
    },
    onPointerUp: (e: React.PointerEvent) => {
      const routingId = draggingRoutingRef.current
      const wasDrag = dotDidDrag.current
      draggingRoutingRef.current = null
      dotDidDrag.current = false
      setDotDragging(null)
      try { ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId) } catch { /* not captured */ }
      if (!routingId) return
      if (wasDrag) {
        const routing = useSequencerStore.getState().routings.find((x) => x.id === routingId)
        if (routing && Math.abs(routing.depth) < 0.05) removeRouting(routingId)
      } else {
        selectRouting(routingId)
      }
    },
    onDoubleClick: (e: React.MouseEvent) => {
      e.stopPropagation()
      removeRouting(r.id)
    },
  }), [removeRouting, updateRoutingDepth, selectRouting])

  const contextMenu = contextMenuPos && paramId
    ? createElement(ModulationContextMenu, {
        paramId,
        position: contextMenuPos,
        onClose: () => setContextMenuPos(null),
      })
    : null

  return {
    rootProps: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
      onDoubleClick: handleDoubleClick,
      onKeyDown: handleKeyDown,
      onLostPointerCapture: handleLostPointerCapture,
    },
    wrapperProps: {
      onContextMenu: handleContextMenu,
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
    },
    dotProps,
    isDragging,
    isHovered,
    isDropTarget,
    isAutomationTarget,
    isInAssignmentMode,
    assigningColor,
    isDepthDragging,
    depthDragDisplay,
    depthSourceName,
    routings,
    dotDragging,
    contextMenu,
  }
}
