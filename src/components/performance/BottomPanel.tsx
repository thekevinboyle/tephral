import { useUIStore } from '../../stores/uiStore'
import { BottomPanelTabBar } from './BottomPanelTabBar'
import { BottomPanelContent } from './BottomPanelContent'

export function BottomPanel() {
  const bottomPanelTab = useUIStore((s) => s.bottomPanelTab)
  const isExpanded = bottomPanelTab !== null

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      border: '1px solid var(--border)',
      borderRadius: 'var(--panel-radius)',
      boxShadow: 'var(--shadow-panel)',
      overflow: 'hidden',
    }}>
      <BottomPanelTabBar />
      <div style={{
        maxHeight: isExpanded ? 'var(--row-bottom-expanded)' : '0px',
        opacity: isExpanded ? 1 : 0,
        transition: 'max-height 0.25s ease-out, opacity 0.2s ease-out',
        overflow: 'hidden',
      }}>
        {isExpanded && <BottomPanelContent />}
      </div>
    </div>
  )
}
