import { useEffect, useState, useRef, useCallback } from 'react'
import { useMediaStore } from '../../stores/mediaStore'
import { useAudioSourceStore, type AudioSourceType } from '../../stores/audioSourceStore'
import { useUIStore } from '../../stores/uiStore'
import { getUIStatusText, getAudioSourceStatusText } from '../../config/statusDescriptions'
import { SourceSelector } from '../ui/SourceSelector'

const AUDIO_SOURCES: { id: AudioSourceType; label: string }[] = [
  { id: 'video', label: 'Vid' },
  { id: 'file', label: 'File' },
  { id: 'mic', label: 'Mic' },
  { id: 'system', label: 'Sys' },
]

export function HeaderBar() {
  const { source } = useMediaStore()
  const setStatusText = useUIStore((s) => s.setStatusText)

  // Audio source state
  const activeAudioSource = useAudioSourceStore((s) => s.activeSource)
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

  const hasSource = source !== 'none'
  const sourceLabel = source === 'none' ? 'NO SRC' : source === 'webcam' ? 'CAM' : 'FILE'

  return (
    <div
      className="flex items-center flex-shrink-0"
      style={{
        height: 'var(--row-header)',
        padding: '0 var(--panel-padding)',
        gap: 'var(--gap-lg)',
        background: 'linear-gradient(to right, var(--bg-elevated), var(--bg-surface), var(--bg-elevated))',
        borderBottom: '1px solid var(--border)',
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
          VIDEO
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
      </div>

      {/* Spacer */}
      <div className="flex-1" />

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
            color: 'var(--text-secondary)',
            cursor: 'default',
            padding: '1px 6px',
            borderRadius: 3,
            backgroundColor: 'rgba(0,0,0,0.15)',
            border: '1px solid var(--border)',
          }}
          onMouseEnter={() => setStatusText(getUIStatusText('fps'))}
          onMouseLeave={() => setStatusText(null)}
        >
          {fps} FPS
        </span>
      </div>
    </div>
  )
}
