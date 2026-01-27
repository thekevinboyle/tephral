import { useState, useEffect } from 'react'
import { useUIStore } from '../../stores/uiStore'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { useAsciiRenderStore } from '../../stores/asciiRenderStore'
import { useStippleStore } from '../../stores/stippleStore'
import { useLandmarksStore } from '../../stores/landmarksStore'
import { useBlobDetectStore } from '../../stores/blobDetectStore'
import { EFFECTS } from '../../config/effects'
import { SliderRow, ToggleRow, SelectRow, ColorRow } from './controls'

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
  const effect = EFFECTS.find((e) => e.id === effectId)

  if (!effectId || !effect) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 border-l border-gray-200">
        <span className="text-[11px] text-gray-400">Select an effect</span>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 border-l border-gray-200">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-white">
        <div
          className="w-2 h-2 rounded-full"
          style={{
            backgroundColor: effect.color,
            boxShadow: `0 0 6px ${effect.color}`,
          }}
        />
        <span className="text-[11px] font-semibold text-gray-700 uppercase tracking-wide">
          {effect.label}
        </span>
      </div>

      {/* Parameters - scrollable */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <EffectParameters effectId={effectId} />
      </div>
    </div>
  )
}

function EffectParameters({ effectId }: { effectId: string }) {
  const glitch = useGlitchEngineStore()
  const ascii = useAsciiRenderStore()
  const stipple = useStippleStore()
  const landmarks = useLandmarksStore()
  const blobDetect = useBlobDetectStore()

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

    case 'blob_detect':
      return (
        <div className="space-y-1">
          {/* Presets */}
          <div className="flex gap-1 mb-2">
            {(['technical', 'neon', 'organic'] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => blobDetect.applyPreset(preset)}
                className="flex-1 px-2 py-1.5 text-[10px] bg-gray-100 hover:bg-gray-200 rounded capitalize"
              >
                {preset}
              </button>
            ))}
          </div>

          <SectionLabel label="Detection" />
          <SelectRow
            label="Mode"
            value={blobDetect.params.mode}
            options={[
              { value: 'brightness', label: 'Bright' },
              { value: 'motion', label: 'Motion' },
              { value: 'color', label: 'Color' },
            ]}
            onChange={(v) => blobDetect.setMode(v as 'brightness' | 'motion' | 'color')}
          />
          {blobDetect.params.mode === 'brightness' && (
            <>
              <SliderRow
                label="Threshold"
                value={blobDetect.params.threshold}
                min={0}
                max={1}
                step={0.01}
                onChange={(v) => blobDetect.updateParams({ threshold: v })}
                format={(v) => `${(v * 100).toFixed(0)}%`}
                paramId="blob_detect.threshold"
              />
              <ToggleRow
                label="Invert"
                value={blobDetect.params.invert}
                onChange={(v) => blobDetect.updateParams({ invert: v })}
              />
            </>
          )}
          {blobDetect.params.mode === 'motion' && (
            <>
              <SliderRow
                label="Sensitivity"
                value={blobDetect.params.sensitivity}
                min={0}
                max={1}
                step={0.01}
                onChange={(v) => blobDetect.updateParams({ sensitivity: v })}
                format={(v) => `${(v * 100).toFixed(0)}%`}
                paramId="blob_detect.sensitivity"
              />
              <SliderRow
                label="Decay"
                value={blobDetect.params.decayRate}
                min={0}
                max={1}
                step={0.01}
                onChange={(v) => blobDetect.updateParams({ decayRate: v })}
                paramId="blob_detect.decayRate"
              />
            </>
          )}
          {blobDetect.params.mode === 'color' && (
            <>
              <SliderRow
                label="Target Hue"
                value={blobDetect.params.targetHue}
                min={0}
                max={360}
                step={1}
                onChange={(v) => blobDetect.updateParams({ targetHue: v })}
                format={(v) => `${v.toFixed(0)}°`}
                paramId="blob_detect.targetHue"
              />
              <SliderRow
                label="Hue Range"
                value={blobDetect.params.hueRange}
                min={0}
                max={180}
                step={1}
                onChange={(v) => blobDetect.updateParams({ hueRange: v })}
                format={(v) => `±${v.toFixed(0)}°`}
                paramId="blob_detect.hueRange"
              />
              <SliderRow
                label="Min Saturation"
                value={blobDetect.params.saturationMin}
                min={0}
                max={1}
                step={0.01}
                onChange={(v) => blobDetect.updateParams({ saturationMin: v })}
                format={(v) => `${(v * 100).toFixed(0)}%`}
                paramId="blob_detect.saturationMin"
              />
            </>
          )}
          <SliderRow
            label="Min Size"
            value={blobDetect.params.minSize}
            min={0.001}
            max={0.2}
            step={0.001}
            onChange={(v) => blobDetect.updateParams({ minSize: v })}
            format={(v) => `${(v * 100).toFixed(1)}%`}
            paramId="blob_detect.minSize"
          />
          <SliderRow
            label="Max Size"
            value={blobDetect.params.maxSize}
            min={0.1}
            max={1}
            step={0.01}
            onChange={(v) => blobDetect.updateParams({ maxSize: v })}
            format={(v) => `${(v * 100).toFixed(0)}%`}
            paramId="blob_detect.maxSize"
          />
          <SliderRow
            label="Max Blobs"
            value={blobDetect.params.maxBlobs}
            min={1}
            max={50}
            step={1}
            onChange={(v) => blobDetect.updateParams({ maxBlobs: v })}
            format={(v) => v.toFixed(0)}
            paramId="blob_detect.maxBlobs"
          />
          <SliderRow
            label="Blur"
            value={blobDetect.params.blurAmount}
            min={0}
            max={20}
            step={1}
            onChange={(v) => blobDetect.updateParams({ blurAmount: v })}
            format={(v) => `${v.toFixed(0)}px`}
            paramId="blob_detect.blurAmount"
          />

          <SectionLabel label="Blob Style" />
          <SelectRow
            label="Shape"
            value={blobDetect.params.blobStyle}
            options={[
              { value: 'circle', label: 'Circle' },
              { value: 'box', label: 'Box' },
              { value: 'none', label: 'None' },
            ]}
            onChange={(v) => blobDetect.updateParams({ blobStyle: v as 'circle' | 'box' | 'none' })}
          />
          {blobDetect.params.blobStyle !== 'none' && (
            <>
              <ToggleRow
                label="Fill"
                value={blobDetect.params.blobFill}
                onChange={(v) => blobDetect.updateParams({ blobFill: v })}
              />
              <ColorRow
                label="Color"
                value={blobDetect.params.blobColor}
                onChange={(v) => blobDetect.updateParams({ blobColor: v })}
              />
              <SliderRow
                label="Opacity"
                value={blobDetect.params.blobOpacity}
                min={0}
                max={1}
                step={0.05}
                onChange={(v) => blobDetect.updateParams({ blobOpacity: v })}
                format={(v) => `${(v * 100).toFixed(0)}%`}
                paramId="blob_detect.blobOpacity"
              />
              {!blobDetect.params.blobFill && (
                <SliderRow
                  label="Line Width"
                  value={blobDetect.params.blobLineWidth}
                  min={1}
                  max={6}
                  step={0.5}
                  onChange={(v) => blobDetect.updateParams({ blobLineWidth: v })}
                  format={(v) => `${v.toFixed(1)}px`}
                  paramId="blob_detect.blobLineWidth"
                />
              )}
            </>
          )}

          <SectionLabel label="Glow" />
          <ToggleRow
            label="Enable Glow"
            value={blobDetect.params.glowEnabled}
            onChange={(v) => blobDetect.updateParams({ glowEnabled: v })}
          />
          {blobDetect.params.glowEnabled && (
            <>
              <SliderRow
                label="Intensity"
                value={blobDetect.params.glowIntensity}
                min={0}
                max={1}
                step={0.05}
                onChange={(v) => blobDetect.updateParams({ glowIntensity: v })}
                format={(v) => `${(v * 100).toFixed(0)}%`}
                paramId="blob_detect.glowIntensity"
              />
              <ColorRow
                label="Glow Color"
                value={blobDetect.params.glowColor}
                onChange={(v) => blobDetect.updateParams({ glowColor: v })}
              />
            </>
          )}

          <SectionLabel label="Trails" />
          <ToggleRow
            label="Enable Trails"
            value={blobDetect.params.trailEnabled}
            onChange={(v) => blobDetect.updateParams({ trailEnabled: v })}
          />
          {blobDetect.params.trailEnabled && (
            <>
              <SelectRow
                label="Mode"
                value={blobDetect.params.trailMode}
                options={[
                  { value: 'fade', label: 'Fade' },
                  { value: 'fixed', label: 'Fixed' },
                  { value: 'persistent', label: 'Persist' },
                ]}
                onChange={(v) => blobDetect.updateParams({ trailMode: v as 'fade' | 'fixed' | 'persistent' })}
              />
              {blobDetect.params.trailMode === 'fade' && (
                <SliderRow
                  label="Fade Time"
                  value={blobDetect.params.fadeTime}
                  min={0.5}
                  max={10}
                  step={0.5}
                  onChange={(v) => blobDetect.updateParams({ fadeTime: v })}
                  format={(v) => `${v.toFixed(1)}s`}
                  paramId="blob_detect.fadeTime"
                />
              )}
              {blobDetect.params.trailMode === 'fixed' && (
                <SliderRow
                  label="Length"
                  value={blobDetect.params.trailLength}
                  min={10}
                  max={500}
                  step={10}
                  onChange={(v) => blobDetect.updateParams({ trailLength: v })}
                  format={(v) => v.toFixed(0)}
                  paramId="blob_detect.trailLength"
                />
              )}
              <SliderRow
                label="Line Width"
                value={blobDetect.params.lineWidth}
                min={1}
                max={10}
                step={0.5}
                onChange={(v) => blobDetect.updateParams({ lineWidth: v })}
                format={(v) => `${v.toFixed(1)}px`}
                paramId="blob_detect.lineWidth"
              />
              <ColorRow
                label="Line Color"
                value={blobDetect.params.lineColor}
                onChange={(v) => blobDetect.updateParams({ lineColor: v })}
              />
              <SliderRow
                label="Smoothness"
                value={blobDetect.params.lineSmoothness}
                min={0}
                max={1}
                step={0.1}
                onChange={(v) => blobDetect.updateParams({ lineSmoothness: v })}
                format={(v) => `${(v * 100).toFixed(0)}%`}
                paramId="blob_detect.lineSmoothness"
              />
              <SliderRow
                label="Opacity"
                value={blobDetect.params.lineOpacity}
                min={0}
                max={1}
                step={0.05}
                onChange={(v) => blobDetect.updateParams({ lineOpacity: v })}
                format={(v) => `${(v * 100).toFixed(0)}%`}
                paramId="blob_detect.lineOpacity"
              />
              <button
                onClick={() => blobDetect.clearTrails()}
                className="w-full mt-2 py-1.5 text-[10px] bg-red-50 text-red-600 hover:bg-red-100 rounded"
              >
                Clear Trails
              </button>
            </>
          )}

          <SectionLabel label="Connections" />
          <ToggleRow
            label="Connect Blobs"
            value={blobDetect.params.connectEnabled}
            onChange={(v) => blobDetect.updateParams({ connectEnabled: v })}
          />
          {blobDetect.params.connectEnabled && (
            <>
              <SliderRow
                label="Max Distance"
                value={blobDetect.params.connectMaxDistance}
                min={0.05}
                max={0.5}
                step={0.01}
                onChange={(v) => blobDetect.updateParams({ connectMaxDistance: v })}
                format={(v) => `${(v * 100).toFixed(0)}%`}
                paramId="blob_detect.connectMaxDistance"
              />
              <ColorRow
                label="Line Color"
                value={blobDetect.params.connectColor}
                onChange={(v) => blobDetect.updateParams({ connectColor: v })}
              />
              <SliderRow
                label="Line Width"
                value={blobDetect.params.connectWidth}
                min={1}
                max={4}
                step={0.5}
                onChange={(v) => blobDetect.updateParams({ connectWidth: v })}
                format={(v) => `${v.toFixed(1)}px`}
                paramId="blob_detect.connectWidth"
              />
              <SelectRow
                label="Style"
                value={blobDetect.params.connectStyle}
                options={[
                  { value: 'solid', label: 'Solid' },
                  { value: 'dashed', label: 'Dashed' },
                  { value: 'curved', label: 'Curved' },
                ]}
                onChange={(v) => blobDetect.updateParams({ connectStyle: v as 'solid' | 'dashed' | 'curved' })}
              />
            </>
          )}
        </div>
      )

    case 'face_mesh':
    case 'hands':
    case 'pose':
    case 'holistic':
      return (
        <div className="space-y-1">
          <SelectRow
            label="Mode"
            value={landmarks.currentMode}
            options={[
              { value: 'face', label: 'Face' },
              { value: 'hands', label: 'Hands' },
              { value: 'pose', label: 'Pose' },
              { value: 'holistic', label: 'All' },
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
              format={(v) => v.toFixed(0)}
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
              format={(v) => v.toFixed(0)}
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

    default:
      return (
        <div className="text-[11px] text-gray-400 py-4 text-center">
          No parameters available
        </div>
      )
  }
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide pt-3 pb-1 border-t border-gray-200 mt-2 first:mt-0 first:border-0 first:pt-0">
      {label}
    </div>
  )
}
