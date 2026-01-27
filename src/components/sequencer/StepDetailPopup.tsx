import { useCallback, useRef, useEffect, useState } from 'react'
import { useSequencerStore, type Step, type RatchetDivision, type VelocityCurve } from '../../stores/sequencerStore'

interface StepDetailPopupProps {
  trackId: string
  stepIndex: number
  onClose: () => void
}

const RATCHET_OPTIONS: RatchetDivision[] = [1, 2, 3, 4, 6, 8]
const VELOCITY_CURVES: { value: VelocityCurve; label: string; icon: string }[] = [
  { value: 'up', label: 'Ramp Up', icon: '/' },
  { value: 'down', label: 'Ramp Down', icon: '\\' },
  { value: 'flat', label: 'Flat', icon: '-' },
  { value: 'triangle', label: 'Triangle', icon: '/\\' },
]

// Clipboard for copy/paste
let stepClipboard: Step | null = null

export function StepDetailPopup({ trackId, stepIndex, onClose }: StepDetailPopupProps) {
  const { tracks, updateStep } = useSequencerStore()
  const popupRef = useRef<HTMLDivElement>(null)

  const track = tracks.find(t => t.id === trackId)
  const step = track?.steps[stepIndex]

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleUpdate = useCallback((updates: Partial<Step>) => {
    updateStep(trackId, stepIndex, updates)
  }, [trackId, stepIndex, updateStep])

  const handleCopy = useCallback(() => {
    if (step) {
      stepClipboard = { ...step }
    }
  }, [step])

  const handlePaste = useCallback(() => {
    if (stepClipboard) {
      handleUpdate(stepClipboard)
    }
  }, [handleUpdate])

  const handleReset = useCallback(() => {
    handleUpdate({
      probability: 1,
      gateLength: 1,
      gateLengthVariation: 0,
      variationRange: 0.5,
      ratchetDivision: 1,
      ratchetProbability: 1,
      velocityCurve: 'flat',
      timingSkew: 0,
    })
  }, [handleUpdate])

  if (!track || !step) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
      <div
        ref={popupRef}
        className="w-64 rounded-lg shadow-xl"
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #d0d0d0',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{ borderBottom: '1px solid #e5e5e5' }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: track.color }}
            />
            <span className="text-[11px] font-semibold" style={{ color: '#333' }}>
              Step {stepIndex + 1}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-100"
            style={{ color: '#999' }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-3 space-y-3">
          {/* Probability */}
          <SliderRow
            label="Probability"
            value={step.probability}
            min={0}
            max={1}
            onChange={(v) => handleUpdate({ probability: v })}
            format={(v) => `${Math.round(v * 100)}%`}
            color={track.color}
          />

          <div style={{ borderTop: '1px solid #e5e5e5', paddingTop: '12px' }}>
            {/* Gate Length */}
            <SliderRow
              label="Gate Length"
              value={step.gateLength}
              min={0}
              max={1}
              onChange={(v) => handleUpdate({ gateLength: v })}
              format={(v) => `${Math.round(v * 100)}%`}
              color={track.color}
            />

            {/* Length Variation */}
            <SliderRow
              label="Length Variation"
              value={step.gateLengthVariation}
              min={0}
              max={1}
              onChange={(v) => handleUpdate({ gateLengthVariation: v })}
              format={(v) => `${Math.round(v * 100)}%`}
              color={track.color}
            />

            {/* Variation Range */}
            <SliderRow
              label="Variation Range"
              value={step.variationRange}
              min={0}
              max={1}
              onChange={(v) => handleUpdate({ variationRange: v })}
              format={(v) => `${Math.round(v * 100)}%`}
              color={track.color}
            />
          </div>

          <div style={{ borderTop: '1px solid #e5e5e5', paddingTop: '12px' }}>
            {/* Ratchet Division */}
            <div className="mb-2">
              <span className="text-[10px] uppercase" style={{ color: '#999' }}>
                Ratchet
              </span>
              <div className="flex gap-1 mt-1">
                {RATCHET_OPTIONS.map((div) => (
                  <button
                    key={div}
                    onClick={() => handleUpdate({ ratchetDivision: div })}
                    className="flex-1 h-6 text-[10px] rounded transition-colors"
                    style={{
                      backgroundColor: step.ratchetDivision === div ? track.color : '#f5f5f5',
                      color: step.ratchetDivision === div ? '#fff' : '#666',
                      border: '1px solid',
                      borderColor: step.ratchetDivision === div ? track.color : '#e5e5e5',
                    }}
                  >
                    {div === 1 ? 'Off' : div}
                  </button>
                ))}
              </div>
            </div>

            {/* Ratchet Probability */}
            <SliderRow
              label="Ratchet Prob"
              value={step.ratchetProbability}
              min={0}
              max={1}
              onChange={(v) => handleUpdate({ ratchetProbability: v })}
              format={(v) => `${Math.round(v * 100)}%`}
              color={track.color}
            />

            {/* Velocity Curve */}
            <div className="mb-2">
              <span className="text-[10px] uppercase" style={{ color: '#999' }}>
                Velocity Curve
              </span>
              <div className="flex gap-1 mt-1">
                {VELOCITY_CURVES.map(({ value, label, icon }) => (
                  <button
                    key={value}
                    onClick={() => handleUpdate({ velocityCurve: value })}
                    className="flex-1 h-6 text-[11px] font-mono rounded transition-colors"
                    style={{
                      backgroundColor: step.velocityCurve === value ? track.color : '#f5f5f5',
                      color: step.velocityCurve === value ? '#fff' : '#666',
                      border: '1px solid',
                      borderColor: step.velocityCurve === value ? track.color : '#e5e5e5',
                    }}
                    title={label}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Timing Skew */}
            <SliderRow
              label="Timing Skew"
              value={step.timingSkew}
              min={-50}
              max={50}
              onChange={(v) => handleUpdate({ timingSkew: v })}
              format={(v) => v > 0 ? `+${Math.round(v)}` : Math.round(v).toString()}
              color={track.color}
            />
          </div>
        </div>

        {/* Footer actions */}
        <div
          className="flex gap-2 px-3 py-2"
          style={{ borderTop: '1px solid #e5e5e5' }}
        >
          <button
            onClick={handleCopy}
            className="flex-1 h-7 text-[10px] font-medium rounded"
            style={{
              backgroundColor: '#f5f5f5',
              border: '1px solid #e5e5e5',
              color: '#666',
            }}
          >
            Copy
          </button>
          <button
            onClick={handlePaste}
            disabled={!stepClipboard}
            className="flex-1 h-7 text-[10px] font-medium rounded"
            style={{
              backgroundColor: stepClipboard ? '#f5f5f5' : '#fafafa',
              border: '1px solid #e5e5e5',
              color: stepClipboard ? '#666' : '#ccc',
              cursor: stepClipboard ? 'pointer' : 'not-allowed',
            }}
          >
            Paste
          </button>
          <button
            onClick={handleReset}
            className="flex-1 h-7 text-[10px] font-medium rounded"
            style={{
              backgroundColor: '#fff5f5',
              border: '1px solid #ffcccc',
              color: '#c44',
            }}
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  )
}

interface SliderRowProps {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  format?: (value: number) => string
  color: string
}

function SliderRow({ label, value, min, max, onChange, format, color }: SliderRowProps) {
  const percentage = ((value - min) / (max - min)) * 100

  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-[10px] w-20 flex-shrink-0" style={{ color: '#999' }}>
        {label}
      </span>
      <div className="flex-1 relative h-4 flex items-center">
        <div
          className="absolute inset-x-0 h-1 rounded-full"
          style={{ backgroundColor: '#e5e5e5' }}
        />
        <div
          className="absolute left-0 h-1 rounded-full"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={(max - min) / 100}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
      </div>
      <span className="text-[10px] w-10 text-right font-mono" style={{ color: '#666' }}>
        {format ? format(value) : value.toFixed(2)}
      </span>
    </div>
  )
}
