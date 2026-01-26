import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { useAsciiRenderStore } from '../../stores/asciiRenderStore'
import { useStippleStore } from '../../stores/stippleStore'
import { useLandmarksStore } from '../../stores/landmarksStore'
import { usePointNetworkStore } from '../../stores/pointNetworkStore'
import { useDetectionOverlayStore } from '../../stores/detectionOverlayStore'
import { useUIStore } from '../../stores/uiStore'
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
  const network = usePointNetworkStore()
  const overlay = useDetectionOverlayStore()
  const { selectedEffectId, setSelectedEffect } = useUIStore()

  // Build list of active effects in order
  const activeEffects: PathNode[] = []

  // Check each effect and add if active
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
    detect_boxes: overlay.enabled,
    point_network: network.enabled,
    face_mesh: landmarks.enabled && landmarks.currentMode === 'face',
    hands: landmarks.enabled && landmarks.currentMode === 'hands',
    pose: landmarks.enabled && landmarks.currentMode === 'pose',
    holistic: landmarks.enabled && landmarks.currentMode === 'holistic',
  }

  EFFECTS.forEach((effect) => {
    if (effectStates[effect.id]) {
      activeEffects.push({
        id: effect.id,
        label: effect.label,
        color: effect.color,
        active: true,
      })
    }
  })

  return (
    <div className="h-full bg-[#0a0a0a] border-b border-[#222] flex items-center px-4 gap-2">
      {/* Source node */}
      <div className="flex items-center gap-2">
        <div
          className="w-2 h-2 rounded-full bg-muted"
          style={{ boxShadow: '0 0 4px rgba(255,255,255,0.2)' }}
        />
        <span className="text-[9px] uppercase tracking-wider text-muted">SRC</span>
      </div>

      {/* Connector */}
      <div className="flex-shrink-0 w-6 h-px bg-muted/30" />

      {/* Active effects */}
      {activeEffects.length === 0 ? (
        <span className="text-[9px] text-muted/50 italic">no effects</span>
      ) : (
        activeEffects.map((effect, index) => (
          <div key={effect.id} className="flex items-center gap-2">
            <button
              onClick={() => setSelectedEffect(effect.id)}
              className="flex items-center gap-1.5 group"
            >
              <div
                className={`w-2 h-2 rounded-full transition-all ${
                  selectedEffectId === effect.id ? 'ring-2 ring-offset-1 ring-offset-[#0a0a0a]' : ''
                }`}
                style={{
                  backgroundColor: effect.color,
                  boxShadow: `0 0 8px ${effect.color}`,
                  // @ts-expect-error ring color via CSS custom property
                  '--tw-ring-color': effect.color,
                }}
              />
              <span
                className="text-[9px] uppercase tracking-wider transition-colors"
                style={{ color: selectedEffectId === effect.id ? effect.color : 'var(--color-muted)' }}
              >
                {effect.label}
              </span>
            </button>

            {/* Connector to next */}
            {index < activeEffects.length - 1 && (
              <div
                className="flex-shrink-0 w-6 h-px"
                style={{ backgroundColor: effect.color, opacity: 0.5 }}
              />
            )}
          </div>
        ))
      )}

      {/* Final connector */}
      <div className="flex-shrink-0 w-6 h-px bg-muted/30" />

      {/* Output node */}
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full border border-muted/50" />
        <span className="text-[9px] uppercase tracking-wider text-muted">OUT</span>
      </div>
    </div>
  )
}
