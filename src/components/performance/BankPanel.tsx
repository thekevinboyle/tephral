import { BankButton } from './BankButton'
import { RandomEffectsControls } from './RandomEffectsControls'
import { useBankStore } from '../../stores/bankStore'

const BANK_LABELS = ['A', 'B', 'C', 'D']

export function BankPanel() {
  const { banks, activeBank, loadBank, saveBank } = useBankStore()

  return (
    <div
      className="h-full flex items-center px-3"
      style={{ backgroundColor: '#f0f0f0' }}
    >
      {/* Left section - Bank buttons (50vw) */}
      <div
        className="h-full flex items-center justify-center gap-2 py-1"
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
            />
          </div>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right section - Random/Undo */}
      <div className="h-full flex items-center py-1" style={{ width: '200px' }}>
        <RandomEffectsControls />
      </div>
    </div>
  )
}
