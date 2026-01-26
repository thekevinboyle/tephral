import { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'
import { useThree } from '../hooks/useThree'
import { EffectPipeline } from '../effects/EffectPipeline'

export function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { renderer, frameIdRef } = useThree(containerRef)
  const [pipeline, setPipeline] = useState<EffectPipeline | null>(null)

  // Initialize pipeline when renderer is ready
  useEffect(() => {
    if (!renderer) return

    const newPipeline = new EffectPipeline(renderer)
    setPipeline(newPipeline)

    // Create test texture (checkerboard pattern)
    const size = 256
    const data = new Uint8Array(size * size * 4)
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const idx = (i * size + j) * 4
        const isLight = ((i >> 4) + (j >> 4)) % 2 === 0
        const val = isLight ? 200 : 50
        data[idx] = val
        data[idx + 1] = val
        data[idx + 2] = val
        data[idx + 3] = 255
      }
    }
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
    texture.needsUpdate = true
    newPipeline.setInputTexture(texture)

    return () => {
      newPipeline.dispose()
    }
  }, [renderer])

  // Render loop
  useEffect(() => {
    if (!pipeline || !renderer) return

    pipeline.setSize(
      containerRef.current?.clientWidth || 800,
      containerRef.current?.clientHeight || 600
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
