import { useRef, useEffect } from 'react'
import { useSlicerStore } from '../../stores/slicerStore'
import { slicerCommands, slicerReadout } from '../../effects/slicer/slicerRuntime'

const HOLD_MS = 150
const DRAG_PX = 5

/**
 * The slicer's buffer strip: how full the buffer is, the slices, the slice playing and the playhead.
 * Drawn from the engine's readout in its own rAF (no React render per frame).
 * Click a slice to play from it, drag to scrub, hold to loop a slice (drag up or down for speed).
 */
export function SlicerWaveform() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sliceCount = useSlicerStore((s) => s.sliceCount)
  const captureState = useSlicerStore((s) => s.captureState)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const css = getComputedStyle(canvas)
    const color = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback
    const bg = color('--bg-void', '#111')
    const fill = color('--bg-hover', '#333')
    const line = color('--border-emphasis', '#555')
    const live = color('--live', '#C4FA13')
    const text = color('--text-secondary', '#aaa')
    const mono = color('--font-mono', 'monospace')
    let last = ''
    let id = 0
    const draw = () => {
      id = requestAnimationFrame(draw)
      const dpr = window.devicePixelRatio || 1
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr))
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr))
      const r = slicerReadout
      const key = `${w}|${h}|${r.frames}|${r.capacity}|${r.active ? r.playhead.toFixed(4) : '-'}|${r.slice}`
      if (key === last) return
      last = key
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h }
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)
      // Stored share of the buffer, newest on the right
      const filled = r.capacity > 0 ? Math.min(1, r.frames / r.capacity) : 0
      ctx.fillStyle = fill
      ctx.fillRect(w * (1 - filled), 0, w * filled, h)
      const sw = w / sliceCount
      if (r.active) {
        ctx.fillStyle = live
        ctx.globalAlpha = 0.18
        ctx.fillRect(r.slice * sw, 0, sw, h)
        ctx.globalAlpha = 1
      }
      ctx.fillStyle = line
      for (let i = 1; i < sliceCount; i++) ctx.fillRect(Math.round(i * sw), 0, Math.max(1, dpr), h)
      if (r.active) {
        ctx.fillStyle = live
        ctx.fillRect(Math.round(r.playhead * (w - 2 * dpr)), 0, 2 * dpr, h)
      }
      if (captureState !== 'live') {
        ctx.font = `${10 * dpr}px ${mono}`
        ctx.fillStyle = text
        ctx.textAlign = 'right'
        ctx.fillText(captureState === 'imported' ? 'IMPORTED' : 'FROZEN', w - 6 * dpr, 14 * dpr)
      }
    }
    id = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(id)
  }, [sliceCount, captureState])

  // Pointer: click plays a slice, drag scrubs, hold loops the slice (vertical drag sets its speed)
  const gesture = useRef<{ x: number; y: number; slice: number; dragging: boolean; timer: number } | null>(null)
  const posAt = (e: React.PointerEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / Math.max(1, rect.width)))
  }
  const sliceAt = (pos: number) => Math.min(sliceCount - 1, Math.floor(pos * sliceCount))
  const end = () => {
    const g = gesture.current
    if (g) window.clearTimeout(g.timer)
    gesture.current = null
    slicerCommands.scrub = null
    slicerCommands.loop = null
  }
  useEffect(() => end, [])

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const pos = posAt(e)
    const slice = sliceAt(pos)
    const timer = window.setTimeout(() => {
      const g = gesture.current
      if (g && !g.dragging) slicerCommands.loop = { slice: g.slice, speed: 1 }
    }, HOLD_MS)
    gesture.current = { x: e.clientX, y: e.clientY, slice, dragging: false, timer }
    slicerCommands.scrub = pos
  }
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const g = gesture.current
    if (!g) return
    if (slicerCommands.loop) {
      // Up = faster, down = slower: 0.25x to 4x
      slicerCommands.loop.speed = Math.max(0.25, Math.min(4, Math.pow(2, -(e.clientY - g.y) / 50)))
      return
    }
    if (!g.dragging && Math.abs(e.clientX - g.x) > DRAG_PX) { g.dragging = true; window.clearTimeout(g.timer) }
    if (g.dragging) slicerCommands.scrub = posAt(e)
  }
  const onPointerUp = () => {
    const g = gesture.current
    if (g && !g.dragging && !slicerCommands.loop) {
      // A click: play from this slice now
      const st = useSlicerStore.getState()
      st.setCurrentSlice(g.slice)
      slicerCommands.retrigger = g.slice
      if (!st.isPlaying) st.setIsPlaying(true)
    }
    end()
  }

  return (
    <div className="w-full h-full p-2">
      <canvas
        ref={canvasRef}
        data-slicer-strip
        className="w-full h-full rounded touch-none"
        style={{ cursor: 'pointer', display: 'block' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={end}
      />
    </div>
  )
}
