import { useRecordingStore, type ExportFormat, type ExportQuality } from '../../stores/recordingStore'

interface ExportModalProps {
  onExport: (format: ExportFormat, quality: ExportQuality) => void
  isFormatSupported: (format: ExportFormat) => boolean
}

export function ExportModal({ onExport, isFormatSupported }: ExportModalProps) {
  const {
    showExportModal,
    setShowExportModal,
    exportFormat,
    setExportFormat,
    exportQuality,
    setExportQuality,
    isExporting,
    exportProgress,
    cancelExport,
  } = useRecordingStore()

  if (!showExportModal) return null

  const webmSupported = isFormatSupported('webm')
  const mp4Supported = isFormatSupported('mp4')

  const handleExport = () => {
    onExport(exportFormat, exportQuality)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)' }}
      onClick={() => !isExporting && setShowExportModal(false)}
    >
      <div
        className="rounded-xl p-6 min-w-[320px]"
        style={{
          background: 'linear-gradient(180deg, #1a1d24 0%, #13151a 100%)',
          border: '1px solid #2a2d35',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm uppercase tracking-wider text-base-light mb-6">
          Export Video
        </h2>

        {isExporting ? (
          <div className="space-y-4">
            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted">
                <span>Rendering...</span>
                <span className="tabular-nums">{Math.round(exportProgress)}%</span>
              </div>
              <div
                className="h-2 rounded-full overflow-hidden"
                style={{ background: '#2a2d35' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-200"
                  style={{
                    width: `${exportProgress}%`,
                    background: 'linear-gradient(90deg, #ffaa00, #ff6600)',
                  }}
                />
              </div>
            </div>

            {/* Cancel button */}
            <button
              onClick={cancelExport}
              className="w-full py-2 text-xs uppercase tracking-wider border border-border text-muted hover:text-record-red hover:border-record-red transition-colors rounded"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Format selection */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-muted">
                Format
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => webmSupported && setExportFormat('webm')}
                  disabled={!webmSupported}
                  className={`flex-1 py-2 text-xs uppercase tracking-wider rounded transition-colors ${
                    exportFormat === 'webm'
                      ? 'bg-accent-yellow text-base-dark'
                      : webmSupported
                        ? 'border border-border text-muted hover:border-base-light hover:text-base-light'
                        : 'border border-border/50 text-muted/50 cursor-not-allowed'
                  }`}
                  title={!webmSupported ? 'WebM not supported in this browser' : undefined}
                >
                  WebM
                </button>
                <button
                  onClick={() => mp4Supported && setExportFormat('mp4')}
                  disabled={!mp4Supported}
                  className={`flex-1 py-2 text-xs uppercase tracking-wider rounded transition-colors ${
                    exportFormat === 'mp4'
                      ? 'bg-accent-yellow text-base-dark'
                      : mp4Supported
                        ? 'border border-border text-muted hover:border-base-light hover:text-base-light'
                        : 'border border-border/50 text-muted/50 cursor-not-allowed'
                  }`}
                  title={!mp4Supported ? 'MP4 not supported in this browser' : undefined}
                >
                  MP4
                </button>
              </div>
            </div>

            {/* Quality selection */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-muted">
                Quality
              </label>
              <div className="flex gap-2">
                {(['low', 'med', 'high'] as ExportQuality[]).map((q) => (
                  <button
                    key={q}
                    onClick={() => setExportQuality(q)}
                    className={`flex-1 py-2 text-xs uppercase tracking-wider rounded transition-colors ${
                      exportQuality === q
                        ? 'bg-accent-yellow text-base-dark'
                        : 'border border-border text-muted hover:border-base-light hover:text-base-light'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-muted text-right">
                {exportQuality === 'low' && '1 Mbps'}
                {exportQuality === 'med' && '4 Mbps'}
                {exportQuality === 'high' && '8 Mbps'}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowExportModal(false)}
                className="flex-1 py-2 text-xs uppercase tracking-wider border border-border text-muted hover:text-base-light hover:border-base-light transition-colors rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                className="flex-1 py-2 text-xs uppercase tracking-wider bg-accent-yellow text-base-dark hover:bg-accent-yellow/80 transition-colors rounded"
              >
                Export
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
