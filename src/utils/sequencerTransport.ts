import { useEffectSequencerStore } from '../stores/effectSequencerStore'
import { useMediaStore } from '../stores/mediaStore'
import { useRecordingStore } from '../stores/recordingStore'
import { useAudioSourceStore } from '../stores/audioSourceStore'
import { setWarpAnchor, warpNow } from '../effects/warp/warpClock'
import { resetAutomationEffects } from '../hooks/useAutomationPlayback'

/**
 * The master transport (header play, Space). Play starts everything that runs in time, each from where it
 * is: the step sequencer and Line tracks, the recorded take or else the file video, and the audio file; the
 * slicer (when on) plays with it; the warp's loop restarts on beat 1 so it lines up with the sequencer. This
 * is the app's only play button.
 */
export function linkedPlay(): void {
  setWarpAnchor(warpNow(), 0)
  useEffectSequencerStore.getState().play()
  const { source, videoElement } = useMediaStore.getState()
  const rec = useRecordingStore.getState()
  if (rec.duration > 0 && !rec.isRecording) {
    if (!rec.isPlaying) {
      if (rec.currentTime === 0) resetAutomationEffects() // a take from its start rebuilds its look
      rec.play()
    }
  } else if (source === 'file' && videoElement && videoElement.paused) {
    videoElement.play().catch(console.error)
  }
  const audio = useAudioSourceStore.getState()
  if (audio.activeSource === 'file' && audio.audioFileElement?.paused) audio.audioFileElement.play().catch(console.error)
}

/** Stop everything linkedPlay started (each keeps its position). */
export function linkedStop(): void {
  useEffectSequencerStore.getState().stop()
  const { source, videoElement } = useMediaStore.getState()
  const rec = useRecordingStore.getState()
  if (rec.isPlaying) rec.pause()
  if (source === 'file' && videoElement && !videoElement.paused) videoElement.pause()
  const audio = useAudioSourceStore.getState()
  if (audio.audioFileElement && !audio.audioFileElement.paused) audio.audioFileElement.pause()
}

/** Header and Space: stop when the master is running, else play. */
export function linkedToggle(): void {
  if (useEffectSequencerStore.getState().isPlaying) linkedStop()
  else linkedPlay()
}
