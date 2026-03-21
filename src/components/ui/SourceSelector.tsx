import { useCallback } from 'react'
import { useMediaSource } from '../../hooks/useMediaSource'
import { useSlicerStore } from '../../stores/slicerStore'
import { useUIStore } from '../../stores/uiStore'
import { getUIStatusText } from '../../config/statusDescriptions'

interface SourceSelectorProps {
  variant?: 'compact' | 'full'
}

export function SourceSelector({ variant = 'compact' }: SourceSelectorProps) {
  const {
    source,
    isRecording,
    isWebcamActive,
    toggleWebcam,
    openFilePicker,
    switchCheck,
  } = useMediaSource()

  const slicerEnabled = useSlicerStore((s) => s.enabled)
  const setStatusText = useUIStore((s) => s.setStatusText)

  const handleWebcamClick = useCallback(() => {
    const check = switchCheck()
    if (!check.allowed) {
      console.warn(check.reason)
      return
    }
    toggleWebcam()
  }, [switchCheck, toggleWebcam])

  const handleFileClick = useCallback(() => {
    const check = switchCheck()
    if (!check.allowed) {
      console.warn(check.reason)
      return
    }
    openFilePicker()
  }, [switchCheck, openFilePicker])

  const buttonBase = variant === 'compact'
    ? 'h-6 rounded-sm text-[10px] font-medium transition-colors active:scale-95'
    : 'h-7 rounded-sm text-[11px] font-medium transition-colors active:scale-95'

  const buttonWidth = variant === 'compact' ? '48px' : '64px'

  const getButtonStyle = (isActive: boolean, isDisabled: boolean) => ({
    width: buttonWidth,
    backgroundColor: isActive ? 'var(--text-primary)' : 'var(--bg-surface)',
    border: '1px solid var(--border)',
    color: isActive ? 'var(--bg-surface)' : 'var(--text-muted)',
    opacity: isDisabled ? 0.5 : 1,
    cursor: isDisabled ? 'not-allowed' : 'pointer',
  })

  const isFileActive = source === 'file'

  return (
    <div className="flex items-center gap-2">
      {variant === 'full' && (
        <span
          className="text-[11px] font-medium uppercase tracking-wide mr-1"
          style={{ color: 'var(--text-muted)' }}
        >
          Source:
        </span>
      )}

      {/* Webcam button */}
      <button
        onClick={handleWebcamClick}
        disabled={isRecording}
        className={buttonBase}
        style={getButtonStyle(isWebcamActive, isRecording)}
        onMouseEnter={(e) => { !isWebcamActive && !isRecording && (e.currentTarget.style.backgroundColor = 'var(--bg-hover)'); setStatusText(getUIStatusText('webcam')) }}
        onMouseLeave={(e) => { !isWebcamActive && (e.currentTarget.style.backgroundColor = 'var(--bg-surface)'); setStatusText(null) }}
        title={isRecording ? 'Cannot switch while recording' : isWebcamActive ? 'Stop webcam' : 'Start webcam'}
      >
        {isWebcamActive ? 'Stop' : 'Cam'}
      </button>

      {/* File button */}
      <button
        onClick={handleFileClick}
        disabled={isRecording}
        className={buttonBase}
        style={getButtonStyle(isFileActive, isRecording)}
        onMouseEnter={(e) => { !isFileActive && !isRecording && (e.currentTarget.style.backgroundColor = 'var(--bg-hover)'); setStatusText(getUIStatusText('file')) }}
        onMouseLeave={(e) => { !isFileActive && (e.currentTarget.style.backgroundColor = 'var(--bg-surface)'); setStatusText(null) }}
        title={isRecording ? 'Cannot switch while recording' : 'Load video or image file'}
      >
        File
      </button>

      {/* Slicer indicator (shown when slicer is the active source) */}
      {slicerEnabled && (
        <span
          className="text-[9px] font-medium px-1.5 py-0.5 rounded-sm"
          style={{
            backgroundColor: 'var(--accent)',
            color: 'var(--text-primary)',
            boxShadow: '0 0 4px var(--accent-glow)',
          }}
        >
          Slicer
        </span>
      )}
    </div>
  )
}
