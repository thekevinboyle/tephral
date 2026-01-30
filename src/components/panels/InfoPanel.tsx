import { useCallback, useRef } from 'react'
import { useUIStore } from '../../stores/uiStore'
import { useSequencerStore, type StepMode, type Step } from '../../stores/sequencerStore'
import { usePresetLibraryStore } from '../../stores/presetLibraryStore'
import { getEffectsForPage, PAGE_NAMES } from '../../config/effects'

// ============================================================================
// MAIN INFO PANEL
// ============================================================================

export function InfoPanel() {
  const { infoPanelSelection, clearInfoPanelSelection } = useUIStore()

  return (
    <div
      className="flex flex-col"
      style={{ borderTop: '1px solid #d0d0d0', backgroundColor: '#f5f5f5' }}
    >
      {!infoPanelSelection && <EmptyInfoContent />}
      {infoPanelSelection?.type === 'track' && (
        <TrackInfoContent
          trackId={infoPanelSelection.trackId}
          onClose={clearInfoPanelSelection}
        />
      )}
      {infoPanelSelection?.type === 'effect' && (
        <EffectInfoContent
          effectId={infoPanelSelection.effectId}
          onClose={clearInfoPanelSelection}
        />
      )}
      {infoPanelSelection?.type === 'step' && (
        <StepInfoContent
          trackId={infoPanelSelection.trackId}
          stepIndex={infoPanelSelection.stepIndex}
          onClose={clearInfoPanelSelection}
        />
      )}
      {infoPanelSelection?.type === 'routing' && (
        <RoutingInfoContent
          routingId={infoPanelSelection.routingId}
          onClose={clearInfoPanelSelection}
        />
      )}
      {infoPanelSelection?.type === 'preset' && (
        <PresetInfoContent
          presetId={infoPanelSelection.presetId}
          onClose={clearInfoPanelSelection}
        />
      )}
    </div>
  )
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyInfoContent() {
  return (
    <>
      <div
        className="flex items-center px-3 py-2"
        style={{ borderBottom: '1px solid #e5e5e5' }}
      >
        <span
          className="text-[13px] font-semibold uppercase tracking-wider"
          style={{ color: '#999999' }}
        >
          Inspector
        </span>
      </div>
      <div className="px-3 py-3">
        <div className="text-[12px] space-y-1.5" style={{ color: '#999999' }}>
          <div className="flex items-center gap-2">
            <span className="w-4 text-center">●</span>
            <span>Click track to inspect</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 text-center">⇧</span>
            <span>Shift+click effect or step</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 text-center">◐</span>
            <span>Click routing indicator</span>
          </div>
        </div>
      </div>
    </>
  )
}

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

function PanelHeader({ title, color, onClose }: { title: string; color?: string; onClose: () => void }) {
  return (
    <div
      className="flex items-center justify-between px-3 py-2"
      style={{ borderBottom: '1px solid #e5e5e5' }}
    >
      <div className="flex items-center gap-2">
        {color && (
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: color }}
          />
        )}
        <span
          className="text-[13px] font-semibold uppercase tracking-wider"
          style={{ color: '#666666' }}
        >
          {title}
        </span>
      </div>
      <button
        onClick={onClose}
        className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200"
        style={{ color: '#999999' }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[11px] font-medium uppercase tracking-wider mb-1.5"
      style={{ color: '#999999' }}
    >
      {children}
    </div>
  )
}

// ============================================================================
// TRACK INFO
// ============================================================================

const LENGTH_PRESETS = [4, 8, 12, 16, 24, 32, 48, 64]

const MODE_OPTIONS: { mode: StepMode | null; label: string }[] = [
  { mode: 'forward', label: '>' },
  { mode: 'backward', label: '<' },
  { mode: 'pendulum', label: '<>' },
  { mode: 'random', label: '?' },
]

function TrackInfoContent({ trackId, onClose }: { trackId: string; onClose: () => void }) {
  const { tracks, updateTrack, setTrackLength, routings, updateRoutingDepth, removeRouting } = useSequencerStore()

  const track = tracks.find(t => t.id === trackId)
  const trackRoutings = routings.filter(r => r.trackId === trackId)

  if (!track) return null

  const handleLengthChange = (length: number) => {
    setTrackLength(trackId, length)
  }

  const handleModeChange = (mode: StepMode | null) => {
    const newMode = track.modeOverride === mode ? null : mode
    updateTrack(trackId, { modeOverride: newMode })
  }

  return (
    <>
      <PanelHeader title={track.name} color={track.color} onClose={onClose} />

      {/* Length */}
      <div className="px-3 py-2" style={{ borderBottom: '1px solid #e5e5e5' }}>
        <SectionLabel>Length</SectionLabel>
        <div className="flex gap-1">
          {LENGTH_PRESETS.map((length) => (
            <button
              key={length}
              onClick={() => handleLengthChange(length)}
              className="flex-1 h-6 text-[11px] font-medium rounded-full transition-colors"
              style={{
                backgroundColor: track.length === length ? track.color : '#ffffff',
                color: track.length === length ? '#ffffff' : '#666666',
                border: '1px solid',
                borderColor: track.length === length ? track.color : '#d0d0d0',
              }}
            >
              {length}
            </button>
          ))}
        </div>
      </div>

      {/* Mode */}
      <div className="px-3 py-2" style={{ borderBottom: '1px solid #e5e5e5' }}>
        <SectionLabel>Mode</SectionLabel>
        <div className="flex gap-1">
          {MODE_OPTIONS.map(({ mode, label }) => (
            <button
              key={mode}
              onClick={() => handleModeChange(mode)}
              className="w-9 h-7 text-[14px] font-mono rounded transition-colors"
              style={{
                backgroundColor: track.modeOverride === mode ? track.color : '#ffffff',
                color: track.modeOverride === mode ? '#ffffff' : '#999999',
                border: '1px solid',
                borderColor: track.modeOverride === mode ? track.color : '#d0d0d0',
              }}
            >
              {label}
            </button>
          ))}
          {track.modeOverride && (
            <button
              onClick={() => handleModeChange(null)}
              className="ml-auto px-2 h-7 text-[11px] rounded transition-colors hover:bg-gray-100"
              style={{
                backgroundColor: '#ffffff',
                color: '#999999',
                border: '1px solid #d0d0d0',
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Routes */}
      <div className="px-3 py-2">
        <SectionLabel>Routes {trackRoutings.length > 0 && `(${trackRoutings.length})`}</SectionLabel>
        {trackRoutings.length === 0 ? (
          <div className="text-[12px] py-2" style={{ color: '#b0b0b0' }}>
            Drag track handle to a parameter to create a route
          </div>
        ) : (
          <div className="space-y-1">
            {trackRoutings.map((routing) => (
              <RoutingRow
                key={routing.id}
                targetParam={routing.targetParam}
                depth={routing.depth}
                trackColor={track.color}
                onDepthChange={(depth) => updateRoutingDepth(routing.id, depth)}
                onRemove={() => removeRouting(routing.id)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

// ============================================================================
// EFFECT INFO
// ============================================================================

function EffectInfoContent({ effectId, onClose }: { effectId: string; onClose: () => void }) {
  // Find the effect in all pages
  let effect = null
  let pageName = ''
  for (let page = 0; page <= 4; page++) {
    const effects = getEffectsForPage(page)
    const found = effects.find(e => e.id === effectId)
    if (found) {
      effect = found
      pageName = PAGE_NAMES[page]
      break
    }
  }

  if (!effect) return null

  return (
    <>
      <PanelHeader title={effect.label} color={effect.color} onClose={onClose} />

      <div className="px-3 py-2">
        <SectionLabel>Details</SectionLabel>
        <div className="space-y-1 text-[12px]" style={{ color: '#666666' }}>
          <div className="flex justify-between">
            <span style={{ color: '#999999' }}>Page</span>
            <span>{pageName}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: '#999999' }}>ID</span>
            <span className="font-mono">{effect.id}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: '#999999' }}>Range</span>
            <span>{effect.min} – {effect.max}</span>
          </div>
        </div>
      </div>
    </>
  )
}

// ============================================================================
// STEP INFO
// ============================================================================

function StepInfoContent({ trackId, stepIndex, onClose }: { trackId: string; stepIndex: number; onClose: () => void }) {
  const { tracks, updateStep } = useSequencerStore()

  const track = tracks.find(t => t.id === trackId)
  const step = track?.steps[stepIndex]

  if (!track || !step) return null

  const handleStepUpdate = (updates: Partial<Step>) => {
    updateStep(trackId, stepIndex, updates)
  }

  return (
    <>
      <PanelHeader title={`${track.name} › Step ${stepIndex + 1}`} color={track.color} onClose={onClose} />

      {/* Probability */}
      <div className="px-3 py-2" style={{ borderBottom: '1px solid #e5e5e5' }}>
        <SectionLabel>Probability</SectionLabel>
        <StepSlider
          value={step.probability}
          onChange={(v) => handleStepUpdate({ probability: v })}
          color={track.color}
        />
      </div>

      {/* Gate Length */}
      <div className="px-3 py-2" style={{ borderBottom: '1px solid #e5e5e5' }}>
        <SectionLabel>Gate Length</SectionLabel>
        <StepSlider
          value={step.gateLength}
          onChange={(v) => handleStepUpdate({ gateLength: v })}
          color={track.color}
        />
      </div>

      {/* Ratchet */}
      <div className="px-3 py-2" style={{ borderBottom: '1px solid #e5e5e5' }}>
        <SectionLabel>Ratchet</SectionLabel>
        <div className="flex gap-1">
          {([1, 2, 3, 4, 6, 8] as const).map((div) => (
            <button
              key={div}
              onClick={() => handleStepUpdate({ ratchetDivision: div })}
              className="flex-1 h-6 text-[11px] font-medium rounded transition-colors"
              style={{
                backgroundColor: step.ratchetDivision === div ? track.color : '#ffffff',
                color: step.ratchetDivision === div ? '#ffffff' : '#666666',
                border: '1px solid',
                borderColor: step.ratchetDivision === div ? track.color : '#d0d0d0',
              }}
            >
              {div}x
            </button>
          ))}
        </div>
      </div>

      {/* Velocity Curve */}
      <div className="px-3 py-2">
        <SectionLabel>Velocity</SectionLabel>
        <div className="flex gap-1">
          {(['flat', 'up', 'down', 'triangle'] as const).map((curve) => (
            <button
              key={curve}
              onClick={() => handleStepUpdate({ velocityCurve: curve })}
              className="flex-1 h-6 text-[11px] font-medium rounded transition-colors"
              style={{
                backgroundColor: step.velocityCurve === curve ? track.color : '#ffffff',
                color: step.velocityCurve === curve ? '#ffffff' : '#666666',
                border: '1px solid',
                borderColor: step.velocityCurve === curve ? track.color : '#d0d0d0',
              }}
            >
              {curve === 'flat' ? '—' : curve === 'up' ? '↗' : curve === 'down' ? '↘' : '∧'}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

function StepSlider({ value, onChange, color }: { value: number; onChange: (v: number) => void; color: string }) {
  const trackRef = useRef<HTMLDivElement>(null)

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    updateFromEvent(e)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.buttons === 0) return
    updateFromEvent(e)
  }

  const updateFromEvent = (e: React.PointerEvent) => {
    if (!trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    onChange(x)
  }

  return (
    <div className="flex items-center gap-2">
      <div
        ref={trackRef}
        className="flex-1 h-6 bg-gray-100 rounded-full border border-gray-200 relative cursor-pointer"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      >
        <div
          className="absolute left-0 top-0 bottom-0 rounded-full"
          style={{ width: `${value * 100}%`, backgroundColor: color, opacity: 0.3 }}
        />
        <div
          className="absolute top-1/2 w-4 h-4 rounded-full bg-white border-2 shadow-sm"
          style={{
            left: `calc(${value * 100}% - 8px)`,
            transform: 'translateY(-50%)',
            borderColor: color,
          }}
        />
      </div>
      <span className="text-[11px] w-8 text-right tabular-nums" style={{ color: '#999' }}>
        {Math.round(value * 100)}%
      </span>
    </div>
  )
}

// ============================================================================
// ROUTING INFO
// ============================================================================

function RoutingInfoContent({ routingId, onClose }: { routingId: string; onClose: () => void }) {
  const { routings, tracks, updateRoutingDepth, removeRouting } = useSequencerStore()

  const routing = routings.find(r => r.id === routingId)
  const track = routing ? tracks.find(t => t.id === routing.trackId) : null

  if (!routing || !track) return null

  const formatParamName = (param: string) => {
    return param
      .split('.')
      .map(part => part.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '))
      .join(' › ')
  }

  return (
    <>
      <PanelHeader title="Routing" color={track.color} onClose={onClose} />

      <div className="px-3 py-2" style={{ borderBottom: '1px solid #e5e5e5' }}>
        <SectionLabel>Connection</SectionLabel>
        <div className="text-[12px]" style={{ color: '#666666' }}>
          <span style={{ color: track.color, fontWeight: 500 }}>{track.name}</span>
          <span style={{ color: '#999999' }}> → </span>
          <span>{formatParamName(routing.targetParam)}</span>
        </div>
      </div>

      <div className="px-3 py-2" style={{ borderBottom: '1px solid #e5e5e5' }}>
        <SectionLabel>Depth</SectionLabel>
        <RoutingRow
          targetParam={routing.targetParam}
          depth={routing.depth}
          trackColor={track.color}
          onDepthChange={(depth) => updateRoutingDepth(routing.id, depth)}
          onRemove={() => {
            removeRouting(routing.id)
            onClose()
          }}
          showLabel={false}
        />
      </div>

      <div className="px-3 py-2">
        <button
          onClick={() => {
            removeRouting(routing.id)
            onClose()
          }}
          className="w-full h-7 text-[12px] font-medium rounded transition-colors hover:bg-red-50"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #d0d0d0',
            color: '#999999',
          }}
        >
          Remove Routing
        </button>
      </div>
    </>
  )
}

// ============================================================================
// PRESET INFO
// ============================================================================

function PresetInfoContent({ presetId, onClose }: { presetId: string; onClose: () => void }) {
  const { presets, loadPreset, deletePreset } = usePresetLibraryStore()

  const preset = presets.find(p => p.id === presetId)

  if (!preset) return null

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <>
      <PanelHeader title={preset.name} onClose={onClose} />

      {/* Thumbnail */}
      {preset.thumbnail && (
        <div className="px-3 py-2" style={{ borderBottom: '1px solid #e5e5e5' }}>
          <div
            className="w-full aspect-video rounded overflow-hidden"
            style={{ backgroundColor: '#e0e0e0' }}
          >
            <img src={preset.thumbnail} alt={preset.name} className="w-full h-full object-cover" />
          </div>
        </div>
      )}

      <div className="px-3 py-2" style={{ borderBottom: '1px solid #e5e5e5' }}>
        <SectionLabel>Details</SectionLabel>
        <div className="space-y-1 text-[12px]" style={{ color: '#666666' }}>
          <div className="flex justify-between">
            <span style={{ color: '#999999' }}>Created</span>
            <span>{formatDate(preset.createdAt)}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: '#999999' }}>Updated</span>
            <span>{formatDate(preset.updatedAt)}</span>
          </div>
        </div>
      </div>

      <div className="px-3 py-2 flex gap-2">
        <button
          onClick={() => {
            loadPreset(preset.id)
            onClose()
          }}
          className="flex-1 h-7 text-[12px] font-medium rounded transition-colors"
          style={{
            backgroundColor: '#333333',
            color: '#ffffff',
          }}
        >
          Load
        </button>
        <button
          onClick={() => {
            if (confirm(`Delete "${preset.name}"?`)) {
              deletePreset(preset.id)
              onClose()
            }
          }}
          className="h-7 px-3 text-[12px] font-medium rounded transition-colors hover:bg-red-50"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #d0d0d0',
            color: '#999999',
          }}
        >
          Delete
        </button>
      </div>
    </>
  )
}

// ============================================================================
// SHARED ROUTING ROW
// ============================================================================

interface RoutingRowProps {
  targetParam: string
  depth: number
  trackColor: string
  onDepthChange: (depth: number) => void
  onRemove: () => void
  showLabel?: boolean
}

function RoutingRow({ targetParam, depth, trackColor, onDepthChange, onRemove, showLabel = true }: RoutingRowProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const startX = useRef(0)
  const startDepth = useRef(0)

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    isDragging.current = true
    startX.current = e.clientX
    startDepth.current = depth
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [depth])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current || !trackRef.current) return
    const deltaX = e.clientX - startX.current
    const deltaDepth = deltaX / 40
    const newDepth = Math.max(-1, Math.min(1, startDepth.current + deltaDepth))
    onDepthChange(newDepth)
  }, [onDepthChange])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    isDragging.current = false
    try {
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {}
  }, [])

  const formatParamName = (param: string) => {
    return param
      .split('.')
      .map(part => part.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '))
      .join(' › ')
  }

  return (
    <div
      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 cursor-ew-resize"
      ref={trackRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={onRemove}
      title="Drag to adjust depth, double-click to remove"
    >
      {showLabel && (
        <span className="text-[12px] flex-1 truncate" style={{ color: '#666666' }}>
          {formatParamName(targetParam)}
        </span>
      )}

      <div className={`${showLabel ? 'w-16' : 'flex-1'} h-2 bg-gray-200 rounded relative overflow-hidden`}>
        <div
          className="absolute top-0 bottom-0 w-px"
          style={{ left: '50%', backgroundColor: '#c0c0c0' }}
        />
        <div
          className="absolute top-0 bottom-0 rounded"
          style={{
            left: depth >= 0 ? '50%' : `${50 + depth * 50}%`,
            width: `${Math.abs(depth) * 50}%`,
            backgroundColor: trackColor,
          }}
        />
      </div>

      <span
        className="text-[11px] w-8 text-right tabular-nums"
        style={{ color: '#999999' }}
      >
        {Math.round(depth * 100)}%
      </span>
    </div>
  )
}
