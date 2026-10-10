import { memo } from 'react'
import { LENGTHS, SNAPS, useWarpStore, type WarpSnapshot } from '../../../stores/warpStore'
import { useEffectSequencerStore } from '../../../stores/effectSequencerStore'
import { MAX_DELAY_SECONDS } from '../../../effects/warp/warpMath'
import { PLAY_DIRECTION_NAMES, PLAY_DIRECTIONS } from '../../../effects/playhead'
import { statusHover } from '../../../utils/statusHover'
import { useLockOutline } from './warpLocks'
import { LockButton } from './WarpLock'

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const idx = (list: readonly number[], v: number) => {
  let best = 0
  list.forEach((c, i) => { if (Math.abs(c - v) < Math.abs(list[best] - v)) best = i })
  return best
}

interface SpinProps {
  id: string
  /** The data attribute naming the control: data-<attr>={id}. Default 'warp-setting'. */
  attr?: string
  label: string
  value: string
  now: number
  min: number
  max: number
  /** Step by `dir` (+1/-1); `big` when Shift is held. */
  step: (dir: number, big: boolean) => void
  /** Vertical drag distance per step, in px. */
  pxPerStep: number
  status: string
  /** Locked for the dice and lock mode is on: the --warp outline. */
  locked?: boolean
}

/** BPM-style numeric control: drag up or down, or step with the arrow keys. */
export const Spin = memo(function Spin({ id, attr, label, value, now, min, max, step, pxPerStep, status, locked }: SpinProps) {
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    e.preventDefault()
    e.stopPropagation()
    step(e.key === 'ArrowUp' ? 1 : -1, e.shiftKey)
  }
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const el = e.currentTarget
    el.setPointerCapture(e.pointerId)
    el.focus({ preventScroll: true })
    let acc = 0
    let lastY = e.clientY
    const move = (ev: PointerEvent) => {
      acc += lastY - ev.clientY
      lastY = ev.clientY
      while (Math.abs(acc) >= pxPerStep) {
        const dir = Math.sign(acc)
        step(dir, false)
        acc -= dir * pxPerStep
      }
    }
    const up = () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
  }
  return (
    <div
      className="seg-warp-set"
      role="spinbutton"
      tabIndex={0}
      aria-label={label}
      aria-valuenow={now}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuetext={value}
      {...{ [`data-${attr ?? 'warp-setting'}`]: id }}
      data-locked={locked || undefined}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      {...statusHover(status)}
    >
      {label} <b>{value}</b>
    </div>
  )
})

const patch = (p: Partial<WarpSnapshot>) => useWarpStore.getState().patch(p)

const stepAmount = (dir: number, big: boolean) => {
  const v = Math.round(useWarpStore.getState().amount * 100) + dir * (big ? 10 : 1)
  patch({ amount: clamp(v, 0, 100) / 100 })
}
const stepSkew = (dir: number, big: boolean) => {
  const v = Math.round(useWarpStore.getState().skew * 100) + dir * (big ? 10 : 1)
  patch({ skew: clamp(v, -100, 100) / 100 })
}
const stepLength = (dir: number) => {
  const i = clamp(idx(LENGTHS, useWarpStore.getState().lengthBeats) + dir, 0, LENGTHS.length - 1)
  patch({ lengthBeats: LENGTHS[i] })
}
// Up = finer grid: Off, 1/4 .. 1/64 (aria-valuenow is the denominator, 0 = Off, so it rises with each step)
const stepSnap = (dir: number) => {
  const i = clamp(idx(SNAPS, useWarpStore.getState().snap) + dir, 0, SNAPS.length - 1)
  patch({ snap: SNAPS[i] })
}

const stepDirection = (dir: number) => {
  const i = clamp(PLAY_DIRECTIONS.indexOf(useWarpStore.getState().direction) + dir, 0, PLAY_DIRECTIONS.length - 1)
  patch({ direction: PLAY_DIRECTIONS[i] })
}
const stepScatter = (dir: number, big: boolean) => {
  const v = Math.round(useWarpStore.getState().scatter * 100) + dir * (big ? 10 : 1)
  patch({ scatter: clamp(v, 0, 100) / 100 })
}
export const DIRECTION_STATUS = 'Direction: Fwd plays the line left to right, Rev right to left, Ping-pong alternates each pass, Random plays a random slice at each grid step. Drag or use the arrow keys'

/**
 * Amount, Length, Quantize, Skew, Direction and Scatter (playback spec §4; outside the lock groups, Dice leaves them), plus a note when the loop is longer than the 8 s history. In lock mode a lock
 * sits before Amount and another before Length (it covers Length, Quantize and Skew).
 */
export const WarpSettingsRow = memo(function WarpSettingsRow() {
  const amount = Math.round(useWarpStore((s) => s.amount) * 100)
  const lengthBeats = useWarpStore((s) => s.lengthBeats)
  const snap = useWarpStore((s) => s.snap)
  const skew = Math.round(useWarpStore((s) => s.skew) * 100)
  const direction = useWarpStore((s) => s.direction)
  const scatter = Math.round(useWarpStore((s) => s.scatter) * 100)
  const bpm = useEffectSequencerStore((s) => s.bpm)
  const limited = (lengthBeats * 60) / bpm > MAX_DELAY_SECONDS
  const snapDen = snap > 0 ? Math.round(1 / snap) : 0 // 0 = quantize Off
  const amountLocked = useLockOutline('amount')
  const settingsLocked = useLockOutline('settings')
  return (
    <div className="seg-warp-settings">
      <LockButton group="amount" />
      <Spin id="amount" label="Amount" value={`${amount}%`} now={amount} min={0} max={100} step={stepAmount} pxPerStep={2} locked={amountLocked}
        status="Amount: how much of the line is used. 0% plays live, 100% follows the line. Drag or use the arrow keys" />
      <LockButton group="settings" />
      <Spin id="length" locked={settingsLocked} label="Length" value={`${lengthBeats === 0.5 ? '½' : lengthBeats} ${lengthBeats <= 1 ? 'beat' : 'beats'}`} now={lengthBeats} min={LENGTHS[0]} max={LENGTHS[LENGTHS.length - 1]} step={stepLength} pxPerStep={14}
        status="Length: how many beats the loop lasts at the current tempo. Drag or use the arrow keys" />
      <Spin id="snap" locked={settingsLocked} label="Quantize" value={snapDen ? `1/${snapDen}` : 'Off'} now={snapDen} min={0} max={Math.round(1 / SNAPS[SNAPS.length - 1])} step={stepSnap} pxPerStep={14}
        status="Quantize: the grid points and steps land on across the loop. Off places points freely. Drag or use the arrow keys" />
      <Spin id="skew" locked={settingsLocked} label="Skew" value={`${skew > 0 ? '+' : skew < 0 ? '−' : '+'}${Math.abs(skew)}%`} now={skew} min={-100} max={100} step={stepSkew} pxPerStep={2}
        status="Skew: bends time before the line is read. Positive plays the start of the loop faster. Drag or use the arrow keys" />
      <Spin id="direction" label="Direction" value={PLAY_DIRECTION_NAMES[direction]} now={PLAY_DIRECTIONS.indexOf(direction)} min={0} max={PLAY_DIRECTIONS.length - 1}
        step={stepDirection} pxPerStep={14} status={DIRECTION_STATUS} />
      <Spin id="scatter" label="Scatter" value={`${scatter}%`} now={scatter} min={0} max={100} step={stepScatter} pxPerStep={2}
        status="Scatter: shuffles the loop's slices (one per Quantize step) each pass. 0% plays in order, 100% fully shuffled. Drag or use the arrow keys" />
      {limited && (
        <span className="seg-warp-limit" data-warp-limit {...statusHover('History is 8 seconds, so longer delays are held at 8 s')}>
          Length limited to 8 s at this tempo
        </span>
      )}
    </div>
  )
})
