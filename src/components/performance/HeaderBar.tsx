import { useEffect, useState, useRef, useCallback } from 'react'
import { useMediaStore } from '../../stores/mediaStore'
import { useAudioSourceStore, type AudioSourceType } from '../../stores/audioSourceStore'
import { useUIStore } from '../../stores/uiStore'
import { getUIStatusText, getAudioSourceStatusText } from '../../config/statusDescriptions'
import { SourceSelector } from '../ui/SourceSelector'
import { AudioFileTransport } from './AudioFileTransport'

const AUDIO_SOURCES: { id: AudioSourceType; label: string }[] = [
  { id: 'video', label: 'Vid' },
  { id: 'file', label: 'File' },
  { id: 'mic', label: 'Mic' },
]

export function HeaderBar() {
  const { source } = useMediaStore()
  const setStatusText = useUIStore((s) => s.setStatusText)

  // Audio source state
  const activeAudioSource = useAudioSourceStore((s) => s.activeSource)
  const audioFileName = useAudioSourceStore((s) => s.audioFileName)
  const setActiveAudioSource = useAudioSourceStore((s) => s.setActiveSource)
  const setAudioFile = useAudioSourceStore((s) => s.setAudioFile)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        const url = URL.createObjectURL(file)
        setAudioFile(url, file.name)
        setActiveAudioSource('file')
      }
      e.target.value = ''
    },
    [setAudioFile, setActiveAudioSource],
  )

  // FPS counter
  const [fps, setFps] = useState(0)
  const fpsRef = useRef({ frames: 0, lastTime: performance.now() })

  useEffect(() => {
    let rafId: number
    const tick = () => {
      fpsRef.current.frames++
      const now = performance.now()
      if (now - fpsRef.current.lastTime >= 1000) {
        setFps(fpsRef.current.frames)
        fpsRef.current.frames = 0
        fpsRef.current.lastTime = now
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  // Waveform canvas
  const waveformRef = useRef<HTMLCanvasElement>(null)
  const waveRafRef = useRef<number | null>(null)

  useEffect(() => {
    const canvas = waveformRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    function draw() {
      const state = useAudioSourceStore.getState()
      const data = state.waveformData
      const amp = state.amplitude
      const w = canvas!.width
      const h = canvas!.height

      ctx!.clearRect(0, 0, w, h)

      // Draw as mirrored bars — compact frequency-bar style
      const barCount = Math.min(32, data.length)
      const step = Math.floor(data.length / barCount)
      const barW = w / barCount
      const centerY = h / 2

      for (let i = 0; i < barCount; i++) {
        const v = data[i * step] / 255
        const barH = Math.max(1, (v - 0.5) * 2 * centerY * 0.9)

        // Color: fade from dim to bright based on amplitude
        const alpha = 0.3 + amp * 0.7
        ctx!.fillStyle = `rgba(255, 51, 51, ${alpha})`

        // Mirrored from center
        ctx!.fillRect(
          i * barW + 0.5,
          centerY - barH,
          Math.max(1, barW - 1),
          barH * 2,
        )
      }

      waveRafRef.current = requestAnimationFrame(draw)
    }

    waveRafRef.current = requestAnimationFrame(draw)
    return () => {
      if (waveRafRef.current !== null) cancelAnimationFrame(waveRafRef.current)
    }
  }, [])

  // Resize waveform canvas
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

  const audioFileElement = useAudioSourceStore((s) => s.audioFileElement)
  const showAudioTransport = activeAudioSource === 'file' && audioFileElement

  const hasSource = source !== 'none'
  const sourceLabel = source === 'none' ? 'NO SRC' : source === 'webcam' ? 'CAM' : 'FILE'

  return (
    <div className="flex flex-col flex-shrink-0">
    <div
      className="flex items-center"
      style={{
        height: 'var(--row-header)',
        padding: '0 var(--panel-padding)',
        gap: 'var(--gap-lg)',
        background: 'linear-gradient(to right, var(--bg-elevated), var(--bg-surface), var(--bg-elevated))',
        borderBottom: showAudioTransport ? 'none' : '1px solid var(--border)',
        boxShadow: 'inset 0 1px 0 var(--surface-highlight)',
      }}
    >
      {/* Brand */}
      <span
        className="text-[12px] font-bold uppercase tracking-widest flex-shrink-0"
        style={{
          fontFamily: 'var(--font-sans)',
          color: 'var(--text-muted)',
          letterSpacing: '0.12em',
        }}
      >
        SEG_F4ULT
      </span>

      {/* Divider */}
      <div className="flex-shrink-0" style={{ display: 'flex', flexDirection: 'column', height: 16 }}>
        <div style={{ width: 1, flex: 1, backgroundColor: 'var(--border)' }} />
        <div style={{ width: 1, flex: 1, backgroundColor: 'var(--surface-highlight)' }} />
      </div>

      {/* Video source selector */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[9px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-ghost)' }}>
          SRC
        </span>
        <SourceSelector variant="compact" />
      </div>

      {/* Divider */}
      <div className="flex-shrink-0" style={{ display: 'flex', flexDirection: 'column', height: 16 }}>
        <div style={{ width: 1, flex: 1, backgroundColor: 'var(--border)' }} />
        <div style={{ width: 1, flex: 1, backgroundColor: 'var(--surface-highlight)' }} />
      </div>

      {/* Audio source selector */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[9px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-ghost)' }}>
          AUDIO
        </span>
        {AUDIO_SOURCES.map((src) => {
          const isActive = activeAudioSource === src.id
          return (
            <button
              key={src.id}
              onClick={() => {
                if (src.id === 'file' && !isActive) {
                  fileInputRef.current?.click()
                }
                setActiveAudioSource(src.id)
              }}
              className="h-6 rounded-sm text-[10px] font-medium transition-colors active:scale-95"
              style={{
                width: 48,
                backgroundColor: isActive ? 'var(--text-primary)' : 'var(--bg-surface)',
                border: '1px solid var(--border)',
                color: isActive ? 'var(--bg-surface)' : 'var(--text-muted)',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'
                setStatusText(getAudioSourceStatusText(src.id))
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-surface)'
                setStatusText(null)
              }}
            >
              {src.label}
            </button>
          )
        })}
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileImport}
          className="hidden"
        />
        {activeAudioSource === 'file' && audioFileName && (
          <span
            className="text-[8px] truncate"
            style={{ color: 'var(--text-ghost)', maxWidth: 80 }}
          >
            {audioFileName}
          </span>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Waveform */}
      <canvas
        ref={waveformRef}
        className="flex-shrink-0"
        style={{
          width: 120,
          height: 24,
          borderRadius: 2,
          backgroundColor: 'rgba(0,0,0,0.3)',
        }}
      />

      {/* Status badges */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <span
          className="text-[9px] font-medium uppercase tracking-widest"
          style={{ color: hasSource ? 'var(--accent-dim)' : 'var(--text-ghost)' }}
        >
          {sourceLabel}
        </span>
        <span
          className="text-[10px] tabular-nums"
          style={{
            color: 'var(--text-ghost)',
            cursor: 'default',
            padding: '1px 6px',
            borderRadius: 3,
            backgroundColor: 'rgba(0,0,0,0.3)',
            boxShadow: 'var(--shadow-inset)',
          }}
          onMouseEnter={() => setStatusText(getUIStatusText('fps'))}
          onMouseLeave={() => setStatusText(null)}
        >
          {fps} FPS
        </span>
      </div>
    </div>
    {showAudioTransport && <AudioFileTransport />}
    </div>
  )
}
