import { memo, useState } from 'react'
import { EFFECT_CATEGORIES, filterCategories } from '../../config/effectNames'
import { EffectBrowserList } from './EffectBrowserList'
import { PerformanceGrid } from './PerformanceGrid'
import { BankPanel } from './BankPanel'
import { MiddleSection } from './MiddleSection'
import { statusHover } from '../../utils/statusHover'
import { getUIStatusText } from '../../config/statusDescriptions'

type Mode = 'list' | 'pads'
const TOTAL = EFFECT_CATEGORIES.reduce((n, c) => n + c.effects.length, 0)

/** Browser panel: "Effects" header with count, List/Pads switch, search (List), body, then bank slots and crossfader. */
export const EffectBrowser = memo(function EffectBrowser() {
  const [mode, setMode] = useState<Mode>('list')
  const [query, setQuery] = useState('')
  const trimmed = query.trim()
  const noMatch = mode === 'list' && trimmed.length > 0 && filterCategories(trimmed).length === 0

  return (
    <div className="seg-browser" data-browser-mode={mode}>
      <div className="seg-browser-head">
        <span className="seg-browser-title">Effects</span>
        <span className="seg-browser-total">{TOTAL}</span>
        <div className="seg-seg" role="group" aria-label="Browser view">
          {(['list', 'pads'] as const).map((m) => (
            <button
              key={m}
              type="button"
              data-browser-view={m}
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              {...statusHover(getUIStatusText(m === 'list' ? 'browserList' : 'browserPads'))}
            >
              {m === 'list' ? 'List' : 'Pads'}
            </button>
          ))}
        </div>
      </div>

      {mode === 'list' && (
        <div className="seg-browser-search">
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
            <circle cx="5" cy="5" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
            <path d="M7.7 7.7 L10.5 10.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            data-effect-search
            aria-label="Search effects"
            placeholder="Search effects…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' && query) { e.preventDefault(); e.stopPropagation(); setQuery('') }
            }}
          />
        </div>
      )}

      <div className="seg-browser-body">
        {mode === 'pads' ? (
          <PerformanceGrid />
        ) : (
          <>
            {noMatch && (
              <div className="seg-browser-empty" data-effect-empty>
                <span>No effects match "{trimmed}"</span>
                <button type="button" data-effect-clear onClick={() => setQuery('')}>Clear</button>
              </div>
            )}
            {/* stays mounted through a no-match search so folded categories are kept */}
            <EffectBrowserList query={query} />
          </>
        )}
      </div>

      <div className="seg-browser-foot">
        <div className="seg-browser-banks"><BankPanel /></div>
        <div className="seg-browser-xfade"><MiddleSection /></div>
      </div>
    </div>
  )
})
