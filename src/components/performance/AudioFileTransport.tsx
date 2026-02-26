import { useEffect, useState, useCallback, useRef } from 'react'
import { PlayIcon, PauseIcon, LoopIcon } from '../ui/DotMatrixIcons'
import { useAudioSourceStore } from '../../stores/audioSourceStore'
import { useUIStore } from '../../stores/uiStore'

const ACCENT = '#FFCC00'
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
  const setLoopStart = useAudioSourceStore((s) => s.setAudioLoopStart)
  const setLoopEnd = useAudioSourceStore((s) => s.setAudioLoopEnd)
  const clearLoop = useAudioSourceStore((s) => s.clearAudioLoop)
  const setStatusText = useUIStore((s) => s.setStatusText)

  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [hoveredZone, setHoveredZone] = useState<HoverZone>(null)
  const [isDragging, setIsDragging] = useState(false)

  const loopLaneRef = useRef<HTMLDivElement>(null)
  const dragModeRef = useRef<DragMode>(null)
  const dragSnap = useRef({ x: 0, loopStart: 0, loopEnd: 0 })
  const rectRef = useRef<DOMRect | null>(null)
  // Keep latest duration in a ref so drag handlers always see current value
  const durationRef = useRef(duration)
  durationRef.current = duration

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

  const handlePlayPause = useCallback(() => {
    if (!audioEl) return
    if (audioEl.paused) {
      audioEl.play().catch(console.error)
    } else {
      audioEl.pause()
    }
  }, [audioEl])

  const handleSeekClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!audioEl || duration <= 0) return
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      audioEl.currentTime = (x / rect.width) * duration
    },
    [audioEl, duration],
  )

  // Determine what zone a mouse position is over in the loop lane
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

  const handleLoopLaneMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) return
      const rect = loopLaneRef.current?.getBoundingClientRect()
      if (!rect) return
      setHoveredZone(getHitZone(e.clientX, rect))
    },
    [isDragging, getHitZone],
  )

  const handleLoopLaneMouseLeave = useCallback(() => {
    if (!isDragging) setHoveredZone(null)
  }, [isDragging])

  const handleLoopLaneMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (duration <= 0) return
      e.preventDefault()

      const rect = loopLaneRef.current?.getBoundingClientRect()
      if (!rect) return
      rectRef.current = rect

      const zone = getHitZone(e.clientX, rect)
      const clickTime = clamp(((e.clientX - rect.left) / rect.width) * duration, 0, duration)

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
        setLoopStart(clickTime)
        setLoopEnd(clickTime)
      }

      setIsDragging(true)

      const handleMove = (ev: MouseEvent) => {
        const r = rectRef.current
        if (!r) return
        const dur = durationRef.current
        if (dur <= 0) return

        const currentPct = clamp((ev.clientX - r.left) / r.width, 0, 1)
        const currentT = currentPct * dur
        const snap = dragSnap.current
        const deltaPx = ev.clientX - snap.x
        const deltaTime = (deltaPx / r.width) * dur

        const mode = dragModeRef.current
        if (mode === 'create') {
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
        dragModeRef.current = null

        const store = useAudioSourceStore.getState()
        if (store.audioLoopEnd - store.audioLoopStart < MIN_LOOP_SECONDS) {
          store.clearAudioLoop()
        } else {
          store.setAudioLoopEnabled(true)
        }
      }

      window.addEventListener('mousemove', handleMove)
      window.addEventListener('mouseup', handleUp)
    },
    [duration, loopStart, loopEnd, getHitZone, setLoopStart, setLoopEnd],
  )

  const handleLoopDoubleClick = useCallback(() => {
    clearLoop()
  }, [clearLoop])

  if (!audioEl) return null

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const hasLoopRegion = loopEnd > loopStart
  const loopStartPct = duration > 0 ? (loopStart / duration) * 100 : 0
  const loopEndPct = duration > 0 ? (loopEnd / duration) * 100 : 0

  const loopLaneCursor = isDragging
    ? dragModeRef.current === 'move' ? 'grabbing' : 'ew-resize'
    : hoveredZone === 'start' || hoveredZone === 'end'
      ? 'ew-resize'
      : hoveredZone === 'body'
        ? 'grab'
        : 'crosshair'

  return (
    <div
      className="flex items-center flex-shrink-0"
      style={{
        height: 28,
        padding: '0 8px',
        gap: 6,
        backgroundColor: 'var(--bg-surface)',
        borderTop: '1px solid var(--border)',
      }}
    >
      {/* Play/Pause */}
      <button
        onClick={handlePlayPause}
        className="w-5 h-5 rounded-sm flex items-center justify-center flex-shrink-0"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
        }}
        title={isPlaying ? 'Pause' : 'Play'}
        onMouseEnter={() => setStatusText('Audio \u2014 Play/Pause')}
        onMouseLeave={() => setStatusText(null)}
      >
        {isPlaying ? (
          <PauseIcon size={8} color="var(--text-secondary)" />
        ) : (
          <PlayIcon size={8} color="var(--text-secondary)" />
        )}
      </button>

      {/* Loop toggle */}
      <button
        onClick={() => hasLoopRegion && setLoopEnabled(!loopEnabled)}
        className="w-5 h-5 rounded-sm flex items-center justify-center flex-shrink-0"
        style={{
          backgroundColor: loopEnabled ? `${ACCENT}20` : 'transparent',
          border: `1px solid ${loopEnabled ? `${ACCENT}40` : 'var(--border)'}`,
          opacity: hasLoopRegion ? 1 : 0.4,
        }}
        title={loopEnabled ? 'Disable section loop' : 'Enable section loop'}
        onMouseEnter={() => setStatusText('Toggle section loop')}
        onMouseLeave={() => setStatusText(null)}
      >
        <LoopIcon size={8} color={loopEnabled ? ACCENT : 'var(--text-ghost)'} />
      </button>

      {/* Timeline: loop lane + progress bar */}
      <div className="flex-1 flex flex-col" style={{ gap: 1, minWidth: 40 }}>
        {/* Loop bar lane */}
        <div
          ref={loopLaneRef}
          className="relative rounded-sm"
          style={{
            height: 10,
            backgroundColor: 'var(--bg-elevated)',
            cursor: loopLaneCursor,
          }}
          onMouseDown={handleLoopLaneMouseDown}
          onMouseMove={handleLoopLaneMouseMove}
          onMouseLeave={handleLoopLaneMouseLeave}
          onDoubleClick={hasLoopRegion ? handleLoopDoubleClick : undefined}
          onMouseEnter={() => setStatusText(
            hasLoopRegion ? 'Drag to move loop \u2014 Drag edges to resize \u2014 Double-click to clear' : 'Click and drag to create a loop region'
          )}
        >
          {hasLoopRegion && (
            <div
              className="absolute inset-y-0"
              style={{
                left: `${loopStartPct}%`,
                width: `${loopEndPct - loopStartPct}%`,
                backgroundColor: loopEnabled ? `${ACCENT}25` : `${ACCENT}12`,
                border: `1px solid ${loopEnabled ? `${ACCENT}60` : `${ACCENT}30`}`,
                borderRadius: 2,
              }}
            >
              {/* Left handle */}
              <div
                className="absolute left-0 inset-y-0"
                style={{
                  width: 4,
                  backgroundColor: hoveredZone === 'start' || (isDragging && dragModeRef.current === 'start') ? ACCENT : 'transparent',
                  borderRadius: '2px 0 0 2px',
                  opacity: 0.8,
                }}
              />
              {/* Right handle */}
              <div
                className="absolute right-0 inset-y-0"
                style={{
                  width: 4,
                  backgroundColor: hoveredZone === 'end' || (isDragging && dragModeRef.current === 'end') ? ACCENT : 'transparent',
                  borderRadius: '0 2px 2px 0',
                  opacity: 0.8,
                }}
              />
            </div>
          )}
        </div>

        {/* Progress/seek bar */}
        <div
          className="relative rounded-sm overflow-hidden"
          style={{
            height: 4,
            backgroundColor: 'var(--bg-elevated)',
            cursor: 'pointer',
          }}
          onClick={handleSeekClick}
          onMouseEnter={() => setStatusText('Click to seek')}
          onMouseLeave={() => setStatusText(null)}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-sm"
            style={{
              width: `${progress}%`,
              backgroundColor: ACCENT,
              opacity: 0.7,
            }}
          />
        </div>
      </div>

      {/* Timecode */}
      <span
        className="text-[9px] tabular-nums flex-shrink-0"
        style={{ color: 'var(--text-secondary)', letterSpacing: '0.03em' }}
      >
        {formatTime(currentTime)}
        <span style={{ color: 'var(--text-ghost)' }}> / {formatTime(duration)}</span>
      </span>

      {/* File name */}
      {audioFileName && (
        <span
          className="text-[8px] truncate flex-shrink"
          style={{ color: 'var(--text-ghost)', maxWidth: 80 }}
          title={audioFileName}
        >
          {audioFileName}
        </span>
      )}
    </div>
  )
}
