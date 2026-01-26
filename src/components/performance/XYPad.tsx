import { useRef, useState, useCallback } from 'react'
import { useUIStore } from '../../stores/uiStore'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { EFFECTS } from '../../config/effects'

interface XYPosition {
  x: number
  y: number
}

// Parameter mappings for each effect (which params map to X and Y)
const EFFECT_XY_MAPPINGS: Record<string, { x: string; y: string; xRange: [number, number]; yRange: [number, number] }> = {
  rgb_split: { x: 'amount', y: 'angle', xRange: [0, 50], yRange: [0, 360] },
  block_displace: { x: 'amount', y: 'seed', xRange: [0, 100], yRange: [0, 1000] },
  scan_lines: { x: 'intensity', y: 'count', xRange: [0, 1], yRange: [100, 1000] },
  noise: { x: 'amount', y: 'speed', xRange: [0, 1], yRange: [0, 5] },
  pixelate: { x: 'pixelSize', y: 'pixelSize', xRange: [1, 64], yRange: [1, 64] }, // Same param for both
  edges: { x: 'threshold', y: 'thickness', xRange: [0, 1], yRange: [0.5, 3] },
}

export function XYPad() {
  const padRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<XYPosition>({ x: 0.5, y: 0.5 })
  const [isPressed, setIsPressed] = useState(false)
  const { selectedEffectId } = useUIStore()

  const {
    updateRGBSplit,
    updateBlockDisplace,
    updateScanLines,
    updateNoise,
    updatePixelate,
    updateEdgeDetection,
  } = useGlitchEngineStore()

  // Get current effect info
  const currentEffect = EFFECTS.find(e => e.id === selectedEffectId)
  const mapping = selectedEffectId ? EFFECT_XY_MAPPINGS[selectedEffectId] : null

  // Update effect parameters based on XY position
  const updateEffectParams = useCallback((x: number, y: number) => {
    if (!selectedEffectId || !mapping) return

    const xValue = mapping.xRange[0] + x * (mapping.xRange[1] - mapping.xRange[0])
    const yValue = mapping.yRange[0] + (1 - y) * (mapping.yRange[1] - mapping.yRange[0]) // Invert Y

    switch (selectedEffectId) {
      case 'rgb_split':
        updateRGBSplit({ [mapping.x]: xValue, [mapping.y]: yValue })
        break
      case 'block_displace':
        updateBlockDisplace({ [mapping.x]: xValue, [mapping.y]: yValue })
        break
      case 'scan_lines':
        updateScanLines({ [mapping.x]: xValue, [mapping.y]: yValue })
        break
      case 'noise':
        updateNoise({ [mapping.x]: xValue, [mapping.y]: yValue })
        break
      case 'pixelate':
        updatePixelate({ pixelSize: xValue })
        break
      case 'edges':
        updateEdgeDetection({ [mapping.x]: xValue, [mapping.y]: yValue })
        break
    }
  }, [selectedEffectId, mapping, updateRGBSplit, updateBlockDisplace, updateScanLines, updateNoise, updatePixelate, updateEdgeDetection])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!padRef.current) return

    e.currentTarget.setPointerCapture(e.pointerId)
    setIsPressed(true)

    const rect = padRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))

    setPosition({ x, y })
    updateEffectParams(x, y)
  }, [updateEffectParams])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPressed || !padRef.current) return

    const rect = padRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))

    setPosition({ x, y })
    updateEffectParams(x, y)
  }, [isPressed, updateEffectParams])

  const handlePointerUp = useCallback(() => {
    setIsPressed(false)
  }, [])

  // Format value for display
  const formatValue = (value: number, range: [number, number]) => {
    const actual = range[0] + value * (range[1] - range[0])
    if (range[1] > 100) return Math.round(actual).toString()
    if (range[1] <= 1) return actual.toFixed(2)
    return actual.toFixed(1)
  }

  return (
    <div className="h-full flex flex-col p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] uppercase tracking-wider text-[#6b7280] font-medium">
          X/Y PAD
        </span>
        {currentEffect && (
          <span
            className="text-[9px] uppercase tracking-wider font-medium"
            style={{ color: currentEffect.color }}
          >
            {currentEffect.label}
          </span>
        )}
      </div>

      {/* Pad container */}
      <div className="flex-1 flex gap-2">
        {/* Y axis label */}
        <div className="flex flex-col justify-between items-center py-2">
          <span className="text-[8px] text-[#4b5563] uppercase tracking-wider rotate-180" style={{ writingMode: 'vertical-rl' }}>
            {mapping?.y || 'Y'}
          </span>
          {mapping && (
            <span className="text-[8px] text-[#6b7280] tabular-nums">
              {formatValue(1 - position.y, mapping.yRange)}
            </span>
          )}
        </div>

        {/* Main pad area */}
        <div className="flex-1 flex flex-col">
          <div
            ref={padRef}
            className="flex-1 relative rounded-lg cursor-crosshair touch-none"
            style={{
              background: `
                linear-gradient(180deg, #0a0c0f 0%, #13151a 100%)
              `,
              boxShadow: `
                inset 0 2px 4px rgba(0,0,0,0.5),
                inset 0 -1px 2px rgba(255,255,255,0.02),
                0 0 0 1px #2a2d35
              `,
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {/* Grid lines */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Vertical lines */}
              {[0.25, 0.5, 0.75].map((pos) => (
                <div
                  key={`v-${pos}`}
                  className="absolute top-0 bottom-0 w-px"
                  style={{
                    left: `${pos * 100}%`,
                    background: 'rgba(99, 102, 241, 0.1)',
                  }}
                />
              ))}
              {/* Horizontal lines */}
              {[0.25, 0.5, 0.75].map((pos) => (
                <div
                  key={`h-${pos}`}
                  className="absolute left-0 right-0 h-px"
                  style={{
                    top: `${pos * 100}%`,
                    background: 'rgba(99, 102, 241, 0.1)',
                  }}
                />
              ))}
            </div>

            {/* Center crosshair */}
            <div
              className="absolute w-4 h-px"
              style={{
                left: 'calc(50% - 8px)',
                top: '50%',
                background: 'rgba(99, 102, 241, 0.3)',
              }}
            />
            <div
              className="absolute h-4 w-px"
              style={{
                left: '50%',
                top: 'calc(50% - 8px)',
                background: 'rgba(99, 102, 241, 0.3)',
              }}
            />

            {/* Position cursor */}
            <div
              className="absolute w-5 h-5 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-transform"
              style={{
                left: `${position.x * 100}%`,
                top: `${position.y * 100}%`,
                transform: `translate(-50%, -50%) scale(${isPressed ? 1.2 : 1})`,
              }}
            >
              {/* Outer ring */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: currentEffect?.color || '#6366f1',
                  opacity: 0.3,
                  boxShadow: `0 0 12px ${currentEffect?.color || '#6366f1'}`,
                }}
              />
              {/* Inner dot */}
              <div
                className="absolute inset-1 rounded-full"
                style={{
                  background: `radial-gradient(ellipse at 30% 30%, ${currentEffect?.color || '#6366f1'} 0%, ${currentEffect?.color || '#6366f1'}80 100%)`,
                  boxShadow: `
                    0 0 8px ${currentEffect?.color || '#6366f1'},
                    inset 0 1px 2px rgba(255,255,255,0.3)
                  `,
                }}
              />
            </div>

            {/* Touch trail effect when pressed */}
            {isPressed && (
              <div
                className="absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 pointer-events-none rounded-full"
                style={{
                  left: `${position.x * 100}%`,
                  top: `${position.y * 100}%`,
                  background: `radial-gradient(circle, ${currentEffect?.color || '#6366f1'}20 0%, transparent 70%)`,
                }}
              />
            )}
          </div>

          {/* X axis label */}
          <div className="flex justify-between items-center mt-1 px-1">
            <span className="text-[8px] text-[#4b5563] uppercase tracking-wider">
              {mapping?.x || 'X'}
            </span>
            {mapping && (
              <span className="text-[8px] text-[#6b7280] tabular-nums">
                {formatValue(position.x, mapping.xRange)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* No effect selected message */}
      {!selectedEffectId && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[10px] text-[#4b5563] uppercase tracking-wider">
            Select an effect
          </span>
        </div>
      )}
    </div>
  )
}
