import { useState, useRef, useCallback, useEffect } from 'react'
import { useActiveEffects } from '../../hooks/useActiveEffects'
import { useEffectDisable } from '../../hooks/useEffectDisable'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { useRoutingStore } from '../../stores/routingStore'
import { useUIStore } from '../../stores/uiStore'
import { PresetDropdownBar } from '../presets/PresetDropdownBar'
import { EffectCard } from './EffectCard'

export function EffectCardStack() {
  const { sortedEffects } = useActiveEffects()
  const { disableEffect } = useEffectDisable()
  const { toggleEffectBypassed, effectBypassed } = useGlitchEngineStore()
  const { effectOrder, reorderEffect } = useRoutingStore()
  const { selectedEffectId, setSelectedEffect } = useUIStore()

  // Expanded card — only one at a time, takes over the panel
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const toggleExpanded = useCallback((id: string) => {
    setExpandedId(prev => prev === id ? null : id)
  }, [])

  const scrollRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Scroll to selected effect card
  useEffect(() => {
    if (selectedEffectId && scrollRef.current) {
      const card = scrollRef.current.querySelector(`[data-effect-id="${selectedEffectId}"]`)
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }
  }, [selectedEffectId])

  // Collapse expanded card if it gets disabled
  useEffect(() => {
    if (expandedId && !sortedEffects.find(e => e.id === expandedId)) {
      setExpandedId(null)
    }
  }, [expandedId, sortedEffects])

  // Drag state
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const dragStartY = useRef<number>(0)
  const isPointerDown = useRef(false)
  const isDragging = useRef(false)
  const pointerDownIndex = useRef<number>(0)

  const handlePointerDown = useCallback((e: React.PointerEvent, index: number) => {
    dragStartY.current = e.clientY
    isPointerDown.current = true
    isDragging.current = false
    pointerDownIndex.current = index
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPointerDown.current) return

    const deltaY = Math.abs(e.clientY - dragStartY.current)

    // Require meaningful vertical movement to start drag
    if (!isDragging.current && deltaY > 15) {
      isDragging.current = true
      setDragIndex(pointerDownIndex.current)
    }

    if (isDragging.current && listRef.current) {
      const wrappers = Array.from(listRef.current.children) as HTMLElement[]
      for (let i = 0; i < wrappers.length; i++) {
        const rect = wrappers[i].getBoundingClientRect()
        const midY = rect.top + rect.height / 2
        if (e.clientY < midY) {
          setDragOverIndex(i)
          return
        }
      }
      setDragOverIndex(wrappers.length)
    }
  }, [])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {}

    if (isDragging.current && dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      const fromEffectId = sortedEffects[dragIndex].id
      const fromOrderIndex = effectOrder.indexOf(fromEffectId)

      let toOrderIndex: number
      if (dragOverIndex >= sortedEffects.length) {
        toOrderIndex = effectOrder.indexOf(sortedEffects[sortedEffects.length - 1].id) + 1
      } else if (dragOverIndex === 0) {
        toOrderIndex = effectOrder.indexOf(sortedEffects[0].id)
      } else {
        toOrderIndex = effectOrder.indexOf(sortedEffects[dragOverIndex].id)
      }

      if (fromOrderIndex !== -1 && toOrderIndex !== -1 && fromOrderIndex !== toOrderIndex) {
        reorderEffect(fromOrderIndex, toOrderIndex)
      }
    }

    setDragIndex(null)
    setDragOverIndex(null)
    isDragging.current = false
    isPointerDown.current = false
  }, [dragIndex, dragOverIndex, effectOrder, reorderEffect, sortedEffects])

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: '#0f0f1a' }}>
      {/* Header: Preset bar */}
      <PresetDropdownBar />

      {/* FX count header */}
      <div
        className="flex-shrink-0 flex items-center px-2"
        style={{
          height: 24,
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span
          className="text-[9px] uppercase tracking-widest"
          style={{ color: 'var(--text-muted)' }}
        >
          FX ({sortedEffects.length})
        </span>
      </div>

      {/* Content area */}
      {expandedId && sortedEffects.find(e => e.id === expandedId) ? (
        // Expanded detail view — single card fills the panel
        (() => {
          const effect = sortedEffects.find(e => e.id === expandedId)!
          return (
            <div className="flex-1 min-h-0 flex flex-col">
              <EffectCard
                effect={effect}
                mode="full"
                isBypassed={effectBypassed[effect.id] || false}
                isSelected={true}
                onBypass={() => toggleEffectBypassed(effect.id)}
                onRemove={() => { disableEffect(effect.id); setExpandedId(null) }}
                onSelect={() => setSelectedEffect(effect.id)}
                onToggleExpand={() => setExpandedId(null)}
                onPointerDown={() => {}}
                onPointerMove={() => {}}
                onPointerUp={() => {}}
                isDragging={false}
                isDropTarget={false}
              />
            </div>
          )
        })()
      ) : (
        // Compact card list
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto"
          style={{ padding: 'var(--panel-padding-sm)' }}
        >
          {sortedEffects.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-ghost)' }}>
                Enable effects from the grid below
              </span>
            </div>
          ) : (
            <div ref={listRef} className="flex flex-col gap-2">
              {sortedEffects.map((effect, index) => (
                <div key={effect.id} data-effect-id={effect.id}>
                  <EffectCard
                    effect={effect}
                    mode="compact"
                    isBypassed={effectBypassed[effect.id] || false}
                    isSelected={selectedEffectId === effect.id}
                    onBypass={() => toggleEffectBypassed(effect.id)}
                    onRemove={() => disableEffect(effect.id)}
                    onSelect={() => setSelectedEffect(effect.id)}
                    onToggleExpand={() => toggleExpanded(effect.id)}
                    onPointerDown={(e) => handlePointerDown(e, index)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    isDragging={dragIndex === index}
                    isDropTarget={dragOverIndex === index && dragIndex !== null && dragIndex !== index}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
