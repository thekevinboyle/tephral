import { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'
import { useThree } from '../hooks/useThree'
import { useVideoTexture } from '../hooks/useVideoTexture'
import { EffectPipeline } from '../effects/EffectPipeline'
import { useGlitchEngineStore } from '../stores/glitchEngineStore'

export function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { renderer, frameIdRef } = useThree(containerRef)
  const [pipeline, setPipeline] = useState<EffectPipeline | null>(null)
  const mediaTexture = useVideoTexture()

  const {
    enabled: glitchEnabled,
    rgbSplitEnabled,
    blockDisplaceEnabled,
    scanLinesEnabled,
    rgbSplit,
    blockDisplace,
    scanLines
  } = useGlitchEngineStore()

  // Initialize pipeline
  useEffect(() => {
    if (!renderer) return

    const newPipeline = new EffectPipeline(renderer)
    setPipeline(newPipeline)

    return () => {
      newPipeline.dispose()
    }
  }, [renderer])

  // Sync effect parameters
  useEffect(() => {
    if (!pipeline) return

    pipeline.rgbSplit?.updateParams(rgbSplit)
    pipeline.blockDisplace?.updateParams(blockDisplace)
    pipeline.scanLines?.updateParams(scanLines)

    pipeline.updateEffects({
      rgbSplitEnabled: glitchEnabled && rgbSplitEnabled,
      blockDisplaceEnabled: glitchEnabled && blockDisplaceEnabled,
      scanLinesEnabled: glitchEnabled && scanLinesEnabled,
    })
  }, [
    pipeline,
    glitchEnabled,
    rgbSplitEnabled,
    blockDisplaceEnabled,
    scanLinesEnabled,
    rgbSplit,
    blockDisplace,
    scanLines
  ])

  // Update input texture
  useEffect(() => {
    if (!pipeline) return

    if (mediaTexture) {
      pipeline.setInputTexture(mediaTexture)
    } else {
      const size = 256
      const data = new Uint8Array(size * size * 4)
      for (let i = 0; i < size * size * 4; i += 4) {
        data[i] = 20
        data[i + 1] = 20
        data[i + 2] = 20
        data[i + 3] = 255
      }
      const placeholder = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
      placeholder.needsUpdate = true
      pipeline.setInputTexture(placeholder)
    }
  }, [pipeline, mediaTexture])

  // Render loop
  useEffect(() => {
    if (!pipeline || !renderer || !containerRef.current) return

    pipeline.setSize(
      containerRef.current.clientWidth,
      containerRef.current.clientHeight
    )

    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate)
      pipeline.render()
    }
    animate()

    return () => {
      cancelAnimationFrame(frameIdRef.current)
    }
  }, [pipeline, renderer, frameIdRef])

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-black"
    />
  )
}
