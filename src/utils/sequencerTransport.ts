import { useEffectSequencerStore } from '../stores/effectSequencerStore'
import { useMediaStore } from '../stores/mediaStore'
import { useRecordingStore } from '../stores/recordingStore'

/** Start the step sequencer and, as before, the recorded clip or file video that goes with it. */
export function linkedPlay(): void {
  useEffectSequencerStore.getState().play()
  const { source, videoElement } = useMediaStore.getState()
  const rec = useRecordingStore.getState()
  if (rec.duration > 0 && !rec.isRecording) {
    rec.play()
  } else if (source === 'file' && videoElement && videoElement.paused) {
    videoElement.play().catch(console.error)
  }
}

/** Stop the step sequencer and pause the recorded clip or file video that goes with it. */
export function linkedStop(): void {
  useEffectSequencerStore.getState().stop()
  const { source, videoElement } = useMediaStore.getState()
  const rec = useRecordingStore.getState()
  if (rec.isPlaying) {
    rec.pause()
  } else if (source === 'file' && videoElement && !videoElement.paused) {
    videoElement.pause()
  }
}
