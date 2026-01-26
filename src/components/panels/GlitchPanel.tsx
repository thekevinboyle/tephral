import { useGlitchEngineStore } from '../../stores/glitchEngineStore'
import { MinimalSlider } from '../ui/MinimalSlider'
import { MinimalToggle } from '../ui/MinimalToggle'

export function GlitchPanel() {
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
    blockDisplace,
    scanLines,
    updateRGBSplit,
    updateBlockDisplace,
    updateScanLines,
  } = useGlitchEngineStore()

  return (
    <div className="flex flex-col gap-4">
      <MinimalToggle
        label="Enable Glitch Engine"
        pressed={enabled}
        onPressedChange={setEnabled}
      />

      {enabled && (
        <>
          {/* RGB Split */}
          <div className="border-t border-muted/20 pt-3">
            <MinimalToggle
              label="RGB Split"
              pressed={rgbSplitEnabled}
              onPressedChange={setRGBSplitEnabled}
            />
            {rgbSplitEnabled && (
              <div className="mt-2 pl-2 border-l border-muted/20">
                <MinimalSlider
                  label="Amount"
                  value={rgbSplit.amount}
                  min={0}
                  max={5}
                  onChange={(v) => updateRGBSplit({ amount: v })}
                />
                <MinimalSlider
                  label="Red X"
                  value={rgbSplit.redOffsetX}
                  min={-0.05}
                  max={0.05}
                  step={0.001}
                  onChange={(v) => updateRGBSplit({ redOffsetX: v })}
                  formatValue={(v) => v.toFixed(3)}
                />
                <MinimalSlider
                  label="Blue X"
                  value={rgbSplit.blueOffsetX}
                  min={-0.05}
                  max={0.05}
                  step={0.001}
                  onChange={(v) => updateRGBSplit({ blueOffsetX: v })}
                  formatValue={(v) => v.toFixed(3)}
                />
              </div>
            )}
          </div>

          {/* Block Displace */}
          <div className="border-t border-muted/20 pt-3">
            <MinimalToggle
              label="Block Displace"
              pressed={blockDisplaceEnabled}
              onPressedChange={setBlockDisplaceEnabled}
            />
            {blockDisplaceEnabled && (
              <div className="mt-2 pl-2 border-l border-muted/20">
                <MinimalSlider
                  label="Block Size"
                  value={blockDisplace.blockSize}
                  min={0.01}
                  max={0.2}
                  step={0.01}
                  onChange={(v) => updateBlockDisplace({ blockSize: v })}
                  formatValue={(v) => v.toFixed(2)}
                />
                <MinimalSlider
                  label="Chance"
                  value={blockDisplace.displaceChance}
                  min={0}
                  max={1}
                  onChange={(v) => updateBlockDisplace({ displaceChance: v })}
                />
                <MinimalSlider
                  label="Distance"
                  value={blockDisplace.displaceDistance}
                  min={0}
                  max={0.1}
                  step={0.005}
                  onChange={(v) => updateBlockDisplace({ displaceDistance: v })}
                  formatValue={(v) => v.toFixed(3)}
                />
                <MinimalSlider
                  label="Seed"
                  value={blockDisplace.seed}
                  min={0}
                  max={1000}
                  step={1}
                  onChange={(v) => updateBlockDisplace({ seed: v })}
                  formatValue={(v) => v.toFixed(0)}
                />
              </div>
            )}
          </div>

          {/* Scan Lines */}
          <div className="border-t border-muted/20 pt-3">
            <MinimalToggle
              label="Scan Lines"
              pressed={scanLinesEnabled}
              onPressedChange={setScanLinesEnabled}
            />
            {scanLinesEnabled && (
              <div className="mt-2 pl-2 border-l border-muted/20">
                <MinimalSlider
                  label="Line Count"
                  value={scanLines.lineCount}
                  min={100}
                  max={1000}
                  step={10}
                  onChange={(v) => updateScanLines({ lineCount: v })}
                  formatValue={(v) => v.toFixed(0)}
                />
                <MinimalSlider
                  label="Opacity"
                  value={scanLines.lineOpacity}
                  min={0}
                  max={0.5}
                  onChange={(v) => updateScanLines({ lineOpacity: v })}
                />
                <MinimalSlider
                  label="Flicker"
                  value={scanLines.lineFlicker}
                  min={0}
                  max={0.3}
                  onChange={(v) => updateScanLines({ lineFlicker: v })}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
