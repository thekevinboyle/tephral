import { useRef, useState, useCallback, useEffect } from 'react'
import { useMediaSource } from '../../hooks/useMediaSource'
import { useAudioSourceStore, type AudioSourceType } from '../../stores/audioSourceStore'
import { useUIStore } from '../../stores/uiStore'
import { HudGlyph } from '../ui/HudGlyph'

const AUDIO_SOURCES: { id: AudioSourceType; label: string }[] = [
  { id: 'video', label: 'Video' },
  { id: 'file', label: 'File' },
  { id: 'mic', label: 'Mic' },
  { id: 'system', label: 'System' },
]

const VIDEO_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'cam', label: 'Camera' },
  { id: 'file', label: 'File' },
]

/* ── Styled Dropdown ─────────────────────────────── */

function StyledDropdown({
  value,
  options,
  onChange,
  disabled,
}: {
  value: string
  options: { id: string; label: string }[]
  onChange: (id: string) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.id === value)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => !disabled && setOpen(!open)}
        style={{
          height: 28,
          minWidth: 80,
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.06em',
          padding: '0 24px 0 10px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          textAlign: 'left',
          position: 'relative',
        }}
      >
        {selected?.label ?? '—'}
        <span
          style={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-ghost)',
            fontSize: 8,
            lineHeight: 1,
          }}
        >
          ▼
        </span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 2,
            minWidth: '100%',
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.8)',
            zIndex: 100,
          }}
        >
          {options.map((opt) => {
            const isActive = opt.id === value
            return (
              <button
                key={opt.id}
                onClick={() => {
                  onChange(opt.id)
                  setOpen(false)
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '6px 10px',
                  backgroundColor: isActive ? 'var(--bg-hover)' : 'transparent',
                  border: 'none',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  fontWeight: isActive ? 700 : 500,
                  letterSpacing: '0.06em',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Header Bar ──────────────────────────────────── */

export function HeaderBar() {
  const setStatusText = useUIStore((s) => s.setStatusText)

  // Video source
  const { source, isRecording, toggleWebcam, openFilePicker, switchCheck } = useMediaSource()
  const videoValue = source === 'webcam' ? 'cam' : source === 'file' ? 'file' : 'none'

  const handleVideoSelect = useCallback(
    (id: string) => {
      const check = switchCheck()
      if (!check.allowed) {
        console.warn(check.reason)
        return
      }
      if (id === 'cam') toggleWebcam()
      else if (id === 'file') openFilePicker()
    },
    [switchCheck, toggleWebcam, openFilePicker],
  )

  // Audio source
  const activeAudioSource = useAudioSourceStore((s) => s.activeSource)
  const setActiveAudioSource = useAudioSourceStore((s) => s.setActiveSource)
  const setAudioFile = useAudioSourceStore((s) => s.setAudioFile)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAudioSelect = useCallback(
    (id: string) => {
      const val = id as AudioSourceType
      if (val === 'file') {
        fileInputRef.current?.click()
      }
      setActiveAudioSource(val)
    },
    [setActiveAudioSource],
  )

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

  return (
    <div
      className="flex items-center flex-shrink-0"
      style={{
        height: 'var(--row-header)',
        padding: '0 var(--panel-padding)',
        gap: 'var(--gap-lg)',
        background: 'var(--bg-void)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <HudGlyph glyph="crosshair" size={14} color="var(--text-ghost)" animate="spin" />
        <span
          className="text-[13px] font-bold uppercase"
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

      {/* Video source dropdown */}
      <div
        className="flex items-center gap-2 flex-shrink-0"
        onMouseEnter={() => setStatusText('Video — Select video input source')}
        onMouseLeave={() => setStatusText(null)}
      >
        <span
          className="text-[9px] uppercase tracking-widest"
          style={{ color: 'var(--text-ghost)', fontFamily: 'var(--font-mono)' }}
        >
          VIDEO
        </span>
        <StyledDropdown
          value={videoValue}
          options={VIDEO_OPTIONS}
          onChange={handleVideoSelect}
          disabled={isRecording}
        />
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 16, backgroundColor: 'var(--border)' }} />

      {/* Audio source dropdown */}
      <div
        className="flex items-center gap-2 flex-shrink-0"
        onMouseEnter={() => setStatusText('Audio — Select audio input source')}
        onMouseLeave={() => setStatusText(null)}
      >
        <span
          className="text-[9px] uppercase tracking-widest"
          style={{ color: 'var(--text-ghost)', fontFamily: 'var(--font-mono)' }}
        >
          AUDIO
        </span>
        <StyledDropdown
          value={activeAudioSource}
          options={AUDIO_SOURCES}
          onChange={handleAudioSelect}
        />
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

      <HudGlyph glyph="diamond" size={10} color="var(--text-ghost)" animate="pulse" />
    </div>
  )
}
