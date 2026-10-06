import { memo } from 'react'
import { PerformanceGrid } from './PerformanceGrid'
import { BankPanel } from './BankPanel'
import { MiddleSection } from './MiddleSection'
import { PresetLibraryPanel } from '../presets/PresetLibraryPanel'

/** Left column: effect pages + grid, bank slots, crossfader, then the preset library (fills + scrolls). */
export const EffectsColumn = memo(function EffectsColumn({ canvasRef }: { canvasRef?: React.RefObject<HTMLCanvasElement | null> }) {
  return (
    <>
      <div className="flex items-baseline gap-2.5 px-3.5 py-2.5 rule-b flex-shrink-0">
        <span className="hud-label" style={{ color: 'var(--text-secondary)' }}>Effects</span>
      </div>
      <div className="flex-shrink-0" style={{ height: 'clamp(240px, 38vh, 380px)' }}><PerformanceGrid /></div>
      <div className="flex-shrink-0 rule-b" style={{ height: 52 }}><BankPanel /></div>
      <div className="flex-shrink-0 rule-b" style={{ minHeight: 'var(--row-middle)' }}><MiddleSection /></div>
      <div className="flex-1 min-h-0 overflow-y-auto"><PresetLibraryPanel canvasRef={canvasRef} /></div>
    </>
  )
})
