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
} from './visualizers'

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
  }[]
}

export function ParameterPanel() {
  const glitch = useGlitchEngineStore()
  const { effectBypassed, toggleEffectBypassed, soloEffectId, soloLatched, bypassActive, setBypassActive } = useGlitchEngineStore()

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
  }, [glitch, ascii, stipple, contour, landmarks])

  // Bypass handlers
  const handleBypassDown = useCallback(() => {
    setBypassActive(true)
  }, [setBypassActive])

  const handleBypassUp = useCallback(() => {
    setBypassActive(false)
  }, [setBypassActive])

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
    }
    // Clear selection if this effect was selected
    if (selectedEffectId === effectId) {
      setSelectedEffect(null)
    }
  }, [glitch, ascii, stipple, contour, landmarks, selectedEffectId, setSelectedEffect])

  // Sort sections by effectOrder
  const sortedSections = [...sections].sort((a, b) => {
    const aIndex = effectOrder.indexOf(a.id)
    const bIndex = effectOrder.indexOf(b.id)
    return aIndex - bIndex
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

      // Only adjust if we're actually moving the item (not just hovering)
      if (fromOrderIndex !== toOrderIndex && fromOrderIndex !== toOrderIndex - 1) {
        // If moving forward in the array, account for the removal
        if (fromOrderIndex < toOrderIndex) {
          toOrderIndex--
        }
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

  // Control buttons component (reused in both views)
  const ControlButtons = () => (
    <div
      className="flex flex-col gap-2 rounded-lg"
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #d0d0d0',
        padding: '10px',
        width: 'calc((100vw / 3 - 32px) / 4)',
        flexShrink: 0,
      }}
    >
      <button
        onClick={handleClear}
        className="flex-1 w-full rounded text-[11px] font-medium transition-colors active:scale-95"
        style={{
          backgroundColor: '#f5f5f5',
          border: '1px solid #d0d0d0',
          color: '#666666',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e8e8e8')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f5f5f5')}
        onPointerDown={(e) => (e.currentTarget.style.backgroundColor = '#d8d8d8')}
        onPointerUp={(e) => (e.currentTarget.style.backgroundColor = '#e8e8e8')}
      >
        Clear
      </button>
      <button
        onMouseEnter={(e) => !bypassActive && (e.currentTarget.style.backgroundColor = '#e8e8e8')}
        onMouseLeave={(e) => !bypassActive && (e.currentTarget.style.backgroundColor = '#f5f5f5')}
        onPointerDown={(e) => {
          handleBypassDown()
          if (!bypassActive) e.currentTarget.style.backgroundColor = '#d8d8d8'
        }}
        onPointerUp={(e) => {
          handleBypassUp()
          e.currentTarget.style.backgroundColor = '#f5f5f5'
        }}
        onPointerLeave={(e) => {
          handleBypassUp()
          e.currentTarget.style.backgroundColor = '#f5f5f5'
        }}
        onPointerCancel={handleBypassUp}
        className="flex-1 w-full rounded text-[11px] font-medium transition-all select-none touch-none active:scale-95"
        style={{
          backgroundColor: bypassActive ? '#ef4444' : '#f5f5f5',
          border: bypassActive ? '1px solid #ef4444' : '1px solid #d0d0d0',
          boxShadow: bypassActive ? '0 0 12px #ef4444' : 'none',
          color: bypassActive ? '#ffffff' : '#666666',
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
          <span className="text-[10px] text-[#999999] uppercase tracking-wider">
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
        const displayColor = isBypassed || isMuted ? '#999999' : section.color

        // Calculate backlit shadow for soloed card
        const getSoloShadow = () => {
          if (!isSoloed) return ''
          const shadowOpacity = soloLatched && !flashOn ? 0.2 : 0.6
          return `0 0 20px rgba(${hexToRgb(section.color)}, ${shadowOpacity}), 0 0 40px rgba(${hexToRgb(section.color)}, ${shadowOpacity * 0.5})`
        }

        // Border color - keep consistent
        const borderColor = isBeingDragged ? displayColor : '#d0d0d0'

        // Selection glow as box-shadow instead of border change
        const isSelected = selectedEffectId === section.id && !isBypassed
        const selectionShadow = isSelected ? `inset 0 0 0 2px ${section.color}40` : ''

        const soloShadow = getSoloShadow()

        // Get primary and secondary values from params
        const primaryParam = section.params[0]
        const secondaryParam = section.params[1]
        const primaryValue = primaryParam ? Math.round(primaryParam.value) : 0
        const secondaryValue = secondaryParam
          ? `${secondaryParam.label.toLowerCase()}: ${Math.round(secondaryParam.value)}`
          : null

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
                // Create routing to primary parameter
                const targetParam = `${section.id}.${section.params[0].label.toLowerCase()}`
                addRouting(trackId, targetParam, 0.5)
              }
              setDropTargetId(null)
            }}
            className="flex-shrink-0 flex flex-col select-none touch-none cursor-grab active:cursor-grabbing group rounded-lg"
            style={{
              backgroundColor: isBypassed ? '#e5e5e5' : isSequencerDropTarget ? '#f0fff0' : '#ffffff',
              border: `1px solid ${isSequencerDropTarget ? sequencerDrag.trackColor || '#4ade80' : borderColor}`,
              boxShadow: isSequencerDropTarget
                ? `0 0 12px ${sequencerDrag.trackColor || '#4ade80'}40`
                : [selectionShadow, soloShadow].filter(Boolean).join(', ') || 'none',
              minWidth: '120px',
              padding: '10px',
              transform: isBeingDragged ? 'scale(1.03)' : isSequencerDropTarget ? 'scale(1.02)' : 'scale(1)',
              opacity: isBypassed ? 0.6 : isMuted ? 0.5 : isBeingDragged ? 0.9 : 1,
              zIndex: isBeingDragged ? 10 : 1,
              marginLeft: isDropTarget ? '60px' : '0',
              transition: 'border-color 0.15s ease-out, box-shadow 0.15s ease-out, transform 0.15s ease-out, opacity 0.15s ease-out, margin-left 0.15s ease-out, background-color 0.15s ease-out',
            }}
          >
            {/* Header row: LED, label, routing indicators, close button */}
            <div className="flex items-center gap-1.5 mb-2">
              <div
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: isBypassed || isMuted ? '#bbb' : displayColor,
                  boxShadow: isBypassed || isMuted ? 'none' : `0 0 6px ${section.color}`,
                }}
              />
              <span
                className="text-[8px] tracking-widest uppercase"
                style={{
                  color: isBypassed || isMuted ? '#999' : '#666',
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {section.label}
              </span>
              {/* Routing indicators with click-to-edit */}
              <div className="ml-auto mr-2">
                <RoutingIndicators effectId={section.id} />
              </div>
              {/* Close button - line style */}
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => {
                  e.stopPropagation()
                  disableEffect(section.id)
                }}
                className="ml-auto flex items-center justify-center transition-all"
                style={{ width: '20px', height: '20px' }}
              >
                <div
                  className="transition-all group-hover:opacity-100"
                  style={{
                    width: '10px',
                    height: '1.5px',
                    backgroundColor: '#999',
                    opacity: 0.3,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.width = '14px'
                    e.currentTarget.style.backgroundColor = '#f44'
                    e.currentTarget.style.opacity = '1'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.width = '10px'
                    e.currentTarget.style.backgroundColor = '#999'
                    e.currentTarget.style.opacity = '0.3'
                  }}
                />
              </button>
            </div>

            {/* Inset OLED screen - visualizer */}
            <div
              className="flex items-center justify-center"
              style={{
                backgroundColor: '#000',
                border: '1px solid #333',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)',
                borderRadius: '2px',
                minHeight: '50px',
                margin: '0 -2px',
                padding: '1px',
              }}
            >
              {section.visualizer}
            </div>

            {/* Numeric readouts */}
            <div className="mt-2 flex-1 flex flex-col justify-end">
              {/* Primary value - large, accent color */}
              <div
                className="font-bold"
                style={{
                  fontSize: '24px',
                  lineHeight: 1,
                  color: isBypassed || isMuted ? '#bbb' : displayColor,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {primaryValue}
              </div>
              {/* Secondary param - small, gray (always reserve space) */}
              <div
                style={{
                  fontSize: '9px',
                  color: '#555',
                  fontFamily: "'JetBrains Mono', monospace",
                  marginTop: '2px',
                  minHeight: '12px',
                }}
              >
                {secondaryValue || '\u00A0'}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
