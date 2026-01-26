import { useMediaStore } from '../../stores/mediaStore'

export function ExportPanel() {
  const { videoElement, imageElement } = useMediaStore()
  const hasSource = videoElement || imageElement

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export clicked')
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="text-xs text-muted uppercase tracking-wider mb-2">Export Options</div>

      <button
        onClick={handleExport}
        disabled={!hasSource}
        className={`w-full py-3 border text-xs uppercase tracking-wider transition-colors ${
          hasSource
            ? 'border-accent-yellow text-accent-yellow hover:bg-accent-yellow hover:text-base-dark'
            : 'border-muted/50 text-muted/50 cursor-not-allowed'
        }`}
      >
        Export Frame
      </button>

      <div className="text-xs text-muted">
        {hasSource
          ? 'Capture the current frame with all effects applied.'
          : 'Load a video or image to enable export.'}
      </div>
    </div>
  )
}
