import { SlicerTransport } from './SlicerTransport'
import { SlicerWaveform } from './SlicerWaveform'
import { SlicerControls } from './SlicerControls'

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
        <SlicerTransport />
      </div>

      {/* Waveform area */}
      <div
        className="shrink-0"
        style={{
          height: '35%',
          minHeight: '80px',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <SlicerWaveform />
      </div>

      {/* Controls area */}
      <div className="flex-1 overflow-y-auto">
        <SlicerControls />
      </div>
    </div>
  )
}
