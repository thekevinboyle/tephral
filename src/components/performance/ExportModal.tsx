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
      style={{ background: 'rgba(0, 0, 0, 0.8)' }}
      onClick={() => !isExporting && setShowExportModal(false)}
    >
      <div
        className="rounded-xl p-6 min-w-[320px]"
        style={{
          backgroundColor: '#1a1a1a',
          border: '1px solid #333333',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className="text-[14px] font-medium mb-6"
          style={{ color: '#ffffff' }}
        >
          Export Video
        </h2>

        {isExporting ? (
          <div className="space-y-4">
            {/* Progress bar */}
            <div className="space-y-2">
              <div
                className="flex justify-between text-[11px]"
                style={{ color: '#888888' }}
              >
                <span>Rendering...</span>
                <span
                  className="tabular-nums"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {Math.round(exportProgress)}%
                </span>
              </div>
              <div
                className="h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: '#333333' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-200"
                  style={{
                    width: `${exportProgress}%`,
                    backgroundColor: '#ffaa00',
                  }}
                />
              </div>
            </div>

            {/* Cancel button */}
            <button
              onClick={cancelExport}
              className="w-full py-2 text-[11px] font-medium rounded-md transition-colors"
              style={{
                backgroundColor: '#242424',
                border: '1px solid #333333',
                color: '#888888',
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Format selection */}
            <div className="space-y-2">
              <label
                className="text-[11px] font-medium"
                style={{ color: '#888888' }}
              >
                Format
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => webmSupported && setExportFormat('webm')}
                  disabled={!webmSupported}
                  className="flex-1 py-2 text-[11px] font-medium rounded-md transition-colors"
                  style={{
                    backgroundColor: exportFormat === 'webm' ? '#ffcc00' : '#242424',
                    border: exportFormat === 'webm' ? '1px solid #ffcc00' : '1px solid #333333',
                    color: exportFormat === 'webm' ? '#1a1a1a' : webmSupported ? '#888888' : '#555555',
                    opacity: webmSupported ? 1 : 0.5,
                    cursor: webmSupported ? 'pointer' : 'not-allowed',
                  }}
                  title={!webmSupported ? 'WebM not supported in this browser' : undefined}
                >
                  WebM
                </button>
                <button
                  onClick={() => mp4Supported && setExportFormat('mp4')}
                  disabled={!mp4Supported}
                  className="flex-1 py-2 text-[11px] font-medium rounded-md transition-colors"
                  style={{
                    backgroundColor: exportFormat === 'mp4' ? '#ffcc00' : '#242424',
                    border: exportFormat === 'mp4' ? '1px solid #ffcc00' : '1px solid #333333',
                    color: exportFormat === 'mp4' ? '#1a1a1a' : mp4Supported ? '#888888' : '#555555',
                    opacity: mp4Supported ? 1 : 0.5,
                    cursor: mp4Supported ? 'pointer' : 'not-allowed',
                  }}
                  title={!mp4Supported ? 'MP4 not supported in this browser' : undefined}
                >
                  MP4
                </button>
              </div>
            </div>

            {/* Quality selection */}
            <div className="space-y-2">
              <label
                className="text-[11px] font-medium"
                style={{ color: '#888888' }}
              >
                Quality
              </label>
              <div className="flex gap-2">
                {(['low', 'med', 'high'] as ExportQuality[]).map((q) => (
                  <button
                    key={q}
                    onClick={() => setExportQuality(q)}
                    className="flex-1 py-2 text-[11px] font-medium rounded-md transition-colors capitalize"
                    style={{
                      backgroundColor: exportQuality === q ? '#ffcc00' : '#242424',
                      border: exportQuality === q ? '1px solid #ffcc00' : '1px solid #333333',
                      color: exportQuality === q ? '#1a1a1a' : '#888888',
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
              <div
                className="text-[10px] text-right tabular-nums"
                style={{ color: '#888888', fontFamily: "'JetBrains Mono', monospace" }}
              >
                {exportQuality === 'low' && '1 Mbps'}
                {exportQuality === 'med' && '4 Mbps'}
                {exportQuality === 'high' && '8 Mbps'}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowExportModal(false)}
                className="flex-1 py-2 text-[11px] font-medium rounded-md transition-colors"
                style={{
                  backgroundColor: '#242424',
                  border: '1px solid #333333',
                  color: '#888888',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                className="flex-1 py-2 text-[11px] font-medium rounded-md transition-colors"
                style={{
                  backgroundColor: '#ffcc00',
                  border: '1px solid #ffcc00',
                  color: '#1a1a1a',
                }}
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
