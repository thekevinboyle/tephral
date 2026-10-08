import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { KNOB_NAMES, PROFILE_IDS, PROFILE_NAMES, useWarpStore, type Knobs, type ProfileId, type WarpApplies } from '../../../stores/warpStore'
import { PRESETS } from '../../../effects/warp/warpMath'
import { statusHover } from '../../../utils/statusHover'
import { Knob } from '../Knob'
import { useLockOutline, useWarpLockStore, type LockGroup } from './warpLocks'

const PROFILE_STATUS: Record<ProfileId, string> = {
  clean: 'Clean: plays the line as it is, with vibrato, echo and circuit-bend',
  flange: 'Flange: grains and smeared frames, from tape-like to pitch-held',
  degrade: 'Degrade: lower sample and frame rate, filtered and crushed',
  filterspam: 'Filter Spam: a random resonant filter on every grain and slice',
  harmonicer: 'Harmo-nicer: octave and fifth voices layered over the line',
  fauxcoder: 'Fauxcoder: a ringing filter bank on the harmonics of a base note',
  lofizzly: 'Lo-fizzly: wobbling sample rate, dirt and a boxy radio band',
}

const APPLIES: { id: WarpApplies; name: string; status: string }[] = [
  { id: 'both', name: 'Video + audio', status: 'Applies to: warp the video and the sound together' },
  { id: 'video', name: 'Video', status: 'Applies to: warp only the video; the sound plays live' },
  { id: 'audio', name: 'Audio', status: 'Applies to: warp only the sound; the video plays live' },
]

const LOCK_NAMES: Record<LockGroup, string> = {
  amount: 'Amount', profile: 'Profile', graph: 'Graph', settings: 'Length, Quantize and Skew', knobs: 'Knobs', output: 'Output',
}

const PRESET_NAMES = Object.keys(PRESETS)
const pct = (v: number) => String(Math.round(v * 100))
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

const setKnob = (profile: ProfileId, k: number, v: number) => {
  const s = useWarpStore.getState()
  const next = [...s.profileParams[profile]] as Knobs
  next[k] = v
  s.patch({ profileParams: { ...s.profileParams, [profile]: next } })
}

/** Closed or open padlock, drawn in currentColor. */
export function LockIcon({ open = false }: { open?: boolean }) {
  return (
    <svg width="11" height="12" viewBox="0 0 11 12" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.3">
      <rect x="1.5" y="5.5" width="8" height="5.5" rx="1" fill="currentColor" stroke="none" />
      <path d={open ? 'M3.3 5.5V3.6a2.2 2.2 0 0 1 4.3-.6' : 'M3.3 5.5V3.6a2.2 2.2 0 0 1 4.4 0v1.9'} strokeLinecap="round" />
    </svg>
  )
}

/** A group's lock (spec §5): shown only in lock mode. Locked = Dice leaves the group alone. */
export const LockButton = memo(function LockButton({ group }: { group: LockGroup }) {
  const show = useWarpLockStore((s) => s.lockMode)
  const locked = useWarpLockStore((s) => s.locks[group])
  if (!show) return null
  const name = LOCK_NAMES[group]
  return (
    <button
      type="button"
      className="seg-warp-lock"
      data-warp-lock={group}
      aria-pressed={locked}
      aria-label={`Lock ${name}`}
      onClick={() => useWarpLockStore.getState().toggleLock(group)}
      {...statusHover(locked ? `${name} locked: Dice keeps it. Click to unlock` : `${name} unlocked: Dice changes it. Click to lock`)}
    >
      <LockIcon open={!locked} />
    </button>
  )
})

/** Preset picker in the footer. The menu is portalled with position: fixed (every layout area clips overflow). */
const WarpPresetMenu = memo(function WarpPresetMenu() {
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

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        data-warp-presets
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Warp presets"
        onClick={() => { if (!open) place(); setOpen(!open) }}
        {...statusHover('Presets: load a ready-made line')}
      >
        Presets <span aria-hidden="true">▾</span>
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

// ── Output sliders ────────────────────────────────────────────────────────────────────────────────

/** Drag along `el`: `at(u)` with u = 0..1 across its width, until release (pointer capture). */
function dragAlong(e: React.PointerEvent<HTMLElement>, el: HTMLElement, at: (u: number) => void) {
  el.setPointerCapture(e.pointerId)
  const u = (x: number) => { const r = el.getBoundingClientRect(); return clamp((x - r.left) / Math.max(1, r.width), 0, 1) }
  at(u(e.clientX))
  const move = (ev: PointerEvent) => at(u(ev.clientX))
  const up = () => {
    el.removeEventListener('pointermove', move)
    el.removeEventListener('pointerup', up)
    el.removeEventListener('pointercancel', up)
  }
  el.addEventListener('pointermove', move)
  el.addEventListener('pointerup', up)
  el.addEventListener('pointercancel', up)
}

/** Arrow keys (Shift = 10×), Home and End for a slider: returns the new value, or null for other keys. */
function keyStep(e: React.KeyboardEvent, v: number, step: number, lo: number, hi: number): number | null {
  const d = e.key === 'ArrowUp' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowDown' || e.key === 'ArrowLeft' ? -1 : 0
  let next: number | null = null
  if (d) next = v + d * step * (e.shiftKey ? 10 : 1)
  else if (e.key === 'Home') next = lo
  else if (e.key === 'End') next = hi
  if (next === null) return null
  e.preventDefault()
  e.stopPropagation()
  return clamp(next, lo, hi)
}

// Band: one log axis from 20 Hz to 20 kHz; the low cut covers 20 Hz..2 kHz, the high cut 500 Hz..20 kHz (spec §4)
const F_MIN = 20, F_MAX = 20000
const LOG_SPAN = Math.log(F_MAX / F_MIN)
const toU = (hz: number) => Math.log(hz / F_MIN) / LOG_SPAN
const toHz = (u: number) => Math.round(F_MIN * Math.exp(u * LOG_SPAN))
const U_LOW_MAX = toU(2000), U_HIGH_MIN = toU(500)
const BAND_STEP = 0.01 // 1% of the axis, about 7% in frequency
const fmtHz = (hz: number) => (hz < 1000 ? String(Math.round(hz)) : `${(hz / 1000).toFixed(hz < 10000 ? 1 : 0).replace(/\.0$/, '')}k`)

const setBand = (low: number, high: number) => {
  const s = useWarpStore.getState()
  s.patch({ output: { ...s.output, low, high } })
}
/** Move one band edge to `u`, clamped one step short of the other edge (moved, never refused). */
const moveEdge = (edge: 'low' | 'high', u: number) => {
  const o = useWarpStore.getState().output
  if (edge === 'low') {
    const lim = Math.min(U_LOW_MAX, toU(o.high) - BAND_STEP)
    let hz = toHz(clamp(u, 0, lim))
    if (hz >= o.high) hz = o.high - 1
    setBand(Math.max(F_MIN, hz), o.high)
  } else {
    const lim = Math.max(U_HIGH_MIN, toU(o.low) + BAND_STEP)
    let hz = toHz(clamp(u, lim, 1))
    if (hz <= o.low) hz = o.low + 1
    setBand(o.low, Math.min(F_MAX, hz))
  }
}

const BandSlider = memo(function BandSlider() {
  const low = useWarpStore((s) => s.output.low)
  const high = useWarpStore((s) => s.output.high)
  const trackRef = useRef<HTMLDivElement>(null)
  const uL = toU(low) * 100, uH = toU(high) * 100

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !trackRef.current) return
    const el = trackRef.current
    const r = el.getBoundingClientRect()
    const u0 = clamp((e.clientX - r.left) / Math.max(1, r.width), 0, 1)
    const o = useWarpStore.getState().output
    // the thumb that was pressed, else the nearer one
    const hit = (e.target as Element).closest('[data-warp-band]')?.getAttribute('data-warp-band')
    const edge: 'low' | 'high' = hit === 'low' || hit === 'high' ? hit : Math.abs(u0 - toU(o.low)) <= Math.abs(u0 - toU(o.high)) ? 'low' : 'high'
    el.querySelector<HTMLElement>(`[data-warp-band="${edge}"]`)?.focus({ preventScroll: true })
    e.preventDefault()
    dragAlong(e, el, (u) => moveEdge(edge, u))
  }
  const onKey = (edge: 'low' | 'high') => (e: React.KeyboardEvent) => {
    const o = useWarpStore.getState().output
    const u = toU(edge === 'low' ? o.low : o.high)
    const next = keyStep(e, u, BAND_STEP, edge === 'low' ? 0 : U_HIGH_MIN, edge === 'low' ? U_LOW_MAX : 1)
    if (next !== null) moveEdge(edge, next)
  }
  const thumb = (edge: 'low' | 'high', hz: number, u: number) => (
    <div
      className="seg-warp-thumb"
      role="slider"
      tabIndex={0}
      data-warp-band={edge}
      aria-label={edge === 'low' ? 'Band low cut' : 'Band high cut'}
      aria-valuemin={edge === 'low' ? F_MIN : 500}
      aria-valuemax={edge === 'low' ? 2000 : F_MAX}
      aria-valuenow={hz}
      aria-valuetext={`${Math.round(hz)} Hz`}
      style={{ left: `${u}%` }}
      onKeyDown={onKey(edge)}
      {...statusHover(edge === 'low'
        ? 'Band low cut: the warped signal loses everything below this (20 Hz is open). Drag or use the arrow keys'
        : 'Band high cut: the warped signal loses everything above this (20 kHz is open). Drag or use the arrow keys')}
    />
  )
  return (
    <div className="seg-warp-out">
      <span>Band</span>
      <div ref={trackRef} className="seg-warp-track" data-warp-band-track onPointerDown={onPointerDown}>
        <i style={{ left: `${uL}%`, right: `${100 - uH}%` }} />
        {thumb('low', low, uL)}
        {thumb('high', high, uH)}
      </div>
      <b data-warp-band-value>{fmtHz(low)}–{fmtHz(high)}</b>
    </div>
  )
})

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  set: (v: number) => void
  text: (v: number) => string
  status: string
  dataAttr: string
  valueAttr: string
}

/** One-thumb Output slider (Level, Mix): fill from the left edge to the thumb. */
const OutSlider = memo(function OutSlider({ label, value, min, max, step, set, text, status, dataAttr, valueAttr }: SliderProps) {
  const u = ((value - min) / (max - min)) * 100
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const el = e.currentTarget
    el.focus({ preventScroll: true })
    e.preventDefault()
    dragAlong(e, el, (t) => set(clamp(Math.round((min + t * (max - min)) / step) * step, min, max)))
  }
  const onKeyDown = (e: React.KeyboardEvent) => {
    const next = keyStep(e, value, step, min, max)
    if (next !== null) set(Math.round(next / step) * step)
  }
  return (
    <div className="seg-warp-out">
      <span>{label}</span>
      <div
        className="seg-warp-track"
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={text(value)}
        {...{ [dataAttr]: '' }}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
        {...statusHover(status)}
      >
        <i style={{ left: 0, right: `${100 - u}%` }} />
        <span className="seg-warp-thumb" style={{ left: `${u}%` }} aria-hidden="true" />
      </div>
      <b {...{ [valueAttr]: '' }}>{text(value)}</b>
    </div>
  )
})

const fmtDb = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(Number.isInteger(v) ? 0 : 1)} dB`
const setLevel = (v: number) => { const s = useWarpStore.getState(); s.patch({ output: { ...s.output, levelDb: v } }) }
const setMix = (v: number) => useWarpStore.getState().patch({ mix: Math.round(v) / 100 })
const fmtMix = (v: number) => `${Math.round(v)}%`

const LevelSlider = memo(function LevelSlider() {
  const levelDb = useWarpStore((s) => s.output.levelDb)
  return (
    <OutSlider label="Level" value={levelDb} min={-24} max={6} step={0.5} set={setLevel} text={fmtDb} dataAttr="data-warp-level" valueAttr="data-warp-level-value"
      status="Level: the warped signal's gain, −24 to +6 dB (brightness on the picture). Drag or use the arrow keys" />
  )
})

const MixSlider = memo(function MixSlider() {
  const mix = Math.round(useWarpStore((s) => s.mix) * 100)
  return (
    <OutSlider label="Mix" value={mix} min={0} max={100} step={1} set={setMix} text={fmtMix} dataAttr="data-warp-mix" valueAttr="data-warp-mix-value"
      status="Mix: the warped signal against the live one, for the video and the sound" />
  )
})

// ── Sections ──────────────────────────────────────────────────────────────────────────────────────

const ProfileSection = memo(function ProfileSection() {
  const enabled = useWarpStore((s) => s.enabled)
  const profile = useWarpStore((s) => s.profile)
  const outlined = useLockOutline('profile')
  return (
    <>
      <div className="seg-warp-sect">
        <span>Profile</span>
        <LockButton group="profile" />
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
      <div className="seg-warp-profiles" role="group" aria-label="Profile" data-warp-profiles data-locked={outlined || undefined}>
        {PROFILE_IDS.map((id) => (
          <button key={id} type="button" data-warp-profile={id} aria-pressed={profile === id}
            onClick={() => useWarpStore.getState().patch({ profile: id })} {...statusHover(PROFILE_STATUS[id])}>
            {PROFILE_NAMES[id]}
          </button>
        ))}
        <span className="seg-warp-profiles-cap" data-warp-profile-caption>Picture + sound</span>
      </div>
    </>
  )
})

const KnobsSection = memo(function KnobsSection() {
  const profile = useWarpStore((s) => s.profile)
  const knobs = useWarpStore((s) => s.profileParams[s.profile])
  const outlined = useLockOutline('knobs')
  return (
    <>
      {/* the Knobs lock sits in the grid's top-right corner (no extra row: the panel is 270px tall) */}
      <div className="seg-warp-knobs" data-warp-knobs data-locked={outlined || undefined}>
        <LockButton group="knobs" />
        {KNOB_NAMES[profile].map((name, k) => (
          <Knob
            key={`${profile}-${k}`}
            label={name}
            value={knobs[k]}
            min={0}
            max={1}
            step={0.01}
            color="var(--warp)"
            showArc
            formatValue={pct}
            statusText={`${PROFILE_NAMES[profile]} ${name}`}
            onChange={(v) => setKnob(profile, k, v)}
          />
        ))}
      </div>
    </>
  )
})

const OutputSection = memo(function OutputSection() {
  const outlined = useLockOutline('output')
  return (
    <>
      <div className="seg-warp-sect"><span>Output</span><LockButton group="output" /></div>
      <div className="seg-warp-output" data-warp-output data-locked={outlined || undefined}>
        <BandSlider />
        <LevelSlider />
        <MixSlider />
      </div>
    </>
  )
})

const AppliesSection = memo(function AppliesSection() {
  const appliesTo = useWarpStore((s) => s.appliesTo)
  return (
    <div className="seg-warp-seg" role="group" aria-label="Applies to">
      {APPLIES.map((a) => (
        <button key={a.id} type="button" data-warp-applies={a.id} aria-pressed={appliesTo === a.id}
          onClick={() => useWarpStore.getState().patch({ appliesTo: a.id })} {...statusHover(a.status)}>
          {a.name}
        </button>
      ))}
    </div>
  )
})

const rollDice = () => useWarpStore.getState().dice(useWarpLockStore.getState().locks)

const Footer = memo(function Footer() {
  const lockMode = useWarpLockStore((s) => s.lockMode)
  return (
    <div className="seg-warp-actions" data-warp-foot>
      <button
        type="button"
        data-warp-lockmode
        aria-pressed={lockMode}
        aria-label="Lock mode"
        onClick={() => { const l = useWarpLockStore.getState(); l.setLockMode(!l.lockMode) }}
        {...statusHover(lockMode ? 'Lock mode: click a lock to keep that part when you roll the dice. Click to finish' : 'Lock mode: choose which parts the dice leaves alone')}
      >
        <LockIcon />
      </button>
      <button
        type="button"
        data-warp-dice
        aria-label="Dice"
        onClick={rollDice}
        {...statusHover('Dice: randomize everything that is not locked (the line, Length, Quantize, Skew, the knobs and Output)')}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.2">
          <rect x="1" y="1" width="10" height="10" rx="2" />
          <circle cx="4" cy="4" r=".9" fill="currentColor" stroke="none" />
          <circle cx="8" cy="8" r=".9" fill="currentColor" stroke="none" />
          <circle cx="8" cy="4" r=".9" fill="currentColor" stroke="none" />
          <circle cx="4" cy="8" r=".9" fill="currentColor" stroke="none" />
        </svg>
        Dice
      </button>
      <WarpPresetMenu />
    </div>
  )
})

/** Right of the graph (spec §3 to §5): on/off and profile, its 4 knobs, Output, Applies to, then lock mode, Dice and Presets. */
export const WarpSidePanel = memo(function WarpSidePanel() {
  return (
    <div className="seg-warp-side">
      <ProfileSection />
      <KnobsSection />
      <OutputSection />
      <AppliesSection />
      <Footer />
    </div>
  )
})
