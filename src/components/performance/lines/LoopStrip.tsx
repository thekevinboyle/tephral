import { memo, useRef } from 'react'
import { MIN_REGION } from '../../../effects/playhead'
import { statusHover } from '../../../utils/statusHover'
import { PAD } from './LinePlot'

const STATUS = 'Loop: drag a handle to set where the loop starts or ends. It snaps to Quantize; Alt drags freely. Double-click a handle to reset it'

interface LoopStripProps {
  start: number
  end: number
  snap: number // 0 = Quantize Off (handles snap to 1/16)
  width: number
  attr: 'warp' | 'line'
  onChange: (start: number, end: number) => void
}

/** The Start/End handles above a line plot (playback spec §4). x maps like the plot: PAD + x · inner width. */
export const LoopStrip = memo(function LoopStrip({ start, end, snap, width, attr, onChange }: LoopStripProps) {
  const ref = useRef<HTMLDivElement>(null)
  const iw = Math.max(1, width - 2 * PAD)
  const grid = snap > 0 ? snap : 1 / 16
  const dragHandle = (which: 'start' | 'end') => (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.preventDefault()
    const el = e.currentTarget
    el.setPointerCapture(e.pointerId)
    const move = (ev: PointerEvent) => {
      const r = ref.current?.getBoundingClientRect()
      if (!r) return
      let x = (ev.clientX - r.left - PAD) / iw
      x = Math.max(0, Math.min(1, x))
      const min = ev.altKey ? MIN_REGION : Math.max(MIN_REGION, grid)
      if (!ev.altKey) x = Math.round(x / grid) * grid
      if (which === 'start') onChange(Math.min(x, end - min), end)
      else onChange(start, Math.max(x, start + min))
    }
    const up = () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up) }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
  }
  const reset = (which: 'start' | 'end') => () => (which === 'start' ? onChange(0, end) : onChange(start, 1))
  const da = (k: string, v?: string) => ({ [`data-${attr}-loop${k}`]: v ?? '' })
  return (
    <div ref={ref} className="seg-loop-strip" style={{ width }} {...da('-strip')} aria-label="Loop region">
      <div className="seg-loop-range" style={{ left: PAD + start * iw, width: (end - start) * iw }} />
      {(['start', 'end'] as const).map((w) => (
        <div key={w} className="seg-loop-handle" role="slider" tabIndex={-1} aria-label={w === 'start' ? 'Loop start' : 'Loop end'}
          aria-valuemin={0} aria-valuemax={1} aria-valuenow={w === 'start' ? start : end} data-edge={w}
          style={{ left: PAD + (w === 'start' ? start : end) * iw }}
          {...da('', w)} onPointerDown={dragHandle(w)} onDoubleClick={reset(w)} {...statusHover(STATUS)} />
      ))}
    </div>
  )
})
