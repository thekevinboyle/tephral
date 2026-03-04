import { useEffect, useState, useRef, useCallback } from 'react'
import { useMediaStore } from '../../stores/mediaStore'
import { useAudioSourceStore, type AudioSourceType } from '../../stores/audioSourceStore'
import { useUIStore } from '../../stores/uiStore'
import { getUIStatusText, getAudioSourceStatusText } from '../../config/statusDescriptions'
import { SourceSelector } from '../ui/SourceSelector'
import { HudGlyph } from '../ui/HudGlyph'
import { CornerFrame } from '../ui/CornerFrame'

const AUDIO_SOURCES: { id: AudioSourceType; label: string }[] = [
  { id: 'video', label: 'VID' },
  { id: 'file', label: 'FILE' },
  { id: 'mic', label: 'MIC' },
  { id: 'system', label: 'SYS' },
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
  const sourceLabel = source === 'none' ? 'NONE' : source === 'webcam' ? 'CAMERA' : 'FILE'

  return (
    <div
      className="flex items-center flex-shrink-0"
      style={{
        height: 'var(--row-header)',
        padding: '0 var(--panel-padding)',
        gap: 'var(--gap-lg)',
        background: '#000000',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <HudGlyph glyph="crosshair" size={14} color="var(--text-ghost)" animate="spin" />
        <span
          className="text-[11px] font-bold uppercase"
          style={{
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-secondary)',
            letterSpacing: '0.16em',
          }}
        >
          SEG_F4ULT
        </span>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 16, backgroundColor: 'var(--border)' }} />

      {/* Video source selector */}
      <CornerFrame label="VIDEO" color="var(--text-ghost)" style={{ padding: '2px 8px', marginLeft: 40 }}>
        <SourceSelector variant="compact" />
      </CornerFrame>

      {/* Divider */}
      <div style={{ width: 1, height: 16, backgroundColor: 'var(--border)' }} />

      {/* Audio source selector */}
      <CornerFrame label="AUDIO" color="var(--text-ghost)" style={{ padding: '2px 8px', marginLeft: 36 }}>
        <div className="flex items-center gap-1">
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
                className="h-6 text-[10px] font-bold transition-colors active:scale-95"
                style={{
                  width: 42,
                  backgroundColor: isActive ? '#FFFFFF' : 'transparent',
                  border: `1px solid ${isActive ? '#FFFFFF' : 'var(--border)'}`,
                  color: isActive ? '#000000' : 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.06em',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.borderColor = 'var(--text-muted)'
                  setStatusText(getAudioSourceStatusText(src.id))
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.borderColor = 'var(--border)'
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
      </CornerFrame>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Status badges */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <span
          className="text-[9px] font-medium uppercase"
          style={{
            color: hasSource ? 'var(--text-secondary)' : 'var(--text-ghost)',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.12em',
          }}
        >
          SRC: {sourceLabel}
        </span>

        <HudGlyph glyph="diamond" size={10} color="var(--text-ghost)" animate="pulse" />

        <span
          className="text-[10px] tabular-nums font-medium"
          style={{
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)',
            cursor: 'default',
            padding: '1px 6px',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--bg-primary)',
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
