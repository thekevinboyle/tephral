import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useWarpStore, type WarpApplies, type WarpProfile, type WarpSnapshot } from '../../../stores/warpStore'
import { PRESETS } from '../../../effects/warp/warpMath'
import { statusHover } from '../../../utils/statusHover'
import { Knob } from '../Knob'

type ParamKey = keyof WarpSnapshot['params']

const PROFILES: { id: WarpProfile; name: string; status: string }[] = [
  { id: 'clean', name: 'Clean', status: 'Clean: plays the nearest stored frame and sample, with a short crossfade at jumps' },
  { id: 'smear', name: 'Smear', status: 'Smear: blends neighbouring frames and grains into ghost trails and flanging' },
  { id: 'degrade', name: 'Degrade', status: 'Degrade: lower frame rate, posterized and pixelated, with a bit-crushed sound' },
]

const KNOBS: Record<WarpProfile, { key: ParamKey; label: string; status: string }[]> = {
  clean: [{ key: 'smooth', label: 'Smooth', status: 'Smooth: crossfade length at jumps, so cuts and clicks are softened' }],
  smear: [
    { key: 'grain', label: 'Grain', status: 'Grain: how many frames and how long a sound grain is blended' },
    { key: 'blend', label: 'Blend', status: 'Blend: how strongly the neighbouring frames and grains are mixed in' },
  ],
  degrade: [
    { key: 'rate', label: 'Rate', status: 'Rate: lowers the frame rate and the sample rate' },
    { key: 'crunch', label: 'Crunch', status: 'Crunch: posterize and grow the pixels, and bit-crush the sound' },
  ],
}

const APPLIES: { id: WarpApplies; name: string; status: string }[] = [
  { id: 'both', name: 'Video + audio', status: 'Applies to: warp the video and the sound together' },
  { id: 'video', name: 'Video', status: 'Applies to: warp only the video; the sound plays live' },
  { id: 'audio', name: 'Audio', status: 'Applies to: warp only the sound; the video plays live' },
]

const PRESET_NAMES = Object.keys(PRESETS)
const fmt2 = (v: number) => (v <= 0 ? '0' : v >= 1 ? '1' : v.toFixed(2).replace(/^0/, ''))

const setParam = (key: ParamKey, v: number) => {
  const s = useWarpStore.getState()
  s.patch({ params: { ...s.params, [key]: v } })
}

/** Preset picker. The menu is portalled with position: fixed (every layout area clips overflow). */
export const WarpPresetMenu = memo(function WarpPresetMenu({ variant }: { variant: 'side' | 'tools' }) {
  const presetName = useWarpStore((s) => s.presetName)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number; minWidth: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const place = useCallback(() => {
    const r = triggerRef.current?.getBoundingClientRect()
    if (!r) return
    const menuH = PRESET_NAMES.length * 25 + 10
    const left = Math.max(8, Math.min(r.left, window.innerWidth - Math.max(160, r.width) - 8))
    // Open upward when there is no room below (the side panel sits at the bottom of the window)
    if (r.bottom + 2 + menuH > window.innerHeight - 8) setPos({ left, bottom: window.innerHeight - r.top + 2, minWidth: r.width })
    else setPos({ left, top: r.bottom + 2, minWidth: r.width })
  }, [])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      e.preventDefault()
      setOpen(false)
      triggerRef.current?.focus()
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', place)
    }
  }, [open, place])

  const trigger = variant === 'side' ? 'Presets' : presetName ?? 'Custom line'
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={variant === 'tools' ? 'seg-warp-tool' : undefined}
        data-warp-presets={variant === 'side' ? '' : undefined}
        data-warp-presets-name={variant === 'tools' ? '' : undefined}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={variant === 'tools' ? `Warp preset: ${trigger}` : 'Warp presets'}
        onClick={() => { if (!open) place(); setOpen(!open) }}
        {...statusHover(variant === 'tools' ? 'The loaded preset. Click to load another line' : 'Presets: load a ready-made line')}
      >
        {trigger} <span aria-hidden="true">▾</span>
      </button>
      {open && pos && createPortal(
        <div ref={menuRef} className="seg-warp-menu" role="menu" data-warp-preset-menu aria-label="Warp presets"
          style={{ left: pos.left, top: pos.top, bottom: pos.bottom, minWidth: pos.minWidth }}>
          {PRESET_NAMES.map((n) => (
            <button
              key={n}
              type="button"
              role="menuitemradio"
              aria-checked={presetName === n}
              data-warp-preset={n}
              onClick={() => {
                useWarpStore.getState().loadPreset(n)
                setOpen(false)
                triggerRef.current?.focus()
              }}
              {...statusHover(`Load the ${n} line`)}
            >
              {n}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  )
})

const MixBar = memo(function MixBar() {
  const mix = Math.round(useWarpStore((s) => s.mix) * 100)
  const set = (v: number) => useWarpStore.getState().patch({ mix: Math.min(100, Math.max(0, Math.round(v))) / 100 })
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const el = e.currentTarget
    el.setPointerCapture(e.pointerId)
    el.focus({ preventScroll: true })
    const at = (x: number) => { const r = el.getBoundingClientRect(); set(((x - r.left) / Math.max(1, r.width)) * 100) }
    at(e.clientX)
    const move = (ev: PointerEvent) => at(ev.clientX)
    const up = () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
  }
  const onKeyDown = (e: React.KeyboardEvent) => {
    const d = e.key === 'ArrowUp' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowDown' || e.key === 'ArrowLeft' ? -1 : 0
    if (!d) return
    e.preventDefault()
    e.stopPropagation()
    set(Math.round(useWarpStore.getState().mix * 100) + d * (e.shiftKey ? 10 : 1))
  }
  return (
    <div className="seg-warp-mix">
      Mix
      <div
        className="seg-warp-mix-track"
        role="slider"
        tabIndex={0}
        aria-label="Mix"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={mix}
        aria-valuetext={`${mix}%`}
        data-warp-mix
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
        {...statusHover('Mix: the warped signal against the live one, for the video and the sound')}
      >
        <i style={{ width: `${mix}%` }} />
      </div>
      <b>{mix}%</b>
    </div>
  )
})

/** Right of the graph: on/off, profile and its knobs, Applies to, Mix, Randomize and Presets. */
export const WarpSidePanel = memo(function WarpSidePanel() {
  const enabled = useWarpStore((s) => s.enabled)
  const profile = useWarpStore((s) => s.profile)
  const appliesTo = useWarpStore((s) => s.appliesTo)
  const smooth = useWarpStore((s) => s.params.smooth)
  const grain = useWarpStore((s) => s.params.grain)
  const blend = useWarpStore((s) => s.params.blend)
  const rate = useWarpStore((s) => s.params.rate)
  const crunch = useWarpStore((s) => s.params.crunch)
  const values: Record<ParamKey, number> = { smooth, grain, blend, rate, crunch }

  return (
    <div className="seg-warp-side">
      <div className="seg-warp-sect">
        <span>Profile</span>
        <button
          type="button"
          className="seg-warp-power"
          data-warp-power
          aria-pressed={enabled}
          aria-label={enabled ? 'Turn time warp off' : 'Turn time warp on'}
          onClick={() => { const s = useWarpStore.getState(); s.setEnabled(!s.enabled) }}
          {...statusHover('Time warp on or off. Off plays the video and the sound exactly as they are')}
        >
          <i aria-hidden="true" />
          {enabled ? 'On' : 'Off'}
        </button>
      </div>
      <div className="seg-warp-seg" role="group" aria-label="Profile">
        {PROFILES.map((p) => (
          <button key={p.id} type="button" data-warp-profile={p.id} aria-pressed={profile === p.id}
            onClick={() => useWarpStore.getState().patch({ profile: p.id })} {...statusHover(p.status)}>
            {p.name}
          </button>
        ))}
      </div>
      <div className="seg-warp-knobs" data-warp-knobs>
        {KNOBS[profile].map((k) => (
          <Knob
            key={k.key}
            label={k.label}
            value={values[k.key]}
            min={0}
            max={1}
            step={0.01}
            color="var(--warp)"
            showArc
            formatValue={fmt2}
            statusText={k.status}
            onChange={(v) => setParam(k.key, v)}
          />
        ))}
      </div>
      <div className="seg-warp-sect"><span>Applies to</span></div>
      <div className="seg-warp-seg" role="group" aria-label="Applies to">
        {APPLIES.map((a) => (
          <button key={a.id} type="button" data-warp-applies={a.id} aria-pressed={appliesTo === a.id}
            onClick={() => useWarpStore.getState().patch({ appliesTo: a.id })} {...statusHover(a.status)}>
            {a.name}
          </button>
        ))}
      </div>
      <MixBar />
      <div className="seg-warp-actions">
        <button
          type="button"
          data-warp-randomize
          onClick={() => useWarpStore.getState().randomize()}
          {...statusHover('Randomize: a new line from steps, holds, slopes and one curve on the snap grid (R)')}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.2">
            <rect x="1" y="1" width="10" height="10" rx="2" />
            <circle cx="4" cy="4" r=".9" fill="currentColor" stroke="none" />
            <circle cx="8" cy="8" r=".9" fill="currentColor" stroke="none" />
            <circle cx="8" cy="4" r=".9" fill="currentColor" stroke="none" />
            <circle cx="4" cy="8" r=".9" fill="currentColor" stroke="none" />
          </svg>
          Randomize
        </button>
        <WarpPresetMenu variant="side" />
      </div>
    </div>
  )
})
