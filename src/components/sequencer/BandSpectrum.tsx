import { useEffect, useRef } from 'react'
import { useAudioSourceStore } from '../../stores/audioSourceStore'
import { clampBand, hzToLogX, logXToHz, BAND_PRESETS, type AudioBand } from '../../utils/audioBands'

const W = 160
const H = 36
const EDGE_GRAB_PX = 6

function fmtHz(hz: number) {
  return hz >= 1000 ? `${(hz / 1000).toFixed(hz >= 10000 ? 0 : 1)}k` : `${Math.round(hz)}`
}

/**
 * Live log-frequency spectrum with a draggable band window. Draws on rAF from
 * the reactive analyser (no React re-render per frame). Drag an edge to move
 * that cutoff, drag inside to slide the window, double-click to reset to KICK.
 */
export function BandSpectrum({ band, onChange, color }: { band: AudioBand; onChange: (b: AudioBand) => void; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const bandRef = useRef(band)
  useEffect(() => { bandRef.current = band }, [band])

  useEffect(() => {
    let raf = 0
    let data: Uint8Array | null = null
    const draw = () => {
      const c = canvasRef.current
      const ctx2d = c?.getContext('2d')
      if (c && ctx2d) {
        const { reactiveAnalyser: an, audioContext: ac } = useAudioSourceStore.getState()
        ctx2d.clearRect(0, 0, W, H)
        const b = bandRef.current
        const x0 = hzToLogX(b.lowHz) * W
        const x1 = hzToLogX(b.highHz) * W
        ctx2d.fillStyle = `${color}26`
        ctx2d.fillRect(x0, 0, x1 - x0, H)
        if (an && ac) {
          if (!data || data.length !== an.frequencyBinCount) data = new Uint8Array(an.frequencyBinCount)
          an.getByteFrequencyData(data as Uint8Array<ArrayBuffer>)
          const binHz = ac.sampleRate / an.fftSize
          ctx2d.fillStyle = 'rgba(255,255,255,0.35)'
          for (let px = 0; px < W; px++) {
            const hz = logXToHz((px + 0.5) / W)
            const v = data[Math.min(data.length - 1, Math.floor(hz / binHz))] / 255
            ctx2d.fillRect(px, H - v * H, 1, v * H)
          }
        }
        ctx2d.fillStyle = color
        ctx2d.fillRect(x0, 0, 1, H)
        ctx2d.fillRect(x1 - 1, 0, 1, H)
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [color])

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const toX = (clientX: number) => (clientX - rect.left) / rect.width
    const start = bandRef.current
    const sx = toX(e.clientX)
    const lx = hzToLogX(start.lowHz), hx = hzToLogX(start.highHz)
    const grab = EDGE_GRAB_PX / rect.width
    const mode = Math.abs(sx - lx) <= grab ? 'low' : Math.abs(sx - hx) <= grab ? 'high' : sx > lx && sx < hx ? 'move' : null
    if (!mode) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const move = (ev: PointerEvent) => {
      const x = toX(ev.clientX)
      let next: AudioBand
      if (mode === 'low') next = { lowHz: logXToHz(x), highHz: start.highHz }
      else if (mode === 'high') next = { lowHz: start.lowHz, highHz: logXToHz(x) }
      else {
        const dx = Math.max(-lx, Math.min(1 - hx, x - sx))
        next = { lowHz: logXToHz(lx + dx), highHz: logXToHz(hx + dx) }
      }
      onChange(clampBand(next, 20000))
    }
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <div className="flex flex-col gap-0.5">
      <canvas
        ref={canvasRef}
        data-band-spectrum
        width={W}
        height={H}
        onPointerDown={onPointerDown}
        onDoubleClick={() => onChange({ ...BAND_PRESETS.KICK })}
        className="rounded-sm cursor-ew-resize"
        style={{ width: W, height: H, backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', touchAction: 'none' }}
      />
      <div className="flex justify-between text-[9px] tabular-nums" style={{ color: 'var(--text-ghost)', fontFamily: "'JetBrains Mono', monospace" }}>
        <span>{fmtHz(band.lowHz)}</span>
        <span>{fmtHz(band.highHz)} Hz</span>
      </div>
    </div>
  )
}
