import { useCallback } from 'react'
import { BankButton } from './BankButton'
import { RandomEffectsControls } from './RandomEffectsControls'
import { useBankStore } from '../../stores/bankStore'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'

const BANK_LABELS = ['A', 'B', 'C', 'D']

export function BankPanel() {
  const { banks, activeBank, loadBank, saveBank, clearBank } = useBankStore()
  const { bypassActive, setBypassActive } = useGlitchEngineStore()

  const handleBypassDown = useCallback(() => {
    setBypassActive(true)
  }, [setBypassActive])

  const handleBypassUp = useCallback(() => {
    setBypassActive(false)
  }, [setBypassActive])

  return (
    <div
      className="h-full flex items-center px-3"
      style={{ backgroundColor: '#f0f0f0' }}
    >
      {/* Left section - Bank buttons (50vw) */}
      <div
        className="h-full flex items-center justify-start gap-2 py-1 pl-1"
        style={{ width: '50vw' }}
      >
        {BANK_LABELS.map((label, index) => (
          <div key={label} className="flex-1 h-full max-w-[100px]">
            <BankButton
              label={label}
              index={index}
              isEmpty={banks[index] === null}
              isActive={activeBank === index}
              onLoad={() => loadBank(index)}
              onSave={() => saveBank(index)}
              onClear={() => clearBank(index)}
            />
          </div>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right section - Random/Undo/Bypass */}
      <div className="h-full flex items-center gap-2 py-1">
        <div style={{ width: '200px' }} className="h-full">
          <RandomEffectsControls />
        </div>
        <button
          onPointerDown={handleBypassDown}
          onPointerUp={handleBypassUp}
          onPointerLeave={handleBypassUp}
          onPointerCancel={handleBypassUp}
          className="h-full px-4 rounded-lg text-[14px] font-medium transition-all select-none touch-none"
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
    </div>
  )
}
