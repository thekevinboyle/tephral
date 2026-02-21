import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { useAsciiRenderStore } from '../../stores/asciiRenderStore'
import { useStippleStore } from '../../stores/stippleStore'
import { useContourStore } from '../../stores/contourStore'
import { useLandmarksStore } from '../../stores/landmarksStore'
import { useVisionTrackingStore } from '../../stores/visionTrackingStore'
import { useAcidStore } from '../../stores/acidStore'
import { useTextureOverlayStore } from '../../stores/textureOverlayStore'
import { useDataOverlayStore } from '../../stores/dataOverlayStore'
import { useStrandStore } from '../../stores/strandStore'
import { useMotionStore } from '../../stores/motionStore'
import { useDestructionStore } from '../../stores/destructionStore'
import { Knob } from './Knob'

interface CompactEffectParamsProps {
  effectId: string
  color: string
}

export function CompactEffectParams({ effectId, color }: CompactEffectParamsProps) {
  const glitch = useGlitchEngineStore()
  const ascii = useAsciiRenderStore()
  const stipple = useStippleStore()
  const contour = useContourStore()
  const landmarks = useLandmarksStore()
  const vision = useVisionTrackingStore()
  const acid = useAcidStore()
  const textureOverlay = useTextureOverlayStore()
  const dataOverlay = useDataOverlayStore()
  const strand = useStrandStore()
  const motion = useMotionStore()
  const destruction = useDestructionStore()

  const knobProps = { size: 'xs' as const, showArc: true, showValue: true, color }

  switch (effectId) {
    // ═══════════════════════════════════════════════════════════════
    // GLITCH EFFECTS
    // ═══════════════════════════════════════════════════════════════
    case 'rgb_split':
      return (
        <div className="flex gap-4">
          <Knob label="AMT" value={glitch.rgbSplit.amount} min={0} max={5} step={0.01}
            onChange={v => glitch.updateRGBSplit({ amount: v })} paramId="rgb_split.amount" {...knobProps} />
          <Knob label="MIX" value={glitch.rgbSplit.mix} min={0} max={1} step={0.01}
            onChange={v => glitch.updateRGBSplit({ mix: v })} paramId="rgb_split.mix" {...knobProps} />
        </div>
      )
    case 'block_displace':
      return (
        <div className="flex gap-4">
          <Knob label="SIZE" value={glitch.blockDisplace.blockSize} min={0.005} max={0.5} step={0.005}
            onChange={v => glitch.updateBlockDisplace({ blockSize: v })} paramId="block_displace.blockSize" {...knobProps} />
          <Knob label="DIST" value={glitch.blockDisplace.displaceDistance} min={0} max={0.5} step={0.001}
            onChange={v => glitch.updateBlockDisplace({ displaceDistance: v })} paramId="block_displace.displaceDistance" {...knobProps} />
          <Knob label="CHNC" value={glitch.blockDisplace.displaceChance} min={0} max={1} step={0.01}
            onChange={v => glitch.updateBlockDisplace({ displaceChance: v })} paramId="block_displace.displaceChance" {...knobProps} />
        </div>
      )
    case 'scan_lines':
      return (
        <div className="flex gap-4">
          <Knob label="CNT" value={glitch.scanLines.lineCount} min={50} max={500} step={10}
            onChange={v => glitch.updateScanLines({ lineCount: v })} paramId="scan_lines.lineCount" {...knobProps} />
          <Knob label="OPAC" value={glitch.scanLines.lineOpacity} min={0} max={1} step={0.01}
            onChange={v => glitch.updateScanLines({ lineOpacity: v })} paramId="scan_lines.lineOpacity" {...knobProps} />
        </div>
      )
    case 'noise':
      return (
        <div className="flex gap-4">
          <Knob label="AMT" value={glitch.noise.amount} min={0} max={3} step={0.01}
            onChange={v => glitch.updateNoise({ amount: v })} paramId="noise.amount" {...knobProps} />
          <Knob label="SPD" value={glitch.noise.speed} min={1} max={200} step={1}
            onChange={v => glitch.updateNoise({ speed: v })} paramId="noise.speed" {...knobProps} />
        </div>
      )
    case 'pixelate':
      return (
        <div className="flex gap-4">
          <Knob label="SIZE" value={glitch.pixelate.pixelSize} min={2} max={32} step={1}
            onChange={v => glitch.updatePixelate({ pixelSize: v })} paramId="pixelate.pixelSize" {...knobProps} />
        </div>
      )
    case 'edges':
      return (
        <div className="flex gap-4">
          <Knob label="THRSH" value={glitch.edgeDetection.threshold} min={0} max={1} step={0.01}
            onChange={v => glitch.updateEdgeDetection({ threshold: v })} paramId="edges.threshold" {...knobProps} />
          <Knob label="MIX" value={glitch.edgeDetection.mixAmount} min={0} max={1} step={0.01}
            onChange={v => glitch.updateEdgeDetection({ mixAmount: v })} paramId="edges.mixAmount" {...knobProps} />
        </div>
      )
    case 'chromatic':
      return (
        <div className="flex gap-4">
          <Knob label="INT" value={glitch.chromaticAberration.intensity} min={0} max={1} step={0.01}
            onChange={v => glitch.updateChromaticAberration({ intensity: v })} paramId="chromatic.intensity" {...knobProps} />
          <Knob label="RAD" value={glitch.chromaticAberration.radialAmount} min={0} max={1} step={0.01}
            onChange={v => glitch.updateChromaticAberration({ radialAmount: v })} paramId="chromatic.radialAmount" {...knobProps} />
          <Knob label="DIR" value={glitch.chromaticAberration.direction} min={0} max={360} step={1}
            onChange={v => glitch.updateChromaticAberration({ direction: v })} paramId="chromatic.direction" {...knobProps} />
        </div>
      )
    case 'vhs':
      return (
        <div className="flex gap-4">
          <Knob label="TEAR" value={glitch.vhsTracking.tearIntensity} min={0} max={1} step={0.01}
            onChange={v => glitch.updateVHSTracking({ tearIntensity: v })} paramId="vhs.tearIntensity" {...knobProps} />
          <Knob label="BLEED" value={glitch.vhsTracking.colorBleed} min={0} max={1} step={0.01}
            onChange={v => glitch.updateVHSTracking({ colorBleed: v })} paramId="vhs.colorBleed" {...knobProps} />
          <Knob label="JITTER" value={glitch.vhsTracking.jitter} min={0} max={1} step={0.01}
            onChange={v => glitch.updateVHSTracking({ jitter: v })} paramId="vhs.jitter" {...knobProps} />
        </div>
      )
    case 'lens':
      return (
        <div className="flex gap-4">
          <Knob label="CURVE" value={glitch.lensDistortion.curvature} min={-1} max={1} step={0.01}
            onChange={v => glitch.updateLensDistortion({ curvature: v })} paramId="lens.curvature" {...knobProps} />
          <Knob label="VIG" value={glitch.lensDistortion.vignette} min={0} max={1} step={0.01}
            onChange={v => glitch.updateLensDistortion({ vignette: v })} paramId="lens.vignette" {...knobProps} />
        </div>
      )
    case 'dither':
      return (
        <div className="flex gap-4">
          <Knob label="INT" value={glitch.dither.intensity} min={0} max={1} step={0.01}
            onChange={v => glitch.updateDither({ intensity: v })} paramId="dither.intensity" {...knobProps} />
          <Knob label="SCALE" value={glitch.dither.scale} min={1} max={8} step={1}
            onChange={v => glitch.updateDither({ scale: v })} paramId="dither.scale" {...knobProps} />
          <Knob label="DEPTH" value={glitch.dither.colorDepth} min={2} max={16} step={1}
            onChange={v => glitch.updateDither({ colorDepth: v })} paramId="dither.colorDepth" {...knobProps} />
        </div>
      )
    case 'posterize':
      return (
        <div className="flex gap-4">
          <Knob label="LVL" value={glitch.posterize.levels} min={2} max={16} step={1}
            onChange={v => glitch.updatePosterize({ levels: v })} paramId="posterize.levels" {...knobProps} />
          <Knob label="SAT" value={glitch.posterize.saturationBoost} min={0} max={2} step={0.01}
            onChange={v => glitch.updatePosterize({ saturationBoost: v })} paramId="posterize.saturationBoost" {...knobProps} />
        </div>
      )
    case 'static_displace':
      return (
        <div className="flex gap-4">
          <Knob label="INT" value={glitch.staticDisplacement.intensity} min={0} max={1} step={0.01}
            onChange={v => glitch.updateStaticDisplacement({ intensity: v })} paramId="static_displace.intensity" {...knobProps} />
          <Knob label="SCALE" value={glitch.staticDisplacement.scale} min={1} max={100} step={1}
            onChange={v => glitch.updateStaticDisplacement({ scale: v })} paramId="static_displace.scale" {...knobProps} />
          <Knob label="SPD" value={glitch.staticDisplacement.speed} min={0} max={10} step={0.1}
            onChange={v => glitch.updateStaticDisplacement({ speed: v })} paramId="static_displace.speed" {...knobProps} />
        </div>
      )
    case 'color_grade':
      return (
        <div className="flex gap-4">
          <Knob label="SAT" value={glitch.colorGrade.saturation} min={0} max={2} step={0.01}
            onChange={v => glitch.updateColorGrade({ saturation: v })} paramId="color_grade.saturation" {...knobProps} />
          <Knob label="CONT" value={glitch.colorGrade.contrast} min={0} max={2} step={0.01}
            onChange={v => glitch.updateColorGrade({ contrast: v })} paramId="color_grade.contrast" {...knobProps} />
          <Knob label="BRT" value={glitch.colorGrade.brightness} min={-1} max={1} step={0.01}
            onChange={v => glitch.updateColorGrade({ brightness: v })} paramId="color_grade.brightness" {...knobProps} />
        </div>
      )
    case 'feedback':
      return (
        <div className="flex gap-4">
          <Knob label="DECAY" value={glitch.feedbackLoop.decay} min={0} max={1} step={0.01}
            onChange={v => glitch.updateFeedbackLoop({ decay: v })} paramId="feedback.decay" {...knobProps} />
          <Knob label="ZOOM" value={glitch.feedbackLoop.zoom} min={0.95} max={1.05} step={0.001}
            onChange={v => glitch.updateFeedbackLoop({ zoom: v })} paramId="feedback.zoom" {...knobProps} />
          <Knob label="HUE" value={glitch.feedbackLoop.hueShift} min={0} max={30} step={0.5}
            onChange={v => glitch.updateFeedbackLoop({ hueShift: v })} paramId="feedback.hueShift" {...knobProps} />
        </div>
      )

    // ═══════════════════════════════════════════════════════════════
    // RENDER MODES
    // ═══════════════════════════════════════════════════════════════
    case 'ascii':
      return (
        <div className="flex gap-4">
          <Knob label="SIZE" value={ascii.params.fontSize} min={6} max={20} step={1}
            onChange={v => ascii.updateParams({ fontSize: v })} paramId="ascii.fontSize" {...knobProps} />
          <Knob label="CONT" value={ascii.params.contrast} min={0.5} max={2} step={0.01}
            onChange={v => ascii.updateParams({ contrast: v })} paramId="ascii.contrast" {...knobProps} />
        </div>
      )
    case 'stipple':
      return (
        <div className="flex gap-4">
          <Knob label="SIZE" value={stipple.params.particleSize} min={1} max={6} step={0.1}
            onChange={v => stipple.updateParams({ particleSize: v })} paramId="stipple.particleSize" {...knobProps} />
          <Knob label="DEN" value={stipple.params.density} min={0.5} max={2} step={0.01}
            onChange={v => stipple.updateParams({ density: v })} paramId="stipple.density" {...knobProps} />
        </div>
      )
    case 'contour':
      return (
        <div className="flex gap-4">
          <Knob label="THRSH" value={contour.params.threshold} min={0} max={1} step={0.01}
            onChange={v => contour.updateParams({ threshold: v })} paramId="contour.threshold" {...knobProps} />
          <Knob label="WIDTH" value={contour.params.baseWidth} min={1} max={6} step={0.1}
            onChange={v => contour.updateParams({ baseWidth: v })} paramId="contour.baseWidth" {...knobProps} />
          <Knob label="GLOW" value={contour.params.glowIntensity} min={0} max={1} step={0.01}
            onChange={v => contour.updateParams({ glowIntensity: v })} paramId="contour.glowIntensity" {...knobProps} />
        </div>
      )
    case 'landmarks':
      return (
        <div className="flex gap-4">
          <Knob label="CONF" value={landmarks.minDetectionConfidence} min={0.1} max={0.9} step={0.01}
            onChange={v => landmarks.setMinDetectionConfidence(v)} paramId="landmarks.minDetectionConfidence" {...knobProps} />
        </div>
      )

    // ═══════════════════════════════════════════════════════════════
    // VISION TRACKING
    // ═══════════════════════════════════════════════════════════════
    case 'track_bright':
      return (
        <div className="flex gap-4">
          <Knob label="THRSH" value={vision.brightParams.threshold} min={0} max={255} step={1}
            onChange={v => vision.updateBrightParams({ threshold: v })} paramId="track_bright.threshold" {...knobProps} />
          <Knob label="SIZE" value={vision.brightParams.minSize} min={0} max={500} step={10}
            onChange={v => vision.updateBrightParams({ minSize: v })} paramId="track_bright.minSize" {...knobProps} />
        </div>
      )
    case 'track_edge':
      return (
        <div className="flex gap-4">
          <Knob label="THRSH" value={vision.edgeParams.threshold} min={0} max={255} step={1}
            onChange={v => vision.updateEdgeParams({ threshold: v })} paramId="track_edge.threshold" {...knobProps} />
          <Knob label="SIZE" value={vision.edgeParams.minSize} min={0} max={500} step={10}
            onChange={v => vision.updateEdgeParams({ minSize: v })} paramId="track_edge.minSize" {...knobProps} />
        </div>
      )
    case 'track_color':
      return (
        <div className="flex gap-4">
          <Knob label="RANGE" value={vision.colorParams.colorRange} min={0} max={1} step={0.01}
            onChange={v => vision.updateColorParams({ colorRange: v })} paramId="track_color.colorRange" {...knobProps} />
        </div>
      )
    case 'track_motion':
      return (
        <div className="flex gap-4">
          <Knob label="SENS" value={vision.motionParams.sensitivity} min={1} max={100} step={1}
            onChange={v => vision.updateMotionParams({ sensitivity: v })} paramId="track_motion.sensitivity" {...knobProps} />
          <Knob label="THRSH" value={vision.motionParams.threshold} min={1} max={100} step={1}
            onChange={v => vision.updateMotionParams({ threshold: v })} paramId="track_motion.threshold" {...knobProps} />
        </div>
      )
    case 'track_face':
      return (
        <div className="flex gap-4">
          <Knob label="THRSH" value={vision.faceParams.threshold} min={0} max={255} step={1}
            onChange={v => vision.updateFaceParams({ threshold: v })} paramId="track_face.threshold" {...knobProps} />
        </div>
      )
    case 'track_hands':
      return (
        <div className="flex gap-4">
          <Knob label="THRSH" value={vision.handsParams.threshold} min={0} max={255} step={1}
            onChange={v => vision.updateHandsParams({ threshold: v })} paramId="track_hands.threshold" {...knobProps} />
        </div>
      )

    // ═══════════════════════════════════════════════════════════════
    // ACID EFFECTS
    // ═══════════════════════════════════════════════════════════════
    case 'acid_dots':
      return (
        <div className="flex gap-4">
          <Knob label="GRID" value={acid.dotsParams.gridSize} min={4} max={32} step={1}
            onChange={v => acid.updateDotsParams({ gridSize: v })} paramId="acid_dots.gridSize" {...knobProps} />
          <Knob label="SIZE" value={acid.dotsParams.dotScale} min={0.1} max={2} step={0.01}
            onChange={v => acid.updateDotsParams({ dotScale: v })} paramId="acid_dots.dotScale" {...knobProps} />
        </div>
      )
    case 'acid_glyph':
      return (
        <div className="flex gap-4">
          <Knob label="GRID" value={acid.glyphParams.gridSize} min={8} max={24} step={1}
            onChange={v => acid.updateGlyphParams({ gridSize: v })} paramId="acid_glyph.gridSize" {...knobProps} />
          <Knob label="DEN" value={acid.glyphParams.density} min={0} max={1} step={0.01}
            onChange={v => acid.updateGlyphParams({ density: v })} paramId="acid_glyph.density" {...knobProps} />
        </div>
      )
    case 'acid_icons':
      return (
        <div className="flex gap-4">
          <Knob label="GRID" value={acid.iconsParams.gridSize} min={16} max={48} step={1}
            onChange={v => acid.updateIconsParams({ gridSize: v })} paramId="acid_icons.gridSize" {...knobProps} />
          <Knob label="ROT" value={acid.iconsParams.rotation} min={0} max={360} step={1}
            onChange={v => acid.updateIconsParams({ rotation: v })} paramId="acid_icons.rotation" {...knobProps} />
        </div>
      )
    case 'acid_contour':
      return (
        <div className="flex gap-4">
          <Knob label="LVL" value={acid.contourParams.levels} min={4} max={20} step={1}
            onChange={v => acid.updateContourParams({ levels: v })} paramId="acid_contour.levels" {...knobProps} />
          <Knob label="WIDTH" value={acid.contourParams.lineWidth} min={1} max={5} step={0.5}
            onChange={v => acid.updateContourParams({ lineWidth: v })} paramId="acid_contour.lineWidth" {...knobProps} />
        </div>
      )
    case 'acid_decomp':
      return (
        <div className="flex gap-4">
          <Knob label="MIN" value={acid.decompParams.minBlock} min={8} max={64} step={1}
            onChange={v => acid.updateDecompParams({ minBlock: v })} paramId="acid_decomp.minBlock" {...knobProps} />
          <Knob label="MAX" value={acid.decompParams.maxBlock} min={16} max={128} step={1}
            onChange={v => acid.updateDecompParams({ maxBlock: v })} paramId="acid_decomp.maxBlock" {...knobProps} />
          <Knob label="THRSH" value={acid.decompParams.threshold} min={0} max={1} step={0.01}
            onChange={v => acid.updateDecompParams({ threshold: v })} paramId="acid_decomp.threshold" {...knobProps} />
        </div>
      )
    case 'acid_mirror':
      return (
        <div className="flex gap-4">
          <Knob label="SEG" value={acid.mirrorParams.segments} min={2} max={8} step={1}
            onChange={v => acid.updateMirrorParams({ segments: v })} paramId="acid_mirror.segments" {...knobProps} />
          <Knob label="ROT" value={acid.mirrorParams.rotation} min={0} max={360} step={1}
            onChange={v => acid.updateMirrorParams({ rotation: v })} paramId="acid_mirror.rotation" {...knobProps} />
        </div>
      )
    case 'acid_slice':
      return (
        <div className="flex gap-4">
          <Knob label="CNT" value={acid.sliceParams.sliceCount} min={4} max={64} step={1}
            onChange={v => acid.updateSliceParams({ sliceCount: v })} paramId="acid_slice.sliceCount" {...knobProps} />
          <Knob label="OFF" value={acid.sliceParams.offset} min={0} max={1} step={0.01}
            onChange={v => acid.updateSliceParams({ offset: v })} paramId="acid_slice.offset" {...knobProps} />
        </div>
      )
    case 'acid_thgrid':
      return (
        <div className="flex gap-4">
          <Knob label="THRSH" value={acid.thGridParams.threshold} min={0} max={255} step={1}
            onChange={v => acid.updateThGridParams({ threshold: v })} paramId="acid_thgrid.threshold" {...knobProps} />
          <Knob label="GRID" value={acid.thGridParams.gridSize} min={4} max={32} step={1}
            onChange={v => acid.updateThGridParams({ gridSize: v })} paramId="acid_thgrid.gridSize" {...knobProps} />
        </div>
      )
    case 'acid_cloud':
      return (
        <div className="flex gap-4">
          <Knob label="DEN" value={acid.cloudParams.density} min={1000} max={50000} step={500}
            onChange={v => acid.updateCloudParams({ density: v })} paramId="acid_cloud.density" {...knobProps} />
          <Knob label="DEPTH" value={acid.cloudParams.depthScale} min={0} max={2} step={0.01}
            onChange={v => acid.updateCloudParams({ depthScale: v })} paramId="acid_cloud.depthScale" {...knobProps} />
        </div>
      )
    case 'acid_led':
      return (
        <div className="flex gap-4">
          <Knob label="GRID" value={acid.ledParams.gridSize} min={4} max={16} step={1}
            onChange={v => acid.updateLedParams({ gridSize: v })} paramId="acid_led.gridSize" {...knobProps} />
          <Knob label="BRT" value={acid.ledParams.brightness} min={0.5} max={3} step={0.1}
            onChange={v => acid.updateLedParams({ brightness: v })} paramId="acid_led.brightness" {...knobProps} />
        </div>
      )
    case 'acid_slit':
      return (
        <div className="flex gap-4">
          <Knob label="SPD" value={acid.slitParams.speed} min={1} max={10} step={0.1}
            onChange={v => acid.updateSlitParams({ speed: v })} paramId="acid_slit.speed" {...knobProps} />
          <Knob label="BLEND" value={acid.slitParams.blend} min={0} max={1} step={0.01}
            onChange={v => acid.updateSlitParams({ blend: v })} paramId="acid_slit.blend" {...knobProps} />
        </div>
      )
    case 'acid_voronoi':
      return (
        <div className="flex gap-4">
          <Knob label="CELLS" value={acid.voronoiParams.cellCount} min={16} max={256} step={4}
            onChange={v => acid.updateVoronoiParams({ cellCount: v })} paramId="acid_voronoi.cellCount" {...knobProps} />
        </div>
      )
    case 'acid_halftone':
      return (
        <div className="flex gap-4">
          <Knob label="DOT" value={acid.halftoneParams.dotSize} min={4} max={24} step={1}
            onChange={v => acid.updateHalftoneParams({ dotSize: v })} paramId="acid_halftone.dotSize" {...knobProps} />
          <Knob label="ANGLE" value={acid.halftoneParams.angle} min={0} max={180} step={1}
            onChange={v => acid.updateHalftoneParams({ angle: v })} paramId="acid_halftone.angle" {...knobProps} />
          <Knob label="CONT" value={acid.halftoneParams.contrast} min={0.5} max={2} step={0.01}
            onChange={v => acid.updateHalftoneParams({ contrast: v })} paramId="acid_halftone.contrast" {...knobProps} />
        </div>
      )
    case 'acid_hex':
      return (
        <div className="flex gap-4">
          <Knob label="CELL" value={acid.hexParams.cellSize} min={8} max={48} step={1}
            onChange={v => acid.updateHexParams({ cellSize: v })} paramId="acid_hex.cellSize" {...knobProps} />
          <Knob label="ROT" value={acid.hexParams.rotation} min={0} max={360} step={1}
            onChange={v => acid.updateHexParams({ rotation: v })} paramId="acid_hex.rotation" {...knobProps} />
        </div>
      )
    case 'acid_scan':
      return (
        <div className="flex gap-4">
          <Knob label="SPD" value={acid.scanParams.speed} min={1} max={10} step={0.1}
            onChange={v => acid.updateScanParams({ speed: v })} paramId="acid_scan.speed" {...knobProps} />
          <Knob label="WIDTH" value={acid.scanParams.width} min={1} max={100} step={1}
            onChange={v => acid.updateScanParams({ width: v })} paramId="acid_scan.width" {...knobProps} />
          <Knob label="TRAIL" value={acid.scanParams.trail} min={0} max={1} step={0.01}
            onChange={v => acid.updateScanParams({ trail: v })} paramId="acid_scan.trail" {...knobProps} />
        </div>
      )
    case 'acid_ripple':
      return (
        <div className="flex gap-4">
          <Knob label="FREQ" value={acid.rippleParams.frequency} min={1} max={20} step={0.5}
            onChange={v => acid.updateRippleParams({ frequency: v })} paramId="acid_ripple.frequency" {...knobProps} />
          <Knob label="AMP" value={acid.rippleParams.amplitude} min={0} max={1} step={0.01}
            onChange={v => acid.updateRippleParams({ amplitude: v })} paramId="acid_ripple.amplitude" {...knobProps} />
          <Knob label="SPD" value={acid.rippleParams.speed} min={0} max={5} step={0.1}
            onChange={v => acid.updateRippleParams({ speed: v })} paramId="acid_ripple.speed" {...knobProps} />
        </div>
      )

    // ═══════════════════════════════════════════════════════════════
    // OVERLAYS
    // ═══════════════════════════════════════════════════════════════
    case 'texture_overlay':
      return (
        <div className="flex gap-4">
          <Knob label="OPAC" value={textureOverlay.opacity} min={0} max={1} step={0.01}
            onChange={v => textureOverlay.setOpacity(v)} paramId="texture_overlay.opacity" {...knobProps} />
          <Knob label="SCALE" value={textureOverlay.scale} min={0.5} max={3} step={0.1}
            onChange={v => textureOverlay.setScale(v)} paramId="texture_overlay.scale" {...knobProps} />
        </div>
      )
    case 'data_overlay':
      return (
        <div className="flex gap-4">
          <Knob label="SIZE" value={dataOverlay.style.fontSize} min={8} max={24} step={1}
            onChange={v => dataOverlay.setStyle({ fontSize: v })} paramId="data_overlay.fontSize" {...knobProps} />
          <Knob label="OPAC" value={dataOverlay.style.opacity} min={0} max={1} step={0.01}
            onChange={v => dataOverlay.setStyle({ opacity: v })} paramId="data_overlay.opacity" {...knobProps} />
        </div>
      )

    // ═══════════════════════════════════════════════════════════════
    // STRAND EFFECTS
    // ═══════════════════════════════════════════════════════════════
    case 'strand_handprints':
      return (
        <div className="flex gap-4">
          <Knob label="DEN" value={strand.handprintsParams.density} min={1} max={20} step={1}
            onChange={v => strand.updateHandprintsParams({ density: v })} paramId="strand_handprints.density" {...knobProps} />
          <Knob label="SIZE" value={strand.handprintsParams.size} min={20} max={100} step={1}
            onChange={v => strand.updateHandprintsParams({ size: v })} paramId="strand_handprints.size" {...knobProps} />
        </div>
      )
    case 'strand_tar':
      return (
        <div className="flex gap-4">
          <Knob label="SPD" value={strand.tarSpreadParams.spreadSpeed} min={0} max={1} step={0.01}
            onChange={v => strand.updateTarSpreadParams({ spreadSpeed: v })} paramId="strand_tar.spreadSpeed" {...knobProps} />
          <Knob label="THRSH" value={strand.tarSpreadParams.threshold} min={0} max={1} step={0.01}
            onChange={v => strand.updateTarSpreadParams({ threshold: v })} paramId="strand_tar.threshold" {...knobProps} />
        </div>
      )
    case 'strand_timefall':
      return (
        <div className="flex gap-4">
          <Knob label="INT" value={strand.timefallParams.intensity} min={0} max={1} step={0.01}
            onChange={v => strand.updateTimefallParams({ intensity: v })} paramId="strand_timefall.intensity" {...knobProps} />
          <Knob label="AGE" value={strand.timefallParams.ageAmount} min={0} max={1} step={0.01}
            onChange={v => strand.updateTimefallParams({ ageAmount: v })} paramId="strand_timefall.ageAmount" {...knobProps} />
        </div>
      )
    case 'strand_voidout':
      return (
        <div className="flex gap-4">
          <Knob label="SPD" value={strand.voidOutParams.speed} min={0} max={1} step={0.01}
            onChange={v => strand.updateVoidOutParams({ speed: v })} paramId="strand_voidout.speed" {...knobProps} />
          <Knob label="DIST" value={strand.voidOutParams.distortAmount} min={0} max={1} step={0.01}
            onChange={v => strand.updateVoidOutParams({ distortAmount: v })} paramId="strand_voidout.distortAmount" {...knobProps} />
        </div>
      )
    case 'strand_web':
      return (
        <div className="flex gap-4">
          <Knob label="THRSH" value={strand.strandWebParams.threshold} min={0} max={1} step={0.01}
            onChange={v => strand.updateStrandWebParams({ threshold: v })} paramId="strand_web.threshold" {...knobProps} />
          <Knob label="GLOW" value={strand.strandWebParams.glowIntensity} min={0} max={1} step={0.01}
            onChange={v => strand.updateStrandWebParams({ glowIntensity: v })} paramId="strand_web.glowIntensity" {...knobProps} />
        </div>
      )
    case 'strand_bridge':
      return (
        <div className="flex gap-4">
          <Knob label="GRID" value={strand.bridgeLinkParams.gridSize} min={8} max={64} step={1}
            onChange={v => strand.updateBridgeLinkParams({ gridSize: v })} paramId="strand_bridge.gridSize" {...knobProps} />
          <Knob label="EDGE" value={strand.bridgeLinkParams.edgeSensitivity} min={0} max={1} step={0.01}
            onChange={v => strand.updateBridgeLinkParams({ edgeSensitivity: v })} paramId="strand_bridge.edgeSensitivity" {...knobProps} />
        </div>
      )
    case 'strand_path':
      return (
        <div className="flex gap-4">
          <Knob label="CNT" value={strand.chiralPathParams.particleCount} min={10} max={200} step={5}
            onChange={v => strand.updateChiralPathParams({ particleCount: v })} paramId="strand_path.particleCount" {...knobProps} />
          <Knob label="FLOW" value={strand.chiralPathParams.flowSpeed} min={0} max={2} step={0.01}
            onChange={v => strand.updateChiralPathParams({ flowSpeed: v })} paramId="strand_path.flowSpeed" {...knobProps} />
        </div>
      )
    case 'strand_umbilical':
      return (
        <div className="flex gap-4">
          <Knob label="CNT" value={strand.umbilicalParams.tendrilCount} min={2} max={12} step={1}
            onChange={v => strand.updateUmbilicalParams({ tendrilCount: v })} paramId="strand_umbilical.tendrilCount" {...knobProps} />
          <Knob label="REACH" value={strand.umbilicalParams.reachDistance} min={0.1} max={1} step={0.01}
            onChange={v => strand.updateUmbilicalParams({ reachDistance: v })} paramId="strand_umbilical.reachDistance" {...knobProps} />
        </div>
      )
    case 'strand_odradek':
      return (
        <div className="flex gap-4">
          <Knob label="SPD" value={strand.odradekParams.sweepSpeed} min={0} max={2} step={0.01}
            onChange={v => strand.updateOdradekParams({ sweepSpeed: v })} paramId="strand_odradek.sweepSpeed" {...knobProps} />
          <Knob label="PING" value={strand.odradekParams.pingIntensity} min={0} max={1} step={0.01}
            onChange={v => strand.updateOdradekParams({ pingIntensity: v })} paramId="strand_odradek.pingIntensity" {...knobProps} />
        </div>
      )
    case 'strand_chiralium':
      return (
        <div className="flex gap-4">
          <Knob label="THRSH" value={strand.chiraliumParams.threshold} min={0} max={1} step={0.01}
            onChange={v => strand.updateChiraliumParams({ threshold: v })} paramId="strand_chiralium.threshold" {...knobProps} />
          <Knob label="DEN" value={strand.chiraliumParams.density} min={0} max={1} step={0.01}
            onChange={v => strand.updateChiraliumParams({ density: v })} paramId="strand_chiralium.density" {...knobProps} />
        </div>
      )
    case 'strand_beach':
      return (
        <div className="flex gap-4">
          <Knob label="GRAIN" value={strand.beachStaticParams.grainAmount} min={0} max={1} step={0.01}
            onChange={v => strand.updateBeachStaticParams({ grainAmount: v })} paramId="strand_beach.grainAmount" {...knobProps} />
          <Knob label="FLICK" value={strand.beachStaticParams.flickerSpeed} min={0} max={5} step={0.1}
            onChange={v => strand.updateBeachStaticParams({ flickerSpeed: v })} paramId="strand_beach.flickerSpeed" {...knobProps} />
        </div>
      )
    case 'strand_dooms':
      return (
        <div className="flex gap-4">
          <Knob label="HALO" value={strand.doomsParams.haloSize} min={0} max={1} step={0.01}
            onChange={v => strand.updateDoomsParams({ haloSize: v })} paramId="strand_dooms.haloSize" {...knobProps} />
          <Knob label="PULSE" value={strand.doomsParams.pulseSpeed} min={0} max={5} step={0.1}
            onChange={v => strand.updateDoomsParams({ pulseSpeed: v })} paramId="strand_dooms.pulseSpeed" {...knobProps} />
        </div>
      )
    case 'strand_cloud':
      return (
        <div className="flex gap-4">
          <Knob label="DEN" value={strand.chiralCloudParams.density} min={0} max={1} step={0.01}
            onChange={v => strand.updateChiralCloudParams({ density: v })} paramId="strand_cloud.density" {...knobProps} />
          <Knob label="RESP" value={strand.chiralCloudParams.responsiveness} min={0} max={1} step={0.01}
            onChange={v => strand.updateChiralCloudParams({ responsiveness: v })} paramId="strand_cloud.responsiveness" {...knobProps} />
        </div>
      )
    case 'strand_bbpod':
      return (
        <div className="flex gap-4">
          <Knob label="VIG" value={strand.bbPodParams.vignetteSize} min={0} max={1} step={0.01}
            onChange={v => strand.updateBBPodParams({ vignetteSize: v })} paramId="strand_bbpod.vignetteSize" {...knobProps} />
          <Knob label="TINT" value={strand.bbPodParams.tintStrength} min={0} max={1} step={0.01}
            onChange={v => strand.updateBBPodParams({ tintStrength: v })} paramId="strand_bbpod.tintStrength" {...knobProps} />
        </div>
      )
    case 'strand_seam':
      return (
        <div className="flex gap-4">
          <Knob label="WIDTH" value={strand.seamParams.riftWidth} min={0} max={1} step={0.01}
            onChange={v => strand.updateSeamParams({ riftWidth: v })} paramId="strand_seam.riftWidth" {...knobProps} />
          <Knob label="PARA" value={strand.seamParams.parallaxAmount} min={0} max={1} step={0.01}
            onChange={v => strand.updateSeamParams({ parallaxAmount: v })} paramId="strand_seam.parallaxAmount" {...knobProps} />
        </div>
      )
    case 'strand_extinction':
      return (
        <div className="flex gap-4">
          <Knob label="SPD" value={strand.extinctionParams.erosionSpeed} min={0} max={1} step={0.01}
            onChange={v => strand.updateExtinctionParams({ erosionSpeed: v })} paramId="strand_extinction.erosionSpeed" {...knobProps} />
          <Knob label="COV" value={strand.extinctionParams.coverage} min={0} max={1} step={0.01}
            onChange={v => strand.updateExtinctionParams({ coverage: v })} paramId="strand_extinction.coverage" {...knobProps} />
        </div>
      )

    // ═══════════════════════════════════════════════════════════════
    // MOTION EFFECTS
    // ═══════════════════════════════════════════════════════════════
    case 'motion_extract':
      return (
        <div className="flex gap-4">
          <Knob label="THRSH" value={motion.motionExtract.threshold} min={0} max={1} step={0.01}
            onChange={v => motion.updateMotionExtract({ threshold: v })} paramId="motion_extract.threshold" {...knobProps} />
          <Knob label="AMP" value={motion.motionExtract.amplify} min={1} max={10} step={0.1}
            onChange={v => motion.updateMotionExtract({ amplify: v })} paramId="motion_extract.amplify" {...knobProps} />
        </div>
      )
    case 'echo_trail':
      return (
        <div className="flex gap-4">
          <Knob label="DECAY" value={motion.echoTrail.decay} min={0} max={1} step={0.01}
            onChange={v => motion.updateEchoTrail({ decay: v })} paramId="echo_trail.decay" {...knobProps} />
          <Knob label="CNT" value={motion.echoTrail.trailCount} min={2} max={30} step={1}
            onChange={v => motion.updateEchoTrail({ trailCount: v })} paramId="echo_trail.trailCount" {...knobProps} />
        </div>
      )
    case 'time_smear':
      return (
        <div className="flex gap-4">
          <Knob label="ACC" value={motion.timeSmear.accumulation} min={0} max={1} step={0.01}
            onChange={v => motion.updateTimeSmear({ accumulation: v })} paramId="time_smear.accumulation" {...knobProps} />
          <Knob label="THRSH" value={motion.timeSmear.threshold} min={0} max={1} step={0.01}
            onChange={v => motion.updateTimeSmear({ threshold: v })} paramId="time_smear.threshold" {...knobProps} />
        </div>
      )
    case 'freeze_mask':
      return (
        <div className="flex gap-4">
          <Knob label="THRSH" value={motion.freezeMask.freezeThreshold} min={0} max={1} step={0.01}
            onChange={v => motion.updateFreezeMask({ freezeThreshold: v })} paramId="freeze_mask.freezeThreshold" {...knobProps} />
          <Knob label="SPD" value={motion.freezeMask.updateSpeed} min={0} max={1} step={0.01}
            onChange={v => motion.updateFreezeMask({ updateSpeed: v })} paramId="freeze_mask.updateSpeed" {...knobProps} />
        </div>
      )

    // ═══════════════════════════════════════════════════════════════
    // DESTRUCTION EFFECTS
    // ═══════════════════════════════════════════════════════════════
    case 'datamosh':
      return (
        <div className="flex gap-4">
          <Knob label="INT" value={destruction.datamoshParams.intensity} min={0} max={1} step={0.01}
            onChange={v => destruction.updateDatamoshParams({ intensity: v })} paramId="datamosh.intensity" {...knobProps} />
          <Knob label="CHAOS" value={destruction.datamoshParams.chaos} min={0} max={1} step={0.01}
            onChange={v => destruction.updateDatamoshParams({ chaos: v })} paramId="datamosh.chaos" {...knobProps} />
        </div>
      )
    case 'pixelSort':
      return (
        <div className="flex gap-4">
          <Knob label="INT" value={destruction.pixelSortParams.intensity} min={0} max={1} step={0.01}
            onChange={v => destruction.updatePixelSortParams({ intensity: v })} paramId="pixelSort.intensity" {...knobProps} />
          <Knob label="THRSH" value={destruction.pixelSortParams.threshold} min={0} max={1} step={0.01}
            onChange={v => destruction.updatePixelSortParams({ threshold: v })} paramId="pixelSort.threshold" {...knobProps} />
        </div>
      )
    case 'sonify':
      return (
        <div className="flex gap-4">
          <Knob label="RATE" value={destruction.sonifyParams.sampleRate} min={0.01} max={1} step={0.01}
            onChange={v => destruction.updateSonifyParams({ sampleRate: v })} paramId="sonify.sampleRate" {...knobProps} />
          <Knob label="BITS" value={destruction.sonifyParams.bitDepth} min={1} max={16} step={1}
            onChange={v => destruction.updateSonifyParams({ bitDepth: v })} paramId="sonify.bitDepth" {...knobProps} />
        </div>
      )

    case 'point_cloud':
      return (
        <div className="flex gap-4">
          <Knob label="DEPTH" value={destruction.pointCloudParams.depthMultiplier} min={0} max={2} step={0.01}
            onChange={v => destruction.updatePointCloudParams({ depthMultiplier: v })} paramId="point_cloud.depthMultiplier" {...knobProps} />
          <Knob label="SIZE" value={destruction.pointCloudParams.pointSize} min={1} max={20} step={0.5}
            onChange={v => destruction.updatePointCloudParams({ pointSize: v })} paramId="point_cloud.pointSize" {...knobProps} />
          <Knob label="DENS" value={destruction.pointCloudParams.density} min={64} max={512} step={8}
            onChange={v => destruction.updatePointCloudParams({ density: v })} paramId="point_cloud.density" {...knobProps} />
        </div>
      )

    default:
      return null
  }
}
