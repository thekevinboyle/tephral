import { memo, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { LoopIcon } from '../ui/DotMatrixIcons'
import { useMediaStore } from '../../stores/mediaStore'
import { useRecordingStore } from '../../stores/recordingStore'
import { useAudioSourceStore } from '../../stores/audioSourceStore'
import { useUIStore } from '../../stores/uiStore'
import { useMediaSource } from '../../hooks/useMediaSource'
import { useAudioFileDrop } from '../../hooks/useAudioFileDrop'

const HANDLE_HIT_PX = 8
const MIN_LOOP_SECONDS = 0.1
const THUMBS = 16
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

const formatTime = (seconds: number) => {
  const s = Number.isFinite(seconds) ? Math.max(0, seconds) : 0
  const mins = Math.floor(s / 60)
  const secs = Math.floor(s % 60)
  const cs = Math.floor((s % 1) * 100)
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
}

const MEDIA_EVENTS = ['durationchange', 'loadedmetadata', 'emptied'] as const

/** Duration of a media element, straight from its events (0 until known or with no element). */
function useMediaElement(el: HTMLMediaElement | null) {
  const subscribe = useCallback((cb: () => void) => {
    if (!el) return () => {}
    MEDIA_EVENTS.forEach((e) => el.addEventListener(e, cb))
    return () => MEDIA_EVENTS.forEach((e) => el.removeEventListener(e, cb))
  }, [el])
  const duration = useSyncExternalStore(subscribe, () => (el && Number.isFinite(el.duration) ? el.duration : 0))
  return { duration }
}

const hint = (text: string) => ({
  onMouseEnter: () => useUIStore.getState().setStatusText(text),
  onMouseLeave: () => useUIStore.getState().setStatusText(null),
})

/** Lane time readout, written straight to the DOM from the lane's rAF. */
function TimeReadout({ timeRef, duration }: { timeRef: React.RefObject<HTMLSpanElement | null>; duration: number }) {
  return (
    <div className="seg-media-time">
      <span ref={timeRef}>{formatTime(0)}</span> <em>/ {formatTime(duration)}</em>
    </div>
  )
}

/* ─── Video lane ─────────────────────────────────────────────────────────── */

function useFilmstrip(src: string | null, enabled: boolean) {
  // Keyed by source, so a new video never shows the last one's frames
  const [strip, setStrip] = useState<{ src: string; thumbs: ImageBitmap[] } | null>(null)
  useEffect(() => {
    if (!src || !enabled) return
    let cancelled = false
    const v = document.createElement('video')
    v.muted = true
    v.preload = 'auto'
    v.crossOrigin = 'anonymous'
    v.src = src
    const out: ImageBitmap[] = []
    const seek = (t: number) => new Promise<void>((resolve) => {
      const done = () => { v.removeEventListener('seeked', done); resolve() }
      v.addEventListener('seeked', done)
      v.currentTime = t
    })
    v.addEventListener('loadeddata', async () => {
      const d = v.duration
      if (!Number.isFinite(d) || d <= 0) return
      const h = 72, w = Math.max(1, Math.round((h * v.videoWidth) / Math.max(1, v.videoHeight)))
      for (let i = 0; i < THUMBS && !cancelled; i++) {
        await seek(((i + 0.5) / THUMBS) * d)
        try { out.push(await createImageBitmap(v, { resizeWidth: w, resizeHeight: h })) } catch { /* a frame that will not decode is skipped */ }
      }
      if (!cancelled) setStrip({ src, thumbs: out.slice() })
    }, { once: true })
    return () => { cancelled = true; v.removeAttribute('src'); v.load(); out.forEach((b) => b.close()) }
  }, [src, enabled])
  return strip && strip.src === src && enabled ? strip.thumbs : NO_THUMBS
}
const NO_THUMBS: ImageBitmap[] = []
const NO_IMAGES: HTMLImageElement[] = []

const VideoLane = memo(function VideoLane() {
  const { source, sourceName, videoElement, imageElement } = useMediaStore(useShallow((s) => ({
    source: s.source, sourceName: s.sourceName, videoElement: s.videoElement, imageElement: s.imageElement,
  })))
  const rec = useRecordingStore(useShallow((s) => ({
    isRecording: s.isRecording, isPlaying: s.isPlaying, duration: s.duration, currentTime: s.currentTime,
    thumbnails: s.thumbnails, play: s.play, pause: s.pause, seek: s.seek,
  })))
  const { openFilePicker } = useMediaSource()

  const recordingMode = rec.duration > 0 && !rec.isRecording
  const fileVideo = source === 'file' && !!videoElement
  const live = (source === 'webcam' || source === 'screen') && !!videoElement
  const media = useMediaElement(source === 'file' ? videoElement : null)
  const duration = media.duration
  const timeRef = useRef<HTMLSpanElement>(null)
  const headRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scrubbing = useRef(false)

  const fileThumbs = useFilmstrip(fileVideo ? videoElement!.currentSrc || videoElement!.src : null, fileVideo && !recordingMode)
  // A recorded take shows the thumbnails captured while it was recorded (decoded before drawing)
  const [take, setTake] = useState<{ of: unknown; ims: HTMLImageElement[] } | null>(null)
  useEffect(() => {
    if (!recordingMode) return
    let cancelled = false
    const of = rec.thumbnails
    Promise.all(of.map((t) => { const im = new Image(); im.src = t.dataUrl; return im.decode().then(() => im, () => null) }))
      .then((ims) => { if (!cancelled) setTake({ of, ims: ims.filter((im): im is HTMLImageElement => !!im) }) })
    return () => { cancelled = true }
  }, [recordingMode, rec.thumbnails])
  const takeThumbs = take && take.of === rec.thumbnails ? take.ims : NO_IMAGES
  const thumbs: (ImageBitmap | HTMLImageElement)[] = recordingMode ? takeThumbs : fileThumbs
  const laneDuration = recordingMode ? rec.duration : duration
  const playable = recordingMode || (fileVideo && duration > 0)


  // Playhead and time, every frame
  useEffect(() => {
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const t = recordingMode ? useRecordingStore.getState().currentTime : videoElement?.currentTime ?? 0
      const d = recordingMode ? useRecordingStore.getState().duration : duration
      if (timeRef.current) timeRef.current.textContent = formatTime(t)
      if (headRef.current) headRef.current.style.left = `${d > 0 ? (t / d) * 100 : 0}%`
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [videoElement, duration, recordingMode])

  // Filmstrip: the recording's own thumbnails while it plays back, else frames of the video file
  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const draw = () => {
      const dpr = window.devicePixelRatio || 1
      c.width = Math.max(1, Math.round(c.clientWidth * dpr)); c.height = Math.max(1, Math.round(c.clientHeight * dpr))
      const g = c.getContext('2d')!
      g.clearRect(0, 0, c.width, c.height)
      const imgs = thumbs
      if (!imgs.length) return
      const tileW = c.height * (imgs[0].width / Math.max(1, imgs[0].height))
      const n = Math.max(1, Math.ceil(c.width / tileW))
      for (let i = 0; i < n; i++) {
        const img = imgs[Math.min(imgs.length - 1, Math.floor(((i + 0.5) / n) * imgs.length))]
        try { g.drawImage(img, i * tileW, 0, tileW + 1, c.height) } catch { /* not decoded yet */ }
      }
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(c)
    return () => ro.disconnect()
  }, [thumbs])

  const seekTo = (clientX: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect()
    const t = clamp((clientX - r.left) / Math.max(1, r.width), 0, 1) * laneDuration
    const v = useMediaStore.getState().videoElement
    if (recordingMode) rec.seek(t)
    else if (v) v.currentTime = t
  }

  const hasVideo = fileVideo || live || !!imageElement || recordingMode
  const name = recordingMode ? 'Recorded take' : sourceName ?? (imageElement ? 'Image' : 'Video')

  return (
    <div className="seg-media-row" data-media-lane="video">
      <div className="seg-media-head">
        <div className="seg-media-name">
          <span className="seg-media-kind">{recordingMode ? 'TAKE' : live ? 'LIVE' : 'VIDEO'}</span>
          <span className="seg-media-file" title={hasVideo ? name : undefined}>{hasVideo ? name : 'None'}</span>
        </div>
      </div>
      {hasVideo ? (
        <>
          <div
            className="seg-media-lane seg-media-film"
            data-disabled={!playable || undefined}
            onPointerDown={(e) => { if (!playable) return; e.currentTarget.setPointerCapture(e.pointerId); scrubbing.current = true; seekTo(e.clientX, e.currentTarget) }}
            onPointerMove={(e) => { if (scrubbing.current) seekTo(e.clientX, e.currentTarget) }}
            onPointerUp={() => { scrubbing.current = false }}
            onPointerCancel={() => { scrubbing.current = false }}
            {...hint(live ? 'Live input: no timeline' : imageElement ? 'Still image: no timeline' : 'Video: click or drag to scrub')}
          >
            <canvas ref={canvasRef} />
            {playable && <div ref={headRef} className="seg-media-head-line" />}
          </div>
          {playable ? <TimeReadout timeRef={timeRef} duration={laneDuration} /> : <div className="seg-media-time"><em>{live ? 'LIVE' : '—'}</em></div>}
          <button className="seg-media-x" aria-label="Remove video" title="Remove video" onClick={() => useMediaStore.getState().reset()} {...hint('Remove the video source')}>×</button>
        </>
      ) : (
        <button className="seg-media-empty" onClick={openFilePicker} {...hint('Load a video or image')}>Drop a video or image here, or click to choose one</button>
      )}
    </div>
  )
})

/* ─── Audio lane ─────────────────────────────────────────────────────────── */

type DragMode = 'create' | 'start' | 'end' | 'move' | null

const AudioLane = memo(function AudioLane() {
  const audioEl = useAudioSourceStore((s) => s.audioFileElement)
  const fileName = useAudioSourceStore((s) => s.audioFileName)
  const fileUrl = useAudioSourceStore((s) => s.audioFileUrl)
  const active = useAudioSourceStore((s) => s.activeSource)
  const loopEnabled = useAudioSourceStore((s) => s.audioLoopEnabled)
  const loopStart = useAudioSourceStore((s) => s.audioLoopStart)
  const loopEnd = useAudioSourceStore((s) => s.audioLoopEnd)
  const loadAudio = useAudioFileDrop()

  const hasFile = active === 'file' && !!audioEl
  const { duration } = useMediaElement(audioEl)
  const [drag, setDrag] = useState<DragMode>(null)
  const [hover, setHover] = useState<DragMode>(null)
  const peaks = useRef<Float32Array | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const laneRef = useRef<HTMLDivElement>(null)
  const headRef = useRef<HTMLDivElement>(null)
  const timeRef = useRef<HTMLSpanElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  /** The element's own duration (0 until known): read in handlers and rAF, so nothing is written during render. */
  const durationOf = useCallback(() => (audioEl && Number.isFinite(audioEl.duration) ? audioEl.duration : 0), [audioEl])


  // Loop: wrap only when playback runs into the loop end from inside the region; a seek moves freely
  useEffect(() => {
    if (!audioEl || !loopEnabled || loopEnd <= loopStart) return
    let last = audioEl.currentTime
    const onSeek = () => { last = audioEl.currentTime }
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const t = audioEl.currentTime
      if (!audioEl.paused && !audioEl.seeking && last >= loopStart && last < loopEnd && t >= loopEnd) {
        audioEl.currentTime = loopStart
        last = loopStart
        return
      }
      last = t
    }
    audioEl.addEventListener('seeking', onSeek)
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); audioEl.removeEventListener('seeking', onSeek) }
  }, [audioEl, loopEnabled, loopStart, loopEnd])

  const draw = useCallback(() => {
    const c = canvasRef.current
    if (!c) return
    const dpr = window.devicePixelRatio || 1
    const w = Math.max(1, Math.round(c.clientWidth * dpr)), h = Math.max(1, Math.round(c.clientHeight * dpr))
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h }
    const g = c.getContext('2d')!
    g.clearRect(0, 0, w, h)
    const p = peaks.current
    if (!p) return
    const css = getComputedStyle(c)
    const played = css.getPropertyValue('--text-secondary').trim() || '#d6d4cf'
    const rest = css.getPropertyValue('--text-muted').trim() || '#aeaca7'
    const t = audioEl && durationOf() > 0 ? audioEl.currentTime / durationOf() : 0
    const step = 3 * dpr, bars = Math.floor(w / step)
    for (let i = 0; i < bars; i++) {
      const v = p[Math.floor((i / bars) * p.length)] || 0
      const bh = Math.max(dpr, v * h * 0.9)
      g.fillStyle = i / bars < t ? played : rest
      g.globalAlpha = i / bars < t ? 1 : 0.45
      g.fillRect(i * step, (h - bh) / 2, 2 * dpr, bh)
    }
    g.globalAlpha = 1
  }, [audioEl, durationOf])

  // Decode the file into peaks for the waveform
  useEffect(() => {
    peaks.current = null
    draw()
    if (!fileUrl) return
    let cancelled = false
    const ctx = new AudioContext()
    fetch(fileUrl).then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b)).then((buf) => {
      if (cancelled) return
      const ch = buf.getChannelData(0), n = 800, per = Math.max(1, Math.floor(ch.length / n))
      const out = new Float32Array(n)
      let max = 0
      for (let i = 0; i < n; i++) {
        let m = 0
        for (let j = i * per, e = Math.min(ch.length, j + per); j < e; j++) { const a = Math.abs(ch[j]); if (a > m) m = a }
        out[i] = m; if (m > max) max = m
      }
      if (max > 0) for (let i = 0; i < n; i++) out[i] /= max // fill the lane, whatever the level
      peaks.current = out
      draw()
    }).catch(() => { peaks.current = null }).finally(() => { ctx.close() })
    return () => { cancelled = true }
  }, [fileUrl, draw])

  // Size changes redraw; the playhead, time and played colour follow every frame
  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const ro = new ResizeObserver(draw)
    ro.observe(c)
    let raf = 0, lastT = -1
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const t = audioEl?.currentTime ?? 0, d = durationOf()
      if (timeRef.current) timeRef.current.textContent = formatTime(t)
      if (headRef.current) headRef.current.style.left = `${d > 0 ? (t / d) * 100 : 0}%`
      if (Math.abs(t - lastT) > 0.02) { lastT = t; draw() }
    }
    raf = requestAnimationFrame(tick)
    return () => { ro.disconnect(); cancelAnimationFrame(raf) }
  }, [draw, audioEl, hasFile, durationOf])

  const zoneAt = (clientX: number): DragMode => {
    const r = laneRef.current?.getBoundingClientRect()
    if (!r || duration <= 0 || loopEnd <= loopStart) return null
    const x = clientX - r.left, sx = (loopStart / duration) * r.width, ex = (loopEnd / duration) * r.width
    if (Math.abs(x - sx) <= HANDLE_HIT_PX) return 'start'
    if (Math.abs(x - ex) <= HANDLE_HIT_PX) return 'end'
    if (x > sx && x < ex) return 'move'
    return null
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!audioEl || duration <= 0 || e.button !== 0) return
    const lane = e.currentTarget
    lane.setPointerCapture(e.pointerId)
    const r = lane.getBoundingClientRect()
    const timeAt = (x: number) => clamp((x - r.left) / r.width, 0, 1) * durationOf()
    const zone = zoneAt(e.clientX) ?? 'create'
    const t0 = timeAt(e.clientX)
    const snap = { x: e.clientX, start: loopStart, end: loopEnd }
    let moved = false
    setDrag(zone)
    const move = (ev: PointerEvent) => {
      if (!moved && Math.abs(ev.clientX - snap.x) <= 3) return
      moved = true
      const s = useAudioSourceStore.getState(), d = durationOf()
      const dt = ((ev.clientX - snap.x) / r.width) * d
      if (zone === 'create') { const t = timeAt(ev.clientX); s.setAudioLoopStart(Math.min(t0, t)); s.setAudioLoopEnd(Math.max(t0, t)) }
      else if (zone === 'start') s.setAudioLoopStart(clamp(snap.start + dt, 0, snap.end - MIN_LOOP_SECONDS))
      else if (zone === 'end') s.setAudioLoopEnd(clamp(snap.end + dt, snap.start + MIN_LOOP_SECONDS, d))
      else {
        const len = snap.end - snap.start
        const start = clamp(snap.start + dt, 0, d - len)
        s.setAudioLoopStart(start); s.setAudioLoopEnd(start + len)
      }
    }
    const up = () => {
      lane.removeEventListener('pointermove', move)
      lane.removeEventListener('pointerup', up)
      lane.removeEventListener('pointercancel', up)
      setDrag(null)
      const s = useAudioSourceStore.getState()
      // A click (no drag) seeks, inside the loop or out of it; a drag sets the loop and turns it on
      if (!moved) audioEl.currentTime = t0
      else if (s.audioLoopEnd - s.audioLoopStart < MIN_LOOP_SECONDS) s.clearAudioLoop()
      else s.setAudioLoopEnabled(true)
    }
    lane.addEventListener('pointermove', move)
    lane.addEventListener('pointerup', up)
    lane.addEventListener('pointercancel', up)
  }

  const hasLoop = loopEnd > loopStart && duration > 0
  const zone = drag ?? hover
  const cursor = zone === 'start' || zone === 'end' ? 'ew-resize' : zone === 'move' ? (drag ? 'grabbing' : 'grab') : 'crosshair'

  return (
    <div className="seg-media-row" data-media-lane="audio">
      <div className="seg-media-head">
        <button
          className="seg-media-btn"
          data-loop={loopEnabled && hasLoop ? '' : undefined}
          disabled={!hasLoop}
          onClick={() => useAudioSourceStore.getState().setAudioLoopEnabled(!loopEnabled)}
          aria-pressed={loopEnabled && hasLoop}
          aria-label="Loop the selection"
          title={hasLoop ? (loopEnabled ? 'Loop on' : 'Loop off') : 'Drag on the waveform to make a loop'}
          {...hint(hasLoop ? 'Loop the selection on or off' : 'Drag on the waveform to make a loop')}
        >
          <LoopIcon size={11} color="currentColor" />
        </button>
        <div className="seg-media-name">
          <span className="seg-media-kind">AUDIO</span>
          <span className="seg-media-file" title={hasFile ? fileName ?? undefined : undefined}>{hasFile ? fileName ?? 'Audio file' : 'None'}</span>
        </div>
      </div>
      {hasFile ? (
        <>
          <div
            ref={laneRef}
            className="seg-media-lane seg-media-wave"
            data-audio-waveform
            style={{ cursor }}
            onPointerDown={onPointerDown}
            onPointerMove={(e) => { if (!drag) setHover(zoneAt(e.clientX)) }}
            onPointerLeave={() => setHover(null)}
            onDoubleClick={() => { if (hasLoop) useAudioSourceStore.getState().clearAudioLoop() }}
            {...hint(hasLoop ? 'Click to seek. Drag the handles or the loop to change it; double-click clears it' : 'Click to seek. Drag to make a loop')}
          >
            <canvas ref={canvasRef} />
            {hasLoop && (
              <div
                className="seg-media-loop"
                data-off={!loopEnabled || undefined}
                data-active={zone ?? undefined}
                style={{ left: `${(loopStart / duration) * 100}%`, width: `${((loopEnd - loopStart) / duration) * 100}%` }}
              >
                <span>LOOP {loopStart.toFixed(1)}–{loopEnd.toFixed(1)} s</span>
              </div>
            )}
            <div ref={headRef} className="seg-media-head-line" />
          </div>
          <TimeReadout timeRef={timeRef} duration={duration} />
          <button className="seg-media-x" aria-label="Remove audio" title="Remove audio" onClick={() => useAudioSourceStore.getState().clearAudioFile()} {...hint('Remove the audio file')}>×</button>
        </>
      ) : (
        <>
          <button className="seg-media-empty" onClick={() => fileInput.current?.click()} {...hint('Load an audio file: it plays and drives the audio-reactive devices')}>Drop an audio file here, or click to choose one</button>
          <input ref={fileInput} type="file" accept="audio/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) loadAudio(f); e.target.value = '' }} />
        </>
      )}
    </div>
  )
})

/* ─── Strip ──────────────────────────────────────────────────────────────── */

/**
 * The media strip under the stage: a video lane (filmstrip, scrub, play) and an audio lane (waveform,
 * loop, play), both always visible. Playheads and times are written from rAF, not React state.
 */
export const MediaStrip = memo(function MediaStrip() {
  const videoElement = useMediaStore((s) => s.videoElement)
  const { isRecording, setCurrentTime, addThumbnail } = useRecordingStore(useShallow((s) => ({
    isRecording: s.isRecording, setCurrentTime: s.setCurrentTime, addThumbnail: s.addThumbnail,
  })))

  // While recording: the take's clock and a thumbnail every 2 s (the take's filmstrip)
  useEffect(() => {
    if (!isRecording) return
    const start = performance.now()
    const clock = setInterval(() => setCurrentTime((performance.now() - start) / 1000), 100)
    const thumbs = videoElement ? window.setInterval(() => {
      try {
        if (videoElement.readyState < 2) return
        const c = document.createElement('canvas')
        c.width = 64; c.height = 64
        c.getContext('2d')?.drawImage(videoElement, 0, 0, 64, 64)
        addThumbnail({ time: (performance.now() - start) / 1000, dataUrl: c.toDataURL('image/jpeg', 0.6) })
      } catch (err) {
        console.warn('Failed to capture thumbnail:', err)
      }
    }, 2000) : 0
    return () => { clearInterval(clock); if (thumbs) clearInterval(thumbs) }
  }, [isRecording, setCurrentTime, addThumbnail, videoElement])

  return (
    <div className="seg-media" data-media-strip>
      <VideoLane />
      <AudioLane />
    </div>
  )
})
