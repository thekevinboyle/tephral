interface ScanMeterProps {
  value: number
  color?: string
  width?: number | string
  height?: number
  showScanLine?: boolean
  vertical?: boolean
  bipolar?: boolean
}

export function ScanMeter({
  value,
  color = '#FFFFFF',
  width = '100%',
  height = 4,
  showScanLine = true,
  vertical = false,
  bipolar = false,
}: ScanMeterProps) {
  const fillPct = Math.min(100, Math.max(0, value * 100))

  if (vertical) {
    return (
      <div style={{
        position: 'relative',
        width: height,
        height: typeof width === 'number' ? width : '100%',
        backgroundColor: 'var(--bg-primary)',
        border: '1px solid var(--border)',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: `${fillPct}%`,
          backgroundColor: color,
          opacity: 0.4,
          transition: 'height 0.05s',
        }} />
      </div>
    )
  }

  if (bipolar) {
    const centerPct = 50
    const isPositive = value >= 0.5
    const magnitude = Math.abs(value - 0.5) * 2
    const barWidth = magnitude * 50

    return (
      <div style={{
        position: 'relative',
        width,
        height,
        backgroundColor: 'var(--bg-primary)',
        border: '1px solid var(--border)',
        overflow: 'hidden',
      }}>
        {/* Center line */}
        <div style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: '50%',
          width: 1,
          backgroundColor: 'var(--text-ghost)',
        }} />
        {/* Fill from center */}
        <div style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: isPositive ? `${centerPct}%` : `${centerPct - barWidth}%`,
          width: `${barWidth}%`,
          backgroundColor: color,
          opacity: 0.4,
          transition: 'left 0.05s, width 0.05s',
        }} />
      </div>
    )
  }

  return (
    <div style={{
      position: 'relative',
      width,
      height,
      backgroundColor: 'var(--bg-primary)',
      border: '1px solid var(--border)',
      overflow: 'hidden',
    }}>
      {/* Fill */}
      <div style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        width: `${fillPct}%`,
        backgroundColor: color,
        opacity: 0.4,
        transition: 'width 0.05s',
      }} />
      {/* Scan line */}
      {showScanLine && fillPct > 5 && (
        <div style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: 1,
          backgroundColor: '#FFFFFF',
          opacity: 0.6,
          animation: 'hud-scan 3s linear infinite',
        }} />
      )}
    </div>
  )
}
