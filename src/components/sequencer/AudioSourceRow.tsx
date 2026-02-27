import { useState } from 'react'
import { useAudioSourceStore } from '../../stores/audioSourceStore'
import { useUIStore } from '../../stores/uiStore'
import { getUIStatusText } from '../../config/statusDescriptions'
import { Knob } from '../performance/Knob'

const ACTIVE_COLOR = '#FF3333'

export function AudioSourceRow() {
  // Gate parameters
  const gateThreshold = useAudioSourceStore((s) => s.gateThreshold)
  const gateSensitivity = useAudioSourceStore((s) => s.gateSensitivity)
  const gateMode = useAudioSourceStore((s) => s.gateMode)
  const gateAttack = useAudioSourceStore((s) => s.gateAttack)
  const gateRelease = useAudioSourceStore((s) => s.gateRelease)
  const setGateThreshold = useAudioSourceStore((s) => s.setGateThreshold)
  const setGateSensitivity = useAudioSourceStore((s) => s.setGateSensitivity)
  const setGateMode = useAudioSourceStore((s) => s.setGateMode)
  const setGateAttack = useAudioSourceStore((s) => s.setGateAttack)
  const setGateRelease = useAudioSourceStore((s) => s.setGateRelease)

  const setStatusText = useUIStore((s) => s.setStatusText)
  const [showGateSettings, setShowGateSettings] = useState(false)

  return (
    <div className="flex-shrink-0" style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-elevated)' }}>
      {/* Gate toggle row */}
      <div
        className="flex items-center justify-end"
        style={{
          height: 28,
          padding: '0 var(--panel-padding)',
          gap: 6,
        }}
      >
        <button
          onClick={() => setShowGateSettings(!showGateSettings)}
          className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm flex-shrink-0"
          style={{
            backgroundColor: showGateSettings ? `${ACTIVE_COLOR}20` : 'transparent',
            color: showGateSettings ? ACTIVE_COLOR : 'var(--text-ghost)',
            border: showGateSettings
              ? `1px solid ${ACTIVE_COLOR}40`
              : '1px solid var(--border)',
          }}
          title="Gate settings"
          onMouseEnter={() => setStatusText(getUIStatusText('gateToggle'))}
          onMouseLeave={() => setStatusText(null)}
        >
          GATE
        </button>
      </div>

      {/* Expandable gate settings row */}
      {showGateSettings && (
        <div
          className="flex items-center justify-between"
          style={{
            height: 64,
            padding: '4px var(--panel-padding)',
            borderTop: '1px solid var(--border)',
            backgroundColor: 'var(--bg-elevated)',
          }}
        >
          {/* Mode toggle */}
          <button
            onClick={() => setGateMode(gateMode === 'gate' ? 'envelope' : 'gate')}
            className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-sm flex-shrink-0"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              minWidth: 36,
            }}
            title={gateMode === 'gate'
              ? 'Gate mode: binary on/off at threshold'
              : 'Envelope mode: amplitude scales effect mix'}
            onMouseEnter={() => setStatusText(getUIStatusText('gateMode'))}
            onMouseLeave={() => setStatusText(null)}
          >
            {gateMode === 'gate' ? 'GATE' : 'ENV'}
          </button>

          <Knob
            label="THRESH"
            value={gateThreshold}
            min={0.01}
            max={0.25}
            step={0.002}
            size="xs"
            showArc
            showValue
            color="#888888"
            onChange={setGateThreshold}
            formatValue={(v) => `${(v * 100).toFixed(0)}%`}
          />

          <Knob
            label="GAIN"
            value={gateSensitivity}
            min={0.5}
            max={4}
            step={0.05}
            size="xs"
            showArc
            showValue
            color="#888888"
            onChange={setGateSensitivity}
            formatValue={(v) => `${v.toFixed(1)}×`}
          />

          <Knob
            label="ATK"
            value={gateAttack}
            min={0}
            max={1}
            step={0.01}
            size="xs"
            showArc
            showValue
            color="#888888"
            onChange={setGateAttack}
            formatValue={(v) => `${Math.round(v * 500)}ms`}
          />

          <Knob
            label="REL"
            value={gateRelease}
            min={0}
            max={1}
            step={0.01}
            size="xs"
            showArc
            showValue
            color="#888888"
            onChange={setGateRelease}
            formatValue={(v) => `${Math.round(v * 500)}ms`}
          />
        </div>
      )}
    </div>
  )
}
