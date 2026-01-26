import { useRoutingStore } from '../../stores/routingStore'

const BANK_LABELS = ['A', 'B', 'C', 'D']

export function BankPanel() {
  const {
    banks,
    activeBank,
    activePreset,
    isModified,
    clipboard,
    setActiveBank,
    savePreset,
    loadPreset,
    copyPreset,
    pastePreset,
  } = useRoutingStore()

  const currentBankPresets = banks[activeBank]

  return (
    <div
      className="h-full flex items-center px-4 gap-6"
      style={{
        background: 'linear-gradient(180deg, #13151a 0%, #1a1d24 100%)',
      }}
    >
      {/* Bank selector */}
      <div className="flex items-center gap-1">
        <span className="text-[9px] uppercase tracking-wider text-[#4b5563] font-medium mr-2">
          BANK
        </span>
        {BANK_LABELS.map((label, index) => (
          <button
            key={label}
            onClick={() => setActiveBank(index)}
            className="w-8 h-8 rounded-md text-[11px] font-bold transition-all"
            style={{
              background: activeBank === index
                ? 'linear-gradient(180deg, #6366f120 0%, #6366f110 100%)'
                : 'linear-gradient(180deg, #1e2128 0%, #13151a 100%)',
              boxShadow: activeBank === index
                ? '0 0 12px -2px #6366f1, 0 0 0 1px #6366f150'
                : 'inset 0 1px 2px rgba(0,0,0,0.3), 0 0 0 1px #2a2d35',
              color: activeBank === index ? '#6366f1' : '#6b7280',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-[#2a2d35]" />

      {/* Preset slots */}
      <div className="flex items-center gap-2 flex-1">
        {currentBankPresets.map((preset, index) => {
          const isActive = activePreset === index
          const isEmpty = !preset
          const showModified = isActive && isModified

          return (
            <button
              key={index}
              onClick={() => !isEmpty && loadPreset(index)}
              className="flex-1 max-w-[120px] h-8 rounded-md px-3 flex items-center justify-between transition-all"
              style={{
                background: isActive
                  ? 'linear-gradient(180deg, #6366f120 0%, #6366f110 100%)'
                  : 'linear-gradient(180deg, #1e2128 0%, #13151a 100%)',
                boxShadow: isActive
                  ? '0 0 12px -2px #6366f1, 0 0 0 1px #6366f150'
                  : 'inset 0 1px 2px rgba(0,0,0,0.3), 0 0 0 1px #2a2d35',
                opacity: isEmpty ? 0.5 : 1,
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] font-medium"
                  style={{ color: isActive ? '#6366f1' : '#6b7280' }}
                >
                  {index + 1}
                </span>
                <span
                  className="text-[9px] uppercase tracking-wider truncate"
                  style={{ color: isActive ? '#a5b4fc' : '#4b5563' }}
                >
                  {preset?.name || 'EMPTY'}
                </span>
              </div>
              {showModified && (
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    backgroundColor: '#f97316',
                    boxShadow: '0 0 6px #f97316',
                  }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-[#2a2d35]" />

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => activePreset !== null ? savePreset(activePreset) : null}
          disabled={activePreset === null}
          className="h-8 px-3 rounded-md text-[9px] uppercase tracking-wider font-medium transition-all"
          style={{
            background: 'linear-gradient(180deg, #1e2128 0%, #13151a 100%)',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3), 0 0 0 1px #2a2d35',
            color: activePreset !== null ? '#10b981' : '#4b5563',
            opacity: activePreset === null ? 0.5 : 1,
          }}
        >
          SAVE
        </button>
        <button
          onClick={copyPreset}
          disabled={activePreset === null}
          className="h-8 px-3 rounded-md text-[9px] uppercase tracking-wider font-medium transition-all"
          style={{
            background: 'linear-gradient(180deg, #1e2128 0%, #13151a 100%)',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3), 0 0 0 1px #2a2d35',
            color: activePreset !== null ? '#6b7280' : '#4b5563',
            opacity: activePreset === null ? 0.5 : 1,
          }}
        >
          COPY
        </button>
        <button
          onClick={() => activePreset !== null && clipboard && pastePreset(activePreset)}
          disabled={!clipboard || activePreset === null}
          className="h-8 px-3 rounded-md text-[9px] uppercase tracking-wider font-medium transition-all"
          style={{
            background: 'linear-gradient(180deg, #1e2128 0%, #13151a 100%)',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3), 0 0 0 1px #2a2d35',
            color: clipboard ? '#6b7280' : '#4b5563',
            opacity: !clipboard || activePreset === null ? 0.5 : 1,
          }}
        >
          PASTE
        </button>
      </div>
    </div>
  )
}
