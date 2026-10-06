import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useActiveEffects } from '../../hooks/useActiveEffects'
import { useEffectDisable } from '../../hooks/useEffectDisable'
import { useUIStore } from '../../stores/uiStore'
import { useEffectSequencerStore } from '../../stores/effectSequencerStore'
import { useRoutingStore } from '../../stores/routingStore'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { getUIStatusText, getEffectStatusText } from '../../config/statusDescriptions'
import { PresetDropdownBar } from '../presets/PresetDropdownBar'
import { EffectParameters_v2 } from './ExpandedParameterPanel_v2'
import { TrackAudioReactivePanel } from '../sequencer/TrackAudioReactivePanel'

/**
 * Right column: the effect chain (signal order, top to bottom) and the selected
 * effect's settings + audio band. Owns what the old left tab rail did:
 * selection, auto-select, ensureTrack per active effect, drag reorder,
 * per-effect bypass (button or shift+click), double-click remove, clear-all
 * and bypass-all.
 */
function ChainPanelImpl() {
  const { sortedEffects } = useActiveEffects()
  const selectedEffectId = useUIStore((s) => s.selectedEffectId)
  const setSelectedEffect = useUIStore((s) => s.setSelectedEffect)
  const setStatusText = useUIStore((s) => s.setStatusText)
  const ensureTrack = useEffectSequencerStore((s) => s.ensureTrack)
  const removeTrack = useEffectSequencerStore((s) => s.removeTrack)
  const effectOrder = useRoutingStore((s) => s.effectOrder)
  const reorderEffect = useRoutingStore((s) => s.reorderEffect)
  const bypassActive = useGlitchEngineStore((s) => s.bypassActive)
  const effectBypassed = useGlitchEngineStore((s) => s.effectBypassed)
  const toggleEffectBypassed = useGlitchEngineStore((s) => s.toggleEffectBypassed)
  const { disableEffect } = useEffectDisable()

  const ids = useMemo(() => sortedEffects.map((e) => e.id), [sortedEffects])

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
  const drop = useCallback(
    (targetId: string, after: boolean) => {
      const src = dragged.current
      dragged.current = null
      setOver(null)
      if (!src || src === targetId) return
      const from = effectOrder.indexOf(src)
      let to: number
      if (targetId === '__end__') {
        to = effectOrder.length - 1
      } else {
        to = effectOrder.indexOf(targetId) + (after ? 1 : 0)
        if (from < to) to--
      }
      if (from !== -1 && to >= 0 && from !== to) reorderEffect(from, to)
    },
    [effectOrder, reorderEffect],
  )

  const remove = useCallback(
    (id: string) => {
      disableEffect(id)
      removeTrack(id)
    },
    [disableEffect, removeTrack],
  )
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
          }}
          onClick={() => useGlitchEngineStore.getState().setBypassActive(!bypassActive)}
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
          }}
          onClick={() => {
            for (const id of ids) disableEffect(id)
          }}
          onMouseEnter={() => setStatusText(getUIStatusText('clearAll'))}
          onMouseLeave={() => setStatusText(null)}
        >
          Clear
        </button>
      </div>

      {/* Temporary: Task 4 moves presets to the header */}
      <div className="flex-shrink-0 rule-b">
        <PresetDropdownBar />
      </div>

      {sortedEffects.length === 0 ? (
        <p className="px-3.5 py-3.5 text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Click an effect in the grid to add it to the end of the chain.
        </p>
      ) : (
        <div className="flex-shrink-0">
          {sortedEffects.map((e, i) => {
            const isSel = e.id === selected
            const isBypassed = !!effectBypassed[e.id]
            const marker =
              over?.id === e.id
                ? over.after
                  ? 'inset 0 -2px 0 var(--text-primary)'
                  : 'inset 0 2px 0 var(--text-primary)'
                : undefined
            return (
              <div
                key={e.id}
                data-chain-row={e.id}
                data-selected={isSel || undefined}
                draggable
                onDragStart={(ev) => {
                  dragged.current = e.id
                  ev.dataTransfer.effectAllowed = 'move'
                  ev.dataTransfer.setData('text/plain', e.id)
                }}
                onDragOver={(ev) => {
                  ev.preventDefault()
                  ev.dataTransfer.dropEffect = 'move'
                  const r = ev.currentTarget.getBoundingClientRect()
                  const after = ev.clientY >= r.top + r.height / 2
                  setOver((o) => (o && o.id === e.id && o.after === after ? o : { id: e.id, after }))
                }}
                onDragLeave={() => setOver(null)}
                onDrop={(ev) => {
                  ev.preventDefault()
                  const r = ev.currentTarget.getBoundingClientRect()
                  drop(e.id, ev.clientY >= r.top + r.height / 2)
                }}
                onDragEnd={() => {
                  dragged.current = null
                  setOver(null)
                }}
                onMouseEnter={() =>
                  setStatusText(getEffectStatusText(e.id) + '. Click to select, Shift+click to bypass, double-click to remove')
                }
                onMouseLeave={() => setStatusText(null)}
                onClick={(ev) => {
                  if (ev.shiftKey) {
                    ev.stopPropagation()
                    toggleEffectBypassed(e.id)
                  } else {
                    setSelectedEffect(e.id)
                  }
                }}
                onDoubleClick={() => remove(e.id)}
                className={`grid items-center gap-2.5 px-3.5 py-2.5 rule-b cursor-pointer ${isSel ? 'surface-raised-row' : ''}`}
                style={{ gridTemplateColumns: '18px 1fr auto auto', boxShadow: marker, opacity: isBypassed ? 0.45 : 1 }}
              >
                <span className="hud-label" style={{ letterSpacing: 0 }}>{String(i + 1).padStart(2, '0')}</span>
                <span className="flex items-center gap-2 text-[12px] min-w-0" style={{ letterSpacing: '.08em', color: 'var(--text-primary)' }}>
                  <span className="w-[7px] h-[7px] flex-shrink-0" style={{ background: e.color, borderRadius: 2 }} />
                  <span className="truncate" title={e.label}>{e.label}</span>
                </span>
                <span className="hud-label" style={{ letterSpacing: '.06em' }}>
                  {e.primaryLabel} <b className="hud-value" style={{ fontWeight: 500 }}>{e.primaryValue}</b>
                </span>
                <button
                  data-row-bypass
                  title={isBypassed ? 'Un-bypass' : 'Bypass'}
                  className="hud-label px-1.5"
                  onClick={(ev) => {
                    ev.stopPropagation()
                    toggleEffectBypassed(e.id)
                  }}
                  onDoubleClick={(ev) => ev.stopPropagation()}
                  style={{ color: isBypassed ? 'var(--text-primary)' : 'var(--text-muted)' }}
                >
                  {isBypassed ? 'OFF' : 'ON'}
                </button>
              </div>
            )
          })}
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
        <div data-chain-settings={selected} className="flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          <div style={{ padding: 8 }}><EffectParameters_v2 effectId={selected} /></div>
          <div style={{ borderTop: '1px solid var(--border)' }}><TrackAudioReactivePanel effectId={selected} /></div>
        </div>
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
