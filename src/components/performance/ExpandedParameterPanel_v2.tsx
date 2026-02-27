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
import { ToggleBlock } from './blocks/ToggleBlock'
import { SelectBlock } from './blocks/SelectBlock'
import { ColorBlock } from './blocks/ColorBlock'
import { EffectHeaderBlock } from './blocks/EffectHeaderBlock'
import { PresetDropdownBar } from '../presets/PresetDropdownBar'

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

  // Classify params
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

  // Combine sliders + knobs + steppers as param blocks
  const paramBlocks = [...knobs, ...sliders, ...steppers]

  return (
    <>
      {/* Param blocks — 3-column grid */}
      {paramBlocks.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 6,
          }}
        >
          {paramBlocks.map((param) => (
            <ParamBlock
              key={param.id}
              label={param.label}
              value={param.read()}
              min={param.min}
              max={param.max}
              step={param.step}
              onChange={(v) => param.apply(v)}
              paramId={`${effectId}.${param.id}`}
              color={color}
            />
          ))}
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

// ─── Extra controls per effect (colors, toggles not in registry) ────────
function BlockExtras({ effectId }: { effectId: string }) {
  const glitch = useGlitchEngineStore()
  const contour = useContourStore()
  const stipple = useStippleStore()
  const landmarks = useLandmarksStore()

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

    case 'block_displace':
      return (
        <>
          <SectionDivider label="Options" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            <ToggleBlock label="Animated" value={glitch.blockDisplace.animated} onChange={(v) => glitch.updateBlockDisplace({ animated: v })} />
          </div>
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

    default:
      return null
  }
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
