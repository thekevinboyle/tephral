import { useCallback } from 'react'
import { HorizontalCrossfader } from './HorizontalCrossfader'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { useAsciiRenderStore } from '../../stores/asciiRenderStore'
import { useStippleStore } from '../../stores/stippleStore'
import { useLandmarksStore } from '../../stores/landmarksStore'
import { useContourStore } from '../../stores/contourStore'
import { useAcidStore } from '../../stores/acidStore'
import { useVisionTrackingStore } from '../../stores/visionTrackingStore'
import { useTextureOverlayStore } from '../../stores/textureOverlayStore'
import { useDataOverlayStore } from '../../stores/dataOverlayStore'
import { useStrandStore } from '../../stores/strandStore'
import { useMotionStore } from '../../stores/motionStore'

export function CrossfaderPanel() {
  const glitch = useGlitchEngineStore()
  const { bypassActive } = useGlitchEngineStore()
  const ascii = useAsciiRenderStore()
  const stipple = useStippleStore()
  const landmarks = useLandmarksStore()
  const contour = useContourStore()
  const acid = useAcidStore()
  const vision = useVisionTrackingStore()
  const textureOverlay = useTextureOverlayStore()
  const dataOverlay = useDataOverlayStore()
  const strand = useStrandStore()
  const motion = useMotionStore()

  // Clear all effects
  const handleClear = useCallback(() => {
    glitch.setRGBSplitEnabled(false)
    glitch.setBlockDisplaceEnabled(false)
    glitch.setScanLinesEnabled(false)
    glitch.setNoiseEnabled(false)
    glitch.setPixelateEnabled(false)
    glitch.setEdgeDetectionEnabled(false)
    glitch.setChromaticAberrationEnabled(false)
    glitch.setVHSTrackingEnabled(false)
    glitch.setLensDistortionEnabled(false)
    glitch.setDitherEnabled(false)
    glitch.setPosterizeEnabled(false)
    glitch.setStaticDisplacementEnabled(false)
    glitch.setColorGradeEnabled(false)
    glitch.setFeedbackLoopEnabled(false)
    ascii.setEnabled(false)
    stipple.setEnabled(false)
    contour.setEnabled(false)
    landmarks.setEnabled(false)
    landmarks.setCurrentMode('off')
    acid.setDotsEnabled(false)
    acid.setGlyphEnabled(false)
    acid.setIconsEnabled(false)
    acid.setContourEnabled(false)
    acid.setDecompEnabled(false)
    acid.setMirrorEnabled(false)
    acid.setSliceEnabled(false)
    acid.setThGridEnabled(false)
    acid.setCloudEnabled(false)
    acid.setLedEnabled(false)
    acid.setSlitEnabled(false)
    acid.setVoronoiEnabled(false)
    vision.setBrightEnabled(false)
    vision.setEdgeEnabled(false)
    vision.setColorEnabled(false)
    vision.setMotionEnabled(false)
    vision.setFaceEnabled(false)
    vision.setHandsEnabled(false)
    textureOverlay.setEnabled(false)
    dataOverlay.setEnabled(false)
    strand.setHandprintsEnabled(false)
    strand.setTarSpreadEnabled(false)
    strand.setTimefallEnabled(false)
    strand.setVoidOutEnabled(false)
    strand.setStrandWebEnabled(false)
    strand.setBridgeLinkEnabled(false)
    strand.setChiralPathEnabled(false)
    strand.setUmbilicalEnabled(false)
    strand.setOdradekEnabled(false)
    strand.setChiraliumEnabled(false)
    strand.setBeachStaticEnabled(false)
    strand.setDoomsEnabled(false)
    strand.setChiralCloudEnabled(false)
    strand.setBBPodEnabled(false)
    strand.setSeamEnabled(false)
    strand.setExtinctionEnabled(false)
    motion.setMotionExtractEnabled(false)
    motion.setEchoTrailEnabled(false)
    motion.setTimeSmearEnabled(false)
    motion.setFreezeMaskEnabled(false)
  }, [glitch, ascii, stipple, contour, landmarks, acid, vision, textureOverlay, dataOverlay, strand, motion])

  return (
    <div
      className="h-full flex flex-col rounded-sm"
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border)',
      }}
    >
      {/* A/B Crossfader */}
      <div className="flex-1 min-h-0 flex items-center">
        <div className="flex-1">
          <HorizontalCrossfader />
        </div>
      </div>

      {/* Control buttons */}
      <div
        className="flex-shrink-0 p-2 flex gap-2"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <button
          className="flex-1 h-7 text-[10px] uppercase tracking-wide rounded-sm transition-colors"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
          }}
          onClick={handleClear}
        >
          Clear
        </button>
        <button
          className="flex-1 h-7 text-[10px] uppercase tracking-wide rounded-sm transition-colors"
          style={{
            backgroundColor: bypassActive ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
            border: `1px solid ${bypassActive ? 'var(--accent)' : 'var(--border)'}`,
            color: bypassActive ? 'var(--accent)' : 'var(--text-muted)',
            boxShadow: bypassActive ? '0 0 8px var(--accent-glow)' : 'none',
          }}
          onClick={() => {
            const current = useGlitchEngineStore.getState().bypassActive
            useGlitchEngineStore.getState().setBypassActive(!current)
          }}
        >
          Bypass
        </button>
      </div>
    </div>
  )
}
