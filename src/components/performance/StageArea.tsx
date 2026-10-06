import { forwardRef, memo, useEffect, useRef, useState } from 'react'
import { Canvas, type CanvasHandle } from '../Canvas'
import { ClipBin } from './ClipBin'
import { CanvasTransportBar } from './CanvasTransportBar'
import { TransportBar } from './TransportBar'
import { useMediaStore } from '../../stores/mediaStore'
import { useUIStore } from '../../stores/uiStore'
import { useEffectSequencerStore } from '../../stores/effectSequencerStore'
import { useRoutingStore } from '../../stores/routingStore'

/** Rolling frames-per-second from requestAnimationFrame (display cadence, not render cost). */
function useFps(): number {
  const [fps, setFps] = useState(0)
  useEffect(() => {
    let raf = 0, n = 0, t0 = performance.now()
    const tick = () => {
      n++
      const now = performance.now()
      if (now - t0 >= 500) { setFps(Math.round((n * 1000) / (now - t0))); n = 0; t0 = now }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return fps
}

function fmtTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) sec = 0
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60), cs = Math.floor((sec * 100) % 100)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
}

const NO_TIME = '--:--.--'

const fmtHz = (hz: number) => (hz >= 1000 ? `${(hz / 1000).toFixed(hz >= 10000 ? 0 : 1)}k` : `${Math.round(hz)}`)

/** HUD readouts. Owns all per-frame state so the stage and canvas never re-render for it. */
function StageReadouts() {
  const videoElement = useMediaStore((s) => s.videoElement)
  const selectedEffectId = useUIStore((s) => s.selectedEffectId)
  const band = useEffectSequencerStore((s) => {
    const t = selectedEffectId ? s.tracks[selectedEffectId] : undefined
    return t?.audioReactive.enabled ? t.audioReactive.band : null
  })
  const activeBank = useRoutingStore((s) => s.activeBank)
  const fps = useFps()
  const timeRef = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    let raf = 0
    const tick = () => {
      if (!document.hidden && timeRef.current) {
        timeRef.current.textContent = videoElement ? fmtTime(videoElement.currentTime) : NO_TIME
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [videoElement])

  return (
    <>
      <span className="stage-readout tl">● LIVE {fps} FPS</span>
      <span className="stage-readout tr">BANK {String.fromCharCode(65 + activeBank)}</span>
      <span ref={timeRef} className="stage-readout bl" style={{ left: 104 }}>{NO_TIME}</span>
      {band && <span className="stage-readout br">BAND {fmtHz(band.lowHz)}–{fmtHz(band.highHz)}</span>}
    </>
  )
}

/** The output stage: aspect-locked frame that fits the free space, with HUD readouts. */
export const StageArea = memo(forwardRef<CanvasHandle>(function StageArea(_props, canvasRef) {
  const videoAspect = useMediaStore((s) => s.videoAspect) ?? 16 / 9
  return (
    <div className="h-full flex flex-col">
      <CanvasTransportBar />
      <div className="flex-1 min-h-0" style={{ containerType: 'size', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}>
        <div
          data-stage-frame
          className="stage-frame"
          style={{
            aspectRatio: String(videoAspect),
            width: `min(100cqw, calc(100cqh * ${videoAspect}))`,
            maxWidth: '100%',
            maxHeight: '100%',
          }}
        >
          <div className="absolute inset-0 overflow-hidden" style={{ border: '1px solid var(--border-light)', isolation: 'isolate', zIndex: 0 }}>
            <Canvas ref={canvasRef} />
            <ClipBin />
          </div>
          <span className="stage-tick tl" /><span className="stage-tick tr" /><span className="stage-tick bl" /><span className="stage-tick br" />
          <StageReadouts />
          <div className="stage-ruler" />
        </div>
      </div>
      <TransportBar />
    </div>
  )
}))
