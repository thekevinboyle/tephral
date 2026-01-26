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
                  max={50}
                  onChange={(v) => updateRGBSplit({ amount: v })}
                  formatValue={(v) => v.toFixed(0)}
                />
                <MinimalSlider
                  label="Angle"
                  value={rgbSplit.angle}
                  min={0}
                  max={360}
                  onChange={(v) => updateRGBSplit({ angle: v })}
                  formatValue={(v) => `${v.toFixed(0)}°`}
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
                  label="Amount"
                  value={blockDisplace.amount}
                  min={0}
                  max={100}
                  onChange={(v) => updateBlockDisplace({ amount: v })}
                  formatValue={(v) => v.toFixed(0)}
                />
                <MinimalSlider
                  label="Seed"
                  value={blockDisplace.seed}
                  min={0}
                  max={1000}
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
                  label="Count"
                  value={scanLines.count}
                  min={100}
                  max={1000}
                  onChange={(v) => updateScanLines({ count: v })}
                  formatValue={(v) => v.toFixed(0)}
                />
                <MinimalSlider
                  label="Intensity"
                  value={scanLines.intensity}
                  min={0}
                  max={1}
                  onChange={(v) => updateScanLines({ intensity: v })}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
