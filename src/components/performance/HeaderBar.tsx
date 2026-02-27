import { useEffect, useState, useRef, useCallback } from 'react'
import { useMediaStore } from '../../stores/mediaStore'
import { useAudioSourceStore, type AudioSourceType } from '../../stores/audioSourceStore'
import { useUIStore } from '../../stores/uiStore'
import { getUIStatusText, getAudioSourceStatusText } from '../../config/statusDescriptions'
import { SourceSelector } from '../ui/SourceSelector'

const AUDIO_SOURCES: { id: AudioSourceType; label: string }[] = [
  { id: 'video', label: 'Vid' },
  { id: 'file', label: 'File' },
  { id: 'mic', label: 'Mic' },
]

export function HeaderBar() {
  const { source } = useMediaStore()
  const setStatusText = useUIStore((s) => s.setStatusText)

  // Audio source state
  const activeAudioSource = useAudioSourceStore((s) => s.activeSource)
  const audioFileName = useAudioSourceStore((s) => s.audioFileName)
  const setActiveAudioSource = useAudioSourceStore((s) => s.setActiveSource)
  const setAudioFile = useAudioSourceStore((s) => s.setAudioFile)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        const url = URL.createObjectURL(file)
        setAudioFile(url, file.name)
        setActiveAudioSource('file')
      }
      e.target.value = ''
    },
    [setAudioFile, setActiveAudioSource],
  )

  // FPS counter
  const [fps, setFps] = useState(0)
  const fpsRef = useRef({ frames: 0, lastTime: performance.now() })

  useEffect(() => {
    let rafId: number
    const tick = () => {
      fpsRef.current.frames++
      const now = performance.now()
      if (now - fpsRef.current.lastTime >= 1000) {
        setFps(fpsRef.current.frames)
        fpsRef.current.frames = 0
        fpsRef.current.lastTime = now
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  // Waveform canvas
  const waveformRef = useRef<HTMLCanvasElement>(null)
  const waveRafRef = useRef<number | null>(null)

  // CDJ-style frequency waveform: bass=blue, mid=green, high=white
  // Uses FFT analyser for frequency data, falls back to time-domain waveform
  const freqDataRef = useRef<Uint8Array | null>(null)

  useEffect(() => {
    const canvas = waveformRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    function draw() {
      const state = useAudioSourceStore.getState()
      const analyser = state.reactiveAnalyser
      const w = canvas!.width
      const h = canvas!.height

      ctx!.clearRect(0, 0, w, h)

      // CDJ-style: use FFT frequency data if available
      if (analyser) {
        const binCount = analyser.frequencyBinCount
        if (!freqDataRef.current || freqDataRef.current.length !== binCount) {
          freqDataRef.current = new Uint8Array(binCount)
        }
        analyser.getByteFrequencyData(freqDataRef.current as Uint8Array<ArrayBuffer>)
        const freq = freqDataRef.current

        // Sample rate for bin-to-Hz mapping
        const sampleRate = state.audioContext?.sampleRate ?? 44100
        const binHz = sampleRate / (binCount * 2)

        // Draw bars across the width, mapping frequency bins logarithmically
        const barCount = Math.floor(w / 2) // 1 bar per 2px for density
        const barW = w / barCount

        // Log-scale frequency mapping: map bar index to frequency bin
        const minFreq = 20
        const maxFreq = Math.min(16000, sampleRate / 2)
        const logMin = Math.log(minFreq)
        const logMax = Math.log(maxFreq)

        for (let i = 0; i < barCount; i++) {
          // Map bar to frequency range (log scale)
          const t0 = i / barCount
          const t1 = (i + 1) / barCount
          const f0 = Math.exp(logMin + t0 * (logMax - logMin))
          const f1 = Math.exp(logMin + t1 * (logMax - logMin))
          const bin0 = Math.max(0, Math.floor(f0 / binHz))
          const bin1 = Math.min(binCount - 1, Math.floor(f1 / binHz))

          // Average the bins in this range
          let sum = 0
          let count = 0
          for (let b = bin0; b <= bin1; b++) {
            sum += freq[b]
            count++
          }
          const mag = count > 0 ? (sum / count) / 255 : 0

          // CDJ color by frequency: bass=blue, mid=green/cyan, high=white
          const centerFreq = (f0 + f1) / 2
          let r: number, g: number, b2: number
          if (centerFreq < 200) {
            // Sub-bass: deep blue
            r = 30; g = 60; b2 = 220
          } else if (centerFreq < 600) {
            // Bass: blue
            r = 40; g = 100; b2 = 255
          } else if (centerFreq < 2000) {
            // Low-mid: cyan/teal
            r = 0; g = 200; b2 = 200
          } else if (centerFreq < 5000) {
            // Mid: green
            r = 50; g = 220; b2 = 100
          } else if (centerFreq < 10000) {
            // High-mid: warm white
            r = 200; g = 220; b2 = 180
          } else {
            // High: bright white
            r = 230; g = 240; b2 = 255
          }

          const barH = Math.max(0.5, mag * h * 0.9)
          const alpha = 0.3 + mag * 0.7

          ctx!.fillStyle = `rgba(${r}, ${g}, ${b2}, ${alpha})`

          // Draw from bottom up (CDJ style)
          ctx!.fillRect(
            i * barW,
            h - barH,
            Math.max(1, barW - 0.5),
            barH,
          )
        }
      } else {
        // Fallback: time-domain waveform bars
        const data = state.waveformData
        const barCount = Math.min(48, data.length)
        const step = Math.floor(data.length / barCount)
        const barW = w / barCount

        for (let i = 0; i < barCount; i++) {
          const v = data[i * step] / 255
          const barH = Math.max(0.5, Math.abs(v - 0.5) * 2 * h * 0.9)
          ctx!.fillStyle = `rgba(40, 100, 255, ${0.3 + v * 0.5})`
          ctx!.fillRect(i * barW, h - barH, Math.max(1, barW - 0.5), barH)
        }
      }

      waveRafRef.current = requestAnimationFrame(draw)
    }

    waveRafRef.current = requestAnimationFrame(draw)
    return () => {
      if (waveRafRef.current !== null) cancelAnimationFrame(waveRafRef.current)
    }
  }, [])

  // Resize waveform canvas
  useEffect(() => {
    const canvas = waveformRef.current
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

  const hasSource = source !== 'none'
  const sourceLabel = source === 'none' ? 'NO SRC' : source === 'webcam' ? 'CAM' : 'FILE'

  return (
    <div
      className="flex items-center flex-shrink-0"
      style={{
        height: 'var(--row-header)',
        padding: '0 var(--panel-padding)',
        gap: 'var(--gap-lg)',
        background: 'linear-gradient(to right, var(--bg-elevated), var(--bg-surface), var(--bg-elevated))',
        borderBottom: '1px solid var(--border)',
        boxShadow: 'inset 0 1px 0 var(--surface-highlight)',
      }}
    >
      {/* Brand */}
      <span
        className="text-[12px] font-bold uppercase tracking-widest flex-shrink-0"
        style={{
          fontFamily: 'var(--font-sans)',
          color: 'var(--text-muted)',
          letterSpacing: '0.12em',
        }}
      >
        SEG_F4ULT
      </span>

      {/* Divider */}
      <div className="flex-shrink-0" style={{ display: 'flex', flexDirection: 'column', height: 16 }}>
        <div style={{ width: 1, flex: 1, backgroundColor: 'var(--border)' }} />
        <div style={{ width: 1, flex: 1, backgroundColor: 'var(--surface-highlight)' }} />
      </div>

      {/* Video source selector */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[9px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-ghost)' }}>
          VIDEO
        </span>
        <SourceSelector variant="compact" />
      </div>

      {/* Divider */}
      <div className="flex-shrink-0" style={{ display: 'flex', flexDirection: 'column', height: 16 }}>
        <div style={{ width: 1, flex: 1, backgroundColor: 'var(--border)' }} />
        <div style={{ width: 1, flex: 1, backgroundColor: 'var(--surface-highlight)' }} />
      </div>

      {/* Audio source selector */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[9px] font-medium uppercase tracking-widest" style={{ color: 'var(--text-ghost)' }}>
          AUDIO
        </span>
        {AUDIO_SOURCES.map((src) => {
          const isActive = activeAudioSource === src.id
          return (
            <button
              key={src.id}
              onClick={() => {
                if (src.id === 'file' && !isActive) {
                  fileInputRef.current?.click()
                }
                setActiveAudioSource(src.id)
              }}
              className="h-6 rounded-sm text-[10px] font-medium transition-colors active:scale-95"
              style={{
                width: 48,
                backgroundColor: isActive ? 'var(--text-primary)' : 'var(--bg-surface)',
                border: '1px solid var(--border)',
                color: isActive ? 'var(--bg-surface)' : 'var(--text-muted)',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'
                setStatusText(getAudioSourceStatusText(src.id))
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-surface)'
                setStatusText(null)
              }}
            >
              {src.label}
            </button>
          )
        })}
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileImport}
          className="hidden"
        />
        {activeAudioSource === 'file' && audioFileName && (
          <span
            className="text-[8px] truncate"
            style={{ color: 'var(--text-ghost)', maxWidth: 80 }}
          >
            {audioFileName}
          </span>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Waveform — CDJ-style frequency display */}
      <canvas
        ref={waveformRef}
        className="flex-shrink-0"
        style={{
          width: 160,
          height: 28,
          borderRadius: 2,
          backgroundColor: 'rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      />

      {/* Status badges */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <span
          className="text-[9px] font-medium uppercase tracking-widest"
          style={{ color: hasSource ? 'var(--accent-dim)' : 'var(--text-ghost)' }}
        >
          {sourceLabel}
        </span>
        <span
          className="text-[10px] tabular-nums"
          style={{
            color: 'var(--text-secondary)',
            cursor: 'default',
            padding: '1px 6px',
            borderRadius: 3,
            backgroundColor: 'rgba(0,0,0,0.15)',
            border: '1px solid var(--border)',
          }}
          onMouseEnter={() => setStatusText(getUIStatusText('fps'))}
          onMouseLeave={() => setStatusText(null)}
        >
          {fps} FPS
        </span>
      </div>
    </div>
  )
}
