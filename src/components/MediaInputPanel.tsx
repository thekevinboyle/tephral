import { useRef } from 'react'
import { Panel } from './ui'
import { useMediaStore } from '../stores/mediaStore'
import { useWebcam } from '../hooks/useWebcam'
import { useFileUpload } from '../hooks/useFileUpload'

export function MediaInputPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { source, isLoading, error } = useMediaStore()
  const { startWebcam, stopWebcam } = useWebcam()
  const { uploadFile } = useFileUpload()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      uploadFile(file)
    }
  }

  return (
    <Panel title="INPUT">
      <div className="flex flex-col gap-2">
        <button
          className={`w-full py-2 border text-xs uppercase tracking-wider ${
            source === 'webcam'
              ? 'bg-accent-yellow text-base-dark border-accent-yellow'
              : 'border-muted hover:border-base-light'
          }`}
          onClick={() => source === 'webcam' ? stopWebcam() : startWebcam()}
          disabled={isLoading}
        >
          {source === 'webcam' ? 'STOP WEBCAM' : 'START WEBCAM'}
        </button>

        <button
          className="w-full py-2 border border-muted text-xs uppercase tracking-wider hover:border-base-light"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
        >
          UPLOAD FILE
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {isLoading && (
          <span className="text-xs text-muted">LOADING...</span>
        )}
        {error && (
          <span className="text-xs text-red-500">{error}</span>
        )}
        {source !== 'none' && !isLoading && (
          <span className="text-xs text-accent-yellow">
            SOURCE: {source.toUpperCase()}
          </span>
        )}
      </div>
    </Panel>
  )
}
