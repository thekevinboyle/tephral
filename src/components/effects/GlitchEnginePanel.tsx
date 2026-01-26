import { useState } from 'react'
import { Panel, Slider, Toggle } from '../ui'
import { useGlitchEngineStore } from '../../stores/glitchEngineStore'

export function GlitchEnginePanel() {
  const [collapsed, setCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState<'rgb' | 'block' | 'scan'>('rgb')

  const {
    enabled,
    setEnabled,
    rgbSplitEnabled,
    setRGBSplitEnabled,
    blockDisplaceEnabled,
    setBlockDisplaceEnabled,
    scanLinesEnabled,
    setScanLinesEnabled,
    rgbSplit,
    updateRGBSplit,
    blockDisplace,
    updateBlockDisplace,
    scanLines,
    updateScanLines,
  } = useGlitchEngineStore()

  return (
    <Panel
      title="GLITCH ENGINE"
      collapsed={collapsed}
      onToggleCollapse={() => setCollapsed(!collapsed)}
    >
      <Toggle label="ENABLED" pressed={enabled} onPressedChange={setEnabled} />

      {enabled && (
        <>
          <div className="flex gap-1 border-b border-muted pb-2">
            {(['rgb', 'block', 'scan'] as const).map((tab) => (
              <button
                key={tab}
                className={`px-2 py-1 text-xs uppercase ${
                  activeTab === tab
                    ? 'bg-accent-yellow text-base-dark'
                    : 'text-muted hover:text-base-light'
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'rgb' ? 'RGB SPLIT' : tab === 'block' ? 'BLOCK' : 'SCAN'}
              </button>
            ))}
          </div>

          {activeTab === 'rgb' && (
            <div className="flex flex-col gap-3">
              <Toggle
                label="RGB SPLIT"
                pressed={rgbSplitEnabled}
                onPressedChange={setRGBSplitEnabled}
              />
              {rgbSplitEnabled && (
                <>
                  <Slider
                    label="AMOUNT"
                    value={rgbSplit.amount}
                    min={0}
                    max={2}
                    onChange={(v) => updateRGBSplit({ amount: v })}
                  />
                  <Slider
                    label="RED X"
                    value={rgbSplit.redOffsetX}
                    min={-0.1}
                    max={0.1}
                    onChange={(v) => updateRGBSplit({ redOffsetX: v })}
                  />
                  <Slider
                    label="RED Y"
                    value={rgbSplit.redOffsetY}
                    min={-0.1}
                    max={0.1}
                    onChange={(v) => updateRGBSplit({ redOffsetY: v })}
                  />
                  <Slider
                    label="BLUE X"
                    value={rgbSplit.blueOffsetX}
                    min={-0.1}
                    max={0.1}
                    onChange={(v) => updateRGBSplit({ blueOffsetX: v })}
                  />
                  <Slider
                    label="BLUE Y"
                    value={rgbSplit.blueOffsetY}
                    min={-0.1}
                    max={0.1}
                    onChange={(v) => updateRGBSplit({ blueOffsetY: v })}
                  />
                </>
              )}
            </div>
          )}

          {activeTab === 'block' && (
            <div className="flex flex-col gap-3">
              <Toggle
                label="BLOCK DISPLACE"
                pressed={blockDisplaceEnabled}
                onPressedChange={setBlockDisplaceEnabled}
              />
              {blockDisplaceEnabled && (
                <>
                  <Slider
                    label="BLOCK SIZE"
                    value={blockDisplace.blockSize}
                    min={0.01}
                    max={0.2}
                    onChange={(v) => updateBlockDisplace({ blockSize: v })}
                  />
                  <Slider
                    label="CHANCE"
                    value={blockDisplace.displaceChance}
                    min={0}
                    max={1}
                    onChange={(v) => updateBlockDisplace({ displaceChance: v })}
                  />
                  <Slider
                    label="DISTANCE"
                    value={blockDisplace.displaceDistance}
                    min={0}
                    max={0.1}
                    onChange={(v) => updateBlockDisplace({ displaceDistance: v })}
                  />
                </>
              )}
            </div>
          )}

          {activeTab === 'scan' && (
            <div className="flex flex-col gap-3">
              <Toggle
                label="SCAN LINES"
                pressed={scanLinesEnabled}
                onPressedChange={setScanLinesEnabled}
              />
              {scanLinesEnabled && (
                <>
                  <Slider
                    label="LINE COUNT"
                    value={scanLines.lineCount}
                    min={50}
                    max={800}
                    step={1}
                    onChange={(v) => updateScanLines({ lineCount: v })}
                  />
                  <Slider
                    label="OPACITY"
                    value={scanLines.lineOpacity}
                    min={0}
                    max={0.5}
                    onChange={(v) => updateScanLines({ lineOpacity: v })}
                  />
                  <Slider
                    label="FLICKER"
                    value={scanLines.lineFlicker}
                    min={0}
                    max={0.3}
                    onChange={(v) => updateScanLines({ lineFlicker: v })}
                  />
                </>
              )}
            </div>
          )}
        </>
      )}
    </Panel>
  )
}
