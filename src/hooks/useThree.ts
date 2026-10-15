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
    // The chain works on the video's sRGB values as they are (media textures are not decoded to linear),
    // so the output must not be sRGB-encoded again, or every frame comes out washed out and hazy.
    newRenderer.outputColorSpace = THREE.LinearSRGBColorSpace
    newRenderer.setSize(width, height)
    newRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    newRenderer.domElement.dataset.stageGl = '' // the stage's WebGL canvas (overlays are separate 2D canvases)
    container.appendChild(newRenderer.domElement)

    setRenderer(newRenderer)
    // Resizes go through Canvas.tsx (pipeline.setSize sizes the renderer and the composer together)

    return () => {
      cancelAnimationFrame(frameIdRef.current)
      newRenderer.dispose()
      container.removeChild(newRenderer.domElement)
    }
  }, [containerRef])

  return { renderer, scene, camera, frameIdRef }
}
