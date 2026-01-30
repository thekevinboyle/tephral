import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { useAsciiRenderStore } from '../../stores/asciiRenderStore'
import { useStippleStore } from '../../stores/stippleStore'
import { useLandmarksStore } from '../../stores/landmarksStore'
import { useContourStore } from '../../stores/contourStore'
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
  const contour = useContourStore()
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
    contour: contour.enabled,
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
            border: '1px solid var(--border)',
          }}
        />
        <span className="text-[14px] font-medium" style={{ color: 'var(--text-muted)' }}>
          In
        </span>
      </div>

      {/* Connector line */}
      <div
        className="flex-shrink-0 w-8 h-[2px] rounded-full"
        style={{ backgroundColor: 'var(--border)' }}
      />

      {/* Active effects */}
      {activeEffects.length === 0 ? (
        <div
          className="px-3 py-1 rounded-md"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
          }}
        >
          <span className="text-[14px] font-medium" style={{ color: 'var(--text-muted)' }}>
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
                backgroundColor: selectedEffectId === effect.id ? 'var(--bg-surface)' : 'var(--bg-surface)',
                border: selectedEffectId === effect.id
                  ? `1px solid ${effect.color}60`
                  : '1px solid var(--border)',
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
                className="text-[14px] font-medium transition-colors"
                style={{ color: selectedEffectId === effect.id ? '#1a1a1a' : 'var(--text-muted)' }}
              >
                {effect.label}
              </span>
            </button>

            {/* Connector to next */}
            {index < activeEffects.length - 1 && (
              <div
                className="flex-shrink-0 w-6 h-[2px] rounded-full"
                style={{ backgroundColor: 'var(--border)' }}
              />
            )}
          </div>
        ))
      )}

      {/* Final connector */}
      <div
        className="flex-shrink-0 w-8 h-[2px] rounded-full"
        style={{ backgroundColor: 'var(--border)' }}
      />

      {/* Output node */}
      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-full"
          style={{
            backgroundColor: '#e0e0e0',
            border: '1px solid var(--border)',
          }}
        />
        <span className="text-[14px] font-medium" style={{ color: 'var(--text-muted)' }}>
          Out
        </span>
      </div>
    </div>
  )
}
