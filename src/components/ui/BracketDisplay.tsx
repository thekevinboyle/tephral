import { ScanMeter } from './ScanMeter'

interface BracketDisplayProps {
  value: string
  label: string
  sublabel?: string
  meter?: number
  color?: string
  size?: 'sm' | 'md' | 'lg'
  bipolar?: boolean
}

const SIZES = {
  sm: { valueFontSize: 11, labelFontSize: 7, padding: '2px 4px', meterHeight: 2 },
  md: { valueFontSize: 12, labelFontSize: 8, padding: '2px 5px', meterHeight: 3 },
  lg: { valueFontSize: 16, labelFontSize: 9, padding: '3px 6px', meterHeight: 4 },
}

export function BracketDisplay({
  value,
  label,
  sublabel,
  meter,
  color = '#FFFFFF',
  size = 'md',
  bipolar = false,
}: BracketDisplayProps) {
  const s = SIZES[size]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
      {/* Value + label row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* Bracket-framed value */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: s.padding,
          border: '1px solid var(--border)',
          minWidth: size === 'sm' ? 28 : size === 'md' ? 36 : 52,
          backgroundColor: 'var(--bg-primary)',
        }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: s.valueFontSize,
            fontWeight: 700,
            color: '#FFFFFF',
            letterSpacing: '0.02em',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1,
          }}>
            {value}
          </span>
        </div>

        {/* Label column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: s.labelFontSize,
            fontWeight: 600,
            color: 'var(--text-muted)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            lineHeight: 1,
          }}>
            {label}
          </span>
          {sublabel && (
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 7,
              fontWeight: 500,
              color: 'var(--text-ghost)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              lineHeight: 1,
            }}>
              {sublabel}
            </span>
          )}
        </div>
      </div>

      {/* Scan meter */}
      {meter != null && (
        <ScanMeter
          value={meter}
          color={color}
          height={s.meterHeight}
          bipolar={bipolar}
        />
      )}
    </div>
  )
}
