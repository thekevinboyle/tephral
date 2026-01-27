import { useRef, useEffect } from 'react'
import { useUIStore } from '../../stores/uiStore'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { useAsciiRenderStore } from '../../stores/asciiRenderStore'
import { useStippleStore } from '../../stores/stippleStore'
import { useLandmarksStore } from '../../stores/landmarksStore'
import { EFFECTS } from '../../config/effects'
import { Knob } from './Knob'
import { EffectParameterEditor } from './EffectParameterEditor'

interface ParamDef {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}

export function GraphicPanelV2() {
  const { selectedEffectId, setSelectedEffect: setSelectedEffectId } = useUIStore()
  const glitch = useGlitchEngineStore()
  const ascii = useAsciiRenderStore()
  const stipple = useStippleStore()
  const landmarks = useLandmarksStore()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef(0)

  const effect = EFFECTS.find((e) => e.id === selectedEffectId)

  // Get parameters for selected effect
  const getParams = (): ParamDef[] => {
    switch (selectedEffectId) {
      case 'rgb_split':
        return [
          { label: 'Amount', value: glitch.rgbSplit.amount * 50, min: 0, max: 100, onChange: (v) => glitch.updateRGBSplit({ amount: v / 50 }) },
          { label: 'Red', value: glitch.rgbSplit.redOffsetX * 1000, min: -50, max: 50, onChange: (v) => glitch.updateRGBSplit({ redOffsetX: v / 1000 }) },
          { label: 'Blue', value: glitch.rgbSplit.blueOffsetX * 1000, min: -50, max: 50, onChange: (v) => glitch.updateRGBSplit({ blueOffsetX: v / 1000 }) },
        ]
      case 'block_displace':
        return [
          { label: 'Distance', value: glitch.blockDisplace.displaceDistance * 1000, min: 0, max: 100, onChange: (v) => glitch.updateBlockDisplace({ displaceDistance: v / 1000 }) },
          { label: 'Seed', value: glitch.blockDisplace.seed, min: 0, max: 1000, onChange: (v) => glitch.updateBlockDisplace({ seed: v }) },
        ]
      case 'scan_lines':
        return [
          { label: 'Lines', value: glitch.scanLines.lineCount, min: 50, max: 500, onChange: (v) => glitch.updateScanLines({ lineCount: v }) },
          { label: 'Opacity', value: glitch.scanLines.lineOpacity * 100, min: 0, max: 100, onChange: (v) => glitch.updateScanLines({ lineOpacity: v / 100 }) },
        ]
      case 'noise':
        return [
          { label: 'Amount', value: glitch.noise.amount * 100, min: 0, max: 100, onChange: (v) => glitch.updateNoise({ amount: v / 100 }) },
          { label: 'Speed', value: glitch.noise.speed, min: 1, max: 50, onChange: (v) => glitch.updateNoise({ speed: v }) },
        ]
      case 'pixelate':
        return [
          { label: 'Size', value: glitch.pixelate.pixelSize, min: 2, max: 32, onChange: (v) => glitch.updatePixelate({ pixelSize: v }) },
        ]
      case 'edges':
        return [
          { label: 'Threshold', value: glitch.edgeDetection.threshold * 100, min: 0, max: 100, onChange: (v) => glitch.updateEdgeDetection({ threshold: v / 100 }) },
          { label: 'Mix', value: glitch.edgeDetection.mixAmount * 100, min: 0, max: 100, onChange: (v) => glitch.updateEdgeDetection({ mixAmount: v / 100 }) },
        ]
      case 'ascii':
      case 'matrix':
        return [
          { label: 'Size', value: ascii.params.fontSize, min: 4, max: 20, onChange: (v) => ascii.updateParams({ fontSize: v }) },
          { label: 'Contrast', value: ascii.params.contrast * 100, min: 50, max: 200, onChange: (v) => ascii.updateParams({ contrast: v / 100 }) },
        ]
      case 'stipple':
        return [
          { label: 'Size', value: stipple.params.particleSize, min: 1, max: 8, onChange: (v) => stipple.updateParams({ particleSize: v }) },
          { label: 'Density', value: stipple.params.density * 100, min: 10, max: 300, onChange: (v) => stipple.updateParams({ density: v / 100 }) },
        ]
      case 'face_mesh':
      case 'hands':
      case 'pose':
      case 'holistic':
        return [
          { label: 'Confidence', value: landmarks.minDetectionConfidence * 100, min: 10, max: 90, onChange: (v) => landmarks.setMinDetectionConfidence(v / 100) },
          { label: 'Tracking', value: landmarks.minTrackingConfidence * 100, min: 10, max: 90, onChange: (v) => landmarks.setMinTrackingConfidence(v / 100) },
        ]
      default:
        return []
    }
  }

  const params = getParams()

  // Animated visualization
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !selectedEffectId) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number

    const draw = () => {
      const w = canvas.width
      const h = canvas.height
      const t = frameRef.current * 0.02

      // Clear with flat background
      ctx.fillStyle = '#f5f5f5'
      ctx.fillRect(0, 0, w, h)

      // Grid lines
      ctx.strokeStyle = '#e0e0e0'
      ctx.lineWidth = 1
      for (let x = 0; x <= w; x += 20) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
      }
      for (let y = 0; y <= h; y += 20) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }

      // Draw effect-specific visualization
      const effectColor = effect?.color || '#888888'
      ctx.fillStyle = effectColor
      ctx.strokeStyle = effectColor
      ctx.lineWidth = 2

      switch (selectedEffectId) {
        case 'rgb_split': {
          // Waveform with RGB separation
          ctx.globalAlpha = 0.6
          ctx.beginPath()
          for (let x = 0; x < w; x++) {
            const y = h / 2 + Math.sin((x + t * 10) * 0.05) * (h * 0.3) * glitch.rgbSplit.amount
            if (x === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.stroke()
          ctx.globalAlpha = 1
          break
        }
        case 'block_displace': {
          // Block pattern
          const cols = 8
          const rows = 4
          const cellW = w / cols
          const cellH = h / rows
          ctx.globalAlpha = 0.5
          for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
              const offset = Math.sin(t + x + y * glitch.blockDisplace.seed * 0.001) * glitch.blockDisplace.displaceDistance * 200
              ctx.fillRect(x * cellW + offset, y * cellH + 2, cellW - 4, cellH - 4)
            }
          }
          ctx.globalAlpha = 1
          break
        }
        case 'scan_lines': {
          // Horizontal scan lines
          const numLines = Math.floor(glitch.scanLines.lineCount / 20)
          for (let i = 0; i < numLines; i++) {
            const y = (i / numLines) * h
            const alpha = glitch.scanLines.lineOpacity * (0.5 + Math.sin(t + i) * 0.5)
            ctx.globalAlpha = alpha
            ctx.fillRect(0, y, w, 2)
          }
          ctx.globalAlpha = 1
          break
        }
        case 'noise': {
          // Noise dots
          ctx.globalAlpha = glitch.noise.amount
          for (let i = 0; i < 100; i++) {
            const x = Math.random() * w
            const y = Math.random() * h
            ctx.fillRect(x, y, 2, 2)
          }
          ctx.globalAlpha = 1
          break
        }
        case 'edges': {
          // Edge detection style - simple squares
          ctx.globalAlpha = 0.6
          const size = 30 + glitch.edgeDetection.threshold * 20
          ctx.save()
          ctx.translate(w / 2, h / 2)
          ctx.rotate(t * 0.5)
          ctx.strokeRect(-size / 2, -size / 2, size, size)
          ctx.rotate(Math.PI / 4)
          ctx.strokeRect(-size / 3, -size / 3, size * 0.66, size * 0.66)
          ctx.restore()
          ctx.globalAlpha = 1
          break
        }
        default: {
          // Default waveform
          ctx.globalAlpha = 0.6
          ctx.beginPath()
          for (let x = 0; x < w; x++) {
            const y = h / 2 + Math.sin((x + t * 5) * 0.03) * (h * 0.35)
            if (x === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.stroke()
          ctx.globalAlpha = 1
        }
      }

      frameRef.current++
      animationId = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animationId)
  }, [selectedEffectId, glitch, ascii, stipple, landmarks, effect])

  // Show full parameter editor for contour (after all hooks)
  if (selectedEffectId === 'contour') {
    return (
      <EffectParameterEditor
        effectId={selectedEffectId}
        onClose={() => setSelectedEffectId(null)}
      />
    )
  }

  if (!selectedEffectId || !effect) {
    return (
      <div
        className="h-full flex items-center justify-center"
        style={{ backgroundColor: '#ffffff' }}
      >
        <span className="text-[11px] font-medium" style={{ color: '#999999' }}>
          Select an effect
        </span>
      </div>
    )
  }

  return (
    <div
      className="h-full flex flex-col"
      style={{ backgroundColor: '#ffffff' }}
    >
      {/* Header */}
      <div
        className="px-3 py-2 flex items-center justify-between"
        style={{ borderBottom: '1px solid #e0e0e0' }}
      >
        <span className="text-[11px] font-medium" style={{ color: '#1a1a1a' }}>
          {effect.label}
        </span>
        <div className="flex items-center gap-1">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: effect.color,
              boxShadow: `0 0 8px ${effect.color}`,
            }}
          />
        </div>
      </div>

      {/* Visualization */}
      <div className="flex-1 p-3 min-h-0 flex items-center justify-center">
        <div
          className="aspect-square w-full max-w-[200px] rounded-lg overflow-hidden"
          style={{
            backgroundColor: '#f5f5f5',
            border: '1px solid #e0e0e0',
          }}
        >
          <canvas
            ref={canvasRef}
            width={200}
            height={200}
            className="w-full h-full"
          />
        </div>
      </div>

      {/* Knobs */}
      <div
        className="px-3 py-3"
        style={{ borderTop: '1px solid #e0e0e0' }}
      >
        <div className="flex justify-around">
          {params.slice(0, 3).map((param) => (
            <Knob
              key={param.label}
              label={param.label}
              value={param.value}
              min={param.min}
              max={param.max}
              size="md"
              color={effect.color}
              onChange={param.onChange}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
