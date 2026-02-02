import { type ReactNode, useState, useRef, useCallback, useEffect } from 'react'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { useAsciiRenderStore } from '../../stores/asciiRenderStore'
import { useStippleStore } from '../../stores/stippleStore'
import { useLandmarksStore } from '../../stores/landmarksStore'
import { useContourStore } from '../../stores/contourStore'
import { useUIStore } from '../../stores/uiStore'
import { useRoutingStore } from '../../stores/routingStore'
import { useSequencerStore } from '../../stores/sequencerStore'
import { RoutingIndicators } from '../sequencer/RoutingIndicator'
import { EFFECTS } from '../../config/effects'
import {
  RGBSplitViz,
  BlockDisplaceViz,
  ScanLinesViz,
  NoiseViz,
  PixelateViz,
  EdgeViz,
  WaveformViz,
  NetworkViz,
  StippleViz,
  FaceMeshViz,
  ChromaticViz,
  VHSViz,
  LensViz,
  DitherViz,
  PosterizeViz,
  StaticDisplaceViz,
  ColorGradeViz,
  FeedbackViz,
  // Acid visualizers
  DotsViz,
  GlyphViz,
  IconsViz,
  ContourViz,
  DecompViz,
  MirrorViz,
  SliceViz,
  ThGridViz,
  CloudViz,
  LedViz,
  SlitViz,
  VoronoiViz,
  // Vision tracking visualizers
  BrightViz,
  EdgeTrackViz,
  ColorTrackViz,
  MotionViz,
  FaceTrackViz,
  HandsTrackViz,
  // Overlay visualizers
  TextureViz,
  DataViz,
} from './visualizers'
import { useAcidStore } from '../../stores/acidStore'
import { useVisionTrackingStore } from '../../stores/visionTrackingStore'
import { useTextureOverlayStore } from '../../stores/textureOverlayStore'
import { useDataOverlayStore } from '../../stores/dataOverlayStore'
import { useStrandStore } from '../../stores/strandStore'

interface ParameterSection {
  id: string
  label: string
  color: string
  visualizer: ReactNode
  params: {
    label: string
    value: number
    min: number
    max: number
    onChange: (v: number) => void
    format?: (v: number) => string
    paramId?: string  // e.g., 'rgb_split.amount' for sequencer routing
  }[]
}

export function ParameterPanel() {
  const glitch = useGlitchEngineStore()
  const { effectBypassed, toggleEffectBypassed, soloEffectId, soloLatched, bypassActive } = useGlitchEngineStore()

  // Solo filtering: check if we're in solo mode
  const isSoloing = soloEffectId !== null

  // Flashing state for latched solo
  const [flashOn, setFlashOn] = useState(true)
  useEffect(() => {
    if (isSoloing && soloLatched) {
      const interval = setInterval(() => {
        setFlashOn((prev) => !prev)
      }, 400)
      return () => clearInterval(interval)
    } else {
      setFlashOn(true)
    }
  }, [isSoloing, soloLatched])

  // Helper to convert hex to rgb values
  function hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (result) {
      return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    }
    return '255, 255, 255'
  }

  const ascii = useAsciiRenderStore()
  const stipple = useStippleStore()
  const landmarks = useLandmarksStore()
  const contour = useContourStore()
  const acid = useAcidStore()
  const vision = useVisionTrackingStore()
  const textureOverlay = useTextureOverlayStore()
  const dataOverlay = useDataOverlayStore()
  const strand = useStrandStore()

  // Clear all effects
  const handleClear = useCallback(() => {
    glitch.setRGBSplitEnabled(false)
    glitch.setBlockDisplaceEnabled(false)
    glitch.setScanLinesEnabled(false)
    glitch.setNoiseEnabled(false)
    glitch.setPixelateEnabled(false)
    glitch.setEdgeDetectionEnabled(false)
    glitch.setChromaticAberrationEnabled(false)
    glitch.setVHSTrackingEnabled(false)
    glitch.setLensDistortionEnabled(false)
    glitch.setDitherEnabled(false)
    glitch.setPosterizeEnabled(false)
    glitch.setStaticDisplacementEnabled(false)
    glitch.setColorGradeEnabled(false)
    glitch.setFeedbackLoopEnabled(false)
    ascii.setEnabled(false)
    stipple.setEnabled(false)
    contour.setEnabled(false)
    landmarks.setEnabled(false)
    landmarks.setCurrentMode('off')
    // Clear acid effects
    acid.setDotsEnabled(false)
    acid.setGlyphEnabled(false)
    acid.setIconsEnabled(false)
    acid.setContourEnabled(false)
    acid.setDecompEnabled(false)
    acid.setMirrorEnabled(false)
    acid.setSliceEnabled(false)
    acid.setThGridEnabled(false)
    acid.setCloudEnabled(false)
    acid.setLedEnabled(false)
    acid.setSlitEnabled(false)
    acid.setVoronoiEnabled(false)
    // Clear vision tracking effects
    vision.setBrightEnabled(false)
    vision.setEdgeEnabled(false)
    vision.setColorEnabled(false)
    vision.setMotionEnabled(false)
    vision.setFaceEnabled(false)
    vision.setHandsEnabled(false)
    // Clear overlay effects
    textureOverlay.setEnabled(false)
    dataOverlay.setEnabled(false)
    // Clear strand effects
    strand.setHandprintsEnabled(false)
    strand.setTarSpreadEnabled(false)
    strand.setTimefallEnabled(false)
    strand.setVoidOutEnabled(false)
    strand.setStrandWebEnabled(false)
    strand.setBridgeLinkEnabled(false)
    strand.setChiralPathEnabled(false)
    strand.setUmbilicalEnabled(false)
    strand.setOdradekEnabled(false)
    strand.setChiraliumEnabled(false)
    strand.setBeachStaticEnabled(false)
    strand.setDoomsEnabled(false)
    strand.setChiralCloudEnabled(false)
    strand.setBBPodEnabled(false)
    strand.setSeamEnabled(false)
    strand.setExtinctionEnabled(false)
  }, [glitch, ascii, stipple, contour, landmarks, acid, vision, textureOverlay, dataOverlay, strand])

  // Build active effect sections
  const sections: ParameterSection[] = []

  // RGB Split
  if (glitch.rgbSplitEnabled) {
    const effect = EFFECTS.find(e => e.id === 'rgb_split')
    const color = effect?.color || '#00d4ff'
    sections.push({
      id: 'rgb_split',
      label: 'RGB SPLIT',
      color,
      visualizer: (
        <RGBSplitViz
          amount={glitch.rgbSplit.amount}
          redOffsetX={glitch.rgbSplit.redOffsetX}
          color={color}
        />
      ),
      params: [
        {
          label: 'Amount',
          value: glitch.rgbSplit.amount * 50,
          min: 0,
          max: 100,
          onChange: (v) => glitch.updateRGBSplit({ amount: v / 50 }),
        },
        {
          label: 'Red X',
          value: glitch.rgbSplit.redOffsetX * 1000,
          min: -50,
          max: 50,
          onChange: (v) => glitch.updateRGBSplit({ redOffsetX: v / 1000 }),
        },
      ],
    })
  }

  // Block Displace
  if (glitch.blockDisplaceEnabled) {
    const effect = EFFECTS.find(e => e.id === 'block_displace')
    const color = effect?.color || '#ff00aa'
    sections.push({
      id: 'block_displace',
      label: 'BLOCK',
      color,
      visualizer: (
        <BlockDisplaceViz
          amount={glitch.blockDisplace.displaceDistance * 1000}
          seed={glitch.blockDisplace.seed}
          color={color}
        />
      ),
      params: [
        {
          label: 'Dist',
          value: glitch.blockDisplace.displaceDistance * 1000,
          min: 0,
          max: 100,
          onChange: (v) => glitch.updateBlockDisplace({ displaceDistance: v / 1000 }),
        },
        {
          label: 'Seed',
          value: glitch.blockDisplace.seed,
          min: 0,
          max: 1000,
          onChange: (v) => glitch.updateBlockDisplace({ seed: v }),
        },
      ],
    })
  }

  // Scan Lines
  if (glitch.scanLinesEnabled) {
    const effect = EFFECTS.find(e => e.id === 'scan_lines')
    const color = effect?.color || '#4444ff'
    sections.push({
      id: 'scan_lines',
      label: 'SCAN',
      color,
      visualizer: (
        <ScanLinesViz
          lineCount={glitch.scanLines.lineCount}
          opacity={glitch.scanLines.lineOpacity}
          color={color}
        />
      ),
      params: [
        {
          label: 'Lines',
          value: glitch.scanLines.lineCount,
          min: 50,
          max: 500,
          onChange: (v) => glitch.updateScanLines({ lineCount: v }),
        },
        {
          label: 'Opacity',
          value: glitch.scanLines.lineOpacity * 100,
          min: 0,
          max: 100,
          onChange: (v) => glitch.updateScanLines({ lineOpacity: v / 100 }),
        },
      ],
    })
  }

  // Noise
  if (glitch.noiseEnabled) {
    const effect = EFFECTS.find(e => e.id === 'noise')
    const color = effect?.color || '#aa44ff'
    sections.push({
      id: 'noise',
      label: 'NOISE',
      color,
      visualizer: (
        <NoiseViz
          amount={glitch.noise.amount * 100}
          speed={glitch.noise.speed}
          color={color}
        />
      ),
      params: [
        {
          label: 'Amount',
          value: glitch.noise.amount * 100,
          min: 0,
          max: 100,
          onChange: (v) => glitch.updateNoise({ amount: v / 100 }),
        },
        {
          label: 'Speed',
          value: glitch.noise.speed,
          min: 1,
          max: 50,
          onChange: (v) => glitch.updateNoise({ speed: v }),
        },
      ],
    })
  }

  // Pixelate
  if (glitch.pixelateEnabled) {
    const effect = EFFECTS.find(e => e.id === 'pixelate')
    const color = effect?.color || '#ff6600'
    sections.push({
      id: 'pixelate',
      label: 'PIXEL',
      color,
      visualizer: (
        <PixelateViz
          pixelSize={glitch.pixelate.pixelSize}
          color={color}
        />
      ),
      params: [
        {
          label: 'Size',
          value: glitch.pixelate.pixelSize,
          min: 2,
          max: 32,
          onChange: (v) => glitch.updatePixelate({ pixelSize: v }),
        },
      ],
    })
  }

  // Edge Detection
  if (glitch.edgeDetectionEnabled) {
    const effect = EFFECTS.find(e => e.id === 'edges')
    const color = effect?.color || '#00ffaa'
    sections.push({
      id: 'edges',
      label: 'EDGES',
      color,
      visualizer: (
        <EdgeViz
          threshold={glitch.edgeDetection.threshold * 100}
          mix={glitch.edgeDetection.mixAmount}
          color={color}
        />
      ),
      params: [
        {
          label: 'Thresh',
          value: glitch.edgeDetection.threshold * 100,
          min: 0,
          max: 100,
          onChange: (v) => glitch.updateEdgeDetection({ threshold: v / 100 }),
        },
        {
          label: 'Mix',
          value: glitch.edgeDetection.mixAmount * 100,
          min: 0,
          max: 100,
          onChange: (v) => glitch.updateEdgeDetection({ mixAmount: v / 100 }),
        },
      ],
    })
  }

  // Chromatic Aberration
  if (glitch.chromaticAberrationEnabled) {
    const effect = EFFECTS.find(e => e.id === 'chromatic')
    const color = effect?.color || '#ff6b6b'
    sections.push({
      id: 'chromatic',
      label: 'CHROMA',
      color,
      visualizer: (
        <ChromaticViz
          intensity={glitch.chromaticAberration.intensity * 100}
          color={color}
        />
      ),
      params: [
        {
          label: 'Intens',
          value: glitch.chromaticAberration.intensity * 100,
          min: 0,
          max: 100,
          onChange: (v) => glitch.updateChromaticAberration({ intensity: v / 100 }),
        },
        {
          label: 'Radial',
          value: glitch.chromaticAberration.radialAmount * 100,
          min: 0,
          max: 100,
          onChange: (v) => glitch.updateChromaticAberration({ radialAmount: v / 100 }),
        },
      ],
    })
  }

  // VHS Tracking
  if (glitch.vhsTrackingEnabled) {
    const effect = EFFECTS.find(e => e.id === 'vhs')
    const color = effect?.color || '#a855f7'
    sections.push({
      id: 'vhs',
      label: 'VHS',
      color,
      visualizer: (
        <VHSViz
          tearIntensity={glitch.vhsTracking.tearIntensity * 100}
          color={color}
        />
      ),
      params: [
        {
          label: 'Tear',
          value: glitch.vhsTracking.tearIntensity * 100,
          min: 0,
          max: 100,
          onChange: (v) => glitch.updateVHSTracking({ tearIntensity: v / 100 }),
        },
        {
          label: 'Bleed',
          value: glitch.vhsTracking.colorBleed * 100,
          min: 0,
          max: 100,
          onChange: (v) => glitch.updateVHSTracking({ colorBleed: v / 100 }),
        },
      ],
    })
  }

  // Lens Distortion
  if (glitch.lensDistortionEnabled) {
    const effect = EFFECTS.find(e => e.id === 'lens')
    const color = effect?.color || '#06b6d4'
    sections.push({
      id: 'lens',
      label: 'LENS',
      color,
      visualizer: (
        <LensViz
          curvature={glitch.lensDistortion.curvature}
          color={color}
        />
      ),
      params: [
        {
          label: 'Curve',
          value: glitch.lensDistortion.curvature * 100,
          min: -100,
          max: 100,
          onChange: (v) => glitch.updateLensDistortion({ curvature: v / 100 }),
        },
        {
          label: 'Vign',
          value: glitch.lensDistortion.vignette * 100,
          min: 0,
          max: 100,
          onChange: (v) => glitch.updateLensDistortion({ vignette: v / 100 }),
        },
      ],
    })
  }

  // Dither
  if (glitch.ditherEnabled) {
    const effect = EFFECTS.find(e => e.id === 'dither')
    const color = effect?.color || '#f472b6'
    sections.push({
      id: 'dither',
      label: 'DITHER',
      color,
      visualizer: (
        <DitherViz
          intensity={glitch.dither.intensity * 100}
          color={color}
        />
      ),
      params: [
        {
          label: 'Intens',
          value: glitch.dither.intensity * 100,
          min: 0,
          max: 100,
          onChange: (v) => glitch.updateDither({ intensity: v / 100 }),
        },
        {
          label: 'Depth',
          value: glitch.dither.colorDepth,
          min: 2,
          max: 16,
          onChange: (v) => glitch.updateDither({ colorDepth: v }),
        },
      ],
    })
  }

  // Posterize
  if (glitch.posterizeEnabled) {
    const effect = EFFECTS.find(e => e.id === 'posterize')
    const color = effect?.color || '#f59e0b'
    sections.push({
      id: 'posterize',
      label: 'POSTER',
      color,
      visualizer: (
        <PosterizeViz
          levels={glitch.posterize.levels}
          color={color}
        />
      ),
      params: [
        {
          label: 'Levels',
          value: glitch.posterize.levels,
          min: 2,
          max: 16,
          onChange: (v) => glitch.updatePosterize({ levels: v }),
        },
        {
          label: 'Sat',
          value: glitch.posterize.saturationBoost * 100,
          min: 0,
          max: 200,
          onChange: (v) => glitch.updatePosterize({ saturationBoost: v / 100 }),
        },
      ],
    })
  }

  // Static Displacement
  if (glitch.staticDisplacementEnabled) {
    const effect = EFFECTS.find(e => e.id === 'static_displace')
    const color = effect?.color || '#ec4899'
    sections.push({
      id: 'static_displace',
      label: 'STATIC',
      color,
      visualizer: (
        <StaticDisplaceViz
          intensity={glitch.staticDisplacement.intensity * 100}
          color={color}
        />
      ),
      params: [
        {
          label: 'Intens',
          value: glitch.staticDisplacement.intensity * 100,
          min: 0,
          max: 100,
          onChange: (v) => glitch.updateStaticDisplacement({ intensity: v / 100 }),
        },
        {
          label: 'Scale',
          value: glitch.staticDisplacement.scale,
          min: 1,
          max: 100,
          onChange: (v) => glitch.updateStaticDisplacement({ scale: v }),
        },
      ],
    })
  }

  // Color Grade
  if (glitch.colorGradeEnabled) {
    const effect = EFFECTS.find(e => e.id === 'color_grade')
    const color = effect?.color || '#84cc16'
    sections.push({
      id: 'color_grade',
      label: 'GRADE',
      color,
      visualizer: (
        <ColorGradeViz
          saturation={glitch.colorGrade.saturation * 100}
          color={color}
        />
      ),
      params: [
        {
          label: 'Sat',
          value: glitch.colorGrade.saturation * 100,
          min: 0,
          max: 200,
          onChange: (v) => glitch.updateColorGrade({ saturation: v / 100 }),
        },
        {
          label: 'Bright',
          value: (glitch.colorGrade.brightness + 1) * 50,
          min: 0,
          max: 100,
          onChange: (v) => glitch.updateColorGrade({ brightness: v / 50 - 1 }),
        },
      ],
    })
  }

  // Feedback Loop
  if (glitch.feedbackLoopEnabled) {
    const effect = EFFECTS.find(e => e.id === 'feedback')
    const color = effect?.color || '#8b5cf6'
    sections.push({
      id: 'feedback',
      label: 'FEEDBACK',
      color,
      visualizer: (
        <FeedbackViz
          decay={glitch.feedbackLoop.decay * 100}
          color={color}
        />
      ),
      params: [
        {
          label: 'Decay',
          value: glitch.feedbackLoop.decay * 100,
          min: 0,
          max: 100,
          onChange: (v) => glitch.updateFeedbackLoop({ decay: v / 100 }),
        },
        {
          label: 'Zoom',
          value: glitch.feedbackLoop.zoom * 100,
          min: 90,
          max: 110,
          onChange: (v) => glitch.updateFeedbackLoop({ zoom: v / 100 }),
        },
      ],
    })
  }

  // ASCII
  if (ascii.enabled) {
    const color = ascii.params.mode === 'matrix' ? '#88ff00' : '#ffaa00'
    sections.push({
      id: 'ascii',
      label: ascii.params.mode === 'matrix' ? 'MATRIX' : 'ASCII',
      color,
      visualizer: (
        <WaveformViz
          frequency={ascii.params.fontSize}
          amplitude={ascii.params.contrast * 50}
          color={color}
        />
      ),
      params: [
        {
          label: 'Size',
          value: ascii.params.fontSize,
          min: 4,
          max: 20,
          onChange: (v) => ascii.updateParams({ fontSize: v }),
        },
        {
          label: 'Contrs',
          value: ascii.params.contrast * 100,
          min: 50,
          max: 200,
          onChange: (v) => ascii.updateParams({ contrast: v / 100 }),
        },
      ],
    })
  }

  // Stipple
  if (stipple.enabled) {
    const color = '#ff6600'
    sections.push({
      id: 'stipple',
      label: 'STIPPLE',
      color,
      visualizer: (
        <StippleViz
          size={stipple.params.particleSize}
          density={stipple.params.density}
          color={color}
        />
      ),
      params: [
        {
          label: 'Size',
          value: stipple.params.particleSize,
          min: 1,
          max: 8,
          onChange: (v) => stipple.updateParams({ particleSize: v }),
        },
        {
          label: 'Density',
          value: stipple.params.density * 100,
          min: 10,
          max: 300,
          onChange: (v) => stipple.updateParams({ density: v / 100 }),
        },
      ],
    })
  }

  // Contour Tracking
  if (contour.enabled) {
    const color = '#65a30d'
    sections.push({
      id: 'contour',
      label: 'CONTOUR',
      color,
      visualizer: (
        <NetworkViz
          pointRadius={4}
          maxDistance={contour.params.threshold}
          color={color}
        />
      ),
      params: [
        {
          label: 'Thresh',
          value: contour.params.threshold * 100,
          min: 0,
          max: 100,
          onChange: (v) => contour.updateParams({ threshold: v / 100 }),
        },
        {
          label: 'Width',
          value: contour.params.baseWidth,
          min: 1,
          max: 10,
          onChange: (v) => contour.updateParams({ baseWidth: v }),
        },
      ],
    })
  }

  // Landmarks (Face/Hands/Pose)
  if (landmarks.enabled && landmarks.currentMode !== 'off') {
    const modeLabels: Record<string, string> = {
      face: 'FACE',
      hands: 'HANDS',
      pose: 'POSE',
      holistic: 'HOLO',
    }
    const color = '#88ff00'
    sections.push({
      id: 'landmarks',
      label: modeLabels[landmarks.currentMode] || 'VISION',
      color,
      visualizer: (
        <FaceMeshViz
          confidence={landmarks.minDetectionConfidence * 100}
          color={color}
        />
      ),
      params: [
        {
          label: 'Conf',
          value: landmarks.minDetectionConfidence * 100,
          min: 10,
          max: 90,
          onChange: (v) => landmarks.setMinDetectionConfidence(v / 100),
        },
        {
          label: 'Track',
          value: landmarks.minTrackingConfidence * 100,
          min: 10,
          max: 90,
          onChange: (v) => landmarks.setMinTrackingConfidence(v / 100),
        },
      ],
    })
  }

  // ═══════════════════════════════════════════════════════════════
  // VISION TRACKING EFFECTS
  // ═══════════════════════════════════════════════════════════════

  // Bright tracking
  if (vision.brightEnabled) {
    const color = '#eab308'
    sections.push({
      id: 'track_bright',
      label: 'BRIGHT',
      color,
      visualizer: <BrightViz threshold={vision.brightParams.threshold} color={color} />,
      params: [
        {
          label: 'Thresh',
          value: vision.brightParams.threshold,
          min: 0,
          max: 255,
          onChange: (v) => vision.updateBrightParams({ threshold: v }),
          paramId: 'track_bright.threshold',
        },
        {
          label: 'MinSize',
          value: vision.brightParams.minSize,
          min: 5,
          max: 100,
          onChange: (v) => vision.updateBrightParams({ minSize: v }),
          paramId: 'track_bright.minSize',
        },
      ],
    })
  }

  // Edge tracking
  if (vision.edgeEnabled) {
    const color = '#06b6d4'
    sections.push({
      id: 'track_edge',
      label: 'EDGE',
      color,
      visualizer: <EdgeTrackViz threshold={vision.edgeParams.threshold} color={color} />,
      params: [
        {
          label: 'Thresh',
          value: vision.edgeParams.threshold,
          min: 0,
          max: 255,
          onChange: (v) => vision.updateEdgeParams({ threshold: v }),
          paramId: 'track_edge.threshold',
        },
        {
          label: 'MinSize',
          value: vision.edgeParams.minSize,
          min: 5,
          max: 100,
          onChange: (v) => vision.updateEdgeParams({ minSize: v }),
          paramId: 'track_edge.minSize',
        },
      ],
    })
  }

  // Color tracking
  if (vision.colorEnabled) {
    const color = '#ec4899'
    sections.push({
      id: 'track_color',
      label: 'COLOR',
      color,
      visualizer: <ColorTrackViz targetColor={vision.colorParams.targetColor} color={color} />,
      params: [
        {
          label: 'Range',
          value: vision.colorParams.colorRange * 100,
          min: 5,
          max: 100,
          onChange: (v) => vision.updateColorParams({ colorRange: v / 100 }),
          paramId: 'track_color.colorRange',
        },
        {
          label: 'MinSize',
          value: vision.colorParams.minSize,
          min: 5,
          max: 100,
          onChange: (v) => vision.updateColorParams({ minSize: v }),
          paramId: 'track_color.minSize',
        },
      ],
    })
  }

  // Motion tracking
  if (vision.motionEnabled) {
    const color = '#22c55e'
    sections.push({
      id: 'track_motion',
      label: 'MOTION',
      color,
      visualizer: <MotionViz sensitivity={vision.motionParams.sensitivity} color={color} />,
      params: [
        {
          label: 'Sens',
          value: vision.motionParams.sensitivity,
          min: 5,
          max: 100,
          onChange: (v) => vision.updateMotionParams({ sensitivity: v }),
          paramId: 'track_motion.sensitivity',
        },
        {
          label: 'MinSize',
          value: vision.motionParams.minSize,
          min: 5,
          max: 100,
          onChange: (v) => vision.updateMotionParams({ minSize: v }),
          paramId: 'track_motion.minSize',
        },
      ],
    })
  }

  // Face tracking
  if (vision.faceEnabled) {
    const color = '#f97316'
    sections.push({
      id: 'track_face',
      label: 'FACE',
      color,
      visualizer: <FaceTrackViz threshold={vision.faceParams.threshold} color={color} />,
      params: [
        {
          label: 'Sens',
          value: vision.faceParams.threshold,
          min: 10,
          max: 90,
          onChange: (v) => vision.updateFaceParams({ threshold: v }),
          paramId: 'track_face.threshold',
        },
        {
          label: 'MinSize',
          value: vision.faceParams.minSize,
          min: 20,
          max: 150,
          onChange: (v) => vision.updateFaceParams({ minSize: v }),
          paramId: 'track_face.minSize',
        },
      ],
    })
  }

  // Hands tracking
  if (vision.handsEnabled) {
    const color = '#a855f7'
    sections.push({
      id: 'track_hands',
      label: 'HANDS',
      color,
      visualizer: <HandsTrackViz threshold={vision.handsParams.threshold} color={color} />,
      params: [
        {
          label: 'Sens',
          value: vision.handsParams.threshold,
          min: 10,
          max: 90,
          onChange: (v) => vision.updateHandsParams({ threshold: v }),
          paramId: 'track_hands.threshold',
        },
        {
          label: 'MinSize',
          value: vision.handsParams.minSize,
          min: 10,
          max: 80,
          onChange: (v) => vision.updateHandsParams({ minSize: v }),
          paramId: 'track_hands.minSize',
        },
      ],
    })
  }

  // ═══════════════════════════════════════════════════════════════
  // ACID EFFECTS
  // ═══════════════════════════════════════════════════════════════

  // Dots
  if (acid.dotsEnabled) {
    const color = '#e5e5e5'
    sections.push({
      id: 'acid_dots',
      label: 'DOTS',
      color,
      visualizer: <DotsViz gridSize={acid.dotsParams.gridSize} color={color} />,
      params: [
        {
          label: 'Grid',
          value: acid.dotsParams.gridSize,
          min: 4,
          max: 32,
          onChange: (v) => acid.updateDotsParams({ gridSize: v }),
          paramId: 'acid_dots.gridSize',
        },
        {
          label: 'Scale',
          value: acid.dotsParams.dotScale * 100,
          min: 20,
          max: 150,
          onChange: (v) => acid.updateDotsParams({ dotScale: v / 100 }),
          paramId: 'acid_dots.dotScale',
        },
      ],
    })
  }

  // Glyph
  if (acid.glyphEnabled) {
    const color = '#d4d4d4'
    sections.push({
      id: 'acid_glyph',
      label: 'GLYPH',
      color,
      visualizer: <GlyphViz fontSize={acid.glyphParams.gridSize} color={color} />,
      params: [
        {
          label: 'Grid',
          value: acid.glyphParams.gridSize,
          min: 8,
          max: 24,
          onChange: (v) => acid.updateGlyphParams({ gridSize: v }),
          paramId: 'acid_glyph.gridSize',
        },
        {
          label: 'Density',
          value: acid.glyphParams.density * 100,
          min: 30,
          max: 100,
          onChange: (v) => acid.updateGlyphParams({ density: v / 100 }),
          paramId: 'acid_glyph.density',
        },
      ],
    })
  }

  // Icons
  if (acid.iconsEnabled) {
    const color = '#c4c4c4'
    sections.push({
      id: 'acid_icons',
      label: 'ICONS',
      color,
      visualizer: <IconsViz iconSize={acid.iconsParams.gridSize} color={color} />,
      params: [
        {
          label: 'Grid',
          value: acid.iconsParams.gridSize,
          min: 16,
          max: 64,
          onChange: (v) => acid.updateIconsParams({ gridSize: v }),
          paramId: 'acid_icons.gridSize',
        },
        {
          label: 'Rotate',
          value: acid.iconsParams.rotation,
          min: 0,
          max: 360,
          onChange: (v) => acid.updateIconsParams({ rotation: v }),
          paramId: 'acid_icons.rotation',
        },
      ],
    })
  }

  // Contour
  if (acid.contourEnabled) {
    const color = '#b4b4b4'
    sections.push({
      id: 'acid_contour',
      label: 'CONTOUR',
      color,
      visualizer: <ContourViz levels={acid.contourParams.levels} color={color} />,
      params: [
        {
          label: 'Levels',
          value: acid.contourParams.levels,
          min: 4,
          max: 20,
          onChange: (v) => acid.updateContourParams({ levels: v }),
          paramId: 'acid_contour.levels',
        },
        {
          label: 'Width',
          value: acid.contourParams.lineWidth,
          min: 1,
          max: 5,
          onChange: (v) => acid.updateContourParams({ lineWidth: v }),
          paramId: 'acid_contour.lineWidth',
        },
      ],
    })
  }

  // Decomp
  if (acid.decompEnabled) {
    const color = '#94a3b8'
    sections.push({
      id: 'acid_decomp',
      label: 'DECOMP',
      color,
      visualizer: <DecompViz minSize={acid.decompParams.minBlock} color={color} />,
      params: [
        {
          label: 'Min',
          value: acid.decompParams.minBlock,
          min: 2,
          max: 32,
          onChange: (v) => acid.updateDecompParams({ minBlock: v }),
          paramId: 'acid_decomp.minBlock',
        },
        {
          label: 'Max',
          value: acid.decompParams.maxBlock,
          min: 16,
          max: 128,
          onChange: (v) => acid.updateDecompParams({ maxBlock: v }),
          paramId: 'acid_decomp.maxBlock',
        },
      ],
    })
  }

  // Mirror
  if (acid.mirrorEnabled) {
    const color = '#7dd3fc'
    sections.push({
      id: 'acid_mirror',
      label: 'MIRROR',
      color,
      visualizer: <MirrorViz segments={acid.mirrorParams.segments} color={color} />,
      params: [
        {
          label: 'Segs',
          value: acid.mirrorParams.segments,
          min: 2,
          max: 8,
          onChange: (v) => acid.updateMirrorParams({ segments: v }),
          paramId: 'acid_mirror.segments',
        },
        {
          label: 'Rotate',
          value: acid.mirrorParams.rotation,
          min: 0,
          max: 360,
          onChange: (v) => acid.updateMirrorParams({ rotation: v }),
          paramId: 'acid_mirror.rotation',
        },
      ],
    })
  }

  // Slice
  if (acid.sliceEnabled) {
    const color = '#67e8f9'
    sections.push({
      id: 'acid_slice',
      label: 'SLICE',
      color,
      visualizer: <SliceViz sliceCount={acid.sliceParams.sliceCount} color={color} />,
      params: [
        {
          label: 'Count',
          value: acid.sliceParams.sliceCount,
          min: 4,
          max: 64,
          onChange: (v) => acid.updateSliceParams({ sliceCount: v }),
          paramId: 'acid_slice.sliceCount',
        },
        {
          label: 'Offset',
          value: acid.sliceParams.offset,
          min: 0,
          max: 100,
          onChange: (v) => acid.updateSliceParams({ offset: v }),
          paramId: 'acid_slice.offset',
        },
      ],
    })
  }

  // ThGrid
  if (acid.thGridEnabled) {
    const color = '#a5f3fc'
    sections.push({
      id: 'acid_thgrid',
      label: 'THGRID',
      color,
      visualizer: <ThGridViz threshold={acid.thGridParams.threshold} color={color} />,
      params: [
        {
          label: 'Thresh',
          value: acid.thGridParams.threshold,
          min: 0,
          max: 255,
          onChange: (v) => acid.updateThGridParams({ threshold: v }),
          paramId: 'acid_thgrid.threshold',
        },
        {
          label: 'Grid',
          value: acid.thGridParams.gridSize,
          min: 2,
          max: 16,
          onChange: (v) => acid.updateThGridParams({ gridSize: v }),
          paramId: 'acid_thgrid.gridSize',
        },
      ],
    })
  }

  // Cloud
  if (acid.cloudEnabled) {
    const color = '#f0abfc'
    sections.push({
      id: 'acid_cloud',
      label: 'CLOUD',
      color,
      visualizer: <CloudViz density={acid.cloudParams.density} color={color} />,
      params: [
        {
          label: 'Density',
          value: acid.cloudParams.density / 1000,
          min: 1,
          max: 50,
          onChange: (v) => acid.updateCloudParams({ density: v * 1000 }),
          paramId: 'acid_cloud.density',
        },
        {
          label: 'Depth',
          value: acid.cloudParams.depthScale * 100,
          min: 0,
          max: 100,
          onChange: (v) => acid.updateCloudParams({ depthScale: v / 100 }),
          paramId: 'acid_cloud.depthScale',
        },
      ],
    })
  }

  // LED
  if (acid.ledEnabled) {
    const color = '#c084fc'
    sections.push({
      id: 'acid_led',
      label: 'LED',
      color,
      visualizer: <LedViz pixelSize={acid.ledParams.gridSize} color={color} />,
      params: [
        {
          label: 'Grid',
          value: acid.ledParams.gridSize,
          min: 4,
          max: 16,
          onChange: (v) => acid.updateLedParams({ gridSize: v }),
          paramId: 'acid_led.gridSize',
        },
        {
          label: 'Dot',
          value: acid.ledParams.dotSize * 100,
          min: 30,
          max: 100,
          onChange: (v) => acid.updateLedParams({ dotSize: v / 100 }),
          paramId: 'acid_led.dotSize',
        },
      ],
    })
  }

  // Slit
  if (acid.slitEnabled) {
    const color = '#a78bfa'
    sections.push({
      id: 'acid_slit',
      label: 'SLIT',
      color,
      visualizer: <SlitViz speed={acid.slitParams.speed} color={color} />,
      params: [
        {
          label: 'Speed',
          value: acid.slitParams.speed * 10,
          min: 1,
          max: 50,
          onChange: (v) => acid.updateSlitParams({ speed: v / 10 }),
          paramId: 'acid_slit.speed',
        },
        {
          label: 'Blend',
          value: acid.slitParams.blend * 100,
          min: 0,
          max: 100,
          onChange: (v) => acid.updateSlitParams({ blend: v / 100 }),
          paramId: 'acid_slit.blend',
        },
      ],
    })
  }

  // Voronoi
  if (acid.voronoiEnabled) {
    const color = '#818cf8'
    sections.push({
      id: 'acid_voronoi',
      label: 'VORONOI',
      color,
      visualizer: <VoronoiViz cellCount={acid.voronoiParams.cellCount} color={color} />,
      params: [
        {
          label: 'Cells',
          value: acid.voronoiParams.cellCount,
          min: 16,
          max: 256,
          onChange: (v) => acid.updateVoronoiParams({ cellCount: v }),
          paramId: 'acid_voronoi.cellCount',
        },
        {
          label: 'Edges',
          value: acid.voronoiParams.showEdges ? 1 : 0,
          min: 0,
          max: 1,
          onChange: (v) => acid.updateVoronoiParams({ showEdges: v > 0.5 }),
        },
      ],
    })
  }

  // ═══════════════════════════════════════════════════════════════
  // OVERLAY EFFECTS
  // ═══════════════════════════════════════════════════════════════

  // Texture Overlay
  if (textureOverlay.enabled) {
    sections.push({
      id: 'texture_overlay',
      label: 'TEXTURE',
      color: '#a3a3a3',
      visualizer: <TextureViz opacity={textureOverlay.opacity} blendMode={textureOverlay.blendMode} />,
      params: [
        {
          label: 'Opacity',
          value: textureOverlay.opacity * 100,
          min: 0,
          max: 100,
          onChange: (v) => textureOverlay.setOpacity(v / 100),
          paramId: 'texture_overlay.opacity',
        },
        {
          label: 'Scale',
          value: textureOverlay.scale * 100,
          min: 50,
          max: 300,
          onChange: (v) => textureOverlay.setScale(v / 100),
          paramId: 'texture_overlay.scale',
        },
      ],
    })
  }

  // Data Overlay
  if (dataOverlay.enabled) {
    const templateNames: Record<string, string> = {
      watermark: 'WATERMARK',
      statsBar: 'STATS BAR',
      titleCard: 'TITLE',
      socialCard: 'SOCIAL',
    }
    const visibleFieldCount = dataOverlay.fields.filter(f => f.visible).length

    sections.push({
      id: 'data_overlay',
      label: templateNames[dataOverlay.template] || 'DATA',
      color: '#60a5fa',
      visualizer: <DataViz template={dataOverlay.template} fieldCount={visibleFieldCount} />,
      params: [
        {
          label: 'Size',
          value: dataOverlay.style.fontSize,
          min: 12,
          max: 48,
          onChange: (v) => dataOverlay.setStyle({ fontSize: v }),
          paramId: 'data_overlay.fontSize',
        },
        {
          label: 'Opacity',
          value: dataOverlay.style.opacity * 100,
          min: 0,
          max: 100,
          onChange: (v) => dataOverlay.setStyle({ opacity: v / 100 }),
          paramId: 'data_overlay.opacity',
        },
      ],
    })
  }

  // ═══════════════════════════════════════════════════════════════
  // STRAND EFFECTS
  // ═══════════════════════════════════════════════════════════════

  if (strand.handprintsEnabled) {
    sections.push({
      id: 'strand_handprints',
      label: 'HANDPRINTS',
      color: '#1a1a1a',
      visualizer: <NetworkViz pointRadius={3} maxDistance={0.5} color="#1a1a1a" />,
      params: [
        { label: 'Density', value: strand.handprintsParams.density, min: 1, max: 20, onChange: (v) => strand.updateHandprintsParams({ density: v }), paramId: 'strand_handprints.density' },
        { label: 'Fade', value: strand.handprintsParams.fadeSpeed * 10, min: 1, max: 20, onChange: (v) => strand.updateHandprintsParams({ fadeSpeed: v / 10 }), paramId: 'strand_handprints.fadeSpeed' },
      ],
    })
  }

  if (strand.tarSpreadEnabled) {
    sections.push({
      id: 'strand_tar',
      label: 'TAR',
      color: '#ff6b35',
      visualizer: <NoiseViz amount={strand.tarSpreadParams.coverage} speed={1} color="#ff6b35" />,
      params: [
        { label: 'Speed', value: strand.tarSpreadParams.spreadSpeed * 100, min: 0, max: 100, onChange: (v) => strand.updateTarSpreadParams({ spreadSpeed: v / 100 }), paramId: 'strand_tar.spreadSpeed' },
        { label: 'Coverage', value: strand.tarSpreadParams.coverage * 100, min: 0, max: 100, onChange: (v) => strand.updateTarSpreadParams({ coverage: v / 100 }), paramId: 'strand_tar.coverage' },
      ],
    })
  }

  if (strand.timefallEnabled) {
    sections.push({
      id: 'strand_timefall',
      label: 'TIMEFALL',
      color: '#4a5568',
      visualizer: <ScanLinesViz lineCount={strand.timefallParams.streakCount} opacity={0.5} color="#4a5568" />,
      params: [
        { label: 'Intensity', value: strand.timefallParams.intensity * 100, min: 0, max: 100, onChange: (v) => strand.updateTimefallParams({ intensity: v / 100 }), paramId: 'strand_timefall.intensity' },
        { label: 'Streaks', value: strand.timefallParams.streakCount, min: 10, max: 200, onChange: (v) => strand.updateTimefallParams({ streakCount: v }), paramId: 'strand_timefall.streakCount' },
      ],
    })
  }

  if (strand.voidOutEnabled) {
    sections.push({
      id: 'strand_voidout',
      label: 'VOID OUT',
      color: '#ff6b35',
      visualizer: <LensViz curvature={strand.voidOutParams.distortAmount} color="#ff6b35" />,
      params: [
        { label: 'Speed', value: strand.voidOutParams.speed * 100, min: 0, max: 100, onChange: (v) => strand.updateVoidOutParams({ speed: v / 100 }), paramId: 'strand_voidout.speed' },
        { label: 'Distort', value: strand.voidOutParams.distortAmount * 100, min: 0, max: 100, onChange: (v) => strand.updateVoidOutParams({ distortAmount: v / 100 }), paramId: 'strand_voidout.distortAmount' },
      ],
    })
  }

  if (strand.strandWebEnabled) {
    sections.push({
      id: 'strand_web',
      label: 'STRAND WEB',
      color: '#00d4ff',
      visualizer: <NetworkViz pointRadius={2} maxDistance={strand.strandWebParams.threshold} color="#00d4ff" />,
      params: [
        { label: 'Threshold', value: strand.strandWebParams.threshold * 100, min: 0, max: 100, onChange: (v) => strand.updateStrandWebParams({ threshold: v / 100 }), paramId: 'strand_web.threshold' },
        { label: 'Glow', value: strand.strandWebParams.glowIntensity * 100, min: 0, max: 100, onChange: (v) => strand.updateStrandWebParams({ glowIntensity: v / 100 }), paramId: 'strand_web.glowIntensity' },
      ],
    })
  }

  if (strand.bridgeLinkEnabled) {
    sections.push({
      id: 'strand_bridge',
      label: 'BRIDGE',
      color: '#00d4ff',
      visualizer: <PixelateViz pixelSize={strand.bridgeLinkParams.gridSize} color="#00d4ff" />,
      params: [
        { label: 'Grid', value: strand.bridgeLinkParams.gridSize, min: 8, max: 64, onChange: (v) => strand.updateBridgeLinkParams({ gridSize: v }), paramId: 'strand_bridge.gridSize' },
        { label: 'Edge', value: strand.bridgeLinkParams.edgeSensitivity * 100, min: 0, max: 100, onChange: (v) => strand.updateBridgeLinkParams({ edgeSensitivity: v / 100 }), paramId: 'strand_bridge.edgeSensitivity' },
      ],
    })
  }

  if (strand.chiralPathEnabled) {
    sections.push({
      id: 'strand_path',
      label: 'CHIRAL PATH',
      color: '#00d4ff',
      visualizer: <CloudViz density={strand.chiralPathParams.particleCount / 200} color="#00d4ff" />,
      params: [
        { label: 'Particles', value: strand.chiralPathParams.particleCount, min: 10, max: 200, onChange: (v) => strand.updateChiralPathParams({ particleCount: v }), paramId: 'strand_path.particleCount' },
        { label: 'Trail', value: strand.chiralPathParams.trailLength, min: 5, max: 50, onChange: (v) => strand.updateChiralPathParams({ trailLength: v }), paramId: 'strand_path.trailLength' },
      ],
    })
  }

  if (strand.umbilicalEnabled) {
    sections.push({
      id: 'strand_umbilical',
      label: 'UMBILICAL',
      color: '#00d4ff',
      visualizer: <SlitViz speed={strand.umbilicalParams.pulseSpeed} color="#00d4ff" />,
      params: [
        { label: 'Tendrils', value: strand.umbilicalParams.tendrilCount, min: 2, max: 12, onChange: (v) => strand.updateUmbilicalParams({ tendrilCount: v }), paramId: 'strand_umbilical.tendrilCount' },
        { label: 'Reach', value: strand.umbilicalParams.reachDistance * 100, min: 10, max: 100, onChange: (v) => strand.updateUmbilicalParams({ reachDistance: v / 100 }), paramId: 'strand_umbilical.reachDistance' },
      ],
    })
  }

  if (strand.odradekEnabled) {
    sections.push({
      id: 'strand_odradek',
      label: 'ODRADEK',
      color: '#ffd700',
      visualizer: <EdgeViz threshold={strand.odradekParams.sweepSpeed} mix={0.5} color="#ffd700" />,
      params: [
        { label: 'Sweep', value: strand.odradekParams.sweepSpeed * 100, min: 0, max: 100, onChange: (v) => strand.updateOdradekParams({ sweepSpeed: v / 100 }), paramId: 'strand_odradek.sweepSpeed' },
        { label: 'Ping', value: strand.odradekParams.pingIntensity * 100, min: 0, max: 100, onChange: (v) => strand.updateOdradekParams({ pingIntensity: v / 100 }), paramId: 'strand_odradek.pingIntensity' },
      ],
    })
  }

  if (strand.chiraliumEnabled) {
    sections.push({
      id: 'strand_chiralium',
      label: 'CHIRALIUM',
      color: '#ffd700',
      visualizer: <DitherViz intensity={strand.chiraliumParams.density} color="#ffd700" />,
      params: [
        { label: 'Threshold', value: strand.chiraliumParams.threshold * 100, min: 0, max: 100, onChange: (v) => strand.updateChiraliumParams({ threshold: v / 100 }), paramId: 'strand_chiralium.threshold' },
        { label: 'Density', value: strand.chiraliumParams.density * 100, min: 0, max: 100, onChange: (v) => strand.updateChiraliumParams({ density: v / 100 }), paramId: 'strand_chiralium.density' },
      ],
    })
  }

  if (strand.beachStaticEnabled) {
    sections.push({
      id: 'strand_beach',
      label: 'BEACH',
      color: '#ffd700',
      visualizer: <NoiseViz amount={strand.beachStaticParams.grainAmount} speed={1} color="#ffd700" />,
      params: [
        { label: 'Grain', value: strand.beachStaticParams.grainAmount * 100, min: 0, max: 100, onChange: (v) => strand.updateBeachStaticParams({ grainAmount: v / 100 }), paramId: 'strand_beach.grainAmount' },
        { label: 'Flicker', value: strand.beachStaticParams.flickerSpeed * 100, min: 0, max: 100, onChange: (v) => strand.updateBeachStaticParams({ flickerSpeed: v / 100 }), paramId: 'strand_beach.flickerSpeed' },
      ],
    })
  }

  if (strand.doomsEnabled) {
    sections.push({
      id: 'strand_dooms',
      label: 'DOOMS',
      color: '#ffd700',
      visualizer: <LensViz curvature={strand.doomsParams.haloSize} color="#ffd700" />,
      params: [
        { label: 'Halo', value: strand.doomsParams.haloSize * 100, min: 0, max: 100, onChange: (v) => strand.updateDoomsParams({ haloSize: v / 100 }), paramId: 'strand_dooms.haloSize' },
        { label: 'Pulse', value: strand.doomsParams.pulseSpeed * 100, min: 0, max: 100, onChange: (v) => strand.updateDoomsParams({ pulseSpeed: v / 100 }), paramId: 'strand_dooms.pulseSpeed' },
      ],
    })
  }

  if (strand.chiralCloudEnabled) {
    sections.push({
      id: 'strand_cloud',
      label: 'CHIRAL CLOUD',
      color: '#7b68ee',
      visualizer: <CloudViz density={strand.chiralCloudParams.density} color="#7b68ee" />,
      params: [
        { label: 'Density', value: strand.chiralCloudParams.density * 100, min: 0, max: 100, onChange: (v) => strand.updateChiralCloudParams({ density: v / 100 }), paramId: 'strand_cloud.density' },
        { label: 'Response', value: strand.chiralCloudParams.responsiveness * 100, min: 0, max: 100, onChange: (v) => strand.updateChiralCloudParams({ responsiveness: v / 100 }), paramId: 'strand_cloud.responsiveness' },
      ],
    })
  }

  if (strand.bbPodEnabled) {
    sections.push({
      id: 'strand_bbpod',
      label: 'BB POD',
      color: '#7b68ee',
      visualizer: <LensViz curvature={strand.bbPodParams.vignetteSize} color="#7b68ee" />,
      params: [
        { label: 'Vignette', value: strand.bbPodParams.vignetteSize * 100, min: 0, max: 100, onChange: (v) => strand.updateBBPodParams({ vignetteSize: v / 100 }), paramId: 'strand_bbpod.vignetteSize' },
        { label: 'Tint', value: strand.bbPodParams.tintStrength * 100, min: 0, max: 100, onChange: (v) => strand.updateBBPodParams({ tintStrength: v / 100 }), paramId: 'strand_bbpod.tintStrength' },
      ],
    })
  }

  if (strand.seamEnabled) {
    sections.push({
      id: 'strand_seam',
      label: 'SEAM',
      color: '#7b68ee',
      visualizer: <BlockDisplaceViz amount={strand.seamParams.riftWidth} seed={0} color="#7b68ee" />,
      params: [
        { label: 'Width', value: strand.seamParams.riftWidth * 100, min: 0, max: 100, onChange: (v) => strand.updateSeamParams({ riftWidth: v / 100 }), paramId: 'strand_seam.riftWidth' },
        { label: 'Parallax', value: strand.seamParams.parallaxAmount * 100, min: 0, max: 100, onChange: (v) => strand.updateSeamParams({ parallaxAmount: v / 100 }), paramId: 'strand_seam.parallaxAmount' },
      ],
    })
  }

  if (strand.extinctionEnabled) {
    sections.push({
      id: 'strand_extinction',
      label: 'EXTINCTION',
      color: '#7b68ee',
      visualizer: <StaticDisplaceViz intensity={strand.extinctionParams.coverage} color="#7b68ee" />,
      params: [
        { label: 'Speed', value: strand.extinctionParams.erosionSpeed * 100, min: 0, max: 100, onChange: (v) => strand.updateExtinctionParams({ erosionSpeed: v / 100 }), paramId: 'strand_extinction.erosionSpeed' },
        { label: 'Coverage', value: strand.extinctionParams.coverage * 100, min: 0, max: 100, onChange: (v) => strand.updateExtinctionParams({ coverage: v / 100 }), paramId: 'strand_extinction.coverage' },
      ],
    })
  }

  const { selectedEffectId, setSelectedEffect, sequencerDrag } = useUIStore()
  const { effectOrder, reorderEffect } = useRoutingStore()
  const { addRouting } = useSequencerStore()

  // Keyboard shortcut: 0 key toggles bypass on selected effect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === '0' && selectedEffectId) {
        toggleEffectBypassed(selectedEffectId)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedEffectId, toggleEffectBypassed])

  // Track which card is being hovered during sequencer drag
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)

  // Function to disable an effect by ID
  const disableEffect = useCallback((effectId: string) => {
    switch (effectId) {
      case 'rgb_split':
        glitch.setRGBSplitEnabled(false)
        break
      case 'block_displace':
        glitch.setBlockDisplaceEnabled(false)
        break
      case 'scan_lines':
        glitch.setScanLinesEnabled(false)
        break
      case 'noise':
        glitch.setNoiseEnabled(false)
        break
      case 'pixelate':
        glitch.setPixelateEnabled(false)
        break
      case 'edges':
        glitch.setEdgeDetectionEnabled(false)
        break
      case 'chromatic':
        glitch.setChromaticAberrationEnabled(false)
        break
      case 'vhs':
        glitch.setVHSTrackingEnabled(false)
        break
      case 'lens':
        glitch.setLensDistortionEnabled(false)
        break
      case 'dither':
        glitch.setDitherEnabled(false)
        break
      case 'posterize':
        glitch.setPosterizeEnabled(false)
        break
      case 'static_displace':
        glitch.setStaticDisplacementEnabled(false)
        break
      case 'color_grade':
        glitch.setColorGradeEnabled(false)
        break
      case 'feedback':
        glitch.setFeedbackLoopEnabled(false)
        break
      case 'ascii':
        ascii.setEnabled(false)
        break
      case 'stipple':
        stipple.setEnabled(false)
        break
      case 'contour':
        contour.setEnabled(false)
        break
      case 'landmarks':
        landmarks.setEnabled(false)
        landmarks.setCurrentMode('off')
        break
      // Acid effects
      case 'acid_dots':
        acid.setDotsEnabled(false)
        break
      case 'acid_glyph':
        acid.setGlyphEnabled(false)
        break
      case 'acid_icons':
        acid.setIconsEnabled(false)
        break
      case 'acid_contour':
        acid.setContourEnabled(false)
        break
      case 'acid_decomp':
        acid.setDecompEnabled(false)
        break
      case 'acid_mirror':
        acid.setMirrorEnabled(false)
        break
      case 'acid_slice':
        acid.setSliceEnabled(false)
        break
      case 'acid_thgrid':
        acid.setThGridEnabled(false)
        break
      case 'acid_cloud':
        acid.setCloudEnabled(false)
        break
      case 'acid_led':
        acid.setLedEnabled(false)
        break
      case 'acid_slit':
        acid.setSlitEnabled(false)
        break
      case 'acid_voronoi':
        acid.setVoronoiEnabled(false)
        break
      // Vision tracking effects
      case 'track_bright':
        vision.setBrightEnabled(false)
        break
      case 'track_edge':
        vision.setEdgeEnabled(false)
        break
      case 'track_color':
        vision.setColorEnabled(false)
        break
      case 'track_motion':
        vision.setMotionEnabled(false)
        break
      case 'track_face':
        vision.setFaceEnabled(false)
        break
      case 'track_hands':
        vision.setHandsEnabled(false)
        break
      // Overlay effects
      case 'texture_overlay':
        textureOverlay.setEnabled(false)
        break
      case 'data_overlay':
        dataOverlay.setEnabled(false)
        break
      // Strand effects
      case 'strand_handprints':
        strand.setHandprintsEnabled(false)
        break
      case 'strand_tar':
        strand.setTarSpreadEnabled(false)
        break
      case 'strand_timefall':
        strand.setTimefallEnabled(false)
        break
      case 'strand_voidout':
        strand.setVoidOutEnabled(false)
        break
      case 'strand_web':
        strand.setStrandWebEnabled(false)
        break
      case 'strand_bridge':
        strand.setBridgeLinkEnabled(false)
        break
      case 'strand_path':
        strand.setChiralPathEnabled(false)
        break
      case 'strand_umbilical':
        strand.setUmbilicalEnabled(false)
        break
      case 'strand_odradek':
        strand.setOdradekEnabled(false)
        break
      case 'strand_chiralium':
        strand.setChiraliumEnabled(false)
        break
      case 'strand_beach':
        strand.setBeachStaticEnabled(false)
        break
      case 'strand_dooms':
        strand.setDoomsEnabled(false)
        break
      case 'strand_cloud':
        strand.setChiralCloudEnabled(false)
        break
      case 'strand_bbpod':
        strand.setBBPodEnabled(false)
        break
      case 'strand_seam':
        strand.setSeamEnabled(false)
        break
      case 'strand_extinction':
        strand.setExtinctionEnabled(false)
        break
    }
    // Clear selection if this effect was selected
    if (selectedEffectId === effectId) {
      setSelectedEffect(null)
    }
  }, [glitch, ascii, stipple, contour, landmarks, acid, vision, textureOverlay, dataOverlay, strand, selectedEffectId, setSelectedEffect])

  // Sort sections by effectOrder
  // Effects not in effectOrder get sorted to the end (using Infinity for missing indices)
  const sortedSections = [...sections].sort((a, b) => {
    const aIndex = effectOrder.indexOf(a.id)
    const bIndex = effectOrder.indexOf(b.id)
    // If not in effectOrder, sort to end
    const aPos = aIndex === -1 ? Infinity : aIndex
    const bPos = bIndex === -1 ? Infinity : bIndex
    return aPos - bPos
  })

  // Drag state
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const dragStartX = useRef<number>(0)
  const dragStartTime = useRef<number>(0)
  const isDragging = useRef(false)

  const handlePointerDown = useCallback((e: React.PointerEvent, _index: number) => {
    dragStartX.current = e.clientX
    dragStartTime.current = Date.now()
    isDragging.current = false
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent, index: number) => {
    const deltaX = Math.abs(e.clientX - dragStartX.current)
    const elapsed = Date.now() - dragStartTime.current

    // Start drag after 150ms hold or 10px movement
    if (!isDragging.current && (elapsed > 150 || deltaX > 10)) {
      isDragging.current = true
      setDragIndex(index)
    }

    if (isDragging.current) {
      // Find which card we're over based on x position
      const container = (e.currentTarget as HTMLElement).parentElement
      if (container) {
        const cards = Array.from(container.children) as HTMLElement[]
        for (let i = 0; i < cards.length; i++) {
          const rect = cards[i].getBoundingClientRect()
          const midX = rect.left + rect.width / 2
          if (e.clientX < midX) {
            setDragOverIndex(i)
            return
          }
        }
        setDragOverIndex(cards.length)
      }
    }
  }, [])

  const handlePointerUp = useCallback((e: React.PointerEvent, index: number) => {
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {}

    if (isDragging.current && dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      // Get the effect IDs from the sorted visible sections
      const fromEffectId = sortedSections[dragIndex].id
      const fromOrderIndex = effectOrder.indexOf(fromEffectId)

      // For the target, we need to figure out where in effectOrder to insert
      let toOrderIndex: number
      if (dragOverIndex >= sortedSections.length) {
        // Dropping at the end - put after the last visible effect
        toOrderIndex = effectOrder.indexOf(sortedSections[sortedSections.length - 1].id) + 1
      } else if (dragOverIndex === 0) {
        // Dropping at the start - put before the first visible effect
        toOrderIndex = effectOrder.indexOf(sortedSections[0].id)
      } else {
        // Dropping in the middle - put at the position of the target effect
        toOrderIndex = effectOrder.indexOf(sortedSections[dragOverIndex].id)
      }

      // Only reorder if actually moving to a different position
      if (fromOrderIndex !== -1 && toOrderIndex !== -1 && fromOrderIndex !== toOrderIndex) {
        reorderEffect(fromOrderIndex, toOrderIndex)
      }
    } else if (!isDragging.current) {
      // It was a click, select the effect
      setSelectedEffect(sortedSections[index].id)
    }

    setDragIndex(null)
    setDragOverIndex(null)
    isDragging.current = false
  }, [dragIndex, dragOverIndex, effectOrder, reorderEffect, setSelectedEffect, sortedSections])

  // Control buttons component (compact horizontal layout)
  const ControlButtons = () => (
    <div
      className="flex gap-2 rounded-lg items-center"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        padding: '8px 12px',
        flexShrink: 0,
      }}
    >
      <button
        onClick={handleClear}
        className="px-3 py-1.5 rounded text-[11px] font-medium transition-colors active:scale-95"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          color: 'var(--text-muted)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--border)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}
      >
        Clear
      </button>
      <button
        onClick={() => {
          const current = useGlitchEngineStore.getState().bypassActive
          useGlitchEngineStore.getState().setBypassActive(!current)
        }}
        onMouseEnter={(e) => !bypassActive && (e.currentTarget.style.backgroundColor = 'var(--border)')}
        onMouseLeave={(e) => !bypassActive && (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}
        className="px-3 py-1.5 rounded text-[11px] font-medium transition-all select-none active:scale-95"
        style={{
          backgroundColor: bypassActive ? '#ef4444' : 'var(--bg-surface)',
          border: bypassActive ? '1px solid #ef4444' : '1px solid var(--border)',
          boxShadow: bypassActive ? '0 0 12px #ef4444' : 'none',
          color: bypassActive ? 'var(--bg-surface)' : 'var(--text-muted)',
        }}
      >
        Bypass
      </button>
    </div>
  )

  if (sortedSections.length === 0) {
    return (
      <div
        className="h-full flex items-stretch gap-3 px-4 py-2"
      >
        <ControlButtons />
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[13px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            No active effects — drag to reorder
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      className="h-full flex items-stretch gap-3 overflow-x-auto px-4 py-2"
    >
      <ControlButtons />
      {sortedSections.map((section, index) => {
        const isBeingDragged = dragIndex === index
        const isDropTarget = dragOverIndex === index && dragIndex !== null && dragIndex !== index
        const isBypassed = effectBypassed[section.id] || false
        const isSoloed = soloEffectId === section.id
        const isMuted = isSoloing && !isSoloed
        const displayColor = isBypassed || isMuted ? 'var(--text-muted)' : section.color

        // Calculate backlit shadow for soloed card
        const getSoloShadow = () => {
          if (!isSoloed) return ''
          const shadowOpacity = soloLatched && !flashOn ? 0.2 : 0.6
          return `0 0 20px rgba(${hexToRgb(section.color)}, ${shadowOpacity}), 0 0 40px rgba(${hexToRgb(section.color)}, ${shadowOpacity * 0.5})`
        }

        // Border color - keep consistent
        const borderColor = isBeingDragged ? displayColor : 'var(--border)'

        // Selection glow as box-shadow instead of border change
        const isSelected = selectedEffectId === section.id && !isBypassed
        const selectionShadow = isSelected ? `inset 0 0 0 2px ${section.color}40` : ''

        const soloShadow = getSoloShadow()

        // Get primary value from params
        const primaryParam = section.params[0]
        const primaryValue = primaryParam ? Math.round(primaryParam.value) : 0

        // Check if this card is a sequencer drop target
        const isSequencerDropTarget = dropTargetId === section.id && sequencerDrag.isDragging

        return (
          <div
            key={section.id}
            onPointerDown={(e) => handlePointerDown(e, index)}
            onPointerMove={(e) => handlePointerMove(e, index)}
            onPointerUp={(e) => handlePointerUp(e, index)}
            onDoubleClick={() => toggleEffectBypassed(section.id)}
            onDragOver={(e) => {
              if (sequencerDrag.isDragging) {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'link'
                setDropTargetId(section.id)
              }
            }}
            onDragLeave={() => {
              if (sequencerDrag.isDragging) {
                setDropTargetId(null)
              }
            }}
            onDrop={(e) => {
              e.preventDefault()
              const trackId = e.dataTransfer.getData('sequencer-track')
              if (trackId && section.params[0]) {
                const targetParam = section.params[0].paramId || `${section.id}.${section.params[0].label.toLowerCase()}`
                addRouting(trackId, targetParam, 0.5)
              }
              setDropTargetId(null)
            }}
            className="flex-shrink-0 flex items-center gap-2 select-none touch-none cursor-grab active:cursor-grabbing group rounded-lg"
            style={{
              backgroundColor: isBypassed ? 'var(--border)' : isSequencerDropTarget ? '#f0fff0' : 'var(--bg-surface)',
              border: `1px solid ${isSequencerDropTarget ? sequencerDrag.trackColor || '#4ade80' : borderColor}`,
              boxShadow: isSequencerDropTarget
                ? `0 0 12px ${sequencerDrag.trackColor || '#4ade80'}40`
                : [selectionShadow, soloShadow].filter(Boolean).join(', ') || 'none',
              padding: '8px 10px',
              transform: isBeingDragged ? 'scale(1.03)' : isSequencerDropTarget ? 'scale(1.02)' : 'scale(1)',
              opacity: isBypassed ? 0.6 : isMuted ? 0.5 : isBeingDragged ? 0.9 : 1,
              zIndex: isBeingDragged ? 10 : 1,
              marginLeft: isDropTarget ? '60px' : '0',
              transition: 'border-color 0.15s ease-out, box-shadow 0.15s ease-out, transform 0.15s ease-out, opacity 0.15s ease-out, margin-left 0.15s ease-out, background-color 0.15s ease-out',
            }}
          >
            {/* LED indicator */}
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{
                backgroundColor: isBypassed || isMuted ? 'var(--border)' : displayColor,
                boxShadow: isBypassed || isMuted ? 'none' : `0 0 6px ${section.color}`,
              }}
            />

            {/* Label */}
            <span
              className="text-[11px] tracking-wider uppercase flex-shrink-0"
              style={{
                color: isBypassed || isMuted ? 'var(--text-muted)' : 'var(--text-secondary)',
                fontFamily: "'JetBrains Mono', monospace",
                minWidth: '50px',
              }}
            >
              {section.label}
            </span>

            {/* Mini visualizer */}
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: '#000',
                border: '1px solid var(--text-primary)',
                borderRadius: '2px',
                width: '32px',
                height: '32px',
                overflow: 'hidden',
              }}
            >
              <div style={{ transform: 'scale(0.5)', transformOrigin: 'center' }}>
                {section.visualizer}
              </div>
            </div>

            {/* Value display */}
            <div className="flex items-baseline gap-1 flex-shrink-0">
              <span
                className="font-bold text-[16px]"
                style={{
                  color: isBypassed || isMuted ? 'var(--text-muted)' : displayColor,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {primaryValue}
              </span>
              <span
                className="text-[9px]"
                style={{
                  color: 'var(--text-muted)',
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {primaryParam?.label.toLowerCase()}
              </span>
            </div>

            {/* Routing indicators */}
            <div className="flex-shrink-0">
              <RoutingIndicators effectId={section.id} />
            </div>

            {/* Close button */}
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => {
                e.stopPropagation()
                disableEffect(section.id)
              }}
              className="flex items-center justify-center flex-shrink-0 opacity-30 hover:opacity-100 transition-opacity"
              style={{ width: '16px', height: '16px' }}
            >
              <div
                style={{
                  width: '8px',
                  height: '1.5px',
                  backgroundColor: 'var(--text-muted)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f44')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--text-muted)')}
              />
            </button>
          </div>
        )
      })}
    </div>
  )
}
