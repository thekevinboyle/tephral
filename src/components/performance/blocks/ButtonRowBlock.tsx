import { useState } from 'react'
import { ModulationContextMenu } from '../controls/ModulationContextMenu'
import { BracketDisplay } from '../../ui/BracketDisplay'
import { ScanMeter } from '../../ui/ScanMeter'

interface ButtonRowBlockProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  paramId?: string
  color?: string
}

export function ButtonRowBlock({ label, value, min, max, step: stepSize, onChange, paramId, color = 'var(--accent)' }: ButtonRowBlockProps) {
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null)

  // Generate discrete values
  const values: number[] = []
  for (let v = min; v <= max + stepSize * 0.01; v += stepSize) {
    values.push(Math.round(v * 1000) / 1000) // avoid float drift
  }

  const currentIndex = values.findIndex(v => Math.abs(v - value) < stepSize * 0.1)
  const normalized = values.length > 1 ? currentIndex / (values.length - 1) : 0
  const displayValue = stepSize >= 1 ? value.toFixed(0) : value.toFixed(1)

  return (
    <div
      onContextMenu={paramId ? (e) => {
        e.preventDefault()
        setContextMenuPos({ x: e.clientX, y: e.clientY })
      } : undefined}
      style={{
        position: 'relative',
        height: 120,
        borderRadius: 0,
        overflow: 'hidden',
        userSelect: 'none',
        backgroundColor: '#000000',
        border: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {/* BracketDisplay — top section */}
      <div style={{
        padding: '10px 12px 0',
        pointerEvents: 'none',
      }}>
        <BracketDisplay value={displayValue} label={label} color={color} size="sm" />
      </div>

      {/* Button row — center section */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 8px',
          gap: 3,
          flex: 1,
          marginTop: 4,
        }}
      >
        {values.map((v, i) => {
          const isActive = i === currentIndex
          return (
            <button
              key={v}
              onClick={() => onChange(v)}
              style={{
                flex: 1,
                height: 28,
                borderRadius: 0,
                border: isActive ? `1px solid ${color}` : '1px solid var(--border)',
                backgroundColor: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                fontSize: 11,
                fontWeight: isActive ? 700 : 500,
                fontVariantNumeric: 'tabular-nums',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'
                  e.currentTarget.style.color = 'var(--text-muted)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = 'var(--text-ghost)'
                }
              }}
            >
              {stepSize >= 1 ? v.toFixed(0) : v.toFixed(1)}
            </button>
          )
        })}
      </div>

      {/* ScanMeter — bottom, shows position in discrete range */}
      <div style={{ pointerEvents: 'none' }}>
        <ScanMeter value={normalized} color={color} height={4} showScanLine={false} />
      </div>

      {contextMenuPos && paramId && (
        <ModulationContextMenu
          paramId={paramId}
          position={contextMenuPos}
          onClose={() => setContextMenuPos(null)}
        />
      )}
    </div>
  )
}
