import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useActiveEffects } from '../../hooks/useActiveEffects'
import { useEffectDisable } from '../../hooks/useEffectDisable'
import { useUIStore } from '../../stores/uiStore'
import { useEffectSequencerStore } from '../../stores/effectSequencerStore'
import { useRoutingStore } from '../../stores/routingStore'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { usePresetLibraryStore } from '../../stores/presetLibraryStore'
import { getUIStatusText, getEffectStatusText } from '../../config/statusDescriptions'
import { EffectParameters_v2 } from './ExpandedParameterPanel_v2'
import { TrackAudioReactivePanel } from '../sequencer/TrackAudioReactivePanel'

/**
 * Right column: the effect chain (signal order, top to bottom) and the selected
 * effect's settings + audio band. Owns what the old left tab rail did:
 * selection, auto-select, ensureTrack per active effect, drag reorder,
 * per-effect bypass (button or shift+click), double-click remove, clear-all
 * and bypass-all.
 */
const FOCUS_RING = { outlineOffset: -1 } as const

interface ChainRowProps {
  id: string
  label: string
  color: string
  index: number
  primaryLabel: string
  primaryValue: number
  isSel: boolean
  isBypassed: boolean
  marker: 'before' | 'after' | null
  onSelect: (id: string) => void
  onRemove: (id: string) => void
  onToggleBypass: (id: string) => void
  onMove: (id: string, dir: -1 | 1) => void
  onDragStartRow: (id: string, ev: React.DragEvent) => void
  onDragOverRow: (id: string, ev: React.DragEvent) => void
  onDragLeaveRow: (ev: React.DragEvent) => void
  onDropRow: (id: string, ev: React.DragEvent) => void
  onDragEndRow: () => void
  onHover: (id: string | null) => void
}

const ChainRow = memo(function ChainRow(p: ChainRowProps) {
  const { id, label, color, isSel, isBypassed, marker } = p
  const shadow =
    marker === 'after' ? 'inset 0 -2px 0 var(--text-primary)' : marker === 'before' ? 'inset 0 2px 0 var(--text-primary)' : undefined
  return (
    <div
      role="option"
      tabIndex={0}
      aria-selected={isSel}
      data-chain-row={id}
      data-selected={isSel || undefined}
      draggable
      onDragStart={(ev) => p.onDragStartRow(id, ev)}
      onDragOver={(ev) => p.onDragOverRow(id, ev)}
      onDragLeave={p.onDragLeaveRow}
      onDrop={(ev) => p.onDropRow(id, ev)}
      onDragEnd={p.onDragEndRow}
      onMouseEnter={() => p.onHover(id)}
      onMouseLeave={() => p.onHover(null)}
      onClick={(ev) => {
        if (ev.shiftKey) {
          ev.stopPropagation()
          p.onToggleBypass(id)
        } else {
          p.onSelect(id)
        }
      }}
      onDoubleClick={() => p.onRemove(id)}
      onKeyDown={(ev) => {
        if (ev.target !== ev.currentTarget) return
        // Every handled key stops here so window shortcuts (Space = sequencer play) do not also fire
        if (ev.key === 'Enter' && ev.shiftKey) p.onToggleBypass(id)
        else if (ev.key === 'Enter' || ev.key === ' ') p.onSelect(id)
        else if (ev.key === 'Delete' || ev.key === 'Backspace') p.onRemove(id)
        else if (ev.altKey && (ev.key === 'ArrowUp' || ev.key === 'ArrowDown')) p.onMove(id, ev.key === 'ArrowUp' ? -1 : 1)
        else return
        ev.preventDefault()
        ev.stopPropagation()
      }}
      className={`chain-row grid items-center gap-2.5 px-3.5 py-2.5 rule-b cursor-pointer ${isSel ? 'surface-raised-row' : ''}`}
      style={{ gridTemplateColumns: '18px 1fr auto auto auto', boxShadow: shadow, opacity: isBypassed ? 0.45 : 1, userSelect: 'none', ...FOCUS_RING }}
    >
      <span className="hud-label" style={{ letterSpacing: 0 }}>{String(p.index + 1).padStart(2, '0')}</span>
      <span className="flex items-center gap-2 text-[12px] min-w-0" style={{ letterSpacing: '.08em', color: 'var(--text-primary)' }}>
        <span className="w-[7px] h-[7px] flex-shrink-0" style={{ background: color, borderRadius: 2 }} />
        <span className="truncate" title={label}>{label}</span>
      </span>
      <span className="hud-label" style={{ letterSpacing: '.06em' }}>
        {p.primaryLabel} <b className="hud-value" style={{ fontWeight: 500 }}>{p.primaryValue}</b>
      </span>
      <button
        data-row-bypass
        tabIndex={-1}
        title={isBypassed ? 'Un-bypass' : 'Bypass'}
        aria-label={`Bypass ${label}`}
        aria-pressed={isBypassed}
        className="hud-label px-1.5"
        onClick={(ev) => { ev.stopPropagation(); p.onToggleBypass(id) }}
        onDoubleClick={(ev) => ev.stopPropagation()}
        style={{ color: isBypassed ? 'var(--text-primary)' : 'var(--text-muted)', ...FOCUS_RING }}
      >
        {isBypassed ? 'OFF' : 'ON'}
      </button>
      <button
        data-row-remove
        tabIndex={-1}
        title="Remove"
        aria-label={`Remove ${label}`}
        className="hud-label px-1.5"
        onClick={(ev) => { ev.stopPropagation(); p.onRemove(id) }}
        onDoubleClick={(ev) => ev.stopPropagation()}
        style={{ color: 'var(--text-muted)', ...FOCUS_RING }}
      >
        {'×'}
      </button>
    </div>
  )
})

const ChainSettings = memo(function ChainSettings({ effectId }: { effectId: string }) {
  return (
    <div data-chain-settings={effectId} className="flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
      <div style={{ padding: 8 }}><EffectParameters_v2 effectId={effectId} /></div>
      <div style={{ borderTop: '1px solid var(--border)' }}><TrackAudioReactivePanel effectId={effectId} /></div>
    </div>
  )
})

function ChainPanelImpl() {
  const { sortedEffects } = useActiveEffects()
  const selectedEffectId = useUIStore((s) => s.selectedEffectId)
  const setSelectedEffect = useUIStore((s) => s.setSelectedEffect)
  const setStatusText = useUIStore((s) => s.setStatusText)
  const ensureTrack = useEffectSequencerStore((s) => s.ensureTrack)
  const removeTrack = useEffectSequencerStore((s) => s.removeTrack)
  const bypassActive = useGlitchEngineStore((s) => s.bypassActive)
  const effectBypassed = useGlitchEngineStore((s) => s.effectBypassed)
  const { disableEffect } = useEffectDisable()
  // disableEffect changes identity on every store tick; keep handlers stable via a ref
  const disableRef = useRef(disableEffect)

  // Referentially stable id list: only changes when membership/order changes, not on param ticks
  const idsKey = sortedEffects.map((e) => e.id).join('|')
  const ids = useMemo(() => idsKey.split('|').filter(Boolean), [idsKey])
  const idsRef = useRef(ids)
  useEffect(() => {
    idsRef.current = ids
    disableRef.current = disableEffect
  })

  // Every active effect gets a sequencer track (was SharedEffectTabsBar)
  useEffect(() => {
    for (const id of ids) ensureTrack(id)
  }, [ids, ensureTrack])

  // Keep a valid selection (was SharedEffectTabsBar)
  useEffect(() => {
    if (selectedEffectId && !ids.includes(selectedEffectId)) setSelectedEffect(ids[0] ?? null)
    else if (!selectedEffectId && ids.length > 0) setSelectedEffect(ids[0])
  }, [ids, selectedEffectId, setSelectedEffect])

  // Drag reorder: same semantics as EffectTabsBar (drop above/below a row, or at the end)
  const dragged = useRef<string | null>(null)
  const [over, setOver] = useState<{ id: string; after: boolean } | null>(null)
  const drop = useCallback((targetId: string, after: boolean) => {
    const src = dragged.current
    dragged.current = null
    setOver(null)
    if (!src || src === targetId) return
    const { effectOrder, reorderEffect } = useRoutingStore.getState()
    const from = effectOrder.indexOf(src)
    let to: number
    if (targetId === '__end__') {
      to = effectOrder.length - 1
    } else {
      to = effectOrder.indexOf(targetId) + (after ? 1 : 0)
      if (from < to) to--
    }
    if (from !== -1 && to >= 0 && from !== to) reorderEffect(from, to)
  }, [])

  const onDragStartRow = useCallback((id: string, ev: React.DragEvent) => {
    dragged.current = id
    ev.dataTransfer.effectAllowed = 'move'
    ev.dataTransfer.setData('text/plain', id)
  }, [])
  const onDragOverRow = useCallback((id: string, ev: React.DragEvent) => {
    ev.preventDefault()
    ev.dataTransfer.dropEffect = 'move'
    const r = ev.currentTarget.getBoundingClientRect()
    const after = ev.clientY >= r.top + r.height / 2
    setOver((o) => (o && o.id === id && o.after === after ? o : { id, after }))
  }, [])
  const onDragLeaveRow = useCallback((ev: React.DragEvent) => {
    const next = ev.relatedTarget as Node | null
    if (next && ev.currentTarget.contains(next)) return
    setOver(null)
  }, [])
  const onDropRow = useCallback((id: string, ev: React.DragEvent) => {
    ev.preventDefault()
    const r = ev.currentTarget.getBoundingClientRect()
    drop(id, ev.clientY >= r.top + r.height / 2)
  }, [drop])
  const onDragEndRow = useCallback(() => {
    dragged.current = null
    setOver(null)
  }, [])

  const remove = useCallback((id: string) => {
    disableRef.current(id)
    removeTrack(id)
  }, [removeTrack])
  const onSelect = useCallback((id: string) => setSelectedEffect(id), [setSelectedEffect])
  const onToggleBypass = useCallback((id: string) => useGlitchEngineStore.getState().toggleEffectBypassed(id), [])
  const onHover = useCallback((id: string | null) => {
    setStatusText(id ? getEffectStatusText(id) + '. Click to select, Shift+click to bypass, double-click to remove' : null)
  }, [setStatusText])
  const onMove = useCallback((id: string, dir: -1 | 1) => {
    const list = idsRef.current
    const neighbor = list[list.indexOf(id) + dir]
    if (!neighbor) return
    const { effectOrder, reorderEffect } = useRoutingStore.getState()
    const from = effectOrder.indexOf(id)
    const to = effectOrder.indexOf(neighbor)
    if (from !== -1 && to !== -1) reorderEffect(from, to)
  }, [])

  const selected = selectedEffectId && ids.includes(selectedEffectId) ? selectedEffectId : null

  return (
    <>
      <div className="flex items-center gap-2 px-3.5 py-2.5 rule-b flex-shrink-0">
        <span className="hud-label" style={{ color: 'var(--text-secondary)' }}>Chain</span>
        <span className="flex-1" />
        <button
          data-chain-bypass
          aria-pressed={bypassActive}
          className="hud-label px-2 py-1"
          title="Bypass all effects"
          style={{
            borderRadius: 2,
            border: `1px solid ${bypassActive ? 'var(--text-primary)' : 'var(--border-emphasis)'}`,
            background: bypassActive ? 'var(--bg-elevated)' : 'transparent',
            color: bypassActive ? 'var(--text-primary)' : 'var(--text-secondary)',
            ...FOCUS_RING,
          }}
          onClick={() => {
            const s = useGlitchEngineStore.getState()
            s.setBypassActive(!s.bypassActive)
          }}
          onMouseEnter={() => setStatusText(getUIStatusText('bypassAll'))}
          onMouseLeave={() => setStatusText(null)}
        >
          Bypass
        </button>
        <button
          data-chain-clear
          className="hud-label px-2 py-1"
          title="Clear all effects"
          disabled={ids.length === 0}
          style={{
            borderRadius: 2,
            border: '1px solid var(--border-emphasis)',
            color: 'var(--text-secondary)',
            opacity: ids.length ? 1 : 0.4,
            ...FOCUS_RING,
          }}
          onClick={() => {
            for (const id of ids) disableEffect(id)
            usePresetLibraryStore.getState().clearActivePresetName()
          }}
          onMouseEnter={() => setStatusText(getUIStatusText('clearAll'))}
          onMouseLeave={() => setStatusText(null)}
        >
          Clear
        </button>
      </div>

      {sortedEffects.length === 0 ? (
        <p className="px-3.5 py-3.5 text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Click an effect in the grid to add it to the end of the chain.
        </p>
      ) : (
        <div className="flex-shrink-0">
          <div role="listbox" aria-label="Effect chain">
            {sortedEffects.map((e, i) => (
              <ChainRow
                key={e.id}
                id={e.id}
                label={e.label}
                color={e.color}
                index={i}
                primaryLabel={e.primaryLabel}
                primaryValue={e.primaryValue}
                isSel={e.id === selected}
                isBypassed={!!effectBypassed[e.id]}
                marker={over?.id === e.id ? (over.after ? 'after' : 'before') : null}
                onSelect={onSelect}
                onRemove={remove}
                onToggleBypass={onToggleBypass}
                onMove={onMove}
                onDragStartRow={onDragStartRow}
                onDragOverRow={onDragOverRow}
                onDragLeaveRow={onDragLeaveRow}
                onDropRow={onDropRow}
                onDragEndRow={onDragEndRow}
                onHover={onHover}
              />
            ))}
          </div>
          <div
            data-chain-end
            onDragOver={(ev) => {
              ev.preventDefault()
              ev.dataTransfer.dropEffect = 'move'
            }}
            onDrop={(ev) => {
              ev.preventDefault()
              drop('__end__', true)
            }}
            style={{ height: 10 }}
          />
          <p className="px-3.5 py-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Drag to reorder, shift+click to bypass, double-click to remove.
          </p>
        </div>
      )}

      {selected ? (
        <ChainSettings key={selected} effectId={selected} />
      ) : (
        sortedEffects.length > 0 && (
          <p className="px-3.5 py-3.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Select an effect in the chain to edit it.
          </p>
        )
      )}
    </>
  )
}

export const ChainPanel = memo(ChainPanelImpl)
