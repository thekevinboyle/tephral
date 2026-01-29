import { useRef } from 'react'
import { useMediaStore } from '../../stores/mediaStore'
import { useFileUpload } from '../../hooks/useFileUpload'
import { useWebcam } from '../../hooks/useWebcam'
import { MinimalToggle } from '../ui/MinimalToggle'

export function SourcePanel() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { uploadFile } = useFileUpload()
  const { startWebcam, stopWebcam } = useWebcam()
  const { source, isLoading, error, reset } = useMediaStore()

  const isWebcamActive = source === 'webcam'

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      e.target.value = '' // Reset so same file can be selected again
      uploadFile(file)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xs text-muted uppercase tracking-wider mb-2">Media Source</div>

      {/* Upload button */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="w-full py-3 border border-muted text-muted hover:border-accent-yellow hover:text-accent-yellow transition-colors text-xs uppercase tracking-wider"
      >
        {isLoading ? 'Loading...' : 'Upload File'}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Webcam toggle */}
      <MinimalToggle
        label="Use Webcam"
        pressed={isWebcamActive}
        onPressedChange={(pressed) => pressed ? startWebcam() : stopWebcam()}
      />

      {/* Status */}
      {source !== 'none' && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">Source: {source}</span>
          <button
            onClick={reset}
            className="text-xs text-muted hover:text-accent-red transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {error && (
        <div className="text-xs text-accent-red">{error}</div>
      )}
    </div>
  )
}
