interface WaveformVizProps {
  frequency: number
  amplitude: number
  color: string
}

export function WaveformViz({ frequency, amplitude, color }: WaveformVizProps) {
  // Generate sine wave path
  const points = []
  const cy = 12
  const amp = (amplitude / 100) * 8
  const freq = (frequency / 20) * 0.4

  for (let x = 0; x <= 80; x += 2) {
    const y = cy + Math.sin(x * freq * 0.3) * amp
    points.push(`${x},${y}`)
  }

  return (
    <svg width="80" height="24" viewBox="0 0 80 24" className="rounded">
      {/* Center line */}
      <line x1={0} y1={12} x2={80} y2={12} stroke="#333" strokeWidth={0.5} />
      {/* Waveform */}
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
