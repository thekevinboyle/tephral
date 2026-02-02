import { useCallback } from 'react'
import { useMediaSource } from '../../hooks/useMediaSource'
import { useSlicerStore } from '../../stores/slicerStore'

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

  const handleWebcamClick = useCallback(() => {
    const check = switchCheck()
    if (!check.allowed) {
      // Could show toast here
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
    ? 'h-7 rounded-md text-[12px] font-medium transition-colors active:scale-95'
    : 'h-9 rounded-lg text-[13px] font-medium transition-colors active:scale-95'

  const buttonWidth = variant === 'compact' ? '48px' : '64px'

  const getButtonStyle = (isActive: boolean, isDisabled: boolean) => ({
    width: buttonWidth,
    backgroundColor: isActive ? 'var(--text-primary)' : 'var(--bg-surface)',
    border: '1px solid var(--border)',
    color: isActive ? 'var(--bg-surface)' : 'var(--text-muted)',
    opacity: isDisabled ? 0.5 : 1,
    cursor: isDisabled ? 'not-allowed' : 'pointer',
  })

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
        onMouseEnter={(e) => !isWebcamActive && !isRecording && (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
        onMouseLeave={(e) => !isWebcamActive && (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}
        title={isRecording ? 'Cannot switch while recording' : isWebcamActive ? 'Stop webcam' : 'Start webcam'}
      >
        {isWebcamActive ? 'Stop' : 'Cam'}
      </button>

      {/* File button */}
      <button
        onClick={handleFileClick}
        disabled={isRecording}
        className={buttonBase}
        style={getButtonStyle(source === 'file', isRecording)}
        onMouseEnter={(e) => source !== 'file' && !isRecording && (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
        onMouseLeave={(e) => source !== 'file' && (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}
        title={isRecording ? 'Cannot switch while recording' : 'Load video or image file'}
      >
        File
      </button>

      {/* Slicer indicator (shown when slicer is the active source) */}
      {slicerEnabled && (
        <span
          className="text-[11px] font-medium px-2 py-1 rounded"
          style={{
            backgroundColor: '#6366f1',
            color: 'white',
          }}
        >
          Slicer
        </span>
      )}
    </div>
  )
}
