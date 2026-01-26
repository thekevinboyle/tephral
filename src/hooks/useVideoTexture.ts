import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { useMediaStore } from '../stores/mediaStore'

export function useVideoTexture() {
  const { videoElement, imageElement, source } = useMediaStore()
  const [texture, setTexture] = useState<THREE.Texture | null>(null)

  useEffect(() => {
    if (source === 'none') {
      setTexture(null)
      return
    }

    if (videoElement) {
      const videoTexture = new THREE.VideoTexture(videoElement)
      videoTexture.minFilter = THREE.LinearFilter
      videoTexture.magFilter = THREE.LinearFilter
      videoTexture.format = THREE.RGBAFormat
      setTexture(videoTexture)

      return () => {
        videoTexture.dispose()
      }
    }

    if (imageElement) {
      const imageTexture = new THREE.Texture(imageElement)
      imageTexture.minFilter = THREE.LinearFilter
      imageTexture.magFilter = THREE.LinearFilter
      imageTexture.needsUpdate = true
      setTexture(imageTexture)

      return () => {
        imageTexture.dispose()
      }
    }
  }, [videoElement, imageElement, source])

  return texture
}
