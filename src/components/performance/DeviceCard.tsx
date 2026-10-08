import { memo, useCallback, useContext, useMemo, useRef } from 'react'
import { EFFECT_PARAM_REGISTRY, type LockableParam } from '../../config/effectParams'
import { getEffectInfo } from '../../config/effectNames'
import { displayParamLabel, paramStatusText } from '../../config/paramNames'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { useParamValue } from '../../hooks/useParamValue'
import { formatParamValue } from '../../utils/paramBar'
import { useUIStore } from '../../stores/uiStore'
import { Knob } from './Knob'
import { DeviceChainContext } from './deviceChainContext'

/**
 * One device in the bottom chain: a 26px side strip (colour stripe, power, vertical name, drag grip),
 * the effect's first 4 numeric params as dials (same rule as EffectSettings' strip) and a Dry/wet bar (effectMix; not the registry's own Mix param).
 * Props are primitives; the handlers come from DeviceChain through a context whose value never changes,
 * so a card re-renders only when its own selection/bypass/index flips. Dials and the mix bar subscribe
 * to their own values.
 */
const isToggle = (p: LockableParam) => p.min === 0 && p.max === 1 && p.step >= 1

const DeviceDial = memo(function DeviceDial({ effectId, param }: { effectId: string; param: LockableParam }) {
  const value = useParamValue(param)
  const onChange = useCallback((v: number) => param.apply(v), [param])
  return (
    <div className="seg-dev-dial">
      <Knob
        label={displayParamLabel(effectId, param, { short: true })} value={value} min={param.min} max={param.max} step={param.step}
        onChange={onChange} paramId={`${effectId}.${param.id}`} formatValue={formatParamValue}
        resetOnDoubleClick showArc color="var(--c)" statusText={paramStatusText(effectId, param)}
      />
    </div>
  )
})

const DeviceDials = memo(function DeviceDials({ effectId }: { effectId: string }) {
  // getParams() builds closures; build once per effect so the dials see stable param objects
  const params = useMemo(
    () => (EFFECT_PARAM_REGISTRY[effectId]?.getParams() ?? []).filter((p) => !isToggle(p)).slice(0, 4),
    [effectId],
  )
  if (params.length === 0) return <div className="seg-dev-noparams">No dials</div>
  return (
    <div className="seg-dev-knobs">
      {params.map((p) => <DeviceDial key={p.id} effectId={effectId} param={p} />)}
    </div>
  )
})

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

/** Mix bar: drag (or click) along the track to set effectMix, the same 0-1 value the pad mix-drag writes. */
const MixBar = memo(function MixBar({ effectId, name }: { effectId: string; name: string }) {
  const mix = useGlitchEngineStore((s) => s.effectMix[effectId] ?? 1)
  const trackRef = useRef<HTMLSpanElement>(null)
  const dragging = useRef(false)
  const set = (v: number) => useGlitchEngineStore.getState().setEffectMix(effectId, Math.round(clamp01(v) * 100) / 100)
  const fromX = (clientX: number) => {
    const r = trackRef.current?.getBoundingClientRect()
    if (r && r.width > 0) set((clientX - r.left) / r.width)
  }
  const pct = Math.round(mix * 100)
  return (
    <div
      data-device-mix
      className="seg-dev-mix"
      role="slider"
      tabIndex={0}
      aria-label={`${name} dry/wet`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-valuetext={`${pct}%`}
      onMouseEnter={() => useUIStore.getState().setStatusText(`Dry/wet: how much of ${name} is blended over the original`)}
      onMouseLeave={() => useUIStore.getState().setStatusText(null)}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        e.preventDefault()
        dragging.current = true
        e.currentTarget.setPointerCapture(e.pointerId)
        fromX(e.clientX)
      }}
      onPointerMove={(e) => { if (dragging.current) fromX(e.clientX) }}
      onPointerUp={(e) => {
        dragging.current = false
        try { e.currentTarget.releasePointerCapture(e.pointerId) } catch { /* not captured */ }
      }}
      onPointerCancel={() => { dragging.current = false }}
      onLostPointerCapture={() => { dragging.current = false }}
      onDoubleClick={() => set(1)}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 0.01 : 0.05
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') set(mix + step)
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') set(mix - step)
        else if (e.key === 'Home') set(0)
        else if (e.key === 'End') set(1)
        else return
        e.preventDefault()
        e.stopPropagation()
      }}
    >
      <span className="seg-dev-mix-label">Dry/wet</span>
      <span ref={trackRef} className="seg-dev-mix-track"><i style={{ width: `${pct}%` }} /></span>
      <span className="seg-dev-mix-value">{pct}%</span>
    </div>
  )
})

export interface DeviceCardProps { effectId: string; index: number; selected: boolean; bypassed: boolean }

export const DeviceCard = memo(function DeviceCard({ effectId, index, selected, bypassed }: DeviceCardProps) {
  const a = useContext(DeviceChainContext)
  const { name, color } = getEffectInfo(effectId)
  return (
    <div
      role="group"
      tabIndex={0}
      aria-roledescription="device"
      aria-label={name}
      aria-current={selected || undefined}
      data-index={index}
      data-device-card={effectId}
      data-selected={selected || undefined}
      data-bypassed={bypassed || undefined}
      className="seg-dev"
      style={{ ['--c' as string]: color }}
      onClick={(ev) => {
        if (ev.shiftKey) a.toggleBypass(effectId)
        else a.select(effectId)
      }}
      onMouseEnter={() => a.hover(effectId)}
      onMouseLeave={() => a.hover(null)}
      onDragOver={(ev) => a.dragOver(effectId, ev)}
      onDragLeave={a.dragLeave}
      onDrop={(ev) => a.drop(effectId, ev)}
      onKeyDown={(ev) => {
        if (ev.target !== ev.currentTarget) return
        // Every handled key stops here so window shortcuts (Space = sequencer play) do not also fire
        if (ev.key === 'Enter' && ev.shiftKey) a.toggleBypass(effectId)
        else if (ev.key === 'Enter' || ev.key === ' ') a.select(effectId)
        else if (ev.key === 'Delete' || ev.key === 'Backspace') a.remove(effectId)
        else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') {
          const dir = ev.key === 'ArrowLeft' ? -1 : 1
          if (ev.altKey) a.move(effectId, dir)
          else a.focusSibling(effectId, dir)
        } else return
        ev.preventDefault()
        ev.stopPropagation()
      }}
    >
      <div
        className="seg-dev-rail"
        data-device-grip
        draggable
        title="Drag to reorder"
        onDragStart={(ev) => a.dragStart(effectId, ev)}
        onDragEnd={a.dragEnd}
      >
        <button
          type="button"
          data-device-power
          tabIndex={-1}
          className="seg-dev-pwr"
          aria-pressed={!bypassed}
          aria-label={bypassed ? `Turn ${name} on` : `Bypass ${name}`}
          title={bypassed ? 'Turn on' : 'Bypass'}
          onClick={(ev) => { ev.stopPropagation(); a.toggleBypass(effectId) }}
        />
        <span className="seg-dev-name" title={name}>{name}</span>
        <button
          type="button"
          data-device-remove
          tabIndex={-1}
          className="seg-dev-x"
          aria-label={`Remove ${name}`}
          title="Remove"
          onClick={(ev) => { ev.stopPropagation(); a.remove(effectId) }}
        >
          {'×'}
        </button>
      </div>
      <div className="seg-dev-body">
        <DeviceDials effectId={effectId} />
        <MixBar effectId={effectId} name={name} />
      </div>
    </div>
  )
})
