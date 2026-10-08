import { useCallback } from 'react'
import { useAudioSourceStore } from '../stores/audioSourceStore'

/** Loads an audio file as the audio source (same path as Audio > File in the header). */
export function useAudioFileDrop() {
  return useCallback((file: File) => {
    const s = useAudioSourceStore.getState()
    s.setAudioFile(URL.createObjectURL(file), file.name)
    s.setActiveSource('file')
  }, [])
}
