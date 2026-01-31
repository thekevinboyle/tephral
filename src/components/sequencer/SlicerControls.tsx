import { useSlicerStore } from '../../stores/slicerStore'
import { SliderRow } from '../performance/controls/SliderRow'

export function SlicerControls() {
  const {
    sliceCount,
    setSliceCount,
    grainSize,
    density,
    spray,
    jitter,
    rate,
    reverseProb,
    updateGrainParams,
    sliceProb,
    setSliceProb,
    freeze,
    setFreeze,
    outputMode,
    setOutputMode,
    wet,
    setWet,
    blendMode,
    setBlendMode,
    opacity,
    setOpacity,
  } = useSlicerStore()

  const sliceCounts: (4 | 8 | 16 | 32)[] = [4, 8, 16, 32]
  const outputModes: ('replace' | 'mix' | 'layer')[] = ['replace', 'mix', 'layer']
  const blendModes: ('normal' | 'multiply' | 'screen' | 'difference' | 'overlay')[] = [
    'normal',
    'multiply',
    'screen',
    'difference',
    'overlay',
  ]

  return (
    <div className="px-3 py-2 space-y-3">
      {/* Slices section */}
      <div>
        <h4
          className="text-[11px] uppercase tracking-wider mb-2"
          style={{ color: 'var(--text-muted)' }}
        >
          Slices
        </h4>
        <div className="flex gap-1">
          {sliceCounts.map((count) => (
            <button
              key={count}
              onClick={() => setSliceCount(count)}
              className="flex-1 h-7 text-[12px] font-medium rounded"
              style={{
                backgroundColor: sliceCount === count ? '#FF6B6B' : 'var(--bg-surface)',
                border: `1px solid ${sliceCount === count ? '#FF6B6B' : 'var(--border)'}`,
                color: sliceCount === count ? 'white' : 'var(--text-muted)',
              }}
            >
              {count}
            </button>
          ))}
        </div>
      </div>

      {/* Grain section */}
      <div>
        <h4
          className="text-[11px] uppercase tracking-wider mb-2"
          style={{ color: 'var(--text-muted)' }}
        >
          Grain
        </h4>
        <div className="space-y-1">
          <SliderRow
            label="Size"
            value={grainSize}
            min={10}
            max={500}
            step={10}
            onChange={(v) => updateGrainParams({ grainSize: v })}
            format={(v) => `${v}ms`}
            paramId="slicer.grainSize"
          />
          <SliderRow
            label="Density"
            value={density}
            min={1}
            max={8}
            step={1}
            onChange={(v) => updateGrainParams({ density: v })}
            format={(v) => v.toString()}
            paramId="slicer.density"
          />
          <SliderRow
            label="Spray"
            value={spray}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => updateGrainParams({ spray: v })}
            format={(v) => `${Math.round(v * 100)}%`}
            paramId="slicer.spray"
          />
          <SliderRow
            label="Jitter"
            value={jitter}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => updateGrainParams({ jitter: v })}
            format={(v) => `${Math.round(v * 100)}%`}
            paramId="slicer.jitter"
          />
          <SliderRow
            label="Rate"
            value={rate}
            min={0.25}
            max={4}
            step={0.25}
            onChange={(v) => updateGrainParams({ rate: v })}
            format={(v) => `${v}x`}
            paramId="slicer.rate"
          />
          <SliderRow
            label="Rev%"
            value={reverseProb}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => updateGrainParams({ reverseProb: v })}
            format={(v) => `${Math.round(v * 100)}%`}
            paramId="slicer.reverseProb"
          />
          <SliderRow
            label="Slice%"
            value={sliceProb}
            min={0}
            max={1}
            step={0.05}
            onChange={setSliceProb}
            format={(v) => `${Math.round(v * 100)}%`}
            paramId="slicer.sliceProb"
          />
        </div>
      </div>

      {/* Output section */}
      <div>
        <h4
          className="text-[11px] uppercase tracking-wider mb-2"
          style={{ color: 'var(--text-muted)' }}
        >
          Output
        </h4>
        <div className="flex gap-1 mb-2">
          {outputModes.map((mode) => (
            <button
              key={mode}
              onClick={() => setOutputMode(mode)}
              className="flex-1 h-7 text-[12px] font-medium rounded capitalize"
              style={{
                backgroundColor: outputMode === mode ? '#FF6B6B' : 'var(--bg-surface)',
                border: `1px solid ${outputMode === mode ? '#FF6B6B' : 'var(--border)'}`,
                color: outputMode === mode ? 'white' : 'var(--text-muted)',
              }}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Conditional controls based on output mode */}
        {outputMode === 'mix' && (
          <SliderRow
            label="Wet"
            value={wet}
            min={0}
            max={1}
            step={0.05}
            onChange={setWet}
            format={(v) => `${Math.round(v * 100)}%`}
            paramId="slicer.wet"
          />
        )}

        {outputMode === 'layer' && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 py-1.5">
              <span
                className="text-[14px] w-20 shrink-0"
                style={{ color: 'var(--text-muted)' }}
              >
                Blend
              </span>
              <select
                value={blendMode}
                onChange={(e) => setBlendMode(e.target.value as typeof blendMode)}
                className="flex-1 h-7 rounded text-[12px] px-2"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              >
                {blendModes.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </div>
            <SliderRow
              label="Opacity"
              value={opacity}
              min={0}
              max={1}
              step={0.05}
              onChange={setOpacity}
              format={(v) => `${Math.round(v * 100)}%`}
              paramId="slicer.opacity"
            />
          </div>
        )}
      </div>

      {/* Freeze button */}
      <button
        onClick={() => setFreeze(!freeze)}
        className="w-full h-8 text-[13px] font-medium rounded"
        style={{
          backgroundColor: freeze ? '#8b5cf6' : 'var(--bg-surface)',
          border: `1px solid ${freeze ? '#7c3aed' : 'var(--border)'}`,
          color: freeze ? 'white' : 'var(--text-muted)',
        }}
      >
        {freeze ? 'FREEZE (Active)' : 'Freeze'}
      </button>
    </div>
  )
}
