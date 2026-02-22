import { useUIStore } from '../../stores/uiStore'
import { ModulationAssignPanel } from './ModulationAssignPanel'

export function BottomPanelContent() {
  const bottomPanelTab = useUIStore((s) => s.bottomPanelTab)

  const wrapStyle: React.CSSProperties = {
    overflowY: 'auto',
    height: 'var(--row-bottom-expanded)',
    backgroundColor: 'var(--bg-surface)',
    padding: 'var(--panel-padding-sm) var(--panel-padding)',
  }

  switch (bottomPanelTab) {
    case 'Mixer':
      return <div style={wrapStyle}><PlaceholderContent label="Mixer — coming soon" /></div>
    case 'Modulation':
      return <div style={wrapStyle}><ModulationAssignPanel /></div>
    case 'Mod Matrix':
      return <div style={wrapStyle}><PlaceholderContent label="Mod Matrix — coming soon" /></div>
    case 'Automation':
      return <div style={wrapStyle}><PlaceholderContent label="Automation — coming soon" /></div>
    default:
      return null
  }
}

function PlaceholderContent({ label }: { label: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      color: 'var(--text-ghost)',
      fontSize: 'var(--text-small)',
      fontFamily: 'var(--font-mono)',
      letterSpacing: 'var(--tracking-wide)',
      textTransform: 'uppercase',
    }}>
      {label}
    </div>
  )
}
