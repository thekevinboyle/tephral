import { useState, useRef, useCallback } from 'react'
import { useRoutingStore } from '../../stores/routingStore'
import { useEffectDisable } from '../../hooks/useEffectDisable'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { useEffectSequencerStore } from '../../stores/effectSequencerStore'
import { useUIStore } from '../../stores/uiStore'
import { getEffectStatusText } from '../../config/statusDescriptions'
import {
  EFFECTS,
  STRAND_EFFECTS,
  MOTION_EFFECTS,
  DESTRUCTION_EFFECTS,
  type EffectDefinition,
} from '../../config/effects'

const ALL_EFFECTS: EffectDefinition[] = [
  ...EFFECTS,
  ...STRAND_EFFECTS,
  ...MOTION_EFFECTS,
  ...DESTRUCTION_EFFECTS,
]
const EFFECT_MAP = new Map(ALL_EFFECTS.map((e) => [e.id, e]))

interface EffectTabsBarProps {
  activeEffectIds: string[]
  selectedEffectId: string | null
  onSelect: (effectId: string) => void
}

export function EffectTabsBar({ activeEffectIds, selectedEffectId, onSelect }: EffectTabsBarProps) {
  const { effectOrder, reorderEffect } = useRoutingStore()
  const { disableEffect } = useEffectDisable()
  const setStatusText = useUIStore((s) => s.setStatusText)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [dragSide, setDragSide] = useState<'left' | 'right'>('left')
  const draggedId = useRef<string | null>(null)

  const handleDragStart = useCallback((effectId: string, e: React.DragEvent) => {
    draggedId.current = effectId
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', effectId)
  }, [])

  const handleDragOver = useCallback((effectId: string, e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const midY = rect.top + rect.height / 2
    setDragOverId(effectId)
    setDragSide(e.clientY < midY ? 'left' : 'right')
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverId(null)
  }, [])

  const handleDrop = useCallback(
    (targetId: string | '__end__', e: React.DragEvent) => {
      e.preventDefault()
      const sourceId = draggedId.current
      if (!sourceId || sourceId === targetId) {
        setDragOverId(null)
        draggedId.current = null
        return
      }

      const fromIndex = effectOrder.indexOf(sourceId)

      if (targetId === '__end__') {
        // Move to the end of the effect order
        const toIndex = effectOrder.length - 1
        if (fromIndex !== -1 && fromIndex !== toIndex) {
          reorderEffect(fromIndex, toIndex)
        }
      } else {
        let toIndex = effectOrder.indexOf(targetId)
        if (dragSide === 'right') toIndex++
        if (fromIndex < toIndex) toIndex--

        if (fromIndex !== -1 && toIndex >= 0 && fromIndex !== toIndex) {
          reorderEffect(fromIndex, toIndex)
        }
      }

      setDragOverId(null)
      draggedId.current = null
    },
    [effectOrder, dragSide, reorderEffect],
  )

  const handleDragEnd = useCallback(() => {
    setDragOverId(null)
    draggedId.current = null
  }, [])

  const { toggleEffectBypassed, effectBypassed } = useGlitchEngineStore()
  const removeTrack = useEffectSequencerStore((s) => s.removeTrack)

  if (activeEffectIds.length === 0) {
    return (
      <div
        className="h-full flex items-center justify-center"
        style={{
          width: 48,
          padding: 'var(--panel-padding) 0',
          backgroundColor: 'var(--bg-surface)',
        }}
      >
        <span
          className="text-[9px] uppercase tracking-wider"
          style={{
            color: 'var(--text-ghost)',
            writingMode: 'vertical-lr',
            transform: 'rotate(180deg)',
          }}
        >
          No active effects
        </span>
      </div>
    )
  }

  return (
    <div
      className="h-full flex flex-col overflow-y-auto"
      style={{
        width: 48,
        scrollbarWidth: 'none',
        backgroundColor: 'var(--bg-surface)',
      }}
    >
      {activeEffectIds.map((effectId) => {
        const def = EFFECT_MAP.get(effectId)
        const color = def?.color ?? 'var(--text-muted)'
        const label = def?.label ?? effectId
        const isSelected = effectId === selectedEffectId
        const isBypassed = effectBypassed[effectId] || false
        const isDragTarget = dragOverId === effectId

        return (
          <div
            key={effectId}
            draggable
            onDragStart={(e) => handleDragStart(effectId, e)}
            onDragOver={(e) => handleDragOver(effectId, e)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(effectId, e)}
            onDragEnd={handleDragEnd}
            onMouseEnter={() => setStatusText(getEffectStatusText(effectId) + ' — Click to select, Shift+click to bypass, double-click to remove')}
            onMouseLeave={() => setStatusText(null)}
            onClick={(e) => {
              if (e.shiftKey) {
                e.stopPropagation()
                toggleEffectBypassed(effectId)
              } else {
                onSelect(effectId)
              }
            }}
            onDoubleClick={() => {
              disableEffect(effectId)
              removeTrack(effectId)
            }}
            className="flex-shrink-0 flex flex-col items-center justify-center gap-1 py-2 transition-colors relative cursor-grab active:cursor-grabbing"
            style={{
              minHeight: 44,
              backgroundColor: isSelected ? 'var(--bg-elevated)' : 'transparent',
              borderLeft: isSelected ? '2px solid var(--seq-accent)' : '2px solid transparent',
              color: isBypassed ? 'var(--text-ghost)' : isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
              opacity: isBypassed ? 0.4 : 1,
              borderTop: isDragTarget && dragSide === 'left' ? '2px solid var(--seq-accent)' : undefined,
              borderBottom: isDragTarget && dragSide === 'right' ? '2px solid var(--seq-accent)' : '1px solid var(--border)',
            }}
          >
            {/* LED */}
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{
                backgroundColor: isBypassed ? 'var(--text-ghost)' : color,
                opacity: isBypassed ? 0.3 : isSelected ? 1 : 0.4,
                boxShadow: isBypassed ? 'none' : isSelected ? `0 0 4px ${color}` : 'none',
              }}
            />
            <span
              className="text-[9px] font-bold uppercase tracking-wider"
              style={{
                writingMode: 'vertical-lr',
                transform: 'rotate(180deg)',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </span>
          </div>
        )
      })}
      {/* Trailing drop zone for dragging to end */}
      <div
        className="flex-1 min-h-[16px]"
        onDragOver={(e) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
          setDragOverId('__end__')
        }}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop('__end__', e)}
        style={{
          borderTop: dragOverId === '__end__' ? '2px solid var(--seq-accent)' : undefined,
        }}
      />
    </div>
  )
}
