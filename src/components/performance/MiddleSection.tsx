import { useCallback } from 'react'
import { HorizontalCrossfader } from './HorizontalCrossfader'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { useAsciiRenderStore } from '../../stores/asciiRenderStore'
import { useStippleStore } from '../../stores/stippleStore'
import { useContourStore } from '../../stores/contourStore'
import { useLandmarksStore } from '../../stores/landmarksStore'
import { useAcidStore } from '../../stores/acidStore'
import { useVisionTrackingStore } from '../../stores/visionTrackingStore'
import { useStrandStore } from '../../stores/strandStore'
import { useMotionStore } from '../../stores/motionStore'
import { useTextureOverlayStore } from '../../stores/textureOverlayStore'
import { useDataOverlayStore } from '../../stores/dataOverlayStore'
import { Button } from '../ui/Button'

export function MiddleSection() {
  // Effect stores for Clear/Bypass
  const glitch = useGlitchEngineStore()
  const ascii = useAsciiRenderStore()
  const stipple = useStippleStore()
  const contour = useContourStore()
  const landmarks = useLandmarksStore()
  const acid = useAcidStore()
  const vision = useVisionTrackingStore()
  const strand = useStrandStore()
  const motion = useMotionStore()
  const textureOverlay = useTextureOverlayStore()
  const dataOverlay = useDataOverlayStore()

  const handleClear = useCallback(() => {
    // Clear glitch effects
    glitch.setRGBSplitEnabled(false)
    glitch.setChromaticAberrationEnabled(false)
    glitch.setPosterizeEnabled(false)
    glitch.setColorGradeEnabled(false)
    glitch.setBlockDisplaceEnabled(false)
    glitch.setStaticDisplacementEnabled(false)
    glitch.setPixelateEnabled(false)
    glitch.setLensDistortionEnabled(false)
    glitch.setScanLinesEnabled(false)
    glitch.setVHSTrackingEnabled(false)
    glitch.setNoiseEnabled(false)
    glitch.setDitherEnabled(false)
    glitch.setEdgeDetectionEnabled(false)
    glitch.setFeedbackLoopEnabled(false)
    // Clear vision effects
    ascii.setEnabled(false)
    stipple.setEnabled(false)
    contour.setEnabled(false)
    landmarks.setEnabled(false)
    landmarks.setCurrentMode('off')
    // Clear acid effects
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
    // Clear vision tracking effects
    vision.setBrightEnabled(false)
    vision.setEdgeEnabled(false)
    vision.setColorEnabled(false)
    vision.setMotionEnabled(false)
    vision.setFaceEnabled(false)
    vision.setHandsEnabled(false)
    // Clear overlay effects
    textureOverlay.setEnabled(false)
    dataOverlay.setEnabled(false)
    // Clear strand effects
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
    // Clear motion effects
    motion.setMotionExtractEnabled(false)
    motion.setEchoTrailEnabled(false)
    motion.setTimeSmearEnabled(false)
    motion.setFreezeMaskEnabled(false)
  }, [glitch, ascii, stipple, contour, landmarks, acid, vision, strand, motion, textureOverlay, dataOverlay])

  return (
    <div className="h-full flex items-center gap-2 px-3 panel-gradient-up">
      {/* Clear/Bypass buttons stacked */}
      <div className="flex flex-col gap-1 flex-shrink-0">
        <Button
          size="sm"
          onClick={handleClear}
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: '#f59e0b',
            color: '#f59e0b',
          }}
        >
          Clear
        </Button>
        <Button
          size="sm"
          onClick={() => glitch.setBypassActive(!glitch.bypassActive)}
          style={{
            backgroundColor: glitch.bypassActive ? '#ef4444' : 'var(--bg-elevated)',
            borderColor: '#ef4444',
            color: glitch.bypassActive ? '#fff' : '#ef4444',
            boxShadow: glitch.bypassActive ? '0 0 8px rgba(239, 68, 68, 0.5)' : 'none',
          }}
        >
          Bypass
        </Button>
      </div>
      {/* Crossfader */}
      <div className="flex-1">
        <HorizontalCrossfader />
      </div>
    </div>
  )
}
