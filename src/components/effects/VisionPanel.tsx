import { useState } from 'react'
import { Panel } from '../ui/Panel'
import { Slider } from '../ui/Slider'
import { Toggle } from '../ui/Toggle'
import {
  useDetectionStore,
  useLandmarksStore,
  useDetectionOverlayStore,
  usePointNetworkStore,
  useAsciiRenderStore,
  useStippleStore,
} from '../../stores/visionStores'

type VisionTab = 'detect' | 'landmarks' | 'overlay' | 'network' | 'ascii' | 'stipple'

export function VisionPanel() {
  const [collapsed, setCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState<VisionTab>('detect')

  const detection = useDetectionStore()
  const landmarks = useLandmarksStore()
  const overlay = useDetectionOverlayStore()
  const network = usePointNetworkStore()
  const ascii = useAsciiRenderStore()
  const stipple = useStippleStore()

  const tabs: { key: VisionTab; label: string }[] = [
    { key: 'detect', label: 'DETECT' },
    { key: 'landmarks', label: 'POINTS' },
    { key: 'overlay', label: 'BOXES' },
    { key: 'network', label: 'GRAPH' },
    { key: 'ascii', label: 'ASCII' },
    { key: 'stipple', label: 'DOTS' },
  ]

  return (
    <Panel
      title="ML VISION"
      collapsed={collapsed}
      onToggleCollapse={() => setCollapsed(!collapsed)}
    >
      {/* Tab navigation */}
      <div className="flex flex-wrap gap-1 border-b border-muted pb-2 mb-2">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`px-2 py-1 text-xs uppercase ${
              activeTab === tab.key
                ? 'bg-accent-yellow text-base-dark'
                : 'text-muted hover:text-base-light'
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Detection controls */}
      {activeTab === 'detect' && (
        <div className="flex flex-col gap-3">
          <Toggle
            label="OBJECT DETECTION"
            pressed={detection.enabled}
            onPressedChange={detection.setEnabled}
          />
          {detection.enabled && (
            <>
              <div className="text-xs text-muted">
                {detection.modelLoaded ? 'Model loaded' : 'Loading model...'}
              </div>
              <Slider
                label="MIN CONFIDENCE"
                value={detection.minConfidence}
                min={0.1}
                max={0.9}
                onChange={detection.setMinConfidence}
              />
              <Slider
                label="MAX DETECTIONS"
                value={detection.maxDetections}
                min={1}
                max={20}
                step={1}
                onChange={detection.setMaxDetections}
              />
              {detection.detections.length > 0 && (
                <div className="text-xs text-accent-yellow">
                  Found: {detection.detections.map(d => d.label).join(', ')}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Landmark controls */}
      {activeTab === 'landmarks' && (
        <div className="flex flex-col gap-3">
          <Toggle
            label="LANDMARK DETECTION"
            pressed={landmarks.enabled}
            onPressedChange={landmarks.setEnabled}
          />
          {landmarks.enabled && (
            <>
              <div className="flex flex-wrap gap-1">
                {(['face', 'hands', 'pose', 'holistic'] as const).map(mode => (
                  <button
                    key={mode}
                    className={`px-2 py-1 text-xs uppercase border ${
                      landmarks.currentMode === mode
                        ? 'bg-accent-yellow text-base-dark border-accent-yellow'
                        : 'border-muted text-muted hover:border-base-light hover:text-base-light'
                    }`}
                    onClick={() => landmarks.setCurrentMode(mode)}
                  >
                    {mode === 'holistic' ? 'ALL' : mode}
                  </button>
                ))}
              </div>
              <Slider
                label="DETECTION CONF"
                value={landmarks.minDetectionConfidence}
                min={0.1}
                max={0.9}
                onChange={landmarks.setMinDetectionConfidence}
              />
              <div className="text-xs text-muted">
                {landmarks.modelLoaded ? 'Models loaded' : 'Loading models...'}
              </div>
            </>
          )}
        </div>
      )}

      {/* Detection overlay controls */}
      {activeTab === 'overlay' && (
        <div className="flex flex-col gap-3">
          <Toggle
            label="BOUNDING BOXES"
            pressed={overlay.enabled}
            onPressedChange={overlay.setEnabled}
          />
          {overlay.enabled && (
            <>
              <div className="flex flex-wrap gap-1">
                {(['solid', 'dashed', 'corners'] as const).map(style => (
                  <button
                    key={style}
                    className={`px-2 py-1 text-xs uppercase border ${
                      overlay.params.boxStyle === style
                        ? 'bg-accent-yellow text-base-dark border-accent-yellow'
                        : 'border-muted text-muted hover:border-base-light hover:text-base-light'
                    }`}
                    onClick={() => overlay.updateParams({ boxStyle: style })}
                  >
                    {style}
                  </button>
                ))}
              </div>
              <Slider
                label="LINE WIDTH"
                value={overlay.params.boxLineWidth}
                min={1}
                max={6}
                step={1}
                onChange={(v) => overlay.updateParams({ boxLineWidth: v })}
              />
              <Toggle
                label="SHOW LABELS"
                pressed={overlay.params.showLabels}
                onPressedChange={(v) => overlay.updateParams({ showLabels: v })}
              />
              <Toggle
                label="GLITCH LABELS"
                pressed={overlay.params.glitchLabels}
                onPressedChange={(v) => overlay.updateParams({ glitchLabels: v })}
              />
            </>
          )}
        </div>
      )}

      {/* Point network controls */}
      {activeTab === 'network' && (
        <div className="flex flex-col gap-3">
          <Toggle
            label="POINT NETWORK"
            pressed={network.enabled}
            onPressedChange={network.setEnabled}
          />
          {network.enabled && (
            <>
              <Toggle
                label="SHOW POINTS"
                pressed={network.params.showPoints}
                onPressedChange={(v) => network.updateParams({ showPoints: v })}
              />
              <Toggle
                label="SHOW LINES"
                pressed={network.params.showLines}
                onPressedChange={(v) => network.updateParams({ showLines: v })}
              />
              <Slider
                label="POINT SIZE"
                value={network.params.pointRadius}
                min={1}
                max={10}
                onChange={(v) => network.updateParams({ pointRadius: v })}
              />
              <Slider
                label="LINE CURVE"
                value={network.params.lineCurve}
                min={0}
                max={1}
                onChange={(v) => network.updateParams({ lineCurve: v })}
              />
              <Slider
                label="MAX DISTANCE"
                value={network.params.maxDistance}
                min={0.05}
                max={0.5}
                onChange={(v) => network.updateParams({ maxDistance: v })}
              />
              <Toggle
                label="SHOW LABELS"
                pressed={network.params.showLabels}
                onPressedChange={(v) => network.updateParams({ showLabels: v })}
              />
            </>
          )}
        </div>
      )}

      {/* ASCII render controls */}
      {activeTab === 'ascii' && (
        <div className="flex flex-col gap-3">
          <Toggle
            label="ASCII RENDER"
            pressed={ascii.enabled}
            onPressedChange={ascii.setEnabled}
          />
          {ascii.enabled && (
            <>
              <div className="flex flex-wrap gap-1">
                {(['standard', 'matrix', 'blocks', 'braille'] as const).map(mode => (
                  <button
                    key={mode}
                    className={`px-2 py-1 text-xs uppercase border ${
                      ascii.params.mode === mode
                        ? 'bg-accent-yellow text-base-dark border-accent-yellow'
                        : 'border-muted text-muted hover:border-base-light hover:text-base-light'
                    }`}
                    onClick={() => ascii.updateParams({ mode })}
                  >
                    {mode.slice(0, 4)}
                  </button>
                ))}
              </div>
              <Slider
                label="FONT SIZE"
                value={ascii.params.fontSize}
                min={6}
                max={20}
                step={1}
                onChange={(v) => ascii.updateParams({ fontSize: v })}
              />
              <Slider
                label="RESOLUTION"
                value={ascii.params.resolution}
                min={4}
                max={16}
                step={1}
                onChange={(v) => ascii.updateParams({ resolution: v })}
              />
              <Slider
                label="CONTRAST"
                value={ascii.params.contrast}
                min={0.5}
                max={2}
                onChange={(v) => ascii.updateParams({ contrast: v })}
              />
              <Toggle
                label="MASK TO DETECTIONS"
                pressed={ascii.params.maskToDetections}
                onPressedChange={(v) => ascii.updateParams({ maskToDetections: v })}
              />
            </>
          )}
        </div>
      )}

      {/* Stipple controls */}
      {activeTab === 'stipple' && (
        <div className="flex flex-col gap-3">
          <Toggle
            label="STIPPLE EFFECT"
            pressed={stipple.enabled}
            onPressedChange={stipple.setEnabled}
          />
          {stipple.enabled && (
            <>
              <Slider
                label="PARTICLE SIZE"
                value={stipple.params.particleSize}
                min={1}
                max={8}
                onChange={(v) => stipple.updateParams({ particleSize: v })}
              />
              <Slider
                label="DENSITY"
                value={stipple.params.density}
                min={0.1}
                max={3}
                onChange={(v) => stipple.updateParams({ density: v })}
              />
              <Slider
                label="THRESHOLD"
                value={stipple.params.brightnessThreshold}
                min={0}
                max={1}
                onChange={(v) => stipple.updateParams({ brightnessThreshold: v })}
              />
              <Toggle
                label="INVERT"
                pressed={stipple.params.invertBrightness}
                onPressedChange={(v) => stipple.updateParams({ invertBrightness: v })}
              />
              <Toggle
                label="BREATHE"
                pressed={stipple.params.breathe}
                onPressedChange={(v) => stipple.updateParams({ breathe: v })}
              />
            </>
          )}
        </div>
      )}
    </Panel>
  )
}
