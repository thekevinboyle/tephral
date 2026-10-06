import { memo, useRef, useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMediaSource } from '../../hooks/useMediaSource'
import { useAudioSourceStore, type AudioSourceType } from '../../stores/audioSourceStore'
import { useUIStore } from '../../stores/uiStore'
import { HudGlyph } from '../ui/HudGlyph'
import { PresetDropdownBar } from '../presets/PresetDropdownBar'
import { useRecordingControl } from '../../hooks/useRecordingControl'
import { useRecordingStore } from '../../stores/recordingStore'

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
  menuId,
}: {
  value: string
  options: { id: string; label: string }[]
  onChange: (id: string) => void
  disabled?: boolean
  menuId: string
}) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; minWidth: number } | null>(null)

  const selected = options.find((o) => o.id === value)

  // The header (and every grid area) clips overflow, so the menu lives in a portal with
  // position:fixed, placed from the trigger rect (same pattern as PresetDropdownBar).
  const place = useCallback(() => {
    const r = triggerRef.current?.getBoundingClientRect()
    if (r) setPos({ top: r.bottom + 2, left: r.left, minWidth: r.width })
  }, [])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, place])

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={triggerRef}
        data-source-trigger={menuId}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (disabled) return
          if (!open) place()
          setOpen(!open)
        }}
        style={{
          height: 28,
          minWidth: 80,
          backgroundColor: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 2,
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
        {selected?.label ?? '-'}
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

      {open && pos && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          data-source-menu={menuId}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            minWidth: pos.minWidth,
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 2,
            zIndex: 100,
          }}
        >
          {options.map((opt) => {
            const isActive = opt.id === value
            return (
              <button
                key={opt.id}
                role="option"
                aria-selected={isActive}
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
        </div>,
        document.body,
      )}
    </div>
  )
}

/* ── REC ─────────────────────────────────────────── */

const fmtElapsed = (ms: number) => {
  const sec = Math.max(0, Math.floor(ms / 1000))
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`
}

/** Header record toggle. The elapsed time is written straight to the DOM so the header never re-renders per tick. */
const RecButton = memo(function RecButton() {
  const { isRecording, canRecord, toggle } = useRecordingControl()
  const setStatusText = useUIStore((s) => s.setStatusText)
  const elapsedRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!isRecording) return
    const tick = () => {
      const start = useRecordingStore.getState().startTime
      if (elapsedRef.current && start != null) elapsedRef.current.textContent = fmtElapsed(performance.now() - start)
    }
    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [isRecording])

  const disabled = !canRecord && !isRecording
  return (
    <button
      data-rec
      onClick={toggle}
      disabled={disabled}
      aria-pressed={isRecording}
      title={disabled ? 'Choose a video source to record' : isRecording ? 'Stop recording' : 'Start recording'}
      className="hud-label flex items-center flex-shrink-0"
      style={{
        height: 28,
        gap: 8,
        padding: '0 10px',
        borderRadius: 2,
        border: '1px solid var(--rec)',
        background: 'transparent',
        color: 'var(--rec)',
        fontWeight: 600,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={() => setStatusText(isRecording ? 'Stop recording and add the clip to the bin' : 'Record the output and its effect automation')}
      onMouseLeave={() => setStatusText(null)}
    >
      {isRecording ? (
        <>
          <span>■ STOP</span>
          <span ref={elapsedRef} className="tabular-nums">00:00</span>
        </>
      ) : (
        <span>● REC</span>
      )}
    </button>
  )
})

/* ── Header Bar ──────────────────────────────────── */

export const HeaderBar = memo(function HeaderBar({ canvasRef }: { canvasRef?: React.RefObject<HTMLCanvasElement | null> }) {
  const setStatusText = useUIStore((s) => s.setStatusText)

  // Video source
  const { source, isRecording, toggleWebcam, openFilePicker, deactivateSource, switchCheck } = useMediaSource()
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
      else if (id === 'none') deactivateSource()
    },
    [switchCheck, toggleWebcam, openFilePicker, deactivateSource],
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
      className="flex items-center flex-shrink-0 min-w-0"
      style={{
        height: 'var(--row-header)',
        overflow: 'hidden',
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
      <div className="seg-hide-narrow flex-shrink-0" style={{ width: 1, height: 16, backgroundColor: 'var(--border)' }} />

      {/* Video source dropdown */}
      <div
        className="flex items-center gap-2 flex-shrink-0"
        onMouseEnter={() => setStatusText('Video: Select video input source')}
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
          menuId="video"
          disabled={isRecording}
        />
      </div>

      {/* Divider */}
      <div className="seg-hide-narrow flex-shrink-0" style={{ width: 1, height: 16, backgroundColor: 'var(--border)' }} />

      {/* Audio source dropdown */}
      <div
        className="flex items-center gap-2 flex-shrink-0"
        onMouseEnter={() => setStatusText('Audio: Select audio input source')}
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
          menuId="audio"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileImport}
          className="hidden"
        />
      </div>

      {/* Presets */}
      <div className="flex-shrink-0">
        <PresetDropdownBar canvasRef={canvasRef} />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      <RecButton />

      <span className="seg-hide-narrow flex-shrink-0 flex items-center">
        <HudGlyph glyph="diamond" size={10} color="var(--text-ghost)" animate="pulse" />
      </span>
    </div>
  )
})
