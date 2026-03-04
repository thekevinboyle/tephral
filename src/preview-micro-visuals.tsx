import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Crosshair,
  DataGrid,
  OrbitalRings,
  ShapeMorpher,
  RadarSweep,
  TechReadout,
  IrisScanner,
  SignalAnalysis,
} from './components/ui/MicroVisuals'

const COMPONENTS = [
  { name: 'Crosshair', C: Crosshair },
  { name: 'DataGrid', C: DataGrid },
  { name: 'OrbitalRings', C: OrbitalRings },
  { name: 'ShapeMorpher', C: ShapeMorpher },
  { name: 'RadarSweep', C: RadarSweep },
  { name: 'TechReadout', C: TechReadout },
  { name: 'IrisScanner', C: IrisScanner },
  { name: 'SignalAnalysis', C: SignalAnalysis },
]

function Preview() {
  const [value, setValue] = useState(0.5)

  return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh', padding: 32, fontFamily: 'monospace', color: '#e0e0e0' }}>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
        <label style={{ fontSize: 14, opacity: 0.6 }}>value</label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={value}
          onChange={(e) => setValue(parseFloat(e.target.value))}
          style={{ width: 300 }}
        />
        <span style={{ fontSize: 14, opacity: 0.8, fontVariantNumeric: 'tabular-nums' }}>{value.toFixed(2)}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32 }}>
        {COMPONENTS.map(({ name, C }) => (
          <div key={name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ background: '#12121a', borderRadius: 8, padding: 16, border: '1px solid #ffffff10' }}>
              <C value={value} size={128} />
            </div>
            <span style={{ fontSize: 11, opacity: 0.5, letterSpacing: '0.05em' }}>{name}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 48 }}>
        <div style={{ fontSize: 11, opacity: 0.4, marginBottom: 16 }}>Fixed values: 0 / 0.25 / 0.5 / 0.75 / 1.0</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 8 }}>
          {COMPONENTS.map(({ name, C }) =>
            [0, 0.25, 0.5, 0.75, 1].map((v) => (
              <div key={`${name}-${v}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ background: '#12121a', borderRadius: 4, padding: 4, border: '1px solid #ffffff08' }}>
                  <C value={v} size={64} />
                </div>
                <span style={{ fontSize: 8, opacity: 0.3 }}>{name} {v}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Preview />)
