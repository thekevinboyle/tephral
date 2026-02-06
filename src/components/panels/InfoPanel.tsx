import { useCallback, useRef, useState } from 'react'
import { Button } from '../ui/Button'
import { useUIStore } from '../../stores/uiStore'
import { useSequencerStore, type StepMode, type Step } from '../../stores/sequencerStore'
import { usePresetLibraryStore } from '../../stores/presetLibraryStore'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { useAcidStore } from '../../stores/acidStore'
import { getEffectsForPage, PAGE_NAMES, EFFECTS } from '../../config/effects'

// ============================================================================
// MAIN INFO PANEL
// ============================================================================

export function InfoPanel() {
  const { infoPanelSelection, clearInfoPanelSelection } = useUIStore()

  // Subscribe to effect enabled states for reactivity
  const rgbSplitEnabled = useGlitchEngineStore(s => s.rgbSplitEnabled)
  const chromaticAberrationEnabled = useGlitchEngineStore(s => s.chromaticAberrationEnabled)
  const posterizeEnabled = useGlitchEngineStore(s => s.posterizeEnabled)
  const colorGradeEnabled = useGlitchEngineStore(s => s.colorGradeEnabled)
  const blockDisplaceEnabled = useGlitchEngineStore(s => s.blockDisplaceEnabled)
  const staticDisplacementEnabled = useGlitchEngineStore(s => s.staticDisplacementEnabled)
  const pixelateEnabled = useGlitchEngineStore(s => s.pixelateEnabled)
  const lensDistortionEnabled = useGlitchEngineStore(s => s.lensDistortionEnabled)
  const scanLinesEnabled = useGlitchEngineStore(s => s.scanLinesEnabled)
  const vhsTrackingEnabled = useGlitchEngineStore(s => s.vhsTrackingEnabled)
  const noiseEnabled = useGlitchEngineStore(s => s.noiseEnabled)
  const ditherEnabled = useGlitchEngineStore(s => s.ditherEnabled)
  const edgeDetectionEnabled = useGlitchEngineStore(s => s.edgeDetectionEnabled)
  const feedbackLoopEnabled = useGlitchEngineStore(s => s.feedbackLoopEnabled)

  const dotsEnabled = useAcidStore(s => s.dotsEnabled)
  const glyphEnabled = useAcidStore(s => s.glyphEnabled)
  const iconsEnabled = useAcidStore(s => s.iconsEnabled)
  const contourEnabled = useAcidStore(s => s.contourEnabled)
  const decompEnabled = useAcidStore(s => s.decompEnabled)
  const mirrorEnabled = useAcidStore(s => s.mirrorEnabled)
  const sliceEnabled = useAcidStore(s => s.sliceEnabled)
  const thGridEnabled = useAcidStore(s => s.thGridEnabled)
  const cloudEnabled = useAcidStore(s => s.cloudEnabled)
  const ledEnabled = useAcidStore(s => s.ledEnabled)
  const slitEnabled = useAcidStore(s => s.slitEnabled)
  const voronoiEnabled = useAcidStore(s => s.voronoiEnabled)

  // Build active effects list
  const activeEffects: ActiveEffect[] = []
  if (rgbSplitEnabled) activeEffects.push({ id: 'rgb_split', label: 'RGB', color: '#0891b2', type: 'glitch' })
  if (chromaticAberrationEnabled) activeEffects.push({ id: 'chromatic', label: 'CHROMA', color: '#6366f1', type: 'glitch' })
  if (posterizeEnabled) activeEffects.push({ id: 'posterize', label: 'POSTER', color: '#dc2626', type: 'glitch' })
  if (colorGradeEnabled) activeEffects.push({ id: 'color_grade', label: 'GRADE', color: '#ea580c', type: 'glitch' })
  if (blockDisplaceEnabled) activeEffects.push({ id: 'block_displace', label: 'BLOCK', color: '#a855f7', type: 'glitch' })
  if (staticDisplacementEnabled) activeEffects.push({ id: 'static_displace', label: 'STATIC', color: '#8b5cf6', type: 'glitch' })
  if (pixelateEnabled) activeEffects.push({ id: 'pixelate', label: 'PIXEL', color: '#d946ef', type: 'glitch' })
  if (lensDistortionEnabled) activeEffects.push({ id: 'lens', label: 'LENS', color: '#0284c7', type: 'glitch' })
  if (scanLinesEnabled) activeEffects.push({ id: 'scan_lines', label: 'SCAN', color: '#65a30d', type: 'glitch' })
  if (vhsTrackingEnabled) activeEffects.push({ id: 'vhs', label: 'VHS', color: '#059669', type: 'glitch' })
  if (noiseEnabled) activeEffects.push({ id: 'noise', label: 'NOISE', color: '#84cc16', type: 'glitch' })
  if (ditherEnabled) activeEffects.push({ id: 'dither', label: 'DITHER', color: '#22c55e', type: 'glitch' })
  if (edgeDetectionEnabled) activeEffects.push({ id: 'edges', label: 'EDGES', color: '#f59e0b', type: 'glitch' })
  if (feedbackLoopEnabled) activeEffects.push({ id: 'feedback', label: 'FEEDBACK', color: '#d97706', type: 'glitch' })
  if (dotsEnabled) activeEffects.push({ id: 'acid_dots', label: 'DOTS', color: '#e5e5e5', type: 'acid' })
  if (glyphEnabled) activeEffects.push({ id: 'acid_glyph', label: 'GLYPH', color: '#d4d4d4', type: 'acid' })
  if (iconsEnabled) activeEffects.push({ id: 'acid_icons', label: 'ICONS', color: '#c4c4c4', type: 'acid' })
  if (contourEnabled) activeEffects.push({ id: 'acid_contour', label: 'CONTOUR', color: '#b4b4b4', type: 'acid' })
  if (decompEnabled) activeEffects.push({ id: 'acid_decomp', label: 'DECOMP', color: '#94a3b8', type: 'acid' })
  if (mirrorEnabled) activeEffects.push({ id: 'acid_mirror', label: 'MIRROR', color: '#7dd3fc', type: 'acid' })
  if (sliceEnabled) activeEffects.push({ id: 'acid_slice', label: 'SLICE', color: '#67e8f9', type: 'acid' })
  if (thGridEnabled) activeEffects.push({ id: 'acid_thgrid', label: 'THGRID', color: '#a5f3fc', type: 'acid' })
  if (cloudEnabled) activeEffects.push({ id: 'acid_cloud', label: 'CLOUD', color: '#f0abfc', type: 'acid' })
  if (ledEnabled) activeEffects.push({ id: 'acid_led', label: 'LED', color: '#c084fc', type: 'acid' })
  if (slitEnabled) activeEffects.push({ id: 'acid_slit', label: 'SLIT', color: '#a78bfa', type: 'acid' })
  if (voronoiEnabled) activeEffects.push({ id: 'acid_voronoi', label: 'VORONOI', color: '#818cf8', type: 'acid' })

  const hasActiveEffects = activeEffects.length > 0

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)' }}
    >
      {/* Show active effects summary when no specific selection and effects are active */}
      {!infoPanelSelection && hasActiveEffects && <ActiveEffectsSummary effects={activeEffects} />}
      {!infoPanelSelection && !hasActiveEffects && <EmptyInfoContent />}
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
// ACTIVE EFFECT TYPE
// ============================================================================

interface ActiveEffect {
  id: string
  label: string
  color: string
  type: 'glitch' | 'acid'
}

// ============================================================================
// ACTIVE EFFECTS SUMMARY
// ============================================================================

function ActiveEffectsSummary({ effects }: { effects: ActiveEffect[] }) {
  const [expandedEffect, setExpandedEffect] = useState<string | null>(null)

  return (
    <>
      <div
        className="flex items-center justify-between px-3 py-1.5"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: 'var(--accent)', boxShadow: '0 0 4px var(--accent-glow)' }}
          />
          <span
            className="text-[9px] font-medium uppercase tracking-widest"
            style={{ color: 'var(--text-ghost)' }}
          >
            Active
          </span>
        </div>
        <span
          className="text-[9px] font-medium px-1 py-0.5 rounded-sm"
          style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
        >
          {effects.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-2 py-1.5 space-y-0.5">
          {effects.map((effect) => (
            <EffectMiniControl
              key={effect.id}
              effect={effect}
              isExpanded={expandedEffect === effect.id}
              onToggle={() => setExpandedEffect(expandedEffect === effect.id ? null : effect.id)}
            />
          ))}
        </div>
      </div>
    </>
  )
}

function EffectMiniControl({ effect, isExpanded, onToggle }: { effect: ActiveEffect; isExpanded: boolean; onToggle: () => void }) {
  const glitch = useGlitchEngineStore()
  const acid = useAcidStore()

  // Get the primary parameter value and setter based on effect id
  const { value, setValue, min, max, paramName } = getEffectParam(effect.id, glitch, acid)

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(parseFloat(e.target.value))
  }

  return (
    <div
      className="rounded-sm overflow-hidden transition-colors"
      style={{ backgroundColor: isExpanded ? 'var(--bg-elevated)' : 'transparent' }}
    >
      {/* Header row - always visible */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-1.5 px-2 py-1 text-left hover:bg-[var(--bg-hover)] rounded-sm transition-colors"
      >
        <div
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: 'var(--accent)', boxShadow: '0 0 4px var(--accent-glow)' }}
        />
        <span className="text-[10px] font-medium flex-1" style={{ color: 'var(--text-secondary)' }}>
          {effect.label}
        </span>
        <span className="text-[10px] tabular-nums" style={{ color: 'var(--accent)' }}>
          {typeof value === 'number' ? Math.round(value) : '—'}
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{
            color: 'var(--text-ghost)',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease',
          }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Expanded controls */}
      {isExpanded && (
        <div className="px-2 pb-1.5 pt-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase tracking-wider w-10" style={{ color: 'var(--text-ghost)' }}>
              {paramName}
            </span>
            <input
              type="range"
              min={min}
              max={max}
              step={(max - min) / 100}
              value={value}
              onChange={handleSliderChange}
              className="flex-1 h-1 rounded-sm appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${((value - min) / (max - min)) * 100}%, var(--bg-hover) ${((value - min) / (max - min)) * 100}%, var(--bg-hover) 100%)`,
              }}
            />
            <span className="text-[10px] tabular-nums w-7 text-right" style={{ color: 'var(--accent)' }}>
              {Math.round(value)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// Get parameter info for an effect
function getEffectParam(effectId: string, glitch: ReturnType<typeof useGlitchEngineStore.getState>, acid: ReturnType<typeof useAcidStore.getState>) {
  const effectDef = EFFECTS.find(e => e.id === effectId)
  const min = effectDef?.min ?? 0
  const max = effectDef?.max ?? 100

  switch (effectId) {
    // Glitch effects - use correct property names from effect types
    case 'rgb_split': return { value: glitch.rgbSplit.amount, setValue: (v: number) => useGlitchEngineStore.setState({ rgbSplit: { ...glitch.rgbSplit, amount: v } }), min, max, paramName: 'Amount' }
    case 'chromatic': return { value: glitch.chromaticAberration.intensity, setValue: (v: number) => useGlitchEngineStore.setState({ chromaticAberration: { ...glitch.chromaticAberration, intensity: v } }), min, max, paramName: 'Intensity' }
    case 'posterize': return { value: glitch.posterize.levels, setValue: (v: number) => useGlitchEngineStore.setState({ posterize: { ...glitch.posterize, levels: v } }), min, max, paramName: 'Levels' }
    case 'color_grade': return { value: glitch.colorGrade.saturation * 100, setValue: (v: number) => useGlitchEngineStore.setState({ colorGrade: { ...glitch.colorGrade, saturation: v / 100 } }), min: 0, max: 200, paramName: 'Sat' }
    case 'block_displace': return { value: glitch.blockDisplace.displaceDistance * 100, setValue: (v: number) => useGlitchEngineStore.setState({ blockDisplace: { ...glitch.blockDisplace, displaceDistance: v / 100 } }), min, max, paramName: 'Distance' }
    case 'static_displace': return { value: glitch.staticDisplacement.intensity * 100, setValue: (v: number) => useGlitchEngineStore.setState({ staticDisplacement: { ...glitch.staticDisplacement, intensity: v / 100 } }), min, max, paramName: 'Intensity' }
    case 'pixelate': return { value: glitch.pixelate.pixelSize, setValue: (v: number) => useGlitchEngineStore.setState({ pixelate: { ...glitch.pixelate, pixelSize: v } }), min, max, paramName: 'Size' }
    case 'lens': return { value: glitch.lensDistortion.curvature * 100, setValue: (v: number) => useGlitchEngineStore.setState({ lensDistortion: { ...glitch.lensDistortion, curvature: v / 100 } }), min, max, paramName: 'Curve' }
    case 'scan_lines': return { value: glitch.scanLines.lineCount, setValue: (v: number) => useGlitchEngineStore.setState({ scanLines: { ...glitch.scanLines, lineCount: v } }), min, max, paramName: 'Count' }
    case 'vhs': return { value: glitch.vhsTracking.tearIntensity * 100, setValue: (v: number) => useGlitchEngineStore.setState({ vhsTracking: { ...glitch.vhsTracking, tearIntensity: v / 100 } }), min, max, paramName: 'Tear' }
    case 'noise': return { value: glitch.noise.amount, setValue: (v: number) => useGlitchEngineStore.setState({ noise: { ...glitch.noise, amount: v } }), min, max, paramName: 'Amount' }
    case 'dither': return { value: glitch.dither.scale, setValue: (v: number) => useGlitchEngineStore.setState({ dither: { ...glitch.dither, scale: v } }), min, max, paramName: 'Scale' }
    case 'edges': return { value: glitch.edgeDetection.threshold, setValue: (v: number) => useGlitchEngineStore.setState({ edgeDetection: { ...glitch.edgeDetection, threshold: v } }), min, max, paramName: 'Threshold' }
    case 'feedback': return { value: glitch.feedbackLoop.decay * 100, setValue: (v: number) => useGlitchEngineStore.setState({ feedbackLoop: { ...glitch.feedbackLoop, decay: v / 100 } }), min: 0, max: 100, paramName: 'Decay' }

    // Acid effects - use nested params objects
    case 'acid_dots': return { value: acid.dotsParams.gridSize, setValue: (v: number) => useAcidStore.setState({ dotsParams: { ...acid.dotsParams, gridSize: v } }), min, max, paramName: 'Grid' }
    case 'acid_glyph': return { value: acid.glyphParams.gridSize, setValue: (v: number) => useAcidStore.setState({ glyphParams: { ...acid.glyphParams, gridSize: v } }), min, max, paramName: 'Grid' }
    case 'acid_icons': return { value: acid.iconsParams.gridSize, setValue: (v: number) => useAcidStore.setState({ iconsParams: { ...acid.iconsParams, gridSize: v } }), min, max, paramName: 'Grid' }
    case 'acid_contour': return { value: acid.contourParams.levels, setValue: (v: number) => useAcidStore.setState({ contourParams: { ...acid.contourParams, levels: v } }), min, max, paramName: 'Levels' }
    case 'acid_decomp': return { value: acid.decompParams.maxBlock, setValue: (v: number) => useAcidStore.setState({ decompParams: { ...acid.decompParams, maxBlock: v } }), min, max, paramName: 'Block' }
    case 'acid_mirror': return { value: acid.mirrorParams.segments, setValue: (v: number) => useAcidStore.setState({ mirrorParams: { ...acid.mirrorParams, segments: v } }), min, max, paramName: 'Segments' }
    case 'acid_slice': return { value: acid.sliceParams.sliceCount, setValue: (v: number) => useAcidStore.setState({ sliceParams: { ...acid.sliceParams, sliceCount: v } }), min, max, paramName: 'Slices' }
    case 'acid_thgrid': return { value: acid.thGridParams.threshold * 255, setValue: (v: number) => useAcidStore.setState({ thGridParams: { ...acid.thGridParams, threshold: v / 255 } }), min, max, paramName: 'Thresh' }
    case 'acid_cloud': return { value: acid.cloudParams.density, setValue: (v: number) => useAcidStore.setState({ cloudParams: { ...acid.cloudParams, density: v } }), min, max, paramName: 'Density' }
    case 'acid_led': return { value: acid.ledParams.gridSize, setValue: (v: number) => useAcidStore.setState({ ledParams: { ...acid.ledParams, gridSize: v } }), min, max, paramName: 'Grid' }
    case 'acid_slit': return { value: acid.slitParams.speed, setValue: (v: number) => useAcidStore.setState({ slitParams: { ...acid.slitParams, speed: v } }), min, max, paramName: 'Speed' }
    case 'acid_voronoi': return { value: acid.voronoiParams.cellCount, setValue: (v: number) => useAcidStore.setState({ voronoiParams: { ...acid.voronoiParams, cellCount: v } }), min, max, paramName: 'Cells' }

    default: return { value: 50, setValue: () => {}, min: 0, max: 100, paramName: 'Value' }
  }
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyInfoContent() {
  return (
    <>
      <div
        className="flex items-center px-3 py-1.5"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <span
          className="text-[9px] font-medium uppercase tracking-widest"
          style={{ color: 'var(--text-ghost)' }}
        >
          Inspector
        </span>
      </div>
      <div className="px-3 py-3">
        <div className="text-[10px] space-y-2" style={{ color: 'var(--text-muted)' }}>
          {/* Effect hint */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-sm flex items-center justify-center" style={{ backgroundColor: 'var(--bg-elevated)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-ghost)" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
              </svg>
            </div>
            <span>Enable effects for controls</span>
          </div>

          {/* Track hint */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-sm flex items-center justify-center" style={{ backgroundColor: 'var(--bg-elevated)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-ghost)" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
            </div>
            <span>Click track for settings</span>
          </div>

          {/* Routing hint */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-sm flex items-center justify-center" style={{ backgroundColor: 'var(--bg-elevated)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-ghost)" strokeWidth="2">
                <circle cx="5" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
                <path d="M7 12h10" />
              </svg>
            </div>
            <span>Click routing to adjust</span>
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
      className="flex items-center justify-between px-3 py-1.5"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-2">
        {color && (
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: 'var(--accent)', boxShadow: '0 0 4px var(--accent-glow)' }}
          />
        )}
        <span
          className="text-[9px] font-medium uppercase tracking-widest"
          style={{ color: 'var(--text-ghost)' }}
        >
          {title}
        </span>
      </div>
      <button
        onClick={onClose}
        className="w-4 h-4 flex items-center justify-center rounded-sm hover:bg-[var(--bg-hover)]"
        style={{ color: 'var(--text-ghost)' }}
      >
        <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
          <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[9px] font-medium uppercase tracking-widest mb-1"
      style={{ color: 'var(--text-ghost)' }}
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
      <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <SectionLabel>Length</SectionLabel>
        <div className="flex gap-1">
          {LENGTH_PRESETS.map((length) => (
            <button
              key={length}
              onClick={() => handleLengthChange(length)}
              className="flex-1 h-6 text-[11px] font-medium rounded-full transition-colors"
              style={{
                backgroundColor: track.length === length ? track.color : 'var(--bg-surface)',
                color: track.length === length ? '#ffffff' : 'var(--text-muted)',
                border: '1px solid',
                borderColor: track.length === length ? track.color : 'var(--border)',
              }}
            >
              {length}
            </button>
          ))}
        </div>
      </div>

      {/* Mode */}
      <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <SectionLabel>Mode</SectionLabel>
        <div className="flex gap-1">
          {MODE_OPTIONS.map(({ mode, label }) => (
            <button
              key={mode}
              onClick={() => handleModeChange(mode)}
              className="w-9 h-7 text-[14px] font-mono rounded transition-colors"
              style={{
                backgroundColor: track.modeOverride === mode ? track.color : 'var(--bg-surface)',
                color: track.modeOverride === mode ? '#ffffff' : 'var(--text-muted)',
                border: '1px solid',
                borderColor: track.modeOverride === mode ? track.color : 'var(--border)',
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
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border)',
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
          <div className="text-[12px] py-2" style={{ color: 'var(--text-muted)' }}>
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
        <div className="space-y-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-muted)' }}>Page</span>
            <span>{pageName}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-muted)' }}>ID</span>
            <span className="font-mono">{effect.id}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-muted)' }}>Range</span>
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
      <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <SectionLabel>Probability</SectionLabel>
        <StepSlider
          value={step.probability}
          onChange={(v) => handleStepUpdate({ probability: v })}
          color={track.color}
        />
      </div>

      {/* Gate Length */}
      <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <SectionLabel>Gate Length</SectionLabel>
        <StepSlider
          value={step.gateLength}
          onChange={(v) => handleStepUpdate({ gateLength: v })}
          color={track.color}
        />
      </div>

      {/* Ratchet */}
      <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <SectionLabel>Ratchet</SectionLabel>
        <div className="flex gap-1">
          {([1, 2, 3, 4, 6, 8] as const).map((div) => (
            <button
              key={div}
              onClick={() => handleStepUpdate({ ratchetDivision: div })}
              className="flex-1 h-6 text-[11px] font-medium rounded transition-colors"
              style={{
                backgroundColor: step.ratchetDivision === div ? track.color : 'var(--bg-surface)',
                color: step.ratchetDivision === div ? '#ffffff' : 'var(--text-muted)',
                border: '1px solid',
                borderColor: step.ratchetDivision === div ? track.color : 'var(--border)',
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
                backgroundColor: step.velocityCurve === curve ? track.color : 'var(--bg-surface)',
                color: step.velocityCurve === curve ? '#ffffff' : 'var(--text-muted)',
                border: '1px solid',
                borderColor: step.velocityCurve === curve ? track.color : 'var(--border)',
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
      <span className="text-[11px] w-8 text-right tabular-nums" style={{ color: 'var(--text-muted)' }}>
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

      <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <SectionLabel>Connection</SectionLabel>
        <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
          <span style={{ color: track.color, fontWeight: 500 }}>{track.name}</span>
          <span style={{ color: 'var(--text-muted)' }}> → </span>
          <span>{formatParamName(routing.targetParam)}</span>
        </div>
      </div>

      <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
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
        <Button
          size="sm"
          className="w-full"
          onClick={() => {
            removeRouting(routing.id)
            onClose()
          }}
        >
          Remove Routing
        </Button>
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
        <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
          <div
            className="w-full aspect-video rounded overflow-hidden"
            style={{ backgroundColor: 'var(--border)' }}
          >
            <img src={preset.thumbnail} alt={preset.name} className="w-full h-full object-cover" />
          </div>
        </div>
      )}

      <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <SectionLabel>Details</SectionLabel>
        <div className="space-y-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-muted)' }}>Created</span>
            <span>{formatDate(preset.createdAt)}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-muted)' }}>Updated</span>
            <span>{formatDate(preset.updatedAt)}</span>
          </div>
        </div>
      </div>

      <div className="px-3 py-2 flex gap-2">
        <Button
          size="sm"
          variant="active"
          className="flex-1"
          onClick={() => {
            loadPreset(preset.id)
            onClose()
          }}
        >
          Load
        </Button>
        <Button
          size="sm"
          onClick={() => {
            if (confirm(`Delete "${preset.name}"?`)) {
              deletePreset(preset.id)
              onClose()
            }
          }}
        >
          Delete
        </Button>
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
        <span className="text-[12px] flex-1 truncate" style={{ color: 'var(--text-muted)' }}>
          {formatParamName(targetParam)}
        </span>
      )}

      <div className={`${showLabel ? 'w-16' : 'flex-1'} h-2 bg-gray-200 rounded relative overflow-hidden`}>
        <div
          className="absolute top-0 bottom-0 w-px"
          style={{ left: '50%', backgroundColor: 'var(--border)' }}
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
        style={{ color: 'var(--text-muted)' }}
      >
        {Math.round(depth * 100)}%
      </span>
    </div>
  )
}
