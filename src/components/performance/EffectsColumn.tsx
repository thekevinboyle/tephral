import { memo } from 'react'
import { PerformanceGrid } from './PerformanceGrid'
import { BankPanel } from './BankPanel'
import { MiddleSection } from './MiddleSection'

/** Left column: effect pages + grid (fills the height), bank slots, crossfader. Presets live in the header dropdown. */
export const EffectsColumn = memo(function EffectsColumn() {
  return (
    <>
      <div className="px-3.5 py-2.5 rule-b flex-shrink-0">
        <span className="hud-label" style={{ color: 'var(--text-secondary)' }}>Effects</span>
      </div>
      <div style={{ flex: '1 1 0', minHeight: 200 }}><PerformanceGrid /></div>
      <div className="flex-shrink-0 rule-b" style={{ height: 52 }}><BankPanel /></div>
      <div className="flex-shrink-0 rule-b" style={{ minHeight: 'var(--row-middle)' }}><MiddleSection /></div>
    </>
  )
})
