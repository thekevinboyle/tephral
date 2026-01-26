import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

export function useThree(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [renderer, setRenderer] = useState<THREE.WebGLRenderer | null>(null)
  const [scene] = useState(() => new THREE.Scene())
  const [camera] = useState(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1))
  const frameIdRef = useRef<number>(0)

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const width = container.clientWidth
    const height = container.clientHeight

    const newRenderer = new THREE.WebGLRenderer({
      antialias: false,
      preserveDrawingBuffer: true
    })
    newRenderer.setSize(width, height)
    newRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(newRenderer.domElement)

    setRenderer(newRenderer)

    const handleResize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      newRenderer.setSize(w, h)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(frameIdRef.current)
      newRenderer.dispose()
      container.removeChild(newRenderer.domElement)
    }
  }, [containerRef])

  return { renderer, scene, camera, frameIdRef }
}
