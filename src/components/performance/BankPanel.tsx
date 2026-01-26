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
      style={{ backgroundColor: '#1a1a1a' }}
    >
      {/* Bank selector */}
      <div className="flex items-center gap-1">
        <span className="text-[11px] font-medium mr-2" style={{ color: '#555555' }}>
          Bank
        </span>
        {BANK_LABELS.map((label, index) => (
          <button
            key={label}
            onClick={() => setActiveBank(index)}
            className="w-8 h-8 rounded-md text-[11px] font-medium transition-colors"
            style={{
              backgroundColor: activeBank === index ? '#2a2a2a' : '#242424',
              border: activeBank === index ? '1px solid #6366f140' : '1px solid #333333',
              color: activeBank === index ? '#ffffff' : '#888888',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="w-px h-6" style={{ backgroundColor: '#333333' }} />

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
              className="flex-1 max-w-[120px] h-8 rounded-md px-3 flex items-center justify-between transition-colors"
              style={{
                backgroundColor: isActive ? '#2a2a2a' : '#242424',
                border: isActive ? '1px solid #6366f140' : '1px solid #333333',
                opacity: isEmpty ? 0.5 : 1,
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="text-[11px] font-medium"
                  style={{ color: isActive ? '#ffffff' : '#888888' }}
                >
                  {index + 1}
                </span>
                <span
                  className="text-[10px] font-medium truncate"
                  style={{ color: isActive ? '#888888' : '#555555' }}
                >
                  {preset?.name || 'Empty'}
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
      <div className="w-px h-6" style={{ backgroundColor: '#333333' }} />

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => activePreset !== null ? savePreset(activePreset) : null}
          disabled={activePreset === null}
          className="h-8 px-3 rounded-md text-[11px] font-medium transition-colors"
          style={{
            backgroundColor: '#242424',
            border: '1px solid #333333',
            color: activePreset !== null ? '#10b981' : '#555555',
            opacity: activePreset === null ? 0.5 : 1,
          }}
        >
          Save
        </button>
        <button
          onClick={copyPreset}
          disabled={activePreset === null}
          className="h-8 px-3 rounded-md text-[11px] font-medium transition-colors"
          style={{
            backgroundColor: '#242424',
            border: '1px solid #333333',
            color: activePreset !== null ? '#888888' : '#555555',
            opacity: activePreset === null ? 0.5 : 1,
          }}
        >
          Copy
        </button>
        <button
          onClick={() => activePreset !== null && clipboard && pastePreset(activePreset)}
          disabled={!clipboard || activePreset === null}
          className="h-8 px-3 rounded-md text-[11px] font-medium transition-colors"
          style={{
            backgroundColor: '#242424',
            border: '1px solid #333333',
            color: clipboard ? '#888888' : '#555555',
            opacity: !clipboard || activePreset === null ? 0.5 : 1,
          }}
        >
          Paste
        </button>
      </div>
    </div>
  )
}
