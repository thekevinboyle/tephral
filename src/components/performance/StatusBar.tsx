import { useState, useEffect } from 'react'
import { useUIStore } from '../../stores/uiStore'
import { SignalAnalysis, IrisScanner } from '../ui/MicroVisuals'
import { perfMonitor } from '../../utils/perfMonitor'

export function StatusBar() {
  const statusText = useUIStore((s) => s.statusText)
  const isIdle = statusText == null

  const [perf, setPerf] = useState({ avgMs: 0, maxMs: 0, fps: 0 })
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const id = setInterval(() => setPerf(perfMonitor.getStats()), 500)
    return () => clearInterval(id)
  }, [])

  return (
    <div
      style={{
        height: 24,
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        background: 'linear-gradient(to right, var(--bg-elevated), var(--bg-surface), var(--bg-elevated))',
        borderTop: '1px solid var(--border)',
        boxShadow: 'inset 0 1px 0 var(--surface-highlight)',
      }}
    >
      <SignalAnalysis value={0.3} size={16} color="var(--text-ghost)" className="opacity-20 mr-1.5" />
      {/* System-online indicator — breathes while idle, steady when a status is live */}
      <span
        aria-hidden
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          flexShrink: 0,
          marginRight: 6,
          backgroundColor: 'var(--text-muted)',
          animation: isIdle
            ? 'alive-breathe var(--dur-breathe) var(--ease-in-out-quart) infinite'
            : 'none',
        }}
      />
      <span
        style={{
          fontSize: 10,
          color: 'var(--text-muted)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          flex: 1,
        }}
      >
        {statusText ?? 'Ready'}
        {isIdle && (
          <span
            aria-hidden
            style={{
              display: 'inline-block',
              width: 4,
              height: 8,
              marginLeft: 5,
              verticalAlign: -1,
              backgroundColor: 'var(--text-muted)',
              animation: 'hud-typewriter-cursor 1.1s steps(1) infinite',
            }}
          />
        )}
      </span>
      {import.meta.env.DEV && (
        <span
          title="render pipeline avg/max ms"
          style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            marginLeft: 8,
          }}
        >
          {perf.avgMs.toFixed(1)}ms · {perf.fps.toFixed(0)}fps
        </span>
      )}
      <IrisScanner value={0.4} size={16} color="var(--text-ghost)" className="opacity-20 ml-1.5" />
    </div>
  )
}
