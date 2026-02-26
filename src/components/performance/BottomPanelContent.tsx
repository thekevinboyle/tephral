import { useUIStore } from '../../stores/uiStore'
import { ModulationAssignPanel } from './ModulationAssignPanel'
import { ModulationContent } from '../sequencer/ModulationContent'
import { TrackAudioReactivePanel } from '../sequencer/TrackAudioReactivePanel'

export function BottomPanelContent() {
  const bottomPanelTab = useUIStore((s) => s.bottomPanelTab)

  const wrapStyle: React.CSSProperties = {
    overflowY: 'auto',
    maxHeight: 'var(--row-bottom-expanded)',
    backgroundColor: 'var(--bg-surface)',
    padding: 'var(--panel-padding-sm) var(--panel-padding)',
  }

  switch (bottomPanelTab) {
    case 'Mixer':
      return <div style={wrapStyle}><PlaceholderContent label="Mixer — coming soon" /></div>
    case 'LFO':
      return <div style={wrapStyle}><ModulationAssignPanel /></div>
    case 'Mod Matrix':
      return <div style={wrapStyle}><PlaceholderContent label="Mod Matrix — coming soon" /></div>
    case 'Automation':
      return <div style={wrapStyle}><PlaceholderContent label="Automation — coming soon" /></div>
    case 'Random':
      return <div style={wrapStyle}><ModulationContent activeModulator="random" /></div>
    case 'Step':
      return <div style={wrapStyle}><ModulationContent activeModulator="step" /></div>
    case 'Env':
      return <div style={wrapStyle}><ModulationContent activeModulator="envelope" /></div>
    case 'S&H':
      return <div style={wrapStyle}><ModulationContent activeModulator="sh" /></div>
    case 'MIDI':
      return <div style={wrapStyle}><ModulationContent activeModulator="midi" /></div>
    case 'Audio':
      return <div style={wrapStyle}><TrackAudioReactivePanel /></div>
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
