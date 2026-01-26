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
    <div className="h-full flex items-center px-4 gap-3">
      {/* Source node */}
      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-full"
          style={{
            background: 'radial-gradient(ellipse at 30% 30%, #4a4d55 0%, #2a2d35 60%, #1a1d24 100%)',
            boxShadow: `
              inset 0 1px 2px rgba(255,255,255,0.1),
              0 0 8px rgba(99, 102, 241, 0.3),
              0 0 0 1px #2a2d35
            `,
          }}
        />
        <span className="text-[9px] uppercase tracking-wider text-[#6b7280] font-medium">IN</span>
      </div>

      {/* Connector line */}
      <div
        className="flex-shrink-0 w-8 h-[2px] rounded-full"
        style={{
          background: 'linear-gradient(90deg, #6366f1 0%, #4b5563 100%)',
          boxShadow: '0 0 4px rgba(99, 102, 241, 0.3)',
        }}
      />

      {/* Active effects */}
      {activeEffects.length === 0 ? (
        <div
          className="px-3 py-1 rounded-md"
          style={{
            background: 'linear-gradient(180deg, #1e2128 0%, #13151a 100%)',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)',
          }}
        >
          <span className="text-[9px] text-[#4b5563] uppercase tracking-wider">bypass</span>
        </div>
      ) : (
        activeEffects.map((effect, index) => (
          <div key={effect.id} className="flex items-center gap-3">
            <button
              onClick={() => setSelectedEffect(effect.id)}
              className="flex items-center gap-2 px-2 py-1 rounded-md transition-all"
              style={{
                background: selectedEffectId === effect.id
                  ? `linear-gradient(180deg, ${effect.color}20 0%, ${effect.color}10 100%)`
                  : 'linear-gradient(180deg, #1e2128 0%, #13151a 100%)',
                boxShadow: selectedEffectId === effect.id
                  ? `0 0 12px -2px ${effect.color}, 0 0 0 1px ${effect.color}50`
                  : 'inset 0 1px 2px rgba(0,0,0,0.3), 0 0 0 1px #2a2d35',
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: effect.color,
                  boxShadow: `0 0 8px ${effect.color}`,
                }}
              />
              <span
                className="text-[9px] uppercase tracking-wider font-medium transition-colors"
                style={{ color: selectedEffectId === effect.id ? effect.color : '#6b7280' }}
              >
                {effect.label}
              </span>
            </button>

            {/* Connector to next */}
            {index < activeEffects.length - 1 && (
              <div
                className="flex-shrink-0 w-6 h-[2px] rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${effect.color} 0%, ${activeEffects[index + 1]?.color || '#4b5563'} 100%)`,
                  boxShadow: `0 0 4px ${effect.color}40`,
                }}
              />
            )}
          </div>
        ))
      )}

      {/* Final connector */}
      <div
        className="flex-shrink-0 w-8 h-[2px] rounded-full"
        style={{
          background: activeEffects.length > 0
            ? `linear-gradient(90deg, ${activeEffects[activeEffects.length - 1]?.color || '#4b5563'} 0%, #6366f1 100%)`
            : 'linear-gradient(90deg, #4b5563 0%, #6366f1 100%)',
          boxShadow: '0 0 4px rgba(99, 102, 241, 0.3)',
        }}
      />

      {/* Output node */}
      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-full"
          style={{
            background: 'radial-gradient(ellipse at 30% 30%, #4a4d55 0%, #2a2d35 60%, #1a1d24 100%)',
            boxShadow: `
              inset 0 1px 2px rgba(255,255,255,0.1),
              0 0 8px rgba(99, 102, 241, 0.3),
              0 0 0 1px #2a2d35
            `,
          }}
        />
        <span className="text-[9px] uppercase tracking-wider text-[#6b7280] font-medium">OUT</span>
      </div>
    </div>
  )
}
