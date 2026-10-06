import { useCallback } from 'react'
import { useMediaStore } from '../stores/mediaStore'
import { useRecordingStore, type AutomationEvent } from '../stores/recordingStore'
import { useGlitchEngineStore } from '../stores/glitchEngineStore'
import { useAsciiRenderStore } from '../stores/asciiRenderStore'
import { useStippleStore } from '../stores/stippleStore'
import { useAcidStore } from '../stores/acidStore'

/** Seed the automation track with every effect that is already on when recording starts. */
function initialAutomationEvents(): AutomationEvent[] {
  const events: AutomationEvent[] = []
  const glitch = useGlitchEngineStore.getState()
  const ascii = useAsciiRenderStore.getState()
  const stipple = useStippleStore.getState()
  const acid = useAcidStore.getState()
  const on = (effect: string) => events.push({ t: 0, effect, action: 'on' })

  if (glitch.rgbSplitEnabled) on('rgb_split')
  if (glitch.blockDisplaceEnabled) on('block_displace')
  if (glitch.scanLinesEnabled) on('scan_lines')
  if (glitch.noiseEnabled) on('noise')
  if (glitch.pixelateEnabled) on('pixelate')
  if (glitch.edgeDetectionEnabled) on('edges')
  if (glitch.chromaticAberrationEnabled) on('chromatic')
  if (glitch.vhsTrackingEnabled) on('vhs')
  if (glitch.lensDistortionEnabled) on('lens')
  if (glitch.ditherEnabled) on('dither')
  if (glitch.posterizeEnabled) on('posterize')
  if (glitch.staticDisplacementEnabled) on('static_displace')
  if (glitch.colorGradeEnabled) on('color_grade')
  if (glitch.feedbackLoopEnabled) on('feedback')
  if (ascii.enabled) on('ascii')
  if (stipple.enabled) on('stipple')
  if (acid.dotsEnabled) on('acid_dots')
  if (acid.glyphEnabled) on('acid_glyph')
  if (acid.iconsEnabled) on('acid_icons')
  if (acid.contourEnabled) on('acid_contour')
  if (acid.decompEnabled) on('acid_decomp')
  if (acid.mirrorEnabled) on('acid_mirror')
  if (acid.sliceEnabled) on('acid_slice')
  if (acid.thGridEnabled) on('acid_thgrid')
  if (acid.cloudEnabled) on('acid_cloud')
  if (acid.ledEnabled) on('acid_led')
  if (acid.slitEnabled) on('acid_slit')
  if (acid.voronoiEnabled) on('acid_voronoi')
  return events
}

/**
 * Start/stop recording (moved from CanvasTransportBar). Capture itself stays in
 * useRecordingCapture, which reacts to recordingStore.isRecording.
 */
export function useRecordingControl(): { isRecording: boolean; canRecord: boolean; toggle: () => void } {
  const isRecording = useRecordingStore((s) => s.isRecording)
  const canRecord = useMediaStore((s) => s.source !== 'none')

  const toggle = useCallback(() => {
    const rec = useRecordingStore.getState()
    if (rec.isRecording) {
      rec.stopRecording()
    } else if (useMediaStore.getState().source !== 'none') {
      rec.startRecording(initialAutomationEvents())
    }
  }, [])

  return { isRecording, canRecord, toggle }
}
