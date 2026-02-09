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
import { useTextureOverlayStore } from '../../stores/textureOverlayStore'
import { useDataOverlayStore } from '../../stores/dataOverlayStore'
import { EFFECTS, STRAND_EFFECTS, MOTION_EFFECTS } from '../../config/effects'
import { SliderRow, ToggleRow, SelectRow, ColorRow } from './controls'
import { TEXTURE_LIBRARY, type TextureId } from '../overlays/TextureOverlay'
import type { BlendMode } from '../../stores/textureOverlayStore'
import type { Template, FontFamily, WatermarkPosition } from '../../stores/dataOverlayStore'

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
  const effect = EFFECTS.find((e) => e.id === effectId) || STRAND_EFFECTS.find((e) => e.id === effectId) || MOTION_EFFECTS.find((e) => e.id === effectId)

  if (!effectId || !effect) {
    return (
      <div className="h-full flex items-center justify-center border-l" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <span className="text-[14px]" style={{ color: 'var(--text-muted)' }}>Select an effect</span>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col border-l" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-surface)' }}>
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
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <EffectParameters effectId={effectId} />
        <TextureOverlaySection />
        <DataOverlaySection />
      </div>
    </div>
  )
}

function EffectParameters({ effectId }: { effectId: string }) {
  const glitch = useGlitchEngineStore()
  const ascii = useAsciiRenderStore()
  const stipple = useStippleStore()
  const contour = useContourStore()
  const landmarks = useLandmarksStore()
  const visionTracking = useVisionTrackingStore()
  const acid = useAcidStore()
  const strand = useStrandStore()
  const motion = useMotionStore()

  switch (effectId) {
    case 'rgb_split':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Amount"
            value={glitch.rgbSplit.amount}
            min={0}
            max={2}
            step={0.01}
            onChange={(v) => glitch.updateRGBSplit({ amount: v })}
            paramId="rgb_split.amount"
          />
          <SliderRow
            label="Red X"
            value={glitch.rgbSplit.redOffsetX}
            min={-0.05}
            max={0.05}
            step={0.001}
            onChange={(v) => glitch.updateRGBSplit({ redOffsetX: v })}
            format={(v) => (v * 100).toFixed(1)}
            paramId="rgb_split.redOffsetX"
          />
          <SliderRow
            label="Red Y"
            value={glitch.rgbSplit.redOffsetY}
            min={-0.05}
            max={0.05}
            step={0.001}
            onChange={(v) => glitch.updateRGBSplit({ redOffsetY: v })}
            format={(v) => (v * 100).toFixed(1)}
            paramId="rgb_split.redOffsetY"
          />
          <SliderRow
            label="Green X"
            value={glitch.rgbSplit.greenOffsetX}
            min={-0.05}
            max={0.05}
            step={0.001}
            onChange={(v) => glitch.updateRGBSplit({ greenOffsetX: v })}
            format={(v) => (v * 100).toFixed(1)}
            paramId="rgb_split.greenOffsetX"
          />
          <SliderRow
            label="Green Y"
            value={glitch.rgbSplit.greenOffsetY}
            min={-0.05}
            max={0.05}
            step={0.001}
            onChange={(v) => glitch.updateRGBSplit({ greenOffsetY: v })}
            format={(v) => (v * 100).toFixed(1)}
            paramId="rgb_split.greenOffsetY"
          />
          <SliderRow
            label="Blue X"
            value={glitch.rgbSplit.blueOffsetX}
            min={-0.05}
            max={0.05}
            step={0.001}
            onChange={(v) => glitch.updateRGBSplit({ blueOffsetX: v })}
            format={(v) => (v * 100).toFixed(1)}
            paramId="rgb_split.blueOffsetX"
          />
          <SliderRow
            label="Blue Y"
            value={glitch.rgbSplit.blueOffsetY}
            min={-0.05}
            max={0.05}
            step={0.001}
            onChange={(v) => glitch.updateRGBSplit({ blueOffsetY: v })}
            format={(v) => (v * 100).toFixed(1)}
            paramId="rgb_split.blueOffsetY"
          />
        </div>
      )

    case 'block_displace':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Block Size"
            value={glitch.blockDisplace.blockSize}
            min={0.01}
            max={0.2}
            step={0.01}
            onChange={(v) => glitch.updateBlockDisplace({ blockSize: v })}
            format={(v) => (v * 100).toFixed(0)}
            paramId="block_displace.blockSize"
          />
          <SliderRow
            label="Chance"
            value={glitch.blockDisplace.displaceChance}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => glitch.updateBlockDisplace({ displaceChance: v })}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            paramId="block_displace.displaceChance"
          />
          <SliderRow
            label="Distance"
            value={glitch.blockDisplace.displaceDistance}
            min={0}
            max={0.1}
            step={0.001}
            onChange={(v) => glitch.updateBlockDisplace({ displaceDistance: v })}
            format={(v) => (v * 100).toFixed(1)}
            paramId="block_displace.displaceDistance"
          />
          <SliderRow
            label="Seed"
            value={glitch.blockDisplace.seed}
            min={0}
            max={1000}
            step={1}
            onChange={(v) => glitch.updateBlockDisplace({ seed: v })}
            format={(v) => v.toFixed(0)}
            paramId="block_displace.seed"
          />
          <ToggleRow
            label="Animated"
            value={glitch.blockDisplace.animated}
            onChange={(v) => glitch.updateBlockDisplace({ animated: v })}
          />
        </div>
      )

    case 'scan_lines':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Line Count"
            value={glitch.scanLines.lineCount}
            min={50}
            max={500}
            step={10}
            onChange={(v) => glitch.updateScanLines({ lineCount: v })}
            format={(v) => v.toFixed(0)}
            paramId="scan_lines.lineCount"
          />
          <SliderRow
            label="Opacity"
            value={glitch.scanLines.lineOpacity}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => glitch.updateScanLines({ lineOpacity: v })}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            paramId="scan_lines.lineOpacity"
          />
          <SliderRow
            label="Flicker"
            value={glitch.scanLines.lineFlicker}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => glitch.updateScanLines({ lineFlicker: v })}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            paramId="scan_lines.lineFlicker"
          />
        </div>
      )

    case 'noise':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Amount"
            value={glitch.noise.amount}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => glitch.updateNoise({ amount: v })}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            paramId="noise.amount"
          />
          <SliderRow
            label="Speed"
            value={glitch.noise.speed}
            min={1}
            max={50}
            step={1}
            onChange={(v) => glitch.updateNoise({ speed: v })}
            format={(v) => v.toFixed(0)}
            paramId="noise.speed"
          />
        </div>
      )

    case 'pixelate':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Pixel Size"
            value={glitch.pixelate.pixelSize}
            min={2}
            max={32}
            step={1}
            onChange={(v) => glitch.updatePixelate({ pixelSize: v })}
            format={(v) => `${v.toFixed(0)}px`}
            paramId="pixelate.pixelSize"
          />
        </div>
      )

    case 'edges':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Threshold"
            value={glitch.edgeDetection.threshold}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => glitch.updateEdgeDetection({ threshold: v })}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            paramId="edges.threshold"
          />
          <ColorRow
            label="Edge Color"
            value={glitch.edgeDetection.edgeColor}
            onChange={(v) => glitch.updateEdgeDetection({ edgeColor: v })}
          />
          <SliderRow
            label="Mix"
            value={glitch.edgeDetection.mixAmount}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => glitch.updateEdgeDetection({ mixAmount: v })}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            paramId="edges.mixAmount"
          />
        </div>
      )

    case 'chromatic':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Intensity"
            value={glitch.chromaticAberration.intensity}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => glitch.updateChromaticAberration({ intensity: v })}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            paramId="chromatic.intensity"
          />
          <SliderRow
            label="Radial Amount"
            value={glitch.chromaticAberration.radialAmount}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => glitch.updateChromaticAberration({ radialAmount: v })}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            paramId="chromatic.radialAmount"
          />
          <SliderRow
            label="Direction"
            value={glitch.chromaticAberration.direction}
            min={0}
            max={360}
            step={1}
            onChange={(v) => glitch.updateChromaticAberration({ direction: v })}
            format={(v) => `${v.toFixed(0)}°`}
            paramId="chromatic.direction"
          />
          <SliderRow
            label="Red Offset"
            value={glitch.chromaticAberration.redOffset}
            min={-0.05}
            max={0.05}
            step={0.001}
            onChange={(v) => glitch.updateChromaticAberration({ redOffset: v })}
            format={(v) => (v * 100).toFixed(1)}
            paramId="chromatic.redOffset"
          />
          <SliderRow
            label="Blue Offset"
            value={glitch.chromaticAberration.blueOffset}
            min={-0.05}
            max={0.05}
            step={0.001}
            onChange={(v) => glitch.updateChromaticAberration({ blueOffset: v })}
            format={(v) => (v * 100).toFixed(1)}
            paramId="chromatic.blueOffset"
          />
        </div>
      )

    case 'vhs':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Tear Intensity"
            value={glitch.vhsTracking.tearIntensity}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => glitch.updateVHSTracking({ tearIntensity: v })}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            paramId="vhs.tearIntensity"
          />
          <SliderRow
            label="Tear Speed"
            value={glitch.vhsTracking.tearSpeed}
            min={0.1}
            max={5}
            step={0.1}
            onChange={(v) => glitch.updateVHSTracking({ tearSpeed: v })}
            paramId="vhs.tearSpeed"
          />
          <SliderRow
            label="Head Switch Noise"
            value={glitch.vhsTracking.headSwitchNoise}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => glitch.updateVHSTracking({ headSwitchNoise: v })}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            paramId="vhs.headSwitchNoise"
          />
          <SliderRow
            label="Color Bleed"
            value={glitch.vhsTracking.colorBleed}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => glitch.updateVHSTracking({ colorBleed: v })}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            paramId="vhs.colorBleed"
          />
          <SliderRow
            label="Jitter"
            value={glitch.vhsTracking.jitter}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => glitch.updateVHSTracking({ jitter: v })}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            paramId="vhs.jitter"
          />
        </div>
      )

    case 'lens':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Curvature"
            value={glitch.lensDistortion.curvature}
            min={-1}
            max={1}
            step={0.01}
            onChange={(v) => glitch.updateLensDistortion({ curvature: v })}
            format={(v) => v.toFixed(2)}
            paramId="lens.curvature"
          />
          <SliderRow
            label="Fresnel Rings"
            value={glitch.lensDistortion.fresnelRings}
            min={0}
            max={20}
            step={1}
            onChange={(v) => glitch.updateLensDistortion({ fresnelRings: v })}
            format={(v) => v.toFixed(0)}
            paramId="lens.fresnelRings"
          />
          <SliderRow
            label="Fresnel Intensity"
            value={glitch.lensDistortion.fresnelIntensity}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => glitch.updateLensDistortion({ fresnelIntensity: v })}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            paramId="lens.fresnelIntensity"
          />
          <SliderRow
            label="Fresnel Rainbow"
            value={glitch.lensDistortion.fresnelRainbow}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => glitch.updateLensDistortion({ fresnelRainbow: v })}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            paramId="lens.fresnelRainbow"
          />
          <SliderRow
            label="Vignette"
            value={glitch.lensDistortion.vignette}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => glitch.updateLensDistortion({ vignette: v })}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            paramId="lens.vignette"
          />
          <SliderRow
            label="Vignette Shape"
            value={glitch.lensDistortion.vignetteShape}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => glitch.updateLensDistortion({ vignetteShape: v })}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            paramId="lens.vignetteShape"
          />
          <SliderRow
            label="Phosphor Glow"
            value={glitch.lensDistortion.phosphorGlow}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => glitch.updateLensDistortion({ phosphorGlow: v })}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            paramId="lens.phosphorGlow"
          />
        </div>
      )

    case 'dither':
      return (
        <div className="space-y-1">
          <SelectRow
            label="Mode"
            value={glitch.dither.mode}
            options={[
              { value: 'ordered', label: 'Ordered' },
              { value: 'halftone', label: 'Halftone' },
              { value: 'newsprint', label: 'Newsprint' },
            ]}
            onChange={(v) => glitch.updateDither({ mode: v as 'ordered' | 'halftone' | 'newsprint' })}
          />
          <SliderRow
            label="Intensity"
            value={glitch.dither.intensity}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => glitch.updateDither({ intensity: v })}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            paramId="dither.intensity"
          />
          <SliderRow
            label="Scale"
            value={glitch.dither.scale}
            min={1}
            max={8}
            step={1}
            onChange={(v) => glitch.updateDither({ scale: v })}
            format={(v) => v.toFixed(0)}
            paramId="dither.scale"
          />
          <SliderRow
            label="Color Depth"
            value={glitch.dither.colorDepth}
            min={2}
            max={16}
            step={1}
            onChange={(v) => glitch.updateDither({ colorDepth: v })}
            format={(v) => v.toFixed(0)}
            paramId="dither.colorDepth"
          />
          <SliderRow
            label="Angle"
            value={glitch.dither.angle}
            min={0}
            max={180}
            step={1}
            onChange={(v) => glitch.updateDither({ angle: v })}
            format={(v) => `${v.toFixed(0)}°`}
            paramId="dither.angle"
          />
        </div>
      )

    case 'posterize':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Levels"
            value={glitch.posterize.levels}
            min={2}
            max={16}
            step={1}
            onChange={(v) => glitch.updatePosterize({ levels: v })}
            format={(v) => v.toFixed(0)}
            paramId="posterize.levels"
          />
          <SelectRow
            label="Mode"
            value={glitch.posterize.mode}
            options={[
              { value: 'rgb', label: 'RGB' },
              { value: 'hsl', label: 'HSL' },
            ]}
            onChange={(v) => glitch.updatePosterize({ mode: v as 'rgb' | 'hsl' })}
          />
          <SliderRow
            label="Saturation Boost"
            value={glitch.posterize.saturationBoost}
            min={0}
            max={2}
            step={0.01}
            onChange={(v) => glitch.updatePosterize({ saturationBoost: v })}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            paramId="posterize.saturationBoost"
          />
          <SliderRow
            label="Edge Contrast"
            value={glitch.posterize.edgeContrast}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => glitch.updatePosterize({ edgeContrast: v })}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            paramId="posterize.edgeContrast"
          />
        </div>
      )

    case 'static_displace':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Intensity"
            value={glitch.staticDisplacement.intensity}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => glitch.updateStaticDisplacement({ intensity: v })}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            paramId="static_displace.intensity"
          />
          <SliderRow
            label="Scale"
            value={glitch.staticDisplacement.scale}
            min={1}
            max={100}
            step={1}
            onChange={(v) => glitch.updateStaticDisplacement({ scale: v })}
            format={(v) => v.toFixed(0)}
            paramId="static_displace.scale"
          />
          <SliderRow
            label="Speed"
            value={glitch.staticDisplacement.speed}
            min={0}
            max={10}
            step={0.1}
            onChange={(v) => glitch.updateStaticDisplacement({ speed: v })}
            paramId="static_displace.speed"
          />
          <SelectRow
            label="Direction"
            value={glitch.staticDisplacement.direction}
            options={[
              { value: 'both', label: 'Both' },
              { value: 'horizontal', label: 'Horizontal' },
              { value: 'vertical', label: 'Vertical' },
            ]}
            onChange={(v) => glitch.updateStaticDisplacement({ direction: v as 'both' | 'horizontal' | 'vertical' })}
          />
          <SelectRow
            label="Noise Type"
            value={glitch.staticDisplacement.noiseType}
            options={[
              { value: 'white', label: 'White' },
              { value: 'perlin', label: 'Perlin' },
            ]}
            onChange={(v) => glitch.updateStaticDisplacement({ noiseType: v as 'white' | 'perlin' })}
          />
        </div>
      )

    case 'color_grade':
      return (
        <div className="space-y-1">
          <SectionLabel label="Lift (Shadows)" />
          <SliderRow
            label="Red"
            value={glitch.colorGrade.liftR}
            min={-1}
            max={1}
            step={0.01}
            onChange={(v) => glitch.updateColorGrade({ liftR: v })}
            paramId="color_grade.liftR"
          />
          <SliderRow
            label="Green"
            value={glitch.colorGrade.liftG}
            min={-1}
            max={1}
            step={0.01}
            onChange={(v) => glitch.updateColorGrade({ liftG: v })}
            paramId="color_grade.liftG"
          />
          <SliderRow
            label="Blue"
            value={glitch.colorGrade.liftB}
            min={-1}
            max={1}
            step={0.01}
            onChange={(v) => glitch.updateColorGrade({ liftB: v })}
            paramId="color_grade.liftB"
          />
          <SectionLabel label="Gamma (Midtones)" />
          <SliderRow
            label="Red"
            value={glitch.colorGrade.gammaR}
            min={0.5}
            max={2}
            step={0.01}
            onChange={(v) => glitch.updateColorGrade({ gammaR: v })}
            paramId="color_grade.gammaR"
          />
          <SliderRow
            label="Green"
            value={glitch.colorGrade.gammaG}
            min={0.5}
            max={2}
            step={0.01}
            onChange={(v) => glitch.updateColorGrade({ gammaG: v })}
            paramId="color_grade.gammaG"
          />
          <SliderRow
            label="Blue"
            value={glitch.colorGrade.gammaB}
            min={0.5}
            max={2}
            step={0.01}
            onChange={(v) => glitch.updateColorGrade({ gammaB: v })}
            paramId="color_grade.gammaB"
          />
          <SectionLabel label="Gain (Highlights)" />
          <SliderRow
            label="Red"
            value={glitch.colorGrade.gainR}
            min={0}
            max={2}
            step={0.01}
            onChange={(v) => glitch.updateColorGrade({ gainR: v })}
            paramId="color_grade.gainR"
          />
          <SliderRow
            label="Green"
            value={glitch.colorGrade.gainG}
            min={0}
            max={2}
            step={0.01}
            onChange={(v) => glitch.updateColorGrade({ gainG: v })}
            paramId="color_grade.gainG"
          />
          <SliderRow
            label="Blue"
            value={glitch.colorGrade.gainB}
            min={0}
            max={2}
            step={0.01}
            onChange={(v) => glitch.updateColorGrade({ gainB: v })}
            paramId="color_grade.gainB"
          />
          <SectionLabel label="Global" />
          <SliderRow
            label="Saturation"
            value={glitch.colorGrade.saturation}
            min={0}
            max={2}
            step={0.01}
            onChange={(v) => glitch.updateColorGrade({ saturation: v })}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            paramId="color_grade.saturation"
          />
          <SliderRow
            label="Contrast"
            value={glitch.colorGrade.contrast}
            min={0}
            max={2}
            step={0.01}
            onChange={(v) => glitch.updateColorGrade({ contrast: v })}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            paramId="color_grade.contrast"
          />
          <SliderRow
            label="Brightness"
            value={glitch.colorGrade.brightness}
            min={-1}
            max={1}
            step={0.01}
            onChange={(v) => glitch.updateColorGrade({ brightness: v })}
            paramId="color_grade.brightness"
          />
          <SectionLabel label="Tint" />
          <ColorRow
            label="Tint Color"
            value={glitch.colorGrade.tintColor}
            onChange={(v) => glitch.updateColorGrade({ tintColor: v })}
          />
          <SliderRow
            label="Tint Amount"
            value={glitch.colorGrade.tintAmount}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => glitch.updateColorGrade({ tintAmount: v })}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            paramId="color_grade.tintAmount"
          />
          <SelectRow
            label="Tint Mode"
            value={glitch.colorGrade.tintMode}
            options={[
              { value: 'overlay', label: 'Overlay' },
              { value: 'multiply', label: 'Multiply' },
              { value: 'screen', label: 'Screen' },
            ]}
            onChange={(v) => glitch.updateColorGrade({ tintMode: v as 'overlay' | 'multiply' | 'screen' })}
          />
        </div>
      )

    case 'feedback':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Decay"
            value={glitch.feedbackLoop.decay}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => glitch.updateFeedbackLoop({ decay: v })}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            paramId="feedback.decay"
          />
          <SliderRow
            label="Offset X"
            value={glitch.feedbackLoop.offsetX}
            min={-0.1}
            max={0.1}
            step={0.001}
            onChange={(v) => glitch.updateFeedbackLoop({ offsetX: v })}
            format={(v) => (v * 100).toFixed(1)}
            paramId="feedback.offsetX"
          />
          <SliderRow
            label="Offset Y"
            value={glitch.feedbackLoop.offsetY}
            min={-0.1}
            max={0.1}
            step={0.001}
            onChange={(v) => glitch.updateFeedbackLoop({ offsetY: v })}
            format={(v) => (v * 100).toFixed(1)}
            paramId="feedback.offsetY"
          />
          <SliderRow
            label="Zoom"
            value={glitch.feedbackLoop.zoom}
            min={0.9}
            max={1.1}
            step={0.001}
            onChange={(v) => glitch.updateFeedbackLoop({ zoom: v })}
            format={(v) => `${(v * 100).toFixed(1)}%`}
            paramId="feedback.zoom"
          />
          <SliderRow
            label="Rotation"
            value={glitch.feedbackLoop.rotation}
            min={-10}
            max={10}
            step={0.1}
            onChange={(v) => glitch.updateFeedbackLoop({ rotation: v })}
            format={(v) => `${v.toFixed(1)}°`}
            paramId="feedback.rotation"
          />
          <SliderRow
            label="Hue Shift"
            value={glitch.feedbackLoop.hueShift}
            min={0}
            max={60}
            step={1}
            onChange={(v) => glitch.updateFeedbackLoop({ hueShift: v })}
            format={(v) => `${v.toFixed(0)}°`}
            paramId="feedback.hueShift"
          />
        </div>
      )

    case 'ascii':
    case 'matrix':
      return (
        <div className="space-y-1">
          <SelectRow
            label="Mode"
            value={ascii.params.mode}
            options={[
              { value: 'standard', label: 'ASCII' },
              { value: 'matrix', label: 'Matrix' },
              { value: 'blocks', label: 'Blocks' },
              { value: 'braille', label: 'Braille' },
            ]}
            onChange={(v) => ascii.updateParams({ mode: v as 'standard' | 'matrix' | 'blocks' | 'braille' })}
          />
          <SliderRow
            label="Font Size"
            value={ascii.params.fontSize}
            min={4}
            max={20}
            step={1}
            onChange={(v) => ascii.updateParams({ fontSize: v })}
            format={(v) => `${v.toFixed(0)}px`}
            paramId="ascii.fontSize"
          />
          <SliderRow
            label="Resolution"
            value={ascii.params.resolution}
            min={4}
            max={16}
            step={1}
            onChange={(v) => ascii.updateParams({ resolution: v })}
            format={(v) => v.toFixed(0)}
            paramId="ascii.resolution"
          />
          <SliderRow
            label="Contrast"
            value={ascii.params.contrast}
            min={0.5}
            max={2}
            step={0.05}
            onChange={(v) => ascii.updateParams({ contrast: v })}
            paramId="ascii.contrast"
          />
          <SelectRow
            label="Color"
            value={ascii.params.colorMode}
            options={[
              { value: 'mono', label: 'Mono' },
              { value: 'original', label: 'Original' },
              { value: 'gradient', label: 'Gradient' },
            ]}
            onChange={(v) => ascii.updateParams({ colorMode: v as 'mono' | 'original' | 'gradient' })}
          />
          <ToggleRow
            label="Invert"
            value={ascii.params.invert}
            onChange={(v) => ascii.updateParams({ invert: v })}
          />
          {ascii.params.mode === 'matrix' && (
            <>
              <SliderRow
                label="Speed"
                value={ascii.params.matrixSpeed}
                min={0.1}
                max={3}
                step={0.1}
                onChange={(v) => ascii.updateParams({ matrixSpeed: v })}
                paramId="ascii.matrixSpeed"
              />
              <SliderRow
                label="Density"
                value={ascii.params.matrixDensity}
                min={0.1}
                max={1}
                step={0.05}
                onChange={(v) => ascii.updateParams({ matrixDensity: v })}
                format={(v) => `${(v * 100).toFixed(0)}%`}
                paramId="ascii.matrixDensity"
              />
              <SliderRow
                label="Trail"
                value={ascii.params.matrixTrailLength}
                min={5}
                max={50}
                step={1}
                onChange={(v) => ascii.updateParams({ matrixTrailLength: v })}
                format={(v) => v.toFixed(0)}
                paramId="ascii.matrixTrailLength"
              />
            </>
          )}
          <ToggleRow
            label="Mask to Detections"
            value={ascii.params.maskToDetections}
            onChange={(v) => ascii.updateParams({ maskToDetections: v })}
          />
        </div>
      )

    case 'stipple':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Size"
            value={stipple.params.particleSize}
            min={1}
            max={8}
            step={0.5}
            onChange={(v) => stipple.updateParams({ particleSize: v })}
            paramId="stipple.particleSize"
          />
          <SliderRow
            label="Variation"
            value={stipple.params.particleSizeVariation}
            min={0}
            max={1}
            step={0.1}
            onChange={(v) => stipple.updateParams({ particleSizeVariation: v })}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            paramId="stipple.particleSizeVariation"
          />
          <SliderRow
            label="Density"
            value={stipple.params.density}
            min={0.1}
            max={3}
            step={0.1}
            onChange={(v) => stipple.updateParams({ density: v })}
            paramId="stipple.density"
          />
          <SliderRow
            label="Threshold"
            value={stipple.params.brightnessThreshold}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => stipple.updateParams({ brightnessThreshold: v })}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            paramId="stipple.brightnessThreshold"
          />
          <SliderRow
            label="Jitter"
            value={stipple.params.jitter}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => stipple.updateParams({ jitter: v })}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            paramId="stipple.jitter"
          />
          <SelectRow
            label="Color"
            value={stipple.params.colorMode}
            options={[
              { value: 'mono', label: 'Mono' },
              { value: 'original', label: 'Original' },
              { value: 'gradient', label: 'Gradient' },
            ]}
            onChange={(v) => stipple.updateParams({ colorMode: v as 'mono' | 'original' | 'gradient' })}
          />
          <ToggleRow
            label="Invert"
            value={stipple.params.invertBrightness}
            onChange={(v) => stipple.updateParams({ invertBrightness: v })}
          />
          <ToggleRow
            label="Animated"
            value={stipple.params.animated}
            onChange={(v) => stipple.updateParams({ animated: v })}
          />
          <ToggleRow
            label="Breathe"
            value={stipple.params.breathe}
            onChange={(v) => stipple.updateParams({ breathe: v })}
          />
        </div>
      )

    case 'contour':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Threshold"
            value={contour.params.threshold}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => contour.updateParams({ threshold: v })}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            paramId="contour.threshold"
          />
          <SliderRow
            label="Min Size"
            value={contour.params.minSize}
            min={0}
            max={0.5}
            step={0.01}
            onChange={(v) => contour.updateParams({ minSize: v })}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            paramId="contour.minSize"
          />
          <SliderRow
            label="Line Width"
            value={contour.params.baseWidth}
            min={1}
            max={10}
            step={0.5}
            onChange={(v) => contour.updateParams({ baseWidth: v })}
            paramId="contour.baseWidth"
          />
          <SliderRow
            label="Glow"
            value={contour.params.glowIntensity}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => contour.updateParams({ glowIntensity: v })}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            paramId="contour.glowIntensity"
          />
          <SliderRow
            label="Trail"
            value={contour.params.trailLength}
            min={0}
            max={5}
            step={0.1}
            onChange={(v) => contour.updateParams({ trailLength: v })}
            format={(v) => `${v.toFixed(1)}s`}
            paramId="contour.trailLength"
          />
          <SliderRow
            label="Smoothing"
            value={contour.params.positionSmoothing}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => contour.updateParams({ positionSmoothing: v })}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            paramId="contour.positionSmoothing"
          />
          <ColorRow
            label="Color"
            value={contour.params.color}
            onChange={(v) => contour.updateParams({ color: v })}
          />
          <ColorRow
            label="Glow Color"
            value={contour.params.glowColor}
            onChange={(v) => contour.updateParams({ glowColor: v })}
          />
          <SelectRow
            label="Detection"
            value={contour.params.mode}
            options={[
              { value: 'brightness', label: 'Brightness' },
              { value: 'edge', label: 'Edge' },
              { value: 'color', label: 'Color' },
              { value: 'motion', label: 'Motion' },
            ]}
            onChange={(v) => contour.updateParams({ mode: v as 'brightness' | 'edge' | 'color' | 'motion' })}
          />
          <SelectRow
            label="Fade Mode"
            value={contour.params.fadeMode}
            options={[
              { value: 'fade', label: 'Fade' },
              { value: 'fixed', label: 'Fixed' },
              { value: 'persistent', label: 'Persistent' },
            ]}
            onChange={(v) => contour.updateParams({ fadeMode: v as 'fade' | 'fixed' | 'persistent' })}
          />
        </div>
      )

    case 'landmarks':
      return (
        <div className="space-y-1">
          <SelectRow
            label="Mode"
            value={landmarks.currentMode}
            options={[
              { value: 'face', label: 'Face' },
              { value: 'hands', label: 'Hands' },
              { value: 'pose', label: 'Pose' },
              { value: 'holistic', label: 'Holistic' },
            ]}
            onChange={(v) => landmarks.setCurrentMode(v as 'face' | 'hands' | 'pose' | 'holistic')}
          />
          <SliderRow
            label="Detection"
            value={landmarks.minDetectionConfidence}
            min={0.1}
            max={0.9}
            step={0.05}
            onChange={(v) => landmarks.setMinDetectionConfidence(v)}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            paramId="landmarks.minDetectionConfidence"
          />
          <SliderRow
            label="Tracking"
            value={landmarks.minTrackingConfidence}
            min={0.1}
            max={0.9}
            step={0.05}
            onChange={(v) => landmarks.setMinTrackingConfidence(v)}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            paramId="landmarks.minTrackingConfidence"
          />
          {(landmarks.currentMode === 'face' || landmarks.currentMode === 'holistic') && (
            <SliderRow
              label="Max Faces"
              value={landmarks.maxFaces}
              min={1}
              max={4}
              step={1}
              onChange={(v) => landmarks.setMaxFaces(v)}
              paramId="landmarks.maxFaces"
            />
          )}
          {(landmarks.currentMode === 'hands' || landmarks.currentMode === 'holistic') && (
            <SliderRow
              label="Max Hands"
              value={landmarks.maxHands}
              min={1}
              max={4}
              step={1}
              onChange={(v) => landmarks.setMaxHands(v)}
              paramId="landmarks.maxHands"
            />
          )}
          <ToggleRow
            label="Attach to Detections"
            value={landmarks.attachToDetections}
            onChange={(v) => landmarks.setAttachToDetections(v)}
          />
        </div>
      )

    // ═══════════════════════════════════════════════════════════════
    // VISION TRACKING EFFECTS
    // ═══════════════════════════════════════════════════════════════

    case 'track_bright':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Threshold"
            value={visionTracking.brightParams.threshold}
            min={0}
            max={255}
            step={1}
            onChange={(v) => visionTracking.updateBrightParams({ threshold: v })}
            format={(v) => `${Math.round((v / 255) * 100)}%`}
            paramId="track_bright.threshold"
          />
          <SliderRow
            label="Min Size"
            value={visionTracking.brightParams.minSize}
            min={1}
            max={100}
            step={1}
            onChange={(v) => visionTracking.updateBrightParams({ minSize: v })}
            format={(v) => `${v}px`}
            paramId="track_bright.minSize"
          />
          <SliderRow
            label="Max Blobs"
            value={visionTracking.brightParams.maxBlobs}
            min={1}
            max={50}
            step={1}
            onChange={(v) => visionTracking.updateBrightParams({ maxBlobs: v })}
            paramId="track_bright.maxBlobs"
          />
          <SectionLabel label="Display" />
          <ToggleRow
            label="Show Boxes"
            value={visionTracking.brightParams.showBoxes}
            onChange={(v) => visionTracking.updateBrightParams({ showBoxes: v })}
          />
          <ToggleRow
            label="Show Lines"
            value={visionTracking.brightParams.showLines}
            onChange={(v) => visionTracking.updateBrightParams({ showLines: v })}
          />
          <ToggleRow
            label="Show Labels"
            value={visionTracking.brightParams.showLabels}
            onChange={(v) => visionTracking.updateBrightParams({ showLabels: v })}
          />
          <BoxShapeButtonGrid
            value={visionTracking.brightParams.boxShape}
            onChange={(v) => visionTracking.updateBrightParams({ boxShape: v })}
          />
          <LineStyleButtonGrid
            value={visionTracking.brightParams.lineStyle}
            onChange={(v) => visionTracking.updateBrightParams({ lineStyle: v })}
          />
          <ColorRow
            label="Box Color"
            value={visionTracking.brightParams.boxColor}
            onChange={(v) => visionTracking.updateBrightParams({ boxColor: v })}
          />
          <SectionLabel label="Box Filter" />
          <FilterButtonGrid
            value={visionTracking.brightParams.boxFilter}
            onChange={(v) => visionTracking.updateBrightParams({ boxFilter: v })}
          />
          {visionTracking.brightParams.boxFilter !== 'none' && (
            <SliderRow
              label="Intensity"
              value={visionTracking.brightParams.boxFilterIntensity}
              min={0}
              max={100}
              step={5}
              onChange={(v) => visionTracking.updateBrightParams({ boxFilterIntensity: v })}
              format={(v) => `${v.toFixed(0)}%`}
              paramId="track_bright.boxFilterIntensity"
            />
          )}
          <SectionLabel label="Global" />
          <ToggleRow
            label="Lines Only"
            value={visionTracking.linesOnly}
            onChange={(v) => visionTracking.setLinesOnly(v)}
          />
        </div>
      )

    case 'track_edge':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Threshold"
            value={visionTracking.edgeParams.threshold}
            min={0}
            max={255}
            step={1}
            onChange={(v) => visionTracking.updateEdgeParams({ threshold: v })}
            format={(v) => `${Math.round((v / 255) * 100)}%`}
            paramId="track_edge.threshold"
          />
          <SliderRow
            label="Min Size"
            value={visionTracking.edgeParams.minSize}
            min={1}
            max={100}
            step={1}
            onChange={(v) => visionTracking.updateEdgeParams({ minSize: v })}
            format={(v) => `${v}px`}
            paramId="track_edge.minSize"
          />
          <SliderRow
            label="Max Blobs"
            value={visionTracking.edgeParams.maxBlobs}
            min={1}
            max={50}
            step={1}
            onChange={(v) => visionTracking.updateEdgeParams({ maxBlobs: v })}
            paramId="track_edge.maxBlobs"
          />
          <SectionLabel label="Display" />
          <ToggleRow
            label="Show Boxes"
            value={visionTracking.edgeParams.showBoxes}
            onChange={(v) => visionTracking.updateEdgeParams({ showBoxes: v })}
          />
          <ToggleRow
            label="Show Lines"
            value={visionTracking.edgeParams.showLines}
            onChange={(v) => visionTracking.updateEdgeParams({ showLines: v })}
          />
          <ToggleRow
            label="Show Labels"
            value={visionTracking.edgeParams.showLabels}
            onChange={(v) => visionTracking.updateEdgeParams({ showLabels: v })}
          />
          <BoxShapeButtonGrid
            value={visionTracking.edgeParams.boxShape}
            onChange={(v) => visionTracking.updateEdgeParams({ boxShape: v })}
          />
          <LineStyleButtonGrid
            value={visionTracking.edgeParams.lineStyle}
            onChange={(v) => visionTracking.updateEdgeParams({ lineStyle: v })}
          />
          <ColorRow
            label="Box Color"
            value={visionTracking.edgeParams.boxColor}
            onChange={(v) => visionTracking.updateEdgeParams({ boxColor: v })}
          />
          <SectionLabel label="Box Filter" />
          <FilterButtonGrid
            value={visionTracking.edgeParams.boxFilter}
            onChange={(v) => visionTracking.updateEdgeParams({ boxFilter: v })}
          />
          {visionTracking.edgeParams.boxFilter !== 'none' && (
            <SliderRow
              label="Intensity"
              value={visionTracking.edgeParams.boxFilterIntensity}
              min={0}
              max={100}
              step={5}
              onChange={(v) => visionTracking.updateEdgeParams({ boxFilterIntensity: v })}
              format={(v) => `${v.toFixed(0)}%`}
              paramId="track_edge.boxFilterIntensity"
            />
          )}
          <SectionLabel label="Global" />
          <ToggleRow
            label="Lines Only"
            value={visionTracking.linesOnly}
            onChange={(v) => visionTracking.setLinesOnly(v)}
          />
        </div>
      )

    case 'track_color':
      return (
        <div className="space-y-1">
          <ColorRow
            label="Target Color"
            value={visionTracking.colorParams.targetColor}
            onChange={(v) => visionTracking.updateColorParams({ targetColor: v })}
          />
          <SliderRow
            label="Color Range"
            value={visionTracking.colorParams.colorRange}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => visionTracking.updateColorParams({ colorRange: v })}
            format={(v) => `${Math.round(v * 100)}%`}
            paramId="track_color.colorRange"
          />
          <SliderRow
            label="Min Size"
            value={visionTracking.colorParams.minSize}
            min={1}
            max={100}
            step={1}
            onChange={(v) => visionTracking.updateColorParams({ minSize: v })}
            format={(v) => `${v}px`}
            paramId="track_color.minSize"
          />
          <SectionLabel label="Display" />
          <ToggleRow
            label="Show Boxes"
            value={visionTracking.colorParams.showBoxes}
            onChange={(v) => visionTracking.updateColorParams({ showBoxes: v })}
          />
          <ToggleRow
            label="Show Lines"
            value={visionTracking.colorParams.showLines}
            onChange={(v) => visionTracking.updateColorParams({ showLines: v })}
          />
          <ToggleRow
            label="Show Labels"
            value={visionTracking.colorParams.showLabels}
            onChange={(v) => visionTracking.updateColorParams({ showLabels: v })}
          />
          <BoxShapeButtonGrid
            value={visionTracking.colorParams.boxShape}
            onChange={(v) => visionTracking.updateColorParams({ boxShape: v })}
          />
          <LineStyleButtonGrid
            value={visionTracking.colorParams.lineStyle}
            onChange={(v) => visionTracking.updateColorParams({ lineStyle: v })}
          />
          <ColorRow
            label="Box Color"
            value={visionTracking.colorParams.boxColor}
            onChange={(v) => visionTracking.updateColorParams({ boxColor: v })}
          />
          <SectionLabel label="Box Filter" />
          <FilterButtonGrid
            value={visionTracking.colorParams.boxFilter}
            onChange={(v) => visionTracking.updateColorParams({ boxFilter: v })}
          />
          {visionTracking.colorParams.boxFilter !== 'none' && (
            <SliderRow
              label="Intensity"
              value={visionTracking.colorParams.boxFilterIntensity}
              min={0}
              max={100}
              step={5}
              onChange={(v) => visionTracking.updateColorParams({ boxFilterIntensity: v })}
              format={(v) => `${v.toFixed(0)}%`}
              paramId="track_color.boxFilterIntensity"
            />
          )}
          <SectionLabel label="Global" />
          <ToggleRow
            label="Lines Only"
            value={visionTracking.linesOnly}
            onChange={(v) => visionTracking.setLinesOnly(v)}
          />
        </div>
      )

    case 'track_motion':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Sensitivity"
            value={visionTracking.motionParams.sensitivity}
            min={0}
            max={100}
            step={1}
            onChange={(v) => visionTracking.updateMotionParams({ sensitivity: v })}
            format={(v) => `${v}%`}
            paramId="track_motion.sensitivity"
          />
          <SliderRow
            label="Min Size"
            value={visionTracking.motionParams.minSize}
            min={1}
            max={100}
            step={1}
            onChange={(v) => visionTracking.updateMotionParams({ minSize: v })}
            format={(v) => `${v}px`}
            paramId="track_motion.minSize"
          />
          <SectionLabel label="Display" />
          <ToggleRow
            label="Show Boxes"
            value={visionTracking.motionParams.showBoxes}
            onChange={(v) => visionTracking.updateMotionParams({ showBoxes: v })}
          />
          <ToggleRow
            label="Show Lines"
            value={visionTracking.motionParams.showLines}
            onChange={(v) => visionTracking.updateMotionParams({ showLines: v })}
          />
          <ToggleRow
            label="Show Labels"
            value={visionTracking.motionParams.showLabels}
            onChange={(v) => visionTracking.updateMotionParams({ showLabels: v })}
          />
          <BoxShapeButtonGrid
            value={visionTracking.motionParams.boxShape}
            onChange={(v) => visionTracking.updateMotionParams({ boxShape: v })}
          />
          <LineStyleButtonGrid
            value={visionTracking.motionParams.lineStyle}
            onChange={(v) => visionTracking.updateMotionParams({ lineStyle: v })}
          />
          <ColorRow
            label="Box Color"
            value={visionTracking.motionParams.boxColor}
            onChange={(v) => visionTracking.updateMotionParams({ boxColor: v })}
          />
          <SectionLabel label="Box Filter" />
          <FilterButtonGrid
            value={visionTracking.motionParams.boxFilter}
            onChange={(v) => visionTracking.updateMotionParams({ boxFilter: v })}
          />
          {visionTracking.motionParams.boxFilter !== 'none' && (
            <SliderRow
              label="Intensity"
              value={visionTracking.motionParams.boxFilterIntensity}
              min={0}
              max={100}
              step={5}
              onChange={(v) => visionTracking.updateMotionParams({ boxFilterIntensity: v })}
              format={(v) => `${v.toFixed(0)}%`}
              paramId="track_motion.boxFilterIntensity"
            />
          )}
          <SectionLabel label="Global" />
          <ToggleRow
            label="Lines Only"
            value={visionTracking.linesOnly}
            onChange={(v) => visionTracking.setLinesOnly(v)}
          />
        </div>
      )

    case 'track_face':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Sensitivity"
            value={visionTracking.faceParams.threshold}
            min={0}
            max={100}
            step={1}
            onChange={(v) => visionTracking.updateFaceParams({ threshold: v })}
            format={(v) => `${v}%`}
            paramId="track_face.threshold"
          />
          <SliderRow
            label="Min Size"
            value={visionTracking.faceParams.minSize}
            min={10}
            max={200}
            step={5}
            onChange={(v) => visionTracking.updateFaceParams({ minSize: v })}
            format={(v) => `${v}px`}
            paramId="track_face.minSize"
          />
          <SliderRow
            label="Max Blobs"
            value={visionTracking.faceParams.maxBlobs}
            min={1}
            max={10}
            step={1}
            onChange={(v) => visionTracking.updateFaceParams({ maxBlobs: v })}
            paramId="track_face.maxBlobs"
          />
          <SectionLabel label="Display" />
          <ToggleRow
            label="Show Boxes"
            value={visionTracking.faceParams.showBoxes}
            onChange={(v) => visionTracking.updateFaceParams({ showBoxes: v })}
          />
          <ToggleRow
            label="Show Lines"
            value={visionTracking.faceParams.showLines}
            onChange={(v) => visionTracking.updateFaceParams({ showLines: v })}
          />
          <ToggleRow
            label="Show Labels"
            value={visionTracking.faceParams.showLabels}
            onChange={(v) => visionTracking.updateFaceParams({ showLabels: v })}
          />
          <BoxShapeButtonGrid
            value={visionTracking.faceParams.boxShape}
            onChange={(v) => visionTracking.updateFaceParams({ boxShape: v })}
          />
          <LineStyleButtonGrid
            value={visionTracking.faceParams.lineStyle}
            onChange={(v) => visionTracking.updateFaceParams({ lineStyle: v })}
          />
          <ColorRow
            label="Box Color"
            value={visionTracking.faceParams.boxColor}
            onChange={(v) => visionTracking.updateFaceParams({ boxColor: v })}
          />
          <SectionLabel label="Box Filter" />
          <FilterButtonGrid
            value={visionTracking.faceParams.boxFilter}
            onChange={(v) => visionTracking.updateFaceParams({ boxFilter: v })}
          />
          {visionTracking.faceParams.boxFilter !== 'none' && (
            <SliderRow
              label="Intensity"
              value={visionTracking.faceParams.boxFilterIntensity}
              min={0}
              max={100}
              step={5}
              onChange={(v) => visionTracking.updateFaceParams({ boxFilterIntensity: v })}
              format={(v) => `${v.toFixed(0)}%`}
              paramId="track_face.boxFilterIntensity"
            />
          )}
          <SectionLabel label="Global" />
          <ToggleRow
            label="Lines Only"
            value={visionTracking.linesOnly}
            onChange={(v) => visionTracking.setLinesOnly(v)}
          />
        </div>
      )

    case 'track_hands':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Sensitivity"
            value={visionTracking.handsParams.threshold}
            min={0}
            max={100}
            step={1}
            onChange={(v) => visionTracking.updateHandsParams({ threshold: v })}
            format={(v) => `${v}%`}
            paramId="track_hands.threshold"
          />
          <SliderRow
            label="Min Size"
            value={visionTracking.handsParams.minSize}
            min={1}
            max={100}
            step={1}
            onChange={(v) => visionTracking.updateHandsParams({ minSize: v })}
            format={(v) => `${v}px`}
            paramId="track_hands.minSize"
          />
          <SliderRow
            label="Max Blobs"
            value={visionTracking.handsParams.maxBlobs}
            min={1}
            max={20}
            step={1}
            onChange={(v) => visionTracking.updateHandsParams({ maxBlobs: v })}
            paramId="track_hands.maxBlobs"
          />
          <SectionLabel label="Display" />
          <ToggleRow
            label="Show Boxes"
            value={visionTracking.handsParams.showBoxes}
            onChange={(v) => visionTracking.updateHandsParams({ showBoxes: v })}
          />
          <ToggleRow
            label="Show Lines"
            value={visionTracking.handsParams.showLines}
            onChange={(v) => visionTracking.updateHandsParams({ showLines: v })}
          />
          <ToggleRow
            label="Show Labels"
            value={visionTracking.handsParams.showLabels}
            onChange={(v) => visionTracking.updateHandsParams({ showLabels: v })}
          />
          <BoxShapeButtonGrid
            value={visionTracking.handsParams.boxShape}
            onChange={(v) => visionTracking.updateHandsParams({ boxShape: v })}
          />
          <LineStyleButtonGrid
            value={visionTracking.handsParams.lineStyle}
            onChange={(v) => visionTracking.updateHandsParams({ lineStyle: v })}
          />
          <ColorRow
            label="Box Color"
            value={visionTracking.handsParams.boxColor}
            onChange={(v) => visionTracking.updateHandsParams({ boxColor: v })}
          />
          <SectionLabel label="Box Filter" />
          <FilterButtonGrid
            value={visionTracking.handsParams.boxFilter}
            onChange={(v) => visionTracking.updateHandsParams({ boxFilter: v })}
          />
          {visionTracking.handsParams.boxFilter !== 'none' && (
            <SliderRow
              label="Intensity"
              value={visionTracking.handsParams.boxFilterIntensity}
              min={0}
              max={100}
              step={5}
              onChange={(v) => visionTracking.updateHandsParams({ boxFilterIntensity: v })}
              format={(v) => `${v.toFixed(0)}%`}
              paramId="track_hands.boxFilterIntensity"
            />
          )}
          <SectionLabel label="Global" />
          <ToggleRow
            label="Lines Only"
            value={visionTracking.linesOnly}
            onChange={(v) => visionTracking.setLinesOnly(v)}
          />
        </div>
      )

    // ═══════════════════════════════════════════════════════════════
    // PAGE 2: ACID EFFECTS
    // ═══════════════════════════════════════════════════════════════

    case 'acid_dots':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Grid Size"
            value={acid.dotsParams.gridSize}
            min={4}
            max={32}
            step={2}
            onChange={(v) => acid.updateDotsParams({ gridSize: v })}
            format={(v) => `${v.toFixed(0)}px`}
            paramId="acid_dots.gridSize"
          />
          <SliderRow
            label="Dot Scale"
            value={acid.dotsParams.dotScale}
            min={0.5}
            max={2}
            step={0.1}
            onChange={(v) => acid.updateDotsParams({ dotScale: v })}
            paramId="acid_dots.dotScale"
          />
          <SliderRow
            label="Threshold"
            value={acid.dotsParams.threshold}
            min={0}
            max={255}
            step={5}
            onChange={(v) => acid.updateDotsParams({ threshold: v })}
            format={(v) => v.toFixed(0)}
            paramId="acid_dots.threshold"
          />
          <SelectRow
            label="Shape"
            value={acid.dotsParams.shape}
            options={[
              { value: 'circle', label: 'Circle' },
              { value: 'square', label: 'Square' },
              { value: 'diamond', label: 'Diamond' },
            ]}
            onChange={(v) => acid.updateDotsParams({ shape: v as 'circle' | 'square' | 'diamond' })}
          />
          <SectionLabel label="Global" />
          <ToggleRow
            label="Preserve Video"
            value={acid.preserveVideo}
            onChange={(v) => acid.setPreserveVideo(v)}
          />
        </div>
      )

    case 'acid_glyph':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Grid Size"
            value={acid.glyphParams.gridSize}
            min={8}
            max={24}
            step={2}
            onChange={(v) => acid.updateGlyphParams({ gridSize: v })}
            format={(v) => `${v.toFixed(0)}px`}
            paramId="acid_glyph.gridSize"
          />
          <SelectRow
            label="Charset"
            value={acid.glyphParams.charset}
            options={[
              { value: 'geometric', label: 'Geometric' },
              { value: 'arrows', label: 'Arrows' },
              { value: 'blocks', label: 'Blocks' },
              { value: 'math', label: 'Math' },
            ]}
            onChange={(v) => acid.updateGlyphParams({ charset: v as 'geometric' | 'arrows' | 'blocks' | 'math' })}
          />
          <SliderRow
            label="Density"
            value={acid.glyphParams.density}
            min={0.3}
            max={1}
            step={0.1}
            onChange={(v) => acid.updateGlyphParams({ density: v })}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            paramId="acid_glyph.density"
          />
          <ToggleRow
            label="Invert"
            value={acid.glyphParams.invert}
            onChange={(v) => acid.updateGlyphParams({ invert: v })}
          />
          <SectionLabel label="Global" />
          <ToggleRow
            label="Preserve Video"
            value={acid.preserveVideo}
            onChange={(v) => acid.setPreserveVideo(v)}
          />
        </div>
      )

    case 'acid_icons':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Grid Size"
            value={acid.iconsParams.gridSize}
            min={16}
            max={48}
            step={4}
            onChange={(v) => acid.updateIconsParams({ gridSize: v })}
            format={(v) => `${v.toFixed(0)}px`}
            paramId="acid_icons.gridSize"
          />
          <SelectRow
            label="Icon Set"
            value={acid.iconsParams.iconSet}
            options={[
              { value: 'tech', label: 'Tech' },
              { value: 'nature', label: 'Nature' },
              { value: 'abstract', label: 'Abstract' },
              { value: 'faces', label: 'Faces' },
            ]}
            onChange={(v) => acid.updateIconsParams({ iconSet: v as 'tech' | 'nature' | 'abstract' | 'faces' })}
          />
          <SliderRow
            label="Rotation"
            value={acid.iconsParams.rotation}
            min={0}
            max={360}
            step={15}
            onChange={(v) => acid.updateIconsParams({ rotation: v })}
            format={(v) => `${v.toFixed(0)}°`}
            paramId="acid_icons.rotation"
          />
          <SelectRow
            label="Color Mode"
            value={acid.iconsParams.colorMode}
            options={[
              { value: 'mono', label: 'Mono' },
              { value: 'tint', label: 'Tint' },
              { value: 'original', label: 'Original' },
            ]}
            onChange={(v) => acid.updateIconsParams({ colorMode: v as 'mono' | 'tint' | 'original' })}
          />
          <SectionLabel label="Global" />
          <ToggleRow
            label="Preserve Video"
            value={acid.preserveVideo}
            onChange={(v) => acid.setPreserveVideo(v)}
          />
        </div>
      )

    case 'acid_contour':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Levels"
            value={acid.contourParams.levels}
            min={4}
            max={20}
            step={1}
            onChange={(v) => acid.updateContourParams({ levels: v })}
            format={(v) => v.toFixed(0)}
            paramId="acid_contour.levels"
          />
          <SliderRow
            label="Line Width"
            value={acid.contourParams.lineWidth}
            min={1}
            max={4}
            step={0.5}
            onChange={(v) => acid.updateContourParams({ lineWidth: v })}
            format={(v) => `${v.toFixed(1)}px`}
            paramId="acid_contour.lineWidth"
          />
          <SliderRow
            label="Smooth"
            value={acid.contourParams.smooth}
            min={0}
            max={1}
            step={0.1}
            onChange={(v) => acid.updateContourParams({ smooth: v })}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            paramId="acid_contour.smooth"
          />
          <ToggleRow
            label="Animate"
            value={acid.contourParams.animate}
            onChange={(v) => acid.updateContourParams({ animate: v })}
          />
          <SectionLabel label="Global" />
          <ToggleRow
            label="Preserve Video"
            value={acid.preserveVideo}
            onChange={(v) => acid.setPreserveVideo(v)}
          />
        </div>
      )

    case 'acid_decomp':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Min Block"
            value={acid.decompParams.minBlock}
            min={8}
            max={64}
            step={8}
            onChange={(v) => acid.updateDecompParams({ minBlock: v })}
            format={(v) => `${v.toFixed(0)}px`}
            paramId="acid_decomp.minBlock"
          />
          <SliderRow
            label="Max Block"
            value={acid.decompParams.maxBlock}
            min={32}
            max={256}
            step={16}
            onChange={(v) => acid.updateDecompParams({ maxBlock: v })}
            format={(v) => `${v.toFixed(0)}px`}
            paramId="acid_decomp.maxBlock"
          />
          <SliderRow
            label="Threshold"
            value={acid.decompParams.threshold}
            min={0}
            max={100}
            step={5}
            onChange={(v) => acid.updateDecompParams({ threshold: v })}
            format={(v) => v.toFixed(0)}
            paramId="acid_decomp.threshold"
          />
          <ToggleRow
            label="Show Grid"
            value={acid.decompParams.showGrid}
            onChange={(v) => acid.updateDecompParams({ showGrid: v })}
          />
          <SelectRow
            label="Fill Mode"
            value={acid.decompParams.fillMode}
            options={[
              { value: 'solid', label: 'Solid' },
              { value: 'average', label: 'Average' },
              { value: 'original', label: 'Original' },
            ]}
            onChange={(v) => acid.updateDecompParams({ fillMode: v as 'solid' | 'average' | 'original' })}
          />
          <SectionLabel label="Global" />
          <ToggleRow
            label="Preserve Video"
            value={acid.preserveVideo}
            onChange={(v) => acid.setPreserveVideo(v)}
          />
        </div>
      )

    case 'acid_mirror':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Segments"
            value={acid.mirrorParams.segments}
            min={2}
            max={8}
            step={1}
            onChange={(v) => acid.updateMirrorParams({ segments: v })}
            format={(v) => v.toFixed(0)}
            paramId="acid_mirror.segments"
          />
          <SliderRow
            label="Center X"
            value={acid.mirrorParams.centerX}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => acid.updateMirrorParams({ centerX: v })}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            paramId="acid_mirror.centerX"
          />
          <SliderRow
            label="Center Y"
            value={acid.mirrorParams.centerY}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => acid.updateMirrorParams({ centerY: v })}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            paramId="acid_mirror.centerY"
          />
          <SliderRow
            label="Rotation"
            value={acid.mirrorParams.rotation}
            min={0}
            max={360}
            step={5}
            onChange={(v) => acid.updateMirrorParams({ rotation: v })}
            format={(v) => `${v.toFixed(0)}°`}
            paramId="acid_mirror.rotation"
          />
          <SectionLabel label="Global" />
          <ToggleRow
            label="Preserve Video"
            value={acid.preserveVideo}
            onChange={(v) => acid.setPreserveVideo(v)}
          />
        </div>
      )

    case 'acid_slice':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Slice Count"
            value={acid.sliceParams.sliceCount}
            min={4}
            max={64}
            step={4}
            onChange={(v) => acid.updateSliceParams({ sliceCount: v })}
            format={(v) => v.toFixed(0)}
            paramId="acid_slice.sliceCount"
          />
          <SelectRow
            label="Direction"
            value={acid.sliceParams.direction}
            options={[
              { value: 'horizontal', label: 'Horizontal' },
              { value: 'vertical', label: 'Vertical' },
              { value: 'both', label: 'Both' },
            ]}
            onChange={(v) => acid.updateSliceParams({ direction: v as 'horizontal' | 'vertical' | 'both' })}
          />
          <SliderRow
            label="Offset"
            value={acid.sliceParams.offset}
            min={0}
            max={100}
            step={5}
            onChange={(v) => acid.updateSliceParams({ offset: v })}
            format={(v) => `${v.toFixed(0)}%`}
            paramId="acid_slice.offset"
          />
          <ToggleRow
            label="Wave"
            value={acid.sliceParams.wave}
            onChange={(v) => acid.updateSliceParams({ wave: v })}
          />
          <SectionLabel label="Global" />
          <ToggleRow
            label="Preserve Video"
            value={acid.preserveVideo}
            onChange={(v) => acid.setPreserveVideo(v)}
          />
        </div>
      )

    case 'acid_thgrid':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Threshold"
            value={acid.thGridParams.threshold}
            min={0}
            max={255}
            step={5}
            onChange={(v) => acid.updateThGridParams({ threshold: v })}
            format={(v) => v.toFixed(0)}
            paramId="acid_thgrid.threshold"
          />
          <SliderRow
            label="Grid Size"
            value={acid.thGridParams.gridSize}
            min={16}
            max={128}
            step={8}
            onChange={(v) => acid.updateThGridParams({ gridSize: v })}
            format={(v) => `${v.toFixed(0)}px`}
            paramId="acid_thgrid.gridSize"
          />
          <SliderRow
            label="Line Width"
            value={acid.thGridParams.lineWidth}
            min={1}
            max={4}
            step={0.5}
            onChange={(v) => acid.updateThGridParams({ lineWidth: v })}
            format={(v) => `${v.toFixed(1)}px`}
            paramId="acid_thgrid.lineWidth"
          />
          <ToggleRow
            label="Invert"
            value={acid.thGridParams.invert}
            onChange={(v) => acid.updateThGridParams({ invert: v })}
          />
          <ToggleRow
            label="Corner Marks"
            value={acid.thGridParams.cornerMarks}
            onChange={(v) => acid.updateThGridParams({ cornerMarks: v })}
          />
          <SectionLabel label="Global" />
          <ToggleRow
            label="Preserve Video"
            value={acid.preserveVideo}
            onChange={(v) => acid.setPreserveVideo(v)}
          />
        </div>
      )

    case 'acid_cloud':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Density"
            value={acid.cloudParams.density}
            min={1000}
            max={50000}
            step={1000}
            onChange={(v) => acid.updateCloudParams({ density: v })}
            format={(v) => `${(v / 1000).toFixed(0)}k`}
            paramId="acid_cloud.density"
          />
          <SliderRow
            label="Depth Scale"
            value={acid.cloudParams.depthScale}
            min={0}
            max={100}
            step={5}
            onChange={(v) => acid.updateCloudParams({ depthScale: v })}
            format={(v) => v.toFixed(0)}
            paramId="acid_cloud.depthScale"
          />
          <SliderRow
            label="Perspective"
            value={acid.cloudParams.perspective}
            min={0.5}
            max={2}
            step={0.1}
            onChange={(v) => acid.updateCloudParams({ perspective: v })}
            paramId="acid_cloud.perspective"
          />
          <ToggleRow
            label="Rotate"
            value={acid.cloudParams.rotate}
            onChange={(v) => acid.updateCloudParams({ rotate: v })}
          />
          <SectionLabel label="Global" />
          <ToggleRow
            label="Preserve Video"
            value={acid.preserveVideo}
            onChange={(v) => acid.setPreserveVideo(v)}
          />
        </div>
      )

    case 'acid_led':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Grid Size"
            value={acid.ledParams.gridSize}
            min={4}
            max={16}
            step={2}
            onChange={(v) => acid.updateLedParams({ gridSize: v })}
            format={(v) => `${v.toFixed(0)}px`}
            paramId="acid_led.gridSize"
          />
          <SliderRow
            label="Dot Size"
            value={acid.ledParams.dotSize}
            min={0.3}
            max={0.9}
            step={0.1}
            onChange={(v) => acid.updateLedParams({ dotSize: v })}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            paramId="acid_led.dotSize"
          />
          <SliderRow
            label="Brightness"
            value={acid.ledParams.brightness}
            min={0.5}
            max={2}
            step={0.1}
            onChange={(v) => acid.updateLedParams({ brightness: v })}
            paramId="acid_led.brightness"
          />
          <SliderRow
            label="Bleed"
            value={acid.ledParams.bleed}
            min={0}
            max={1}
            step={0.1}
            onChange={(v) => acid.updateLedParams({ bleed: v })}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            paramId="acid_led.bleed"
          />
          <SectionLabel label="Global" />
          <ToggleRow
            label="Preserve Video"
            value={acid.preserveVideo}
            onChange={(v) => acid.setPreserveVideo(v)}
          />
        </div>
      )

    case 'acid_slit':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Slit Position"
            value={acid.slitParams.slitPosition}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => acid.updateSlitParams({ slitPosition: v })}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            paramId="acid_slit.slitPosition"
          />
          <SelectRow
            label="Direction"
            value={acid.slitParams.direction}
            options={[
              { value: 'horizontal', label: 'Horizontal' },
              { value: 'vertical', label: 'Vertical' },
            ]}
            onChange={(v) => acid.updateSlitParams({ direction: v as 'horizontal' | 'vertical' })}
          />
          <SliderRow
            label="Speed"
            value={acid.slitParams.speed}
            min={1}
            max={10}
            step={1}
            onChange={(v) => acid.updateSlitParams({ speed: v })}
            format={(v) => v.toFixed(0)}
            paramId="acid_slit.speed"
          />
          <SliderRow
            label="Blend"
            value={acid.slitParams.blend}
            min={0}
            max={1}
            step={0.1}
            onChange={(v) => acid.updateSlitParams({ blend: v })}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            paramId="acid_slit.blend"
          />
          <SectionLabel label="Global" />
          <ToggleRow
            label="Preserve Video"
            value={acid.preserveVideo}
            onChange={(v) => acid.setPreserveVideo(v)}
          />
        </div>
      )

    case 'acid_voronoi':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Cell Count"
            value={acid.voronoiParams.cellCount}
            min={16}
            max={256}
            step={16}
            onChange={(v) => acid.updateVoronoiParams({ cellCount: v })}
            format={(v) => v.toFixed(0)}
            paramId="acid_voronoi.cellCount"
          />
          <SelectRow
            label="Seed Mode"
            value={acid.voronoiParams.seedMode}
            options={[
              { value: 'random', label: 'Random' },
              { value: 'brightness', label: 'Brightness' },
              { value: 'edges', label: 'Edges' },
            ]}
            onChange={(v) => acid.updateVoronoiParams({ seedMode: v as 'random' | 'brightness' | 'edges' })}
          />
          <ToggleRow
            label="Show Edges"
            value={acid.voronoiParams.showEdges}
            onChange={(v) => acid.updateVoronoiParams({ showEdges: v })}
          />
          <SelectRow
            label="Fill Mode"
            value={acid.voronoiParams.fillMode}
            options={[
              { value: 'average', label: 'Average' },
              { value: 'centroid', label: 'Centroid' },
              { value: 'original', label: 'Original' },
            ]}
            onChange={(v) => acid.updateVoronoiParams({ fillMode: v as 'average' | 'centroid' | 'original' })}
          />
          <SectionLabel label="Global" />
          <ToggleRow
            label="Preserve Video"
            value={acid.preserveVideo}
            onChange={(v) => acid.setPreserveVideo(v)}
          />
        </div>
      )

    case 'acid_halftone':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Dot Size"
            value={acid.halftoneParams.dotSize}
            min={4}
            max={24}
            step={1}
            onChange={(v) => acid.updateHalftoneParams({ dotSize: v })}
            paramId="acid_halftone.dotSize"
          />
          <SliderRow
            label="Angle"
            value={acid.halftoneParams.angle}
            min={0}
            max={90}
            step={5}
            onChange={(v) => acid.updateHalftoneParams({ angle: v })}
            paramId="acid_halftone.angle"
          />
          <SelectRow
            label="Color Mode"
            value={acid.halftoneParams.colorMode}
            options={[
              { value: 'mono', label: 'Mono' },
              { value: 'cmyk', label: 'CMYK' },
              { value: 'rgb', label: 'RGB' },
            ]}
            onChange={(v) => acid.updateHalftoneParams({ colorMode: v as 'mono' | 'cmyk' | 'rgb' })}
          />
          <SliderRow
            label="Contrast"
            value={acid.halftoneParams.contrast * 100}
            min={50}
            max={200}
            step={10}
            onChange={(v) => acid.updateHalftoneParams({ contrast: v / 100 })}
            format={(v) => `${v.toFixed(0)}%`}
            paramId="acid_halftone.contrast"
          />
          <SectionLabel label="Global" />
          <ToggleRow
            label="Preserve Video"
            value={acid.preserveVideo}
            onChange={(v) => acid.setPreserveVideo(v)}
          />
        </div>
      )

    case 'acid_hex':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Cell Size"
            value={acid.hexParams.cellSize}
            min={8}
            max={48}
            step={2}
            onChange={(v) => acid.updateHexParams({ cellSize: v })}
            paramId="acid_hex.cellSize"
          />
          <SelectRow
            label="Fill Mode"
            value={acid.hexParams.fillMode}
            options={[
              { value: 'average', label: 'Average' },
              { value: 'center', label: 'Center' },
              { value: 'original', label: 'Original' },
            ]}
            onChange={(v) => acid.updateHexParams({ fillMode: v as 'average' | 'center' | 'original' })}
          />
          <ToggleRow
            label="Show Edges"
            value={acid.hexParams.showEdges}
            onChange={(v) => acid.updateHexParams({ showEdges: v })}
          />
          <SliderRow
            label="Rotation"
            value={acid.hexParams.rotation}
            min={0}
            max={60}
            step={5}
            onChange={(v) => acid.updateHexParams({ rotation: v })}
            format={(v) => `${v.toFixed(0)}°`}
            paramId="acid_hex.rotation"
          />
          <SectionLabel label="Global" />
          <ToggleRow
            label="Preserve Video"
            value={acid.preserveVideo}
            onChange={(v) => acid.setPreserveVideo(v)}
          />
        </div>
      )

    case 'acid_scan':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Speed"
            value={acid.scanParams.speed}
            min={1}
            max={10}
            step={0.5}
            onChange={(v) => acid.updateScanParams({ speed: v })}
            paramId="acid_scan.speed"
          />
          <SliderRow
            label="Width"
            value={acid.scanParams.width}
            min={5}
            max={100}
            step={5}
            onChange={(v) => acid.updateScanParams({ width: v })}
            paramId="acid_scan.width"
          />
          <SelectRow
            label="Direction"
            value={acid.scanParams.direction}
            options={[
              { value: 'horizontal', label: 'Horizontal' },
              { value: 'vertical', label: 'Vertical' },
              { value: 'radial', label: 'Radial' },
            ]}
            onChange={(v) => acid.updateScanParams({ direction: v as 'horizontal' | 'vertical' | 'radial' })}
          />
          <SliderRow
            label="Trail"
            value={acid.scanParams.trail * 100}
            min={0}
            max={100}
            step={10}
            onChange={(v) => acid.updateScanParams({ trail: v / 100 })}
            format={(v) => `${v.toFixed(0)}%`}
            paramId="acid_scan.trail"
          />
          <SectionLabel label="Global" />
          <ToggleRow
            label="Preserve Video"
            value={acid.preserveVideo}
            onChange={(v) => acid.setPreserveVideo(v)}
          />
        </div>
      )

    case 'acid_ripple':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Frequency"
            value={acid.rippleParams.frequency}
            min={1}
            max={20}
            step={1}
            onChange={(v) => acid.updateRippleParams({ frequency: v })}
            paramId="acid_ripple.frequency"
          />
          <SliderRow
            label="Amplitude"
            value={acid.rippleParams.amplitude}
            min={5}
            max={50}
            step={5}
            onChange={(v) => acid.updateRippleParams({ amplitude: v })}
            paramId="acid_ripple.amplitude"
          />
          <SliderRow
            label="Speed"
            value={acid.rippleParams.speed}
            min={1}
            max={10}
            step={0.5}
            onChange={(v) => acid.updateRippleParams({ speed: v })}
            paramId="acid_ripple.speed"
          />
          <SliderRow
            label="Decay"
            value={acid.rippleParams.decay * 100}
            min={10}
            max={100}
            step={10}
            onChange={(v) => acid.updateRippleParams({ decay: v / 100 })}
            format={(v) => `${v.toFixed(0)}%`}
            paramId="acid_ripple.decay"
          />
          <SectionLabel label="Global" />
          <ToggleRow
            label="Preserve Video"
            value={acid.preserveVideo}
            onChange={(v) => acid.setPreserveVideo(v)}
          />
        </div>
      )

    case 'strand_handprints':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Density"
            value={strand.handprintsParams.density}
            min={1}
            max={20}
            step={1}
            onChange={(v) => strand.updateHandprintsParams({ density: v })}
            paramId="strand_handprints.density"
          />
          <SliderRow
            label="Fade Speed"
            value={strand.handprintsParams.fadeSpeed}
            min={0.1}
            max={2}
            step={0.1}
            onChange={(v) => strand.updateHandprintsParams({ fadeSpeed: v })}
            paramId="strand_handprints.fadeSpeed"
          />
          <SliderRow
            label="Size"
            value={strand.handprintsParams.size}
            min={0.5}
            max={3}
            step={0.1}
            onChange={(v) => strand.updateHandprintsParams({ size: v })}
            paramId="strand_handprints.size"
          />
        </div>
      )

    case 'strand_tar':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Spread Speed"
            value={strand.tarSpreadParams.spreadSpeed}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => strand.updateTarSpreadParams({ spreadSpeed: v })}
            paramId="strand_tar.spreadSpeed"
          />
          <SliderRow
            label="Threshold"
            value={strand.tarSpreadParams.threshold}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => strand.updateTarSpreadParams({ threshold: v })}
            paramId="strand_tar.threshold"
          />
          <SliderRow
            label="Coverage"
            value={strand.tarSpreadParams.coverage}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => strand.updateTarSpreadParams({ coverage: v })}
            paramId="strand_tar.coverage"
          />
        </div>
      )

    case 'strand_timefall':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Intensity"
            value={strand.timefallParams.intensity}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => strand.updateTimefallParams({ intensity: v })}
            paramId="strand_timefall.intensity"
          />
          <SliderRow
            label="Streak Count"
            value={strand.timefallParams.streakCount}
            min={10}
            max={500}
            step={1}
            onChange={(v) => strand.updateTimefallParams({ streakCount: v })}
            paramId="strand_timefall.streakCount"
          />
          <SliderRow
            label="Age Amount"
            value={strand.timefallParams.ageAmount}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => strand.updateTimefallParams({ ageAmount: v })}
            paramId="strand_timefall.ageAmount"
          />
        </div>
      )

    case 'strand_voidout':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Speed"
            value={strand.voidOutParams.speed}
            min={0.1}
            max={2}
            step={0.1}
            onChange={(v) => strand.updateVoidOutParams({ speed: v })}
            paramId="strand_voidout.speed"
          />
          <SliderRow
            label="Distort Amount"
            value={strand.voidOutParams.distortAmount}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => strand.updateVoidOutParams({ distortAmount: v })}
            paramId="strand_voidout.distortAmount"
          />
          <SliderRow
            label="Ring Width"
            value={strand.voidOutParams.ringWidth}
            min={0.01}
            max={0.3}
            step={0.01}
            onChange={(v) => strand.updateVoidOutParams({ ringWidth: v })}
            paramId="strand_voidout.ringWidth"
          />
        </div>
      )

    case 'strand_web':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Threshold"
            value={strand.strandWebParams.threshold}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => strand.updateStrandWebParams({ threshold: v })}
            paramId="strand_web.threshold"
          />
          <SliderRow
            label="Max Connections"
            value={strand.strandWebParams.maxConnections}
            min={1}
            max={10}
            step={1}
            onChange={(v) => strand.updateStrandWebParams({ maxConnections: v })}
            paramId="strand_web.maxConnections"
          />
          <SliderRow
            label="Glow Intensity"
            value={strand.strandWebParams.glowIntensity}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => strand.updateStrandWebParams({ glowIntensity: v })}
            paramId="strand_web.glowIntensity"
          />
        </div>
      )

    case 'strand_bridge':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Grid Size"
            value={strand.bridgeLinkParams.gridSize}
            min={8}
            max={64}
            step={1}
            onChange={(v) => strand.updateBridgeLinkParams({ gridSize: v })}
            paramId="strand_bridge.gridSize"
          />
          <SliderRow
            label="Edge Sensitivity"
            value={strand.bridgeLinkParams.edgeSensitivity}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => strand.updateBridgeLinkParams({ edgeSensitivity: v })}
            paramId="strand_bridge.edgeSensitivity"
          />
          <SliderRow
            label="Opacity"
            value={strand.bridgeLinkParams.opacity}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => strand.updateBridgeLinkParams({ opacity: v })}
            paramId="strand_bridge.opacity"
          />
        </div>
      )

    case 'strand_path':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Particle Count"
            value={strand.chiralPathParams.particleCount}
            min={10}
            max={200}
            step={1}
            onChange={(v) => strand.updateChiralPathParams({ particleCount: v })}
            paramId="strand_path.particleCount"
          />
          <SliderRow
            label="Trail Length"
            value={strand.chiralPathParams.trailLength}
            min={5}
            max={50}
            step={1}
            onChange={(v) => strand.updateChiralPathParams({ trailLength: v })}
            paramId="strand_path.trailLength"
          />
          <SliderRow
            label="Flow Speed"
            value={strand.chiralPathParams.flowSpeed}
            min={0.1}
            max={3}
            step={0.1}
            onChange={(v) => strand.updateChiralPathParams({ flowSpeed: v })}
            paramId="strand_path.flowSpeed"
          />
        </div>
      )

    case 'strand_umbilical':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Tendril Count"
            value={strand.umbilicalParams.tendrilCount}
            min={2}
            max={12}
            step={1}
            onChange={(v) => strand.updateUmbilicalParams({ tendrilCount: v })}
            paramId="strand_umbilical.tendrilCount"
          />
          <SliderRow
            label="Reach Distance"
            value={strand.umbilicalParams.reachDistance}
            min={0.1}
            max={1}
            step={0.1}
            onChange={(v) => strand.updateUmbilicalParams({ reachDistance: v })}
            paramId="strand_umbilical.reachDistance"
          />
          <SliderRow
            label="Pulse Speed"
            value={strand.umbilicalParams.pulseSpeed}
            min={0.1}
            max={3}
            step={0.1}
            onChange={(v) => strand.updateUmbilicalParams({ pulseSpeed: v })}
            paramId="strand_umbilical.pulseSpeed"
          />
        </div>
      )

    case 'strand_odradek':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Sweep Speed"
            value={strand.odradekParams.sweepSpeed}
            min={0.1}
            max={3}
            step={0.1}
            onChange={(v) => strand.updateOdradekParams({ sweepSpeed: v })}
            paramId="strand_odradek.sweepSpeed"
          />
          <SliderRow
            label="Reveal Duration"
            value={strand.odradekParams.revealDuration}
            min={0.1}
            max={1}
            step={0.1}
            onChange={(v) => strand.updateOdradekParams({ revealDuration: v })}
            paramId="strand_odradek.revealDuration"
          />
          <SliderRow
            label="Ping Intensity"
            value={strand.odradekParams.pingIntensity}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => strand.updateOdradekParams({ pingIntensity: v })}
            paramId="strand_odradek.pingIntensity"
          />
        </div>
      )

    case 'strand_chiralium':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Threshold"
            value={strand.chiraliumParams.threshold}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => strand.updateChiraliumParams({ threshold: v })}
            paramId="strand_chiralium.threshold"
          />
          <SliderRow
            label="Density"
            value={strand.chiraliumParams.density}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => strand.updateChiraliumParams({ density: v })}
            paramId="strand_chiralium.density"
          />
          <SliderRow
            label="Shimmer"
            value={strand.chiraliumParams.shimmer}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => strand.updateChiraliumParams({ shimmer: v })}
            paramId="strand_chiralium.shimmer"
          />
        </div>
      )

    case 'strand_beach':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Grain Amount"
            value={strand.beachStaticParams.grainAmount}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => strand.updateBeachStaticParams({ grainAmount: v })}
            paramId="strand_beach.grainAmount"
          />
          <SliderRow
            label="Invert Probability"
            value={strand.beachStaticParams.invertProbability}
            min={0}
            max={0.5}
            step={0.01}
            onChange={(v) => strand.updateBeachStaticParams({ invertProbability: v })}
            paramId="strand_beach.invertProbability"
          />
          <SliderRow
            label="Flicker Speed"
            value={strand.beachStaticParams.flickerSpeed}
            min={0.1}
            max={3}
            step={0.1}
            onChange={(v) => strand.updateBeachStaticParams({ flickerSpeed: v })}
            paramId="strand_beach.flickerSpeed"
          />
        </div>
      )

    case 'strand_dooms':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Halo Size"
            value={strand.doomsParams.haloSize}
            min={0.1}
            max={1}
            step={0.1}
            onChange={(v) => strand.updateDoomsParams({ haloSize: v })}
            paramId="strand_dooms.haloSize"
          />
          <SliderRow
            label="Pulse Speed"
            value={strand.doomsParams.pulseSpeed}
            min={0.1}
            max={2}
            step={0.1}
            onChange={(v) => strand.updateDoomsParams({ pulseSpeed: v })}
            paramId="strand_dooms.pulseSpeed"
          />
          <SliderRow
            label="Sensitivity"
            value={strand.doomsParams.sensitivity}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => strand.updateDoomsParams({ sensitivity: v })}
            paramId="strand_dooms.sensitivity"
          />
        </div>
      )

    case 'strand_cloud':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Density"
            value={strand.chiralCloudParams.density}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => strand.updateChiralCloudParams({ density: v })}
            paramId="strand_cloud.density"
          />
          <SliderRow
            label="Responsiveness"
            value={strand.chiralCloudParams.responsiveness}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => strand.updateChiralCloudParams({ responsiveness: v })}
            paramId="strand_cloud.responsiveness"
          />
          <SliderRow
            label="Tint"
            value={strand.chiralCloudParams.tint}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => strand.updateChiralCloudParams({ tint: v })}
            paramId="strand_cloud.tint"
          />
        </div>
      )

    case 'strand_bbpod':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Vignette Size"
            value={strand.bbPodParams.vignetteSize}
            min={0.5}
            max={1}
            step={0.01}
            onChange={(v) => strand.updateBBPodParams({ vignetteSize: v })}
            paramId="strand_bbpod.vignetteSize"
          />
          <SliderRow
            label="Tint Strength"
            value={strand.bbPodParams.tintStrength}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => strand.updateBBPodParams({ tintStrength: v })}
            paramId="strand_bbpod.tintStrength"
          />
          <SliderRow
            label="Caustic Amount"
            value={strand.bbPodParams.causticAmount}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => strand.updateBBPodParams({ causticAmount: v })}
            paramId="strand_bbpod.causticAmount"
          />
        </div>
      )

    case 'strand_seam':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Rift Width"
            value={strand.seamParams.riftWidth}
            min={0.01}
            max={0.2}
            step={0.01}
            onChange={(v) => strand.updateSeamParams({ riftWidth: v })}
            paramId="strand_seam.riftWidth"
          />
          <SliderRow
            label="Parallax Amount"
            value={strand.seamParams.parallaxAmount}
            min={0}
            max={0.5}
            step={0.01}
            onChange={(v) => strand.updateSeamParams({ parallaxAmount: v })}
            paramId="strand_seam.parallaxAmount"
          />
          <SliderRow
            label="Edge Distort"
            value={strand.seamParams.edgeDistort}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => strand.updateSeamParams({ edgeDistort: v })}
            paramId="strand_seam.edgeDistort"
          />
        </div>
      )

    case 'strand_extinction':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Erosion Speed"
            value={strand.extinctionParams.erosionSpeed}
            min={0.1}
            max={1}
            step={0.1}
            onChange={(v) => strand.updateExtinctionParams({ erosionSpeed: v })}
            paramId="strand_extinction.erosionSpeed"
          />
          <SliderRow
            label="Decay Stages"
            value={strand.extinctionParams.decayStages}
            min={1}
            max={5}
            step={1}
            onChange={(v) => strand.updateExtinctionParams({ decayStages: v })}
            paramId="strand_extinction.decayStages"
          />
          <SliderRow
            label="Coverage"
            value={strand.extinctionParams.coverage}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => strand.updateExtinctionParams({ coverage: v })}
            paramId="strand_extinction.coverage"
          />
        </div>
      )

    // ═══════════════════════════════════════════════════════════════
    // MOTION EFFECTS
    // ═══════════════════════════════════════════════════════════════

    case 'motion_extract':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Threshold"
            value={motion.motionExtract.threshold}
            min={0}
            max={0.5}
            step={0.01}
            onChange={(v) => motion.updateMotionExtract({ threshold: v })}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            paramId="motion_extract.threshold"
          />
          <SliderRow
            label="Frame Count"
            value={motion.motionExtract.frameCount}
            min={2}
            max={8}
            step={1}
            onChange={(v) => motion.updateMotionExtract({ frameCount: v })}
            paramId="motion_extract.frameCount"
          />
          <SliderRow
            label="Amplify"
            value={motion.motionExtract.amplify}
            min={1}
            max={10}
            step={0.1}
            onChange={(v) => motion.updateMotionExtract({ amplify: v })}
            format={(v) => `${v.toFixed(1)}x`}
            paramId="motion_extract.amplify"
          />
          <ToggleRow
            label="Show Original"
            value={motion.motionExtract.showOriginal}
            onChange={(v) => motion.updateMotionExtract({ showOriginal: v })}
          />
          {motion.motionExtract.showOriginal && (
            <SliderRow
              label="Original Mix"
              value={motion.motionExtract.originalMix}
              min={0}
              max={1}
              step={0.01}
              onChange={(v) => motion.updateMotionExtract({ originalMix: v })}
              format={(v) => `${(v * 100).toFixed(0)}%`}
              paramId="motion_extract.originalMix"
            />
          )}
        </div>
      )

    case 'echo_trail':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Trail Count"
            value={motion.echoTrail.trailCount}
            min={2}
            max={16}
            step={1}
            onChange={(v) => motion.updateEchoTrail({ trailCount: v })}
            paramId="echo_trail.trailCount"
          />
          <SliderRow
            label="Decay"
            value={motion.echoTrail.decay}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => motion.updateEchoTrail({ decay: v })}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            paramId="echo_trail.decay"
          />
          <SliderRow
            label="Offset"
            value={motion.echoTrail.offset}
            min={0}
            max={0.1}
            step={0.001}
            onChange={(v) => motion.updateEchoTrail({ offset: v })}
            format={(v) => `${(v * 100).toFixed(1)}`}
            paramId="echo_trail.offset"
          />
          <ToggleRow
            label="Color Shift"
            value={motion.echoTrail.colorShift}
            onChange={(v) => motion.updateEchoTrail({ colorShift: v })}
          />
          {motion.echoTrail.colorShift && (
            <SliderRow
              label="Hue Amount"
              value={motion.echoTrail.hueAmount}
              min={0}
              max={60}
              step={1}
              onChange={(v) => motion.updateEchoTrail({ hueAmount: v })}
              format={(v) => `${v.toFixed(0)}°`}
              paramId="echo_trail.hueAmount"
            />
          )}
        </div>
      )

    case 'time_smear':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Accumulation"
            value={motion.timeSmear.accumulation}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => motion.updateTimeSmear({ accumulation: v })}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            paramId="time_smear.accumulation"
          />
          <SelectRow
            label="Direction"
            value={motion.timeSmear.direction}
            options={[
              { value: 'both', label: 'Both' },
              { value: 'forward', label: 'Forward' },
              { value: 'backward', label: 'Backward' },
            ]}
            onChange={(v) => motion.updateTimeSmear({ direction: v as 'both' | 'forward' | 'backward' })}
          />
          <ToggleRow
            label="Motion Only"
            value={motion.timeSmear.motionOnly}
            onChange={(v) => motion.updateTimeSmear({ motionOnly: v })}
          />
          {motion.timeSmear.motionOnly && (
            <SliderRow
              label="Motion Threshold"
              value={motion.timeSmear.threshold}
              min={0}
              max={0.5}
              step={0.01}
              onChange={(v) => motion.updateTimeSmear({ threshold: v })}
              format={(v) => `${(v * 100).toFixed(0)}%`}
              paramId="time_smear.threshold"
            />
          )}
        </div>
      )

    case 'freeze_mask':
      return (
        <div className="space-y-1">
          <SliderRow
            label="Freeze Threshold"
            value={motion.freezeMask.freezeThreshold}
            min={0}
            max={0.2}
            step={0.001}
            onChange={(v) => motion.updateFreezeMask({ freezeThreshold: v })}
            format={(v) => `${(v * 100).toFixed(1)}%`}
            paramId="freeze_mask.freezeThreshold"
          />
          <SliderRow
            label="Update Speed"
            value={motion.freezeMask.updateSpeed}
            min={0}
            max={0.1}
            step={0.001}
            onChange={(v) => motion.updateFreezeMask({ updateSpeed: v })}
            format={(v) => `${(v * 100).toFixed(1)}%`}
            paramId="freeze_mask.updateSpeed"
          />
          <ToggleRow
            label="Show Freeze"
            value={motion.freezeMask.showFreeze}
            onChange={(v) => motion.updateFreezeMask({ showFreeze: v })}
          />
          <ToggleRow
            label="Invert Mask"
            value={motion.freezeMask.invertMask}
            onChange={(v) => motion.updateFreezeMask({ invertMask: v })}
          />
        </div>
      )

    default:
      return (
        <div className="text-[14px] text-gray-400 py-4 text-center">
          No parameters available
        </div>
      )
  }
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div
      className="text-[13px] font-semibold uppercase tracking-wide pt-3 pb-1 border-t mt-2 first:mt-0 first:border-0 first:pt-0"
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
