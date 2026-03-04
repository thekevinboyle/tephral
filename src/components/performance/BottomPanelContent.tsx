import { useUIStore } from '../../stores/uiStore'
import { ModulationAssignPanel } from './ModulationAssignPanel'
import { ModulationContent } from '../sequencer/ModulationContent'
import { TrackAudioReactivePanel } from '../sequencer/TrackAudioReactivePanel'
import { CornerFrame } from '../ui/CornerFrame'
import { TypewriterText } from '../ui/TypewriterText'

export function BottomPanelContent() {
  const bottomPanelTab = useUIStore((s) => s.bottomPanelTab)

  const wrapStyle: React.CSSProperties = {
    overflowY: 'auto',
    maxHeight: 'var(--row-bottom-expanded)',
    backgroundColor: 'var(--bg-surface)',
    padding: 'var(--panel-padding-sm) var(--panel-padding)',
    margin: 4,
    border: '1px solid var(--border)',
  }

  switch (bottomPanelTab) {
    case 'Mixer':
      return <div style={wrapStyle}><PlaceholderContent label="MIXER -- AWAITING DATA" /></div>
    case 'LFO':
      return <div style={wrapStyle}><ModulationAssignPanel /></div>
    case 'Mod Matrix':
      return <div style={wrapStyle}><PlaceholderContent label="MOD MATRIX -- AWAITING DATA" /></div>
    case 'Automation':
      return <div style={wrapStyle}><PlaceholderContent label="AUTOMATION -- AWAITING DATA" /></div>
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
    <CornerFrame color="var(--text-ghost)" style={{ minHeight: 60 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: 16,
      }}>
        <TypewriterText
          text={label}
          speed={40}
          style={{
            color: 'var(--text-ghost)',
            fontSize: 'var(--text-small)',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        />
      </div>
    </CornerFrame>
  )
}
