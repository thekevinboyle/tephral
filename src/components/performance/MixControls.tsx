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
      style={{ backgroundColor: '#1a1a1a' }}
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
            backgroundColor: bypassActive ? '#ef4444' : '#242424',
            border: bypassActive ? '1px solid #ef4444' : '1px solid #333333',
            boxShadow: bypassActive ? '0 0 12px #ef4444' : 'none',
            color: bypassActive ? '#ffffff' : '#888888',
          }}
        >
          Bypass
        </button>
      </div>

      {/* Crossfader row */}
      <div className="flex items-center gap-3">
        {/* DRY label */}
        <span className="text-[11px] font-medium w-8" style={{ color: '#888888' }}>
          Dry
        </span>

        {/* Fader track */}
        <div className="flex-1 relative h-6 flex items-center">
          {/* Track background */}
          <div
            className="absolute inset-x-0 h-[2px] rounded-full"
            style={{ backgroundColor: '#333333' }}
          />

          {/* Active track */}
          <div
            className="absolute left-0 h-[2px] rounded-full"
            style={{
              width: `${thumbPosition}%`,
              backgroundColor: '#888888',
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
              backgroundColor: '#242424',
              border: '1px solid #444444',
            }}
          >
            {/* Thumb grip lines */}
            <div className="absolute inset-x-1.5 top-1/2 -translate-y-1/2 flex flex-col gap-[2px]">
              <div className="h-px" style={{ backgroundColor: '#555555' }} />
              <div className="h-px" style={{ backgroundColor: '#555555' }} />
              <div className="h-px" style={{ backgroundColor: '#555555' }} />
            </div>
          </div>

          {/* Percentage tooltip */}
          <div
            className="absolute -top-5 -translate-x-1/2 pointer-events-none"
            style={{ left: `${thumbPosition}%` }}
          >
            <span className="text-[10px] tabular-nums font-medium" style={{ color: '#888888', fontFamily: "'JetBrains Mono', monospace" }}>
              {percentage}%
            </span>
          </div>
        </div>

        {/* WET label */}
        <span className="text-[11px] font-medium w-8 text-right" style={{ color: '#888888' }}>
          Wet
        </span>
      </div>
    </div>
  )
}
