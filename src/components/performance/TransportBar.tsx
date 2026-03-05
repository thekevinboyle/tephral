import { useEffect, useState, useCallback, useRef } from 'react'
import { Button } from '../ui/Button'
import { PlayIcon, PauseIcon, LoopIcon } from '../ui/DotMatrixIcons'
import { useMediaStore } from '../../stores/mediaStore'
import { useRecordingStore } from '../../stores/recordingStore'
import { useClipStore } from '../../stores/clipStore'
import { useAudioSourceStore } from '../../stores/audioSourceStore'
import { useUIStore } from '../../stores/uiStore'
import { RadarSweep } from '../ui/MicroVisuals'

const ACCENT = '#FF3355'
const HANDLE_HIT_PX = 6
const MIN_LOOP_SECONDS = 0.1
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

type TransportMode = 'video' | 'audio'
type DragMode = 'create' | 'start' | 'end' | 'move' | null
type HoverZone = 'start' | 'end' | 'body' | null

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 100)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
}

export function TransportBar() {
  const { source, reset, videoElement } = useMediaStore()
  const {
    isRecording,
    isPlaying: isRecordingPlaying,
    currentTime: recordingTime,
    duration: recordingDuration,
    setCurrentTime,
    addThumbnail,
    seek: seekRecording,
  } = useRecordingStore()

  const { clips, clearAllClips } = useClipStore()
  const setStatusText = useUIStore((s) => s.setStatusText)

  // Audio source state
  const audioEl = useAudioSourceStore((s) => s.audioFileElement)
  const audioFileName = useAudioSourceStore((s) => s.audioFileName)
  const audioFileUrl = useAudioSourceStore((s) => s.audioFileUrl)
  const activeAudioSource = useAudioSourceStore((s) => s.activeSource)
  const loopEnabled = useAudioSourceStore((s) => s.audioLoopEnabled)
  const loopStart = useAudioSourceStore((s) => s.audioLoopStart)
  const loopEnd = useAudioSourceStore((s) => s.audioLoopEnd)
  const setLoopEnabled = useAudioSourceStore((s) => s.setAudioLoopEnabled)
  const clearLoop = useAudioSourceStore((s) => s.clearAudioLoop)

  const hasAudioFile = activeAudioSource === 'file' && !!audioEl
  const [mode, setMode] = useState<TransportMode>('video')

  // Auto-switch to audio tab when audio file is loaded
  useEffect(() => {
    if (hasAudioFile) setMode('audio')
    else setMode('video')
  }, [hasAudioFile])

  // Video state
  const [sourceVideoTime, setSourceVideoTime] = useState(0)
  const [sourceVideoDuration, setSourceVideoDuration] = useState(0)
  const [isSourcePlaying, setIsSourcePlaying] = useState(false)
  const [isScrubbing, setIsScrubbing] = useState(false)

  const hasSource = source !== 'none'
  const hasRecording = recordingDuration > 0 && !isRecording
  const hasSourceVideo = source === 'file' && videoElement && sourceVideoDuration > 0

  const isRecordingMode = hasRecording
  const isVideoPlaying = isRecordingMode ? isRecordingPlaying : isSourcePlaying
  const videoCurrentTime = isRecordingMode ? recordingTime : sourceVideoTime
  const videoDuration = isRecordingMode ? recordingDuration : sourceVideoDuration
  const hasPlayableContent = hasRecording || hasSourceVideo

  // Audio state
  const [audioCurrentTime, setAudioCurrentTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const [isAudioPlaying, setIsAudioPlaying] = useState(false)
  const [hoveredZone, setHoveredZone] = useState<HoverZone>(null)
  const [isAudioDragging, setIsAudioDragging] = useState(false)

  const waveformContainerRef = useRef<HTMLDivElement>(null)
  const waveformRef = useRef<HTMLCanvasElement>(null)
  const waveformPeaksRef = useRef<Float32Array | null>(null)
  const dragModeRef = useRef<DragMode>(null)
  const dragSnap = useRef({ x: 0, loopStart: 0, loopEnd: 0 })
  const rectRef = useRef<DOMRect | null>(null)
  const audioDurationRef = useRef(audioDuration)
  audioDurationRef.current = audioDuration
  const didDragRef = useRef(false)

  // Derived display values based on mode
  const displayTime = mode === 'audio' ? audioCurrentTime : videoCurrentTime
  const displayDuration = mode === 'audio' ? audioDuration : videoDuration
  const displayPlaying = mode === 'audio' ? isAudioPlaying : isVideoPlaying

  // Video element events
  useEffect(() => {
    if (!videoElement || source !== 'file') return

    const handleTimeUpdate = () => setSourceVideoTime(videoElement.currentTime)
    const handleDurationChange = () => {
      if (videoElement.duration && isFinite(videoElement.duration)) {
        setSourceVideoDuration(videoElement.duration)
      }
    }
    const handlePlay = () => setIsSourcePlaying(true)
    const handlePause = () => setIsSourcePlaying(false)

    videoElement.addEventListener('timeupdate', handleTimeUpdate)
    videoElement.addEventListener('durationchange', handleDurationChange)
    videoElement.addEventListener('loadedmetadata', handleDurationChange)
    videoElement.addEventListener('play', handlePlay)
    videoElement.addEventListener('pause', handlePause)

    if (videoElement.duration && isFinite(videoElement.duration)) {
      setSourceVideoDuration(videoElement.duration)
    }
    setIsSourcePlaying(!videoElement.paused)

    return () => {
      videoElement.removeEventListener('timeupdate', handleTimeUpdate)
      videoElement.removeEventListener('durationchange', handleDurationChange)
      videoElement.removeEventListener('loadedmetadata', handleDurationChange)
      videoElement.removeEventListener('play', handlePlay)
      videoElement.removeEventListener('pause', handlePause)
    }
  }, [videoElement, source])

  // Audio element events
  useEffect(() => {
    if (!audioEl) return

    const handleTimeUpdate = () => setAudioCurrentTime(audioEl.currentTime)
    const handleDurationChange = () => {
      if (audioEl.duration && isFinite(audioEl.duration)) {
        setAudioDuration(audioEl.duration)
      }
    }
    const handlePlay = () => setIsAudioPlaying(true)
    const handlePause = () => setIsAudioPlaying(false)

    audioEl.addEventListener('timeupdate', handleTimeUpdate)
    audioEl.addEventListener('durationchange', handleDurationChange)
    audioEl.addEventListener('loadedmetadata', handleDurationChange)
    audioEl.addEventListener('play', handlePlay)
    audioEl.addEventListener('pause', handlePause)

    if (audioEl.duration && isFinite(audioEl.duration)) {
      setAudioDuration(audioEl.duration)
    }
    setIsAudioPlaying(!audioEl.paused)

    return () => {
      audioEl.removeEventListener('timeupdate', handleTimeUpdate)
      audioEl.removeEventListener('durationchange', handleDurationChange)
      audioEl.removeEventListener('loadedmetadata', handleDurationChange)
      audioEl.removeEventListener('play', handlePlay)
      audioEl.removeEventListener('pause', handlePause)
    }
  }, [audioEl])

  // Audio loop enforcement
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

  // Decode audio file into peak data for static waveform
  useEffect(() => {
    if (!audioFileUrl) {
      waveformPeaksRef.current = null
      drawWaveform()
      return
    }

    let cancelled = false
    const ctx = new AudioContext()

    fetch(audioFileUrl)
      .then((res) => res.arrayBuffer())
      .then((buf) => ctx.decodeAudioData(buf))
      .then((audioBuffer) => {
        if (cancelled) return
        const channel = audioBuffer.getChannelData(0)
        const numPeaks = 512
        const samplesPerPeak = Math.floor(channel.length / numPeaks)
        const peaks = new Float32Array(numPeaks)

        for (let i = 0; i < numPeaks; i++) {
          let max = 0
          const start = i * samplesPerPeak
          const end = Math.min(start + samplesPerPeak, channel.length)
          for (let j = start; j < end; j++) {
            const abs = Math.abs(channel[j])
            if (abs > max) max = abs
          }
          peaks[i] = max
        }

        waveformPeaksRef.current = peaks
        drawWaveform()
      })
      .catch(() => {
        waveformPeaksRef.current = null
      })
      .finally(() => {
        ctx.close()
      })

    return () => { cancelled = true }
  }, [audioFileUrl])

  // Draw static waveform from peaks
  const drawWaveform = useCallback(() => {
    const canvas = waveformRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height
    const centerY = h / 2
    const peaks = waveformPeaksRef.current

    ctx.clearRect(0, 0, w, h)

    // Center line
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)'
    ctx.fillRect(0, centerY - 0.5, w, 1)

    if (!peaks || peaks.length === 0) return

    const barCount = Math.min(w, peaks.length)
    const barW = w / barCount
    const peakStep = peaks.length / barCount

    for (let i = 0; i < barCount; i++) {
      const peakIdx = Math.floor(i * peakStep)
      const mag = peaks[peakIdx]
      const barH = Math.max(0.5, mag * centerY * 0.9)
      const alpha = 0.2 + mag * 0.6

      ctx.fillStyle = `rgba(255, 51, 85, ${alpha})`
      // Top half
      ctx.fillRect(i * barW, centerY - barH, Math.max(0.5, barW - 0.5), barH)
      // Bottom half mirrored
      ctx.fillRect(i * barW, centerY, Math.max(0.5, barW - 0.5), barH)
    }
  }, [])

  // Resize waveform canvas and redraw
  useEffect(() => {
    const canvas = waveformRef.current
    if (!canvas) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        canvas.width = Math.floor(width * window.devicePixelRatio)
        canvas.height = Math.floor(height * window.devicePixelRatio)
        drawWaveform()
      }
    })
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [drawWaveform])

  // Video scrub handlers
  const seekVideoToX = (clientX: number, rect: DOMRect) => {
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
    const seekTime = (x / rect.width) * videoDuration
    if (isRecordingMode) {
      seekRecording(seekTime)
    } else if (videoElement) {
      videoElement.currentTime = seekTime
    }
  }

  const handleVideoPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!hasPlayableContent) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setIsScrubbing(true)
    seekVideoToX(e.clientX, e.currentTarget.getBoundingClientRect())
  }

  const handleVideoPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return
    seekVideoToX(e.clientX, e.currentTarget.getBoundingClientRect())
  }

  const handleVideoPointerUp = () => {
    setIsScrubbing(false)
  }

  // Audio waveform interaction handlers
  const getHitZone = useCallback(
    (clientX: number, rect: DOMRect): HoverZone => {
      if (audioDuration <= 0) return null
      const hasRegion = loopEnd > loopStart
      if (!hasRegion) return null

      const startPx = (loopStart / audioDuration) * rect.width
      const endPx = (loopEnd / audioDuration) * rect.width

      const x = clientX - rect.left
      if (Math.abs(x - startPx) <= HANDLE_HIT_PX) return 'start'
      if (Math.abs(x - endPx) <= HANDLE_HIT_PX) return 'end'
      if (x > startPx + HANDLE_HIT_PX && x < endPx - HANDLE_HIT_PX) return 'body'
      return null
    },
    [audioDuration, loopStart, loopEnd],
  )

  const handleWaveformMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isAudioDragging) return
      const rect = waveformContainerRef.current?.getBoundingClientRect()
      if (!rect) return
      setHoveredZone(getHitZone(e.clientX, rect))
    },
    [isAudioDragging, getHitZone],
  )

  const handleWaveformMouseLeave = useCallback(() => {
    if (!isAudioDragging) setHoveredZone(null)
  }, [isAudioDragging])

  const handleWaveformMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (audioDuration <= 0) return
      e.preventDefault()

      const rect = waveformContainerRef.current?.getBoundingClientRect()
      if (!rect) return
      rectRef.current = rect

      const zone = getHitZone(e.clientX, rect)
      const clickTime = clamp(((e.clientX - rect.left) / rect.width) * audioDuration, 0, audioDuration)
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

      setIsAudioDragging(true)

      const handleMove = (ev: MouseEvent) => {
        const r = rectRef.current
        if (!r) return
        const dur = audioDurationRef.current
        if (dur <= 0) return

        const dx = Math.abs(ev.clientX - dragSnap.current.x)
        if (dx > 3) didDragRef.current = true

        const currentPct = clamp((ev.clientX - r.left) / r.width, 0, 1)
        const currentT = currentPct * dur
        const snap = dragSnap.current
        const deltaPx = ev.clientX - snap.x
        const deltaTime = (deltaPx / r.width) * dur

        const dragMode = dragModeRef.current
        if (dragMode === 'create') {
          if (!didDragRef.current) return
          const a = snap.loopStart
          const b = currentT
          useAudioSourceStore.getState().setAudioLoopStart(Math.min(a, b))
          useAudioSourceStore.getState().setAudioLoopEnd(Math.max(a, b))
        } else if (dragMode === 'start') {
          const newStart = clamp(snap.loopStart + deltaTime, 0, snap.loopEnd - MIN_LOOP_SECONDS)
          useAudioSourceStore.getState().setAudioLoopStart(newStart)
        } else if (dragMode === 'end') {
          const newEnd = clamp(snap.loopEnd + deltaTime, snap.loopStart + MIN_LOOP_SECONDS, dur)
          useAudioSourceStore.getState().setAudioLoopEnd(newEnd)
        } else if (dragMode === 'move') {
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
        setIsAudioDragging(false)

        const dragMode = dragModeRef.current
        dragModeRef.current = null

        if (dragMode === 'create' && !didDragRef.current) {
          const r = rectRef.current
          if (r && audioEl) {
            const seekTime = clamp(dragSnap.current.loopStart, 0, audioDurationRef.current)
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
    [audioEl, audioDuration, loopStart, loopEnd, getHitZone],
  )

  const handleWaveformDoubleClick = useCallback(() => {
    if (loopEnd > loopStart) clearLoop()
  }, [clearLoop, loopStart, loopEnd])

  const handleAudioPlayPause = useCallback(() => {
    if (!audioEl) return
    if (audioEl.paused) {
      audioEl.play().catch(console.error)
    } else {
      audioEl.pause()
    }
  }, [audioEl])

  // Recording timer
  useEffect(() => {
    if (!isRecording) return

    const startTime = performance.now()
    let thumbnailInterval: number

    const updateTime = () => {
      const elapsed = (performance.now() - startTime) / 1000
      setCurrentTime(elapsed)
    }

    const captureInterval = setInterval(updateTime, 100)

    if (videoElement) {
      thumbnailInterval = window.setInterval(() => {
        try {
          if (videoElement.readyState < 2) return
          const canvas = document.createElement('canvas')
          canvas.width = 64
          canvas.height = 64
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(videoElement, 0, 0, 64, 64)
            const dataUrl = canvas.toDataURL('image/jpeg', 0.6)
            const time = (performance.now() - startTime) / 1000
            addThumbnail({ time, dataUrl })
          }
        } catch (err) {
          console.warn('Failed to capture thumbnail:', err)
        }
      }, 2000)
    }

    return () => {
      clearInterval(captureInterval)
      if (thumbnailInterval) clearInterval(thumbnailInterval)
    }
  }, [isRecording, setCurrentTime, addThumbnail, videoElement])

  const videoProgress = videoDuration > 0 ? (videoCurrentTime / videoDuration) * 100 : 0
  const audioProgress = audioDuration > 0 ? (audioCurrentTime / audioDuration) * 100 : 0
  const hasLoopRegion = loopEnd > loopStart
  const loopStartPct = audioDuration > 0 ? (loopStart / audioDuration) * 100 : 0
  const loopEndPct = audioDuration > 0 ? (loopEnd / audioDuration) * 100 : 0

  const waveformCursor = isAudioDragging
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
        backgroundColor: 'var(--bg-surface)',
        borderTop: '1px solid var(--border)',
      }}
    >
      {/* Tab row + controls */}
      <div
        className="flex items-center flex-shrink-0"
        style={{
          height: 24,
          padding: '0 8px',
          gap: 6,
          borderBottom: '1px solid var(--border-light)',
        }}
      >
        {/* Tabs */}
        <button
          onClick={() => setMode('video')}
          className="flex items-center gap-1"
          style={{
            padding: '0 6px',
            height: '100%',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: mode === 'video' ? '1px solid var(--accent)' : '1px solid transparent',
            color: mode === 'video' ? 'var(--text-secondary)' : 'var(--text-ghost)',
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: '0.1em',
            cursor: 'pointer',
          }}
        >
          VID
        </button>
        <button
          onClick={() => setMode('audio')}
          className="flex items-center gap-1"
          style={{
            padding: '0 6px',
            height: '100%',
            backgroundColor: 'transparent',
            border: 'none',
            borderBottom: mode === 'audio' ? `1px solid ${ACCENT}` : '1px solid transparent',
            color: mode === 'audio' ? 'var(--text-secondary)' : 'var(--text-ghost)',
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: '0.1em',
            cursor: 'pointer',
          }}
        >
          AUD
        </button>

        {/* Audio-specific controls */}
        {mode === 'audio' && hasAudioFile && (
          <>
            <div style={{ width: 1, height: 10, backgroundColor: 'var(--border)' }} />
            <button
              onClick={handleAudioPlayPause}
              className="w-4 h-4 rounded-sm flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: 'transparent',
                border: '1px solid var(--border)',
              }}
              title={isAudioPlaying ? 'Pause' : 'Play'}
              onMouseEnter={() => setStatusText('Audio — Play/Pause')}
              onMouseLeave={() => setStatusText(null)}
            >
              {isAudioPlaying ? (
                <PauseIcon size={7} color="var(--text-secondary)" />
              ) : (
                <PlayIcon size={7} color="var(--text-secondary)" />
              )}
            </button>
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
            {audioFileName && (
              <span
                className="text-[8px] truncate"
                style={{ color: 'var(--text-ghost)', maxWidth: 100 }}
                title={audioFileName}
              >
                {audioFileName}
              </span>
            )}
          </>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Transport indicator */}
        <RadarSweep
          value={displayPlaying ? 0.8 : 0.1}
          size={14}
          color={isRecording ? 'var(--accent)' : 'var(--text-ghost)'}
          className="opacity-25 flex-shrink-0"
        />

        {/* Timecode */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <span
            className="text-[10px] tabular-nums"
            style={{
              color: 'var(--text-secondary)',
              letterSpacing: '0.05em',
            }}
          >
            {formatTime(displayTime)}
          </span>
          <span className="text-[10px]" style={{ color: 'var(--text-ghost)' }}>/</span>
          <span
            className="text-[10px] tabular-nums"
            style={{ color: 'var(--text-muted)', letterSpacing: '0.05em' }}
          >
            {formatTime(displayDuration)}
          </span>
        </div>

        {/* Clear */}
        <span
          onMouseEnter={() => setStatusText('Clear — Reset source or clips')}
          onMouseLeave={() => setStatusText(null)}
        >
          <Button
            size="sm"
            onClick={clips.length > 0 ? clearAllClips : reset}
            disabled={!hasSource && clips.length === 0}
            title={clips.length > 0 ? 'Clear all clips' : 'Clear source'}
          >
            Clear
          </Button>
        </span>
      </div>

      {/* Timeline area */}
      <div style={{ height: 32, position: 'relative' }}>
        {/* Video timeline */}
        {mode === 'video' && (
          <div
            className="absolute inset-0 flex items-center"
            style={{ padding: '0 8px' }}
          >
            <div
              className="flex-1 relative"
              style={{
                height: 12,
                cursor: hasPlayableContent ? 'pointer' : 'default',
                opacity: hasPlayableContent ? 1 : 0.5,
                touchAction: 'none',
              }}
              onPointerDown={handleVideoPointerDown}
              onPointerMove={handleVideoPointerMove}
              onPointerUp={handleVideoPointerUp}
              onPointerCancel={handleVideoPointerUp}
              onMouseEnter={() => setStatusText('Timeline — Click or drag to scrub')}
              onMouseLeave={() => setStatusText(null)}
            >
              {/* Track */}
              <div
                className="absolute rounded-sm overflow-hidden"
                style={{
                  top: 4,
                  left: 0,
                  right: 0,
                  height: 4,
                  backgroundColor: 'var(--bg-elevated)',
                }}
              >
                <div
                  className="absolute inset-y-0 left-0 rounded-sm"
                  style={{
                    width: `${videoProgress}%`,
                    backgroundColor: 'var(--accent)',
                    boxShadow: '0 0 4px var(--accent-glow)',
                  }}
                />
              </div>
              {/* Playhead */}
              {hasPlayableContent && (
                <div
                  className="absolute"
                  style={{
                    left: `${videoProgress}%`,
                    top: 0,
                    width: 2,
                    height: 12,
                    backgroundColor: 'var(--accent)',
                    transform: 'translateX(-1px)',
                    boxShadow: isScrubbing ? '0 0 6px var(--accent-glow)' : 'none',
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* Audio waveform timeline */}
        {mode === 'audio' && (
          <div
            ref={waveformContainerRef}
            className="absolute inset-0"
            style={{
              backgroundColor: 'rgba(0,0,0,0.25)',
              cursor: hasAudioFile ? waveformCursor : 'default',
              opacity: hasAudioFile ? 1 : 0.5,
            }}
            onMouseDown={hasAudioFile ? handleWaveformMouseDown : undefined}
            onMouseMove={hasAudioFile ? handleWaveformMouseMove : undefined}
            onMouseLeave={hasAudioFile ? handleWaveformMouseLeave : undefined}
            onDoubleClick={hasAudioFile ? handleWaveformDoubleClick : undefined}
            onMouseEnter={() => setStatusText(
              !hasAudioFile
                ? 'Audio — Load an audio file to see waveform'
                : hasLoopRegion
                  ? 'Click to seek — Drag edges to resize loop — Double-click to clear'
                  : 'Click to seek — Drag to create loop'
            )}
            onMouseLeaveCapture={() => setStatusText(null)}
          >
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
                <div
                  className="absolute left-0 inset-y-0"
                  style={{
                    width: 3,
                    backgroundColor: hoveredZone === 'start' || (isAudioDragging && dragModeRef.current === 'start') ? ACCENT : 'transparent',
                    opacity: 0.9,
                  }}
                />
                <div
                  className="absolute right-0 inset-y-0"
                  style={{
                    width: 3,
                    backgroundColor: hoveredZone === 'end' || (isAudioDragging && dragModeRef.current === 'end') ? ACCENT : 'transparent',
                    opacity: 0.9,
                  }}
                />
              </div>
            )}

            {/* Playhead */}
            <div
              style={{
                position: 'absolute',
                left: `${audioProgress}%`,
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
        )}
      </div>
    </div>
  )
}
