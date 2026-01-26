import { useCallback } from 'react'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'

export function MixControls() {
  const { wetMix, bypassActive, setWetMix, setBypassActive } = useGlitchEngineStore()

  const handleFaderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setWetMix(parseFloat(e.target.value))
  }, [setWetMix])

  const handleBypassDown = useCallback(() => {
    setBypassActive(true)
  }, [setBypassActive])

  const handleBypassUp = useCallback(() => {
    setBypassActive(false)
  }, [setBypassActive])

  const percentage = Math.round(wetMix * 100)
  const thumbPosition = wetMix * 100

  return (
    <div
      className="h-full flex flex-col justify-center px-4 py-2 gap-2"
      style={{ backgroundColor: '#ffffff' }}
    >
      {/* Kill switch row */}
      <div className="flex justify-center">
        <button
          onPointerDown={handleBypassDown}
          onPointerUp={handleBypassUp}
          onPointerLeave={handleBypassUp}
          onPointerCancel={handleBypassUp}
          className="px-4 py-2 rounded-md text-[11px] font-medium transition-all select-none touch-none"
          style={{
            backgroundColor: bypassActive ? '#ef4444' : '#f5f5f5',
            border: bypassActive ? '1px solid #ef4444' : '1px solid #d0d0d0',
            boxShadow: bypassActive ? '0 0 12px #ef4444' : 'none',
            color: bypassActive ? '#ffffff' : '#666666',
          }}
        >
          Bypass
        </button>
      </div>

      {/* Crossfader row */}
      <div className="flex items-center gap-3">
        {/* DRY label */}
        <span className="text-[11px] font-medium w-8" style={{ color: '#666666' }}>
          Dry
        </span>

        {/* Fader track */}
        <div className="flex-1 relative h-6 flex items-center">
          {/* Track background */}
          <div
            className="absolute inset-x-0 h-[2px] rounded-full"
            style={{ backgroundColor: '#e0e0e0' }}
          />

          {/* Active track */}
          <div
            className="absolute left-0 h-[2px] rounded-full"
            style={{
              width: `${thumbPosition}%`,
              backgroundColor: '#666666',
            }}
          />

          {/* Hidden range input */}
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={wetMix}
            onChange={handleFaderChange}
            className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
          />

          {/* Thumb */}
          <div
            className="absolute h-4 w-8 -translate-x-1/2 pointer-events-none rounded-md"
            style={{
              left: `${thumbPosition}%`,
              backgroundColor: '#f5f5f5',
              border: '1px solid #d0d0d0',
            }}
          >
            {/* Thumb grip lines */}
            <div className="absolute inset-x-1.5 top-1/2 -translate-y-1/2 flex flex-col gap-[2px]">
              <div className="h-px" style={{ backgroundColor: '#d0d0d0' }} />
              <div className="h-px" style={{ backgroundColor: '#d0d0d0' }} />
              <div className="h-px" style={{ backgroundColor: '#d0d0d0' }} />
            </div>
          </div>

          {/* Percentage tooltip */}
          <div
            className="absolute -top-5 -translate-x-1/2 pointer-events-none"
            style={{ left: `${thumbPosition}%` }}
          >
            <span className="text-[10px] tabular-nums font-medium" style={{ color: '#666666', fontFamily: "'JetBrains Mono', monospace" }}>
              {percentage}%
            </span>
          </div>
        </div>

        {/* WET label */}
        <span className="text-[11px] font-medium w-8 text-right" style={{ color: '#666666' }}>
          Wet
        </span>
      </div>
    </div>
  )
}
