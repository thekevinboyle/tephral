import { useUIStore } from '../../stores/uiStore'
import {
  ShuffleIcon,
  SettingsIcon,
  SlidersIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '../ui/DotMatrixIcons'
import { Crosshair } from '../ui/MicroVisuals'

const TABS = ['LFO', 'Random', 'Step', 'Env', 'S&H', 'MIDI', 'Audio'] as const

const TAB_STATUS: Record<string, string> = {
  Mixer: 'Mixer \u2014 Effect dry/wet levels',
  LFO: 'LFO \u2014 Low-frequency oscillator modulation',
  'Mod Matrix': 'Mod Matrix \u2014 Modulation routing overview',
  Automation: 'Automation \u2014 Parameter automation lanes',
  Random: 'Random \u2014 Random value modulation',
  Step: 'Step \u2014 Step sequencer modulation',
  Env: 'Envelope \u2014 ADSR envelope modulation',
  'S&H': 'S&H \u2014 Sample and hold modulation',
  MIDI: 'MIDI \u2014 MIDI CC controller mapping',
  Audio: 'Audio \u2014 Per-track audio reactive settings',
}

export function BottomPanelTabBar() {
  const bottomPanelTab = useUIStore((s) => s.bottomPanelTab)
  const bottomPanelPage = useUIStore((s) => s.bottomPanelPage)
  const toggleBottomPanelTab = useUIStore((s) => s.toggleBottomPanelTab)
  const setBottomPanelPage = useUIStore((s) => s.setBottomPanelPage)
  const prevBottomPanelPage = useUIStore((s) => s.prevBottomPanelPage)
  const nextBottomPanelPage = useUIStore((s) => s.nextBottomPanelPage)
  const setStatusText = useUIStore((s) => s.setStatusText)

  const isExpanded = bottomPanelTab !== null

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'space-between',
        height: 'var(--row-bottom-bar)',
        backgroundColor: 'var(--bg-surface)',
        borderBottom: isExpanded ? '1px solid var(--border)' : 'none',
      }}
    >
      {/* Left: tabs */}
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        {TABS.map((tab) => {
          const isActive = bottomPanelTab === tab
          return (
            <button
              key={tab}
              onClick={() => toggleBottomPanelTab(tab)}
              style={{
                background: isActive ? 'var(--bg-hover)' : 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: 'var(--text-micro)',
                letterSpacing: 'var(--tracking-wide)',
                textTransform: 'uppercase',
                fontFamily: 'var(--font-sans)',
                fontWeight: 600,
                padding: '0 12px',
                cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)'
                setStatusText(TAB_STATUS[tab] ?? tab)
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.background = 'transparent'
                setStatusText(null)
              }}
            >
              {tab}
            </button>
          )
        })}
      </div>

      {/* Right: action buttons + page nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, paddingRight: 8 }}>
        {/* Randomize */}
        <IconButton title="Randomize" statusText="Randomize \u2014 Shuffle parameters">
          <ShuffleIcon size={12} />
        </IconButton>

        {/* Icon buttons */}
        <IconButton title="Settings" statusText="Settings \u2014 Panel options">
          <SettingsIcon size={12} />
        </IconButton>
        <IconButton title="Sliders" statusText="Sliders \u2014 View as sliders">
          <SlidersIcon size={12} />
        </IconButton>

        {/* Separator with visual */}
        <Crosshair value={0.5} size={14} color="var(--text-ghost)" className="opacity-15 mx-1" />
        <div style={{ width: 1, height: 16, backgroundColor: 'var(--border)', margin: '0 4px' }} />

        {/* Page nav */}
        <IconButton title="Previous page" onClick={prevBottomPanelPage} statusText="Previous page">
          <ChevronLeftIcon size={12} />
        </IconButton>

        {[1, 2, 3, 4].map((page) => (
          <button
            key={page}
            onClick={() => setBottomPanelPage(page)}
            style={{
              background: 'none',
              border: 'none',
              color: bottomPanelPage === page ? 'var(--text-primary)' : 'var(--text-ghost)',
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-micro)',
              fontWeight: bottomPanelPage === page ? 700 : 400,
              cursor: 'pointer',
              padding: '0 3px',
              lineHeight: 1,
            }}
          >
            {page}
          </button>
        ))}

        <IconButton title="Next page" onClick={nextBottomPanelPage} statusText="Next page">
          <ChevronRightIcon size={12} />
        </IconButton>
      </div>
    </div>
  )
}

function IconButton({
  children,
  title,
  onClick,
  statusText,
}: {
  children: React.ReactNode
  title: string
  onClick?: () => void
  statusText?: string
}) {
  const setStatusText = useUIStore((s) => s.setStatusText)
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        color: 'var(--text-muted)',
        cursor: 'pointer',
        padding: 4,
        borderRadius: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'color 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = 'var(--text-primary)'
        if (statusText) setStatusText(statusText)
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'var(--text-muted)'
        if (statusText) setStatusText(null)
      }}
    >
      {children}
    </button>
  )
}
