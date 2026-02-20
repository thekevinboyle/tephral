import { useCallback, useEffect, useRef, useState } from 'react'
import { useAudioSourceStore, type AudioSourceType, type AudioGateMode } from '../../stores/audioSourceStore'
import { Knob } from '../performance/Knob'

const SOURCES: { id: AudioSourceType; label: string }[] = [
  { id: 'video', label: 'VID' },
  { id: 'file', label: 'FILE' },
  { id: 'mic', label: 'MIC' },
]

const ACTIVE_COLOR = '#FF3333'

export function AudioSourceRow() {
  const activeSource = useAudioSourceStore((s) => s.activeSource)
  const audioFileName = useAudioSourceStore((s) => s.audioFileName)
  const amplitude = useAudioSourceStore((s) => s.amplitude)
  const waveformData = useAudioSourceStore((s) => s.waveformData)
  const setActiveSource = useAudioSourceStore((s) => s.setActiveSource)
  const setAudioFile = useAudioSourceStore((s) => s.setAudioFile)

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

  const [showGateSettings, setShowGateSettings] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)

  const handleFileImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        const url = URL.createObjectURL(file)
        setAudioFile(url, file.name)
        setActiveSource('file')
      }
      e.target.value = ''
    },
    [setAudioFile, setActiveSource],
  )

  // Waveform drawing loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    function draw() {
      const state = useAudioSourceStore.getState()
      const data = state.waveformData
      const threshold = state.gateThreshold
      const sensitivity = state.gateSensitivity
      const w = canvas!.width
      const h = canvas!.height

      ctx!.clearRect(0, 0, w, h)

      // Draw threshold line (mapped to waveform space)
      // RMS threshold maps roughly to waveform deviation from center
      const thresholdDeviation = (threshold / sensitivity) * h * 0.5
      const centerY = h / 2
      ctx!.strokeStyle = '#FFCC0040'
      ctx!.lineWidth = 1
      ctx!.setLineDash([4, 4])
      ctx!.beginPath()
      ctx!.moveTo(0, centerY - thresholdDeviation)
      ctx!.lineTo(w, centerY - thresholdDeviation)
      ctx!.stroke()
      ctx!.beginPath()
      ctx!.moveTo(0, centerY + thresholdDeviation)
      ctx!.lineTo(w, centerY + thresholdDeviation)
      ctx!.stroke()
      ctx!.setLineDash([])

      // Draw waveform
      ctx!.beginPath()
      ctx!.strokeStyle = ACTIVE_COLOR
      ctx!.lineWidth = 1.5

      const sliceWidth = w / data.length
      let x = 0
      for (let i = 0; i < data.length; i++) {
        const v = data[i] / 255
        const y = v * h
        if (i === 0) ctx!.moveTo(x, y)
        else ctx!.lineTo(x, y)
        x += sliceWidth
      }
      ctx!.stroke()

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  // Resize canvas to match element dimensions
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        canvas.width = Math.floor(width * window.devicePixelRatio)
        canvas.height = Math.floor(height * window.devicePixelRatio)
      }
    })
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="flex-shrink-0" style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-elevated)' }}>
      {/* Main row: source buttons + waveform + amplitude */}
      <div
        className="flex items-center"
        style={{
          height: 48,
          padding: '0 var(--panel-padding)',
          gap: 6,
        }}
      >
        {/* Source toggle buttons */}
        {SOURCES.map((source) => {
          const isActive = activeSource === source.id
          return (
            <button
              key={source.id}
              onClick={() => setActiveSource(source.id)}
              className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-sm transition-colors"
              style={{
                backgroundColor: isActive ? `${ACTIVE_COLOR}20` : 'transparent',
                color: isActive ? ACTIVE_COLOR : 'var(--text-ghost)',
                border: isActive
                  ? `1px solid ${ACTIVE_COLOR}40`
                  : '1px solid transparent',
              }}
            >
              {source.label}
            </button>
          )
        })}

        {/* Divider */}
        <div className="w-px h-5" style={{ backgroundColor: 'var(--border)' }} />

        {/* File import (visible when file source is active) */}
        {activeSource === 'file' && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileImport}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-[9px] px-2 py-1 rounded-sm truncate"
              style={{
                maxWidth: 120,
                backgroundColor: 'var(--bg-elevated)',
                color: audioFileName ? 'var(--text-secondary)' : 'var(--text-ghost)',
                border: '1px solid var(--border)',
              }}
            >
              {audioFileName ?? 'Import...'}
            </button>
          </>
        )}

        {/* Mini waveform canvas */}
        <canvas
          ref={canvasRef}
          className="flex-1 min-w-0"
          style={{ height: 32 }}
        />

        {/* Amplitude bar */}
        <div
          className="flex-shrink-0 rounded-sm overflow-hidden"
          style={{
            width: 4,
            height: 32,
            backgroundColor: 'var(--bg-elevated)',
          }}
        >
          <div
            style={{
              width: '100%',
              height: `${amplitude * 100}%`,
              backgroundColor: ACTIVE_COLOR,
              marginTop: `${(1 - amplitude) * 100}%`,
              transition: 'height 0.05s, margin-top 0.05s',
            }}
          />
        </div>

        {/* Gate settings toggle */}
        <button
          onClick={() => setShowGateSettings(!showGateSettings)}
          className="text-[9px] font-bold px-1.5 py-1 rounded-sm flex-shrink-0"
          style={{
            backgroundColor: showGateSettings ? `${ACTIVE_COLOR}20` : 'transparent',
            color: showGateSettings ? ACTIVE_COLOR : 'var(--text-ghost)',
            border: showGateSettings
              ? `1px solid ${ACTIVE_COLOR}40`
              : '1px solid var(--border)',
          }}
          title="Gate settings"
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
