import { useRef, useCallback } from 'react'
import { useUIStore } from '../../stores/uiStore'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { useAsciiRenderStore } from '../../stores/asciiRenderStore'
import { useStippleStore } from '../../stores/stippleStore'
import { useLandmarksStore } from '../../stores/landmarksStore'
import { usePointNetworkStore } from '../../stores/pointNetworkStore'
import { EFFECTS } from '../../config/effects'
import {
  RGBSplitGraphic,
  BlockDisplaceGraphic,
  ScanLinesGraphic,
  NoiseGraphic,
  PixelateGraphic,
  EdgeGraphic,
  AsciiGraphic,
  StippleGraphic,
  NetworkGraphic,
  FaceMeshGraphic,
} from './graphics'

interface ParamDef {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}

export function GraphicPanel() {
  const { selectedEffectId, selectedParamIndex, setSelectedParamIndex } = useUIStore()
  const glitch = useGlitchEngineStore()
  const ascii = useAsciiRenderStore()
  const stipple = useStippleStore()
  const landmarks = useLandmarksStore()
  const network = usePointNetworkStore()

  const dragStartY = useRef<number | null>(null)
  const dragStartValue = useRef<number>(0)

  const effect = EFFECTS.find((e) => e.id === selectedEffectId)

  // Get parameters for selected effect
  const getParams = (): ParamDef[] => {
    switch (selectedEffectId) {
      case 'rgb_split':
        return [
          { label: 'AMOUNT', value: glitch.rgbSplit.amount * 50, min: 0, max: 100, onChange: (v) => glitch.updateRGBSplit({ amount: v / 50 }) },
          { label: 'RED X', value: glitch.rgbSplit.redOffsetX * 1000, min: -50, max: 50, onChange: (v) => glitch.updateRGBSplit({ redOffsetX: v / 1000 }) },
          { label: 'BLUE X', value: glitch.rgbSplit.blueOffsetX * 1000, min: -50, max: 50, onChange: (v) => glitch.updateRGBSplit({ blueOffsetX: v / 1000 }) },
        ]
      case 'block_displace':
        return [
          { label: 'DISTANCE', value: glitch.blockDisplace.displaceDistance * 1000, min: 0, max: 100, onChange: (v) => glitch.updateBlockDisplace({ displaceDistance: v / 1000 }) },
          { label: 'SEED', value: glitch.blockDisplace.seed, min: 0, max: 1000, onChange: (v) => glitch.updateBlockDisplace({ seed: v }) },
        ]
      case 'scan_lines':
        return [
          { label: 'LINES', value: glitch.scanLines.lineCount, min: 50, max: 500, onChange: (v) => glitch.updateScanLines({ lineCount: v }) },
          { label: 'OPACITY', value: glitch.scanLines.lineOpacity * 100, min: 0, max: 100, onChange: (v) => glitch.updateScanLines({ lineOpacity: v / 100 }) },
        ]
      case 'noise':
        return [
          { label: 'AMOUNT', value: glitch.noise.amount * 100, min: 0, max: 100, onChange: (v) => glitch.updateNoise({ amount: v / 100 }) },
          { label: 'SPEED', value: glitch.noise.speed, min: 1, max: 50, onChange: (v) => glitch.updateNoise({ speed: v }) },
        ]
      case 'pixelate':
        return [
          { label: 'SIZE', value: glitch.pixelate.pixelSize, min: 2, max: 32, onChange: (v) => glitch.updatePixelate({ pixelSize: v }) },
        ]
      case 'edges':
        return [
          { label: 'THRESHOLD', value: glitch.edgeDetection.threshold * 100, min: 0, max: 100, onChange: (v) => glitch.updateEdgeDetection({ threshold: v / 100 }) },
          { label: 'MIX', value: glitch.edgeDetection.mixAmount * 100, min: 0, max: 100, onChange: (v) => glitch.updateEdgeDetection({ mixAmount: v / 100 }) },
        ]
      case 'ascii':
      case 'matrix':
        return [
          { label: 'SIZE', value: ascii.params.fontSize, min: 4, max: 20, onChange: (v) => ascii.updateParams({ fontSize: v }) },
          { label: 'CONTRAST', value: ascii.params.contrast * 100, min: 50, max: 200, onChange: (v) => ascii.updateParams({ contrast: v / 100 }) },
        ]
      case 'stipple':
        return [
          { label: 'SIZE', value: stipple.params.particleSize, min: 1, max: 8, onChange: (v) => stipple.updateParams({ particleSize: v }) },
          { label: 'DENSITY', value: stipple.params.density * 100, min: 10, max: 300, onChange: (v) => stipple.updateParams({ density: v / 100 }) },
        ]
      case 'point_network':
        return [
          { label: 'RADIUS', value: network.params.pointRadius, min: 1, max: 10, onChange: (v) => network.updateParams({ pointRadius: v }) },
          { label: 'MAX DIST', value: network.params.maxDistance * 100, min: 5, max: 50, onChange: (v) => network.updateParams({ maxDistance: v / 100 }) },
        ]
      case 'face_mesh':
      case 'hands':
      case 'pose':
      case 'holistic':
        return [
          { label: 'CONFIDENCE', value: landmarks.minDetectionConfidence * 100, min: 10, max: 90, onChange: (v) => landmarks.setMinDetectionConfidence(v / 100) },
          { label: 'TRACKING', value: landmarks.minTrackingConfidence * 100, min: 10, max: 90, onChange: (v) => landmarks.setMinTrackingConfidence(v / 100) },
        ]
      default:
        return []
    }
  }

  const params = getParams()

  // Drag handling for parameter adjustment
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (params.length === 0) return
    e.preventDefault()
    dragStartY.current = e.clientY
    dragStartValue.current = params[selectedParamIndex]?.value ?? 0
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }, [params, selectedParamIndex])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragStartY.current === null || params.length === 0) return
    const param = params[selectedParamIndex]
    if (!param) return

    const deltaY = dragStartY.current - e.clientY
    const range = param.max - param.min
    const sensitivity = range / 100
    const newValue = Math.min(param.max, Math.max(param.min, dragStartValue.current + deltaY * sensitivity))
    param.onChange(newValue)
  }, [params, selectedParamIndex])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {}
    dragStartY.current = null
  }, [])

  // Render graphic based on effect
  const renderGraphic = () => {
    const color = effect?.color || '#888'
    switch (selectedEffectId) {
      case 'rgb_split':
        return <RGBSplitGraphic amount={glitch.rgbSplit.amount} redOffsetX={glitch.rgbSplit.redOffsetX} />
      case 'block_displace':
        return <BlockDisplaceGraphic amount={glitch.blockDisplace.displaceDistance * 1000} seed={glitch.blockDisplace.seed} color={color} />
      case 'scan_lines':
        return <ScanLinesGraphic lineCount={glitch.scanLines.lineCount} opacity={glitch.scanLines.lineOpacity} color={color} />
      case 'noise':
        return <NoiseGraphic amount={glitch.noise.amount * 100} speed={glitch.noise.speed} color={color} />
      case 'pixelate':
        return <PixelateGraphic pixelSize={glitch.pixelate.pixelSize} color={color} />
      case 'edges':
        return <EdgeGraphic threshold={glitch.edgeDetection.threshold * 100} mix={glitch.edgeDetection.mixAmount} color={color} />
      case 'ascii':
      case 'matrix':
        return <AsciiGraphic fontSize={ascii.params.fontSize} mode={ascii.params.mode} color={color} />
      case 'stipple':
        return <StippleGraphic size={stipple.params.particleSize} density={stipple.params.density} color={color} />
      case 'point_network':
        return <NetworkGraphic pointRadius={network.params.pointRadius} maxDistance={network.params.maxDistance} color={color} />
      case 'face_mesh':
      case 'hands':
      case 'pose':
      case 'holistic':
        return <FaceMeshGraphic confidence={landmarks.minDetectionConfidence * 100} mode={selectedEffectId} color={color} />
      default:
        return null
    }
  }

  if (!selectedEffectId || !effect) {
    return (
      <div className="h-full flex items-center justify-center" style={{ backgroundColor: '#ffffff', borderLeft: '1px solid #e0e0e0' }}>
        <span className="text-[10px] uppercase tracking-wider" style={{ color: '#999999' }}>
          Select effect
        </span>
      </div>
    )
  }

  return (
    <div
      className="h-full flex flex-col select-none touch-none cursor-ns-resize"
      style={{ backgroundColor: '#ffffff', borderLeft: '1px solid #e0e0e0' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Effect name header */}
      <div
        className="px-3 py-2 text-center"
        style={{ borderBottom: '1px solid #e0e0e0' }}
      >
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#1a1a1a' }}>
          {effect.label}
        </span>
      </div>

      {/* Graphic visualization */}
      <div className="flex-1 flex items-center justify-center p-2 min-h-0">
        {renderGraphic()}
      </div>

      {/* Parameter list */}
      <div className="px-2 py-1.5" style={{ borderTop: '1px solid #e0e0e0' }}>
        {params.map((param, index) => (
          <button
            key={param.label}
            onClick={(e) => {
              e.stopPropagation()
              setSelectedParamIndex(index)
            }}
            className="w-full flex items-center justify-between py-0.5 group"
          >
            <span
              className="text-[9px] uppercase tracking-wider"
              style={{ color: index === selectedParamIndex ? effect.color : '#999999' }}
            >
              {index === selectedParamIndex && '▸ '}{param.label}
            </span>
            <span
              className="text-[10px] font-mono tabular-nums"
              style={{ color: index === selectedParamIndex ? effect.color : '#666666' }}
            >
              {Math.round(param.value)}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
