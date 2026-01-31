// Stores will be used by sub-components when implemented
// import { useSlicerStore } from '../../stores/slicerStore'
// import { useSlicerBufferStore } from '../../stores/slicerBufferStore'

export function SlicerPanel() {
  return (
    <div
      className="flex flex-col h-full"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderLeft: '1px solid var(--border)',
      }}
    >
      {/* Header row */}
      <div
        className="px-3 py-2 flex items-center"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <span
          className="text-[13px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--text-muted)' }}
        >
          SLICER
        </span>
        <div className="flex-1" />
        <span style={{ color: 'var(--text-muted)' }}>Transport here</span>
      </div>

      {/* Waveform area */}
      <div
        className="shrink-0 flex items-center justify-center"
        style={{
          height: '35%',
          minHeight: '80px',
          color: 'var(--text-muted)',
        }}
      >
        Waveform visualization
      </div>

      {/* Controls area */}
      <div
        className="flex-1 overflow-y-auto flex items-center justify-center"
        style={{ color: 'var(--text-muted)' }}
      >
        Controls here
      </div>
    </div>
  )
}
