import { useEffectSequencerStore } from '../stores/effectSequencerStore'
import { useMediaStore } from '../stores/mediaStore'
import { useRecordingStore } from '../stores/recordingStore'
import { useSlicerStore } from '../stores/slicerStore'

/** Start the step sequencer, the slicer when it is on, and the recorded clip or file video that goes with it. */
export function linkedPlay(): void {
  useEffectSequencerStore.getState().play()
  const slicer = useSlicerStore.getState()
  if (slicer.enabled && !slicer.isPlaying) slicer.setIsPlaying(true)
  const { source, videoElement } = useMediaStore.getState()
  const rec = useRecordingStore.getState()
  if (rec.duration > 0 && !rec.isRecording) {
    rec.play()
  } else if (source === 'file' && videoElement && videoElement.paused) {
    videoElement.play().catch(console.error)
  }
}

/** Stop the step sequencer and the slicer, and pause the recorded clip or file video that goes with it. */
export function linkedStop(): void {
  useEffectSequencerStore.getState().stop()
  const slicer = useSlicerStore.getState()
  if (slicer.isPlaying) slicer.setIsPlaying(false)
  const { source, videoElement } = useMediaStore.getState()
  const rec = useRecordingStore.getState()
  if (rec.isPlaying) {
    rec.pause()
  } else if (source === 'file' && videoElement && !videoElement.paused) {
    videoElement.pause()
  }
}
