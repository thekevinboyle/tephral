import { useState } from 'react'
import {
  useContourStore,
  type DetectionMode,
  type FadeMode,
  type StylePreset
} from '../../stores/contourStore'

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
        <span className="text-gray-400">{open ? '-' : '+'}</span>
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
      <span className="text-[13px] text-gray-500 w-20 shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1 accent-lime-500"
      />
      <span className="text-[13px] text-gray-600 w-10 text-right tabular-nums">
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
      <span className="text-[13px] text-gray-500">{label}</span>
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
      <span className="text-[13px] text-gray-500 w-20 shrink-0">{label}</span>
      <div className="flex-1 flex gap-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex-1 px-2 py-1 text-[12px] rounded transition-colors ${
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
      <span className="text-[13px] text-gray-500 w-20 shrink-0">{label}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-6 h-6 rounded border border-gray-200 cursor-pointer"
      />
      <span className="text-[13px] text-gray-400">{value}</span>
    </div>
  )
}

interface Props {
  effectId: string
  onClose: () => void
}

export function EffectParameterEditor({ effectId, onClose }: Props) {
  const { enabled, params, setEnabled, updateParams, applyPreset } = useContourStore()

  if (effectId !== 'contour') {
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
          <span className="text-xs font-medium">CONTOUR</span>
          <span className="text-[13px] text-gray-400 capitalize">- {params.mode}</span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg"
        >
          x
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Enable toggle */}
        <div className="px-3 py-2 border-b border-gray-200">
          <ToggleRow
            label="Enable Contour"
            checked={enabled}
            onChange={setEnabled}
          />
        </div>

        {/* Presets */}
        <div className="px-3 py-2 border-b border-gray-200">
          <div className="text-[13px] text-gray-500 mb-2">Style Presets</div>
          <div className="flex gap-1">
            {(['technical', 'neon', 'brush', 'minimal'] as StylePreset[]).map((preset) => (
              <button
                key={preset}
                onClick={() => applyPreset(preset)}
                className="flex-1 px-2 py-1.5 text-[13px] bg-gray-100 hover:bg-gray-200 rounded capitalize"
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
              { value: 'edge', label: 'Edge' },
              { value: 'color', label: 'Color' },
              { value: 'motion', label: 'Motion' },
            ]}
            onChange={(mode) => updateParams({ mode })}
          />

          <SliderRow
            label="Threshold"
            value={params.threshold}
            min={0}
            max={1}
            onChange={(v) => updateParams({ threshold: v })}
          />

          <SliderRow
            label="Min Size"
            value={params.minSize}
            min={0.001}
            max={0.5}
            onChange={(v) => updateParams({ minSize: v })}
          />

          {params.mode === 'color' && (
            <>
              <ColorRow
                label="Target Color"
                value={params.targetColor}
                onChange={(v) => updateParams({ targetColor: v })}
              />
              <SliderRow
                label="Color Range"
                value={params.colorRange}
                min={0}
                max={1}
                onChange={(v) => updateParams({ colorRange: v })}
              />
            </>
          )}
        </CollapsibleSection>

        {/* Smoothing */}
        <CollapsibleSection title="Smoothing">
          <SliderRow
            label="Position"
            value={params.positionSmoothing}
            min={0}
            max={1}
            onChange={(v) => updateParams({ positionSmoothing: v })}
          />
          <SliderRow
            label="Simplify"
            value={params.contourSimplification}
            min={0}
            max={1}
            onChange={(v) => updateParams({ contourSimplification: v })}
          />
        </CollapsibleSection>

        {/* Line Style */}
        <CollapsibleSection title="Line Style">
          <SliderRow
            label="Width"
            value={params.baseWidth}
            min={1}
            max={10}
            step={0.5}
            onChange={(v) => updateParams({ baseWidth: v })}
            format={(v) => `${v.toFixed(1)}px`}
          />
          <SliderRow
            label="Velocity"
            value={params.velocityResponse}
            min={0}
            max={1}
            onChange={(v) => updateParams({ velocityResponse: v })}
          />
          <SliderRow
            label="Taper"
            value={params.taperAmount}
            min={0}
            max={1}
            onChange={(v) => updateParams({ taperAmount: v })}
          />
          <ColorRow
            label="Color"
            value={params.color}
            onChange={(v) => updateParams({ color: v })}
          />
        </CollapsibleSection>

        {/* Glow */}
        <CollapsibleSection title="Glow" defaultOpen={false}>
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
        </CollapsibleSection>

        {/* Trails */}
        <CollapsibleSection title="Trails" defaultOpen={false}>
          <SliderRow
            label="Length"
            value={params.trailLength}
            min={0}
            max={5}
            step={0.1}
            onChange={(v) => updateParams({ trailLength: v })}
            format={(v) => `${v.toFixed(1)}s`}
          />
          <SelectRow<FadeMode>
            label="Mode"
            value={params.fadeMode}
            options={[
              { value: 'fade', label: 'Fade' },
              { value: 'fixed', label: 'Fixed' },
              { value: 'persistent', label: 'Persist' },
            ]}
            onChange={(v) => updateParams({ fadeMode: v })}
          />
        </CollapsibleSection>
      </div>
    </div>
  )
}
