import { useState } from 'react'
import { MinimalSlider } from '../ui/MinimalSlider'
import { MinimalToggle } from '../ui/MinimalToggle'
import {
  useDetectionStore,
  useLandmarksStore,
  useDetectionOverlayStore,
  usePointNetworkStore,
  useAsciiRenderStore,
  useStippleStore,
} from '../../stores/visionStores'

type VisionMode = 'detect' | 'landmarks' | 'overlay' | 'network' | 'ascii' | 'stipple'

const modes: { id: VisionMode; label: string }[] = [
  { id: 'detect', label: 'Detect' },
  { id: 'landmarks', label: 'Points' },
  { id: 'overlay', label: 'Boxes' },
  { id: 'network', label: 'Graph' },
  { id: 'ascii', label: 'ASCII' },
  { id: 'stipple', label: 'Dots' },
]

export function VisionPanel() {
  const [activeMode, setActiveMode] = useState<VisionMode>('detect')

  const detection = useDetectionStore()
  const landmarks = useLandmarksStore()
  const overlay = useDetectionOverlayStore()
  const network = usePointNetworkStore()
  const ascii = useAsciiRenderStore()
  const stipple = useStippleStore()

  return (
    <div className="flex flex-col gap-4">
      {/* Mode selector */}
      <div className="flex flex-wrap gap-1">
        {modes.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveMode(id)}
            className={`px-3 py-1.5 text-xs uppercase transition-colors ${
              activeMode === id
                ? 'bg-accent-yellow text-base-dark'
                : 'text-muted hover:text-base-light'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Detection controls */}
      {activeMode === 'detect' && (
        <div className="flex flex-col gap-2">
          <MinimalToggle
            label="Object Detection"
            pressed={detection.enabled}
            onPressedChange={detection.setEnabled}
          />
          {detection.enabled && (
            <>
              <MinimalSlider
                label="Confidence"
                value={detection.minConfidence}
                min={0.1}
                max={0.9}
                onChange={detection.setMinConfidence}
              />
              <MinimalSlider
                label="Max Items"
                value={detection.maxDetections}
                min={1}
                max={20}
                step={1}
                onChange={detection.setMaxDetections}
                formatValue={(v) => v.toFixed(0)}
              />
            </>
          )}
        </div>
      )}

      {/* Landmarks controls */}
      {activeMode === 'landmarks' && (
        <div className="flex flex-col gap-2">
          <MinimalToggle
            label="Landmark Detection"
            pressed={landmarks.enabled}
            onPressedChange={(enabled) => {
              landmarks.setEnabled(enabled)
              // Auto-select face mode when enabling if no mode selected
              if (enabled && landmarks.currentMode === 'off') {
                landmarks.setCurrentMode('face')
              }
            }}
          />
          {landmarks.enabled && (
            <>
              <div className="flex gap-1 mt-2">
                {(['face', 'hands', 'pose', 'holistic'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => landmarks.setCurrentMode(mode)}
                    className={`px-2 py-1 text-xs uppercase transition-colors ${
                      landmarks.currentMode === mode
                        ? 'bg-accent-yellow text-base-dark'
                        : 'text-muted hover:text-base-light'
                    }`}
                  >
                    {mode === 'holistic' ? 'ALL' : mode}
                  </button>
                ))}
              </div>
              <MinimalSlider
                label="Confidence"
                value={landmarks.minDetectionConfidence}
                min={0.1}
                max={0.9}
                onChange={landmarks.setMinDetectionConfidence}
              />
            </>
          )}
        </div>
      )}

      {/* Overlay controls */}
      {activeMode === 'overlay' && (
        <div className="flex flex-col gap-2">
          <MinimalToggle
            label="Bounding Boxes"
            pressed={overlay.enabled}
            onPressedChange={(enabled) => {
              overlay.setEnabled(enabled)
              // Auto-enable detection when overlay is turned on
              if (enabled && !detection.enabled) {
                detection.setEnabled(true)
              }
            }}
          />
          {!detection.enabled && overlay.enabled && (
            <div className="text-xs text-accent-yellow">Enable Object Detection first</div>
          )}
          {overlay.enabled && (
            <>
              <div className="flex gap-1 mt-2">
                {(['solid', 'dashed', 'corners'] as const).map(style => (
                  <button
                    key={style}
                    onClick={() => overlay.updateParams({ boxStyle: style })}
                    className={`px-2 py-1 text-xs uppercase transition-colors ${
                      overlay.params.boxStyle === style
                        ? 'bg-accent-yellow text-base-dark'
                        : 'text-muted hover:text-base-light'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
              <MinimalSlider
                label="Line Width"
                value={overlay.params.boxLineWidth}
                min={1}
                max={6}
                step={1}
                onChange={(v) => overlay.updateParams({ boxLineWidth: v })}
                formatValue={(v) => v.toFixed(0)}
              />
              <MinimalToggle
                label="Show Labels"
                pressed={overlay.params.showLabels}
                onPressedChange={(v) => overlay.updateParams({ showLabels: v })}
              />
            </>
          )}
        </div>
      )}

      {/* Network controls */}
      {activeMode === 'network' && (
        <div className="flex flex-col gap-2">
          <MinimalToggle
            label="Point Network"
            pressed={network.enabled}
            onPressedChange={(enabled) => {
              network.setEnabled(enabled)
              // Auto-enable landmarks when network is turned on
              if (enabled && !landmarks.enabled) {
                landmarks.setEnabled(true)
                if (landmarks.currentMode === 'off') {
                  landmarks.setCurrentMode('face')
                }
              }
            }}
          />
          {!landmarks.enabled && network.enabled && (
            <div className="text-xs text-accent-yellow">Enable Landmark Detection first</div>
          )}
          {network.enabled && (
            <>
              <MinimalToggle
                label="Show Points"
                pressed={network.params.showPoints}
                onPressedChange={(v) => network.updateParams({ showPoints: v })}
              />
              <MinimalToggle
                label="Show Lines"
                pressed={network.params.showLines}
                onPressedChange={(v) => network.updateParams({ showLines: v })}
              />
              <MinimalSlider
                label="Point Size"
                value={network.params.pointRadius}
                min={1}
                max={10}
                onChange={(v) => network.updateParams({ pointRadius: v })}
                formatValue={(v) => v.toFixed(0)}
              />
              <MinimalSlider
                label="Max Dist"
                value={network.params.maxDistance}
                min={0.05}
                max={0.5}
                onChange={(v) => network.updateParams({ maxDistance: v })}
              />
            </>
          )}
        </div>
      )}

      {/* ASCII controls */}
      {activeMode === 'ascii' && (
        <div className="flex flex-col gap-2">
          <MinimalToggle
            label="ASCII Render"
            pressed={ascii.enabled}
            onPressedChange={ascii.setEnabled}
          />
          {ascii.enabled && (
            <>
              <div className="flex gap-1 mt-2">
                {(['standard', 'matrix', 'blocks', 'braille'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => ascii.updateParams({ mode })}
                    className={`px-2 py-1 text-xs uppercase transition-colors ${
                      ascii.params.mode === mode
                        ? 'bg-accent-yellow text-base-dark'
                        : 'text-muted hover:text-base-light'
                    }`}
                  >
                    {mode.slice(0, 4)}
                  </button>
                ))}
              </div>
              <MinimalSlider
                label="Font Size"
                value={ascii.params.fontSize}
                min={6}
                max={20}
                step={1}
                onChange={(v) => ascii.updateParams({ fontSize: v })}
                formatValue={(v) => v.toFixed(0)}
              />
              <MinimalSlider
                label="Resolution"
                value={ascii.params.resolution}
                min={4}
                max={16}
                step={1}
                onChange={(v) => ascii.updateParams({ resolution: v })}
                formatValue={(v) => v.toFixed(0)}
              />
              <MinimalSlider
                label="Contrast"
                value={ascii.params.contrast}
                min={0.5}
                max={2}
                onChange={(v) => ascii.updateParams({ contrast: v })}
              />
              <MinimalToggle
                label="Mask to Detections"
                pressed={ascii.params.maskToDetections}
                onPressedChange={(v) => ascii.updateParams({ maskToDetections: v })}
              />
            </>
          )}
        </div>
      )}

      {/* Stipple controls */}
      {activeMode === 'stipple' && (
        <div className="flex flex-col gap-2">
          <MinimalToggle
            label="Stipple Effect"
            pressed={stipple.enabled}
            onPressedChange={stipple.setEnabled}
          />
          {stipple.enabled && (
            <>
              <MinimalSlider
                label="Size"
                value={stipple.params.particleSize}
                min={1}
                max={8}
                onChange={(v) => stipple.updateParams({ particleSize: v })}
                formatValue={(v) => v.toFixed(0)}
              />
              <MinimalSlider
                label="Density"
                value={stipple.params.density}
                min={0.1}
                max={3}
                onChange={(v) => stipple.updateParams({ density: v })}
              />
              <MinimalSlider
                label="Threshold"
                value={stipple.params.brightnessThreshold}
                min={0}
                max={1}
                onChange={(v) => stipple.updateParams({ brightnessThreshold: v })}
              />
              <MinimalToggle
                label="Invert"
                pressed={stipple.params.invertBrightness}
                onPressedChange={(v) => stipple.updateParams({ invertBrightness: v })}
              />
              <MinimalToggle
                label="Breathe"
                pressed={stipple.params.breathe}
                onPressedChange={(v) => stipple.updateParams({ breathe: v })}
              />
            </>
          )}
        </div>
      )}
    </div>
  )
}
