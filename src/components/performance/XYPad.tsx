import { useRef, useState, useCallback, useEffect } from 'react'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { useAsciiRenderStore } from '../../stores/asciiRenderStore'
import { useStippleStore } from '../../stores/stippleStore'
import { useAcidStore } from '../../stores/acidStore'
import { useVisionTrackingStore } from '../../stores/visionTrackingStore'
import { useUIStore } from '../../stores/uiStore'

interface XYPosition {
  x: number
  y: number
}

// All available parameters that can be mapped to X/Y
interface ParamConfig {
  id: string
  label: string
  group: string
  range: [number, number]
  step?: number
}

const AVAILABLE_PARAMS: ParamConfig[] = [
  // RGB Split
  { id: 'rgb_split.amount', label: 'RGB Amount', group: 'RGB Split', range: [0, 2] },
  { id: 'rgb_split.redOffsetX', label: 'Red X', group: 'RGB Split', range: [-0.05, 0.05] },
  { id: 'rgb_split.redOffsetY', label: 'Red Y', group: 'RGB Split', range: [-0.05, 0.05] },
  { id: 'rgb_split.greenOffsetX', label: 'Green X', group: 'RGB Split', range: [-0.05, 0.05] },
  { id: 'rgb_split.greenOffsetY', label: 'Green Y', group: 'RGB Split', range: [-0.05, 0.05] },
  { id: 'rgb_split.blueOffsetX', label: 'Blue X', group: 'RGB Split', range: [-0.05, 0.05] },
  { id: 'rgb_split.blueOffsetY', label: 'Blue Y', group: 'RGB Split', range: [-0.05, 0.05] },

  // Block Displace
  { id: 'block_displace.blockSize', label: 'Block Size', group: 'Block', range: [0.01, 0.2] },
  { id: 'block_displace.displaceChance', label: 'Chance', group: 'Block', range: [0, 1] },
  { id: 'block_displace.displaceDistance', label: 'Distance', group: 'Block', range: [0, 0.1] },
  { id: 'block_displace.seed', label: 'Seed', group: 'Block', range: [0, 1000], step: 1 },

  // Scan Lines
  { id: 'scan_lines.lineCount', label: 'Line Count', group: 'Scan Lines', range: [50, 500], step: 10 },
  { id: 'scan_lines.lineOpacity', label: 'Opacity', group: 'Scan Lines', range: [0, 1] },
  { id: 'scan_lines.lineFlicker', label: 'Flicker', group: 'Scan Lines', range: [0, 1] },

  // Noise
  { id: 'noise.amount', label: 'Noise Amount', group: 'Noise', range: [0, 1] },
  { id: 'noise.speed', label: 'Noise Speed', group: 'Noise', range: [1, 50], step: 1 },

  // Pixelate
  { id: 'pixelate.pixelSize', label: 'Pixel Size', group: 'Pixelate', range: [2, 32], step: 1 },

  // Edges
  { id: 'edges.threshold', label: 'Edge Threshold', group: 'Edges', range: [0, 1] },
  { id: 'edges.mixAmount', label: 'Edge Mix', group: 'Edges', range: [0, 1] },

  // ASCII
  { id: 'ascii.fontSize', label: 'ASCII Size', group: 'ASCII', range: [4, 20], step: 1 },
  { id: 'ascii.resolution', label: 'ASCII Res', group: 'ASCII', range: [4, 16], step: 1 },
  { id: 'ascii.contrast', label: 'ASCII Contrast', group: 'ASCII', range: [0.5, 2] },

  // Stipple
  { id: 'stipple.particleSize', label: 'Stipple Size', group: 'Stipple', range: [1, 8] },
  { id: 'stipple.density', label: 'Stipple Density', group: 'Stipple', range: [0.1, 3] },
  { id: 'stipple.brightnessThreshold', label: 'Stipple Thresh', group: 'Stipple', range: [0, 1] },
  { id: 'stipple.jitter', label: 'Stipple Jitter', group: 'Stipple', range: [0, 1] },

  // ============================================================================
  // ACID Effects
  // ============================================================================

  // Dots
  { id: 'acid_dots.gridSize', label: 'Dots Grid', group: 'ACID Dots', range: [4, 32], step: 1 },
  { id: 'acid_dots.dotScale', label: 'Dots Scale', group: 'ACID Dots', range: [0.1, 1] },
  { id: 'acid_dots.threshold', label: 'Dots Thresh', group: 'ACID Dots', range: [0, 1] },

  // Glyph
  { id: 'acid_glyph.gridSize', label: 'Glyph Grid', group: 'ACID Glyph', range: [4, 24], step: 1 },
  { id: 'acid_glyph.density', label: 'Glyph Density', group: 'ACID Glyph', range: [0, 1] },

  // Icons
  { id: 'acid_icons.gridSize', label: 'Icons Grid', group: 'ACID Icons', range: [16, 64], step: 1 },
  { id: 'acid_icons.rotation', label: 'Icons Rot', group: 'ACID Icons', range: [0, 360], step: 1 },

  // Contour
  { id: 'acid_contour.levels', label: 'Contour Lvls', group: 'ACID Contour', range: [2, 16], step: 1 },
  { id: 'acid_contour.lineWidth', label: 'Contour Width', group: 'ACID Contour', range: [1, 4] },
  { id: 'acid_contour.smooth', label: 'Contour Smooth', group: 'ACID Contour', range: [0, 1] },

  // Decomp
  { id: 'acid_decomp.minBlock', label: 'Decomp Min', group: 'ACID Decomp', range: [2, 16], step: 1 },
  { id: 'acid_decomp.maxBlock', label: 'Decomp Max', group: 'ACID Decomp', range: [32, 128], step: 1 },
  { id: 'acid_decomp.threshold', label: 'Decomp Thresh', group: 'ACID Decomp', range: [0, 0.5] },

  // Mirror
  { id: 'acid_mirror.segments', label: 'Mirror Segs', group: 'ACID Mirror', range: [2, 12], step: 1 },
  { id: 'acid_mirror.centerX', label: 'Mirror X', group: 'ACID Mirror', range: [0, 1] },
  { id: 'acid_mirror.centerY', label: 'Mirror Y', group: 'ACID Mirror', range: [0, 1] },
  { id: 'acid_mirror.rotation', label: 'Mirror Rot', group: 'ACID Mirror', range: [0, 360], step: 1 },

  // Slice
  { id: 'acid_slice.sliceCount', label: 'Slice Count', group: 'ACID Slice', range: [5, 50], step: 1 },
  { id: 'acid_slice.offset', label: 'Slice Offset', group: 'ACID Slice', range: [0, 1] },

  // ThGrid
  { id: 'acid_thgrid.threshold', label: 'ThGrid Thresh', group: 'ACID ThGrid', range: [0, 1] },
  { id: 'acid_thgrid.gridSize', label: 'ThGrid Size', group: 'ACID ThGrid', range: [4, 32], step: 1 },
  { id: 'acid_thgrid.lineWidth', label: 'ThGrid Width', group: 'ACID ThGrid', range: [1, 4] },

  // Cloud
  { id: 'acid_cloud.density', label: 'Cloud Density', group: 'ACID Cloud', range: [1000, 10000], step: 100 },
  { id: 'acid_cloud.depthScale', label: 'Cloud Depth', group: 'ACID Cloud', range: [0.5, 2] },
  { id: 'acid_cloud.perspective', label: 'Cloud Persp', group: 'ACID Cloud', range: [0, 1] },

  // LED
  { id: 'acid_led.gridSize', label: 'LED Grid', group: 'ACID LED', range: [4, 24], step: 1 },
  { id: 'acid_led.dotSize', label: 'LED Dot', group: 'ACID LED', range: [0.3, 1] },
  { id: 'acid_led.brightness', label: 'LED Bright', group: 'ACID LED', range: [0.5, 1] },
  { id: 'acid_led.bleed', label: 'LED Bleed', group: 'ACID LED', range: [0, 0.5] },

  // Slit
  { id: 'acid_slit.slitPosition', label: 'Slit Pos', group: 'ACID Slit', range: [0, 1] },
  { id: 'acid_slit.speed', label: 'Slit Speed', group: 'ACID Slit', range: [0.5, 2] },
  { id: 'acid_slit.blend', label: 'Slit Blend', group: 'ACID Slit', range: [0, 1] },

  // Voronoi
  { id: 'acid_voronoi.cellCount', label: 'Voronoi Cells', group: 'ACID Voronoi', range: [20, 200], step: 1 },

  // ============================================================================
  // Vision Tracking Effects
  // ============================================================================

  // Bright tracking
  { id: 'track_bright.threshold', label: 'Bright Thresh', group: 'Vision Bright', range: [0, 255], step: 1 },
  { id: 'track_bright.minSize', label: 'Bright MinSize', group: 'Vision Bright', range: [10, 100], step: 1 },
  { id: 'track_bright.maxBlobs', label: 'Bright MaxBlobs', group: 'Vision Bright', range: [5, 50], step: 1 },

  // Edge tracking
  { id: 'track_edge.threshold', label: 'Edge Thresh', group: 'Vision Edge', range: [0, 255], step: 1 },
  { id: 'track_edge.minSize', label: 'Edge MinSize', group: 'Vision Edge', range: [10, 100], step: 1 },
  { id: 'track_edge.maxBlobs', label: 'Edge MaxBlobs', group: 'Vision Edge', range: [5, 50], step: 1 },

  // Color tracking
  { id: 'track_color.threshold', label: 'Color Thresh', group: 'Vision Color', range: [0, 255], step: 1 },
  { id: 'track_color.minSize', label: 'Color MinSize', group: 'Vision Color', range: [10, 100], step: 1 },
  { id: 'track_color.colorRange', label: 'Color Range', group: 'Vision Color', range: [0.1, 0.6] },

  // Motion tracking
  { id: 'track_motion.threshold', label: 'Motion Thresh', group: 'Vision Motion', range: [0, 255], step: 1 },
  { id: 'track_motion.minSize', label: 'Motion MinSize', group: 'Vision Motion', range: [10, 100], step: 1 },
  { id: 'track_motion.sensitivity', label: 'Motion Sens', group: 'Vision Motion', range: [10, 100], step: 1 },

  // Face tracking
  { id: 'track_face.threshold', label: 'Face Thresh', group: 'Vision Face', range: [0, 100], step: 1 },
  { id: 'track_face.minSize', label: 'Face MinSize', group: 'Vision Face', range: [20, 100], step: 1 },
  { id: 'track_face.maxBlobs', label: 'Face MaxBlobs', group: 'Vision Face', range: [1, 10], step: 1 },

  // Hands tracking
  { id: 'track_hands.threshold', label: 'Hands Thresh', group: 'Vision Hands', range: [0, 100], step: 1 },
  { id: 'track_hands.minSize', label: 'Hands MinSize', group: 'Vision Hands', range: [10, 50], step: 1 },
  { id: 'track_hands.maxBlobs', label: 'Hands MaxBlobs', group: 'Vision Hands', range: [2, 20], step: 1 },
]

// Default X/Y mappings for each effect when selected
const EFFECT_DEFAULT_PARAMS: Record<string, { x: string; y: string }> = {
  rgb_split: { x: 'rgb_split.amount', y: 'rgb_split.redOffsetX' },
  block_displace: { x: 'block_displace.displaceDistance', y: 'block_displace.displaceChance' },
  scan_lines: { x: 'scan_lines.lineCount', y: 'scan_lines.lineOpacity' },
  noise: { x: 'noise.amount', y: 'noise.speed' },
  pixelate: { x: 'pixelate.pixelSize', y: 'noise.amount' },
  edges: { x: 'edges.threshold', y: 'edges.mixAmount' },
  ascii: { x: 'ascii.fontSize', y: 'ascii.contrast' },
  stipple: { x: 'stipple.particleSize', y: 'stipple.density' },
  chromatic: { x: 'rgb_split.amount', y: 'rgb_split.redOffsetX' },
  posterize: { x: 'pixelate.pixelSize', y: 'noise.amount' },
  color_grade: { x: 'noise.amount', y: 'edges.threshold' },
  vhs: { x: 'scan_lines.lineCount', y: 'noise.amount' },
  lens: { x: 'block_displace.displaceDistance', y: 'pixelate.pixelSize' },
  dither: { x: 'pixelate.pixelSize', y: 'noise.amount' },
  static_displace: { x: 'block_displace.displaceDistance', y: 'noise.amount' },
  feedback: { x: 'noise.amount', y: 'edges.threshold' },

  // ACID effects
  acid_dots: { x: 'acid_dots.gridSize', y: 'acid_dots.dotScale' },
  acid_glyph: { x: 'acid_glyph.gridSize', y: 'acid_glyph.density' },
  acid_icons: { x: 'acid_icons.gridSize', y: 'acid_icons.rotation' },
  acid_contour: { x: 'acid_contour.levels', y: 'acid_contour.lineWidth' },
  acid_decomp: { x: 'acid_decomp.minBlock', y: 'acid_decomp.threshold' },
  acid_mirror: { x: 'acid_mirror.segments', y: 'acid_mirror.rotation' },
  acid_slice: { x: 'acid_slice.sliceCount', y: 'acid_slice.offset' },
  acid_thgrid: { x: 'acid_thgrid.threshold', y: 'acid_thgrid.gridSize' },
  acid_cloud: { x: 'acid_cloud.density', y: 'acid_cloud.perspective' },
  acid_led: { x: 'acid_led.gridSize', y: 'acid_led.brightness' },
  acid_slit: { x: 'acid_slit.slitPosition', y: 'acid_slit.speed' },
  acid_voronoi: { x: 'acid_voronoi.cellCount', y: 'acid_voronoi.cellCount' },

  // Vision tracking effects
  track_bright: { x: 'track_bright.threshold', y: 'track_bright.minSize' },
  track_edge: { x: 'track_edge.threshold', y: 'track_edge.minSize' },
  track_color: { x: 'track_color.threshold', y: 'track_color.colorRange' },
  track_motion: { x: 'track_motion.threshold', y: 'track_motion.sensitivity' },
  track_face: { x: 'track_face.threshold', y: 'track_face.minSize' },
  track_hands: { x: 'track_hands.threshold', y: 'track_hands.minSize' },
}

export function XYPad() {
  const padRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<XYPosition>({ x: 0.5, y: 0.5 })
  const [isPressed, setIsPressed] = useState(false)
  const [xParamId, setXParamId] = useState<string>('rgb_split.amount')
  const [yParamId, setYParamId] = useState<string>('block_displace.displaceChance')

  const glitch = useGlitchEngineStore()
  const ascii = useAsciiRenderStore()
  const stipple = useStippleStore()
  const acid = useAcidStore()
  const vision = useVisionTrackingStore()
  const { selectedEffectId } = useUIStore()

  // Auto-assign X/Y params when an effect is selected
  useEffect(() => {
    if (selectedEffectId && EFFECT_DEFAULT_PARAMS[selectedEffectId]) {
      const defaults = EFFECT_DEFAULT_PARAMS[selectedEffectId]
      setXParamId(defaults.x)
      setYParamId(defaults.y)
    }
  }, [selectedEffectId])

  const xParam = AVAILABLE_PARAMS.find(p => p.id === xParamId)
  const yParam = AVAILABLE_PARAMS.find(p => p.id === yParamId)

  // Apply a parameter value
  const applyParam = useCallback((paramId: string, normalizedValue: number) => {
    const param = AVAILABLE_PARAMS.find(p => p.id === paramId)
    if (!param) return

    const [effectId, paramName] = paramId.split('.')
    const value = param.range[0] + normalizedValue * (param.range[1] - param.range[0])

    switch (effectId) {
      case 'rgb_split':
        glitch.updateRGBSplit({ [paramName]: value })
        break
      case 'block_displace':
        glitch.updateBlockDisplace({ [paramName]: value })
        break
      case 'scan_lines':
        glitch.updateScanLines({ [paramName]: value })
        break
      case 'noise':
        glitch.updateNoise({ [paramName]: value })
        break
      case 'pixelate':
        glitch.updatePixelate({ [paramName]: value })
        break
      case 'edges':
        glitch.updateEdgeDetection({ [paramName]: value })
        break
      case 'ascii':
        ascii.updateParams({ [paramName]: value })
        break
      case 'stipple':
        stipple.updateParams({ [paramName]: value })
        break

      // ACID effects
      case 'acid_dots':
        acid.updateDotsParams({ [paramName]: value })
        break
      case 'acid_glyph':
        acid.updateGlyphParams({ [paramName]: value })
        break
      case 'acid_icons':
        acid.updateIconsParams({ [paramName]: value })
        break
      case 'acid_contour':
        acid.updateContourParams({ [paramName]: value })
        break
      case 'acid_decomp':
        acid.updateDecompParams({ [paramName]: value })
        break
      case 'acid_mirror':
        acid.updateMirrorParams({ [paramName]: value })
        break
      case 'acid_slice':
        acid.updateSliceParams({ [paramName]: value })
        break
      case 'acid_thgrid':
        acid.updateThGridParams({ [paramName]: value })
        break
      case 'acid_cloud':
        acid.updateCloudParams({ [paramName]: value })
        break
      case 'acid_led':
        acid.updateLedParams({ [paramName]: value })
        break
      case 'acid_slit':
        acid.updateSlitParams({ [paramName]: value })
        break
      case 'acid_voronoi':
        acid.updateVoronoiParams({ [paramName]: value })
        break

      // Vision tracking effects
      case 'track_bright':
        vision.updateBrightParams({ [paramName]: value })
        break
      case 'track_edge':
        vision.updateEdgeParams({ [paramName]: value })
        break
      case 'track_color':
        vision.updateColorParams({ [paramName]: value })
        break
      case 'track_motion':
        vision.updateMotionParams({ [paramName]: value })
        break
      case 'track_face':
        vision.updateFaceParams({ [paramName]: value })
        break
      case 'track_hands':
        vision.updateHandsParams({ [paramName]: value })
        break
    }
  }, [glitch, ascii, stipple, acid, vision])

  // Update both X and Y parameters
  const updateParams = useCallback((x: number, y: number) => {
    if (xParamId) applyParam(xParamId, x)
    if (yParamId) applyParam(yParamId, 1 - y) // Invert Y so up = higher value
  }, [xParamId, yParamId, applyParam])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!padRef.current) return

    e.currentTarget.setPointerCapture(e.pointerId)
    setIsPressed(true)

    const rect = padRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))

    setPosition({ x, y })
    updateParams(x, y)
  }, [updateParams])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPressed || !padRef.current) return

    const rect = padRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))

    setPosition({ x, y })
    updateParams(x, y)
  }, [isPressed, updateParams])

  const handlePointerUp = useCallback(() => {
    setIsPressed(false)
  }, [])

  // Format value for display
  const formatValue = (normalizedValue: number, param: ParamConfig | undefined) => {
    if (!param) return '—'
    const value = param.range[0] + normalizedValue * (param.range[1] - param.range[0])
    if (param.step && param.step >= 1) return Math.round(value).toString()
    if (param.range[1] <= 1) return value.toFixed(2)
    return value.toFixed(1)
  }

  // Group params for select dropdown
  const groupedParams = AVAILABLE_PARAMS.reduce((acc, param) => {
    if (!acc[param.group]) acc[param.group] = []
    acc[param.group].push(param)
    return acc
  }, {} as Record<string, ParamConfig[]>)

  return (
    <div className="h-full flex flex-col p-3">
      {/* Header with parameter selectors */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[14px] font-medium" style={{ color: '#666' }}>X:</span>
        <select
          value={xParamId}
          onChange={(e) => setXParamId(e.target.value)}
          className="flex-1 h-6 text-[14px] rounded px-1"
          style={{
            backgroundColor: '#f5f5f5',
            border: '1px solid #d0d0d0',
            color: '#333',
          }}
        >
          {Object.entries(groupedParams).map(([group, params]) => (
            <optgroup key={group} label={group}>
              {params.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </optgroup>
          ))}
        </select>

        <span className="text-[14px] font-medium" style={{ color: '#666' }}>Y:</span>
        <select
          value={yParamId}
          onChange={(e) => setYParamId(e.target.value)}
          className="flex-1 h-6 text-[14px] rounded px-1"
          style={{
            backgroundColor: '#f5f5f5',
            border: '1px solid #d0d0d0',
            color: '#333',
          }}
        >
          {Object.entries(groupedParams).map(([group, params]) => (
            <optgroup key={group} label={group}>
              {params.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Pad container */}
      <div className="flex-1 flex gap-2">
        {/* Y axis label */}
        <div className="flex flex-col justify-between items-center py-2 w-10">
          <span className="text-[14px] font-medium rotate-180 truncate" style={{ writingMode: 'vertical-rl', color: '#666' }}>
            {yParam?.label || 'Y'}
          </span>
          <span className="text-[14px] tabular-nums" style={{ color: '#444', fontFamily: "'JetBrains Mono', monospace" }}>
            {formatValue(1 - position.y, yParam)}
          </span>
        </div>

        {/* Main pad area */}
        <div className="flex-1 flex flex-col">
          <div
            ref={padRef}
            className="flex-1 relative rounded-lg cursor-crosshair touch-none"
            style={{
              backgroundColor: '#f5f5f5',
              border: '1px solid #d0d0d0',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {/* Grid lines */}
            <div className="absolute inset-0 pointer-events-none">
              {[0.25, 0.5, 0.75].map((pos) => (
                <div
                  key={`v-${pos}`}
                  className="absolute top-0 bottom-0 w-px"
                  style={{ left: `${pos * 100}%`, backgroundColor: '#e0e0e0' }}
                />
              ))}
              {[0.25, 0.5, 0.75].map((pos) => (
                <div
                  key={`h-${pos}`}
                  className="absolute left-0 right-0 h-px"
                  style={{ top: `${pos * 100}%`, backgroundColor: '#e0e0e0' }}
                />
              ))}
            </div>

            {/* Position cursor */}
            <div
              className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{
                left: `${position.x * 100}%`,
                top: `${position.y * 100}%`,
                transform: `translate(-50%, -50%) scale(${isPressed ? 1.2 : 1})`,
                transition: 'transform 0.1s',
              }}
            >
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  backgroundColor: '#666',
                  boxShadow: '0 0 8px rgba(0,0,0,0.3)',
                }}
              />
            </div>
          </div>

          {/* X axis label */}
          <div className="flex justify-between items-center mt-1 px-1">
            <span className="text-[14px] font-medium truncate" style={{ color: '#666' }}>
              {xParam?.label || 'X'}
            </span>
            <span className="text-[14px] tabular-nums" style={{ color: '#444', fontFamily: "'JetBrains Mono', monospace" }}>
              {formatValue(position.x, xParam)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
