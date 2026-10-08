import { memo } from 'react'
import { useWarpStore, type WarpSnapshot } from '../../../stores/warpStore'
import { useEffectSequencerStore } from '../../../stores/effectSequencerStore'
import { MAX_DELAY_SECONDS } from '../../../effects/warp/warpMath'
import { statusHover } from '../../../utils/statusHover'

const LENGTHS = [1, 2, 4, 8, 16] as const
const SNAPS = [1 / 4, 1 / 8, 1 / 16, 1 / 32, 1 / 64]

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const idx = (list: readonly number[], v: number) => {
  let best = 0
  list.forEach((c, i) => { if (Math.abs(c - v) < Math.abs(list[best] - v)) best = i })
  return best
}

interface SpinProps {
  id: 'amount' | 'length' | 'snap' | 'skew'
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
}

/** BPM-style numeric control: drag up or down, or step with the arrow keys. */
const Spin = memo(function Spin({ id, label, value, now, min, max, step, pxPerStep, status }: SpinProps) {
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
      data-warp-setting={id}
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
// Up = finer grid (1/4 -> 1/64)
const stepSnap = (dir: number) => {
  const i = clamp(idx(SNAPS, useWarpStore.getState().snap) + dir, 0, SNAPS.length - 1)
  patch({ snap: SNAPS[i] })
}

/** Amount, Length, Snap and Skew, plus a note when the loop is longer than the 8 s history. */
export const WarpSettingsRow = memo(function WarpSettingsRow() {
  const amount = Math.round(useWarpStore((s) => s.amount) * 100)
  const lengthBeats = useWarpStore((s) => s.lengthBeats)
  const snap = useWarpStore((s) => s.snap)
  const skew = Math.round(useWarpStore((s) => s.skew) * 100)
  const bpm = useEffectSequencerStore((s) => s.bpm)
  const limited = (lengthBeats * 60) / bpm > MAX_DELAY_SECONDS
  const snapDen = Math.round(1 / snap)
  return (
    <div className="seg-warp-settings">
      <Spin id="amount" label="Amount" value={`${amount}%`} now={amount} min={0} max={100} step={stepAmount} pxPerStep={2}
        status="Amount: how much of the line is used. 0% plays live, 100% follows the line. Drag or use the arrow keys" />
      <Spin id="length" label="Length" value={`${lengthBeats} ${lengthBeats === 1 ? 'beat' : 'beats'}`} now={lengthBeats} min={1} max={16} step={stepLength} pxPerStep={14}
        status="Length: how many beats the loop lasts at the current tempo. Drag or use the arrow keys" />
      <Spin id="snap" label="Snap" value={`1/${snapDen}`} now={snapDen} min={4} max={64} step={stepSnap} pxPerStep={14}
        status="Snap: the grid points and steps snap to across the loop. Drag or use the arrow keys" />
      <Spin id="skew" label="Skew" value={`${skew > 0 ? '+' : skew < 0 ? '−' : '+'}${Math.abs(skew)}%`} now={skew} min={-100} max={100} step={stepSkew} pxPerStep={2}
        status="Skew: bends time before the line is read. Positive plays the start of the loop faster. Drag or use the arrow keys" />
      {limited && (
        <span className="seg-warp-limit" data-warp-limit {...statusHover('History is 8 seconds, so longer delays are held at 8 s')}>
          Length limited to 8 s at this tempo
        </span>
      )}
    </div>
  )
})
