import { type ReactNode, useState, useRef, useCallback } from 'react'
import { Knob } from './Knob'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { useAsciiRenderStore } from '../../stores/asciiRenderStore'
import { useStippleStore } from '../../stores/stippleStore'
import { useLandmarksStore } from '../../stores/landmarksStore'
import { usePointNetworkStore } from '../../stores/pointNetworkStore'
import { useUIStore } from '../../stores/uiStore'
import { useRoutingStore } from '../../stores/routingStore'
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
  const { effectBypassed, toggleEffectBypassed } = useGlitchEngineStore()
  const ascii = useAsciiRenderStore()
  const stipple = useStippleStore()
  const landmarks = useLandmarksStore()
  const network = usePointNetworkStore()

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

  // Point Network
  if (network.enabled) {
    const color = '#00ffaa'
    sections.push({
      id: 'network',
      label: 'NETWORK',
      color,
      visualizer: (
        <NetworkViz
          pointRadius={network.params.pointRadius}
          maxDistance={network.params.maxDistance}
          color={color}
        />
      ),
      params: [
        {
          label: 'Radius',
          value: network.params.pointRadius,
          min: 1,
          max: 10,
          onChange: (v) => network.updateParams({ pointRadius: v }),
        },
        {
          label: 'MaxDst',
          value: network.params.maxDistance * 100,
          min: 5,
          max: 50,
          onChange: (v) => network.updateParams({ maxDistance: v / 100 }),
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

  const { selectedEffectId, setSelectedEffect } = useUIStore()
  const { effectOrder, reorderEffect } = useRoutingStore()

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
      // Find the actual indices in effectOrder
      const fromEffectId = sortedSections[dragIndex].id
      const fromOrderIndex = effectOrder.indexOf(fromEffectId)

      // Calculate target index
      let toOrderIndex: number
      if (dragOverIndex >= sortedSections.length) {
        toOrderIndex = effectOrder.indexOf(sortedSections[sortedSections.length - 1].id) + 1
      } else {
        toOrderIndex = effectOrder.indexOf(sortedSections[dragOverIndex].id)
      }

      // Adjust if moving forward
      if (toOrderIndex > fromOrderIndex) {
        toOrderIndex--
      }

      reorderEffect(fromOrderIndex, toOrderIndex)
    } else if (!isDragging.current) {
      // It was a click, select the effect
      setSelectedEffect(sortedSections[index].id)
    }

    setDragIndex(null)
    setDragOverIndex(null)
    isDragging.current = false
  }, [dragIndex, dragOverIndex, effectOrder, reorderEffect, setSelectedEffect, sortedSections])

  if (sortedSections.length === 0) {
    return (
      <div
        className="h-full flex items-center justify-center"
        style={{
          background: 'linear-gradient(180deg, #1a1d24 0%, #0d0f12 100%)',
        }}
      >
        <span className="text-[10px] text-[#4b5563] uppercase tracking-wider">
          No active effects — drag to reorder
        </span>
      </div>
    )
  }

  return (
    <div
      className="h-full flex items-stretch gap-3 overflow-x-auto px-4 py-3"
      style={{
        background: 'linear-gradient(180deg, #1a1d24 0%, #0d0f12 100%)',
      }}
    >
      {sortedSections.map((section, index) => {
        const isBeingDragged = dragIndex === index
        const isDropTarget = dragOverIndex === index && dragIndex !== null && dragIndex !== index
        const isBypassed = effectBypassed[section.id] || false
        const displayColor = isBypassed ? '#4b5563' : section.color

        return (
          <div
            key={section.id}
            onPointerDown={(e) => handlePointerDown(e, index)}
            onPointerMove={(e) => handlePointerMove(e, index)}
            onPointerUp={(e) => handlePointerUp(e, index)}
            onDoubleClick={() => toggleEffectBypassed(section.id)}
            className="flex-shrink-0 flex flex-col transition-all rounded-lg select-none touch-none cursor-grab active:cursor-grabbing"
            style={{
              background: isBypassed
                ? 'linear-gradient(180deg, #1a1d24 0%, #13151a 100%)'
                : selectedEffectId === section.id
                ? `linear-gradient(180deg, ${section.color}15 0%, ${section.color}08 100%)`
                : 'linear-gradient(180deg, #1e2128 0%, #13151a 100%)',
              boxShadow: isBeingDragged
                ? `0 8px 24px rgba(0,0,0,0.4), 0 0 0 2px ${displayColor}`
                : selectedEffectId === section.id && !isBypassed
                ? `
                  inset 0 1px 1px rgba(255,255,255,0.05),
                  inset 0 -1px 2px rgba(0,0,0,0.3),
                  0 0 20px -4px ${section.color},
                  0 0 0 1px ${section.color}40
                `
                : `
                  inset 0 1px 1px rgba(255,255,255,0.03),
                  inset 0 -1px 2px rgba(0,0,0,0.4),
                  0 2px 4px rgba(0,0,0,0.2),
                  0 0 0 1px #2a2d35
                `,
              minWidth: '140px',
              padding: '12px',
              transform: isBeingDragged ? 'scale(1.05)' : 'scale(1)',
              opacity: isBypassed ? 0.5 : isBeingDragged ? 0.9 : 1,
              zIndex: isBeingDragged ? 10 : 1,
              marginLeft: isDropTarget ? '60px' : '0',
              transition: isBeingDragged ? 'none' : 'all 0.15s ease-out',
              filter: isBypassed ? 'grayscale(100%)' : 'none',
            }}
          >
            {/* Section header with LED */}
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: displayColor,
                  boxShadow: isBypassed ? 'none' : `0 0 8px ${section.color}`,
                }}
              />
              <span
                className="text-[9px] font-semibold tracking-wider uppercase"
                style={{ color: displayColor }}
              >
                {section.label}
              </span>
              {/* Drag handle indicator */}
              <div className="ml-auto flex gap-0.5 opacity-30">
                <div className="w-0.5 h-2 bg-current rounded-full" />
                <div className="w-0.5 h-2 bg-current rounded-full" />
              </div>
            </div>

            {/* Visualizer */}
            <div
              className="flex-1 flex items-center justify-center rounded-md mb-2"
              style={{
                background: 'linear-gradient(180deg, #0d0f12 0%, #1a1d24 100%)',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.4)',
                minHeight: '40px',
              }}
            >
              {section.visualizer}
            </div>

            {/* Knobs row */}
            <div className="flex justify-around gap-3">
              {section.params.map((param) => (
                <Knob
                  key={param.label}
                  label={param.label}
                  value={param.value}
                  min={param.min}
                  max={param.max}
                  color={section.color}
                  size="sm"
                  onChange={param.onChange}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
