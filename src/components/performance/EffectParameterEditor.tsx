import { useState } from 'react'
import {
  useBlobDetectStore,
  type DetectionMode,
  type TrailMode,
  type BlobStyle,
  type ConnectStyle,
  type StylePreset
} from '../../stores/blobDetectStore'

interface CollapsibleSectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

function CollapsibleSection({ title, children, defaultOpen = true }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-gray-200">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-2 px-3 text-left hover:bg-gray-50"
      >
        <span className="text-xs font-medium uppercase text-gray-600">{title}</span>
        <span className="text-gray-400">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  )
}

interface SliderRowProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  format?: (value: number) => string
}

function SliderRow({ label, value, min, max, step = 0.01, onChange, format }: SliderRowProps) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-[10px] text-gray-500 w-20 shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1 accent-lime-500"
      />
      <span className="text-[10px] text-gray-600 w-10 text-right tabular-nums">
        {format ? format(value) : value.toFixed(2)}
      </span>
    </div>
  )
}

interface ToggleRowProps {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function ToggleRow({ label, checked, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[10px] text-gray-500">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={`w-8 h-4 rounded-full transition-colors ${
          checked ? 'bg-lime-500' : 'bg-gray-300'
        }`}
      >
        <div
          className={`w-3 h-3 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}

interface SelectRowProps<T extends string> {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}

function SelectRow<T extends string>({ label, value, options, onChange }: SelectRowProps<T>) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-[10px] text-gray-500 w-20 shrink-0">{label}</span>
      <div className="flex-1 flex gap-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex-1 px-2 py-1 text-[9px] rounded transition-colors ${
              value === opt.value
                ? 'bg-lime-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

interface ColorRowProps {
  label: string
  value: string
  onChange: (value: string) => void
}

function ColorRow({ label, value, onChange }: ColorRowProps) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-[10px] text-gray-500 w-20 shrink-0">{label}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-6 h-6 rounded border border-gray-200 cursor-pointer"
      />
      <span className="text-[10px] text-gray-400">{value}</span>
    </div>
  )
}

interface Props {
  effectId: string
  onClose: () => void
}

export function EffectParameterEditor({ effectId, onClose }: Props) {
  const { enabled, params, setEnabled, updateParams, setMode, applyPreset, clearTrails } = useBlobDetectStore()

  if (effectId !== 'blob_detect') {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm">
        No parameters for this effect
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">DETECT</span>
          <span className="text-[10px] text-gray-400 capitalize">· {params.mode}</span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg"
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Enable toggle */}
        <div className="px-3 py-2 border-b border-gray-200">
          <ToggleRow
            label="Enable Detection"
            checked={enabled}
            onChange={setEnabled}
          />
        </div>

        {/* Presets */}
        <div className="px-3 py-2 border-b border-gray-200">
          <div className="text-[10px] text-gray-500 mb-2">Style Presets</div>
          <div className="flex gap-1">
            {(['technical', 'neon', 'organic'] as StylePreset[]).map((preset) => (
              <button
                key={preset}
                onClick={() => applyPreset(preset)}
                className="flex-1 px-2 py-1.5 text-[10px] bg-gray-100 hover:bg-gray-200 rounded capitalize"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Detection Mode */}
        <CollapsibleSection title="Detection">
          <SelectRow<DetectionMode>
            label="Mode"
            value={params.mode}
            options={[
              { value: 'brightness', label: 'Bright' },
              { value: 'motion', label: 'Motion' },
              { value: 'color', label: 'Color' },
            ]}
            onChange={setMode}
          />

          {params.mode === 'brightness' && (
            <>
              <SliderRow
                label="Threshold"
                value={params.threshold}
                min={0}
                max={1}
                onChange={(v) => updateParams({ threshold: v })}
              />
              <ToggleRow
                label="Invert"
                checked={params.invert}
                onChange={(v) => updateParams({ invert: v })}
              />
            </>
          )}

          {params.mode === 'motion' && (
            <>
              <SliderRow
                label="Sensitivity"
                value={params.sensitivity}
                min={0}
                max={1}
                onChange={(v) => updateParams({ sensitivity: v })}
              />
              <SliderRow
                label="Decay"
                value={params.decayRate}
                min={0}
                max={1}
                onChange={(v) => updateParams({ decayRate: v })}
              />
            </>
          )}

          {params.mode === 'color' && (
            <>
              <SliderRow
                label="Target Hue"
                value={params.targetHue}
                min={0}
                max={360}
                step={1}
                onChange={(v) => updateParams({ targetHue: v })}
                format={(v) => `${Math.round(v)}°`}
              />
              <SliderRow
                label="Hue Range"
                value={params.hueRange}
                min={0}
                max={180}
                step={1}
                onChange={(v) => updateParams({ hueRange: v })}
                format={(v) => `±${Math.round(v)}°`}
              />
              <SliderRow
                label="Min Sat"
                value={params.saturationMin}
                min={0}
                max={1}
                onChange={(v) => updateParams({ saturationMin: v })}
              />
            </>
          )}

          <SliderRow
            label="Min Size"
            value={params.minSize}
            min={0.001}
            max={0.2}
            onChange={(v) => updateParams({ minSize: v })}
          />
          <SliderRow
            label="Max Size"
            value={params.maxSize}
            min={0.1}
            max={1}
            onChange={(v) => updateParams({ maxSize: v })}
          />
          <SliderRow
            label="Max Blobs"
            value={params.maxBlobs}
            min={1}
            max={50}
            step={1}
            onChange={(v) => updateParams({ maxBlobs: v })}
            format={(v) => Math.round(v).toString()}
          />
          <SliderRow
            label="Blur"
            value={params.blurAmount}
            min={0}
            max={20}
            step={1}
            onChange={(v) => updateParams({ blurAmount: v })}
            format={(v) => `${Math.round(v)}px`}
          />
        </CollapsibleSection>

        {/* Trails */}
        <CollapsibleSection title="Trails">
          <ToggleRow
            label="Enable Trails"
            checked={params.trailEnabled}
            onChange={(v) => updateParams({ trailEnabled: v })}
          />

          {params.trailEnabled && (
            <>
              <SelectRow<TrailMode>
                label="Mode"
                value={params.trailMode}
                options={[
                  { value: 'fade', label: 'Fade' },
                  { value: 'fixed', label: 'Fixed' },
                  { value: 'persistent', label: 'Persist' },
                ]}
                onChange={(v) => updateParams({ trailMode: v })}
              />

              {params.trailMode === 'fade' && (
                <SliderRow
                  label="Fade Time"
                  value={params.fadeTime}
                  min={0.5}
                  max={10}
                  onChange={(v) => updateParams({ fadeTime: v })}
                  format={(v) => `${v.toFixed(1)}s`}
                />
              )}

              {params.trailMode === 'fixed' && (
                <SliderRow
                  label="Length"
                  value={params.trailLength}
                  min={10}
                  max={500}
                  step={10}
                  onChange={(v) => updateParams({ trailLength: v })}
                  format={(v) => Math.round(v).toString()}
                />
              )}

              <SliderRow
                label="Line Width"
                value={params.lineWidth}
                min={1}
                max={10}
                step={0.5}
                onChange={(v) => updateParams({ lineWidth: v })}
                format={(v) => `${v.toFixed(1)}px`}
              />
              <ColorRow
                label="Line Color"
                value={params.lineColor}
                onChange={(v) => updateParams({ lineColor: v })}
              />
              <SliderRow
                label="Smoothness"
                value={params.lineSmoothness}
                min={0}
                max={1}
                onChange={(v) => updateParams({ lineSmoothness: v })}
              />
              <SliderRow
                label="Opacity"
                value={params.lineOpacity}
                min={0}
                max={1}
                onChange={(v) => updateParams({ lineOpacity: v })}
              />

              <button
                onClick={clearTrails}
                className="w-full mt-2 py-1.5 text-[10px] bg-red-50 text-red-600 hover:bg-red-100 rounded"
              >
                Clear Trails
              </button>
            </>
          )}
        </CollapsibleSection>

        {/* Blob Visuals */}
        <CollapsibleSection title="Blobs">
          <SelectRow<BlobStyle>
            label="Style"
            value={params.blobStyle}
            options={[
              { value: 'circle', label: 'Circle' },
              { value: 'box', label: 'Box' },
              { value: 'none', label: 'None' },
            ]}
            onChange={(v) => updateParams({ blobStyle: v })}
          />

          {params.blobStyle !== 'none' && (
            <>
              <ToggleRow
                label="Fill"
                checked={params.blobFill}
                onChange={(v) => updateParams({ blobFill: v })}
              />
              <ColorRow
                label="Color"
                value={params.blobColor}
                onChange={(v) => updateParams({ blobColor: v })}
              />
              <SliderRow
                label="Opacity"
                value={params.blobOpacity}
                min={0}
                max={1}
                onChange={(v) => updateParams({ blobOpacity: v })}
              />
              {!params.blobFill && (
                <SliderRow
                  label="Line Width"
                  value={params.blobLineWidth}
                  min={1}
                  max={6}
                  step={0.5}
                  onChange={(v) => updateParams({ blobLineWidth: v })}
                  format={(v) => `${v.toFixed(1)}px`}
                />
              )}
            </>
          )}
        </CollapsibleSection>

        {/* Glow */}
        <CollapsibleSection title="Glow" defaultOpen={false}>
          <ToggleRow
            label="Enable Glow"
            checked={params.glowEnabled}
            onChange={(v) => updateParams({ glowEnabled: v })}
          />

          {params.glowEnabled && (
            <>
              <SliderRow
                label="Intensity"
                value={params.glowIntensity}
                min={0}
                max={1}
                onChange={(v) => updateParams({ glowIntensity: v })}
              />
              <ColorRow
                label="Color"
                value={params.glowColor}
                onChange={(v) => updateParams({ glowColor: v })}
              />
            </>
          )}
        </CollapsibleSection>

        {/* Connections */}
        <CollapsibleSection title="Connections" defaultOpen={false}>
          <ToggleRow
            label="Connect Blobs"
            checked={params.connectEnabled}
            onChange={(v) => updateParams({ connectEnabled: v })}
          />

          {params.connectEnabled && (
            <>
              <SliderRow
                label="Max Distance"
                value={params.connectMaxDistance}
                min={0.05}
                max={0.5}
                onChange={(v) => updateParams({ connectMaxDistance: v })}
              />
              <ColorRow
                label="Color"
                value={params.connectColor}
                onChange={(v) => updateParams({ connectColor: v })}
              />
              <SliderRow
                label="Width"
                value={params.connectWidth}
                min={1}
                max={4}
                step={0.5}
                onChange={(v) => updateParams({ connectWidth: v })}
                format={(v) => `${v.toFixed(1)}px`}
              />
              <SelectRow<ConnectStyle>
                label="Style"
                value={params.connectStyle}
                options={[
                  { value: 'solid', label: 'Solid' },
                  { value: 'dashed', label: 'Dashed' },
                  { value: 'curved', label: 'Curved' },
                ]}
                onChange={(v) => updateParams({ connectStyle: v })}
              />
            </>
          )}
        </CollapsibleSection>
      </div>
    </div>
  )
}
