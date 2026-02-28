import { useState } from 'react'
import { ModulationContextMenu } from '../controls/ModulationContextMenu'
import { BLOCK } from './blockTheme'

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

  return (
    <div
      onContextMenu={paramId ? (e) => {
        e.preventDefault()
        setContextMenuPos({ x: e.clientX, y: e.clientY })
      } : undefined}
      style={{
        position: 'relative',
        height: 120,
        borderRadius: BLOCK.radius,
        overflow: 'hidden',
        userSelect: 'none',
        backgroundColor: BLOCK.bg,
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: BLOCK.shadow,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Label — top left */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 12,
          fontSize: 9,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: BLOCK.textGhost,
          pointerEvents: 'none',
        }}
      >
        {label}
      </div>

      {/* Value display */}
      <div
        style={{
          position: 'absolute',
          top: 8,
          right: 12,
          fontSize: 18,
          fontWeight: 800,
          fontVariantNumeric: 'tabular-nums',
          color: BLOCK.text,
          pointerEvents: 'none',
        }}
      >
        {stepSize >= 1 ? value.toFixed(0) : value.toFixed(1)}
      </div>

      {/* Button row — centered vertically */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          padding: '28px 8px 8px',
          gap: 3,
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
                height: 32,
                borderRadius: 4,
                border: isActive ? `1px solid ${color}` : '1px solid rgba(255,255,255,0.06)',
                backgroundColor: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: isActive ? BLOCK.text : BLOCK.textGhost,
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                fontVariantNumeric: 'tabular-nums',
                cursor: 'pointer',
                transition: 'background-color 0.1s, color 0.1s, border-color 0.1s',
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
