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
      style={{
        background: 'linear-gradient(180deg, #13151a 0%, #1a1d24 100%)',
      }}
    >
      {/* Kill switch row */}
      <div className="flex justify-center">
        <button
          onPointerDown={handleBypassDown}
          onPointerUp={handleBypassUp}
          onPointerLeave={handleBypassUp}
          onPointerCancel={handleBypassUp}
          className="px-4 py-2 rounded-lg text-[10px] uppercase tracking-wider font-bold transition-all select-none touch-none"
          style={{
            background: bypassActive
              ? 'linear-gradient(180deg, #ef4444 0%, #dc2626 100%)'
              : 'linear-gradient(180deg, #1e2128 0%, #13151a 100%)',
            boxShadow: bypassActive
              ? '0 0 20px #ef4444, 0 0 40px #ef444480, inset 0 1px 2px rgba(255,255,255,0.2)'
              : 'inset 0 1px 2px rgba(0,0,0,0.3), 0 0 0 1px #2a2d35',
            color: bypassActive ? '#ffffff' : '#6b7280',
            transform: bypassActive ? 'scale(0.98)' : 'scale(1)',
          }}
        >
          BYPASS
        </button>
      </div>

      {/* Crossfader row */}
      <div className="flex items-center gap-3">
        {/* DRY label */}
        <span className="text-[9px] uppercase tracking-wider text-[#6b7280] font-medium w-8">
          DRY
        </span>

        {/* Fader track */}
        <div className="flex-1 relative h-6 flex items-center">
          {/* Track background */}
          <div
            className="absolute inset-x-0 h-[3px] rounded-full"
            style={{
              background: 'linear-gradient(90deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%)',
              opacity: 0.3,
            }}
          />

          {/* Active track */}
          <div
            className="absolute left-0 h-[3px] rounded-full"
            style={{
              width: `${thumbPosition}%`,
              background: 'linear-gradient(90deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%)',
              boxShadow: '0 0 8px rgba(99, 102, 241, 0.5)',
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
            className="absolute h-5 w-10 -translate-x-1/2 pointer-events-none rounded-md"
            style={{
              left: `${thumbPosition}%`,
              background: 'linear-gradient(180deg, #3a3d45 0%, #2a2d35 50%, #1a1d24 100%)',
              boxShadow: `
                inset 0 1px 2px rgba(255,255,255,0.1),
                inset 0 -1px 2px rgba(0,0,0,0.3),
                0 2px 4px rgba(0,0,0,0.4),
                0 0 0 1px #3a3d45
              `,
            }}
          >
            {/* Thumb grip lines */}
            <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 flex flex-col gap-[2px]">
              <div className="h-[1px] bg-[#4a4d55]" />
              <div className="h-[1px] bg-[#1a1d24]" />
              <div className="h-[1px] bg-[#4a4d55]" />
              <div className="h-[1px] bg-[#1a1d24]" />
              <div className="h-[1px] bg-[#4a4d55]" />
            </div>
          </div>

          {/* Percentage tooltip */}
          <div
            className="absolute -top-5 -translate-x-1/2 pointer-events-none"
            style={{ left: `${thumbPosition}%` }}
          >
            <span className="text-[9px] text-[#6b7280] tabular-nums font-medium">
              {percentage}%
            </span>
          </div>
        </div>

        {/* WET label */}
        <span className="text-[9px] uppercase tracking-wider text-[#6b7280] font-medium w-8 text-right">
          WET
        </span>
      </div>
    </div>
  )
}
