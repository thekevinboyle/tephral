import { useRef, useEffect } from 'react'
import { useThree } from '../hooks/useThree'

export function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { renderer, scene, camera, frameIdRef } = useThree(containerRef)

  useEffect(() => {
    if (!renderer) return

    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate)
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(frameIdRef.current)
    }
  }, [renderer, scene, camera, frameIdRef])

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-black"
    />
  )
}
