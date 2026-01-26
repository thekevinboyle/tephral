import { useRef, useEffect } from 'react'
import { useUIStore } from '../../stores/uiStore'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { useAsciiRenderStore } from '../../stores/asciiRenderStore'
import { useStippleStore } from '../../stores/stippleStore'
import { useLandmarksStore } from '../../stores/landmarksStore'
import { usePointNetworkStore } from '../../stores/pointNetworkStore'
import { EFFECTS } from '../../config/effects'
import { Knob3D } from './Knob3D'

interface ParamDef {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}

export function GraphicPanelV2() {
  const { selectedEffectId } = useUIStore()
  const glitch = useGlitchEngineStore()
  const ascii = useAsciiRenderStore()
  const stipple = useStippleStore()
  const landmarks = useLandmarksStore()
  const network = usePointNetworkStore()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef(0)

  const effect = EFFECTS.find((e) => e.id === selectedEffectId)

  // Get parameters for selected effect
  const getParams = (): ParamDef[] => {
    switch (selectedEffectId) {
      case 'rgb_split':
        return [
          { label: 'AMOUNT', value: glitch.rgbSplit.amount * 50, min: 0, max: 100, onChange: (v) => glitch.updateRGBSplit({ amount: v / 50 }) },
          { label: 'RED', value: glitch.rgbSplit.redOffsetX * 1000, min: -50, max: 50, onChange: (v) => glitch.updateRGBSplit({ redOffsetX: v / 1000 }) },
          { label: 'BLUE', value: glitch.rgbSplit.blueOffsetX * 1000, min: -50, max: 50, onChange: (v) => glitch.updateRGBSplit({ blueOffsetX: v / 1000 }) },
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
          { label: 'DISTANCE', value: network.params.maxDistance * 100, min: 5, max: 50, onChange: (v) => network.updateParams({ maxDistance: v / 100 }) },
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

      // Clear with gradient background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h)
      bgGrad.addColorStop(0, '#1a1d24')
      bgGrad.addColorStop(1, '#0d0f12')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, w, h)

      // Center line
      ctx.strokeStyle = '#f97316'
      ctx.lineWidth = 1
      ctx.globalAlpha = 0.6
      ctx.beginPath()
      ctx.moveTo(0, h / 2)
      ctx.lineTo(w, h / 2)
      ctx.stroke()
      ctx.globalAlpha = 1

      // Draw effect-specific visualization
      const gradient = ctx.createLinearGradient(0, 0, 0, h)
      gradient.addColorStop(0, 'rgba(99, 102, 241, 0.8)')
      gradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.4)')
      gradient.addColorStop(1, 'rgba(99, 102, 241, 0.1)')

      ctx.fillStyle = gradient
      ctx.strokeStyle = '#818cf8'
      ctx.lineWidth = 2

      switch (selectedEffectId) {
        case 'rgb_split': {
          // Waveform with RGB separation
          ctx.beginPath()
          for (let x = 0; x < w; x++) {
            const y = h / 2 + Math.sin((x + t * 10) * 0.05) * (h * 0.3) * glitch.rgbSplit.amount
            if (x === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.lineTo(w, h)
          ctx.lineTo(0, h)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()
          break
        }
        case 'block_displace': {
          // Block pattern
          const cols = 8
          const rows = 4
          const cellW = w / cols
          const cellH = h / rows
          for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
              const offset = Math.sin(t + x + y * glitch.blockDisplace.seed * 0.001) * glitch.blockDisplace.displaceDistance * 200
              ctx.fillStyle = gradient
              ctx.fillRect(x * cellW + offset, y * cellH + 2, cellW - 4, cellH - 4)
            }
          }
          break
        }
        case 'scan_lines': {
          // Horizontal scan lines
          const numLines = Math.floor(glitch.scanLines.lineCount / 20)
          for (let i = 0; i < numLines; i++) {
            const y = (i / numLines) * h
            const alpha = glitch.scanLines.lineOpacity * (0.5 + Math.sin(t + i) * 0.5)
            ctx.globalAlpha = alpha
            ctx.fillStyle = '#818cf8'
            ctx.fillRect(0, y, w, 2)
          }
          ctx.globalAlpha = 1
          break
        }
        case 'noise': {
          // Noise pattern
          const imageData = ctx.getImageData(0, 0, w, h)
          for (let i = 0; i < imageData.data.length; i += 4) {
            const noise = Math.random() * glitch.noise.amount * 255
            imageData.data[i] = Math.min(255, imageData.data[i] + noise * 0.3)
            imageData.data[i + 1] = Math.min(255, imageData.data[i + 1] + noise * 0.4)
            imageData.data[i + 2] = Math.min(255, imageData.data[i + 2] + noise * 0.9)
          }
          ctx.putImageData(imageData, 0, 0)
          break
        }
        case 'edges': {
          // Edge detection style
          ctx.strokeStyle = '#818cf8'
          ctx.lineWidth = 2
          const size = 30 + glitch.edgeDetection.threshold * 20
          ctx.save()
          ctx.translate(w / 2, h / 2)
          ctx.rotate(t * 0.5)
          ctx.strokeRect(-size / 2, -size / 2, size, size)
          ctx.rotate(Math.PI / 4)
          ctx.strokeRect(-size / 3, -size / 3, size * 0.66, size * 0.66)
          ctx.restore()
          break
        }
        default: {
          // Default waveform
          ctx.beginPath()
          for (let x = 0; x < w; x++) {
            const y = h / 2 + Math.sin((x + t * 5) * 0.03) * (h * 0.35)
            if (x === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.lineTo(w, h)
          ctx.lineTo(0, h)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()
        }
      }

      frameRef.current++
      animationId = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(animationId)
  }, [selectedEffectId, glitch, ascii, stipple, landmarks, network])

  if (!selectedEffectId || !effect) {
    return (
      <div
        className="h-full flex items-center justify-center"
        style={{
          background: 'linear-gradient(180deg, #1a1d24 0%, #0d0f12 100%)',
        }}
      >
        <span className="text-[11px] text-[#4b5563] uppercase tracking-wider">
          Select an effect
        </span>
      </div>
    )
  }

  return (
    <div
      className="h-full flex flex-col"
      style={{
        background: 'linear-gradient(180deg, #1a1d24 0%, #0d0f12 100%)',
      }}
    >
      {/* Header */}
      <div className="px-3 py-2 flex items-center justify-between border-b border-[#2a2d35]">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">
          {effect.label}
        </span>
        <div className="flex items-center gap-1">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: '#6366f1',
              boxShadow: '0 0 8px #6366f1',
            }}
          />
        </div>
      </div>

      {/* Visualization */}
      <div className="flex-1 p-3 min-h-0 flex items-center justify-center">
        <div
          className="aspect-square w-full max-w-[200px] rounded-lg overflow-hidden"
          style={{
            boxShadow: `
              inset 0 2px 4px rgba(0,0,0,0.3),
              inset 0 -1px 2px rgba(255,255,255,0.02),
              0 0 0 1px rgba(255,255,255,0.05)
            `,
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
      <div className="px-3 py-3 border-t border-[#2a2d35]">
        <div className="flex justify-around">
          {params.slice(0, 3).map((param) => (
            <Knob3D
              key={param.label}
              label={param.label}
              value={param.value}
              min={param.min}
              max={param.max}
              size="md"
              onChange={param.onChange}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
