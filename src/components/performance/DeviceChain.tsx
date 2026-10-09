import { memo, useContext, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import type React from 'react'
import { useChainIds } from '../../hooks/useChainIds'
import { disableEffect } from '../../hooks/useEffectDisable'
import { useUIStore } from '../../stores/uiStore'
import { useEffectSequencerStore } from '../../stores/effectSequencerStore'
import { useRoutingStore } from '../../stores/routingStore'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { getEffectStatusText } from '../../config/statusDescriptions'
import { DeviceCard } from './DeviceCard'
import { DeviceChainContext, type DeviceChainActions } from './deviceChainContext'
import { ModulatorsCard } from './ModulatorsCard'
import { WarpCard } from './WarpCard'
import { useWarpStore } from '../../stores/warpStore'

/**
 * Bottom panel, Devices tab: the modulators card, then one DeviceCard per active effect in signal order
 * (left to right), with "+" gaps and a final "+" card that jump to the browser search. Owns what the chain
 * list used to: ensureTrack per active effect, keeping a valid selection (never clobbering a selected
 * modulator), drag reorder, keyboard, bypass and remove. The selected card is scrolled into view.
 */

/** Open the effects browser (panel, or drawer below 1100px) in List view and focus its search box. */
function focusBrowserSearch() {
  const ui = useUIStore.getState()
  if (window.matchMedia('(max-width: 1099.98px)').matches) {
    if (ui.drawer !== 'browser') ui.toggleDrawer('browser')
  } else if (!ui.showBrowser) {
    ui.togglePanel('browser')
  }
  requestAnimationFrame(() => {
    if (!document.querySelector('[data-effect-search]')) {
      document.querySelector<HTMLButtonElement>('[data-browser-view="list"]')?.click()
    }
    requestAnimationFrame(() => document.querySelector<HTMLInputElement>('[data-effect-search]')?.focus())
  })
}

/** The device after `gone` in the previous chain that is still in the chain, else the nearest one before it, else the first. */
function neighbourIn(prev: string[], ids: string[], gone: string): string | null {
  const i = prev.indexOf(gone)
  if (i >= 0) {
    for (let j = i + 1; j < prev.length; j++) if (ids.includes(prev[j])) return prev[j]
    for (let j = i - 1; j >= 0; j--) if (ids.includes(prev[j])) return prev[j]
  }
  return ids[0] ?? null
}

const clearDropMarks = (root: HTMLElement | null) => {
  root?.querySelectorAll('[data-drop]').forEach((el) => el.removeAttribute('data-drop'))
}

/** "+" between devices: click opens the browser search; dropping a dragged card here moves it to this spot. */
const AddGap = memo(function AddGap({ beforeId }: { beforeId: string | null }) {
  const a = useContext(DeviceChainContext)
  return (
    <div
      className="seg-chain-plus"
      data-chain-gap={beforeId ?? 'end'}
      aria-hidden
      title="Add a device"
      onClick={focusBrowserSearch}
      onDragOver={(ev) => a.gapOver(ev)}
      onDragLeave={a.dragLeave}
      onDrop={(ev) => a.dropAt(beforeId, ev)}
    >
      +
    </div>
  )
})

export const DeviceChain = memo(function DeviceChain() {
  const ids = useChainIds()
  const selectedEffectId = useUIStore((s) => s.selectedEffectId)
  const selectedModulator = useUIStore((s) => s.selectedModulator)
  const bottomTab = useUIStore((s) => s.bottomTab)
  const showBottom = useUIStore((s) => s.showBottom)
  const effectBypassed = useGlitchEngineStore((s) => s.effectBypassed)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const idsRef = useRef(ids)
  useEffect(() => { idsRef.current = ids })

  // Every active effect gets a sequencer track
  useEffect(() => {
    const { ensureTrack } = useEffectSequencerStore.getState()
    for (const id of ids) ensureTrack(id)
  }, [ids])

  // Keep a valid selection. A selected modulator owns the inspector: never replace it with a device.
  // When the selected device leaves the chain, select the device that followed it, else the one before it.
  // Layout effect: the re-selection lands before paint, so the inspector never flashes its empty state.
  const prevIdsRef = useRef(ids)
  useLayoutEffect(() => {
    const prev = prevIdsRef.current
    prevIdsRef.current = ids
    const { setSelectedEffect } = useUIStore.getState()
    if (selectedModulator) return
    if (selectedEffectId && !ids.includes(selectedEffectId)) setSelectedEffect(neighbourIn(prev, ids, selectedEffectId))
    else if (!selectedEffectId && ids.length > 0) setSelectedEffect(ids[0])
  }, [ids, selectedEffectId, selectedModulator])

  // Scroll the selected card into view (horizontally, inside the chain only; never scrolls the page)
  useEffect(() => {
    const sc = scrollerRef.current
    if (!sc || !selectedEffectId) return
    const card = sc.querySelector<HTMLElement>(`[data-device-card="${CSS.escape(selectedEffectId)}"]`)
    if (!card) return
    const s = sc.getBoundingClientRect()
    const r = card.getBoundingClientRect()
    const pad = 8
    if (r.left < s.left + pad) sc.scrollLeft -= s.left + pad - r.left
    else if (r.right > s.right - pad) sc.scrollLeft += Math.min(r.right - (s.right - pad), r.left - (s.left + pad))
  }, [selectedEffectId, ids, bottomTab, showBottom])

  const draggedRef = useRef<string | null>(null)
  const actions = useMemo<DeviceChainActions>(() => {
    const dragged = draggedRef
    const reorder = (src: string, targetId: string, after: boolean) => {
      const { effectOrder, reorderEffect } = useRoutingStore.getState()
      const from = effectOrder.indexOf(src)
      let to = effectOrder.indexOf(targetId) + (after ? 1 : 0)
      if (from < to) to--
      if (from !== -1 && to >= 0 && from !== to) reorderEffect(from, to)
    }
    // Move src just before beforeId (null = after the last active device)
    const moveBefore = (src: string, beforeId: string | null) => {
      if (beforeId) { if (beforeId !== src) reorder(src, beforeId, false); return }
      const list = idsRef.current
      const last = list[list.length - 1]
      if (last && last !== src) reorder(src, last, true)
    }
    const sideOf = (ev: React.DragEvent) => {
      const r = ev.currentTarget.getBoundingClientRect()
      return ev.clientX >= r.left + r.width / 2
    }
    return {
      select: (id) => useUIStore.getState().setSelectedEffect(id),
      toggleBypass: (id) => useGlitchEngineStore.getState().toggleEffectBypassed(id),
      remove: (id) => {
        disableEffect(id)
        useEffectSequencerStore.getState().removeTrack(id)
      },
      move: (id, dir) => {
        const list = idsRef.current
        const neighbor = list[list.indexOf(id) + dir]
        if (!neighbor) return
        const { effectOrder, reorderEffect } = useRoutingStore.getState()
        const from = effectOrder.indexOf(id)
        const to = effectOrder.indexOf(neighbor)
        if (from !== -1 && to !== -1) reorderEffect(from, to)
        // keep focus on the moved card after React re-orders the DOM
        requestAnimationFrame(() => scrollerRef.current?.querySelector<HTMLElement>(`[data-device-card="${CSS.escape(id)}"]`)?.focus())
      },
      focusSibling: (id, dir) => {
        const list = idsRef.current
        const next = list[list.indexOf(id) + dir]
        if (next) scrollerRef.current?.querySelector<HTMLElement>(`[data-device-card="${CSS.escape(next)}"]`)?.focus()
      },
      dragStart: (id, ev) => {
        dragged.current = id
        ev.dataTransfer.effectAllowed = 'move'
        ev.dataTransfer.setData('text/plain', id)
        const card = (ev.currentTarget as HTMLElement).closest('[data-device-card]')
        if (card instanceof HTMLElement) ev.dataTransfer.setDragImage(card, 13, 20)
      },
      dragOver: (id, ev) => {
        if (!dragged.current) return // only our own card drags (not modulation-source drops onto dials)
        ev.preventDefault()
        ev.dataTransfer.dropEffect = 'move'
        const mark = dragged.current === id ? '' : sideOf(ev) ? 'after' : 'before'
        const el = ev.currentTarget as HTMLElement
        if ((el.getAttribute('data-drop') ?? '') !== mark) {
          clearDropMarks(scrollerRef.current)
          if (mark) el.setAttribute('data-drop', mark)
        }
      },
      dragLeave: (ev) => {
        const next = ev.relatedTarget as Node | null
        if (next && ev.currentTarget.contains(next)) return
        ;(ev.currentTarget as HTMLElement).removeAttribute('data-drop')
      },
      drop: (id, ev) => {
        const src = dragged.current
        dragged.current = null
        clearDropMarks(scrollerRef.current)
        if (!src) return
        ev.preventDefault()
        if (src !== id) reorder(src, id, sideOf(ev))
      },
      gapOver: (ev) => {
        if (!dragged.current) return
        ev.preventDefault()
        ev.dataTransfer.dropEffect = 'move'
        const el = ev.currentTarget as HTMLElement
        if (el.getAttribute('data-drop') !== 'gap') {
          clearDropMarks(scrollerRef.current)
          el.setAttribute('data-drop', 'gap')
        }
      },
      dropAt: (beforeId, ev) => {
        const src = dragged.current
        dragged.current = null
        clearDropMarks(scrollerRef.current)
        if (!src) return
        ev.preventDefault()
        moveBefore(src, beforeId)
      },
      dragEnd: () => {
        dragged.current = null
        clearDropMarks(scrollerRef.current)
      },
      hover: (id) => {
        useUIStore.getState().setStatusText(
          id ? `${getEffectStatusText(id)}. Click to select, Shift+click to bypass, drag the side strip to reorder, double-click it to collapse (C)` : null,
        )
      },
    }
  }, [])

  // Vertical wheel scrolls the chain sideways (the panel has no vertical scroll)
  const onWheel = (ev: React.WheelEvent<HTMLDivElement>) => {
    if (Math.abs(ev.deltaX) > Math.abs(ev.deltaY)) return
    ev.currentTarget.scrollLeft += ev.deltaY
  }

  // The Time warp card sits where the picture is warped: before the devices, or after them
  const warpAfter = useWarpStore((s) => s.placement === 'after' && s.appliesTo !== 'audio')

  const selected = selectedEffectId && ids.includes(selectedEffectId) ? selectedEffectId : null

  return (
    <DeviceChainContext.Provider value={actions}>
      <div className="seg-chain" data-device-chain ref={scrollerRef} onWheel={onWheel}>
        <ModulatorsCard />
        {!warpAfter && <WarpCard />}
        <div className="seg-chain-devices" role="list" aria-label="Device chain, signal flows left to right">
          {ids.map((id, i) => (
            <div key={id} className="seg-chain-slot" role="listitem">
              <AddGap beforeId={id} />
              <DeviceCard effectId={id} index={i} selected={id === selected} bypassed={!!effectBypassed[id]} />
            </div>
          ))}
        </div>
        <AddGap beforeId={null} />
        {warpAfter && <WarpCard />}
        <button
          type="button"
          data-device-add
          className="seg-chain-add"
          aria-label="Add a device: search effects"
          title="Add a device"
          onClick={focusBrowserSearch}
          onDragOver={(ev) => actions.gapOver(ev)}
          onDragLeave={actions.dragLeave}
          onDrop={(ev) => actions.dropAt(null, ev)}
        >
          +
        </button>
        {ids.length === 0 && (
          <p className="seg-chain-empty">Pick an effect in the browser to add it to the chain.</p>
        )}
      </div>
    </DeviceChainContext.Provider>
  )
})
