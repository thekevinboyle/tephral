import { useState, useEffect } from 'react'
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
import { useTextureOverlayStore } from '../../stores/textureOverlayStore'
import { useDataOverlayStore } from '../../stores/dataOverlayStore'
import { useRoutingStore } from '../../stores/routingStore'
import { useEffectSequencerStore } from '../../stores/effectSequencerStore'
import { EFFECT_PARAM_REGISTRY } from '../../config/effectParams'
import {
  EFFECTS,
  STRAND_EFFECTS,
  MOTION_EFFECTS,
  DESTRUCTION_EFFECTS,
} from '../../config/effects'
import { classifyParam } from '../../utils/classifyParam'
import type { LockableParam } from '../../config/effectParams'
import { ParamBlock } from './blocks/ParamBlock'
import { DragNumberBlock } from './blocks/DragNumberBlock'
import { ArcBlock } from './blocks/ArcBlock'
import { VerticalFaderBlock } from './blocks/VerticalFaderBlock'
import { RulerBlock } from './blocks/RulerBlock'
import { ButtonRowBlock } from './blocks/ButtonRowBlock'
import { BipolarBlock } from './blocks/BipolarBlock'
import { ToggleBlock } from './blocks/ToggleBlock'
import { SelectBlock } from './blocks/SelectBlock'
import { ColorBlock } from './blocks/ColorBlock'
import { EffectHeaderBlock } from './blocks/EffectHeaderBlock'
import { PresetDropdownBar } from '../presets/PresetDropdownBar'
import { TEXTURE_LIBRARY, type TextureId } from '../overlays/TextureOverlay'
import type { BlendMode } from '../../stores/textureOverlayStore'
import type { Template, FontFamily, WatermarkPosition } from '../../stores/dataOverlayStore'

const ALL_EFFECTS = [...EFFECTS, ...STRAND_EFFECTS, ...MOTION_EFFECTS, ...DESTRUCTION_EFFECTS]

export function ExpandedParameterPanel_v2() {
  const { selectedEffectId } = useUIStore()
  const [lastEffectId, setLastEffectId] = useState<string | null>(null)

  useEffect(() => {
    if (selectedEffectId) {
      setLastEffectId(selectedEffectId)
    }
  }, [selectedEffectId])

  const effectId = selectedEffectId || lastEffectId
  const effect = ALL_EFFECTS.find((e) => e.id === effectId)

  if (!effectId || !effect) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-surface)',
          borderLeft: '1px solid var(--border)',
        }}
      >
        <PresetDropdownBar />
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-ghost)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            No Effect
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-ghost)' }}>
            Select an effect to edit parameters
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-surface)',
        borderLeft: '1px solid var(--border)',
      }}
    >
      <PresetDropdownBar />
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {/* Header */}
        <EffectHeaderBlock effectId={effectId} />

        {/* Parameters */}
        <BlockParameters effectId={effectId} color={effect.color} />

        {/* Extra controls */}
        <BlockExtras effectId={effectId} />
      </div>
    </div>
  )
}

function BlockParameters({ effectId, color }: { effectId: string; color: string }) {
  // Subscribe to all stores for reactivity
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

  const automationParam = useEffectSequencerStore((s) => s.automationParam)
  const setAutomationParam = useEffectSequencerStore((s) => s.setAutomationParam)
  const clearAutomationParam = useEffectSequencerStore((s) => s.clearAutomationParam)

  const entry = EFFECT_PARAM_REGISTRY[effectId]
  if (!entry) {
    return (
      <div style={{ padding: 24, textAlign: 'center', fontSize: 14, color: 'var(--text-ghost)' }}>
        No parameters available
      </div>
    )
  }

  const params = entry.getParams()
  const selectParams = entry.getSelectParams?.() ?? []

  // Classify params into typed buckets
  const toggles: LockableParam[] = []
  const typedParams: { param: LockableParam; type: string }[] = []

  for (const p of params) {
    const type = classifyParam(p)
    if (type === 'toggle') toggles.push(p)
    else typedParams.push({ param: p, type })
  }

  return (
    <>
      {/* Mixed control grid — 3 columns, varied block types */}
      {typedParams.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 6,
          }}
        >
          {typedParams.map(({ param, type }) => {
            const fullParamId = `${effectId}.${param.id}`
            const isTarget = automationParam?.fullParamId === fullParamId
            const commonProps = {
              key: param.id,
              label: param.label,
              value: param.read(),
              min: param.min,
              max: param.max,
              step: param.step,
              onChange: (v: number) => param.apply(v),
              paramId: fullParamId,
              color,
              isAutomationTarget: isTarget,
              onTap: () => {
                if (isTarget) {
                  clearAutomationParam()
                } else {
                  setAutomationParam({
                    effectId,
                    paramId: param.id,
                    fullParamId,
                    label: param.label,
                    min: param.min,
                    max: param.max,
                    step: param.step,
                  })
                }
              },
            }
            switch (type) {
              case 'slider':
                return <DragNumberBlock {...commonProps} />
              case 'arc':
                return <ArcBlock {...commonProps} />
              case 'stepper':
                return <ButtonRowBlock {...commonProps} />
              case 'vfader':
                return <VerticalFaderBlock {...commonProps} />
              case 'ruler':
                return <RulerBlock {...commonProps} />
              case 'bipolar':
                return <BipolarBlock {...commonProps} />
              default:
                return <ParamBlock {...commonProps} />
            }
          })}
        </div>
      )}

      {/* Toggles — 3-column grid, half height */}
      {toggles.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 6,
          }}
        >
          {toggles.map((param) => (
            <ToggleBlock
              key={param.id}
              label={param.label}
              value={param.read() >= 0.5}
              onChange={(v) => param.apply(v ? 1 : 0)}
              color={color}
              paramId={`${effectId}.${param.id}`}
            />
          ))}
        </div>
      )}

      {/* Select params — full width blocks */}
      {selectParams.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {selectParams.map((param) => (
            <SelectBlock
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
    </>
  )
}

/** Drop-in replacement for EffectParameters — renders blocks + extras */
export function EffectParameters_v2({ effectId }: { effectId: string }) {
  const effect = ALL_EFFECTS.find((e) => e.id === effectId)
  const color = effect?.color ?? 'var(--accent)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <EffectHeaderBlock effectId={effectId} />
      <BlockParameters effectId={effectId} color={color} />
      <BlockExtras effectId={effectId} />
    </div>
  )
}

// ─── Trace mask options ──────────────────────────────────────────────────
const TRACE_MASK_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'track_bright', label: 'Bright' },
  { value: 'track_motion', label: 'Motion' },
  { value: 'track_edge', label: 'Edge' },
  { value: 'track_color', label: 'Color' },
]

// ─── Vision tracking display controls ───────────────────────────────────
const BOX_FILTER_OPTIONS = ['none', 'pixel', 'invert', 'blur', 'thermal', 'edge', 'grayscale', 'saturate'] as const
const BOX_SHAPE_OPTIONS = [
  { value: 'square', label: 'Square' },
  { value: 'circle', label: 'Circle' },
  { value: 'dynamic', label: 'Dynamic' },
]
const LINE_STYLE_OPTIONS = [
  { value: 'straight', label: 'Straight' },
  { value: 'web', label: 'Web' },
]

function VisionTrackingBlockExtras({
  params,
  updateParams,
  traceParams,
  updateTraceParams,
  linesOnly,
  setLinesOnly,
  fillMode,
}: {
  params: { showBoxes: boolean; showLines: boolean; showLabels: boolean; boxShape: string; lineStyle: string; boxColor: string; boxFilter: string }
  updateParams: (p: Record<string, unknown>) => void
  traceParams: { trailEnabled: boolean; fillMode?: string }
  updateTraceParams: (p: Record<string, unknown>) => void
  linesOnly: boolean
  setLinesOnly: (v: boolean) => void
  fillMode?: { options: { value: string; label: string }[] }
}) {
  return (
    <>
      <SectionDivider label="Display" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        <ToggleBlock label="Boxes" value={params.showBoxes} onChange={(v) => updateParams({ showBoxes: v })} />
        <ToggleBlock label="Lines" value={params.showLines} onChange={(v) => updateParams({ showLines: v })} />
        <ToggleBlock label="Labels" value={params.showLabels} onChange={(v) => updateParams({ showLabels: v })} />
      </div>
      <SelectBlock
        label="Box Shape"
        value={params.boxShape}
        options={BOX_SHAPE_OPTIONS}
        onChange={(v) => updateParams({ boxShape: v })}
      />
      <SelectBlock
        label="Line Style"
        value={params.lineStyle}
        options={LINE_STYLE_OPTIONS}
        onChange={(v) => updateParams({ lineStyle: v })}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        <ColorBlock label="Box Color" value={params.boxColor} onChange={(v) => updateParams({ boxColor: v })} />
      </div>
      <SectionDivider label="Box Filter" />
      <SelectBlock
        label="Filter"
        value={params.boxFilter}
        options={BOX_FILTER_OPTIONS.map((v) => ({ value: v, label: v === 'grayscale' ? 'Gray' : v.charAt(0).toUpperCase() + v.slice(1) }))}
        onChange={(v) => updateParams({ boxFilter: v })}
      />
      <SectionDivider label="Global" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        <ToggleBlock label="Lines Only" value={linesOnly} onChange={setLinesOnly} />
      </div>
      <SectionDivider label="GPU Trace" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        <ToggleBlock label="Trail" value={traceParams.trailEnabled} onChange={(v) => updateTraceParams({ trailEnabled: v })} />
      </div>
      {fillMode && traceParams.fillMode !== undefined && (
        <SelectBlock
          label="Fill Mode"
          value={traceParams.fillMode}
          options={fillMode.options}
          onChange={(v) => updateTraceParams({ fillMode: v })}
        />
      )}
    </>
  )
}

// ─── Texture overlay section ────────────────────────────────────────────
const BLEND_MODE_OPTIONS: { value: BlendMode; label: string }[] = [
  { value: 'multiply', label: 'Multiply' },
  { value: 'screen', label: 'Screen' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'softLight', label: 'Soft Lt' },
]

function TextureOverlayBlockExtras() {
  const tex = useTextureOverlayStore()
  if (!tex.enabled) return null

  return (
    <>
      <SectionDivider label="Texture Overlay" />
      <SelectBlock
        label="Texture"
        value={tex.textureId}
        options={(Object.keys(TEXTURE_LIBRARY) as TextureId[]).map((id) => ({ value: id, label: TEXTURE_LIBRARY[id].name }))}
        onChange={(v) => tex.setTextureId(v as TextureId)}
      />
      <SelectBlock
        label="Blend"
        value={tex.blendMode}
        options={BLEND_MODE_OPTIONS}
        onChange={(v) => tex.setBlendMode(v as BlendMode)}
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        <ParamBlock label="Opacity" value={tex.opacity} min={0} max={1} step={0.01} onChange={tex.setOpacity} paramId="texture_overlay.opacity" />
        <ParamBlock label="Scale" value={tex.scale} min={0.5} max={3} step={0.1} onChange={tex.setScale} paramId="texture_overlay.scale" />
        <ToggleBlock label="Animate" value={tex.animated} onChange={tex.setAnimated} />
      </div>
      {tex.animated && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          <ParamBlock label="Speed" value={tex.animationSpeed} min={0.1} max={2} step={0.1} onChange={tex.setAnimationSpeed} paramId="texture_overlay.animationSpeed" />
        </div>
      )}
    </>
  )
}

// ─── Data overlay section ───────────────────────────────────────────────
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

function DataOverlayBlockExtras() {
  const data = useDataOverlayStore()
  if (!data.enabled) return null

  return (
    <>
      <SectionDivider label="Data Overlay" />
      <SelectBlock
        label="Template"
        value={data.template}
        options={TEMPLATE_OPTIONS}
        onChange={(v) => data.setTemplate(v as Template)}
      />
      <SelectBlock
        label="Font"
        value={data.style.font}
        options={FONT_OPTIONS}
        onChange={(v) => data.setStyle({ font: v as FontFamily })}
      />
      {data.template === 'watermark' && (
        <SelectBlock
          label="Position"
          value={data.watermarkPosition}
          options={POSITION_OPTIONS}
          onChange={(v) => data.setWatermarkPosition(v as WatermarkPosition)}
        />
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        <ParamBlock label="Size" value={data.style.fontSize} min={12} max={48} step={1} onChange={(v) => data.setStyle({ fontSize: v })} paramId="data_overlay.fontSize" />
        <ParamBlock label="Opacity" value={data.style.opacity} min={0} max={1} step={0.01} onChange={(v) => data.setStyle({ opacity: v })} paramId="data_overlay.opacity" />
        <ColorBlock label="Color" value={data.style.color} onChange={(v) => data.setStyle({ color: v })} />
      </div>
    </>
  )
}

// ─── Extra controls per effect (colors, toggles not in registry) ────────
function BlockExtras({ effectId }: { effectId: string }) {
  const glitch = useGlitchEngineStore()
  const contour = useContourStore()
  const stipple = useStippleStore()
  const landmarks = useLandmarksStore()
  const visionTracking = useVisionTrackingStore()
  const routing = useRoutingStore()

  const extras = (() => {
    switch (effectId) {
      case 'edges':
        return (
          <>
            <SectionDivider label="Extras" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              <ColorBlock label="Edge Color" value={glitch.edgeDetection.edgeColor} onChange={(v) => glitch.updateEdgeDetection({ edgeColor: v })} />
            </div>
          </>
        )

      case 'color_grade':
        return (
          <>
            <SectionDivider label="Extras" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              <ColorBlock label="Tint Color" value={glitch.colorGrade.tintColor} onChange={(v) => glitch.updateColorGrade({ tintColor: v })} />
            </div>
          </>
        )

      case 'contour':
        return (
          <>
            <SectionDivider label="Colors" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              <ColorBlock label="Color" value={contour.params.color} onChange={(v) => contour.updateParams({ color: v })} />
              <ColorBlock label="Glow" value={contour.params.glowColor} onChange={(v) => contour.updateParams({ glowColor: v })} />
            </div>
          </>
        )

      case 'rgb_split':
        return (
          <>
            <SectionDivider label="Trace Mask" />
            <SelectBlock label="Mask" value={routing.getEffectTraceMask('rgb_split')} options={TRACE_MASK_OPTIONS} onChange={(v) => routing.setEffectTraceMask('rgb_split', v)} />
          </>
        )

      case 'block_displace':
        return (
          <>
            <SectionDivider label="Options" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              <ToggleBlock label="Animated" value={glitch.blockDisplace.animated} onChange={(v) => glitch.updateBlockDisplace({ animated: v })} />
            </div>
            <SectionDivider label="Trace Mask" />
            <SelectBlock label="Mask" value={routing.getEffectTraceMask('block_displace')} options={TRACE_MASK_OPTIONS} onChange={(v) => routing.setEffectTraceMask('block_displace', v)} />
          </>
        )

      case 'datamosh':
        return (
          <>
            <SectionDivider label="Trace Mask" />
            <SelectBlock label="Mask" value={routing.getEffectTraceMask('datamosh')} options={TRACE_MASK_OPTIONS} onChange={(v) => routing.setEffectTraceMask('datamosh', v)} />
          </>
        )

      case 'stipple':
        return (
          <>
            <SectionDivider label="Options" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              <ToggleBlock label="Animated" value={stipple.params.animated} onChange={(v) => stipple.updateParams({ animated: v })} />
              <ToggleBlock label="Breathe" value={stipple.params.breathe} onChange={(v) => stipple.updateParams({ breathe: v })} />
            </div>
          </>
        )

      case 'landmarks':
        return (
          <>
            <SectionDivider label="Options" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              <ToggleBlock label="Attach" value={landmarks.attachToDetections} onChange={(v) => landmarks.setAttachToDetections(v)} />
            </div>
          </>
        )

      case 'track_bright':
        return (
          <VisionTrackingBlockExtras
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
          <VisionTrackingBlockExtras
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              <ColorBlock label="Target" value={visionTracking.colorParams.targetColor} onChange={(v) => visionTracking.updateColorParams({ targetColor: v })} />
            </div>
            <VisionTrackingBlockExtras
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
          <VisionTrackingBlockExtras
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
          <VisionTrackingBlockExtras
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
          <VisionTrackingBlockExtras
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
  })()

  return (
    <>
      {extras}
      <TextureOverlayBlockExtras />
      <DataOverlayBlockExtras />
    </>
  )
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div
      style={{
        fontSize: 14,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'var(--text-muted)',
        paddingTop: 16,
        paddingBottom: 4,
      }}
    >
      {label}
    </div>
  )
}
