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
      // A paused video presents no frames, so its first frame and every seek are uploaded by hand
      const refresh = () => { if (videoElement.readyState >= 2) videoTexture.needsUpdate = true }
      refresh()
      videoElement.addEventListener('loadeddata', refresh)
      videoElement.addEventListener('seeked', refresh)
      setTexture(videoTexture)

      return () => {
        videoElement.removeEventListener('loadeddata', refresh)
        videoElement.removeEventListener('seeked', refresh)
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
