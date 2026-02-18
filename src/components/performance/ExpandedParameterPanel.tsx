import { useState, useEffect, useCallback, useRef } from 'react'
import { useUIStore } from '../../stores/uiStore'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { useAsciiRenderStore } from '../../stores/asciiRenderStore'
import { useStippleStore } from '../../stores/stippleStore'
import { useContourStore } from '../../stores/contourStore'
import { useLandmarksStore } from '../../stores/landmarksStore'
import { useVisionTrackingStore } from '../../stores/visionTrackingStore'
import { useAcidStore } from '../../stores/acidStore'
import { useStrandStore } from '../../stores/strandStore'
import { useMotionStore } from '../../stores/motionStore'
import { useDestructionStore } from '../../stores/destructionStore'
import { useRoutingStore } from '../../stores/routingStore'
import { useTextureOverlayStore } from '../../stores/textureOverlayStore'
import { useDataOverlayStore } from '../../stores/dataOverlayStore'
import { useEffectSequencerStore } from '../../stores/effectSequencerStore'
import { EFFECT_PARAM_REGISTRY } from '../../config/effectParams'
import { EFFECTS, STRAND_EFFECTS, MOTION_EFFECTS, DESTRUCTION_EFFECTS } from '../../config/effects'
import { SliderRow, ToggleRow, SelectRow, ColorRow, SegmentedRow, StepperRow } from './controls'
import { classifyParam } from '../../utils/classifyParam'
import type { LockableParam } from '../../config/effectParams'
import { TEXTURE_LIBRARY, type TextureId } from '../overlays/TextureOverlay'
import { PresetDropdownBar } from '../presets/PresetDropdownBar'
import type { BlendMode } from '../../stores/textureOverlayStore'
import type { Template, FontFamily, WatermarkPosition } from '../../stores/dataOverlayStore'

// ─── Horizontal Slider for parameter panel ────────────────────────────────
function HorizontalSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  paramId,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  paramId?: string
}) {
  const automationParam = useEffectSequencerStore((s) => s.automationParam)
  const setAutomationParam = useEffectSequencerStore((s) => s.setAutomationParam)
  const isAutomationTarget = paramId != null && automationParam?.fullParamId === paramId

  const normalized = (value - min) / (max - min)
  const displayValue = step >= 1 ? value.toFixed(0) : value.toFixed(2)

  const trackRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const didDrag = useRef(false)

  // Click-to-edit state
  const [isEditing, setIsEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const applyFromPointer = useCallback((clientX: number) => {
    if (!trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    let newValue = min + ratio * (max - min)
    if (step) newValue = Math.round(newValue / step) * step
    newValue = Math.max(min, Math.min(max, newValue))
    onChange(newValue)
  }, [min, max, step, onChange])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    isDragging.current = true
    didDrag.current = false
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    applyFromPointer(e.clientX)
  }, [applyFromPointer])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return
    didDrag.current = true
    applyFromPointer(e.clientX)
  }, [applyFromPointer])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return
    isDragging.current = false
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {}

    // Click (no drag) on the slider label area → select as automation target
    if (!didDrag.current && paramId) {
      const parts = paramId.split('.')
      if (parts.length === 2) {
        setAutomationParam({
          effectId: parts[0],
          paramId: parts[1],
          fullParamId: paramId,
          label,
          min, max, step,
        })
      }
    }
  }, [paramId, label, min, max, step, setAutomationParam])

  const commitEdit = useCallback((raw: string) => {
    const parsed = parseFloat(raw)
    if (!isNaN(parsed)) {
      let clamped = Math.max(min, Math.min(max, parsed))
      if (step) clamped = Math.round(clamped / step) * step
      onChange(clamped)
    }
    setIsEditing(false)
  }, [min, max, step, onChange])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.select()
    }
  }, [isEditing])

  return (
    <div
      className="flex items-center gap-2"
      style={{
        borderLeft: isAutomationTarget ? '2px solid #FF4060' : '2px solid transparent',
        paddingLeft: 4,
      }}
    >
      {/* Label */}
      <span
        className="text-[10px] font-medium uppercase tracking-wider flex-shrink-0 cursor-pointer"
        style={{
          color: isAutomationTarget ? '#FF4060' : 'var(--text-secondary)',
          width: 52,
        }}
        onClick={() => {
          if (!paramId) return
          const parts = paramId.split('.')
          if (parts.length === 2) {
            setAutomationParam({
              effectId: parts[0],
              paramId: parts[1],
              fullParamId: paramId,
              label, min, max, step,
            })
          }
        }}
      >
        {label}
      </span>

      {/* Slider track */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="flex-1 relative cursor-pointer touch-none select-none"
        style={{ height: 18, borderRadius: 3 }}
      >
        {/* Background track */}
        <div
          className="absolute inset-0 rounded-sm"
          style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
        />
        {/* Fill */}
        <div
          className="absolute top-0 bottom-0 left-0 rounded-sm"
          style={{
            width: `${normalized * 100}%`,
            backgroundColor: isAutomationTarget ? '#FF406040' : 'var(--accent-dim)',
            transition: isDragging.current ? 'none' : 'width 0.05s',
          }}
        />
      </div>

      {/* Value — click to edit */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          defaultValue={displayValue}
          className="text-[9px] tabular-nums flex-shrink-0 text-right"
          style={{
            width: 38,
            color: 'var(--text-primary)',
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--accent)',
            borderRadius: 2,
            padding: '0 2px',
            outline: 'none',
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitEdit(e.currentTarget.value)
            if (e.key === 'Escape') setIsEditing(false)
          }}
          onBlur={(e) => commitEdit(e.currentTarget.value)}
        />
      ) : (
        <span
          className="text-[9px] tabular-nums flex-shrink-0 text-right cursor-pointer"
          style={{ color: 'var(--text-muted)', width: 38 }}
          onClick={() => setIsEditing(true)}
        >
          {displayValue}
        </span>
      )}
    </div>
  )
}

export function ExpandedParameterPanel() {
  const { selectedEffectId } = useUIStore()
  const [lastEffectId, setLastEffectId] = useState<string | null>(null)

  // Sticky selection: remember last selected effect
  useEffect(() => {
    if (selectedEffectId) {
      setLastEffectId(selectedEffectId)
    }
  }, [selectedEffectId])

  const effectId = selectedEffectId || lastEffectId
  const effect = EFFECTS.find((e) => e.id === effectId) || STRAND_EFFECTS.find((e) => e.id === effectId) || MOTION_EFFECTS.find((e) => e.id === effectId) || DESTRUCTION_EFFECTS.find((e) => e.id === effectId)

  if (!effectId || !effect) {
    return (
      <div className="h-full flex flex-col border-l" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        {/* Presets */}
        <PresetDropdownBar />
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[14px]" style={{ color: 'var(--text-muted)' }}>Select an effect</span>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col border-l" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
      {/* Presets */}
      <PresetDropdownBar />

      {/* Header */}
      <div
        className="flex items-center border-b"
        style={{
          borderColor: 'var(--border)',
          backgroundColor: 'var(--bg-surface)',
          padding: 'var(--panel-padding-sm) var(--panel-padding)',
          gap: 'var(--gap-sm)',
        }}
      >
        <div
          className="w-2 h-2 rounded-full"
          style={{
            backgroundColor: effect.color,
            boxShadow: `0 0 6px ${effect.color}`,
          }}
        />
        <span className="text-[14px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>
          {effect.label}
        </span>
      </div>

      {/* Parameters - scrollable */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ padding: 'var(--panel-padding-sm) var(--panel-padding)' }}
      >
        <EffectParameters effectId={effectId} />
        <TextureOverlaySection />
        <DataOverlaySection />
      </div>
    </div>
  )
}

export function EffectParameters({ effectId }: { effectId: string }) {
  // Force re-render when any store changes (subscribe to all stores for reactivity)
  useGlitchEngineStore()
  useAsciiRenderStore()
  useStippleStore()
  useContourStore()
  useLandmarksStore()
  useVisionTrackingStore()
  useAcidStore()
  useStrandStore()
  useMotionStore()
  useDestructionStore()
  useTextureOverlayStore()
  useDataOverlayStore()

  const entry = EFFECT_PARAM_REGISTRY[effectId]
  if (!entry) {
    return (
      <div className="text-[14px] text-gray-400 py-4 text-center">
        No parameters available
      </div>
    )
  }

  const params = entry.getParams()
  const selectParams = entry.getSelectParams?.() ?? []

  // Classify each numeric param
  const sliders: LockableParam[] = []
  const knobs: LockableParam[] = []
  const steppers: LockableParam[] = []
  const toggles: LockableParam[] = []

  for (const p of params) {
    const type = classifyParam(p)
    if (type === 'slider') sliders.push(p)
    else if (type === 'stepper') steppers.push(p)
    else if (type === 'toggle') toggles.push(p)
    else knobs.push(p)
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Primary sliders — full width, stacked */}
      {sliders.map((param) => (
        <HorizontalSlider
          key={param.id}
          label={param.label}
          value={param.read()}
          min={param.min}
          max={param.max}
          step={param.step}
          onChange={(v) => param.apply(v)}
          paramId={`${effectId}.${param.id}`}
        />
      ))}

      {/* Knobs + steppers — flex-wrap row, dense */}
      {(knobs.length > 0 || steppers.length > 0) && (
        <div className="flex flex-wrap gap-x-4 gap-y-3 items-start">
          {knobs.map((param) => (
            <SliderRow
              key={param.id}
              label={param.label}
              value={param.read()}
              min={param.min}
              max={param.max}
              step={param.step}
              onChange={(v) => param.apply(v)}
              paramId={`${effectId}.${param.id}`}
            />
          ))}
          {steppers.map((param) => (
            <StepperRow
              key={param.id}
              label={param.label}
              value={param.read()}
              min={param.min}
              max={param.max}
              step={param.step}
              onChange={(v) => param.apply(v)}
              paramId={`${effectId}.${param.id}`}
            />
          ))}
        </div>
      )}

      {/* Segmented buttons — full width each */}
      {selectParams.length > 0 && (
        <div className="flex flex-col gap-2 pt-1">
          {selectParams.map((param) => (
            <SegmentedRow
              key={param.id}
              label={param.label}
              value={param.read()}
              options={param.options}
              onChange={(v) => param.apply(v)}
              paramId={`${effectId}.${param.id}`}
            />
          ))}
        </div>
      )}

      {/* Toggles — inline flex row */}
      {toggles.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-3 items-start pt-1">
          {toggles.map((param) => (
            <ToggleRow
              key={param.id}
              label={param.label}
              value={param.read() >= 0.5}
              onChange={(v) => param.apply(v ? 1 : 0)}
              paramId={`${effectId}.${param.id}`}
            />
          ))}
        </div>
      )}

      {/* Extra controls not in the registry (colors, trace masks, custom grids) */}
      <EffectExtras effectId={effectId} />
    </div>
  )

}


// ─── Trace Mask options (shared across glitch effects) ──────────────────
const TRACE_MASK_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'track_bright', label: 'Bright' },
  { value: 'track_motion', label: 'Motion' },
  { value: 'track_edge', label: 'Edge' },
  { value: 'track_color', label: 'Color' },
]

// ─── Vision tracking display controls (shared pattern) ─────────────────
function VisionTrackingExtras({
  params,
  updateParams,
  traceParams,
  updateTraceParams,
  linesOnly,
  setLinesOnly,
  fillMode,
}: {
  params: { showBoxes: boolean; showLines: boolean; showLabels: boolean; boxShape: string; lineStyle: string; boxColor: string; boxFilter: string }
  updateParams: (p: Record<string, any>) => void
  traceParams: { trailEnabled: boolean; fillMode?: string }
  updateTraceParams: (p: Record<string, any>) => void
  linesOnly: boolean
  setLinesOnly: (v: boolean) => void
  fillMode?: { options: { value: string; label: string }[] }
}) {
  return (
    <>
      <SectionLabel label="Display" />
      <div className="flex flex-wrap gap-x-4 gap-y-3 items-start">
        <ToggleRow label="Boxes" value={params.showBoxes} onChange={(v) => updateParams({ showBoxes: v })} />
        <ToggleRow label="Lines" value={params.showLines} onChange={(v) => updateParams({ showLines: v })} />
        <ToggleRow label="Labels" value={params.showLabels} onChange={(v) => updateParams({ showLabels: v })} />
      </div>
      <BoxShapeButtonGrid value={params.boxShape} onChange={(v) => updateParams({ boxShape: v })} />
      <LineStyleButtonGrid value={params.lineStyle} onChange={(v) => updateParams({ lineStyle: v })} />
      <ColorRow label="Box Color" value={params.boxColor} onChange={(v) => updateParams({ boxColor: v })} />
      <SectionLabel label="Box Filter" />
      <FilterButtonGrid value={params.boxFilter} onChange={(v) => updateParams({ boxFilter: v })} />
      <SectionLabel label="Global" />
      <ToggleRow label="Lines Only" value={linesOnly} onChange={setLinesOnly} />
      <SectionLabel label="GPU Trace" />
      <ToggleRow label="Trail" value={traceParams.trailEnabled} onChange={(v) => updateTraceParams({ trailEnabled: v })} />
      {fillMode && traceParams.fillMode !== undefined && (
        <SelectRow
          label="Fill Mode"
          value={traceParams.fillMode}
          options={fillMode.options}
          onChange={(v) => updateTraceParams({ fillMode: v })}
        />
      )}
    </>
  )
}

// ─── Extra controls per effect (not in registry) ───────────────────────
function EffectExtras({ effectId }: { effectId: string }) {
  const glitch = useGlitchEngineStore()
  const contour = useContourStore()
  const stipple = useStippleStore()
  const landmarks = useLandmarksStore()
  const visionTracking = useVisionTrackingStore()
  const routing = useRoutingStore()

  switch (effectId) {
    case 'edges':
      return (
        <>
          <ColorRow label="Edge Color" value={glitch.edgeDetection.edgeColor} onChange={(v) => glitch.updateEdgeDetection({ edgeColor: v })} />
        </>
      )

    case 'rgb_split':
      return (
        <>
          <SectionLabel label="Trace Mask" />
          <SelectRow label="Mask" value={routing.getEffectTraceMask('rgb_split')} options={TRACE_MASK_OPTIONS} onChange={(v) => routing.setEffectTraceMask('rgb_split', v)} />
        </>
      )

    case 'block_displace':
      return (
        <>
          <ToggleRow label="Animated" value={glitch.blockDisplace.animated} onChange={(v) => glitch.updateBlockDisplace({ animated: v })} />
          <SectionLabel label="Trace Mask" />
          <SelectRow label="Mask" value={routing.getEffectTraceMask('block_displace')} options={TRACE_MASK_OPTIONS} onChange={(v) => routing.setEffectTraceMask('block_displace', v)} />
        </>
      )

    case 'color_grade':
      return (
        <>
          <ColorRow label="Tint Color" value={glitch.colorGrade.tintColor} onChange={(v) => glitch.updateColorGrade({ tintColor: v })} />
        </>
      )

    case 'contour':
      return (
        <>
          <ColorRow label="Color" value={contour.params.color} onChange={(v) => contour.updateParams({ color: v })} />
          <ColorRow label="Glow" value={contour.params.glowColor} onChange={(v) => contour.updateParams({ glowColor: v })} />
        </>
      )

    case 'stipple':
      return (
        <>
          <div className="flex flex-wrap gap-x-4 gap-y-3 items-start">
            <ToggleRow label="Animated" value={stipple.params.animated} onChange={(v) => stipple.updateParams({ animated: v })} />
            <ToggleRow label="Breathe" value={stipple.params.breathe} onChange={(v) => stipple.updateParams({ breathe: v })} />
          </div>
        </>
      )

    case 'landmarks':
      return (
        <>
          <ToggleRow label="Attach" value={landmarks.attachToDetections} onChange={(v) => landmarks.setAttachToDetections(v)} />
        </>
      )

    case 'datamosh':
      return (
        <>
          <SectionLabel label="Trace Mask" />
          <SelectRow label="Mask" value={routing.getEffectTraceMask('datamosh')} options={TRACE_MASK_OPTIONS} onChange={(v) => routing.setEffectTraceMask('datamosh', v)} />
        </>
      )

    case 'track_bright':
      return (
        <VisionTrackingExtras
          params={visionTracking.brightParams}
          updateParams={(p) => visionTracking.updateBrightParams(p)}
          traceParams={visionTracking.brightTraceParams}
          updateTraceParams={(p) => visionTracking.updateBrightTraceParams(p)}
          linesOnly={visionTracking.linesOnly}
          setLinesOnly={(v) => visionTracking.setLinesOnly(v)}
        />
      )

    case 'track_edge':
      return (
        <VisionTrackingExtras
          params={visionTracking.edgeParams}
          updateParams={(p) => visionTracking.updateEdgeParams(p)}
          traceParams={visionTracking.edgeTraceParams}
          updateTraceParams={(p) => visionTracking.updateEdgeTraceParams(p)}
          linesOnly={visionTracking.linesOnly}
          setLinesOnly={(v) => visionTracking.setLinesOnly(v)}
        />
      )

    case 'track_color':
      return (
        <>
          <ColorRow label="Target" value={visionTracking.colorParams.targetColor} onChange={(v) => visionTracking.updateColorParams({ targetColor: v })} />
          <VisionTrackingExtras
            params={visionTracking.colorParams}
            updateParams={(p) => visionTracking.updateColorParams(p)}
            traceParams={visionTracking.colorTraceParams}
            updateTraceParams={(p) => visionTracking.updateColorTraceParams(p)}
            linesOnly={visionTracking.linesOnly}
            setLinesOnly={(v) => visionTracking.setLinesOnly(v)}
          />
        </>
      )

    case 'track_motion':
      return (
        <VisionTrackingExtras
          params={visionTracking.motionParams}
          updateParams={(p) => visionTracking.updateMotionParams(p)}
          traceParams={visionTracking.motionTraceParams}
          updateTraceParams={(p) => visionTracking.updateMotionTraceParams(p)}
          linesOnly={visionTracking.linesOnly}
          setLinesOnly={(v) => visionTracking.setLinesOnly(v)}
        />
      )

    case 'track_face':
      return (
        <VisionTrackingExtras
          params={visionTracking.faceParams}
          updateParams={(p) => visionTracking.updateFaceParams(p)}
          traceParams={visionTracking.faceTraceParams}
          updateTraceParams={(p) => visionTracking.updateFaceTraceParams(p)}
          linesOnly={visionTracking.linesOnly}
          setLinesOnly={(v) => visionTracking.setLinesOnly(v)}
          fillMode={{ options: [{ value: 'oval', label: 'Oval' }, { value: 'mesh', label: 'Mesh' }, { value: 'bbox', label: 'Bbox' }] }}
        />
      )

    case 'track_hands':
      return (
        <VisionTrackingExtras
          params={visionTracking.handsParams}
          updateParams={(p) => visionTracking.updateHandsParams(p)}
          traceParams={visionTracking.handsTraceParams}
          updateTraceParams={(p) => visionTracking.updateHandsTraceParams(p)}
          linesOnly={visionTracking.linesOnly}
          setLinesOnly={(v) => visionTracking.setLinesOnly(v)}
          fillMode={{ options: [{ value: 'hull', label: 'Hull' }, { value: 'skeleton', label: 'Skeleton' }, { value: 'bbox', label: 'Bbox' }] }}
        />
      )

    default:
      return null
  }
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div
      className="w-full text-[9px] font-semibold uppercase tracking-wider pt-2 pb-0.5 border-t mt-1 first:mt-0 first:border-0 first:pt-0"
      style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}
    >
      {label}
    </div>
  )
}

const BOX_FILTER_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'pixel', label: 'Pixel' },
  { value: 'invert', label: 'Invert' },
  { value: 'blur', label: 'Blur' },
  { value: 'thermal', label: 'Thermal' },
  { value: 'edge', label: 'Edge' },
  { value: 'gray', label: 'Gray' },
  { value: 'saturate', label: 'Sat' },
] as const

type BoxFilterValue = 'none' | 'pixel' | 'invert' | 'blur' | 'thermal' | 'edge' | 'grayscale' | 'saturate'

function FilterButtonGrid({ value, onChange }: { value: string; onChange: (v: BoxFilterValue) => void }) {
  return (
    <div className="grid grid-cols-4 gap-1 py-1">
      {BOX_FILTER_OPTIONS.map((opt) => {
        const actualValue = opt.value === 'gray' ? 'grayscale' : opt.value
        const isActive = value === actualValue || (opt.value === 'gray' && value === 'grayscale')
        return (
          <button
            key={opt.value}
            onClick={() => onChange(actualValue as BoxFilterValue)}
            className="px-1 py-1.5 text-[12px] font-medium uppercase rounded transition-colors"
            style={{
              backgroundColor: isActive ? 'var(--accent)' : 'var(--bg-surface)',
              color: isActive ? 'var(--bg-surface)' : 'var(--text-muted)',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// BOX SHAPE BUTTON GRID
// ═══════════════════════════════════════════════════════════════

const BOX_SHAPE_OPTIONS = [
  { value: 'square', label: '▢' },
  { value: 'circle', label: '○' },
  { value: 'dynamic', label: '◇' },
] as const

type BoxShapeValue = 'circle' | 'square' | 'dynamic'

function BoxShapeButtonGrid({ value, onChange }: { value: string; onChange: (v: BoxShapeValue) => void }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="text-[14px] w-20 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>Shape</span>
      <div className="flex gap-1 flex-1">
        {BOX_SHAPE_OPTIONS.map((opt) => {
          const isActive = value === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value as BoxShapeValue)}
              className="flex-1 px-2 py-1.5 text-[13px] font-medium rounded transition-colors"
              style={{
                backgroundColor: isActive ? 'var(--accent)' : 'var(--bg-surface)',
                color: isActive ? 'var(--bg-surface)' : 'var(--text-muted)',
              }}
              title={opt.value.charAt(0).toUpperCase() + opt.value.slice(1)}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// LINE STYLE BUTTON GRID
// ═══════════════════════════════════════════════════════════════

const LINE_STYLE_OPTIONS = [
  { value: 'straight', label: '—' },
  { value: 'web', label: '∿' },
] as const

type LineStyleValue = 'straight' | 'web'

function LineStyleButtonGrid({ value, onChange }: { value: string; onChange: (v: LineStyleValue) => void }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="text-[14px] w-20 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>Lines</span>
      <div className="flex gap-1 flex-1">
        {LINE_STYLE_OPTIONS.map((opt) => {
          const isActive = value === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value as LineStyleValue)}
              className="flex-1 px-2 py-1.5 text-[13px] font-medium rounded transition-colors"
              style={{
                backgroundColor: isActive ? 'var(--accent)' : 'var(--bg-surface)',
                color: isActive ? 'var(--bg-surface)' : 'var(--text-muted)',
              }}
              title={opt.value === 'straight' ? 'Straight' : 'Kojima Web'}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// TEXTURE OVERLAY SECTION
// ═══════════════════════════════════════════════════════════════

const BLEND_MODE_OPTIONS: { value: BlendMode; label: string }[] = [
  { value: 'multiply', label: 'Multiply' },
  { value: 'screen', label: 'Screen' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'softLight', label: 'Soft Lt' },
]

function TextureOverlaySection() {
  const textureOverlay = useTextureOverlayStore()

  if (!textureOverlay.enabled) return null

  return (
    <div className="mt-4 pt-4 border-t border-gray-300">
      <div className="text-[13px] font-semibold text-gray-600 uppercase tracking-wide mb-3">
        Texture Overlay
      </div>

      {/* Texture Picker Grid */}
      <div className="mb-3">
        <div className="text-[12px] text-gray-500 mb-1.5">Texture</div>
        <div className="grid grid-cols-3 gap-1">
          {(Object.keys(TEXTURE_LIBRARY) as TextureId[]).map((textureId) => {
            const texture = TEXTURE_LIBRARY[textureId]
            const isSelected = textureOverlay.textureId === textureId
            return (
              <button
                key={textureId}
                onClick={() => textureOverlay.setTextureId(textureId)}
                className={`px-2 py-1.5 text-[11px] rounded transition-colors truncate ${
                  isSelected
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={texture.name}
              >
                {texture.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Blend Mode */}
      <div className="mb-3">
        <div className="text-[12px] text-gray-500 mb-1.5">Blend Mode</div>
        <div className="grid grid-cols-4 gap-1">
          {BLEND_MODE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => textureOverlay.setBlendMode(opt.value)}
              className={`px-1 py-1.5 text-[11px] font-medium rounded transition-colors ${
                textureOverlay.blendMode === opt.value
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Opacity */}
      <SliderRow
        label="Opacity"
        value={textureOverlay.opacity}
        min={0}
        max={1}
        step={0.01}
        onChange={(v) => textureOverlay.setOpacity(v)}
        format={(v) => `${(v * 100).toFixed(0)}%`}
        paramId="texture_overlay.opacity"
      />

      {/* Scale */}
      <SliderRow
        label="Scale"
        value={textureOverlay.scale}
        min={0.5}
        max={3}
        step={0.1}
        onChange={(v) => textureOverlay.setScale(v)}
        format={(v) => `${(v * 100).toFixed(0)}%`}
        paramId="texture_overlay.scale"
      />

      {/* Animation */}
      <div className="flex items-center gap-3 mt-2">
        <ToggleRow
          label="Animate"
          value={textureOverlay.animated}
          onChange={(v) => textureOverlay.setAnimated(v)}
        />
      </div>
      {textureOverlay.animated && (
        <SliderRow
          label="Speed"
          value={textureOverlay.animationSpeed}
          min={0.1}
          max={2}
          step={0.1}
          onChange={(v) => textureOverlay.setAnimationSpeed(v)}
          format={(v) => `${v.toFixed(1)}x`}
          paramId="texture_overlay.animationSpeed"
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// DATA OVERLAY SECTION
// ═══════════════════════════════════════════════════════════════

const TEMPLATE_OPTIONS: { value: Template; label: string }[] = [
  { value: 'watermark', label: 'Watermark' },
  { value: 'statsBar', label: 'Stats' },
  { value: 'titleCard', label: 'Title' },
  { value: 'socialCard', label: 'Social' },
]

const FONT_OPTIONS: { value: FontFamily; label: string }[] = [
  { value: 'mono', label: 'Mono' },
  { value: 'sans', label: 'Sans' },
  { value: 'serif', label: 'Serif' },
]

const POSITION_OPTIONS: { value: WatermarkPosition; label: string }[] = [
  { value: 'top-left', label: 'TL' },
  { value: 'top-right', label: 'TR' },
  { value: 'bottom-left', label: 'BL' },
  { value: 'bottom-right', label: 'BR' },
]

function DataOverlaySection() {
  const dataOverlay = useDataOverlayStore()

  if (!dataOverlay.enabled) return null

  return (
    <div className="mt-4 pt-4 border-t border-gray-300">
      <div className="text-[13px] font-semibold text-gray-600 uppercase tracking-wide mb-3">
        Data Overlay
      </div>

      {/* Template Picker */}
      <div className="mb-3">
        <div className="text-[12px] text-gray-500 mb-1.5">Template</div>
        <div className="grid grid-cols-4 gap-1">
          {TEMPLATE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => dataOverlay.setTemplate(opt.value)}
              className={`px-1 py-1.5 text-[11px] font-medium rounded transition-colors ${
                dataOverlay.template === opt.value
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Fields */}
      <div className="mb-3">
        <div className="text-[12px] text-gray-500 mb-1.5 font-semibold uppercase">Fields</div>
        <div className="space-y-1.5">
          {dataOverlay.fields.map((field) => (
            <div key={field.id} className="flex items-center gap-2">
              {/* Visibility toggle */}
              <button
                onClick={() => dataOverlay.toggleFieldVisibility(field.id)}
                className={`w-5 h-5 flex items-center justify-center rounded text-[12px] ${
                  field.visible
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-400'
                }`}
                title={field.visible ? 'Hide field' : 'Show field'}
              >
                {field.visible ? (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                )}
              </button>

              {/* Label */}
              <span className="text-[12px] text-gray-600 w-16 flex-shrink-0">
                {field.label}:
              </span>

              {/* Value input or auto badge */}
              {field.isAuto ? (
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-[12px] text-gray-400 italic">
                    {field.value || '(auto)'}
                  </span>
                  <span className="text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded uppercase">
                    auto
                  </span>
                </div>
              ) : (
                <input
                  type="text"
                  value={field.value}
                  onChange={(e) => dataOverlay.setFieldValue(field.id, e.target.value)}
                  placeholder={field.label}
                  className="flex-1 text-[12px] px-2 py-1 rounded border border-gray-200 bg-white text-gray-700 focus:outline-none focus:border-gray-400"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Style Section */}
      <div className="mb-3">
        <div className="text-[12px] text-gray-500 mb-1.5 font-semibold uppercase">Style</div>

        {/* Font Family */}
        <div className="mb-2">
          <div className="text-[11px] text-gray-400 mb-1">Font</div>
          <div className="grid grid-cols-3 gap-1">
            {FONT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => dataOverlay.setStyle({ font: opt.value })}
                className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                  dataOverlay.style.font === opt.value
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Font Size */}
        <SliderRow
          label="Size"
          value={dataOverlay.style.fontSize}
          min={12}
          max={48}
          step={1}
          onChange={(v) => dataOverlay.setStyle({ fontSize: v })}
          format={(v) => `${v.toFixed(0)}px`}
          paramId="data_overlay.fontSize"
        />

        {/* Color */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[12px] text-gray-600 w-16">Color:</span>
          <input
            type="text"
            value={dataOverlay.style.color}
            onChange={(e) => dataOverlay.setStyle({ color: e.target.value })}
            className="w-20 text-[12px] px-2 py-1 rounded border border-gray-200 bg-white text-gray-700 font-mono focus:outline-none focus:border-gray-400"
          />
          <input
            type="color"
            value={dataOverlay.style.color}
            onChange={(e) => dataOverlay.setStyle({ color: e.target.value })}
            className="w-6 h-6 rounded border border-gray-200 cursor-pointer"
          />
        </div>

        {/* Opacity */}
        <SliderRow
          label="Opacity"
          value={dataOverlay.style.opacity}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => dataOverlay.setStyle({ opacity: v })}
          format={(v) => `${(v * 100).toFixed(0)}%`}
          paramId="data_overlay.opacity"
        />
      </div>

      {/* Position (only for watermark template) */}
      {dataOverlay.template === 'watermark' && (
        <div className="mb-3">
          <div className="text-[12px] text-gray-500 mb-1.5">Position</div>
          <div className="grid grid-cols-4 gap-1">
            {POSITION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => dataOverlay.setWatermarkPosition(opt.value)}
                className={`px-2 py-1.5 text-[11px] font-medium rounded transition-colors ${
                  dataOverlay.watermarkPosition === opt.value
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
