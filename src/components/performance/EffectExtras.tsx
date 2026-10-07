import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { useStippleStore } from '../../stores/stippleStore'
import { useContourStore } from '../../stores/contourStore'
import { useLandmarksStore } from '../../stores/landmarksStore'
import { useVisionTrackingStore } from '../../stores/visionTrackingStore'
import { useTextureOverlayStore } from '../../stores/textureOverlayStore'
import { useDataOverlayStore } from '../../stores/dataOverlayStore'
import { useRoutingStore } from '../../stores/routingStore'
import { ToggleBlock } from './blocks/ToggleBlock'
import { SelectBlock } from './blocks/SelectBlock'
import { ColorBlock } from './blocks/ColorBlock'
import { ParamSection } from './blocks/ParamSection'
import { TEXTURE_LIBRARY, type TextureId } from '../overlays/TextureOverlay'
import type { BlendMode } from '../../stores/textureOverlayStore'
import type { Template, FontFamily, WatermarkPosition } from '../../stores/dataOverlayStore'

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
      <ParamSection label="Display">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
            <ColorBlock label="Box Color" value={params.boxColor} onChange={(v) => updateParams({ boxColor: v })} />
          </div>
        </div>
      </ParamSection>
      <ParamSection label="Box Filter">
        <SelectBlock
          label="Filter"
          value={params.boxFilter}
          options={BOX_FILTER_OPTIONS.map((v) => ({ value: v, label: v === 'grayscale' ? 'Gray' : v.charAt(0).toUpperCase() + v.slice(1) }))}
          onChange={(v) => updateParams({ boxFilter: v })}
        />
      </ParamSection>
      <ParamSection label="Global">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
          <ToggleBlock label="Lines Only" value={linesOnly} onChange={setLinesOnly} />
        </div>
      </ParamSection>
      <ParamSection label="GPU Trace">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
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
        </div>
      </ParamSection>
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
    <ParamSection label="Texture Overlay">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
          <ToggleBlock label="Animate" value={tex.animated} onChange={tex.setAnimated} />
        </div>
      </div>
    </ParamSection>
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
    <ParamSection label="Data Overlay">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
          <ColorBlock label="Color" value={data.style.color} onChange={(v) => data.setStyle({ color: v })} />
        </div>
      </div>
    </ParamSection>
  )
}

// ─── Extra controls per effect (colors, toggles not in registry) ────────
export function BlockExtras({ effectId }: { effectId: string }) {
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
          <ParamSection label="Extras">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
              <ColorBlock label="Edge Color" value={glitch.edgeDetection.edgeColor} onChange={(v) => glitch.updateEdgeDetection({ edgeColor: v })} />
            </div>
          </ParamSection>
        )

      case 'color_grade':
        return (
          <ParamSection label="Extras">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
              <ColorBlock label="Tint Color" value={glitch.colorGrade.tintColor} onChange={(v) => glitch.updateColorGrade({ tintColor: v })} />
            </div>
          </ParamSection>
        )

      case 'contour':
        return (
          <ParamSection label="Colors">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
              <ColorBlock label="Color" value={contour.params.color} onChange={(v) => contour.updateParams({ color: v })} />
              <ColorBlock label="Glow" value={contour.params.glowColor} onChange={(v) => contour.updateParams({ glowColor: v })} />
            </div>
          </ParamSection>
        )

      case 'rgb_split':
        return (
          <ParamSection label="Trace Mask">
            <SelectBlock label="Mask" value={routing.getEffectTraceMask('rgb_split')} options={TRACE_MASK_OPTIONS} onChange={(v) => routing.setEffectTraceMask('rgb_split', v)} />
          </ParamSection>
        )

      case 'block_displace':
        return (
          <>
            <ParamSection label="Options">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                <ToggleBlock label="Animated" value={glitch.blockDisplace.animated} onChange={(v) => glitch.updateBlockDisplace({ animated: v })} />
              </div>
            </ParamSection>
            <ParamSection label="Trace Mask">
              <SelectBlock label="Mask" value={routing.getEffectTraceMask('block_displace')} options={TRACE_MASK_OPTIONS} onChange={(v) => routing.setEffectTraceMask('block_displace', v)} />
            </ParamSection>
          </>
        )

      case 'datamosh':
        return (
          <ParamSection label="Trace Mask">
            <SelectBlock label="Mask" value={routing.getEffectTraceMask('datamosh')} options={TRACE_MASK_OPTIONS} onChange={(v) => routing.setEffectTraceMask('datamosh', v)} />
          </ParamSection>
        )

      case 'stipple':
        return (
          <ParamSection label="Options">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
              <ToggleBlock label="Animated" value={stipple.params.animated} onChange={(v) => stipple.updateParams({ animated: v })} />
              <ToggleBlock label="Breathe" value={stipple.params.breathe} onChange={(v) => stipple.updateParams({ breathe: v })} />
            </div>
          </ParamSection>
        )

      case 'landmarks':
        return (
          <ParamSection label="Options">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
              <ToggleBlock label="Attach" value={landmarks.attachToDetections} onChange={(v) => landmarks.setAttachToDetections(v)} />
            </div>
          </ParamSection>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
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
