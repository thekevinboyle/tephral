import { StageDropZone } from './StageDropZone'
import { forwardRef, memo, useEffect, useState } from 'react'
import { Canvas, type CanvasHandle } from '../Canvas'
import { ClipBin } from './ClipBin'
import { CanvasTransportBar } from './CanvasTransportBar'
import { useMediaTimecode, NO_TIME } from '../../hooks/useMediaTimecode'
import { TransportBar } from './TransportBar'
import { useMediaStore } from '../../stores/mediaStore'
import { useUIStore } from '../../stores/uiStore'
import { useEffectSequencerStore } from '../../stores/effectSequencerStore'
import { useRoutingStore } from '../../stores/routingStore'
import { useBankStore } from '../../stores/bankStore'
import { useRecordingStore } from '../../stores/recordingStore'
import { usePresetLibraryStore } from '../../stores/presetLibraryStore'

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

const fmtHz = (hz: number) => (hz >= 1000 ? `${(hz / 1000).toFixed(hz >= 10000 ? 0 : 1)}k` : `${Math.round(hz)}`)

/** HUD readouts. Owns all per-frame state so the stage and canvas never re-render for it. */
function StageReadouts() {
  const selectedEffectId = useUIStore((s) => s.selectedEffectId)
  const band = useEffectSequencerStore((s) => {
    const t = selectedEffectId ? s.tracks[selectedEffectId] : undefined
    return t?.audioReactive.enabled ? t.audioReactive.band : null
  })
  // The A-D bank buttons drive bankStore; routingStore's bank is the fallback before any bank is loaded
  const loadedBank = useBankStore((s) => s.activeBank)
  const routingBank = useRoutingStore((s) => s.activeBank)
  const activeBank = loadedBank ?? routingBank
  const presetName = usePresetLibraryStore((s) => s.activePresetName)
  const isRecording = useRecordingStore((s) => s.isRecording)
  const fps = useFps()
  const timeRef = useMediaTimecode()

  return (
    <>
      {isRecording ? (
        <span className="stage-readout tl" data-rec-readout style={{ color: 'var(--rec)' }}>● REC {fps} FPS</span>
      ) : (
        <span className="stage-readout tl">● LIVE {fps} FPS</span>
      )}
      <span className="stage-readout tr">{presetName ?? `BANK ${String.fromCharCode(65 + activeBank)}`}</span>
      <span ref={timeRef} className="stage-readout bl">{NO_TIME}</span>
      {band && <span className="stage-readout br">BAND {fmtHz(band.lowHz)}–{fmtHz(band.highHz)}</span>}
    </>
  )
}

/** The output stage: aspect-locked frame that fits the free space, with HUD readouts. */
export const StageArea = memo(forwardRef<CanvasHandle>(function StageArea(_props, canvasRef) {
  const videoAspect = useMediaStore((s) => s.videoAspect) ?? 16 / 9
  return (
    <div className="h-full flex flex-col">
      <StageDropZone className="flex-1 min-h-0" style={{ containerType: 'size', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }}>
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
          <StageReadouts />
        </div>
      </StageDropZone>
      <div data-media-strip className="flex flex-col flex-shrink-0">
        <CanvasTransportBar />
        <TransportBar />
      </div>
    </div>
  )
}))
