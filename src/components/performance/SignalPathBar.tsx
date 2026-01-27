import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { useAsciiRenderStore } from '../../stores/asciiRenderStore'
import { useStippleStore } from '../../stores/stippleStore'
import { useLandmarksStore } from '../../stores/landmarksStore'
import { useBlobDetectStore } from '../../stores/blobDetectStore'
import { useUIStore } from '../../stores/uiStore'
import { useRoutingStore } from '../../stores/routingStore'
import { EFFECTS } from '../../config/effects'

interface PathNode {
  id: string
  label: string
  color: string
  active: boolean
}

export function SignalPathBar() {
  const glitch = useGlitchEngineStore()
  const ascii = useAsciiRenderStore()
  const stipple = useStippleStore()
  const landmarks = useLandmarksStore()
  const blobDetect = useBlobDetectStore()
  const { selectedEffectId, setSelectedEffect } = useUIStore()
  const { effectOrder } = useRoutingStore()

  // Check each effect's enabled state
  const effectStates: Record<string, boolean> = {
    rgb_split: glitch.rgbSplitEnabled,
    block_displace: glitch.blockDisplaceEnabled,
    scan_lines: glitch.scanLinesEnabled,
    noise: glitch.noiseEnabled,
    pixelate: glitch.pixelateEnabled,
    edges: glitch.edgeDetectionEnabled,
    ascii: ascii.enabled && ascii.params.mode === 'standard',
    matrix: ascii.enabled && ascii.params.mode === 'matrix',
    stipple: stipple.enabled,
    blob_detect: blobDetect.enabled,
    face_mesh: landmarks.enabled && landmarks.currentMode === 'face',
    hands: landmarks.enabled && landmarks.currentMode === 'hands',
    pose: landmarks.enabled && landmarks.currentMode === 'pose',
    holistic: landmarks.enabled && landmarks.currentMode === 'holistic',
  }

  // Build effects map for quick lookup
  const effectsMap = new Map(EFFECTS.map(e => [e.id, e]))

  // Build list of active effects in custom order
  const activeEffects: PathNode[] = []
  effectOrder.forEach((effectId) => {
    if (effectStates[effectId]) {
      const effect = effectsMap.get(effectId)
      if (effect) {
        activeEffects.push({
          id: effect.id,
          label: effect.label,
          color: effect.color,
          active: true,
        })
      }
    }
  })

  return (
    <div className="h-full flex items-center px-4 gap-3">
      {/* Source node */}
      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-full"
          style={{
            backgroundColor: '#e0e0e0',
            border: '1px solid #d0d0d0',
          }}
        />
        <span className="text-[11px] font-medium" style={{ color: '#666666' }}>
          In
        </span>
      </div>

      {/* Connector line */}
      <div
        className="flex-shrink-0 w-8 h-[2px] rounded-full"
        style={{ backgroundColor: '#d0d0d0' }}
      />

      {/* Active effects */}
      {activeEffects.length === 0 ? (
        <div
          className="px-3 py-1 rounded-md"
          style={{
            backgroundColor: '#f5f5f5',
            border: '1px solid #d0d0d0',
          }}
        >
          <span className="text-[11px] font-medium" style={{ color: '#999999' }}>
            Bypass
          </span>
        </div>
      ) : (
        activeEffects.map((effect, index) => (
          <div key={effect.id} className="flex items-center gap-3">
            <button
              onClick={() => setSelectedEffect(effect.id)}
              className="flex items-center gap-2 px-2 py-1 rounded-md transition-colors"
              style={{
                backgroundColor: selectedEffectId === effect.id ? '#f5f5f5' : '#ffffff',
                border: selectedEffectId === effect.id
                  ? `1px solid ${effect.color}60`
                  : '1px solid #d0d0d0',
              }}
            >
              {/* LED indicator - only glow */}
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: effect.color,
                  boxShadow: `0 0 8px ${effect.color}`,
                }}
              />
              <span
                className="text-[11px] font-medium transition-colors"
                style={{ color: selectedEffectId === effect.id ? '#1a1a1a' : '#666666' }}
              >
                {effect.label}
              </span>
            </button>

            {/* Connector to next */}
            {index < activeEffects.length - 1 && (
              <div
                className="flex-shrink-0 w-6 h-[2px] rounded-full"
                style={{ backgroundColor: '#d0d0d0' }}
              />
            )}
          </div>
        ))
      )}

      {/* Final connector */}
      <div
        className="flex-shrink-0 w-8 h-[2px] rounded-full"
        style={{ backgroundColor: '#d0d0d0' }}
      />

      {/* Output node */}
      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-full"
          style={{
            backgroundColor: '#e0e0e0',
            border: '1px solid #d0d0d0',
          }}
        />
        <span className="text-[11px] font-medium" style={{ color: '#666666' }}>
          Out
        </span>
      </div>
    </div>
  )
}
