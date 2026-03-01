import { useEffect, useState, useCallback, useRef } from 'react'
import { PlayIcon, PauseIcon, LoopIcon } from '../ui/DotMatrixIcons'
import { useAudioSourceStore } from '../../stores/audioSourceStore'
import { useUIStore } from '../../stores/uiStore'

const ACCENT = '#FF3355'
const HANDLE_HIT_PX = 6
const MIN_LOOP_SECONDS = 0.1

type DragMode = 'create' | 'start' | 'end' | 'move' | null
type HoverZone = 'start' | 'end' | 'body' | null

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 100)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

export function AudioFileTransport() {
  const audioEl = useAudioSourceStore((s) => s.audioFileElement)
  const audioFileName = useAudioSourceStore((s) => s.audioFileName)
  const loopEnabled = useAudioSourceStore((s) => s.audioLoopEnabled)
  const loopStart = useAudioSourceStore((s) => s.audioLoopStart)
  const loopEnd = useAudioSourceStore((s) => s.audioLoopEnd)
  const setLoopEnabled = useAudioSourceStore((s) => s.setAudioLoopEnabled)
  const clearLoop = useAudioSourceStore((s) => s.clearAudioLoop)
  const setStatusText = useUIStore((s) => s.setStatusText)

  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [hoveredZone, setHoveredZone] = useState<HoverZone>(null)
  const [isDragging, setIsDragging] = useState(false)

  const waveformContainerRef = useRef<HTMLDivElement>(null)
  const waveformRef = useRef<HTMLCanvasElement>(null)
  const waveRafRef = useRef<number | null>(null)
  const freqDataRef = useRef<Uint8Array | null>(null)
  const dragModeRef = useRef<DragMode>(null)
  const dragSnap = useRef({ x: 0, loopStart: 0, loopEnd: 0 })
  const rectRef = useRef<DOMRect | null>(null)
  const durationRef = useRef(duration)
  durationRef.current = duration
  const didDragRef = useRef(false)

  // Track audio element events
  useEffect(() => {
    if (!audioEl) return

    const handleTimeUpdate = () => setCurrentTime(audioEl.currentTime)
    const handleDurationChange = () => {
      if (audioEl.duration && isFinite(audioEl.duration)) {
        setDuration(audioEl.duration)
      }
    }
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    audioEl.addEventListener('timeupdate', handleTimeUpdate)
    audioEl.addEventListener('durationchange', handleDurationChange)
    audioEl.addEventListener('loadedmetadata', handleDurationChange)
    audioEl.addEventListener('play', handlePlay)
    audioEl.addEventListener('pause', handlePause)

    if (audioEl.duration && isFinite(audioEl.duration)) {
      setDuration(audioEl.duration)
    }
    setIsPlaying(!audioEl.paused)

    return () => {
      audioEl.removeEventListener('timeupdate', handleTimeUpdate)
      audioEl.removeEventListener('durationchange', handleDurationChange)
      audioEl.removeEventListener('loadedmetadata', handleDurationChange)
      audioEl.removeEventListener('play', handlePlay)
      audioEl.removeEventListener('pause', handlePause)
    }
  }, [audioEl])

  // Loop enforcement
  useEffect(() => {
    if (!audioEl) return
    const handleLoopCheck = () => {
      if (loopEnabled && loopEnd > loopStart) {
        if (audioEl.currentTime >= loopEnd) {
          audioEl.currentTime = loopStart
        }
      }
    }
    audioEl.addEventListener('timeupdate', handleLoopCheck)
    return () => audioEl.removeEventListener('timeupdate', handleLoopCheck)
  }, [audioEl, loopEnabled, loopStart, loopEnd])

  // Mirror waveform rendering — symmetrical from center line
  useEffect(() => {
    const canvas = waveformRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    function draw() {
      const state = useAudioSourceStore.getState()
      const analyser = state.reactiveAnalyser
      const w = canvas!.width
      const h = canvas!.height
      const centerY = h / 2

      ctx!.clearRect(0, 0, w, h)

      // Faint center line
      ctx!.fillStyle = 'rgba(255, 255, 255, 0.04)'
      ctx!.fillRect(0, centerY - 0.5, w, 1)

      if (analyser) {
        const binCount = analyser.frequencyBinCount
        if (!freqDataRef.current || freqDataRef.current.length !== binCount) {
          freqDataRef.current = new Uint8Array(binCount)
        }
        analyser.getByteFrequencyData(freqDataRef.current as Uint8Array<ArrayBuffer>)
        const freq = freqDataRef.current

        const sampleRate = state.audioContext?.sampleRate ?? 44100
        const binHz = sampleRate / (binCount * 2)

        // 1px bars for density
        const barCount = Math.floor(w / 1.5)
        const barW = w / barCount
        const gap = 0.5

        const minFreq = 20
        const maxFreq = Math.min(16000, sampleRate / 2)
        const logMin = Math.log(minFreq)
        const logMax = Math.log(maxFreq)

        for (let i = 0; i < barCount; i++) {
          const t0 = i / barCount
          const t1 = (i + 1) / barCount
          const f0 = Math.exp(logMin + t0 * (logMax - logMin))
          const f1 = Math.exp(logMin + t1 * (logMax - logMin))
          const bin0 = Math.max(0, Math.floor(f0 / binHz))
          const bin1 = Math.min(binCount - 1, Math.floor(f1 / binHz))

          let sum = 0
          let count = 0
          for (let b = bin0; b <= bin1; b++) {
            sum += freq[b]
            count++
          }
          const mag = count > 0 ? (sum / count) / 255 : 0

          const barH = Math.max(0, mag * centerY * 0.85)
          const alpha = 0.15 + mag * 0.85

          // Single accent color with alpha
          ctx!.fillStyle = `rgba(255, 51, 85, ${alpha})`

          // Top half — grows upward from center
          ctx!.fillRect(
            i * barW,
            centerY - barH,
            Math.max(0.5, barW - gap),
            barH,
          )
          // Bottom half — mirrored downward from center
          ctx!.fillRect(
            i * barW,
            centerY,
            Math.max(0.5, barW - gap),
            barH,
          )
        }
      } else {
        // Fallback: time-domain waveform mirrored
        const data = state.waveformData
        const barCount = Math.min(64, data.length)
        const step = Math.floor(data.length / barCount)
        const barW = w / barCount

        for (let i = 0; i < barCount; i++) {
          const v = data[i * step] / 255
          const mag = Math.abs(v - 0.5) * 2
          const barH = Math.max(0, mag * centerY * 0.85)
          const alpha = 0.15 + mag * 0.85

          ctx!.fillStyle = `rgba(255, 51, 85, ${alpha})`
          ctx!.fillRect(i * barW, centerY - barH, Math.max(0.5, barW - 0.5), barH)
          ctx!.fillRect(i * barW, centerY, Math.max(0.5, barW - 0.5), barH)
        }
      }

      waveRafRef.current = requestAnimationFrame(draw)
    }

    waveRafRef.current = requestAnimationFrame(draw)
    return () => {
      if (waveRafRef.current !== null) cancelAnimationFrame(waveRafRef.current)
    }
  }, [])

  // Resize waveform canvas to match container
  useEffect(() => {
    const canvas = waveformRef.current
    if (!canvas) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        canvas.width = Math.floor(width * window.devicePixelRatio)
        canvas.height = Math.floor(height * window.devicePixelRatio)
      }
    })
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  const handlePlayPause = useCallback(() => {
    if (!audioEl) return
    if (audioEl.paused) {
      audioEl.play().catch(console.error)
    } else {
      audioEl.pause()
    }
  }, [audioEl])

  // Hit zone detection on the waveform
  const getHitZone = useCallback(
    (clientX: number, rect: DOMRect): HoverZone => {
      if (duration <= 0) return null
      const hasRegion = loopEnd > loopStart
      if (!hasRegion) return null

      const startPx = (loopStart / duration) * rect.width
      const endPx = (loopEnd / duration) * rect.width

      const x = clientX - rect.left
      if (Math.abs(x - startPx) <= HANDLE_HIT_PX) return 'start'
      if (Math.abs(x - endPx) <= HANDLE_HIT_PX) return 'end'
      if (x > startPx + HANDLE_HIT_PX && x < endPx - HANDLE_HIT_PX) return 'body'
      return null
    },
    [duration, loopStart, loopEnd],
  )

  const handleWaveformMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) return
      const rect = waveformContainerRef.current?.getBoundingClientRect()
      if (!rect) return
      setHoveredZone(getHitZone(e.clientX, rect))
    },
    [isDragging, getHitZone],
  )

  const handleWaveformMouseLeave = useCallback(() => {
    if (!isDragging) setHoveredZone(null)
  }, [isDragging])

  const handleWaveformMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (duration <= 0) return
      e.preventDefault()

      const rect = waveformContainerRef.current?.getBoundingClientRect()
      if (!rect) return
      rectRef.current = rect

      const zone = getHitZone(e.clientX, rect)
      const clickTime = clamp(((e.clientX - rect.left) / rect.width) * duration, 0, duration)
      didDragRef.current = false

      if (zone === 'start') {
        dragModeRef.current = 'start'
        dragSnap.current = { x: e.clientX, loopStart, loopEnd }
      } else if (zone === 'end') {
        dragModeRef.current = 'end'
        dragSnap.current = { x: e.clientX, loopStart, loopEnd }
      } else if (zone === 'body') {
        dragModeRef.current = 'move'
        dragSnap.current = { x: e.clientX, loopStart, loopEnd }
      } else {
        dragModeRef.current = 'create'
        dragSnap.current = { x: e.clientX, loopStart: clickTime, loopEnd: clickTime }
      }

      setIsDragging(true)

      const handleMove = (ev: MouseEvent) => {
        const r = rectRef.current
        if (!r) return
        const dur = durationRef.current
        if (dur <= 0) return

        const dx = Math.abs(ev.clientX - dragSnap.current.x)
        if (dx > 3) didDragRef.current = true

        const currentPct = clamp((ev.clientX - r.left) / r.width, 0, 1)
        const currentT = currentPct * dur
        const snap = dragSnap.current
        const deltaPx = ev.clientX - snap.x
        const deltaTime = (deltaPx / r.width) * dur

        const mode = dragModeRef.current
        if (mode === 'create') {
          if (!didDragRef.current) return
          const a = snap.loopStart
          const b = currentT
          useAudioSourceStore.getState().setAudioLoopStart(Math.min(a, b))
          useAudioSourceStore.getState().setAudioLoopEnd(Math.max(a, b))
        } else if (mode === 'start') {
          const newStart = clamp(snap.loopStart + deltaTime, 0, snap.loopEnd - MIN_LOOP_SECONDS)
          useAudioSourceStore.getState().setAudioLoopStart(newStart)
        } else if (mode === 'end') {
          const newEnd = clamp(snap.loopEnd + deltaTime, snap.loopStart + MIN_LOOP_SECONDS, dur)
          useAudioSourceStore.getState().setAudioLoopEnd(newEnd)
        } else if (mode === 'move') {
          const len = snap.loopEnd - snap.loopStart
          let newStart = snap.loopStart + deltaTime
          let newEnd = snap.loopEnd + deltaTime
          if (newStart < 0) { newStart = 0; newEnd = len }
          if (newEnd > dur) { newEnd = dur; newStart = dur - len }
          useAudioSourceStore.getState().setAudioLoopStart(newStart)
          useAudioSourceStore.getState().setAudioLoopEnd(newEnd)
        }
      }

      const handleUp = () => {
        window.removeEventListener('mousemove', handleMove)
        window.removeEventListener('mouseup', handleUp)
        setIsDragging(false)

        const mode = dragModeRef.current
        dragModeRef.current = null

        if (mode === 'create' && !didDragRef.current) {
          const r = rectRef.current
          if (r && audioEl) {
            const seekTime = clamp(dragSnap.current.loopStart, 0, durationRef.current)
            audioEl.currentTime = seekTime
          }
        } else {
          const store = useAudioSourceStore.getState()
          if (store.audioLoopEnd - store.audioLoopStart < MIN_LOOP_SECONDS) {
            store.clearAudioLoop()
          } else {
            store.setAudioLoopEnabled(true)
          }
        }
      }

      window.addEventListener('mousemove', handleMove)
      window.addEventListener('mouseup', handleUp)
    },
    [audioEl, duration, loopStart, loopEnd, getHitZone],
  )

  const handleWaveformDoubleClick = useCallback(() => {
    if (loopEnd > loopStart) clearLoop()
  }, [clearLoop, loopStart, loopEnd])

  if (!audioEl) return null

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const hasLoopRegion = loopEnd > loopStart
  const loopStartPct = duration > 0 ? (loopStart / duration) * 100 : 0
  const loopEndPct = duration > 0 ? (loopEnd / duration) * 100 : 0

  const waveformCursor = isDragging
    ? dragModeRef.current === 'move' ? 'grabbing' : 'ew-resize'
    : hoveredZone === 'start' || hoveredZone === 'end'
      ? 'ew-resize'
      : hoveredZone === 'body'
        ? 'grab'
        : 'crosshair'

  return (
    <div
      className="flex flex-col flex-shrink-0"
      style={{
        backgroundColor: 'rgba(255, 51, 85, 0.03)',
        borderTop: `1px solid ${ACCENT}15`,
      }}
    >
      {/* Waveform — full width, scrub + loop surface */}
      <div
        ref={waveformContainerRef}
        className="relative w-full"
        style={{
          height: 40,
          backgroundColor: 'rgba(0,0,0,0.4)',
          cursor: waveformCursor,
        }}
        onMouseDown={handleWaveformMouseDown}
        onMouseMove={handleWaveformMouseMove}
        onMouseLeave={handleWaveformMouseLeave}
        onDoubleClick={handleWaveformDoubleClick}
        onMouseEnter={() => setStatusText(
          hasLoopRegion
            ? 'Click to seek — Drag edges to resize loop — Double-click to clear'
            : 'Click to seek — Drag to create loop'
        )}
      >
        {/* Canvas */}
        <canvas
          ref={waveformRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
          }}
        />

        {/* Loop region overlay */}
        {hasLoopRegion && (
          <div
            className="absolute inset-y-0"
            style={{
              left: `${loopStartPct}%`,
              width: `${loopEndPct - loopStartPct}%`,
              backgroundColor: loopEnabled ? `${ACCENT}18` : `${ACCENT}0C`,
              borderLeft: `1.5px solid ${loopEnabled ? `${ACCENT}A0` : `${ACCENT}50`}`,
              borderRight: `1.5px solid ${loopEnabled ? `${ACCENT}A0` : `${ACCENT}50`}`,
              pointerEvents: 'none',
            }}
          >
            {/* Left handle */}
            <div
              className="absolute left-0 inset-y-0"
              style={{
                width: 3,
                backgroundColor: hoveredZone === 'start' || (isDragging && dragModeRef.current === 'start') ? ACCENT : 'transparent',
                opacity: 0.9,
              }}
            />
            {/* Right handle */}
            <div
              className="absolute right-0 inset-y-0"
              style={{
                width: 3,
                backgroundColor: hoveredZone === 'end' || (isDragging && dragModeRef.current === 'end') ? ACCENT : 'transparent',
                opacity: 0.9,
              }}
            />
          </div>
        )}

        {/* Playhead */}
        <div
          style={{
            position: 'absolute',
            left: `${progress}%`,
            top: 0,
            bottom: 0,
            width: 1.5,
            backgroundColor: ACCENT,
            transform: 'translateX(-0.75px)',
            pointerEvents: 'none',
            boxShadow: `0 0 6px ${ACCENT}60`,
          }}
        />
      </div>

      {/* Controls row — below waveform */}
      <div
        className="flex items-center"
        style={{
          height: 22,
          padding: '0 6px',
          gap: 5,
        }}
      >
        {/* Play/Pause */}
        <button
          onClick={handlePlayPause}
          className="w-4 h-4 rounded-sm flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: 'transparent',
            border: '1px solid var(--border)',
          }}
          title={isPlaying ? 'Pause' : 'Play'}
          onMouseEnter={() => setStatusText('Audio — Play/Pause')}
          onMouseLeave={() => setStatusText(null)}
        >
          {isPlaying ? (
            <PauseIcon size={7} color="var(--text-secondary)" />
          ) : (
            <PlayIcon size={7} color="var(--text-secondary)" />
          )}
        </button>

        {/* Loop toggle */}
        <button
          onClick={() => hasLoopRegion && setLoopEnabled(!loopEnabled)}
          className="w-4 h-4 rounded-sm flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: loopEnabled ? `${ACCENT}20` : 'transparent',
            border: `1px solid ${loopEnabled ? `${ACCENT}40` : 'var(--border)'}`,
            opacity: hasLoopRegion ? 1 : 0.3,
          }}
          title={loopEnabled ? 'Disable section loop' : 'Enable section loop'}
          onMouseEnter={() => setStatusText('Toggle section loop')}
          onMouseLeave={() => setStatusText(null)}
        >
          <LoopIcon size={7} color={loopEnabled ? ACCENT : 'var(--text-ghost)'} />
        </button>

        {/* File name */}
        {audioFileName && (
          <span
            className="text-[8px] truncate"
            style={{ color: `${ACCENT}60`, maxWidth: 120 }}
            title={audioFileName}
          >
            {audioFileName}
          </span>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Timecode */}
        <span
          className="text-[9px] tabular-nums flex-shrink-0"
          style={{ color: 'var(--text-secondary)', letterSpacing: '0.03em' }}
        >
          {formatTime(currentTime)}
          <span style={{ color: 'var(--text-ghost)' }}> / {formatTime(duration)}</span>
        </span>
      </div>
    </div>
  )
}
